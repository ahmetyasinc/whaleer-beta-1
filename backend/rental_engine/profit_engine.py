# rental_engine/profit_engine.py

from decimal import Decimal
from typing import Dict, Any, List
import asyncio

import psycopg
from psycopg import rows

from app.database import DATABASE_URL as SA_DATABASE_URL
from rental_engine.soroban_client import SorobanClient

# Bots tablosu kolonları
BOTS_TABLE = "bots"
BOT_ID_COL = "id"
BOT_USER_ID_COL = "user_id"          # <-- user_id kolonu
BOT_DELETED_COL = "deleted"
BOT_ACTIVE_COL = "active"
BOT_INITIAL_USD_COL = "initial_usd_value"
BOT_CURRENT_USD_COL = "current_usd_value"
BOT_MAX_USD_COL = "maximum_usd_value"
BOT_ACQ_TYPE_COL = "acquisition_type"
IS_PROFIT_SHARE_COL = "is_profit_share"

# Filtrelenecek acquisition_type değerleri
ACQ_TYPES_FOR_CHECK = ("RENTED", "PURCHASED")

# Minimum depozito limiti
MIN_DEPOSIT_USD = Decimal("10.0")

# Kardan komisyon için token decimal (şu an kullanılmıyor ama dursun)
TOKEN_DECIMALS = 7

# Soroban client (sync olduğu için global tek instance)
soroban_client = SorobanClient()


# DB DSN dönüştürücü
def build_psycopg_dsn(sa_url: str) -> str:
    if sa_url.startswith("postgresql+asyncpg://"):
        return sa_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return sa_url


PG_DSN = build_psycopg_dsn(str(SA_DATABASE_URL))


# ---- HELPERS ---- #

async def fetch_bots() -> List[Dict[str, Any]]:
    """
    Şu botlarda profit çalışacak:
        - active = TRUE
        - deleted = FALSE
        - acquisition_type IN ('RENTED','PURCHASED')
        - is_profit_share = TRUE
    """
    async with await psycopg.AsyncConnection.connect(PG_DSN) as conn:
        async with conn.cursor(row_factory=rows.dict_row) as cur:
            query = f"""
                SELECT * FROM {BOTS_TABLE}
                WHERE {BOT_ACTIVE_COL} = TRUE
                  AND {BOT_DELETED_COL} = FALSE
                  AND {BOT_ACQ_TYPE_COL} IN ('RENTED', 'PURCHASED')
                  AND {IS_PROFIT_SHARE_COL} = TRUE
            """
            await cur.execute(query)
            return await cur.fetchall()


async def update_bot_max(bot_id: int, current: Decimal, max_prev: Decimal | None):
    """
    maximum_usd_value sadece current daha büyükse güncellenir.
    İlk kez çalışıyorsa (max_prev None/0) → current yazılır.
    """
    if max_prev is None or max_prev == 0:
        new_max = current
    else:
        new_max = current if current > max_prev else max_prev

    async with await psycopg.AsyncConnection.connect(PG_DSN, autocommit=True) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""UPDATE {BOTS_TABLE}
                    SET {BOT_MAX_USD_COL} = %s
                    WHERE {BOT_ID_COL} = %s""",
                (new_max, bot_id)
            )

    print(f"   💾 max güncellendi → bot {bot_id}: max={new_max}")


async def deactivate_bot(bot_id: int, current: Decimal):
    """Depozito düşükse botu devre dışı bırak."""
    async with await psycopg.AsyncConnection.connect(PG_DSN, autocommit=True) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""UPDATE {BOTS_TABLE}
                    SET {BOT_ACTIVE_COL} = FALSE
                    WHERE {BOT_ID_COL} = %s""",
                (bot_id,)
            )
    print(f"   ⚠️ Bot {bot_id} durduruldu (low deposit → {current}).")


def compute_profit(initial: Decimal, current: Decimal, maximum: Decimal | None):
    """Profit hesaplama."""
    if maximum is None or maximum == 0:
        ref = initial
        first_day = True
    else:
        ref = maximum
        first_day = False

    daily = current - ref
    total = current - initial
    return first_day, ref, daily, total


# ---- MAIN PROFIT ENGINE ---- #

async def run_daily_profit_calculation():
    """Tüm profit sürecinin yönetildiği ana fonksiyon."""
    print("🟢 Daily profit check başlıyor...")

    bots = await fetch_bots()
    if not bots:
        print("ℹ️ Profit hesaplanacak bot yok.")
        return

    print(f"📦 {len(bots)} bot işleniyor...")

    for bot in bots:
        bot_id = bot[BOT_ID_COL]
        user_id = bot[BOT_USER_ID_COL]

        # Depozito / değerler → SADECE OKUNUYOR, DB'de değiştirmiyoruz
        initial = Decimal(str(bot[BOT_INITIAL_USD_COL] or 0))
        current = Decimal(str(bot[BOT_CURRENT_USD_COL] or 0))

        raw_max = bot.get(BOT_MAX_USD_COL)
        max_prev = (
            Decimal(str(raw_max))
            if raw_max not in (None, 0, "0")
            else None
        )

        # ---- KAR/ZARAR HESABI ----
        first_day, ref, daily, total = compute_profit(initial, current, max_prev)
        daily_profit = daily

        tag = "FIRST" if first_day else "DAY"
        print(
            f"→ Bot {bot_id} [{tag}] "
            f"cur={current} / maximum_usd_value={ref} / daily={daily_profit} / total={total}"
        )

        # ---- KARDAN KOMİSYON → Soroban settle_profit_usd ----
        if daily_profit > 0:
            try:
                # daily_profit = USD cinsinden kâr
                resp = await asyncio.to_thread(
                    soroban_client.settle_profit_usd,
                    bot_id,
                    user_id,
                    float(daily_profit),
                )
                print(f"   💸 settle_profit OK → tx={resp['tx_hash']}")
            except Exception as e:
                print(f"   ❌ settle_profit FAILED (bot={bot_id}, user={user_id}): {e}")
        else:
            print(f"   ℹ️ Komisyon yok (daily={daily_profit}).")

        # ---- MAX GÜNCELLEME ----
        await update_bot_max(bot_id, current, max_prev)

        # ---- DEPOZİTO KONTROLÜ ----
        if current < MIN_DEPOSIT_USD:
            await deactivate_bot(bot_id, current)
        else:
            print(f"   ✔ Bot {bot_id} OK.")

    print("✅ Profit modu tamamlandı.")
