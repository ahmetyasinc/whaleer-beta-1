import asyncio
import logging
import sys
import os
import subprocess
from dotenv import load_dotenv

# Logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("DataEngineStarter")

# List of exchange runners (module paths)
EXCHANGE_RUNNERS = [
    "data_engine.binance_data.run",
    "data_engine.binance_futures.run"
]

processes = []

def start_services():
    """Tüm borsa motorlarını ayrı process olarak başlatır."""
    logger.info("🚀 Tüm Veri Motorları Başlatılıyor...")
    
    for module in EXCHANGE_RUNNERS:
        try:
            logger.info(f"▶️ Başlatılıyor: {module}")
            # python -m data_engine.binance_data.run
            p = subprocess.Popen([sys.executable, "-m", module])
            processes.append(p)
        except Exception as e:
            logger.error(f"❌ {module} başlatılamadı: {e}")

async def monitor_services():
    """Çalışan servisleri izler (Şimdilik basit bir loop)."""
    try:
        while True:
            for p in processes:
                if p.poll() is not None:
                    # Process çökmüş
                    logger.warning(f"⚠️ Process {p.pid} sonlandı. (Exit Code: {p.returncode})")
                    # Gelişmiş versiyonda burada yeniden başlatma yapılabilir (Restart Policy)
            await asyncio.sleep(5)
    except asyncio.CancelledError:
        pass

async def main():
    start_services()
    await monitor_services()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("🛑 Durdurma sinyali alındı. Alt servisler kapatılıyor...")
        for p in processes:
            p.terminate()
        logger.info("👋 Çıkış yapıldı.")
