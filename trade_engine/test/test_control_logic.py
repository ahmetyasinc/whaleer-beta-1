
import sys
import os
import json
import asyncio

# Proje kök dizinini path'e ekle (Eğer bu script backend/ altındaysa)
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../../"))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import edilen modüller
from trade_engine.control.control_the_results import control_the_results

def main():
    print("🚀 Test Başlatılıyor...\n")

    # =========================================================================
    # 📝 TEST GİRDİLERİNİ BURADAN DÜZENLE
    # =========================================================================
    
    # 1. Bot Temel Bilgileri
    USER_ID = 5
    BOT_ID = 170
    BOT_TYPE = "futures"  # "spot" veya "futures"
    
    # 2. Bot Bakiyesi ve Durumu (Context)
    #    Bu veriler normalde DB'den (bot_features tablosundan) gelir.
    #    Burada elle simüle ediyoruz.
    MOCK_CONTEXT = {
        "bot_type": BOT_TYPE,
        "current_value": 1000.0,   # Botun Toplam Varlığı (Balance + PnL)
        "fulness": 0.0,            # Ne kadar dolu? (0.0 = boş, 1.0 = full)
        
        # Spot Bot ise burayı doldur:
        "holdings": [
            # {"symbol": "BTCUSDT", "amount": 0.001, "percentage": 50.0},
        ],
        
        # Futures Bot ise burayı doldur:
        "positions": [
            # Örnek: Şu an elimde hiç pozisyon yok
            # {"symbol": "SOLUSDT", "position_side": "long", "amount": 10, "percentage": 20, "leverage": 2}
        ]
    }

    # 3. Minimum İşlem Limiti (USD)
    #    Burası dict olabilir: {"SOLUSDT": 10.0} veya düz sayı: 10.0
    MIN_USD = 10.0

    # 4. Stratejiden Gelen Sonuçlar (Result Dict)
    #    Normalde listen_service -> run_bot burayı üretir.
    MOCK_RESULTS = [
        {
            'bot_id': BOT_ID,
            'coin_id': 'SOLUSDT', # Dikkat: symbol yerine coin_id kullanılıyor
            'status': 'success',
            
            # Strateji Çıktısı: [Önceki, Şuanki]
            # Futures için positions: kaldıraç, percentage: %
            'last_positions': [0, 2],       # Kaldıraç: 0 -> 2x
            'last_percentage': [0, 100],    # Yüzde: %0 -> %100 (FULL GİR)
            
            'order_type': 'market',
            'stop_loss': None,
            'take_profit': None
        }
    ]

    # =========================================================================
    # ⚙️ MANTIK ÇALIŞTIRMA (DOKUNMA)
    # =========================================================================

    print(f"👤 User: {USER_ID} | 🤖 Bot: {BOT_ID} | Tip: {BOT_TYPE}")
    print(f"💰 Bakiye: {MOCK_CONTEXT['current_value']} USD | Doluluk: {MOCK_CONTEXT['fulness']}")
    print("-" * 50)
    
    try:
        actions = control_the_results(
            user_id=USER_ID,
            bot_id=BOT_ID,
            results=MOCK_RESULTS,
            min_usd=MIN_USD,
            ctx=MOCK_CONTEXT 
        )
        
        print("\n✨ SONUÇ (ACTIONS):")
        print("-" * 50)
        
        if not actions:
            print("🚫 İşlem Üretilmedi (Actions listesi boş)")
        else:
            print(json.dumps(actions, ensure_ascii=False, indent=2))
            
            print("-" * 50)
            print(f"Toplam {len(actions)} adet emir oluşturuldu.")

    except Exception as e:
        import traceback
        print(f"\n💥 HATA OLUŞTU: {e}")
        print(traceback.format_exc())

if __name__ == "__main__":
    main()
