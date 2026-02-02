# backend/trade_engine/data/bot_features.py
import psycopg2
from psycopg2.extras import RealDictCursor
from trade_engine.config import psycopg2_connection  # <- yeni import

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
      - bot_positions: (symbol, position_side, amount, percentage, leverage) [tablo durumuna göre]
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
        with psycopg2_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # --- bots ---
                cur.execute(
                    """
                    SELECT bot_type, current_usd_value, fullness
                    FROM public.bots
                    WHERE id = %s
                    LIMIT 1;
                    """,
                    (bot_id,),
                )
                bot = cur.fetchone() or {}

                # --- holdings (spot tarafı) ---
                cur.execute(
                    """
                    SELECT symbol, percentage, amount
                    FROM public.bot_holdings
                    WHERE bot_id = %s;
                    """,
                    (bot_id,),
                )
                holdings = cur.fetchall() or []

                # --- positions (futures tarafı) ---
                # leverage kolonu eski sürümlerde olmayabilir; varsa al, yoksa NULL dön.
                # NOT: Burada status/state filtresi eklemedik (mevcut davranışı bozmayalım).
                cur.execute(
                    """
                    SELECT
                        symbol,
                        position_side,
                        amount,
                        percentage,
                        CASE WHEN EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = 'public'
                              AND table_name   = 'bot_positions'
                              AND column_name  = 'leverage'
                        )
                        THEN leverage
                        ELSE NULL
                        END AS leverage
                    FROM public.bot_positions
                    WHERE bot_id = %s;
                    """,
                    (bot_id,),
                )
                positions = cur.fetchall() or []

    except Exception as e:
        print(f"[load_bot_context] Veritabanı hatası: {e}")

    # --- Sonuç hesapları ---
    bot_type = (bot.get("bot_type") or "spot").lower()
    current_value = _safe_float(bot.get("current_usd_value"))
    fullness_usdt = _safe_float(bot.get("fullness"))

    # fullness fraction (0..1): fullness_usdt / current_value
    fulness = (fullness_usdt / current_value) if current_value > 0 else 0.0
    fulness = max(0.0, min(1.0, fulness))  # clamp

    return {
        "bot_type": bot_type,
        "current_value": current_value,
        "fulness": fulness,
        "holdings": holdings,
        "positions": positions,
    }

# ---- Geriye dönük uyumluluk için thin-wrapper fonksiyonlar ----
def load_bot_holding(bot_id):
    return load_bot_context(bot_id).get("holdings", [])

def load_bot_positions(bot_id):
    return load_bot_context(bot_id).get("positions", [])

def load_bot_value(bot_id):
    return load_bot_context(bot_id).get("current_value", 0.0)

def get_bot_percentage(bot_id):
    """ESKİ ANLAM KARMAŞASI: Artık 0..1 fraction döner."""
    return load_bot_context(bot_id).get("fulness", 0.0)
