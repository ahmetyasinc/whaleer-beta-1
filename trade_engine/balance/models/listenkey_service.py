# listenkey_service.py
import asyncio, aiohttp, logging
from typing import List
from trade_engine import config
# DEĞİŞİKLİK: Merkezi bağlantı yönetimi için asyncpg_connection import edildi.
from trade_engine.config import asyncpg_connection
from trade_engine.balance.db.stream_key_db import (
    upsert_stream_key,
    refresh_stream_key_expiration,
    bulk_refresh_stream_keys,
    bulk_upsert_stream_keys,
    update_streamkey_status
)

BINANCE_CONFIG = {
    'spot': {
        'rest_url': "https://api.binance.com",
        'ws_url': "wss://stream.binance.com:9443",
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
WS_MAX_KEYS_PER_GROUP = 100

class ListenKeyManager:
    def __init__(self, api_id, api_key, user_id, market_config: dict, stream_key: str = None):
        self.api_id = api_id
        self.api_key = api_key
        self.user_id = user_id
        self.base_url = market_config['rest_url']
        self.listenkey_path = market_config['listenkey_path']
        self.connection_type = market_config['connection_type']
        self.listen_key = stream_key

    async def create(self, retries: int = 3, delay: float = 0.5):
        url = f"{self.base_url}{self.listenkey_path}"
        headers = {"X-MBX-APIKEY": self.api_key}
        data = {}
        for attempt in range(1, retries + 1):
            # SSL Verification Disabled
            async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as session:
                async with session.post(url, headers=headers) as resp:
                    data = await resp.json()
                    new_listen_key = data.get("listenKey")

            if new_listen_key:
                self.listen_key = new_listen_key
                await upsert_stream_key(
                    self.user_id, self.api_id,
                    self.connection_type, self.listen_key, "new",
                )
                logging.info(f"✅ api_id={self.api_id} listenKey oluşturuldu: {self.listen_key}")
                # --- DÜZELTME: Başarı durumunda True döndür ---
                return True
            logging.warning(f"❌ api_id={self.api_id} listenKey alınamadı (attempt {attempt}) → {data}")
            if attempt < retries: await asyncio.sleep(delay)
        
        await update_streamkey_status(self.api_id, self.connection_type, "error")
        logging.error(f"🚨 api_id={self.api_id} listenKey oluşturma başarısız (tüm denemeler bitti).")
        raise ConnectionError(f"api_id={self.api_id} için ListenKey oluşturulamadı.")

    async def refresh_or_create(self):
        if not self.listen_key:
            logging.warning(f"⚠️ api_id={self.api_id} için mevcut listenKey bulunamadı, yeniden oluşturulacak.")
            return await self.create() # create'in sonucunu döndür

        url = f"{self.base_url}{self.listenkey_path}"
        headers = {"X-MBX-APIKEY": self.api_key}
        # SSL Verification Disabled
        async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as session:
            async with session.put(url, headers=headers) as resp:
                if resp.status == 200:
                    await refresh_stream_key_expiration(self.listen_key)
                    logging.info(f"🔄 api_id={self.api_id} listenKey refresh edildi.")
                    # --- DÜZELTME: Başarı durumunda True döndür ---
                    return True
                else:
                    data = await resp.json()
                    logging.warning(f"⚠️ api_id={self.api_id} refresh başarısız ({resp.status}) → {data}")
        
        return await self.create() # create'in sonucunu döndür

# DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor ve asyncpg_connection kullanıyor.
async def create_missing_futures_keys():
    logging.info("🔧 Eksik futures stream_key kayıtları kontrol ediliyor...")
    
    query = """
        SELECT ak.id as api_id, ak.user_id
        FROM public.api_keys ak
        LEFT JOIN public.stream_keys sk 
            ON ak.id = sk.api_id AND sk.connection_type = 'futures'
        WHERE ak.is_active = TRUE 
          AND ak.is_futures_enabled = TRUE
          AND sk.id IS NULL;
    """
    async with asyncpg_connection() as conn:
        missing_records = await conn.fetch(query)

    if not missing_records:
        logging.info("✅ Eksik futures stream_key kaydı bulunamadı. Her şey güncel.")
        return

    logging.warning(f"🔍 {len(missing_records)} adet eksik futures stream_key kaydı bulundu. 'new' olarak ekleniyor...")
    
    insert_query = """
        INSERT INTO public.stream_keys 
        (user_id, api_id, connection_type, status, is_futures_enabled)
        VALUES ($1, $2, 'futures', 'new', TRUE)
        ON CONFLICT (api_id, connection_type) DO NOTHING;
    """
    records_to_insert = [(r['user_id'], r['api_id']) for r in missing_records]
    
    async with asyncpg_connection() as conn:
        await conn.executemany(insert_query, records_to_insert)
    
    logging.info(f"✅ {len(records_to_insert)} adet eksik kayıt 'stream_keys' tablosuna 'new' olarak eklendi.")

# DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor ve asyncpg_connection kullanıyor.
async def create_all_listenkeys(connection_type="futures"):
    query = """
        SELECT ak.id, ak.api_key, ak.user_id
        FROM public.api_keys ak
        JOIN public.stream_keys sk ON sk.api_id = ak.id
        WHERE sk.connection_type = $1
          AND sk.status IN ('new', 'active');
    """
    async with asyncpg_connection() as conn:
        records = await conn.fetch(query, connection_type)

    if not records:
        print(f"⚠️ Uygun kriterlere sahip api bulunamadı (connection_type={connection_type})")
        return

    # DEĞİŞİKLİK: Manager'a 'pool' geçilmiyor.
    managers = [ListenKeyManager(r["id"], r["api_key"], r["user_id"], connection_type) for r in records]
    results = await asyncio.gather(*(m.create() for m in managers), return_exceptions=True)

    for m, res in zip(managers, results):
        if isinstance(res, Exception):
            print(f"❌ api_id={m.api_id} listenKey oluşturma sırasında hata: {res}")

# DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor.
async def bulk_upsert_listenkeys(records):
    """Birden fazla listenKey’i topluca upsert et."""
    await bulk_upsert_stream_keys(records)
    print(f"✅ {len(records)} listenKey topluca upsert edildi.")

# DEĞİŞİKLİK: Fonksiyon artık pool parametresi almıyor ve asyncpg_connection kullanıyor.
async def refresh_or_create_all(market_config):
    connection_type = market_config['connection_type']
    
    # --- DÜZELTME 3: Sorguya sk.stream_key eklendi ---
    query = """
        SELECT ak.id, ak.api_key, ak.user_id, sk.status, sk.stream_key
        FROM public.api_keys ak
        JOIN public.stream_keys sk ON sk.api_id = ak.id
        WHERE sk.connection_type = $1
          AND sk.is_futures_enabled = TRUE
          AND (
               sk.status IN ('active', 'new', 'expired') 
               OR sk.stream_key IS NULL
          );
    """
    async with asyncpg_connection() as conn:
        records = await conn.fetch(query, connection_type)

    if not records:
        logging.warning(f"⚠️ [{connection_type.upper()}] Yenilenecek/oluşturulacak aktif futures listenKey bulunamadı.")
        return

    tasks = []
    for r in records:
        # --- DÜZELTME 4: Manager oluşturulurken stream_key de veriliyor ---
        mgr = ListenKeyManager(r["id"], r["api_key"], r["user_id"], market_config, r["stream_key"])
        if r["status"] == "active" and r["stream_key"] is not None:
            tasks.append(mgr.refresh_or_create())
        else:
            tasks.append(mgr.create())

    logging.info(f"🚀 [{connection_type.upper()}] {len(tasks)} adet listenKey için toplu işlem başlatılıyor...")
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    success_count = sum(1 for res in results if not isinstance(res, Exception) and res is not None)
    error_count = len(results) - success_count
    
    logging.info(f"✅ [{connection_type.upper()}] Toplu işlem tamamlandı. Başarılı: {success_count}, Hatalı: {error_count}")
    return results

async def main():
    # DEĞİŞİKLİK: 'pool' oluşturma kaldırıldı.
    futures_market_config = BINANCE_CONFIG['futures']
    await refresh_or_create_all(futures_market_config)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())