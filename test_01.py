import asyncio
import logging
import sys
import os
from datetime import datetime

# 1. Ortam Yolu Ayarı
sys.path.append(os.getcwd())

# 2. Gerçek Proje Dosyaları
from trade_engine.config import asyncpg_connection
from trade_engine.balance.definitions import StreamStatus, MarketType
from trade_engine.balance.exchange.binance.listenkey_manager import StreamManager

# Log Ayarı
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger("GENESIS_TEST")

async def run_live_test():
    logger.info("💀 MOCKSUZ GENESIS TESTİ BAŞLIYOR...")
    
    try:
        # ==================================================================
        # ADIM 1: MEVCUT DURUM KONTROLÜ
        # ==================================================================
        async with asyncpg_connection() as conn:
            active_apis = await conn.fetchval("SELECT count(*) FROM api_keys WHERE is_active = true")
            
            if active_apis == 0:
                logger.error("❌ HATA: DB'de 'is_active=true' olan hiç API yok!")
                return

            logger.info(f"📊 İşlem yapılabilecek {active_apis} adet aktif API mevcut.")

        # Manager Başlatılıyor
        manager = StreamManager()

        # ==================================================================
        # ADIM 2: PROTOKOL SEÇİMİ (Genesis AKTİF)
        # ==================================================================
        
        # --- SEÇENEK A: GENESIS (Sıfırdan Kurulum & Bakiye Çekme) ---
        # Bu fonksiyon hem ListenKey alır hem de REST ile ilk bakiyeyi çeker.
        logger.info("🌍 Genesis çalıştırılıyor (ListenKey + İlk Bakiye Snapshot)...")
        await manager.run_genesis()

        # --- SEÇENEK B: MAINTENANCE (PASİF) ---
        # Genesis çalışırken bakıma gerek yoktur.
        # logger.info("🔧 Maintenance çalıştırılıyor...")
        # await manager.run_smart_maintenance()

        # ==================================================================
        # ADIM 3: SONUÇLARI DOĞRULAMA
        # ==================================================================
        async with asyncpg_connection() as conn:
            # 1. ListenKey Tablosunu Kontrol Et
            rows = await conn.fetch("""
                SELECT s.listen_key, s.status, s.market_type, s.updated_at, s.expires_at, a.api_key 
                FROM stream_keys s
                JOIN api_keys a ON a.id = s.api_id
                ORDER BY s.updated_at DESC
            """)
            
            print("\n" + "="*80)
            print(f"{'API (SHORT)':<12} | {'TYPE':<8} | {'STATUS':<8} | {'EXPIRES AT':<12} | {'RESULT'}")
            print("="*80)
            
            for row in rows:
                m_type = "SPOT" if row['market_type'] == 1 else "FUTURES"
                status_str = "NEW" if row['status'] == 1 else "ACTIVE" if row['status'] == 2 else "ERROR"
                expiry_str = row['expires_at'].strftime('%H:%M:%S') if row['expires_at'] else "NULL"
                
                print(f"{row['api_key'][:10]}... | {m_type:<8} | {status_str:<8} | {expiry_str:<12} | CREATED (✅)")
            
            print("-" * 80)

            # 2. Bakiye Normalizasyon Kontrolü
            # Genesis sonrası bakiyelerin Decimal(8) olarak yazıldığını teyit ediyoruz.
            logger.info("\n🔍 Bakiye Normalizasyon Kontrolü (Genesis Sonrası):")
            balances = await conn.fetch("""
                SELECT coin_symbol, amount, account_type, updated_at
                FROM user_api_balances 
                ORDER BY updated_at DESC LIMIT 5
            """)
            for b in balances:
                logger.info(f"   -> {b['coin_symbol']} ({b['account_type']}): {b['amount']}")

    except Exception as e:
        logger.error(f"❌ TEST SIRASINDA HATA: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_live_test())