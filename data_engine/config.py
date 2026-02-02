import os

# Veritabanı URL
DATABASE_URL = os.getenv("DATABASE_URL")

# asyncpg için URL düzeltmesi
if DATABASE_URL and DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
