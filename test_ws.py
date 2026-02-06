import asyncio
import logging
import sys
import os

sys.path.append(os.getcwd())

try:
    from trade_engine.balance.ws_manager import WebSocketService
    from trade_engine.balance.orchestrator import SystemOrchestrator
except ImportError as e:
    print(f"❌ Import Hatası: {e}")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[logging.StreamHandler()]
)

async def main():
    logger = logging.getLogger("SYSTEM")
    logger.info("==========================================")
    logger.info("🚀 WHALEER TRADE ENGINE BAŞLATILIYOR... (v2.1)")
    logger.info("==========================================")

    # 1. Servisleri Hazırla
    ws_service = WebSocketService()
    orchestrator = SystemOrchestrator(ws_service)
    
    logger.info("✅ Servisler Hafızaya Yüklendi.")

    # 2. 🔥 ÖNCE GENESIS: Veritabanını hazırla
    logger.info("🌍 GENESIS BAŞLATILIYOR (Lütfen Bekleyin)...")
    try:
        # Bu işlem bitmeden aşağıya geçmez!
        await orchestrator.stream_manager.run_genesis()
        logger.info("✅ GENESIS BAŞARIYLA TAMAMLANDI.")
    except Exception as e:
        logger.critical(f"❌ Genesis Başarısız Oldu: {e}")
        return # Sistem açılamaz

    # 3. 🔥 SONRA LOOP: Artık dinlemeye geçebiliriz
    logger.info("▶️ CANLI SİSTEM (Listener & WebSocket) ATEŞLENİYOR...")
    
    try:
        # İkisini paralel başlat
        await asyncio.gather(
            orchestrator.start(), 
            ws_service.start()
        )
    except asyncio.CancelledError:
        logger.info("🛑 Sistem durdurma sinyali aldı.")
    except Exception as e:
        logger.critical(f"🔥 KRİTİK HATA: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        if os.name == 'nt':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Durduruldu.")