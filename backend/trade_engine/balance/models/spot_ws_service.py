from websockets.protocol import State
import logging, json,time,hmac, hashlib, asyncio, websockets, datetime
from decimal import Decimal
from backend.trade_engine import config
from backend.trade_engine.balance.db import stream_key_db
from backend.trade_engine.balance.db.balance_writer_db import batch_upsert_balances, batch_insert_orders

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

ORDER_SAVE_MODE = 'COMPREHENSIVE'  #  'COMPREHENSIVE' 'SELECTIVE'
CLIENT_ORDER_ID_PREFIX = 'WLR_'

def sign_payload(secret: str, payload_str: str) -> str:
    return hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()

# Bu fonksiyonlar zaten stream_key_db.py dosyanızda olmalı. 
# Burada sadece kodun bütünlüğü için referans olarak duruyorlar.
# Eğer değillerse, stream_key_db.py içine taşıyın.
async def get_keys_for_spot_subscription(pool):
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT api_id FROM public.stream_keys WHERE spot_status IN ('new', 'active')")
        return [dict(row) for row in rows]

async def batch_update_spot_keys(pool, updates: dict):
    if not updates: return
    update_data = []
    for api_id, values in updates.items():
        update_data.append((api_id, values.get('sub_id'), values.get('spot_status')))
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.executemany("UPDATE public.stream_keys SET sub_id = $2, spot_status = $3 WHERE api_id = $1", update_data)
class SpotWsApiManager:
    URL = "wss://ws-api.binance.com:443/ws-api/v3"

    # GÜNCELLENDİ: __init__ metodu
    def __init__(self, pool, order_save_mode: str):
        self.pool = pool
        self.listener_conn = None
        self.ws = None
        self.subscriptions = {}
        self.pending_requests = {}
        self.db_update_queue = {}
        self.update_task = None
        self.request_id_counter = 0
        self.initialized = False
        
        # YENİ: Mod ve veri kuyruklarını başlat
        self.order_save_mode = order_save_mode
        self.balance_update_queue = {} 
        self.order_update_queue = []
        logging.info(f"🚀 Emir Kayıt Modu: {self.order_save_mode}")

    def _get_unique_request_id(self) -> int:
        self.request_id_counter += 1
        return int(time.time() * 1000) + self.request_id_counter

    # GÜNCELLENDİ: run metodu
    async def run(self):
        try:
            self.listener_conn = await config.create_single_connection()
            if not self.listener_conn:
                logging.error("❌ Dinleyici için özel veritabanı bağlantısı oluşturulamadı.")
                return

            self.update_task = asyncio.create_task(self._batch_updater())
            
            # YENİ: Bakiye ve emirler için toplu yazıcı görevleri
            balance_writer_task = asyncio.create_task(self._balance_batch_writer())
            order_writer_task = asyncio.create_task(self._order_batch_writer())

            await asyncio.gather(
                self._listen_for_db_events(),
                self._connection_manager(),
                balance_writer_task,
                order_writer_task
            )
        finally:
            if self.listener_conn and not self.listener_conn.is_closed():
                await self.listener_conn.close()
                logging.info("ℹ️ Özel dinleyici veritabanı bağlantısı kapatıldı.")

    async def _connection_manager(self):
        while True:
            try:
                logging.info(f"🔌 WebSocket bağlantısı kuruluyor: {self.URL}")
                async with websockets.connect(self.URL, ping_interval=180, ping_timeout=10) as ws:
                    self.ws = ws
                    logging.info("✅ WebSocket bağlantısı başarılı.")
                    listener_task = asyncio.create_task(self._listen_ws_messages())
                    if not self.initialized:
                        await self._initialize_from_db()
                        self.initialized = True
                    else:
                        await self._resubscribe_all()
                    await listener_task
            except (websockets.exceptions.ConnectionClosed, asyncio.TimeoutError) as e:
                logging.warning(f"⚠️ WebSocket bağlantısı koptu: {e}. 5 saniye içinde yeniden denenecek...")
                self.ws = None
            except Exception as e:
                logging.error(f"❌ Bağlantı yöneticisinde beklenmedik hata: {e}", exc_info=True)
                self.ws = None
            if self.ws is None:
                await asyncio.sleep(5)

    # GÜNCELLENDİ: _listen_ws_messages metodu
    async def _listen_ws_messages(self):
        async for msg in self.ws:
            data = json.loads(msg)
            req_id = data.get("id")

            if req_id and req_id in self.pending_requests:
                future = self.pending_requests.pop(req_id, None)
                if future and not future.done(): future.set_result(data)
                continue

            # Gelen genel mesajları (bakiye, emir vb.) işlenmesi için görev olarak başlat
            asyncio.create_task(self._handle_stream_event(data))

    async def _initialize_from_db(self):
        logging.info("🚀 Başlangıç: DB'den 'new' ve 'active' spot anahtarları yükleniyor...")
        initial_keys = await get_keys_for_spot_subscription(self.pool)
        tasks = [self._handle_subscribe(key["api_id"]) for key in initial_keys]
        await asyncio.gather(*tasks)
        logging.info(f"✅ Başlangıçta {len(tasks)} abonelik işlemi başlatıldı.")

    async def _listen_for_db_events(self):
        try:
            await self.listener_conn.add_listener("spot_stream_key_notify", self._db_event_callback)
            logging.info("🔔 Veritabanı 'spot_stream_key_notify' kanalı dinleniyor...")
            await asyncio.Future()
        except Exception as e:
            logging.error(f"❌ Veritabanı dinleyicisinde kritik hata: {e}", exc_info=True)
        finally:
            logging.warning("Veritabanı dinleyicisi durdu.")

    def _db_event_callback(self, conn, pid, channel, payload):
        try:
            logging.info(f"!!! SPOT TRIGGER'DAN MESAJ GELDİ !!! PAYLOAD: {payload}")
            event = json.loads(payload)
            operation = event.get("action")
            spot_status = event.get("spot_status") 
            api_id = event.get("api_id")
            
            if not api_id: return
            
            logging.info(f"DB Event ayrıştırıldı: op={operation}, api_id={api_id}, status={spot_status}")
            is_already_subscribed = any(info['api_id'] == api_id for info in self.subscriptions.values())

            if not is_already_subscribed and (operation == 'INSERT' or (operation == 'UPDATE' and spot_status == 'new')):
                logging.info(f"DB Event: api_id={api_id} için abonelik başlatılıyor...")
                asyncio.create_task(self._handle_subscribe(api_id))
            elif is_already_subscribed and (operation == 'DELETE' or (operation == 'UPDATE' and spot_status not in ['new', 'active'])):
                logging.info(f"DB Event: api_id={api_id} için abonelikten çıkma işlemi başlatılıyor...")
                sub_id_to_remove = next((sub_id for sub_id, info in self.subscriptions.items() if info['api_id'] == api_id), None)
                if sub_id_to_remove is not None:
                    asyncio.create_task(self._handle_unsubscribe(api_id, sub_id_to_remove))
            else:
                logging.info(f"DB Event: api_id={api_id} için işlem atlandı (mevcut durum uygun değil).")
        except Exception as e:
            logging.error(f"❌ DB event callback işlenirken hata oluştu: {e}", exc_info=True)

    async def _send_request(self, request: dict):
        if not self.ws or self.ws.state != State.OPEN:
            logging.error(f"❌ İstek gönderilemedi, WebSocket bağlantısı açık değil. İstek: {request.get('id')}")
            return None
        request_id = request['id']
        future = asyncio.get_running_loop().create_future()
        self.pending_requests[request_id] = future
        try:
            await self.ws.send(json.dumps(request))
            return await asyncio.wait_for(future, timeout=20)
        except Exception as e:
            logging.error(f"❌ İstek {request_id} gönderilirken hata: {e}")
            self.pending_requests.pop(request_id, None)
            return None

    async def _handle_subscribe(self, api_id: int):
        api_credentials = await stream_key_db.get_api_credentials(self.pool, api_id)
        if not api_credentials:
            logging.error(f"❌ Abone olunacak api_id={api_id} için kimlik bilgileri bulunamadı.")
            return
        request_id = self._get_unique_request_id()
        ts = int(time.time() * 1000)
        payload_str = f"apiKey={api_credentials['api_key']}&timestamp={ts}"
        signature = sign_payload(api_credentials['api_secret'], payload_str)
        req = {"id": request_id, "method": "userDataStream.subscribe.signature", "params": {"apiKey": api_credentials['api_key'], "timestamp": ts, "signature": signature}}
        logging.info(f"➕ Abone olma isteği gönderiliyor: api_id={api_id}, id={request_id}")
        resp = await self._send_request(req)
        if resp and resp.get("result") and resp['result'].get('subscriptionId') is not None:
            sub_id = resp['result']['subscriptionId']
            self.subscriptions[sub_id] = {'api_id': api_id, 'user_id': api_credentials['user_id']}
            self.db_update_queue[api_id] = {'sub_id': sub_id, 'spot_status': 'active'}
            logging.info(f"✅ [Abone olundu] api_id={api_id}, sub_id={sub_id}. DB güncelleme kuyruğuna eklendi.")
        else:
            self.db_update_queue[api_id] = {'sub_id': None, 'spot_status': 'error'}
            logging.error(f"❌ [Abonelik Başarısız] api_id={api_id}, id={request_id}, Cevap: {resp}. DB güncelleme kuyruğuna eklendi.")

    async def _resubscribe_all(self):
        logging.info("🔄 Mevcut tüm abonelikler yeniden açılıyor...")
        tasks = [self._handle_subscribe(info['api_id']) for info in list(self.subscriptions.values())]
        self.subscriptions.clear()
        await asyncio.gather(*tasks)
        logging.info("✅ Yeniden abonelik işlemleri tamamlandı.")

    async def _handle_unsubscribe(self, api_id: int, sub_id: int):
        request_id = self._get_unique_request_id()
        req = {
            "id": request_id,
            "method": "userDataStream.unsubscribe",
            "params": { "subscriptionId": sub_id }
        }
        logging.info(f"➖ Abonelikten çıkma isteği gönderiliyor (DOKÜMANA UYGUN FORMAT): api_id={api_id}, sub_id={sub_id}, id={request_id}")
        response = await self._send_request(req)
        if response and "error" not in response and "result" in response:
            logging.info(f"✅ [Abonelik Başarıyla Sonlandırıldı] api_id={api_id}, sub_id={sub_id}. Binance onayı alındı. Yanıt: {response}")
        else:
            logging.error(f"❌ [Abonelikten Çıkma Başarısız] api_id={api_id}, sub_id={sub_id}. Binance hata döndü: {response}")
        self.subscriptions.pop(sub_id, None)
        self.db_update_queue[api_id] = {'sub_id': None, 'spot_status': 'closed'}
        logging.info(f"🚮 [Yerel Kayıtlar Güncellendi] api_id={api_id}, sub_id={sub_id}. DB güncelleme kuyruğuna eklendi.")

    async def _batch_updater(self):
        while True:
            await asyncio.sleep(5)
            if self.db_update_queue:
                queue_copy = self.db_update_queue.copy()
                self.db_update_queue.clear()
                try:
                    await batch_update_spot_keys(self.pool, queue_copy)
                    logging.info(f"💾 [Batch] {len(queue_copy)} adet anahtar durumu veritabanına toplu yazıldı.")
                except Exception as e:
                    logging.error(f"❌ [Batch] Veritabanı güncellemesi başarısız: {e}", exc_info=True)

    # Lütfen spot_ws_service.py dosyanızdaki _handle_stream_event fonksiyonunu bu blokla değiştirin.

    async def _handle_stream_event(self, data: dict):
        """Gelen tüm kullanıcı veri akışı olaylarını işler, Decimal'e çevirir ve kuyruğa atar."""
        sub_id = data.get("subscriptionId")
        if sub_id is None: return

        sub_info = self.subscriptions.get(sub_id)
        if not sub_info: return

        user_id, api_id = sub_info.get("user_id"), sub_info.get("api_id")
        event = data.get("event")
        if not event: return

        event_type = event.get("e")
        
        try:
            if event_type == "outboundAccountPosition":
                for balance in event.get("B", []):
                    asset = balance.get("a")
                    if asset:
                        # Gelen veriyi hassas hesaplama için Decimal'e çeviriyoruz.
                        free_balance = Decimal(balance.get("f", "0"))
                        locked_balance = Decimal(balance.get("l", "0"))
                        
                        # Veriyi, biriktirme havuzuna (queue) atıyoruz.
                        # (user_id, api_id, asset) anahtarı, aynı varlığın 
                        # sadece en son durumunun saklanmasını sağlar.
                        self.balance_update_queue[(user_id, api_id, asset)] = {
                            "user_id": user_id,
                            "api_id": api_id,
                            "asset": asset,
                            "free": free_balance,
                            "locked": locked_balance,
                        }
                logging.info(f"ℹ️ [Bakiye] user_id={user_id} için {len(event.get('B', []))} varlık güncellemesi kuyruğa eklendi.")
            
            elif event_type == "executionReport":
                # (Emir işleme mantığı burada yer alır, bu kısım değişmedi)
                client_order_id = event.get("c")
                should_save_order = False
                if self.order_save_mode == 'COMPREHENSIVE':
                    should_save_order = True
                elif self.order_save_mode == 'SELECTIVE' and client_order_id and client_order_id.startswith(CLIENT_ORDER_ID_PREFIX):
                    should_save_order = True
                
                if should_save_order:
                    order_data = {
                        "user_id": user_id, "api_id": api_id,
                        "symbol": event.get("s"), "client_order_id": client_order_id,
                        "side": event.get("S"), "order_type": event.get("o"),
                        "status": event.get("X"), "price": Decimal(event.get("p", "0")),
                        "quantity": Decimal(event.get("q", "0")), "executed_quantity": Decimal(event.get("z", "0")),
                        "cummulative_quote_qty": Decimal(event.get("Z", "0")), "order_id": event.get("i"),
                        "trade_id": event.get("t"), "event_time": event.get("E")
                    }
                    self.order_update_queue.append(order_data)
                    logging.info(f"✅ [Emir Kaydedilecek] user_id={user_id}, id={client_order_id}, durum={order_data['status']}")
                else:
                    logging.info(f"➡️ [Emir Atlandı ({self.order_save_mode} Mod)] id={client_order_id}")

        except Exception as e:
            logging.error(f"❌ Olay işlenirken hata (event_type: {event_type}): {e}", exc_info=True)


    async def _balance_batch_writer(self):
        """Bakiye güncelleme havuzunu her 5 saniyede bir toplu olarak DB'ye yazar."""
        while True:
            await asyncio.sleep(5) # 5 saniye bekle
            
            if self.balance_update_queue:
                # Havuzdaki tüm veriyi bir listeye kopyala
                queue_copy = list(self.balance_update_queue.values())
                self.balance_update_queue.clear() # Havuzu bir sonraki 5 saniye için temizle
                try:
                    logging.info(f"💾 [Batch] {len(queue_copy)} adet bakiye güncellemesi DB'ye yazılıyor...")
                    # Kopyalanan listeyi veritabanı fonksiyonuna toplu işlem için gönder
                    await batch_upsert_balances(self.pool, queue_copy)
                except Exception as e:
                    logging.error(f"❌ [Batch] Bakiye DB güncellemesi başarısız: {e}", exc_info=True)

    async def _order_batch_writer(self):
        """Emir güncelleme kuyruğunu her 3 saniyede bir toplu olarak DB'ye yazar."""
        while True:
            await asyncio.sleep(3)
            if self.order_update_queue:
                queue_copy = self.order_update_queue.copy()
                self.order_update_queue.clear()
                try:
                    # DÜZELTME: Loglama işlemden önceye alındı ve DB fonksiyonu çağrısı aktif edildi.
                    logging.info(f"💾 [Batch] {len(queue_copy)} adet emir güncellemesi DB'ye yazılıyor...")
                    await batch_insert_orders(self.pool, queue_copy)
                except Exception as e:
                    logging.error(f"❌ [Batch] Emir DB güncellemesi başarısız: {e}", exc_info=True)

async def main():
    logging.info("🚀 Spot WebSocket Servisi başlatılıyor...")
    pool = await config.get_async_pool()
    if not pool:
        logging.error("❌ Veritabanı bağlantı havuzu oluşturulamadı. Çıkılıyor.")
        return
    
    # Manager'ı başlatırken konfigürasyon modunu iletiyoruz
    manager = SpotWsApiManager(pool, order_save_mode=ORDER_SAVE_MODE)
    
    try:
        await manager.run()
    except (KeyboardInterrupt, asyncio.CancelledError):
        logging.info("🛑 Servis durduruldu.")
    finally:
        if pool:
            await pool.close()
            logging.info("ℹ️ Veritabanı bağlantı havuzu kapatıldı.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProgram kapatıldı.")
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProgram kapatıldı.")