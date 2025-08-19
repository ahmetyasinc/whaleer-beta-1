import asyncio
import aiohttp
from backend.trade_engine import config
from backend.trade_engine.balance.db.stream_key_db import (
    upsert_stream_key,
    refresh_stream_key_expiration,
    bulk_refresh_stream_keys,
    bulk_upsert_stream_keys
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
                    True,
                )
                print(f"✅ api_id={self.api_id} listenKey oluşturuldu: {self.listen_key}")
                return

            print(f"❌ api_id={self.api_id} listenKey alınamadı (attempt {attempt}) → {data}")
            if attempt < retries:
                await asyncio.sleep(delay)

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


    async def refresh_or_create(self):
        """Binance'te refresh dene, başarısızsa yeni listenKey oluştur."""
        url = f"{BASE_URL}/fapi/v1/listenKey"
        headers = {"X-MBX-APIKEY": self.api_key}

        async with aiohttp.ClientSession() as session:
            async with session.put(url, headers=headers) as resp:
                if resp.status == 200:
                    # Binance tarafında refresh başarılı
                    await refresh_stream_key_expiration(self.pool, self.api_id, self.connection_type)
                    print(f"🔄 api_id={self.api_id} listenKey refresh edildi.")
                    return
                else:
                    data = await resp.json()
                    print(f"⚠️ api_id={self.api_id} refresh başarısız → {data}")

        # Refresh olmadıysa yeni listenKey oluştur
        await self.create()


async def create_all_listenkeys(pool, connection_type="futures"):
    """Sadece aktif ve ilgili connection_type olan api_id'ler için listenKey oluştur."""
    query = """
        SELECT ak.id, ak.api_key, ak.user_id
        FROM public.api_keys ak
        JOIN public.stream_keys sk ON sk.api_id = ak.id
        WHERE sk.connection_type = $1
          AND sk.is_active = TRUE;
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
    """Aktif api_id'ler için refresh dene, başarısızsa yeni listenKey oluştur."""
    query = """
        SELECT ak.id, ak.api_key, ak.user_id
        FROM public.api_keys ak
        JOIN public.stream_keys sk ON sk.api_id = ak.id
        WHERE sk.connection_type = $1
          AND sk.is_active = TRUE;
    """
    async with pool.acquire() as conn:
        records = await conn.fetch(query, connection_type)

    if not records:
        print(f"⚠️ Uygun kriterlere sahip api bulunamadı (connection_type={connection_type})")
        return

    managers = [ListenKeyManager(pool, r["id"], r["api_key"], r["user_id"], connection_type) for r in records]

    results = await asyncio.gather(*(m.refresh_or_create() for m in managers), return_exceptions=True)

    for m, res in zip(managers, results):
        if isinstance(res, Exception):
            print(f"❌ api_id={m.api_id} refresh_or_create sırasında hata: {res}")

async def main():
    pool = await config.get_async_pool()
    if not pool:
        print("❌ DB bağlantısı yok")
        return

    """ ÖRNEK KULLANIM SENARYOLARI
    # -------------------------

    # 1. Tüm listenKey'leri oluştur
    # Açıklama: Sistemdeki tüm aktif API kayıtları için Binance'ten yeni listenKey alınır.
    # Eğer (api_id, connection_type) için zaten kayıt varsa güncellenir (upsert).
    # Kullanım: Sistem ilk açıldığında veya tüm listenKey'leri sıfırdan toplamak istediğinde.
    # await create_all_listenkeys(pool)

    # 2. Belirli api_id’ler için toplu refresh
    # Açıklama: Sadece seçilen api_id’lerin listenKey süresi Binance üzerinde refresh edilir.
    # Eğer listenKey Binance tarafında düşmüşse hata döner (fallback yok).
    # Kullanım: Manuel olarak belirli API hesaplarını refresh etmek için.
    # await bulk_refresh_stream_keys(pool, [1, 2, 3], "futures")

    # 3. Toplu upsert örneği
    # Açıklama: Elinde mevcut listenKey listesi varsa (ör. dışarıdan batch import),
    # bunlar tek sorgu ile DB’ye yazılır. Yoksa insert, varsa update yapılır.
    # Kullanım: Binance’ten farklı yöntemlerle alınan listenKey’leri topluca DB’ye basmak için.
    # records = [
    #     {"user_id": 1, "api_id": 10, "connection_type": "futures", "stream_key": "abc", "is_active": True},
    #     {"user_id": 2, "api_id": 11, "connection_type": "futures", "stream_key": "def", "is_active": True}
    # ]
    # await bulk_upsert_listenkeys(pool, records)

    # 4. Tüm listenKey’leri refresh et veya oluştur
    # Açıklama: Tüm aktif API kayıtları için önce refresh denenir, başarısız olanlar için yeni listenKey oluşturulur.
    # Create işleminde retry mekanizması vardır (ör. 3 deneme).
    # Kullanım: Düzenli cron job (ör. her 30 dk) ile sistemdeki tüm listenKey’leri güncel tutmak için."""
    await refresh_or_create_all(pool)

if __name__ == "__main__":
    asyncio.run(main())
