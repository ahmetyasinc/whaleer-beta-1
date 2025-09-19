# backend/trade_engine/log.py
from __future__ import annotations

import json
from typing import Any, Dict, Optional

import psycopg2
from psycopg2.extras import RealDictCursor, Json
from psycopg2 import OperationalError, InterfaceError, DatabaseError

# Projendeki mevcut DB ayarlarını kullan
from backend.trade_engine.config import DB_CONFIG
# Örn: DB_CONFIG = {"dbname": "...", "user": "...", "password": "...", "host": "...", "port": 5432}

BOT_LOG_LEVELS = {"info", "warning", "error"}

def _connect():
    """Yeni bir DB bağlantısı açar."""
    return psycopg2.connect(
        dbname=DB_CONFIG["dbname"],
        user=DB_CONFIG.get("user"),
        password=DB_CONFIG.get("password"),
        host=DB_CONFIG.get("host", "localhost"),
        port=DB_CONFIG.get("port", 5432),
        cursor_factory=RealDictCursor,
    )

def add_bot_log(
    *,
    level: str,
    bot_id: int,
    message: str,
    user_id: Optional[int] = None,
    symbol: Optional[str] = None,
    period: Optional[str] = None,
    details: Optional[Dict[str, Any] | str] = None,
    # Eğer hâlihazırda açık bir connection/cursor varsa gönderilebilir (örn. bir transaction içinde)
    conn: Optional[psycopg2.extensions.connection] = None,
) -> int:
    """
    bot_logs tablosuna kayıt atar ve yeni kaydın id'sini döndürür.

    Kullanım:
        add_bot_log(level="error", bot_id=120, message="Emir gönderimi başarısız",
                    user_id=5, symbol="BTCUSDT", period="1m",
                    details={"exchange_error": "INSUFFICIENT_BALANCE", "attempt": 3})
    """
    # seviye doğrulama
    lvl = (level or "").lower().strip()
    if lvl not in BOT_LOG_LEVELS:
        raise ValueError(f"Geçersiz log seviyesi: {level!r}. Geçerli değerler: {BOT_LOG_LEVELS}")

    # details’i JSONB’e hazırla
    json_details: Optional[Json] = None
    if details is not None:
        if isinstance(details, str):
            # string ise geçerli JSON mu kontrol et; değilse raw string'i yine JSONB'e string olarak koy
            try:
                parsed = json.loads(details)
            except Exception:
                parsed = {"text": details}
            json_details = Json(parsed)
        else:
            json_details = Json(details)

    sql = """
        INSERT INTO bot_logs (user_id, bot_id, symbol, period, level, message, details)
        VALUES (%s, %s, %s, %s, %s::bot_log_level, %s, %s)
        RETURNING id;
    """
    params = (
        user_id,
        bot_id,
        symbol,
        period,
        lvl,        # ENUM'a string geçmek yeterli
        message,
        json_details,
    )

    own_conn = None
    try:
        if conn is None:
            own_conn = _connect()
            conn = own_conn

        with conn.cursor() as cur:
            cur.execute(sql, params)
            new_id = cur.fetchone()["id"]

        # Dışarıdan conn verilmediyse commit sorumluluğu bize ait
        if own_conn is not None:
            conn.commit()

        return int(new_id)

    except (OperationalError, InterfaceError, DatabaseError) as e:
        # Dış bağlantı ise rollback etmemek daha doğru; sadece kendi açtığımız bağlantıda rollback+close
        if own_conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
        raise
    finally:
        if own_conn is not None:
            try:
                own_conn.close()
            except Exception:
                pass


# Basit yardımcılar (isteğe bağlı)

def log_info(**kwargs) -> int:
    """add_bot_log için level='info' kısayolu."""
    kwargs["level"] = "info"
    return add_bot_log(**kwargs)

def log_warning(**kwargs) -> int:
    """add_bot_log için level='warning' kısayolu."""
    kwargs["level"] = "warning"
    return add_bot_log(**kwargs)

def log_error(**kwargs) -> int:
    """add_bot_log için level='error' kısayolu."""
    kwargs["level"] = "error"
    return add_bot_log(**kwargs)
