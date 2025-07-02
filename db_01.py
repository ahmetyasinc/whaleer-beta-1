from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

DATABASE_URL = "postgresql+asyncpg://postgres:admin@localhost:5432/balina_db"

# Engine & Pool
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,       # saniye
    pool_recycle=1800      # 30 dk sonra bağlantıyı yenile
)

# Oturum oluşturucu
async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# ORM modelleri için base class
Base = declarative_base()
