import asyncpg
import logging

logger = logging.getLogger(__name__)

# Global connection pool
pool = None

async def init_db_pool():
    """Global bağlantı havuzunu başlat"""
    global pool
    try:
        pool = await asyncpg.create_pool(
            user='postgres',
            password='admin',
            database='balina_db',
            host='localhost',
            port=5432,
            min_size=5,
            max_size=100
        )
        print("✅ Bağlantı havuzu başarıyla başlatıldı")
    except Exception as e:
        logger.error(f"❌ Bağlantı havuzu başlatma hatası: {e}")

async def get_connection():
    """Havuzdan bir bağlantı al ve döndür"""
    try:
        async with pool.acquire() as connection:
            yield connection
    except Exception as e:
        logger.error(f"❌ Bağlantı alma hatası: {e}")

async def close_db_pool():
    """Bağlantı havuzunu kapat"""
    global pool
    try:
        if pool:
            await pool.close()
            print("✅ Bağlantı havuzu kapatıldı")
    except Exception as e:
        logger.error(f"❌ Bağlantı havuzu kapatma hatası: {e}")

async def fetch_data(query, params=None):
    """Havuzdan bir bağlantı alarak veri çekme"""
    global pool
    try:
        async with pool.acquire() as connection:
            if params:
                return await connection.fetch(query, *params)
            return await connection.fetch(query)
    except Exception as e:
        logger.error(f"❌ Veri çekme hatası: {e}")
        return None

async def execute_query(query, params=None):
    """Havuzdan bir bağlantı alarak sorgu çalıştırma"""
    global pool
    try:
        async with pool.acquire() as connection:
            if params:
                await connection.execute(query, *params)
            else:
                await connection.execute(query)
            print("✅ Sorgu başarıyla çalıştırıldı")
    except Exception as e:
        logger.error(f"❌ Sorgu çalıştırma hatası: {e}")

# Örnek kullanım
async def example_usage():
    """Bağlantı havuzunu kullanarak veri çekme"""
    await init_db_pool()
    async with pool.acquire() as connection:
        try:
            result = await connection.fetch("SELECT * FROM public.api_keys LIMIT 10;")
            print(result)
        except Exception as e:
            print(f"❌ Veri çekme hatası: {e}")
    await close_db_pool()
