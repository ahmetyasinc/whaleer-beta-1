# spot_ws_service.py
from websockets.protocol import State
import logging, json,time,hmac, hashlib, asyncio, websockets, datetime, os
# DEĞİŞİKLİK: asyncpg import edildi.
import asyncpg
from decimal import Decimal
from backend.trade_engine import config
from backend.trade_engine.config import asyncpg_connection
from backend.trade_engine.balance.db import stream_key_db
from backend.trade_engine.balance.db.balance_writer_db import batch_upsert_balances, batch_insert_orders
from backend.trade_engine.order_engine.core.price_store import price_store

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

ORDER_SAVE_MODE = 'COMPREHENSIVE'
CLIENT_ORDER_ID_PREFIX = 'WLR_'

def sign_payload(secret: str, payload_str: str) -> str:
    return hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()

async def get_keys_for_spot_subscription():
    async with asyncpg_connection() as conn:
        rows = await conn.fetch("SELECT api_id FROM public.stream_keys WHERE spot_status IN ('new', 'active')")
        return [dict(row) for row in rows]

async def batch_update_spot_keys(updates: dict):
    if not updates: return
    update_data = []
    for api_id, values in updates.items():
        update_data.append((api_id, values.get('sub_id'), values.get('spot_status')))
    async with asyncpg_connection() as conn:
        async with conn.transaction():
            await conn.executemany("UPDATE public.stream_keys SET sub_id = $2, spot_status = $3 WHERE api_id = $1", update_data)

class SpotWsApiManager:
    URL = "wss://ws-api.binance.com:443/ws-api/v3"

    def __init__(self, order_save_mode: str):
        self.listener_conn = None
        self.ws = None
        self.subscriptions = {}
        self.pending_requests = {}
        self.db_update_queue = {}
        self.update_task = None
        self.request_id_counter = 0
        self.initialized = False
        self.order_save_mode = order_save_mode
        self.balance_update_queue = {} 
        self.order_update_queue = []
        logging.info(f"🚀 Emir Kayıt Modu: {self.order_save_mode}")

    def _get_unique_request_id(self) -> int:
        self.request_id_counter += 1
        return int(time.time() * 1000) + self.request_id_counter

    async def run(self):
        try:
            # DEĞİŞİKLİK: Hatalı config çağrısı, asyncpg.connect ile değiştirildi.
            self.listener_conn = await asyncpg.connect(
                user=os.getenv("PGUSER", "postgres"),
                password=os.getenv("PGPASSWORD", "admin"),
                database=os.getenv("PGDATABASE", "balina_db"),
                host=os.getenv("PGHOST", "127.0.0.1"),
                port=os.getenv("PGPORT", "5432"),
            )
            if not self.listener_conn:
                logging.error("❌ Dinleyici için özel veritabanı bağlantısı oluşturulamadı.")
                return

            self.update_task = asyncio.create_task(self._batch_updater())
            
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

    async def _listen_ws_messages(self):
        async for msg in self.ws:
            data = json.loads(msg)
            req_id = data.get("id")

            if req_id and req_id in self.pending_requests:
                future = self.pending_requests.pop(req_id, None)
                if future and not future.done(): future.set_result(data)
                continue

            asyncio.create_task(self._handle_stream_event(data))

    async def _initialize_from_db(self):
        logging.info("🚀 Başlangıç: DB'den 'new' ve 'active' spot anahtarları yükleniyor...")
        initial_keys = await get_keys_for_spot_subscription()
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
            event = json.loads(payload)
            operation = event.get("action")
            spot_status = event.get("spot_status") 
            api_id = event.get("api_id")
            
            if not api_id: return
            
            is_already_subscribed = any(info['api_id'] == api_id for info in self.subscriptions.values())

            if not is_already_subscribed and (operation == 'INSERT' or (operation == 'UPDATE' and spot_status == 'new')):
                asyncio.create_task(self._handle_subscribe(api_id))
            elif is_already_subscribed and (operation == 'DELETE' or (operation == 'UPDATE' and spot_status not in ['new', 'active'])):
                sub_id_to_remove = next((sub_id for sub_id, info in self.subscriptions.items() if info['api_id'] == api_id), None)
                if sub_id_to_remove is not None:
                    asyncio.create_task(self._handle_unsubscribe(api_id, sub_id_to_remove))
        except Exception as e:
            logging.error(f"❌ DB event callback işlenirken hata oluştu: {e}", exc_info=True)

    async def _send_request(self, request: dict):
        if not self.ws or self.ws.state != State.OPEN:
            return None
        request_id = request['id']
        future = asyncio.get_running_loop().create_future()
        self.pending_requests[request_id] = future
        try:
            await self.ws.send(json.dumps(request))
            return await asyncio.wait_for(future, timeout=20)
        except Exception:
            self.pending_requests.pop(request_id, None)
            return None

    async def _handle_subscribe(self, api_id: int):
        api_credentials = await stream_key_db.get_api_credentials(api_id)
        if not api_credentials:
            return
        request_id = self._get_unique_request_id()
        ts = int(time.time() * 1000)
        payload_str = f"apiKey={api_credentials['api_key']}&timestamp={ts}"
        signature = sign_payload(api_credentials['api_secret'], payload_str)
        req = {"id": request_id, "method": "userDataStream.subscribe.signature", "params": {"apiKey": api_credentials['api_key'], "timestamp": ts, "signature": signature}}
        resp = await self._send_request(req)
        if resp and resp.get("result") and resp['result'].get('subscriptionId') is not None:
            sub_id = resp['result']['subscriptionId']
            self.subscriptions[sub_id] = {'api_id': api_id, 'user_id': api_credentials['user_id']}
            self.db_update_queue[api_id] = {'sub_id': sub_id, 'spot_status': 'active'}
        else:
            self.db_update_queue[api_id] = {'sub_id': None, 'spot_status': 'error'}

    async def _resubscribe_all(self):
        tasks = [self._handle_subscribe(info['api_id']) for info in list(self.subscriptions.values())]
        self.subscriptions.clear()
        await asyncio.gather(*tasks)

    async def _handle_unsubscribe(self, api_id: int, sub_id: int):
        request_id = self._get_unique_request_id()
        req = { "id": request_id, "method": "userDataStream.unsubscribe", "params": { "subscriptionId": sub_id } }
        await self._send_request(req)
        self.subscriptions.pop(sub_id, None)
        self.db_update_queue[api_id] = {'sub_id': None, 'spot_status': 'closed'}

    async def _batch_updater(self):
        while True:
            await asyncio.sleep(5)
            if self.db_update_queue:
                queue_copy = self.db_update_queue.copy()
                self.db_update_queue.clear()
                try:
                    await batch_update_spot_keys(queue_copy)
                except Exception as e:
                    logging.error(f"❌ [Batch] Veritabanı güncellemesi başarısız: {e}", exc_info=True)

    async def _handle_stream_event(self, data: dict):
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
                        self.balance_update_queue[(user_id, api_id, asset)] = {
                            "user_id": user_id, "api_id": api_id, "asset": asset,
                            "free": Decimal(balance.get("f", "0")), "locked": Decimal(balance.get("l", "0")),
                        }
            elif event_type == "executionReport":
                client_order_id = event.get("c")
                should_save_order = (self.order_save_mode == 'COMPREHENSIVE') or \
                                    (self.order_save_mode == 'SELECTIVE' and client_order_id and client_order_id.startswith(CLIENT_ORDER_ID_PREFIX))
                if should_save_order:
                    commission_amount = Decimal(event.get("n", "0"))
                    commission_asset = event.get("N")
                    commission_in_usdt = commission_amount
                    if commission_asset and commission_asset.upper() != "USDT" and commission_amount > 0:
                        try:
                            ticker = price_store.get_price("BINANCE_SPOT", f"{commission_asset.upper()}USDT")
                            if ticker:
                                price = ticker.last
                                if price > 0: commission_in_usdt = commission_amount * Decimal(str(price))
                        except Exception: pass
                    cummulative_quote_qty = Decimal(event.get("Z", "0"))
                    executed_quantity = Decimal(event.get("z", "0"))
                    execution_price = Decimal("0")
                    if executed_quantity > 0: execution_price = cummulative_quote_qty / executed_quantity
                    else: execution_price = Decimal(event.get("p", "0"))
                    order_data = {
                        "user_id": user_id, "api_id": api_id, "symbol": event.get("s"), "side": event.get("S"),
                        "status": event.get("X"), "price": execution_price, "quantity": Decimal(event.get("q", "0")),
                        "executed_quantity": executed_quantity, "order_id": event.get("i"), "event_time": event.get("E"),
                        "commission": commission_in_usdt
                    }
                    self.order_update_queue.append(order_data)
        except Exception as e:
            logging.error(f"❌ Olay işlenirken hata (event_type: {event_type}): {e}", exc_info=True)

    async def _balance_batch_writer(self):
        while True:
            await asyncio.sleep(5)
            if self.balance_update_queue:
                queue_copy = list(self.balance_update_queue.values())
                self.balance_update_queue.clear()
                try:
                    await batch_upsert_balances(queue_copy)
                except Exception as e:
                    logging.error(f"❌ [Batch] Bakiye DB güncellemesi başarısız: {e}", exc_info=True)

    async def _order_batch_writer(self):
        while True:
            await asyncio.sleep(3)
            if self.order_update_queue:
                queue_copy = self.order_update_queue.copy()
                self.order_update_queue.clear()
                try:
                    await batch_insert_orders(queue_copy)
                except Exception as e:
                    logging.error(f"❌ [Batch] Emir DB güncellemesi başarısız: {e}", exc_info=True)

async def main():
    logging.info("🚀 Spot WebSocket Servisi başlatılıyor...")
    manager = SpotWsApiManager(order_save_mode=ORDER_SAVE_MODE)
    try:
        await manager.run()
    except (KeyboardInterrupt, asyncio.CancelledError):
        logging.info("🛑 Spot servisi durdurma sinyali aldi, kapatiliyor.")