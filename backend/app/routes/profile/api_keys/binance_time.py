# utils/binance_time.py
import time, httpx
BINANCE_SPOT = "https://api.binance.com"

_drift_ms = 0
_last_sync = 0

async def get_server_drift_ms():
    global _drift_ms, _last_sync
    now = int(time.time() * 1000)
    # 30 sn’de bir yeniden senkronize et
    if now - _last_sync < 30_000:
        return _drift_ms
    async with httpx.AsyncClient(timeout=5.0) as cli:
        r = await cli.get(f"{BINANCE_SPOT}/api/v3/time")
        r.raise_for_status()
        server = r.json()["serverTime"]  # ms
    local = int(time.time() * 1000)
    _drift_ms = int(server - local)
    _last_sync = local
    return _drift_ms

async def now_ms_synced():
    drift = await get_server_drift_ms()
    return int(time.time() * 1000) + drift
