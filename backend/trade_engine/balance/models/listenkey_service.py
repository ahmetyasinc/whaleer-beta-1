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

# config.py

# ... (mevcut get_async_pool fonksiyonunuz)

# Binance API Uç Noktaları
BINANCE_CONFIG = {
    'spot': {
        'rest_url': "https://api.binance.com",
        'ws_url': "wss://stream.binance.com:9443", # veya 443
        'listenkey_path': "/api/v3/userDataStream",
        'connection_type': 'spot'
    },
    'futures': {
        'rest_url': "https://fapi.binance.com",
        'ws_url': "wss://fstream.binance.com",
        'listenkey_path': "/fapi/v1/listenKey",
        'connection_type': 'futures'
    }
}

# WebSocket Gruplama Ayarları
WS_MAX_KEYS_PER_GROUP = 100

BASE_URL = "https://fapi.binance.com"

# listenkey_service.py dosyasının başındaki bu satırı SİLİN:
# BASE_URL = "https://fapi.binance.com"

class ListenKeyManager:
    # 1. __init__ metodunu market_config alacak şekilde güncelliyoruz.
    def __init__(self, pool, api_id, api_key, user_id, market_config: dict):
        self.pool = pool
        self.api_id = api_id
        self.api_key = api_key
        self.user_id = user_id
        
        # 2. Gerekli tüm değişkenleri market_config sözlüğünden alıyoruz.
        self.base_url = market_config['rest_url']
        self.listenkey_path = market_config['listenkey_path']
        self.connection_type = market_config['connection_type']
        
        self.listen_key = None

    async def create(self, retries: int = 3, delay: float = 0.5):
        """Binance'ten listenKey alır, gerekirse retry eder ve DB'ye upsert eder."""
        # 3. Hardcoded URL'leri dinamik değişkenlerle değiştiriyoruz.
        url = f"{self.base_url}{self.listenkey_path}"
        headers = {"X-MBX-APIKEY": self.api_key}

        for attempt in range(1, retries + 1):
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers) as resp:
                    # ... (metodun geri kalanı aynı kalabilir)
                    data = await resp.json()
                    self.listen_key = data.get("listenKey")

            if self.listen_key:
                await upsert_stream_key(
                    self.pool,
                    self.user_id,
                    self.api_id,
                    self.connection_type,
                    self.listen_key,
                    "new",
                )
                print(f"✅ api_id={self.api_id} listenKey oluşturuldu: {self.listen_key}")
                return

            print(f"❌ api_id={self.api_id} listenKey alınamadı (attempt {attempt}) → {data}")
            if attempt < retries:
                await asyncio.sleep(delay)

        await update_streamkey_status(self.pool, self.api_id, "error")
        print(f"🚨 api_id={self.api_id} listenKey oluşturma başarısız (tüm denemeler bitti).")

    async def refresh(self):
        """Binance'te listenKey’i refresh eder, başarılıysa DB expire süresini uzatır."""
        # 3. Hardcoded URL'leri dinamik değişkenlerle değiştiriyoruz.
        url = f"{self.base_url}{self.listenkey_path}"
        headers = {"X-MBX-APIKEY": self.api_key}

        async with aiohttp.ClientSession() as session:
            async with session.put(url, headers=headers) as resp:
                if resp.status == 200:
                    await refresh_stream_key_expiration(self.pool, self.api_id, self.connection_type)
                    print(f"🔄 api_id={self.api_id} listenKey başarıyla refresh edildi.")
                else:
                    data = await resp.json()
                    print(f"⚠️ api_id={self.api_id} listenKey refresh başarısız → {data}")
                    await update_streamkey_status(self.pool, self.api_id, "error")

    async def refresh_or_create(self):
        """Binance'te refresh dene, başarısızsa yeni listenKey oluştur."""
        # 3. Hardcoded URL'leri dinamik değişkenlerle değiştiriyoruz.
        url = f"{self.base_url}{self.listenkey_path}"
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

# listenkey_service.py -> refresh_or_create_all fonksiyonunun güncellenmiş hali

async def refresh_or_create_all(pool, market_config): # Fonksiyonu da market_config alacak şekilde güncelleyelim
    """
    Tüm uygun listenKey'leri EŞ ZAMANLI olarak yeniler veya yeniden oluşturur.
    """
    connection_type = market_config['connection_type']
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
        logging.warning(f"⚠️ [{connection_type.upper()}] Yenilenecek/oluşturulacak listenKey bulunamadı.")
        return

    # 1. Tüm görevleri bir listede topla
    tasks = []
    for r in records:
        mgr = ListenKeyManager(pool, r["id"], r["api_key"], r["user_id"], market_config)
        if r["status"] == "expired":
            # expired ise direkt oluşturma görevini ekle
            tasks.append(mgr.create())
        else:
            # active/new ise yenilemeyi dene, olmazsa oluşturan görevi ekle
            tasks.append(mgr.refresh_or_create())

    logging.info(f"🚀 [{connection_type.upper()}] {len(tasks)} adet listenKey için toplu işlem başlatılıyor...")

    # 2. asyncio.gather ile tüm görevleri EŞ ZAMANLI olarak çalıştır
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # 3. Sonuçları kontrol et (opsiyonel ama önerilir)
    success_count = 0
    error_count = 0
    for res in results:
        if isinstance(res, Exception):
            logging.error(f"❌ Toplu işlem sırasında bir görevde hata oluştu: {res}")
            error_count += 1
        else:
            success_count += 1
    
    logging.info(f"✅ [{connection_type.upper()}] Toplu işlem tamamlandı. Başarılı: {success_count}, Hatalı: {error_count}")

    return results

# Düzeltilmiş, Doğru Çalışan Kod
async def main():
    pool = await config.get_async_pool()
    if not pool:
        print("❌ DB bağlantısı yok")
        return

    # ÇÖZÜM: Test için futures ayarlarını config dosyasından alıp fonksiyona iletiyoruz.
    # Bu dosya sadece futures ile ilgili olduğu için doğrudan futures'ı seçebiliriz.
    futures_market_config = BINANCE_CONFIG['futures']
    await refresh_or_create_all(pool, futures_market_config)

if __name__ == "__main__":
    asyncio.run(main())
