import asyncio, websockets,logging, json
from backend.trade_engine.balance.db.stream_key_db import get_active_and_new_listenkeys
from backend.trade_engine.balance.db import ws_db
from backend.trade_engine import config

logging.basicConfig(level=logging.INFO)


class Deduplicator:
    """WS eventlerinde duplicate mesajları filtreler."""
    def __init__(self, max_size: int = 1000):
        self.seen = set()
        self.max_size = max_size

    def is_duplicate(self, event: dict) -> bool:
        uid = event.get("u") or event.get("E")  # Binance: updateId veya eventTime
        if not uid:
            return False
        if uid in self.seen:
            return True
        self.seen.add(uid)
        if len(self.seen) > self.max_size:
            # en eskileri at
            self.seen = set(list(self.seen)[-self.max_size:])
        return False


class WebSocketSafeManager:
    """
    Tek listenKey için Safe Reconnect mantığı:
    - Yeni listenKey geldiğinde yeni WS açılır.
    - Eski WS ile kısa süreliğine paralel dinlenir (deduplication).
    - Sonra eski WS kapatılır.
    """

    def __init__(self, pool, listenkeys: list, url: str, overlap_seconds: int = 3):
        self.pool = pool
        self.listenkeys = listenkeys
        self.url = url
        self.overlap_seconds = overlap_seconds
        self.active_ws = None
        self.backup_ws = None
        self.ws_id = None
        self.dedup = Deduplicator()

    async def start(self):
        """Başlangıçta ilk WS açılır."""
        await self._open_new_ws(self.listenkeys)

    async def _open_new_ws(self, listenkeys):
        streams = "/".join(listenkeys)
        url = f"{self.url}/stream?streams={streams}"
        logging.info(f"🌐 Yeni WS açılıyor: {url}")

        # DB'ye kayıt
        self.ws_id = await ws_db.insert_ws(self.pool, name="safe-ws", exchange="binance", url=url)

        # listenKey sayısını DB'ye güncelle
        await ws_db.update_listenkey_count(self.pool, self.ws_id, len(listenkeys))

        # yeni bağlantıyı aç
        self.backup_ws = await websockets.connect(url, ping_interval=20, ping_timeout=10)
        asyncio.create_task(self._listen(self.backup_ws, "backup"))

        # overlap süresi
        if self.active_ws:
            await asyncio.sleep(self.overlap_seconds)
            await self._close_ws(self.active_ws, "primary")

        # backup → primary yap
        self.active_ws = self.backup_ws
        self.backup_ws = None
        logging.info("✅ Safe Reconnect tamamlandı.")

    async def _listen(self, ws, role: str):
        try:
            async for msg in ws:
                try:
                    data = json.loads(msg)
                except Exception:
                    data = {"raw": msg}

                if self.dedup.is_duplicate(data):
                    continue
                logging.info(f"[{role}] {data}")
        except Exception as e:
            logging.error(f"[{role}] hata: {e}")

    async def _close_ws(self, ws, role: str):
        if ws:
            await ws.close()
            logging.info(f"❌ {role} WS kapatıldı.")


class WebSocketRedundantManager:
    """
    Redundant Listening:
    - Her listenKey seti için 2 WS açılır.
    - max_per_ws değeri DynamicListenerManager'dan gelir.
    """

    def __init__(self, pool, listenkeys: list, url: str, max_per_ws: int):
        self.pool = pool
        self.listenkeys = listenkeys
        self.url = url
        self.max_per_ws = max_per_ws
        self.ws_groups = []
        self.dedup = Deduplicator()

    async def start(self):
        total = len(self.listenkeys)
        group_count = (total + self.max_per_ws - 1) // self.max_per_ws  # ceil(x/y)

        tasks = []
        for group_index in range(group_count):
            chunk = self.listenkeys[
                group_index * self.max_per_ws : (group_index + 1) * self.max_per_ws
            ]
            tasks.append(self._open_redundant_pair(chunk, group_index))

        await asyncio.gather(*tasks)

    async def _open_redundant_pair(self, listenkeys: list, group_index: int):
        streams = "/".join(listenkeys)
        url = f"{self.url}/stream?streams={streams}"

        base_id = None
        for i in range(2):  # redundant = 2 socket
            ws_id = await ws_db.insert_ws(self.pool, "temp", "binance", url)

            if base_id is None:
                base_id = ws_id  # ilk açılan primary olsun

            name = f"ws_{base_id}_redundant-{i}"
            await ws_db.update_ws_name(self.pool, ws_id, name)
            await ws_db.update_listenkey_count(self.pool, ws_id, len(listenkeys))

            # sadece primary ws_id’ye bağla
            if i == 0:
                from backend.trade_engine.balance.db.stream_key_db import attach_listenkeys_to_ws
                await attach_listenkeys_to_ws(self.pool, base_id, listenkeys)

            conn = await websockets.connect(url, ping_interval=20, ping_timeout=10)
            self.ws_groups.append((ws_id, conn))
            asyncio.create_task(self._listen(conn, name))

        logging.info(
            f"✅ Grup {group_index+1}: {len(listenkeys)} listenKey için redundant çift açıldı → {listenkeys}, base_id={base_id}"
        )

    async def _listen(self, ws, role: str):
        try:
            async for msg in ws:
                try:
                    data = json.loads(msg)
                except Exception:
                    data = {"raw": msg}

                if self.dedup.is_duplicate(data):
                    continue
                logging.info(f"[{role}] {data}")
        except Exception as e:
            logging.error(f"[{role}] hata: {e}")

class DynamicListenerManager:
    """
    Dinamik olarak listenKey ekleyip yöneten yapı.
    - Her 5 saniyede bir DB kontrol eder.
    - Sadece status='new' ve status='remove' listenKey’lerle ilgilenir.
    - max_per_ws burada merkezi olarak tanımlanır.
    """

    def __init__(self, pool, url="wss://fstream.binance.com", max_per_ws=50):
        self.pool = pool
        self.url = url
        self.max_per_ws = max_per_ws
        self.ws_managers = {}  # ws_id -> manager

    async def run(self):
        while True:
            try:
                await self._check_listenkeys()
            except Exception as e:
                logging.error(f"DynamicManager hata: {e}")
            await asyncio.sleep(5)

    async def _check_listenkeys(self):
        from backend.trade_engine.balance.db.stream_key_db import get_listenkeys_by_status

        # Yeni listenKey'ler
        new_keys = await get_listenkeys_by_status(self.pool, ["new"])
        if new_keys:
            keys = [r["stream_key"] for r in new_keys]
            mgr = WebSocketRedundantManager(self.pool, keys, self.url, self.max_per_ws)
            await mgr.start()
            # status update işlemi attach_listenkeys_to_ws içinde yapılıyor

        # TODO: remove olanları da kapatma eklenecek


async def handle_ws_failure(pool, ws_id: int, url: str, mode: str = "safe"):
    
    logging.warning(f"⚠️ WS {ws_id} yanıt vermiyor, yeniden başlatılıyor...")

    from backend.trade_engine.balance.db import ws_db
    from backend.trade_engine.balance.models.listenkey_service import ListenKeyManager

    # 1. ws_id altındaki listenkey kayıtlarını al
    listenkeys = await ws_db.get_streamkeys_by_ws(pool, ws_id)
    refreshed = []

    for lk in listenkeys:
        mgr = ListenKeyManager(pool, lk["api_id"], None, lk["user_id"], lk["connection_type"])
        mgr.listen_key = lk["stream_key"]

        try:
            await mgr.refresh()
            refreshed.append(mgr.listen_key)
        except Exception:
            await mgr.create()
            if mgr.listen_key:
                refreshed.append(mgr.listen_key)

    if not refreshed:
        logging.error(f"❌ WS {ws_id} için listenKey yenilenemedi, WS kapalı bırakılıyor.")
        await ws_db.mark_ws_status(pool, ws_id, False)
        return

    # 2. Yeni WS aç
    if mode == "safe":
        new_mgr = WebSocketSafeManager(pool, refreshed, url)
    else:
        new_mgr = WebSocketRedundantManager(pool, refreshed, url)
    await new_mgr.start()

    # 3. ws_db güncelle
    await ws_db.mark_ws_status(pool, ws_id, True)
    await ws_db.update_listenkey_count(pool, ws_id, len(refreshed))

    logging.info(f"✅ WS {ws_id} yeniden açıldı ({len(refreshed)} listenKey ile).")


"""
async def run_redundant_mode():
    pool = await config.get_async_pool()
    listenkeys = ["lk1", "lk2", "lk3", "lk4", "lk5", "lk6"]
    manager = WebSocketRedundantManager(pool, listenkeys, "wss://fstream.binance.com", max_per_ws=3)
    await manager.start()

async def main():
    await run_redundant_mode()
"""

async def main():
    pool = await config.get_async_pool()

    # DB'den listenKey'leri al
    listenkeys = await get_active_and_new_listenkeys(pool, connection_type="futures")

    if not listenkeys:
        logging.warning("⚠️ DB'de active/new listenKey bulunamadı.")
        return

    # Redundant manager ile başlat
    manager = WebSocketRedundantManager(pool, listenkeys, "wss://fstream.binance.com", max_per_ws=1)
    await manager.start()

    while True:
        await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
