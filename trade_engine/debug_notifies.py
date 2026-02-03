import asyncio
import os
import sys
import psycopg
from dotenv import load_dotenv

# Load .env
load_dotenv()

# DB URL
conn_str = os.getenv("DATABASE_URL")
if not conn_str:
    print("❌ DATABASE_URL bulunamadı!")
    sys.exit(1)

async def listen():
    print(f"📡 Bağlanılıyor: {conn_str.split('@')[-1]}")
    try:
        async with await psycopg.AsyncConnection.connect(conn_str, autocommit=True) as conn:
            async with conn.cursor() as cur:
                await cur.execute("LISTEN new_data;")
                await cur.execute("LISTEN new_futures_data;")
                print("✅ Dinlemeye başlandı. Kanallar: 'new_data', 'new_futures_data'")
                print("bekleniyor... (Ctrl+C ile durdurun)")

                async for notify in conn.notifies():
                    print(f"🔔 [KANAL: {notify.channel}] -> PAYLOAD: {notify.payload}")

    except Exception as e:
        print(f"Hata: {e}")

if __name__ == "__main__":
    if sys.platform.startswith('win'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        asyncio.run(listen())
    except KeyboardInterrupt:
        print("\n🛑 Durduruldu.")
