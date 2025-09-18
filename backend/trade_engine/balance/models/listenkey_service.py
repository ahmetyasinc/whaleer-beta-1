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
    def __init__(self, pool, api_id, api_key, user_id, market_config: dict):
        self.pool = pool
        self.api_id = api_id
        self.api_key = api_key
        self.user_id = user_id
        self.base_url = market_config['rest_url']
        self.listenkey_path = market_config['listenkey_path']
        self.connection_type = market_config['connection_type']
        self.listen_key = None

    async def create(self, retries: int = 3, delay: float = 0.5):
        url = f"{self.base_url}{self.listenkey_path}"
        headers = {"X-MBX-APIKEY": self.api_key}
        data = {}
        for attempt in range(1, retries + 1):
            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers) as resp:
                    data = await resp.json()
                    self.listen_key = data.get("listenKey")

            if self.listen_key:
                await upsert_stream_key(
                    self.pool, self.user_id, self.api_id,
                    self.connection_type, self.listen_key, "new",
                )
                logging.info(f"✅ api_id={self.api_id} listenKey oluşturuldu: {self.listen_key}")
                return
            logging.warning(f"❌ api_id={self.api_id} listenKey alınamadı (attempt {attempt}) → {data}")
            if attempt < retries: await asyncio.sleep(delay)
        await update_streamkey_status(self.pool, self.api_id, "error")
        logging.error(f"🚨 api_id={self.api_id} listenKey oluşturma başarısız (tüm denemeler bitti).")

    async def refresh_or_create(self):
        url = f"{self.base_url}{self.listenkey_path}"
        headers = {"X-MBX-APIKEY": self.api_key}
        async with aiohttp.ClientSession() as session:
            async with session.put(url, headers=headers) as resp:
                if resp.status == 200:
                    await refresh_stream_key_expiration(self.pool, self.api_id, self.connection_type)
                    logging.info(f"🔄 api_id={self.api_id} listenKey refresh edildi.")
                    return
                else:
                    data = await resp.json()
                    logging.warning(f"⚠️ api_id={self.api_id} refresh başarısız → {data}")
        await self.create()

        
async def create_missing_futures_keys(pool):
    """
    'is_futures_enabled=true' olan ancak 'stream_keys' tablosunda 'futures' türünde
    kaydı bulunmayan API anahtarlarını tespit eder ve onlar için 'new' statüsünde
    bir kayıt oluşturur. Bu, listenkey oluşturma döngüsünün onları yakalamasını sağlar.
    """
    logging.info("🔧 Eksik futures stream_key kayıtları kontrol ediliyor...")
    
    # 'is_futures_enabled=true' olan ancak stream_keys'de karşılığı olmayanları bul
    query = """
        SELECT ak.id as api_id, ak.user_id
        FROM public.api_keys ak
        LEFT JOIN public.stream_keys sk 
            ON ak.id = sk.api_id AND sk.connection_type = 'futures'
        WHERE ak.is_active = TRUE 
          AND ak.is_futures_enabled = TRUE
          AND sk.id IS NULL;
    """
    async with pool.acquire() as conn:
        missing_records = await conn.fetch(query)

    if not missing_records:
        logging.info("✅ Eksik futures stream_key kaydı bulunamadı. Her şey güncel.")
        return

    logging.warning(f"🔍 {len(missing_records)} adet eksik futures stream_key kaydı bulundu. 'new' olarak ekleniyor...")
    
    # Bulunan eksikler için stream_keys tablosuna yeni kayıtlar ekle
    insert_query = """
        INSERT INTO public.stream_keys 
        (user_id, api_id, connection_type, status, is_futures_enabled)
        VALUES ($1, $2, 'futures', 'new', TRUE)
        ON CONFLICT (api_id, connection_type) DO NOTHING;
    """
    
    records_to_insert = [(r['user_id'], r['api_id']) for r in missing_records]
    
    async with pool.acquire() as conn:
        await conn.executemany(insert_query, records_to_insert)
    
    logging.info(f"✅ {len(records_to_insert)} adet eksik kayıt 'stream_keys' tablosuna 'new' olarak eklendi.")


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

async def refresh_or_create_all(pool, market_config):
    """
    'is_futures_enabled=true' olan ve listenKey'e ihtiyaç duyan (yeni, aktif, süresi dolmuş
    veya stream_key'i NULL olan) tüm kayıtlar için EŞ ZAMANLI olarak işlem yapar.
    """
    connection_type = market_config['connection_type']
    
    # ### HATA DÜZELTMESİ: SQL SORGUSU GÜNCELLENDİ ###
    # Sorgu artık `is_futures_enabled = TRUE` olan ve durumu uygun VEYA
    # `stream_key`'i hiç olmayan (NULL) kayıtları da getirecek.
    query = """
        SELECT ak.id, ak.api_key, ak.user_id, sk.status
        FROM public.api_keys ak
        JOIN public.stream_keys sk ON sk.api_id = ak.id
        WHERE sk.connection_type = $1
          AND sk.is_futures_enabled = TRUE
          AND (
               sk.status IN ('active', 'new', 'expired') 
               OR sk.stream_key IS NULL
          );
    """
    async with pool.acquire() as conn:
        records = await conn.fetch(query, connection_type)

    if not records:
        logging.warning(f"⚠️ [{connection_type.upper()}] Yenilenecek/oluşturulacak aktif futures listenKey bulunamadı.")
        return

    tasks = []
    for r in records:
        mgr = ListenKeyManager(pool, r["id"], r["api_key"], r["user_id"], market_config)
        # Durumu 'active' olanlar hariç hepsi için yeni anahtar oluşturulmalı.
        if r["status"] == "active":
            tasks.append(mgr.refresh_or_create())
        else: # new, expired, closed, error veya stream_key'i NULL olanlar
            tasks.append(mgr.create())

    logging.info(f"🚀 [{connection_type.upper()}] {len(tasks)} adet listenKey için toplu işlem başlatılıyor...")
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    success_count = sum(1 for res in results if not isinstance(res, Exception))
    error_count = len(results) - success_count
    
    logging.info(f"✅ [{connection_type.upper()}] Toplu işlem tamamlandı. Başarılı: {success_count}, Hatalı: {error_count}")
    return results

async def main():
    pool = await config.get_async_pool()
    if not pool:
        print("❌ DB bağlantısı yok")
        return

    futures_market_config = BINANCE_CONFIG['futures']
    await refresh_or_create_all(pool, futures_market_config)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())