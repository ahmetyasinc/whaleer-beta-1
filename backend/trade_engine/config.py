import os
import asyncio
import psycopg2
import asyncpg
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine

DB_CONFIG = {
    'dbname': 'balina_db',
    'user': 'postgres',
    'password': 'admin',
    'host': 'localhost',
    'port': '5432'
}

# SQLAlchemy için bağlantı URI'si
DATABASE_URL = f"postgresql+psycopg2://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}"

# SQLAlchemy Engine oluştur
engine = create_engine(DATABASE_URL)

def get_db_connection():
    """
    PostgreSQL bağlantısı döndürür
    """
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"❌ DB bağlantı hatası: {e}")
        return None
    

ASYNC_DATABASE_URL = f"postgresql+asyncpg://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}"


async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)


ASYNC_POOL = None

async def get_async_pool():
    """
    Global asenkron bağlantı havuzunu (ASYNC_POOL) oluşturur veya mevcut olanı döndürür.
    Uygulama ilk başladığında SADECE BİR KEZ çağrılmalıdır.
    """
    global ASYNC_POOL
    if ASYNC_POOL is None:
        try:
            # Uygulamanızın ihtiyacına göre min/max boyutlarını ayarlayabilirsiniz.
            ASYNC_POOL = await asyncpg.create_pool(
                user=DB_CONFIG['user'],
                password=DB_CONFIG['password'],
                database=DB_CONFIG['dbname'],
                host=DB_CONFIG['host'],
                port=DB_CONFIG['port'],
                min_size=5,
                max_size=20,
                timeout=10.0,  # bağlantı alma zaman aşımı (saniye)
                max_inactive_connection_lifetime=300.0  # kullanılmayan bağlantılar 5 dk sonra kapanır
            )
            print("✅ Asenkron veritabanı bağlantı havuzu başarıyla oluşturuldu.")
        except Exception as e:
            print(f"❌ Asenkron havuz oluşturma hatası: {e}")
            ASYNC_POOL = None  # Başarısız olursa None olarak kalsın
    return ASYNC_POOL

async def get_async_connection():
    """
    KULLANIMI KOLAY YARDIMCI FONKSİYON:
    Havuzdan bir asenkron bağlantı kiralar.
    Havuz yoksa oluşturmayı dener.
    """
    pool = await get_async_pool()
    if pool:
        # pool.acquire() bir bağlantı kiralar.
        # 'async with' bloğu ile kullanıldığında, işi bitince bağlantıyı
        # otomatik olarak havuza geri bırakır. Bu çok önemlidir.
        return pool.acquire()
    return None