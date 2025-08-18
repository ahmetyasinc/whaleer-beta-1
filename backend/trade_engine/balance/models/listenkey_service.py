import asyncio
import argparse
import aiohttp
import time
from decimal import Decimal


# Proje içinde oluşturduğumuz yapılandırma modülü
from backend.trade_engine import config

import aiohttp
import asyncio
from backend.trade_engine import config
from backend.trade_engine.balance.db.stream_key_db import upsert_stream_key

BASE_URL = "https://fapi.binance.com"

class ListenKeyManager:
    def __init__(self, pool, api_id, api_key, user_id, connection_type="futures"):
        self.pool = pool
        self.api_id = api_id
        self.api_key = api_key
        self.user_id = user_id
        self.connection_type = connection_type
        self.listen_key = None

    async def create(self):
        """Binance'ten listenKey alır ve DB'ye kaydeder."""
        url = f"{BASE_URL}/fapi/v1/listenKey"
        headers = {"X-MBX-APIKEY": self.api_key}

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers) as resp:
                data = await resp.json()
                self.listen_key = data.get("listenKey")

        if self.listen_key:
            await upsert_stream_key(
                self.pool,
                self.user_id,
                self.api_id,
                self.connection_type,
                self.listen_key,
                True,
            )
            print(f"✅ api_id={self.api_id} listenKey oluşturuldu: {self.listen_key}")
        else:
            print(f"❌ api_id={self.api_id} listenKey alınamadı → {data}")

async def main():
    pool = await config.get_async_pool()
    if not pool:
        print("❌ DB bağlantısı yok")
        return

    async with pool.acquire() as conn:
        records = await conn.fetch("SELECT id, api_key, user_id FROM api_keys;")

    if not records:
        print("⚠️ api_keys tablosunda kayıt yok")
        return

    managers = [ListenKeyManager(pool, r["id"], r["api_key"], r["user_id"]) for r in records]
    await asyncio.gather(*(m.create() for m in managers))

if __name__ == "__main__":
    asyncio.run(main())