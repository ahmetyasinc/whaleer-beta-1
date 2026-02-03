import os
import sys
import traceback
from datetime import datetime
from urllib.parse import urlparse
from dotenv import load_dotenv

import asyncio
import asyncpg
import logging

# .env dosyasını yükle (Local defaultları)
load_dotenv()

# Windows Fix
if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())



# --- Logging Setup ---
# Varsayılan seviyeyi WARNING yapıyoruz ki her kütüphane konuşmasın
logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Kendi runner'ımızın loglarını INFO seviyesinde tutalım
logger = logging.getLogger("UnifiedRunner")
logger.setLevel(logging.INFO)

# Gürültücüleri Susturma (Sadece HATA varsa konuşsunlar)
logging.getLogger("asyncio").setLevel(logging.WARNING)
logging.getLogger("websockets").setLevel(logging.WARNING)
logging.getLogger("trade_engine.balance.models.run_services").setLevel(logging.WARNING)
logging.getLogger("trade_engine.balance.models.ws_service").setLevel(logging.WARNING)
logging.getLogger("trade_engine.order_engine.data_access.repos.symbol_filters").setLevel(logging.WARNING)
logging.getLogger("root").setLevel(logging.WARNING) # root logger'ı sustur
logging.getLogger("ServiceRunner").setLevel(logging.INFO)
logging.getLogger("StrategyEngine").setLevel(logging.INFO) # Her dk yeni veri log'unu GÖRELİM

# ÖNEMLİ: Emirleri görmek istiyoruz (Trade Logs)
logging.getLogger("OrderService").setLevel(logging.INFO)

# --- Import Services ---
try:
    # 1. Strategy Engine (Sinyal Üretici)
    from trade_engine.listen_service import listen_for_notifications
except ImportError:
    logger.critical("❌ listen_service (Strategy Engine) import edilemedi!")
    traceback.print_exc()
    listen_for_notifications = None

try:
    # 2. Tracking Services (Emir/Pozisyon Takip)
    from trade_engine.balance.models.run_services import (
        start_service, 
        stop_service, 
        initial_refresh, 
        managed_services,
        listen_for_db_triggers,
        listen_for_api_key_events
    )
except ImportError:
    logger.critical("❌ run_services (Tracking Engine) import edilemedi!")
    traceback.print_exc()
    start_service = None



# --- Supervisor Configuration ---
SUPERVISOR_INTERVAL = 10  # saniye (Kontrol sıklığı)
RESTART_DELAY = 5         # saniye (Hata sonrası bekleme)

# Global Tasks Dictionary
running_tasks = {
    "strategy_engine": None,  # listen_for_notifications
    "tracking_listeners": [], # DB triggers & API events
}

async def start_strategy_engine():
    """Strategy Engine'i başlatır ve task olarak döner."""
    if not listen_for_notifications:
        logger.error("Strategy Engine fonksiyonu yok, başlatılamıyor.")
        return None
    
    logger.info("🚀 [Strategy Engine] Başlatılıyor...")
    return asyncio.create_task(listen_for_notifications())

async def start_tracking_services():
    """Tracking servislerini (Spot/Futures WS) başlatır."""
    if not start_service:
        logger.error("Tracking Service fonksiyonları yok, başlatılamıyor.")
        return

    logger.info("🚀 [Tracking Services] Başlatılıyor...")
    
    # 1. Listeners (DB Trigger & API Events)
    # Bunlar sonsuz döngüde çalışır, task olarak saklayalım
    t1 = asyncio.create_task(listen_for_db_triggers())
    t2 = asyncio.create_task(listen_for_api_key_events())
    running_tasks["tracking_listeners"] = [t1, t2]

    # 2. Initial Refresh (Listen Key Yenileme)
    try:
        await initial_refresh()
    except Exception as e:
        logger.error(f"⚠️ Initial refresh hatası: {e}")

    # 3. Servisleri Başlat (Spot, Futures)
    # run_services.py içindeki managed_services sözlüğünü kullanıyoruz
    for name in managed_services:
        await start_service(name)

async def supervisor_loop():
    """
    Tüm servisleri izleyen ve çökenleri yeniden başlatan ana döngü.
    """
    logger.info("🛡️ Supervisor (Gözetmen) Devrede. Servisler izleniyor...")
    
    while True:
        try:
            # 1. Strategy Engine Kontrolü
            strategy_task = running_tasks.get("strategy_engine")
            
            if strategy_task is None or strategy_task.done():
                if strategy_task and strategy_task.done():
                    # Hata var mı incele
                    try:
                        exc = strategy_task.exception()
                        if exc:
                            logger.error(f"💥 [Strategy Engine] Çöktü! Hata: {exc}")
                        else:
                            logger.warning(f"⚠️ [Strategy Engine] Beklenmedik şekilde durdu.")
                    except asyncio.CancelledError:
                        logger.info("🛑 [Strategy Engine] Durduruldu.")
                        return # Supervisor da dursun mu? Hayır, belki manuel durduruldu.

                # Yeniden Başlat
                logger.info(f"🔄 [Strategy Engine] {RESTART_DELAY} sn içinde yeniden başlatılacak...")
                await asyncio.sleep(RESTART_DELAY)
                running_tasks["strategy_engine"] = await start_strategy_engine()

            # 2. Tracking Services (WS Tasks) Kontrolü
            # run_services.py -> managed_services sözlüğündeki task'ları kontrol et
            if managed_services:
                for name, service_info in managed_services.items():
                    task = service_info.get("task")
                    if task is None or task.done():
                        if task and task.done():
                            try:
                                exc = task.exception()
                                if exc:
                                    logger.error(f"💥 [Tracking: {name}] Çöktü! Hata: {exc}")
                            except: pass
                        
                        logger.info(f"🔄 [Tracking: {name}] Yeniden başlatılıyor...")
                        await start_service(name)

            # 3. Listener (DB) Tasks Kontrolü
            # Bunlar nadiren çöker ama kontrol etmekte fayda var
            listeners = running_tasks.get("tracking_listeners", [])
            for i, t in enumerate(listeners):
                if t.done():
                    logger.warning(f"⚠️ [Tracking Listener-{i}] Durmuş! (Yeniden başlatma mantığı eklenebilir)")
                    # Şimdilik sadece logluyoruz, karmaşıklığı artırmamak için.
                    # İstenirse buraya da restart eklenebilir.

        except asyncio.CancelledError:
            logger.info("Supervisor durduruluyor...")
            break
        except Exception as e:
            logger.error(f"Supervisor döngüsünde hata: {e}")
            await asyncio.sleep(5)
        
        await asyncio.sleep(SUPERVISOR_INTERVAL)

async def log_active_bot_count():
    """Başlangıçta veritabanına bağlanıp aktif bot sayısını yazar."""
    try:
        host = os.getenv("PGHOST", "127.0.0.1")
        port = os.getenv("PGPORT", "5432")
        db_name = os.getenv("PGDATABASE", "balina_db")
        
        logger.info(f"💾 Veritabanı Bağlanıyor: {host}:{port}/{db_name}")

        conn = await asyncpg.connect(
            user=os.getenv("PGUSER", "postgres"), 
            password=os.getenv("PGPASSWORD", "admin"),
            database=db_name, 
            host=host,
            port=port,
        )
        
        # Aktif ve Toplam Bot Sayısı
        active_count = await conn.fetchval("SELECT count(*) FROM bots WHERE active = true")
        total_count = await conn.fetchval("SELECT count(*) FROM bots")
        
        await conn.close()
        
        logger.info("---------------------------------------------------")
        logger.info(f"📊 TOPLAM BOT: {total_count}")
        logger.info(f"✅ AKTİF BOT : {active_count}")
        logger.info("---------------------------------------------------")
        
    except Exception as e:
        logger.error(f"❌ Veritabanı bot sayısı kontrol hatası: {e}")


async def main():
    logger.info("===================================================")
    logger.info("   WHALEER UNIFIED TRADE ENGINE RUNNER v1.0")
    logger.info("   (Strategy Engine + Tracking Services + Supervisor)")
    logger.info("===================================================")

    # 0. Bot Sayısını Göster (DB Kontrolü)
    await log_active_bot_count()

    # 1. Tracking Servislerini Başlat
    await start_tracking_services()

    # 2. Strategy Engine Başlat
    running_tasks["strategy_engine"] = await start_strategy_engine()

    # 3. Supervisor'ı Çalıştır (Bloklayıcı)
    await supervisor_loop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n🛑 Kullanıcı tarafından durduruldu (Ctrl+C).")
        # Graceful shutdown eklenebilir
        # stop_service('all') vs.
