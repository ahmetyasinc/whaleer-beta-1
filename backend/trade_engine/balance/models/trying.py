import asyncio,websockets,json
import logging
from backend.trade_engine import config
from backend.trade_engine.balance.models.ws_service import ListenerManager

listen_keys = [
    "0Xu8Q16O6pta9bHm3GbUulVPEKcTHfXLo6aleYMFUdKtq5vSQsrBKfcGuWBEDpfS",
    "ei5dkjAfGKrLIEBcQ3bMjqIhH00dFxFMCA6Nt8bDxPxRwcewLeYvk59loAGUpkTK",
]
logging.basicConfig(level=logging.DEBUG)
"""
async def test_combined():
    streams = "/".join(listen_keys)
    url = f"wss://fstream.binance.com/stream?streams={streams}"
    print("Connecting to:", url)

    async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
        for _ in range(5):
            msg = await ws.recv()
            print("Received:", msg)

asyncio.run(test_combined())
"""

async def run_safe_mode():
    pool = await config.get_async_pool()
    manager = ListenerManager(pool, mode="safe", url="wss://fstream.binance.com")
    await manager.start_for_listenkeys(listen_keys)

async def run_redundant_mode():
    pool = await config.get_async_pool()
    manager = ListenerManager(pool, mode="redundant", url="wss://fstream.binance.com")
    await manager.start_for_listenkeys(listen_keys)

if __name__ == "__main__":
    # hangi testi çalıştırmak istiyorsan seç
    # asyncio.run(run_safe_mode())
    asyncio.run(run_redundant_mode())
   