# backend/trade_engine/config.py
import asyncio
import os
import ssl
import time
import logging
from functools import lru_cache
from contextlib import asynccontextmanager, contextmanager

import psycopg2
import asyncpg
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine

# =========================
# Ortam değişkenleri / Defaults
# =========================
DB_NAME = os.getenv("PGDATABASE", "balina_db")
DB_USER = os.getenv("PGUSER", "postgres")
DB_PASS = os.getenv("PGPASSWORD", "admin")
DB_HOST = os.getenv("PGHOST", "127.0.0.1")         # 'localhost' yerine IPv4 tercih
DB_PORT = os.getenv("PGPORT", "5432")

# sslmode: disable (aynı sunucu/Unix socket) | prefer | require
# UZAK sunucu/RDS ise 'require' ayarla.
PG_SSLMODE = os.getenv("PG_SSLMODE", None)

# Unix socket kullanmak istersen:
#   DB_HOST = "/var/run/postgresql"  # veya sistemindeki socket yolu
#   PG_SSLMODE = "disable"

def _auto_sslmode(host: str) -> str:
    # Host unix socket veya yerelse SSL gereksiz/kararsız olmasın
    if host.startswith("/") or host in ("127.0.0.1", "localhost"):
        return "disable"
    return "prefer"

SSLMODE = PG_SSLMODE or _auto_sslmode(DB_HOST)

# =========================
# DSN & yardımcılar
# =========================
def _sa_sync_url() -> str:
    # SQLAlchemy sync (psycopg2)
    return f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def _sa_async_url() -> str:
    # SQLAlchemy async (asyncpg)
    return f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def _psycopg2_conn_kwargs() -> dict:
    kwargs = dict(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        port=DB_PORT,
    )
    if SSLMODE:
        kwargs["sslmode"] = SSLMODE
    return kwargs

def _asyncpg_ssl_param():
    """asyncpg için ssl parametresi: disable => None, diğerleri => SSL context"""
    if SSLMODE == "disable":
        return None
    # Basit bir default context yeterli (sertifika doğrulaması gerekiyorsa sslrootcert ekle)
    ctx = ssl.create_default_context(purpose=ssl.Purpose.SERVER_AUTH)
    # Gerekiyorsa özel CA:
    # ctx.load_verify_locations(cafile="/path/to/root.crt")
    return ctx

# =========================
# SQLAlchemy SYNC Engine (Lazy + fork-safe)
# =========================
@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """
    SYNC engine'i lazy oluşturur.
    pool_pre_ping: kopmuş bağlantıları otomatik tespit/yeniler
    pool_recycle : uzun yaşayan bağlantıları periyodik yeniler
    """
    connect_args = {}
    if SSLMODE:
        connect_args["sslmode"] = SSLMODE

    eng = create_engine(
        _sa_sync_url(),
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=1800,     # 30 dk
        pool_use_lifo=True,
        connect_args=connect_args,
        future=True,
    )
    return eng

def dispose_engine():
    """Pool'u temizler (fork/worker başında çağır)."""
    try:
        get_engine().dispose()
    except Exception:
        pass
    # lru_cache temizle ki yeni process kendi engine'ini kursun
    get_engine.cache_clear()

# =========================
# SQLAlchemy ASYNC Engine (Lazy)
# =========================
_async_engine: AsyncEngine | None = None

def get_async_engine() -> AsyncEngine:
    global _async_engine
    if _async_engine is None:
        connect_args = {}
        # asyncpg ssl parametresi create_async_engine connect_args ile değil, URL/kwargs ile değil,
        # driver içi handle edilir; bu yüzden create_pool tarafında ssl'i yönetiyoruz.
        # SQLAlchemy async engine, connection alırken asyncpg'nin defaultlarını kullanır.
        _async_engine = create_async_engine(
            _sa_async_url(),
            echo=False,
            pool_pre_ping=True,
            pool_recycle=1800,
            pool_size=5,
            max_overflow=10,
        )
    return _async_engine

async def dispose_async_engine():
    global _async_engine
    if _async_engine is not None:
        await _async_engine.dispose()
        _async_engine = None

# =========================
# psycopg2 (ham) bağlantı (Her çağrıda yeni)
# =========================
def get_db_connection():
    """
    Her çağrıda yeni psycopg2 bağlantısı döndürür.
    Bağlantıyı işin bitiminde kapatmayı unutma (context manager aşağıda).
    """
    return psycopg2.connect(**_psycopg2_conn_kwargs())

@contextmanager
def psycopg2_connection():
    """Context manager ile güvenli psycopg2 kullanım kalıbı."""
    conn = None
    try:
        conn = get_db_connection()
        yield conn
    finally:
        try:
            if conn is not None:
                conn.close()
        except Exception:
            pass

# =========================
# asyncpg Pool (Lazy, tek proses içinde)
# =========================
_ASYNC_POOL: asyncpg.pool.Pool | None = None

async def get_async_pool() -> asyncpg.pool.Pool:
    """
    Global asyncpg pool'u lazy oluşturur.
    Farklı process'lerde paylaşmayın (fork sonrası yeniden kurun).
    """
    global _ASYNC_POOL
    if _ASYNC_POOL is None:
        _ASYNC_POOL = await asyncpg.create_pool(
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            host=DB_HOST,
            port=DB_PORT,
            min_size=5,
            max_size=20,
            timeout=10.0,
            max_inactive_connection_lifetime=300.0,
            ssl=_asyncpg_ssl_param(),
        )
        logging.info("✅ asyncpg pool oluşturuldu.")
    return _ASYNC_POOL

async def close_async_pool():
    global _ASYNC_POOL
    if _ASYNC_POOL is not None:
        await _ASYNC_POOL.close()
        _ASYNC_POOL = None
        logging.info("🧹 asyncpg pool kapatıldı.")

@asynccontextmanager
async def asyncpg_connection():
    """
    asyncpg pool'dan güvenli connection context'i.
    Kullanım:
        async with asyncpg_connection() as conn:
            await conn.fetchval("SELECT 1")
    """
    pool = await get_async_pool()
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        try:
            await pool.release(conn)
        except Exception:
            pass

# =========================
# Sağlam ping & retry yardımcıları
# =========================
def sa_execute_scalar(query: str, params: dict | None = None, retries: int = 1):
    """
    Sync SQLAlchemy ile tek değer döndürür; kopuk bağlantıda pool'u resetleyip retry eder.
    """
    last_err = None
    for attempt in range(retries + 1):
        try:
            eng = get_engine()
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
                return conn.execute(text(query), params or {}).scalar()
        except Exception as e:
            last_err = e
            try:
                dispose_engine()
            except Exception:
                pass
            if attempt < retries:
                time.sleep(0.2 * (2 ** attempt))
    raise last_err if last_err else RuntimeError("Unknown DB error")

async def asyncpg_fetchval(query: str, *args, retries: int = 1):
    """
    asyncpg ile tek değer döndürür; kopuk pool'u kapatıp retry eder.
    """
    last_err = None
    for attempt in range(retries + 1):
        try:
            async with asyncpg_connection() as conn:
                return await conn.fetchval(query, *args)
        except Exception as e:
            last_err = e
            try:
                await close_async_pool()
            except Exception:
                pass
            if attempt < retries:
                await asyncio.sleep(0.2 * (2 ** attempt))
    raise last_err if last_err else RuntimeError("Unknown async DB error")

# =========================
# Fork/worker başlangıcında çağır
# =========================
def on_worker_start():
    """
    PM2/gunicorn/multiprocessing ile child process başlarken çağır.
    Amaç: Parent'tan miras havuz/conn izlerini temizlemek.
    """
    dispose_engine()
    # async engine/pool child içinde ilk kullanımda zaten lazy kurulacak.
    logging.info("🔄 Worker DB kaynakları resetlendi (sync).")

async def on_worker_start_async():
    await dispose_async_engine()
    await close_async_pool()
    logging.info("🔄 Worker DB kaynakları resetlendi (async).")
