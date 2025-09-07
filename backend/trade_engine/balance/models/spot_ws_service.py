import asyncio
import websockets
import logging
import json
import time
import hmac
import hashlib
from backend.trade_engine import config
from backend.trade_engine.balance.db import stream_key_db # DB fonksiyonlarınızı import edin

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Helper Functions ---
def sign_payload(secret: str, payload_str: str) -> str:
    """Verilen bir payload'ı HMAC-SHA256 ile imzalar."""
    return hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()

def create_request_id() -> int:
    """Benzersiz bir istek ID'si oluşturur."""
    return int(time.time() * 1000)

# --- Ana Servis Sınıfı ---
class SpotWsApiManager:
    """
    Tek bir WebSocket bağlantısı üzerinden birden fazla kullanıcının 
    Spot aboneliğini yönetir.
    """
    URL = "wss://ws-api.binance.com:443/ws-api/v3"

    def __init__(self, pool):
        self.pool = pool
        self.ws = None
        # {12345: {'api_id': 1, 'user_id': 123}, ...} formatında bir map
        # Anahtar (sub_id) artık INTEGER olacak
        self.subscriptions = {} 
        self.pending_requests = {}

    async def run(self):
        """Servisi başlatır ve sürekli çalışmasını sağlar."""
        await self._initialize_from_db()
        await asyncio.gather(
            self._listen_for_db_events(),
            self._connection_manager()
        )

    async def _connection_manager(self):
        """WebSocket bağlantısını yönetir ve koptuğunda yeniden kurar."""
        while True:
            try:
                logging.info(f"🔌 WebSocket bağlantısı kuruluyor: {self.URL}")
                async with websockets.connect(self.URL, ping_interval=180, ping_timeout=10) as ws:
                    self.ws = ws
                    logging.info("✅ WebSocket bağlantısı başarılı.")
                    await self._resubscribe_all() 
                    await self._listen_ws_messages()
            except (websockets.exceptions.ConnectionClosed, asyncio.TimeoutError) as e:
                logging.warning(f"⚠️ WebSocket bağlantısı koptu: {e}. 5 saniye içinde yeniden denenecek...")
                self.ws = None
                await asyncio.sleep(5)
            except Exception as e:
                logging.error(f"❌ Beklenmedik bir hata oluştu: {e}")
                self.ws = None
                await asyncio.sleep(5)

    async def _listen_ws_messages(self):
        """WebSocket'ten gelen mesajları dinler ve işler."""
        async for msg in self.ws:
            data = json.loads(msg)
            
            request_id = data.get("id")
            if request_id and request_id in self.pending_requests:
                future = self.pending_requests.pop(request_id)
                future.set_result(data)
                continue

            # Gelen sub_id (JSON'dan parse edildiği için integer olacak)
            sub_id = data.get("subscriptionId")
            if sub_id and sub_id in self.subscriptions:
                user_info = self.subscriptions[sub_id]
                logging.info(f"📩 [User: {user_info['user_id']}] Data: {data['data']['e']}")
                # BURADA GELEN VERİYİ İŞLEYECEK KODUNUZU ÇAĞIRABİLİRSİNİZ
            else:
                logging.debug(f"ℹ️ Genel mesaj alındı: {data}")


    async def _initialize_from_db(self):
        """Başlangıçta sadece new, active ve expired olan Spot anahtarlarını abone eder."""
        logging.info("🚀 Başlangıç: DB'den Spot anahtarları kontrol ediliyor...")
        all_spot_keys = await stream_key_db.get_keys_by_type(self.pool, 'spot')

        for key_info in all_spot_keys:
            api_id = key_info["api_id"]
            user_id = key_info["user_id"]
            status = key_info.get("status")

            if status in ("new", "active", "expired"):
                logging.info(f"➕ [api_id={api_id}, user_id={user_id}] status={status} → ilk abonelik başlatılıyor.")
                asyncio.create_task(self._handle_subscribe(api_id))
            else:
                logging.info(f"⏭️ [api_id={api_id}, user_id={user_id}] status={status} → ilk başlangıçta atlandı.")

        logging.info("✅ Başlangıç abonelik işlemleri tamamlandı.")


    async def _listen_for_db_events(self):
        """Veritabanındaki 'streamkey_events' kanalını dinler ve değişiklikleri işler."""
        conn = None
        try:
            conn = await self.pool.acquire()
            await conn.add_listener("streamkey_events", self._db_event_callback)
            logging.info("🔔 Veritabanı 'streamkey_events' kanalı dinleniyor...")
            while True:
                # Bağlantıyı ve dinleyiciyi aktif tutmak için bekle.
                await asyncio.sleep(60)
        except Exception as e:
            logging.error(f"❌ Veritabanı dinleyicisinde hata: {e}", exc_info=True)
        finally:
            if conn:
                try:
                    # Temizlik: Dinleyiciyi kaldır ve bağlantıyı havuza geri ver.
                    await conn.remove_listener("streamkey_events", self._db_event_callback)
                except Exception as e:
                    logging.warning(f"Dinleyici kaldırılırken hata oluştu: {e}")
                await self.pool.release(conn) 

    def _db_event_callback(self, conn, pid, channel, payload):
        event = json.loads(payload)
        connection_type = event.get("connection_type")
        if connection_type != 'spot': return

        status = event.get("status")
        if status in ('new', 'active'):
            asyncio.create_task(self._handle_subscribe(event['api_id']))
        elif status in ('remove', 'expired', 'error'):
            # Event'ten gelen sub_id de integer olacak
            asyncio.create_task(self._handle_unsubscribe(event['api_id'], event.get('sub_id')))

    async def _send_request(self, request: dict):
        if not self.ws or not self.ws.open:
            logging.error("❌ İstek gönderilemedi, WebSocket bağlantısı kapalı.")
            return None
        
        request_id = request['id']
        future = asyncio.get_running_loop().create_future()
        self.pending_requests[request_id] = future
        try:
            await self.ws.send(json.dumps(request))
            return await asyncio.wait_for(future, timeout=10)
        except asyncio.TimeoutError:
            logging.error(f"❌ İstek {request_id} zaman aşımına uğradı.")
            self.pending_requests.pop(request_id, None)
            return None

    async def _handle_subscribe(self, api_id: int):
        api_credentials = await stream_key_db.get_api_credentials(self.pool, api_id)
        if not api_credentials: return

        ts = str(create_request_id())
        payload_str = f"apiKey={api_credentials['api_key']}&timestamp={ts}"
        signature = sign_payload(api_credentials['api_secret'], payload_str)

        req = {
            "id": int(ts), "method": "userDataStream.subscribe.signature",
            "params": {
                "apiKey": api_credentials['api_key'], "timestamp": int(ts), "signature": signature
            }
        }
        
        logging.info(f"➕ [api_id={api_id}] için abonelik isteği gönderiliyor...")
        response = await self._send_request(req)

        if response and response.get("result"):
            # Binance'ten gelen sub_id (JSON'daki sayısal değer -> integer) alınır
            sub_id = response['result']['subscriptionId']
            logging.info(f"✅ [api_id={api_id}] başarıyla abone oldu. SubID: {sub_id}")
            
            # DB'ye integer olarak kaydedilir
            await stream_key_db.update_key_sub_id_and_status(self.pool, api_id, 'spot', sub_id, 'active')
            
            # Hafızadaki map'e integer anahtar ile kaydedilir
            self.subscriptions[sub_id] = {'api_id': api_id, 'user_id': api_credentials['user_id']}
        else:
            logging.error(f"❌ [api_id={api_id}] abonelik başarısız. Cevap: {response}")
            await stream_key_db.update_streamkey_status(self.pool, api_id, 'spot', 'error')

    async def _resubscribe_all(self):
        logging.info("🔄 Mevcut tüm abonelikler yeniden açılıyor...")
        tasks = [self._handle_subscribe(info['api_id']) for info in self.subscriptions.values()]
        await asyncio.gather(*tasks)
        logging.info("✅ Yeniden abonelik işlemleri tamamlandı.")

    # spot_ws_service.py dosyasındaki SpotWsApiManager sınıfının içine eklenecek

    async def _handle_unsubscribe(self, api_id: int, sub_id: int):
        """Verilen sub_id için mevcut aboneliği sonlandırır."""
        if not sub_id:
            logging.warning(f"⚠️ [api_id={api_id}] için abonelikten çıkma işlemi atlanıyor çünkü sub_id mevcut değil.")
            # sub_id olmasa bile DB'yi temizlemek iyi bir fikir olabilir.
            await stream_key_db.set_key_as_closed(self.pool, api_id, 'spot')
            return

        req = {
            "id": create_request_id(),
            "method": "userDataStream.unsubscribe",
            "params": [sub_id] # Unsubscribe metodu parametre olarak bir liste bekler
        }

        logging.info(f"➖ [api_id={api_id}, sub_id={sub_id}] için abonelikten çıkma isteği gönderiliyor...")
        response = await self._send_request(req)

        # Başarılı cevap genellikle {"result": null, "id": 123} şeklinde olur.
        if response and "error" not in response:
            logging.info(f"✅ [api_id={api_id}, sub_id={sub_id}] aboneliği başarıyla sonlandırıldı.")
        else:
            logging.error(f"❌ [api_id={api_id}, sub_id={sub_id}] abonelikten çıkma başarısız. Cevap: {response}")
        
        # Her durumda (başarılı veya başarısız) yerel durumu ve veritabanını temizle
        self.subscriptions.pop(sub_id, None)
        await stream_key_db.set_key_as_closed(self.pool, api_id, 'spot')
        logging.info(f"Db ve hafıza [api_id={api_id}] için temizlendi. Durum 'closed' olarak ayarlandı.")

    # _handle_unsubscribe metodu da benzer şekilde yazılabilir.

# spot_ws_service.py dosyanızın sonuna eklenecek kısım

async def main():
    """
    Uygulamanın ana başlangıç fonksiyonu.
    Veritabanı bağlantısını kurar ve SpotWsApiManager'ı çalıştırır.
    """
    logging.info("🚀 Spot WebSocket Servisi başlatılıyor...")
    
    # Adım 1: Yapılandırma dosyasından veritabanı bağlantı havuzunu al.
    pool = await config.get_async_pool()
    if not pool:
        logging.error("❌ Veritabanı bağlantısı kurulamadığı için servis başlatılamıyor. Çıkılıyor.")
        return

    # Adım 2: Ana yönetici sınıfını başlat.
    manager = SpotWsApiManager(pool)

    # Adım 3: Yöneticinin ana döngüsünü çalıştır. Bu sonsuza dek çalışacaktır.
    try:
        await manager.run()
    except KeyboardInterrupt:
        logging.info("🛑 Servis manuel olarak durduruldu.")
    except Exception as e:
        logging.critical(f"💥 Serviste kritik bir hata oluştu ve durdu: {e}", exc_info=True)


if __name__ == "__main__":
    # Script doğrudan çalıştırıldığında main fonksiyonunu başlat.
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProgram kapatıldı.")