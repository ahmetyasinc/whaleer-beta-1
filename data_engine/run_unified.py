import asyncio
import logging
import sys
import os
import asyncpg
from dotenv import load_dotenv

# Path setup
current_dir = os.path.dirname(os.path.abspath(__file__)) # data_engine
parent_dir = os.path.dirname(current_dir)      # whaleer
sys.path.append(parent_dir)

# Load .env
env_path = os.path.join(parent_dir, '.env')
if not load_dotenv(env_path):
    load_dotenv() # fallback

# Imports
from data_engine.config import DATABASE_URL
from data_engine.binance_data.manage_data import binance_websocket as spot_websocket
from data_engine.binance_futures.manage_data import binance_websocket as futures_websocket
from data_engine.queue_manager import process_shared_queue

# Logger Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("DataEngineUnified")

# Windows Event Loop Fix
if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    logger.info("🚀 Unified Data Engine (Spot & Futures) Starting...")
    
    if not DATABASE_URL:
        logger.error("❌ DATABASE_URL not found!")
        return

    logger.info(f"💾 Connecting to Database... {DATABASE_URL.split('@')[-1]}")

    try:
        pool = await asyncpg.create_pool(DATABASE_URL)
        logger.info("✅ DB Connection Successful.")
    except Exception as e:
        logger.error(f"❌ DB Connection Error: {e}")
        return

    # Start Tasks
    tasks = [
        asyncio.create_task(spot_websocket(pool)),
        asyncio.create_task(futures_websocket(pool)),
        asyncio.create_task(process_shared_queue(pool))
    ]

    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        logger.info("🛑 Stop signal received.")
    except Exception as e:
        logger.error(f"❌ Unexpected Error: {e}")
    finally:
        await pool.close()
        logger.info("👋 Database connection closed. Exiting.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
