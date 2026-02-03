# ws_service.py
import asyncio,websockets, logging,json, ssl
from decimal import Decimal
from trade_engine import config
# DEĞİŞİKLİK: Merkezi bağlantı yönetimi için asyncpg_connection import edildi.
from trade_engine.config import asyncpg_connection
from trade_engine.balance.db.stream_key_db import attach_listenkeys_to_ws
from trade_engine.balance.db import ws_db
from trade_engine.balance.db.futures_writer_db import batch_upsert_futures_balances, batch_upsert_futures_orders
from trade_engine.order_engine.core.price_store import price_store
import asyncpg
import os
from asyncpg import exceptions as apg_exc

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class Deduplicator:
    def __init__(self, max_size: int = 1000):
        self.seen = set()
        self.max_size = max_size

    def is_duplicate(self, event: dict) -> bool:
        uid_str = json.dumps(event, sort_keys=True)
        if uid_str in self.seen: return True
        self.seen.add(uid_str)
        if len(self.seen) > self.max_size:
            self.seen = set(list(self.seen)[-self.max_size:])
        return False

class WebSocketRedundantManager:
    # DEĞİŞİKLİK: __init__ artık 'pool' parametresi almıyor.
    def __init__(self, initial_key_info: list, url: str):
        # self.pool kaldırıldı.
        self.key_info = initial_key_info
        self.key_to_user_map = {info['stream_key']: info for info in self.key_info}
        self.listenkeys = list(self.key_to_user_map.keys())
        self.url = url
        self.dedup = Deduplicator()
        self.active_connections = {}
        self.base_ws_id = None
        self.balance_update_queue = {}
        self.order_update_queue = []
        self.writer_tasks = []

    async def start(self, existing_ws_id: int = None):
        if not self.listenkeys:
            logging.warning("Başlatılacak listenKey bulunmadığı için WebSocketRedundantManager başlatılmadı.")
            return
        await self._open_redundant_pair(self.listenkeys, existing_ws_id)
        # DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor.
        await attach_listenkeys_to_ws(self.base_ws_id, self.listenkeys)
        self.writer_tasks.append(asyncio.create_task(self._balance_batch_writer()))
        self.writer_tasks.append(asyncio.create_task(self._order_batch_writer()))
        logging.info(f"✅ [WS ID: {self.base_ws_id}] Bakiye ve emir yazıcıları başlatıldı.")

    async def update_and_restart(self, new_key_info: list):
        logging.info(f"🔄 WS ID {self.base_ws_id} için overlap/restart süreci başlatılıyor. Yeni anahtar sayısı: {len(new_key_info)}")
        if not new_key_info:
            await self.shutdown()
            return
        
        for task in self.writer_tasks:
            task.cancel()
        self.writer_tasks.clear()
        old_connections = list(self.active_connections.values())
        self.active_connections.clear()

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
        for task in self.writer_tasks:
            task.cancel()
        for ws, task in self.active_connections.values():
            if not task.done(): task.cancel()
            await self._close_ws(ws)
        self.active_connections.clear()
        if self.base_ws_id:
            # DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor.
            await ws_db.delete_ws(self.base_ws_id)
            logging.info(f"✅ WS ID {self.base_ws_id} DB'den başarıyla silindi.")
            self.base_ws_id = None
        
    async def _open_redundant_pair(self, listenkeys: list, base_id: int = None):
        streams = "/".join(listenkeys)
        url = f"{self.url}/stream?streams={streams}"
        if base_id is None:
            # DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor.
            self.base_ws_id = await ws_db.insert_ws("redundant-group-futures", "binance", url)
        else:
            self.base_ws_id = base_id
        # DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor.
        await ws_db.update_ws_url_and_count(self.base_ws_id, url, len(listenkeys))
        for i in range(2):
            name = f"ws_{self.base_ws_id}_redundant-{i}"
            try:
                # SSL Context ekle
                # SSL Context: Güvenliği tamamen devre dışı bırak
                ssl_context = ssl._create_unverified_context()
                conn = await websockets.connect(url, ssl=ssl_context, ping_interval=20, ping_timeout=10)
                task = asyncio.create_task(self._listen(conn, name))
                self.active_connections[name] = (conn, task)
                logging.info(f"🌐 [{name}] bağlantı açıldı.")
            except Exception as e:
                logging.error(f"❌ [{name}] bağlantı hatası: {e}")

    async def _listen(self, ws, role: str):
        try:
            async for msg in ws:
                data = json.loads(msg)
                event_data = data.get('data', {})
                if 'e' in event_data and not self.dedup.is_duplicate(event_data):
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
                await self._handle_order_update(event_data, user_info)
        except Exception as e:
            logging.error(f"❌ Olay işlenirken hata (event_type: {event_type}): {e}", exc_info=True)
            
    def _handle_account_update(self, data: dict, user_info: dict):
        update_info = data.get('a', {})
        if not update_info.get('B'): return
        
        user_id, api_id = user_info['user_id'], user_info['api_id']
        self.balance_update_queue[(user_id, api_id)] = {
            "user_id": user_id, "api_id": api_id,
            "assets": update_info.get('B', [])
        }
        logging.debug(f"Futures bakiye güncellemesi kuyruğa eklendi: user_id={user_id}")

    async def _handle_order_update(self, data: dict, user_info: dict):
        order_info = data.get('o', {})
        commission_amount = Decimal(order_info.get("n", "0"))
        commission_asset = order_info.get("N")
        commission_in_usdt = commission_amount
        if commission_asset and commission_asset.upper() != "USDT" and commission_amount > 0:
            try:
                conversion_symbol = f"{commission_asset.upper()}USDT"
                ticker = price_store.get_price("BINANCE_SPOT", conversion_symbol)
                if ticker:
                    price = ticker.last
                    if price > 0:
                        commission_in_usdt = commission_amount * Decimal(str(price))
                        logging.info(f"💰 [Futures WS] Komisyon dönüştürüldü: {commission_amount} {commission_asset} -> {commission_in_usdt:.6f} USDT")
                else:
                    logging.warning(f"⚠️ [Futures WS] {conversion_symbol} için fiyat alınamadı.")
            except Exception as e:
                logging.error(f"❌ [Futures WS] Komisyon dönüştürme hatası: {e}.")

        execution_price = Decimal(order_info.get("ap", "0")) or Decimal(order_info.get("p", "0"))
        
        order_data = {
            "user_id": user_info['user_id'],
            "api_id": user_info['api_id'],
            "symbol": order_info.get("s"),
            "side": order_info.get("S"),
            "position_side": order_info.get("ps"),
            "status": order_info.get("X"),
            "price": execution_price,
            "executed_quantity": Decimal(order_info.get("z", "0")),
            "quantity": Decimal(order_info.get("q", "0")),
            "commission": commission_in_usdt,
            "realized_profit": Decimal(order_info.get("rp", "0")),
            "order_id": order_info.get("i"),
            "event_time": order_info.get("T")
        }

        self.order_update_queue.append(order_data)
        logging.debug(f"Futures emir güncellemesi kuyruğa eklendi: user_id={user_info['user_id']}, order_id={order_data['order_id']}")

    async def _balance_batch_writer(self):
        while True:
            await asyncio.sleep(5)
            if self.balance_update_queue:
                queue_copy = list(self.balance_update_queue.values())
                self.balance_update_queue.clear()
                try:
                    # DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor.
                    await batch_upsert_futures_balances(queue_copy)
                except Exception as e:
                    logging.error(f"❌ [Batch] Futures Bakiye DB güncellemesi başarısız: {e}", exc_info=True)

    async def _order_batch_writer(self):
        while True:
            await asyncio.sleep(3)
            if self.order_update_queue:
                queue_copy = self.order_update_queue.copy()
                self.order_update_queue.clear()
                try:
                    # DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor.
                    await batch_upsert_futures_orders(queue_copy)
                except Exception as e:
                    logging.error(f"❌ [Batch] Futures Emir DB güncellemesi başarısız: {e}", exc_info=True)

    async def _close_ws(self, ws):
            if ws:
                try:
                    await ws.close()
                except Exception: 
                    pass

class DynamicListenerManager:
    # DEĞİŞİKLİK: __init__ artık 'pool' parametresi almıyor.
    def __init__(self, url="wss://fstream.binance.com", max_per_ws=100):
        # self.pool kaldırıldı.
        self.url = url
        self.max_per_ws = max_per_ws
        self.active_managers = {}
        self.new_key_queue = asyncio.Queue()

    async def _listen_for_db_events(self):
        channel_name = "streamkey_events"
        logging.info(f"👂 '{channel_name}' kanalı dinlenmeye başlanıyor...")
        while True:
            conn = None
            try:
                conn = await asyncpg.connect(
                    user=os.getenv("PGUSER","postgres"),
                    password=os.getenv("PGPASSWORD","admin"),
                    database=os.getenv("PGDATABASE","balina_db"),
                    host=os.getenv("PGHOST","127.0.0.1"),
                    port=os.getenv("PGPORT","5432")
                )
                await conn.add_listener(channel_name, self._db_event_callback)
                while True:
                    await asyncio.sleep(3600)
            except Exception as e:
                logging.error(f"❌ Listener bağlantı hatası: {e}. 5s sonra yeniden denenecek.", exc_info=True)
                try:
                    if conn and not conn.is_closed():
                        await conn.close()
                except Exception:
                    pass
                await asyncio.sleep(5)

    async def run(self):
        await self._initialize_from_db()
        await asyncio.gather(self._listen_for_db_events(), self._process_new_key_buffer())

    async def _initialize_from_db(self):
        logging.info("🚀 Sistem başlangıcı: Temiz kurulum...")
        try:
            # DEĞİŞİKLİK: self.pool.acquire() yerine config'den gelen context manager kullanılıyor.
            async with asyncpg_connection() as conn:
                async with conn.transaction():
                    logging.info("  -> Eski 'futures' WS kayıtları siliniyor...")
                    await conn.execute("DELETE FROM websocket_connections WHERE name LIKE '%futures%'")

                    logging.info("  -> 'new'/'active' futures anahtarlarının ws_id'leri temizleniyor...")
                    await conn.execute("""
                        UPDATE stream_keys
                        SET ws_id = NULL
                        WHERE status IN ('new','active') AND is_futures_enabled = TRUE
                    """)

                    logging.info("  -> 'new' ve 'active' futures anahtarları toplanıyor...")
                    keys_to_start = await conn.fetch("""
                        SELECT user_id, api_id, stream_key
                        FROM stream_keys
                        WHERE is_futures_enabled = TRUE AND status IN ('new','active')
                    """)
        except apg_exc.InterfaceError as ie:
            logging.warning(f"Pool closing saptandı, resetleniyor: {ie}")
            await config.close_async_pool()
            # Tekrar deneme
            async with asyncpg_connection() as conn:
                async with conn.transaction():
                    await conn.execute("DELETE FROM websocket_connections WHERE name LIKE '%futures%'")
                    await conn.execute("""
                        UPDATE stream_keys
                        SET ws_id = NULL
                        WHERE status IN ('new','active') AND is_futures_enabled = TRUE
                    """)
                    keys_to_start = await conn.fetch("""
                        SELECT user_id, api_id, stream_key
                        FROM stream_keys
                        WHERE is_futures_enabled = TRUE AND status IN ('new','active')
                    """)
        
        if not keys_to_start:
            logging.info("✅ Başlatılacak aktif veya yeni futures anahtarı yok.")
        else:
            logging.info(f"➕ {len(keys_to_start)} anahtar bulundu. WS grupları oluşturulacak...")
            events_to_add = [
                {'stream_key': k['stream_key'], 'user_id': k['user_id'], 'api_id': k['api_id']}
                for k in keys_to_start
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
            batch = [first_event]
            while not self.new_key_queue.empty():
                batch.append(self.new_key_queue.get_nowait())
            
            logging.info(f"➕ Toplu ekleme işlemi: {len(batch)} adet yeni anahtar işlenecek.")
            await self._place_new_keys_intelligently(batch)

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
                # DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor.
                await attach_listenkeys_to_ws(ws_id, keys_for_this_manager)
                updated_keys_records = await ws_db.get_streamkeys_by_ws(ws_id)
                await manager.update_and_restart([dict(rec) for rec in updated_keys_records])

        while events_to_add:
            events_for_new_manager = events_to_add[:self.max_per_ws]
            events_to_add = events_to_add[self.max_per_ws:]

            key_info_list = [{'stream_key': e['stream_key'], 'user_id': e['user_id'], 'api_id': e['api_id']} for e in events_for_new_manager]
            logging.info(f"  -> Kapasitesi olan grup kalmadı. {len(key_info_list)} anahtar için yeni WS grubu oluşturuluyor.")
            # DEĞİŞİKLİK: Manager'a 'pool' geçilmiyor.
            new_manager = WebSocketRedundantManager(key_info_list, self.url)
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
            # DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor.
            await ws_db.set_stream_key_closed_and_null_ws_id(listen_key)
            return

        updated_keys_records = await ws_db.get_streamkeys_by_ws(ws_id)
        await manager.update_and_restart([dict(rec) for rec in updated_keys_records])
        await ws_db.set_stream_key_closed_and_null_ws_id(listen_key)
        logging.info(f"✅ DB Güncellemesi: {listen_key} durumu 'closed' ve ws_id NULL olarak ayarlandı.")

        if manager.base_ws_id is None:
            self.active_managers.pop(ws_id, None)

async def main():
    try:
        # DEĞİŞİKLİK: 'pool' oluşturma kaldırıldı.
        logging.info("DynamicListenerManager başlatılıyor...")
        # DEĞİŞİKLİK: 'pool' artık Manager'a geçilmiyor.
        manager = DynamicListenerManager(max_per_ws=100)
        await manager.run()
    except Exception as e:
        logging.error("❌ FUTURES SERVİSİNDE BEKLENMEDİK BİR HATA OLUŞTU!", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main())