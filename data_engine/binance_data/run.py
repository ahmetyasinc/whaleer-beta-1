import asyncio
import logging
import sys
import os
import asyncpg
from dotenv import load_dotenv

# Path ayarı: projeyi (whaleer/ kökünü) bulabilmesi için
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)      # data_engine/
grandparent_dir = os.path.dirname(parent_dir)  # whaleer/
sys.path.append(grandparent_dir)

# .env Yükle (Importlardan ÖNCE)
env_path = os.path.join(grandparent_dir, '.env')
if not load_dotenv(env_path):
    load_dotenv() # fallback

# Importlar (Modül Yapısıyla)
from data_engine.config import DATABASE_URL
from data_engine.binance_data.manage_data import binance_websocket, process_db_queue

# Logger Yapılandırması
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("DataEngine")

# Windows için Event Loop Fix
if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    logger.info("🚀 Data Engine (Binance Ingest) Başlatılıyor...")
    
    if not DATABASE_URL:
        logger.error("❌ DATABASE_URL bulunamadı! .env dosyasını kontrol edin.")
        return

    logger.info(f"💾 Veritabanına bağlanılıyor... {DATABASE_URL.split('@')[-1]}")

    try:
        # DB Havuzunu başlat
        pool = await asyncpg.create_pool(DATABASE_URL)
        logger.info("✅ DB Bağlantısı Başarılı.")
    except Exception as e:
        logger.error(f"❌ DB Bağlantı Hatası: {e}")
        return

    # Görevleri Başlat
    tasks = [
        asyncio.create_task(binance_websocket(pool)),
        asyncio.create_task(process_db_queue(pool))
    ]

    try:
        # Sonsuza kadar çalış
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        logger.info("🛑 Durdurma sinyali alındı.")
    except Exception as e:
        logger.error(f"❌ Beklenmeyen Hata: {e}")
    finally:
        await pool.close()
        logger.info("👋 Veritabanı bağlantısı kapatıldı. Çıkış yapılıyor.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
