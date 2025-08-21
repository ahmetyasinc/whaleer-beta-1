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
    - Bir WS içine en fazla max_per_ws kadar listenKey konulur.
    """

    def __init__(self, pool, listenkeys: list, url: str, max_per_ws: int = 1):
        self.pool = pool
        self.listenkeys = listenkeys
        self.url = url
        self.max_per_ws = max_per_ws
        self.ws_groups = []  # [(ws_id, conn), ...]
        self.dedup = Deduplicator()

    async def start(self):
        # listenkey listelerini max_per_ws parçalarına böl
        for i in range(0, len(self.listenkeys), self.max_per_ws):
            chunk = self.listenkeys[i:i + self.max_per_ws]
            await self._open_redundant_pair(chunk)

    async def _open_redundant_pair(self, listenkeys: list):
        streams = "/".join(listenkeys)
        url = f"{self.url}/stream?streams={streams}"

        for i in range(2):  # redundant = 2 socket
            ws_id = await ws_db.insert_ws(self.pool, name=f"redundant-{i}", exchange="binance", url=url)
            await ws_db.update_listenkey_count(self.pool, ws_id, len(listenkeys))

            conn = await websockets.connect(url, ping_interval=20, ping_timeout=10)
            self.ws_groups.append((ws_id, conn))
            asyncio.create_task(self._listen(conn, f"redundant-{i}"))

        logging.info(f"✅ Redundant çift WS açıldı ({len(listenkeys)} listenKey).")

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


class ListenerManager:
    def __init__(self, pool, mode="safe", url="wss://fstream.binance.com"):
        self.pool = pool
        self.mode = mode
        self.url = url
        self.managers = []

    async def start_for_listenkeys(self, listenkeys: list):
        if self.mode == "safe":
            mgr = WebSocketSafeManager(self.pool, listenkeys, self.url)
        elif self.mode == "redundant":
            mgr = WebSocketRedundantManager(self.pool, listenkeys, self.url)
        elif self.mode == "hybrid":
            mgr = WebSocketHybridManager(self.pool, listenkeys, self.url)
        else:
            raise ValueError(f"Unsupported mode: {self.mode}")

        self.managers.append(mgr)
        await mgr.start()


class DynamicListenerManager:
    """
    Dinamik olarak listenKey ekleyip yöneten yapı.
    - Her 5 saniyede yeni listenKey kontrol eder.
    - Mevcut ws kapasitesi uygunsa ekler, değilse yeni ws açar.
    - Safe / Redundant modlarını destekler.
    """

    def __init__(self, pool, mode="safe", url="wss://fstream.binance.com", max_per_ws=100):
        self.pool = pool
        self.mode = mode
        self.url = url
        self.max_per_ws = max_per_ws
        self.ws_managers = []  # (ws_id, manager, current_count)

    async def run(self):
        """Ana döngü"""
        while True:
            try:
                await self._check_new_listenkeys()
            except Exception as e:
                logging.error(f"DynamicManager hata: {e}")
            await asyncio.sleep(5)  # 5 saniyede bir kontrol

    async def _check_new_listenkeys(self):
        # TODO: Burada stream_keys tablosundan yeni listenKey’ler çekilecek
        # Örn: SELECT * FROM stream_keys WHERE ws_id IS NULL
        new_listenkeys = []  # şimdilik placeholder
        if not new_listenkeys:
            return

        logging.info(f"🔎 {len(new_listenkeys)} yeni listenKey bulundu")

        # Her yeni listenKey’i uygun ws’e ekle
        for lk in new_listenkeys:
            placed = False
            for ws_id, mgr, count in self.ws_managers:
                if count < self.max_per_ws:
                    # bu ws’ye ekle
                    await self._add_to_ws(mgr, ws_id, lk, count+1)
                    placed = True
                    break

            if not placed:
                # yeni ws aç
                await self._create_new_ws([lk])

    async def _create_new_ws(self, listenkeys: list):
        if self.mode == "safe":
            mgr = WebSocketSafeManager(self.pool, listenkeys, self.url)
        else:
            mgr = WebSocketRedundantManager(self.pool, listenkeys, self.url)

        await mgr.start()
        # DB’ye eklenen ws_id’yi çekmemiz lazım (şu an manager içinde saklanıyor)
        ws_id = getattr(mgr, "ws_id", None) or len(self.ws_managers)+1
        self.ws_managers.append([ws_id, mgr, len(listenkeys)])
        logging.info(f"🆕 Yeni WS açıldı (id={ws_id}, {len(listenkeys)} listenKey)")

    async def _add_to_ws(self, mgr, ws_id, listenkey, new_count):
        # Burada ws_db.update_listenkey_count çağrılacak
        await ws_db.update_listenkey_count(self.pool, ws_id, new_count)
        # Ayrıca stream_keys tablosunda listenKey.ws_id güncellenecek (TODO)
        logging.info(f"➕ listenKey {listenkey} ws={ws_id} içine eklendi")
        # manager içine de listenKey eklemek gerekecek (TODO)


class WebSocketHybridManager:
    """
    Hybrid mode = Redundant + Safe overlap
    - Her listenKey seti için 2 WS sürekli açık (redundant).
    - X saniyede bir refresh/yenileme sırasında overlap yapılır (safe).
    """

    def __init__(self, pool, listenkeys: list, url: str, overlap_seconds: int = 3, refresh_interval: int = 60):
        self.pool = pool
        self.listenkeys = listenkeys
        self.url = url
        self.overlap_seconds = overlap_seconds
        self.refresh_interval = refresh_interval
        self.ws_pair = []   # (ws_id, ws_conn)
        self.dedup = Deduplicator()

    async def start(self):
        streams = "/".join(self.listenkeys)
        url = f"{self.url}/stream?streams={streams}"

        # 2 redundant ws aç
        for i in range(2):
            ws_id = await ws_db.insert_ws(self.pool, name=f"hybrid-{i}", exchange="binance", url=url)
            await ws_db.update_listenkey_count(self.pool, ws_id, len(self.listenkeys))

            conn = await websockets.connect(url, ping_interval=20, ping_timeout=10)
            self.ws_pair.append((ws_id, conn))
            asyncio.create_task(self._listen(conn, f"hybrid-{i}"))

        logging.info("✅ Hybrid mode: redundant çift WS açıldı.")

        # Refresh döngüsünü başlat
        asyncio.create_task(self._refresh_loop())

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

    async def _refresh_loop(self):
        """X saniyede bir overlap + refresh mantığı"""
        while True:
            await asyncio.sleep(self.refresh_interval)
            try:
                await self._safe_reconnect()
            except Exception as e:
                logging.error(f"Hybrid refresh loop hata: {e}")

    async def _safe_reconnect(self):
        streams = "/".join(self.listenkeys)
        url = f"{self.url}/stream?streams={streams}"
        logging.info("🌐 Hybrid overlap başlatılıyor...")

        # Yeni bağlantı aç
        new_conn = await websockets.connect(url, ping_interval=20, ping_timeout=10)
        asyncio.create_task(self._listen(new_conn, "hybrid-overlap"))

        # kısa süre overlap çalışsın
        await asyncio.sleep(self.overlap_seconds)

        # Eski bağlantılardan birini kapat (örn. 0. index primary sayılıyor)
        old_ws_id, old_conn = self.ws_pair.pop(0)
        await old_conn.close()
        logging.info(f"❌ Hybrid eski ws kapatıldı: {old_ws_id}")

        # Yeni ws'i redundant çiftin içine ekle
        new_ws_id = await ws_db.insert_ws(self.pool, name="hybrid-refresh", exchange="binance", url=url)
        await ws_db.update_listenkey_count(self.pool, new_ws_id, len(self.listenkeys))
        self.ws_pair.append((new_ws_id, new_conn))

        logging.info("✅ Hybrid overlap tamamlandı.")


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
    manager = WebSocketRedundantManager(pool, listenkeys, "wss://fstream.binance.com", max_per_ws=3)
    await manager.start()

    while True:
        await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
