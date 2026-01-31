
import sys
import os
import asyncio
import logging
import requests
import time
from unittest.mock import patch, MagicMock, AsyncMock

# Proje kök dizinini path'e ekle
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../../"))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Logging Ayarları
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

from backend.trade_engine.order_engine.core.order_execution_service import OrderExecutionService, OrderRequest
from backend.trade_engine.order_engine.core.price_store import price_store, PriceTicker
from backend.trade_engine.order_engine.data_access.repos import crud

def fetch_real_market_data(symbol, is_testnet):
    """
    Binance API'den güncel Fiyat ve Filtre bilgilerini çeker.
    """
    base_url = "https://testnet.binancefuture.com" if is_testnet else "https://fapi.binance.com"
    
    print(f"🌍 Piyasa verisi çekiliyor ({base_url})...")
    
    # 1. Fiyat Çek
    try:
        ticker_url = f"{base_url}/fapi/v1/ticker/price?symbol={symbol}"
        price_resp = requests.get(ticker_url).json()
        current_price = float(price_resp['price'])
        print(f"💰 Güncel {symbol} Fiyatı: {current_price}")
    except Exception as e:
        print(f"❌ Fiyat çekilemedi: {e}")
        current_price = 200.0 # Fallback

    # 2. Filtreleri Çek
    try:
        info_url = f"{base_url}/fapi/v1/exchangeInfo"
        info_resp = requests.get(info_url).json()
        symbol_info = next((s for s in info_resp['symbols'] if s['symbol'] == symbol), None)
        
        filters = {}
        if symbol_info:
            # Futures Filtrelerini Çözümle
            price_filter = next((f for f in symbol_info['filters'] if f['filterType'] == 'PRICE_FILTER'), {})
            lot_size = next((f for f in symbol_info['filters'] if f['filterType'] == 'LOT_SIZE'), {})
            min_notional = next((f for f in symbol_info['filters'] if f['filterType'] == 'MIN_NOTIONAL'), {})
            
            filters = {
                "step_size": float(lot_size.get('stepSize', 1.0)),
                "tick_size": float(price_filter.get('tickSize', 0.1)),
                "min_qty": float(lot_size.get('minQty', 1.0)),
                "min_notional": float(min_notional.get('notional', 5.0))
            }
            print(f"📏 Filtreler: {filters}")
        else:
            print("⚠️ Sembol bilgisi bulunamadı, varsayılanlar kullanılacak.")
            filters = {"step_size": 1.0, "tick_size": 0.01, "min_qty": 1.0, "min_notional": 5.0}

    except Exception as e:
        print(f"❌ Filtre çekilemedi: {e}")
        filters = {"step_size": 1.0, "tick_size": 0.01, "min_qty": 1.0, "min_notional": 5.0}

    return current_price, filters

async def main():
    print("🚀 Order Execution Test Başlatılıyor...\n")

    # =========================================================================
    # 🔑 1. AYARLAR
    # =========================================================================
    # GÜNCEL TEST KEYS (User tarafından girildi)
    MANUAL_API_KEY = "1iNSSq36p4nIEr3Uw3bYkHXvGraWZINWl4IAVH2neRscM5qHJ613BSGR0cVfKjCR"
    MANUAL_API_SECRET = "Gs7IMIeuyoZZryupftNmMydroisU5yOM6jTF1I0axbsNWL8ULCoJGZ0UaU3VqawP"
    
    # Testnet mi? (User = False istedi)
    IS_TESTNET = False 

    # TEST EDİLECEK EMİR
    MOCK_RESULT_DICT = {
        "170": [
    {
      "status": "success",
      "order_type": "market",
      "coin_id": "SOLUSDT",
      "trade_type": "futures",
      "positionside": "short",
      "side": "sell",
      "leverage": 2.0,
      "value": 6.0
    }
  ]
  
    }

    # =========================================================================
    # ⚙️ MANTIK ÇALIŞTIRMA
    # =========================================================================

    # 1. Gerçek Verileri Çek
    symbol = MOCK_RESULT_DICT["170"][0]["coin_id"]
    real_price, real_filters = fetch_real_market_data(symbol, IS_TESTNET)

    # 2. PriceStore'u Güncelle
    def mock_ticker(price):
        return PriceTicker(bid=price, ask=price, last=price, timestamp=time.time())

    price_store.update_price("BINANCE_FUTURES", symbol, mock_ticker(real_price))
    price_store.update_price("BINANCE_SPOT", symbol, mock_ticker(real_price))

    # 3. Filter Repo Cache Hazırla (İç içe yapıya uygun)
    # real_filters dict'i sadece futures verisi içeriyor, spot için aynısını kopyalıyoruz (test amaçlı)
    mock_filters_cache = {
        symbol: {
            "spot": real_filters,
            "futures": real_filters
        }
    }

    # 4. Mock Credentials
    mock_creds_return = {
        "api_key": MANUAL_API_KEY,
        "api_secret": MANUAL_API_SECRET,
        "id": 999,      
        "user_id": 5    
    }

    # Servisi Başlat
    with patch("backend.trade_engine.order_engine.data_access.repos.crud.get_api_credentials_by_bot_id", return_value=mock_creds_return) as mock_get_creds, \
         patch("backend.trade_engine.order_engine.data_access.repos.crud.insert_bot_trade", new_callable=AsyncMock) as mock_insert, \
         patch("backend.trade_engine.order_engine.data_access.repos.symbol_filters.SymbolFilterRepo.initialize", return_value=True):
         
         service = OrderExecutionService()
         service.filter_repo._cache = mock_filters_cache 
         
         if IS_TESTNET:
             print("ℹ️ TESTNET Modu Aktif: trade_type değerlerine '_test' eklenecek.\n")
         
         print("⏳ Servis Başlatılıyor...")
         await service.start(futures_workers=1, spot_workers=1)
         
         try:
             for bot_id_str, actions in MOCK_RESULT_DICT.items():
                 bot_id = int(bot_id_str)
                 for action in actions:
                     tt = action.get("trade_type", "futures")
                     if IS_TESTNET and "_test" not in tt:
                         tt = f"{tt}_test"

                     req = OrderRequest(
                         bot_id=bot_id,
                         symbol=action["coin_id"],
                         side=action["side"].upper(),
                         amount_usd=float(action["value"]),
                         trade_type=tt,
                         leverage=int(action.get("leverage", 1)),
                         order_type=action.get("order_type", "MARKET").upper(),
                         reduce_only=action.get("reduceOnly", False),
                         position_side=action.get("positionside", "").upper()
                     )
                     
                     print(f"📨 Emir Gönderiliyor: {req.symbol} {req.side} {req.amount_usd}$ ({tt})")
                     await service.submit_order(req)
             
             print("⏳ İşlemler bekleniyor (5 saniye)...")
             await asyncio.sleep(5)
             
         finally:
             await service.stop()
             print("\n✅ Test Tamamlandı.")

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
             asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
