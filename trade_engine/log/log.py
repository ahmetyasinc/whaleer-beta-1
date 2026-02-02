# backend/trade_engine/log.py
from __future__ import annotations

import json
import math
from decimal import Decimal
from typing import Any, Dict, Optional

from psycopg2.extras import RealDictCursor, Json
from psycopg2 import OperationalError, InterfaceError, DatabaseError

# Merkezi DB yardımcıları (fork-safe, ssl/parametreler config'ten)
from trade_engine.config import get_db_connection  # her çağrıda taze bağlantı

BOT_LOG_LEVELS = {"info", "warning", "error"}


# ------------------------------
# JSON güvenliği: NaN/Inf temizliği
# ------------------------------

def _is_nan_or_inf(v: Any) -> bool:
    if isinstance(v, float):
        return (math.isnan(v) or math.isinf(v))
    if isinstance(v, Decimal):
        try:
            return (v.is_nan() or (not v.is_finite()))
        except Exception:
            return False
    return False


def _sanitize_value(v: Any) -> Any:
    """
    JSON'e yazılmadan önce:
      - float/Decimal NaN/Inf → None
      - Decimal → float (veya str, istersen)
      - dict/list/tuple → özyinelemeli temizlik
    """
    # float
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
        return v

    # Decimal
    if isinstance(v, Decimal):
        try:
            if v.is_nan() or (not v.is_finite()):
                return None
        except Exception:
            pass
        # log amaçlı float yeterli
        return float(v)

    # dict
    if isinstance(v, dict):
        return {k: _sanitize_value(x) for k, x in v.items()}

    # list/tuple
    if isinstance(v, (list, tuple)):
        return [_sanitize_value(x) for x in v]

    return v


def sanitize_json_payload(obj: Any) -> Any:
    return _sanitize_value(obj)


# ------------------------------
# Log yazıcı
# ------------------------------

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
    conn: Optional["psycopg2.extensions.connection"] = None,
) -> int:
    """
    public.bot_logs tablosuna kayıt atar ve yeni kaydın id'sini döndürür.

    Kullanım:
        add_bot_log(level="error", bot_id=120, message="Emir gönderimi başarısız",
                    user_id=5, symbol="BTCUSDT", period="1m",
                    details={"exchange_error": "INSUFFICIENT_BALANCE", "attempt": 3})
    """
    # seviye doğrulama
    lvl = (level or "").lower().strip()
    if lvl not in BOT_LOG_LEVELS:
        raise ValueError(f"Geçersiz log seviyesi: {level!r}. Geçerli değerler: {BOT_LOG_LEVELS}")

    # details’i JSONB’e hazırla (güvenli temizleme ile)
    json_details: Optional[Json] = None
    if details is not None:
        if isinstance(details, str):
            # string geldiyse JSON parse etmeyi dener; olmazsa 'text' alanına koyar
            try:
                parsed = json.loads(details)
            except Exception:
                parsed = {"text": details}
            parsed = sanitize_json_payload(parsed)
            json_details = Json(parsed, dumps=json.dumps)
        else:
            parsed = sanitize_json_payload(details)
            json_details = Json(parsed, dumps=json.dumps)

    sql = """
        INSERT INTO public.bot_logs (user_id, bot_id, symbol, period, level, message, details)
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
            own_conn = get_db_connection()  # config'ten: sslmode/parametreler merkezi
            conn = own_conn

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            new_id = cur.fetchone()["id"]

        # Dışarıdan conn verilmediyse commit sorumluluğu bize ait
        if own_conn is not None:
            conn.commit()

        return int(new_id)

    except (OperationalError, InterfaceError, DatabaseError):
        # Sadece kendi açtığımız bağlantıda rollback edelim
        if own_conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
        raise
    finally:
        if own_conn is not None:
            try:
                conn.close()
            except Exception:
                pass


# Basit yardımcılar (kısayol)

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
