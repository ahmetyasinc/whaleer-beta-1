import asyncio, aiohttp, logging
from typing import List
from backend.trade_engine import config
from backend.trade_engine.balance.db.stream_key_db import (
    upsert_stream_key,
    refresh_stream_key_expiration,
    bulk_refresh_stream_keys,
    bulk_upsert_stream_keys,
    update_streamkey_status
)

BASE_URL = "https://fapi.binance.com"

class ListenKeyManager:
    def __init__(self, pool, api_id, api_key, user_id, connection_type="futures"):
        self.pool = pool
        self.api_id = api_id
        self.api_key = api_key
        self.user_id = user_id
        self.connection_type = connection_type
        self.listen_key = None

    async def create(self, retries: int = 3, delay: float = 0.5):
        """Binance'ten listenKey alır, gerekirse retry eder ve DB'ye upsert eder."""
        url = f"{BASE_URL}/fapi/v1/listenKey"
        headers = {"X-MBX-APIKEY": self.api_key}

        for attempt in range(1, retries + 1):
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
                    "new",   # oluşturulan key önce new olacak
                )
                print(f"✅ api_id={self.api_id} listenKey oluşturuldu: {self.listen_key}")
                return

            print(f"❌ api_id={self.api_id} listenKey alınamadı (attempt {attempt}) → {data}")
            if attempt < retries:
                await asyncio.sleep(delay)

        # tüm retry'lar bitti → error
        await update_streamkey_status(self.pool, self.api_id, "error")
        print(f"🚨 api_id={self.api_id} listenKey oluşturma başarısız (tüm denemeler bitti).")

    async def refresh(self):
        """Binance'te listenKey’i refresh eder, başarılıysa DB expire süresini uzatır."""
        url = f"{BASE_URL}/fapi/v1/listenKey"
        headers = {"X-MBX-APIKEY": self.api_key}

        async with aiohttp.ClientSession() as session:
            async with session.put(url, headers=headers) as resp:
                if resp.status == 200:
                    # Binance tarafında refresh başarılı
                    await refresh_stream_key_expiration(self.pool, self.api_id, self.connection_type)
                    print(f"🔄 api_id={self.api_id} listenKey başarıyla refresh edildi.")
                else:
                    data = await resp.json()
                    print(f"⚠️ api_id={self.api_id} listenKey refresh başarısız → {data}")
                    await update_streamkey_status(self.pool, self.api_id, "error")

    async def refresh_or_create(self):
        """Binance'te refresh dene, başarısızsa yeni listenKey oluştur."""
        url = f"{BASE_URL}/fapi/v1/listenKey"
        headers = {"X-MBX-APIKEY": self.api_key}

        async with aiohttp.ClientSession() as session:
            async with session.put(url, headers=headers) as resp:
                if resp.status == 200:
                    await refresh_stream_key_expiration(self.pool, self.api_id, self.connection_type)
                    print(f"🔄 api_id={self.api_id} listenKey refresh edildi.")
                    return
                else:
                    data = await resp.json()
                    print(f"⚠️ api_id={self.api_id} refresh başarısız → {data}")

        # Refresh olmadıysa yeni listenKey oluştur
        await self.create()


async def create_all_listenkeys(pool, connection_type="futures"):
    """status = new olanlar için listenKey oluştur."""
    query = """
        SELECT ak.id, ak.api_key, ak.user_id
        FROM public.api_keys ak
        JOIN public.stream_keys sk ON sk.api_id = ak.id
        WHERE sk.connection_type = $1
          AND sk.status IN ('new', 'active');
    """
    async with pool.acquire() as conn:
        records = await conn.fetch(query, connection_type)

    if not records:
        print(f"⚠️ Uygun kriterlere sahip api bulunamadı (connection_type={connection_type})")
        return

    managers = [ListenKeyManager(pool, r["id"], r["api_key"], r["user_id"], connection_type) for r in records]
    results = await asyncio.gather(*(m.create() for m in managers), return_exceptions=True)

    for m, res in zip(managers, results):
        if isinstance(res, Exception):
            print(f"❌ api_id={m.api_id} listenKey oluşturma sırasında hata: {res}")


async def bulk_upsert_listenkeys(pool, records):
    """Birden fazla listenKey’i topluca upsert et."""
    await bulk_upsert_stream_keys(pool, records)
    print(f"✅ {len(records)} listenKey topluca upsert edildi.")


async def refresh_or_create_all(pool, connection_type="futures"):
    """
    status = active, new veya expired olanlar için:
    - active/new → refresh dene, olmazsa yeni oluştur
    - expired    → direkt yeni oluştur
    """
    query = """
        SELECT ak.id, ak.api_key, ak.user_id, sk.status
        FROM public.api_keys ak
        JOIN public.stream_keys sk ON sk.api_id = ak.id
        WHERE sk.connection_type = $1
          AND sk.status IN ('active', 'new', 'expired');
    """
    async with pool.acquire() as conn:
        records = await conn.fetch(query, connection_type)

    if not records:
        print(f"⚠️ Uygun kriterlere sahip api bulunamadı (connection_type={connection_type})")
        return

    results = []
    for r in records:
        mgr = ListenKeyManager(pool, r["id"], r["api_key"], r["user_id"], connection_type)

        try:
            if r["status"] == "expired":
                # expired ise → direkt yeni listenKey oluştur
                res = await mgr.create()
                print(f"♻️ api_id={r['id']} expired → yeni listenKey oluşturuldu.")
            else:
                # active/new → önce refresh dene, başarısızsa yeni oluştur
                res = await mgr.refresh_or_create()
            results.append(res)
        except Exception as e:
            print(f"❌ api_id={r['id']} işlem sırasında hata: {e}")

    return results

async def main():
    pool = await config.get_async_pool()
    if not pool:
        print("❌ DB bağlantısı yok")
        return

    # örnek kullanım
    await refresh_or_create_all(pool)

if __name__ == "__main__":
    asyncio.run(main())
