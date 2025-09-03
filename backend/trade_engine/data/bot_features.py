# backend/trade_engine/data/bot_features.py
import psycopg2
from psycopg2.extras import RealDictCursor
from backend.trade_engine.config import DB_CONFIG

def _safe_float(x, default=0.0):
    try:
        return float(x)
    except Exception:
        return default

def load_bot_context(bot_id: int):
    """
    Tek bağlantı / tek fonksiyon ile:
      - bots: bot_type, current_usd_value, fullness (USDT)
      - bot_holdings: (symbol, percentage, amount)
      - bot_positions: (symbol, position_side, amount, percentage, leverage) [status='open']
    döner.

    Dönüş:
    {
      "bot_type": "spot"|"futures",
      "current_value": float,
      "fulness": float (0..1),
      "holdings": [ {symbol, percentage, amount}, ... ],
      "positions": [ {symbol, position_side, amount, percentage, leverage}, ... ],
    }
    """
    bot = {}
    holdings = []
    positions = []

    try:
        with psycopg2.connect(**DB_CONFIG) as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # bots
                cur.execute("""
                    SELECT bot_type, current_usd_value, fullness
                    FROM bots
                    WHERE id = %s
                    LIMIT 1;
                """, (bot_id,))
                bot = cur.fetchone() or {}

                # holdings (spot tarafı)
                cur.execute("""
                    SELECT symbol, percentage, amount
                    FROM bot_holdings
                    WHERE bot_id = %s;
                """, (bot_id,))
                holdings = cur.fetchall() or []

                # positions (futures tarafı) – leverage varsa al, yoksa NULL
                # NOT: leverage kolonu yoksa migration önerisi en altta.
                cur.execute("""
                    SELECT symbol, position_side, amount, percentage,
                           CASE WHEN EXISTS (
                             SELECT 1
                             FROM information_schema.columns
                             WHERE table_name = 'bot_positions' AND column_name = 'leverage'
                           )
                           THEN leverage
                           ELSE NULL
                           END AS leverage
                    FROM bot_positions
                    WHERE bot_id = %s AND status = 'open';
                """, (bot_id,))
                positions = cur.fetchall() or []

    except Exception as e:
        print(f"[load_bot_context] Veritabanı hatası: {e}")

    bot_type = (bot.get("bot_type") or "spot").lower()
    current_value = _safe_float(bot.get("current_usd_value"))
    fullness_usdt = _safe_float(bot.get("fullness"))
    # fullness fraction (0..1):
    fulness = (fullness_usdt / current_value) if current_value > 0 else 0.0
    # clamp 0..1
    fulness = max(0.0, min(1.0, fulness))

    return {
        "bot_type": bot_type,
        "current_value": current_value,
        "fulness": fulness,
        "holdings": holdings,
        "positions": positions,
    }


# ---- (Opsiyonel) Eski fonksiyonlar geriye dönük çalışsın diye thin-wrapper ----
def load_bot_holding(bot_id):
    return load_bot_context(bot_id).get("holdings", [])

def load_bot_positions(bot_id):
    return load_bot_context(bot_id).get("positions", [])

def load_bot_value(bot_id):
    return load_bot_context(bot_id).get("current_value", 0.0)

def get_bot_percentage(bot_id):
    """ESKİ ANLAM KARMAŞASI: Artık 0..1 fraction döner."""
    return load_bot_context(bot_id).get("fulness", 0.0)
