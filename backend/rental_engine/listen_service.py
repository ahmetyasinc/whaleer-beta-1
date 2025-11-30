# backend/rental_engine/listen_service.py

import asyncio
import sys
from datetime import datetime

import psycopg

from app.database import DATABASE_URL as SA_DATABASE_URL
from rental_engine.profit_engine import run_daily_profit_calculation


# ------------------ Genel Ayarlar ------------------

# Windows'ta event loop policy fix
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# PostgreSQL NOTIFY kanalı ve hedef payload
NOTIFY_CHANNEL = "run_listenkey_refresh"
TARGET_PAYLOAD = "settle_all_request"


def build_psycopg_dsn(sa_url: str) -> str:
    """SQLAlchemy URL'sini psycopg DSN'e çevirir."""
    if sa_url.startswith("postgresql+asyncpg://"):
        return sa_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return sa_url


PG_DSN = build_psycopg_dsn(str(SA_DATABASE_URL))


# ------------------ Notify Handler ------------------

async def handle_notification(payload: str) -> None:
    """
    PostgreSQL NOTIFY payload'ına göre aksiyon alır.
    Sadece TARGET_PAYLOAD geldiğinde profit engine'i tetikler.
    """
    print(f"\n🔔 Notify alındı → channel={NOTIFY_CHANNEL}, payload={payload}")
    print("⏱  Time:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    if payload == TARGET_PAYLOAD:
        print("🟢 settle_all_request → daily profit hesaplanıyor...")
        await run_daily_profit_calculation()
    else:
        print("ℹ️ Bu payload için aksiyon tanımlı değil, atlanıyor.")


# ------------------ Listener Loop ------------------

async def listen_for_notifications() -> None:
    print("🔄 listener hazır...")

    async with await psycopg.AsyncConnection.connect(
        PG_DSN,
        autocommit=True,
    ) as conn:
        async with conn.cursor() as cur:
            # Kanalı dinlemeye başla
            await cur.execute(f"LISTEN {NOTIFY_CHANNEL};")
            print(f"👂 Kanal dinleniyor: {NOTIFY_CHANNEL}")

            # Sürekli NOTIFY bekle
            async for notify in conn.notifies():
                # Sadece ilgili kanalı dinle
                if notify.channel != NOTIFY_CHANNEL:
                    continue

                # Notify geldiğinde handler'ı ayrı task olarak çalıştır
                asyncio.create_task(handle_notification(notify.payload))


def main() -> None:
    asyncio.run(listen_for_notifications())


if __name__ == "__main__":
    main()
