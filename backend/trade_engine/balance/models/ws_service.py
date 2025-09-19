import asyncio,websockets, logging,json
from decimal import Decimal # YENİ
from backend.trade_engine import config
from backend.trade_engine import config
from backend.trade_engine.balance.db.stream_key_db import attach_listenkeys_to_ws
from backend.trade_engine.balance.db import ws_db
from backend.trade_engine.balance.db.futures_writer_db import batch_upsert_futures_balances, batch_upsert_futures_orders
from backend.trade_engine.taha_part.utils.price_cache_new import get_price


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class Deduplicator:
    def __init__(self, max_size: int = 1000):
        self.seen = set()
        self.max_size = max_size

    def is_duplicate(self, event: dict) -> bool:
        # DEĞİŞTİ: Daha güvenilir bir UID için event'in tamamını kullanabiliriz
        uid_str = json.dumps(event, sort_keys=True)
        if uid_str in self.seen: return True
        self.seen.add(uid_str)
        if len(self.seen) > self.max_size:
            self.seen = set(list(self.seen)[-self.max_size:])
        return False

class WebSocketRedundantManager:
    # DEĞİŞTİ: Artık sadece listenkey listesi yerine (key, user_id, api_id) içeren bir dict listesi alıyor
    def __init__(self, pool, initial_key_info: list, url: str):
        self.pool = pool
        self.key_info = initial_key_info
        # YENİ: listenKey'den user_id/api_id'ye hızlı erişim için bir map (sözlük)
        self.key_to_user_map = {info['stream_key']: info for info in self.key_info}
        self.listenkeys = list(self.key_to_user_map.keys())
        self.url = url
        self.dedup = Deduplicator()
        self.active_connections = {}
        self.base_ws_id = None
        # YENİ: Veri kuyrukları ve writer task'ları
        self.balance_update_queue = {}
        self.order_update_queue = []
        self.writer_tasks = []

    async def start(self, existing_ws_id: int = None):
        if not self.listenkeys:
            logging.warning("Başlatılacak listenKey bulunmadığı için WebSocketRedundantManager başlatılmadı.")
            return
        await self._open_redundant_pair(self.listenkeys, existing_ws_id)
        await attach_listenkeys_to_ws(self.pool, self.base_ws_id, self.listenkeys)
        # YENİ: Writer görevlerini başlatıyoruz
        self.writer_tasks.append(asyncio.create_task(self._balance_batch_writer()))
        self.writer_tasks.append(asyncio.create_task(self._order_batch_writer()))
        logging.info(f"✅ [WS ID: {self.base_ws_id}] Bakiye ve emir yazıcıları başlatıldı.")

    # DEĞİŞTİ: new_listenkeys yerine new_key_info alıyor
    async def update_and_restart(self, new_key_info: list):
        logging.info(f"🔄 WS ID {self.base_ws_id} için overlap/restart süreci başlatılıyor. Yeni anahtar sayısı: {len(new_key_info)}")
        if not new_key_info:
            await self.shutdown()
            return
        
        # YENİ: Önce eski yazıcıları ve bağlantıları durdur
        for task in self.writer_tasks:
            task.cancel()
        self.writer_tasks.clear()
        old_connections = list(self.active_connections.values())
        self.active_connections.clear()

        # YENİ: Yeni anahtar bilgileriyle yeniden başlat
        self.key_info = new_key_info
        self.key_to_user_map = {info['stream_key']: info for info in self.key_info}
        self.listenkeys = list(self.key_to_user_map.keys())
        await self.start(existing_ws_id=self.base_ws_id)

        await asyncio.sleep(5)
        logging.info(f"⏳ Overlap süresi doldu. WS ID {self.base_ws_id} için eski bağlantılar kapatılıyor.")
        for ws, task in old_connections:
            if not task.done(): task.cancel()
            await self._close_ws(ws)
        logging.info(f"✅ WS ID {self.base_ws_id} için overlap/restart tamamlandı.")

    async def shutdown(self):
        logging.info(f"🗑️ WS ID {self.base_ws_id} için hiç anahtar kalmadı. Kapatılıyor.")
        for task in self.writer_tasks: # YENİ: Yazıcıları durdur
            task.cancel()
        for ws, task in self.active_connections.values():
            if not task.done(): task.cancel()
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
            self.base_ws_id = await ws_db.insert_ws(self.pool, "redundant-group-futures", "binance", url)
        else:
            self.base_ws_id = base_id
        await ws_db.update_ws_url_and_count(self.pool, self.base_ws_id, url, len(listenkeys))
        for i in range(2):
            name = f"ws_{self.base_ws_id}_redundant-{i}"
            try:
                conn = await websockets.connect(url, ping_interval=20, ping_timeout=10)
                task = asyncio.create_task(self._listen(conn, name))
                self.active_connections[name] = (conn, task)
                logging.info(f"🌐 [{name}] bağlantı açıldı.")
            except Exception as e:
                logging.error(f"❌ [{name}] bağlantı hatası: {e}")

    # DEĞİŞTİ: _listen artık veriyi işlemek için _handle_event'e yönlendiriyor
    async def _listen(self, ws, role: str):
        try:
            async for msg in ws:
                data = json.loads(msg)
                event_data = data.get('data', {})
                if 'e' in event_data and not self.dedup.is_duplicate(event_data):
                    # Yönlendirme yapılıyor
                    asyncio.create_task(self._handle_event(data))
        except websockets.exceptions.ConnectionClosed:
            logging.warning(f"🔌 [{role}] bağlantısı kapandı.")
        except Exception as e:
            logging.error(f"[{role}] dinleme hatası: {e}", exc_info=True)

    async def _handle_event(self, event: dict):
        stream_key = event.get('stream')
        user_info = self.key_to_user_map.get(stream_key)
        if not user_info: return

        event_data = event.get('data')
        event_type = event_data.get('e')

        try:
            if event_type == 'ACCOUNT_UPDATE':
                self._handle_account_update(event_data, user_info)
            elif event_type == 'ORDER_TRADE_UPDATE':
                # Artık async olduğu için await ile çağırıyoruz
                await self._handle_order_update(event_data, user_info)
        except Exception as e:
            logging.error(f"❌ Olay işlenirken hata (event_type: {event_type}): {e}", exc_info=True)
    # YENİ: Bakiye güncelleme olayını işler ve kuyruğa atar
    def _handle_account_update(self, data: dict, user_info: dict):
        update_info = data.get('a', {})
        if not update_info.get('B'): return
        
        user_id, api_id = user_info['user_id'], user_info['api_id']
        self.balance_update_queue[(user_id, api_id)] = {
            "user_id": user_id, "api_id": api_id,
            "assets": update_info.get('B', [])
        }
        logging.debug(f"Futures bakiye güncellemesi kuyruğa eklendi: user_id={user_id}")

    # YENİ: Emir güncelleme olayını işler ve kuyruğa atar
    async def _handle_order_update(self, data: dict, user_info: dict):
        order_info = data.get('o', {})

        # 1. Komisyon miktarını ve birimini al
        commission_amount = Decimal(order_info.get("n", "0"))
        commission_asset = order_info.get("N")  # Komisyon birimi (örn: "BNB", "USDT")
        commission_in_usdt = commission_amount

        # 2. Eğer birim USDT değilse ve miktar sıfırdan büyükse çevir
        if commission_asset and commission_asset.upper() != "USDT" and commission_amount > 0:
            try:
                conversion_symbol = f"{commission_asset.upper()}USDT"
                # Fiyatı price_cache'den al (komisyon varlıkları spot'ta işlem görür)
                price = await get_price(conversion_symbol, "spot")

                if price and price > 0:
                    commission_in_usdt = commission_amount * Decimal(str(price))
                    logging.info(f"💰 [Futures WS] Komisyon dönüştürüldü: {commission_amount} {commission_asset} -> {commission_in_usdt:.6f} USDT")
                else:
                    logging.warning(f"⚠️ [Futures WS] {conversion_symbol} için fiyat alınamadı. Komisyon orijinal değeriyle kaydedilecek.")
            except Exception as e:
                logging.error(f"❌ [Futures WS] Komisyon dönüştürme hatası: {e}. Komisyon orijinal değeriyle kaydedilecek.")

        # 3. Veritabanına yazılacak veriyi hazırla
        order_data = {
            "user_id": user_info['user_id'],
            "api_id": user_info['api_id'],
            "symbol": order_info.get("s"),
            "client_order_id": order_info.get("c"),
            "side": order_info.get("S"),
            "position_side": order_info.get("ps"),
            "status": order_info.get("X"),
            "price": Decimal(order_info.get("p", "0")),
            "executed_quantity": Decimal(order_info.get("z", "0")),
            "commission": commission_in_usdt,  # <-- GÜNCELLENDİ
            "realized_profit": Decimal(order_info.get("rp", "0")),
            "order_id": order_info.get("i"),
            "event_time": order_info.get("T")
        }
        self.order_update_queue.append(order_data)
        logging.debug(f"Futures emir güncellemesi kuyruğa eklendi: user_id={user_info['user_id']}, order_id={order_data['order_id']}")



    # YENİ: Bakiye kuyruğunu DB'ye yazar
    async def _balance_batch_writer(self):
        while True:
            await asyncio.sleep(5)
            if self.balance_update_queue:
                queue_copy = list(self.balance_update_queue.values())
                self.balance_update_queue.clear()
                try:
                    await batch_upsert_futures_balances(self.pool, queue_copy)
                except Exception as e:
                    logging.error(f"❌ [Batch] Futures Bakiye DB güncellemesi başarısız: {e}", exc_info=True)

    # YENİ: Emir kuyruğunu DB'ye yazar
    async def _order_batch_writer(self):
        while True:
            await asyncio.sleep(3)
            if self.order_update_queue:
                queue_copy = self.order_update_queue.copy()
                self.order_update_queue.clear()
                try:
                    await batch_upsert_futures_orders(self.pool, queue_copy)
                except Exception as e:
                    logging.error(f"❌ [Batch] Futures Emir DB güncellemesi başarısız: {e}", exc_info=True)

    async def _close_ws(self, ws):
            # DÜZELTME: 'ws.closed' kontrolü kaldırıldı.
            # ws.close() metodu zaten kapalı bir bağlantı için hata vermez.
            if ws:
                try:
                    await ws.close()
                except Exception: 
                    pass

class DynamicListenerManager:
    def __init__(self, pool, url="wss://fstream.binance.com", max_per_ws=100):
        self.pool = pool
        self.url = url
        self.max_per_ws = max_per_ws
        self.active_managers = {}
        self.new_key_queue = asyncio.Queue()

    # ws_service.py DOSYASINA EKLENECEK KOD
# DynamicListenerManager sınıfının içine ekleyin

    async def _listen_for_db_events(self):
        """
        PostgreSQL'in LISTEN/NOTIFY mekanizmasını kullanarak veritabanı olaylarını
        sürekli olarak dinler ve ilgili callback fonksiyonunu tetikler.
        """
        channel_name = "streamkey_events" # DB trigger'ınızın bildirim gönderdiği kanal
        logging.info(f"👂 Veritabanı '{channel_name}' kanalı dinlenmeye başlanıyor...")
        
        # Bu metodun sürekli çalışması için bir sonsuz döngü gerekiyor.
        # asyncpg, add_listener'ı bağlantı açık kaldığı sürece çalıştırır.
        # Bu yüzden bağlantıyı açık tutmalıyız.
        while True:
            try:
                conn = await self.pool.acquire()
                await conn.add_listener(channel_name, self._db_event_callback)
                
                # Bağlantıyı ve listener'ı aktif tutmak için bekliyoruz.
                # Eğer bağlantı koparsa, döngü yeniden başlayacak ve
                # yeni bir bağlantı ile listener tekrar kurulacak.
                while True:
                    await asyncio.sleep(3600) # Periyodik olarak bekle
            except Exception as e:
                logging.error(f"❌ Veritabanı dinleyicisinde hata: {e}. Yeniden bağlanılıyor...", exc_info=True)
                # Bağlantıyı release et (eğer varsa) ve kısa bir süre sonra tekrar dene
                if 'conn' in locals() and not conn.is_closed():
                    try:
                        await self.pool.release(conn)
                    except Exception as release_error:
                        logging.error(f"Bağlantı bırakılırken hata: {release_error}")
                await asyncio.sleep(5)

    async def run(self):
        await self._initialize_from_db()
        await asyncio.gather(self._listen_for_db_events(), self._process_new_key_buffer())

    # GÜNCELLENDİ: Bu fonksiyon artık sahipsiz 'new' key'leri de başlatıyor.
    # ws_service.py içindeki DynamicListenerManager sınıfına ait fonksiyon
    async def _initialize_from_db(self):
        """
        Sistem başlangıcında temiz bir kurulum yapar.
        1. Önceki çalıştırmadan kalma tüm 'futures' WS kayıtlarını temizler. (EN GÜVENİLİR YÖNTEM)
        2. YENİ: Sadece 'new' veya 'active' durumundaki geçerli futures anahtarlarının ws_id'lerini sıfırlar.
        3. Bu anahtarlar için sıfırdan WebSocket grupları oluşturur.
        """
        logging.info("🚀 Sistem başlangıcı: Temiz bir kurulum için veritabanı hazırlanıyor...")
        
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                # 1. Adım: Eski ve geçersiz 'futures' WS kayıtlarını temizle
                logging.info("  -> Eski 'futures' WebSocket kayıtları siliniyor...")
                await conn.execute("DELETE FROM websocket_connections WHERE name LIKE '%futures%'")
                
                # 2. Adım: Futures anahtarlarının ws_id'lerini sıfırla (GÜNCELLENDİ)
                logging.info("  -> 'new'/'active' durumundaki Futures anahtarlarının eski bağlantı ID'leri temizleniyor...")
                await conn.execute("""
                    UPDATE stream_keys 
                    SET ws_id = NULL 
                    WHERE status IN ('new', 'active') AND is_futures_enabled = TRUE
                """)

                # 3. Adım: Kurulması gereken TÜM anahtarları topla
                logging.info("  -> 'new' ve 'active' durumundaki tüm futures anahtarları toplanıyor...")
                keys_to_start = await conn.fetch("""
                    SELECT user_id, api_id, stream_key 
                    FROM stream_keys 
                    WHERE is_futures_enabled = TRUE AND status IN ('new', 'active')
                """)

        if not keys_to_start:
            logging.info("✅ Başlatılacak aktif veya yeni futures anahtarı bulunamadı.")
        else:
            logging.info(f"➕ {len(keys_to_start)} adet futures anahtarı bulundu. WebSocket grupları oluşturulacak...")
            events_to_add = [
                {'stream_key': key['stream_key'], 'user_id': key['user_id'], 'api_id': key['api_id']}
                for key in keys_to_start
            ]
            await self._place_new_keys_intelligently(events_to_add)

        logging.info("✅ Başlangıç senkronizasyonu tamamlandı.")


    def _db_event_callback(self, conn, pid, channel, payload):
        logging.info(f"📦 DB'den yeni olay alındı: {payload}")
        event = json.loads(payload)
        status = event.get("status")
        if status == 'new':
            self.new_key_queue.put_nowait(event)
        elif status in ('remove', 'expired', 'error'):
            asyncio.create_task(self._handle_remove_key(event))

    async def _process_new_key_buffer(self):
        while True:
            first_event = await self.new_key_queue.get()
            batch = [first_event] # DEĞİŞTİ: Artık key yerine tüm event objesini tutuyoruz
            while not self.new_key_queue.empty():
                batch.append(self.new_key_queue.get_nowait())
            
            logging.info(f"➕ Toplu ekleme işlemi: {len(batch)} adet yeni anahtar işlenecek.")
            await self._place_new_keys_intelligently(batch)

    # DEĞİŞTİ: Artık key listesi yerine event listesi alıyor
    async def _place_new_keys_intelligently(self, events_to_add: list):
        for ws_id, manager in self.active_managers.items():
            if not events_to_add: break
            
            current_count = len(manager.listenkeys)
            space_available = self.max_per_ws - current_count
            if space_available > 0:
                events_for_this_manager = events_to_add[:space_available]
                events_to_add = events_to_add[space_available:]
                
                keys_for_this_manager = [event['stream_key'] for event in events_for_this_manager]
                logging.info(f"  -> {len(keys_for_this_manager)} anahtar mevcut WS ID {ws_id} grubuna ekleniyor.")
                await attach_listenkeys_to_ws(self.pool, ws_id, keys_for_this_manager)
                updated_keys_records = await ws_db.get_streamkeys_by_ws(self.pool, ws_id)
                await manager.update_and_restart([dict(rec) for rec in updated_keys_records])

        while events_to_add:
            events_for_new_manager = events_to_add[:self.max_per_ws]
            events_to_add = events_to_add[self.max_per_ws:]

            # YENİ: Gelen event'lerden key_info listesini oluştur
            key_info_list = [{'stream_key': e['stream_key'], 'user_id': e['user_id'], 'api_id': e['api_id']} for e in events_for_new_manager]
            logging.info(f"  -> Kapasitesi olan grup kalmadı. {len(key_info_list)} anahtar için yeni WS grubu oluşturuluyor.")
            new_manager = WebSocketRedundantManager(self.pool, key_info_list, self.url)
            await new_manager.start()
            if new_manager.base_ws_id:
                self.active_managers[new_manager.base_ws_id] = new_manager
            logging.info(f"✅ Yeni WS grubu {new_manager.base_ws_id} oluşturuldu.")

    async def _handle_remove_key(self, event: dict):
        ws_id, listen_key = event.get("ws_id"), event.get("stream_key")
        logging.info(f"➖ Çıkarma işlemi başlatılıyor: {listen_key} (WS ID: {ws_id})")
        if not ws_id:
            logging.error(f"❌ Çıkarma hatası: {listen_key} için ws_id bilgisi olayda bulunamadı!")
            return

        manager = self.active_managers.get(ws_id)
        if not manager:
            logging.warning(f"⚠️ WS ID {ws_id} için aktif yönetici bulunamadı.")
            await ws_db.set_stream_key_closed_and_null_ws_id(self.pool, listen_key)
            return

        # DEĞİŞTİ: Kalan anahtarların tam bilgisini al
        updated_keys_records = await ws_db.get_streamkeys_by_ws(self.pool, ws_id)
        await manager.update_and_restart([dict(rec) for rec in updated_keys_records])
        await ws_db.set_stream_key_closed_and_null_ws_id(self.pool, listen_key)
        logging.info(f"✅ DB Güncellemesi: {listen_key} durumu 'closed' ve ws_id NULL olarak ayarlandı.")

        if manager.base_ws_id is None:
            self.active_managers.pop(ws_id, None)

async def main():
    # YENİ: Hata yakalama bloğu eklendi
    try:
        pool = await config.get_async_pool()
        if not pool:
            logging.error("❌ Veritabanı bağlantı havuzu oluşturulamadı. Çıkılıyor.")
            return
        
        logging.info("DynamicListenerManager başlatılıyor...")
        manager = DynamicListenerManager(pool, max_per_ws=100)
        await manager.run()
    except Exception as e:
        # Hata oluşursa, tüm detaylarıyla logla
        logging.error("❌ FUTURES SERVİSİNDE BEKLENMEDİK BİR HATA OLUŞTU!", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main())

if __name__ == "__main__":
    asyncio.run(main())