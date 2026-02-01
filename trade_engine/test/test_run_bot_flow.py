
import sys
import os
import json
import unittest
from unittest.mock import patch, MagicMock
import pandas as pd

# Proje kök dizinini path'e ekle
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../../"))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import etmeden önce modülleri mocklamak gerekebilir ama
# burada patch dekoratörleri ile halledeceğiz.
from trade_engine.process.run_bot import run_bot
from trade_engine.process.save import aggregate_results_by_bot_id

def main():
    print("🚀 Full Flow Test Başlatılıyor (run_bot -> result_dict)...\n")

    # =========================================================================
    # 📝 TEST GİRDİLERİNİ BURADAN DÜZENLE
    # =========================================================================
    bot_type = "spot"
    # 1. Bot Konfigürasyonu
    MOCK_BOT = {
        'id': 170,
        'user_id': 5,
        'period': '1m',
        'stocks': ['SOLUSDT'],
        # 'enter_on_start': True,  # İstersen true yapıp her zaman sinyal ürettirebilirsin
        'bot_type': bot_type,     # "spot" veya "futures"
    }

    # 2. Strateji Kodu ( df['position'] = ... )
    #    Basitçe son satırda pozisyona girsin (2) ve yüzde 100 olsun.
    MOCK_STRATEGY_CODE = """
df[["close"]] = df[["close"]].astype(float)

# Varsayılan değerler
df["position"] = 1
df["percentage"] = 50

# Son kapanış fiyatı
last_close = df["close"].iloc[-1]

df.loc[df.index[-1], "position"] = 0.5
df.loc[df.index[-1], "percentage"] = 100

# df["stop_loss"] = df['close'] * 0.9
# df['take_profit'] = df['close'] * 1.1

df["order_type"] = "market"
# df['limit_price'] = df['close'] * 0.999
"""

    # 3. İndikatör Listesi (Boş olabilir veya indicator kodu içerebilir)
    MOCK_INDICATORS = [
        # {'code': "df['rsi'] = 50"}
    ]

    # 4. Market Verisi (DataFrame)
    #    En az 2 satır veri lazım ki "önceki -> sonraki" değişimi görsün.
    mock_df_data = {
        'open': [100, 101, 102],
        'high': [105, 106, 107],
        'low':  [95, 96, 97],
        'close': [102, 103, 104],
        'volume': [1000, 2000, 3000],
        # Önceden position/percentage sütunları var gibi davranabiliriz veya strateji yaratır.
        'position': [0, 0, 0], 
        'percentage': [0, 0, 0]
    }
    mock_df = pd.DataFrame(mock_df_data)
    
    # run_bot dict key: (coin_id, period)
    MOCK_COIN_DATA = {
        ('SOLUSDT', '1m'): mock_df
    }

    # 5. Bot Bakiyesi ve Durumu (DB Context Mock)
    MOCK_CONTEXT = {
        "bot_type": bot_type,
        "current_value": 100.0,
        "fulness": 0.0,
        
        # --- SPOT ELLER (bot_holdings tablosundan) ---
        "holdings": [
             {
                "symbol": "BTCUSDT",
                "amount": 0.00015000,
                "percentage": 0,       # Portföydeki % ağırlığı
                "average_cost": 116465.3
             }
        ],
        
        # --- FUTURES POZİSYONLAR (bot_positions tablosundan) ---
        "positions": [
            {
                "symbol": "SOLUSDT",
                "position_side": "long", # veya 'short'
                "amount": 0.0045,        # Coin miktarı (Size)
                "leverage": 1,
                "percentage": 100,   # Kar/Zarar değil, pozisyonun büyüklüğünün portföye oranı olabilir (koda göre değişir)
                "average_cost": 229.60   # Giriş Fiyatı
            }
        ] 
    }

    # 6. DB'den gelen son fiyat ve min qty mockları
    MOCK_LAST_PRICE = 104.0
    MOCK_MIN_QTY = 0.01  # 0.1 SOL

    # =========================================================================
    # ⚙️ MANTIK ÇALIŞTIRMA (MOCKING)
    # =========================================================================

    # run_bot içindeki DB fonksiyonlarını ve context yükleyiciyi mockluyoruz
    with patch('trade_engine.process.run_bot._get_last_price_1m', return_value=MOCK_LAST_PRICE) as mock_price, \
         patch('trade_engine.process.run_bot._get_min_qty', return_value=MOCK_MIN_QTY) as mock_qty, \
         patch('trade_engine.control.control_the_results.load_bot_context', return_value=MOCK_CONTEXT) as mock_ctx, \
         patch('trade_engine.process.run_bot.log_info'), \
         patch('trade_engine.process.run_bot.log_warning'), \
         patch('trade_engine.process.run_bot.log_error'), \
         patch('trade_engine.control.control_the_results.log_info'), \
         patch('trade_engine.control.control_the_results.log_warning'):

        print(f"👤 User: {MOCK_BOT['user_id']} | 🤖 Bot: {MOCK_BOT['id']}")
        print(f"📈 Veri Seti: {len(mock_df)} satır")
        print("-" * 50)

        # 1. ADIM: run_bot çalıştır
        #    Bu fonksiyon stratejiyi çalıştırır -> sonuç üretir -> control_the_results ile süzer -> final aksiyonları döner.
        bot_result = run_bot(
            bot=MOCK_BOT,
            strategy_code=MOCK_STRATEGY_CODE,
            indicator_list=MOCK_INDICATORS,
            coin_data_dict=MOCK_COIN_DATA
        )

        # 2. ADIM: Sonuçları Analiz Et
        if bot_result['status'] != 'success':
            print("❌ run_bot başarısız oldu:", bot_result)
            return

        actions = bot_result.get('results', [])
        print(f"✅ run_bot tamamlandı. Üretilen Aksiyon Sayısı: {len(actions)}")
        
        # 3. ADIM: Result Dict Oluşturma (listen_service'deki gibi)
        #    aggregate_results_by_bot_id fonksiyonu liste alır.
        all_results_flat = [] 
        # run_all_bots normalde list of lists döner ve process.py'da flatten edilir.
        # Biz burada tek bot çalıştırdık, direkt actions listesini kullanacağız ama formatı uyduralım.
        # actions listesi zaten [{'bot_id':..., 'coin_id':...}, ...] formatında.
        
        if actions:
            all_results_flat.extend(actions)

        final_result_dict = aggregate_results_by_bot_id(all_results_flat)

        print("\n✨ FINAL RESULT DICT (Listen Service'in eline geçen):")
        print("-" * 50)
        print(json.dumps(final_result_dict, ensure_ascii=False, indent=2))
        print("-" * 50)

if __name__ == "__main__":
    main()
