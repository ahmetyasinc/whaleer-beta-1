import asyncio
import websockets
import logging
import json
from backend.trade_engine import config
from backend.trade_engine.balance.db.stream_key_db import attach_listenkeys_to_ws
from backend.trade_engine.balance.db import ws_db

# Logging ayarını daha bilgilendirici yapalım
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')


class Deduplicator:
    """WS eventlerinde duplicate mesajları filtreler."""
    def __init__(self, max_size: int = 1000):
        self.seen = set()
        self.max_size = max_size

    def is_duplicate(self, event: dict) -> bool:
        uid = event.get("u") or event.get("E")
        if not uid: return False
        if uid in self.seen: return True
        self.seen.add(uid)
        if len(self.seen) > self.max_size:
            self.seen = set(list(self.seen)[-self.max_size:])
        return False

class WebSocketRedundantManager:
    """BELİRLİ BİR GRUP listenKey için yedekli (redundant) bağlantıları yönetir."""
    def __init__(self, pool, initial_listenkeys: list, url: str):
        self.pool = pool
        self.listenkeys = initial_listenkeys
        self.url = url
        self.dedup = Deduplicator()
        self.active_connections = {}
        self.base_ws_id = None

    async def start(self, existing_ws_id: int = None):
        if not self.listenkeys:
            logging.warning("Başlatılacak listenKey bulunmadığı için WebSocketRedundantManager başlatılmadı.")
            return
        await self._open_redundant_pair(self.listenkeys, existing_ws_id)
        await attach_listenkeys_to_ws(self.pool, self.base_ws_id, self.listenkeys)

    async def update_and_restart(self, new_listenkeys: list):
        logging.info(f"🔄 WS ID {self.base_ws_id} için overlap/restart süreci başlatılıyor. Yeni anahtar sayısı: {len(new_listenkeys)}")
        if not new_listenkeys:
            await self.shutdown()
            return
        old_connections = list(self.active_connections.values())
        self.active_connections.clear()
        self.listenkeys = new_listenkeys
        await self._open_redundant_pair(self.listenkeys, self.base_ws_id)
        await attach_listenkeys_to_ws(self.pool, self.base_ws_id, self.listenkeys)
        await asyncio.sleep(5)
        logging.info(f"⏳ Overlap süresi doldu. WS ID {self.base_ws_id} için eski bağlantılar kapatılıyor.")
        for ws, task in old_connections:
            if not task.done():
                task.cancel()
            await self._close_ws(ws)
        logging.info(f"✅ WS ID {self.base_ws_id} için overlap/restart tamamlandı.")

    async def shutdown(self):
        logging.info(f"🗑️ WS ID {self.base_ws_id} için hiç anahtar kalmadı. Kapatılıyor.")
        for ws, task in self.active_connections.values():
            if not task.done():
                task.cancel()
            await self._close_ws(ws)
        self.active_connections.clear()
        if self.base_ws_id:
            await ws_db.delete_ws(self.pool, self.base_ws_id)
            logging.info(f"✅ WS ID {self.base_ws_id} DB'den başarıyla silindi.")
            self.base_ws_id = None
        
    async def _open_redundant_pair(self, listenkeys: list, base_id: int = None):
        streams = "/".join(listenkeys)
        url = f"{self.url}/stream?streams={streams}"
        if base_id is None:
            self.base_ws_id = await ws_db.insert_ws(self.pool, "redundant-group", "binance", url)
        else:
            self.base_ws_id = base_id
        await ws_db.update_ws_url_and_count(self.pool, self.base_ws_id, url, len(listenkeys))
        for i in range(2):
            name = f"ws_{self.base_ws_id}_redundant-{i}"
            logging.info(f"🌐 [{name}] bağlantı açılıyor...")
            try:
                conn = await websockets.connect(url, ping_interval=20, ping_timeout=10)
                task = asyncio.create_task(self._listen(conn, name))
                self.active_connections[name] = (conn, task)
            except Exception as e:
                logging.error(f"❌ [{name}] bağlantı hatası: {e}")

    async def _listen(self, ws, role: str):
        try:
            async for msg in ws:
                data = json.loads(msg)
                if not self.dedup.is_duplicate(data):
                    logging.debug(f"[{role}] {data['stream']}: {data['data']['e']}")
        except websockets.exceptions.ConnectionClosed:
            logging.warning(f"🔌 [{role}] bağlantısı kapandı.")
        except Exception as e:
            logging.error(f"[{role}] dinleme hatası: {e}")

    async def _close_ws(self, ws):
        if ws:
            try:
                await ws.close()
            except Exception as e:
                logging.warning(f"WebSocket kapatılırken bir istisna oluştu: {e}")

class DynamicListenerManager:
    """
    Tüm WebSocket yöneticilerini yönetir, DB olaylarına göre
    ekleme/çıkarma işlemlerini AKILLICA GRUPLAYARAK organize eder.
    """
    def __init__(self, pool, url="wss://fstream.binance.com", max_per_ws=100):
        self.pool = pool
        self.url = url
        self.max_per_ws = max_per_ws
        self.active_managers = {}
        # YENİ: Gelen 'new' key'leri işlemek için bir kuyruk (queue/buffer)
        self.new_key_queue = asyncio.Queue()

    async def run(self):
        await self._initialize_from_db()
        # İki ana görevi paralel olarak başlatıyoruz:
        # 1. Veritabanı olaylarını dinle ve kuyruğa at.
        # 2. Kuyruktaki anahtarları toplu olarak işle.
        await asyncio.gather(
            self._listen_for_db_events(),
            self._process_new_key_buffer()
        )

    async def _initialize_from_db(self):
        logging.info("🚀 Sistem başlangıcı: Veritabanındaki mevcut durum okunuyor...")
        active_ws_records = await ws_db.get_active_ws(self.pool)
        for ws_record in active_ws_records:
            ws_id = ws_record['id']
            keys_records = await ws_db.get_streamkeys_by_ws(self.pool, ws_id)
            listenkeys = [rec['stream_key'] for rec in keys_records]
            if not listenkeys:
                logging.warning(f"⚠️ WS ID {ws_id} DB'de aktif ama anahtarı yok. Siliniyor...")
                await ws_db.delete_ws(self.pool, ws_id)
                continue
            logging.info(f"🚀 Başlangıç: WS ID {ws_id} için Redundant Manager başlatılıyor ({len(listenkeys)} anahtar).")
            manager = WebSocketRedundantManager(self.pool, listenkeys, self.url)
            await manager.start(existing_ws_id=ws_id)
            self.active_managers[ws_id] = manager
        logging.info("✅ Başlangıç senkronizasyonu tamamlandı.")

    async def _listen_for_db_events(self):
        conn = await self.pool.acquire()
        try:
            await conn.add_listener("streamkey_events", self._db_event_callback)
            logging.info("🔔 Veritabanı 'streamkey_events' kanalı dinleniyor...")
            while True:
                await asyncio.sleep(60)
        finally:
            await conn.remove_listener("streamkey_events", self._db_event_callback)
            await self.pool.release(conn)

    def _db_event_callback(self, conn, pid, channel, payload):
        logging.info(f"📦 DB'den yeni olay alındı: {payload}")
        event = json.loads(payload)
        status = event.get("status")
        
        if status == 'new':
            # 'new' key'i anında işlemek yerine kuyruğa atıyoruz.
            self.new_key_queue.put_nowait(event)
        elif status in ('remove', 'expired', 'error'):
            # Kaldırma işlemleri hala anında işlenebilir.
            asyncio.create_task(self._handle_remove_key(event))

    async def _process_new_key_buffer(self):
        """Kuyruktaki yeni anahtarları toplu halde ve akıllıca işler."""
        while True:
            # Kuyruktan ilk anahtarı bekle
            first_event = await self.new_key_queue.get()
            batch = [first_event['stream_key']]
            
            # Kuyrukta başka anahtar var mı diye hızlıca kontrol et ve toplu al
            while not self.new_key_queue.empty():
                event = self.new_key_queue.get_nowait()
                batch.append(event['stream_key'])
            
            logging.info(f"➕ Toplu ekleme işlemi: {len(batch)} adet yeni anahtar işlenecek.")
            await self._place_new_keys_intelligently(batch)

    async def _place_new_keys_intelligently(self, keys_to_add: list):
        """Yeni anahtarları mevcut WS gruplarına doldurur veya yenisini açar."""
        
        # 1. Adım: Mevcut gruplardaki boşlukları doldur
        for ws_id, manager in self.active_managers.items():
            if not keys_to_add: break # Eklenecek anahtar kalmadıysa döngüden çık
            
            current_count = len(manager.listenkeys)
            space_available = self.max_per_ws - current_count
            
            if space_available > 0:
                keys_for_this_manager = keys_to_add[:space_available]
                keys_to_add = keys_to_add[space_available:]
                
                logging.info(f"  -> {len(keys_for_this_manager)} anahtar mevcut WS ID {ws_id} grubuna ekleniyor.")
                await attach_listenkeys_to_ws(self.pool, ws_id, keys_for_this_manager)
                updated_keys_records = await ws_db.get_streamkeys_by_ws(self.pool, ws_id)
                updated_keys = [rec['stream_key'] for rec in updated_keys_records]
                await manager.update_and_restart(updated_keys)

        # 2. Adım: Hala eklenecek anahtar kaldıysa, yeni gruplar oluştur
        while keys_to_add:
            keys_for_new_manager = keys_to_add[:self.max_per_ws]
            keys_to_add = keys_to_add[self.max_per_ws:]

            logging.info(f"  -> Kapasitesi olan grup kalmadı. {len(keys_for_new_manager)} anahtar için yeni WS grubu oluşturuluyor.")
            new_manager = WebSocketRedundantManager(self.pool, keys_for_new_manager, self.url)
            await new_manager.start()
            if new_manager.base_ws_id:
                self.active_managers[new_manager.base_ws_id] = new_manager
            logging.info(f"✅ Yeni WS grubu {new_manager.base_ws_id} oluşturuldu.")

    async def _handle_remove_key(self, event: dict):
        """Bir listenKey'i ait olduğu WS grubundan çıkarır."""
        ws_id = event.get("ws_id")
        listen_key = event.get("stream_key")
        logging.info(f"➖ Çıkarma işlemi başlatılıyor: {listen_key} (WS ID: {ws_id})")

        if not ws_id:
            logging.error(f"❌ Çıkarma hatası: {listen_key} için ws_id bilgisi olayda bulunamadı!")
            return

        manager = self.active_managers.get(ws_id)
        if not manager:
            logging.warning(f"⚠️ WS ID {ws_id} için aktif yönetici bulunamadı (belki zaten kapatılmış).")
            return

        updated_keys_records = await ws_db.get_streamkeys_by_ws(self.pool, ws_id)
        updated_keys = [rec['stream_key'] for rec in updated_keys_records]
        
        await manager.update_and_restart(updated_keys)

        if manager.base_ws_id is None:
            self.active_managers.pop(ws_id, None)

async def main():
    pool = await config.get_async_pool()
    if not pool:
        logging.error("❌ Veritabanı bağlantı havuzu oluşturulamadı. Çıkılıyor.")
        return
    
    manager = DynamicListenerManager(pool, max_per_ws=100)
    await manager.run()

if __name__ == "__main__":
    asyncio.run(main())