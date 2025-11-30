# backend/rental_engine/listen_service.py

import asyncio
import sys
from typing import Dict, Any, List
from decimal import Decimal

import psycopg
from psycopg import rows

from app.database import DATABASE_URL as SA_DATABASE_URL
from rental_engine.profit_engine import run_daily_profit_calculation
from rental_engine.soroban_client import SorobanClient


# ------------------ Genel Ayarlar ------------------

if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# PostgreSQL NOTIFY kanalı
NOTIFY_CHANNEL = "run_listenkey_refresh"

# Bots tablosu ve kolonları
BOTS_TABLE = "bots"
BOT_ID_COL = "id"
BOT_USER_ID_COL = "user_id"  # <-- user_id kolonun ismi buysa böyle bırak
BOT_DELETED_COL = "deleted"
BOT_ACTIVE_COL = "active"
BOT_INITIAL_USD_COL = "initial_usd_value"
BOT_CURRENT_USD_COL = "current_usd_value"
BOT_MAX_USD_COL = "maximum_usd_value"
BOT_ACQ_TYPE_COL = "acquisition_type"
IS_PROFIT_SHARE_COL = "is_profit_share"

# Hangi acquisition_type değerlerinde kontrol yapılacak
ACQ_TYPES_FOR_CHECK = ("RENTED", "PURCHASED")

# Minimum depozito limiti
MIN_DEPOSIT_USD = Decimal("10.0")

# Settle için token decimal (örnek: 7)
TOKEN_DECIMALS = 7

# Soroban client (global)
soroban_client = SorobanClient()


def build_psycopg_dsn(sa_url: str) -> str:
    """SQLAlchemy URL'sini psycopg DSN'e çevirir."""
    if sa_url.startswith("postgresql+asyncpg://"):
        return sa_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return sa_url


PG_DSN = build_psycopg_dsn(str(SA_DATABASE_URL))


# ------------------ DB Helper'lar ------------------

async def fetch_all_bots_for_daily_check() -> List[Dict[str, Any]]:
    async with await psycopg.AsyncConnection.connect(PG_DSN) as conn:
        async with conn.cursor(row_factory=rows.dict_row) as cur:
            query = f"""
                SELECT *
                FROM {BOTS_TABLE}
                WHERE {BOT_ACTIVE_COL} = TRUE
                  AND {BOT_DELETED_COL} = FALSE
                  AND {BOT_ACQ_TYPE_COL} IN ('RENTED', 'PURCHASED')
                  AND {IS_PROFIT_SHARE_COL} = TRUE
            """
            await cur.execute(query)
            rows_ = await cur.fetchall()
            return rows_ or []


async def update_bot_maximum_value(bot_id: int, current: Decimal, max_prev_raw) -> Decimal:
    """
    maximum_usd_value sadece current daha büyükse güncellenir.
    İlk kez çalışıyorsa (max_prev None/0) → current yazılır.
    """
    max_prev = Decimal(str(max_prev_raw or 0)) if max_prev_raw is not None else Decimal("0")

    if max_prev == 0 or current > max_prev:
        new_max = current
        async with await psycopg.AsyncConnection.connect(PG_DSN, autocommit=True) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    f"""UPDATE {BOTS_TABLE}
                        SET {BOT_MAX_USD_COL} = %s
                        WHERE {BOT_ID_COL} = %s""",
                    (new_max, bot_id),
                )
        print(f"   💾 max güncellendi → bot {bot_id}: max={new_max}")
    else:
        new_max = max_prev

    return new_max


async def stop_bot_for_low_deposit(bot_id: int, current_deposit: Decimal) -> None:
    """
    Depozito MIN_DEPOSIT_USD altına düştüğünde botu durdurur:
      - active = FALSE
    """
    async with await psycopg.AsyncConnection.connect(PG_DSN, autocommit=True) as conn:
        async with conn.cursor() as cur:
            query = f"""
                UPDATE {BOTS_TABLE}
                SET {BOT_ACTIVE_COL} = FALSE
                WHERE {BOT_ID_COL} = %s
            """
            await cur.execute(query, (bot_id,))

    print(
        f"⛔ [bots] Depozito düşük olduğu için bot durduruldu: "
        f"bot_id={bot_id}, current_usd={current_deposit}"
    )


# ------------------ Günlük Kar / Depozito + Settle Mantığı ------------------

async def run_daily_check() -> None:
    """
    Günlük tetik:
      - Filtre: active=TRUE, deleted=FALSE, acquisition_type in ('RENTED','PURCHASED'), is_profit_share=TRUE
      - Günlük kar/zarar hesabı
      - maximum_usd_value güncelleme
      - Depozito < 10 ise botu kapatma
      - daily_profit > 0 ise Soroban settle_profit çağrısı
    """
    print("🟢 Günlük kontrol başlıyor...")

    bots = await fetch_all_bots_for_daily_check()

    if not bots:
        print("ℹ️ Uygun bot yok.")
        return

    print(f"📦 Kontrol edilecek bot sayısı: {len(bots)}")

    for bot in bots:
        bot_id = bot[BOT_ID_COL]
        user_id = bot[BOT_USER_ID_COL]

        initial = Decimal(str(bot[BOT_INITIAL_USD_COL] or 0))
        current = Decimal(str(bot[BOT_CURRENT_USD_COL] or 0))
        max_prev_raw = bot.get(BOT_MAX_USD_COL)

        # Referans değer
        if max_prev_raw is None or Decimal(str(max_prev_raw or 0)) == 0:
            ref_val = initial
            first_day = True
        else:
            ref_val = Decimal(str(max_prev_raw))
            first_day = False

        # Kar / zarar
        daily_profit = current - ref_val
        total_profit = current - initial

        # Kısa log
        print(
            f"→ Bot {bot_id}: "
            f"cur={current} | ref={ref_val} | "
            f"daily={daily_profit} | total={total_profit}"
        )

        # max güncelle
        await update_bot_maximum_value(bot_id, current, max_prev_raw)

        # Depozito kontrolü
        if current < MIN_DEPOSIT_USD:
            await stop_bot_for_low_deposit(bot_id, current)
            print(f"    ⚠️ Bot {bot_id} durduruldu (low deposit).")
        else:
            print(f"    ✔ Bot {bot_id} OK.")

        # --- Kardan komisyon: settle_profit çağrısı ---
        if daily_profit > 0:
            # USD → token smallest unit (örnek 7 decimal)
            profit_amount_int = int(
                (daily_profit * (Decimal(10) ** TOKEN_DECIMALS)).to_integral_value()
            )

            try:
                # SorobanClient sync olduğundan ayrı thread'de çalıştırıyoruz
                resp = await asyncio.to_thread(
                    soroban_client.settle_profit,
                    bot_id,
                    user_id,
                    profit_amount_int,
                )
                print(f"    💸 settle_profit OK → tx={resp['tx_hash']}")
            except Exception as e:
                print(f"    ❌ settle_profit FAILED (bot={bot_id}, user={user_id}): {e}")

    print("✅ Günlük kontrol bitti.")


# ------------------ Listener ------------------

async def handle_notification(payload: str) -> None:
    print(f"\n🔔 Notify alındı → daily profit hesaplanıyor...")
    # 1) Önce profit_engine ile botların current_usd_value vs. güncellensin
    await run_daily_profit_calculation()
    # 2) Sonra bizim günlük kontrol + settle_profit çalışsın
    await run_daily_check()


async def listen_for_notifications() -> None:
    print("🔄 listener hazır...")

    async with await psycopg.AsyncConnection.connect(
        PG_DSN,
        autocommit=True,
    ) as conn:
        async with conn.cursor() as cur:
            await cur.execute(f"LISTEN {NOTIFY_CHANNEL};")

            async for notify in conn.notifies():
                if notify.channel != NOTIFY_CHANNEL:
                    continue
                asyncio.create_task(handle_notification(notify.payload))


def main() -> None:
    asyncio.run(listen_for_notifications())


if __name__ == "__main__":
    main()
