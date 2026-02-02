from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os, asyncio
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()
load_dotenv(".env.local")

# Asenkron PostgreSQL bağlantı URL'si
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:admin@localhost:5432/balina_db")

# Supabase & PostgreSQL (asyncpg) Fix
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# URL Parsing and Validation
try:
    from urllib.parse import urlparse, parse_qs, quote_plus
    
    # Check for unencoded special characters in password
    # This is a basic check to help users debug connection issues
    if DATABASE_URL and "@" in DATABASE_URL:
        # Simple heuristic: if the part before @ contains another @ or similar issue
        # Note: Validating complex connection strings is hard without parsing, 
        # but asyncpg requires strict URL encoding for passwords with special chars.
        pass

    # Asenkron SQLAlchemy engine oluştur"
    engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)  # echo=True olursa SQL sorgularını görebilirsin

except ValueError as e:
    print(f"❌ Veritabanı bağlantı hatası: {e}")
    print("💡 İPUCU: Veritabanı şifrenizde özel karakterler (@, :, / vb.) varsa bunları URL-encoded (%40, %3A, %2F) formatına çevirmelisiniz.")
    # Re-raise to stop execution if DB is critical
    raise e

# Asenkron veritabanı oturumu (session) oluşturucu
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# SQLAlchemy Base Modeli
Base = declarative_base()

# Veritabanı bağlantısını sağlayan asenkron fonksiyon
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def test_db():
    async with engine.begin() as conn:
        print("✅ Veritabanı bağlantısı başarılı!")

# asyncio.run(test_db())

from sqlalchemy import create_engine

def get_sync_engine():
    """
    Pandas ve diğer senkron işlemler için sync engine döndürür.
    """
    # asyncpg -> psycopg2 dönüşümü
    sync_url = DATABASE_URL.replace("+asyncpg", "+psycopg2") 
    return create_engine(sync_url, pool_pre_ping=True)

