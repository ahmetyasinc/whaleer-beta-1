from typing import Dict, Optional
import logging
from psycopg2.extras import RealDictCursor
import asyncio
from trade_engine.config import get_db_connection
import logging
logger = logging.getLogger(__name__)

def extract_symbol_trade_types(order_data: dict) -> Dict[str, list]:
    """
    order_data'dan sembol ve trade_type bilgilerini çıkarır.
    Aynı sembol için hem spot hem futures varsa ikisini de liste olarak ekler.
    
    Args:
        order_data (dict): Bot ID'leri ve emir parametrelerini içeren veri.
        
    Returns:
        dict: {
            "BTCUSDT": ["spot", "futures"],  # ✅ Hem spot hem futures var
            "ETHUSDT": ["spot"],             # ✅ Sadece spot var
            "ADAUSDT": ["futures"],          # ✅ Sadece futures var
            "BNBUSDT": ["spot", "futures"]   # ✅ Hem spot hem futures var
        }
    """
    symbol_trade_types = {}
    
    try:
        for bot_id, orders in order_data.items():
            for order in orders:
                # Gerekli alanları al
                coin_id = order.get("coin_id")
                trade_type = order.get("trade_type")
                
                if not coin_id or not trade_type:
                    logger.warning(f"Bot ID {bot_id} için coin_id veya trade_type eksik")
                    continue
                
                # trade_type'ı spot/futures formatına dönüştür
                if trade_type in ["spot", "test_spot"]:
                    normalized_trade_type = "spot"
                elif trade_type in ["futures", "test_futures"]:
                    normalized_trade_type = "futures"
                else:
                    logger.warning(f"Geçersiz trade_type: {trade_type}")
                    continue
                
                # ✅ YENİ: Symbol için liste oluştur veya genişlet
                if coin_id not in symbol_trade_types:
                    symbol_trade_types[coin_id] = []
                
                # ✅ YENİ: Aynı trade_type tekrarını engelle
                if normalized_trade_type not in symbol_trade_types[coin_id]:
                    symbol_trade_types[coin_id].append(normalized_trade_type)
                    logger.debug(f"➕ {coin_id} -> {normalized_trade_type} eklendi")
                else:
                    logger.debug(f"🔄 {coin_id} -> {normalized_trade_type} zaten mevcut")
        
        logger.info(f"📊 Extract edilen semboller: {dict(symbol_trade_types)}")
        
        # ✅ YENİ: Detaylı analiz log'u
        total_entries = sum(len(trade_types) for trade_types in symbol_trade_types.values())
        mixed_symbols = [symbol for symbol, trade_types in symbol_trade_types.items() if len(trade_types) > 1]
        spot_only = [symbol for symbol, trade_types in symbol_trade_types.items() if trade_types == ["spot"]]
        futures_only = [symbol for symbol, trade_types in symbol_trade_types.items() if trade_types == ["futures"]]
        
        logger.info(f"📊 Extract analizi:")
        logger.info(f"  📈 Toplam entry: {total_entries}")
        logger.info(f"  🔢 Unique semboller: {len(symbol_trade_types)}")
        logger.info(f"  🔵 Sadece spot: {len(spot_only)} -> {spot_only}")
        logger.info(f"  🟠 Sadece futures: {len(futures_only)} -> {futures_only}")
        logger.info(f"  🟣 Karışık (spot+futures): {len(mixed_symbols)} -> {mixed_symbols}")
        
        return symbol_trade_types
        
    except Exception as e:
        logger.error(f"❌ Sembol trade_type çıkarılırken hata: {str(e)}")
        return {}


async def get_symbols_filters_dict(symbols_and_types: Dict[str, list]) -> Dict[str, list]:
    """
    Belirtilen sembollerin filtrelerini dict olarak getirir.
    Aynı sembol için birden fazla trade_type varsa liste halinde döner.
    
    Args:
        symbols_and_types (dict): {
            "BTCUSDT": ["spot", "futures"],
            "ETHUSDT": ["spot"],
            "ADAUSDT": ["futures"]
        }
        
    Returns:
        dict: {
            "BTCUSDT": [
                {
                    "step_size": 0.001,
                    "min_qty": 0.001,
                    "tick_size": 0.01,
                    "trade_type": "spot"
                },
                {
                    "step_size": 0.001,
                    "min_qty": 0.001,
                    "tick_size": 0.1,
                    "trade_type": "futures"
                }
            ],
            "ETHUSDT": [
                {
                    "step_size": 0.0001,
                    "min_qty": 0.0001,
                    "tick_size": 0.01,
                    "trade_type": "spot"
                }
            ]
        }
    """
    try:
        if not symbols_and_types:
            logger.warning("⚠️ Sembol listesi boş")
            return {}
        
        # Input format conversion: Liste'den tuple'a dönüştür
        flattened_requests = []
        for symbol, trade_types in symbols_and_types.items():
            if isinstance(trade_types, list):
                for trade_type in trade_types:
                    flattened_requests.append((symbol, trade_type))
            else:
                # Backward compatibility - string format desteği
                flattened_requests.append((symbol, trade_types))
        
        if not flattened_requests:
            logger.warning("⚠️ Flatten edilmiş sembol listesi boş")
            return {}
            
        logger.info(f"🔄 Format conversion: {len(symbols_and_types)} symbols -> {len(flattened_requests)} requests")
        
        # Database connection - with statement kullan
        conn = get_db_connection()
        if not conn:
            logger.error("❌ Veritabanı bağlantısı alınamadı")
            return {}
        
        try:
            with conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    # Batch sorgu için parametreleri hazırla
                    conditions = []
                    params = []
                    
                    for symbol, trade_type in flattened_requests:
                        conditions.append("(binance_symbol = %s AND trade_type = %s)")
                        params.extend([symbol, trade_type])
                    
                    symbols_query = f"""
                    SELECT binance_symbol, step_size, min_qty, tick_size, trade_type
                    FROM symbol_filters
                    WHERE {' OR '.join(conditions)}
                    ORDER BY binance_symbol, trade_type
                    """
                    
                    cursor.execute(symbols_query, params)
                    symbols_result = cursor.fetchall()
        finally:
            conn.close()
        
        if not symbols_result:
            logger.warning("⚠️ Belirtilen semboller için filtreler bulunamadı")
            return {}
        
        # Dict formatına dönüştür - sembol bazında grupla
        symbols_dict = {}
        for row in symbols_result:
            symbol = row["binance_symbol"]
            
            # Sembol için liste oluştur
            if symbol not in symbols_dict:
                symbols_dict[symbol] = []
            
            # Filter bilgilerini ekle
            filter_data = {
                "step_size": float(row["step_size"]),
                "min_qty": float(row["min_qty"]),
                "tick_size": float(row["tick_size"]),
                "trade_type": row["trade_type"]
            }
            
            symbols_dict[symbol].append(filter_data)
        
        # Sonuç analizi
        total_filters = sum(len(filters) for filters in symbols_dict.values())
        mixed_symbols = [symbol for symbol, filters in symbols_dict.items() if len(filters) > 1]
        
        logger.info(f"✅ {len(symbols_dict)} sembol için {total_filters} filtre yüklendi")
        logger.info(f"🟣 Karışık trade_type'lı semboller: {len(mixed_symbols)} -> {mixed_symbols}")
        
        return symbols_dict
        
    except Exception as e:
        logger.error(f"❌ Sembol filtreleri alınırken hata: {str(e)}")
        return {}

async def get_single_symbol_filters(symbol: str, trade_type: str) -> Optional[Dict]:
    """
    Tek bir sembolün filtrelerini getirir - load_bot_holding pattern'i kullanılarak.
    
    Args:
        symbol (str): Binance sembolü (örn: 'BTCUSDT')
        trade_type (str): "spot" veya "futures"
        
    Returns:
        dict: {
            "step_size": 0.001,
            "min_qty": 0.001,
            "tick_size": 0.01,
            "trade_type": "spot"
        } veya None
    """
    try:
        if not symbol or not trade_type:
            logger.warning("⚠️ Sembol veya trade_type boş")
            return None
        
        # Direct DB connection - load_bot_holding pattern'i gibi
        conn = get_db_connection()
        if not conn:
            logger.error("❌ Veritabanı bağlantısı alınamadı")
            return None
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT binance_symbol, step_size, min_qty, tick_size, trade_type
            FROM symbol_filters
            WHERE binance_symbol = %s AND trade_type = %s
        """, (symbol, trade_type))
        
        symbol_result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not symbol_result:
            logger.warning(f"⚠️ {symbol} sembolü için {trade_type} filtresi bulunamadı")
            return None
        
        return {
            "step_size": float(symbol_result["step_size"]),
            "min_qty": float(symbol_result["min_qty"]),
            "tick_size": float(symbol_result["tick_size"]),
            "trade_type": symbol_result["trade_type"]
        }
        
    except Exception as e:
        logger.error(f"❌ {symbol} sembol filtresi alınırken hata: {str(e)}")
        return None


# Logger ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_extract_symbol_trade_types():
    """
    extract_symbol_trade_types fonksiyonunu test eder
    """
    print("\n🧪 TEST 1: extract_symbol_trade_types")
    print("=" * 50)
    
    # Test data - gerçekçi order_data formatı
    test_order_data = {
        "111": [  # Bot 111 - Spot emirleri
            {
                "coin_id": "BTCUSDT",
                "trade_type": "test_spot",
                "side": "BUY",
                "value": 100.0
            },
            {
                "coin_id": "ETHUSDT", 
                "trade_type": "test_spot",
                "side": "SELL",
                "value": 50.0
            },
            {
                "coin_id": "BNBUSDT",
                "trade_type": "test_spot", 
                "side": "BUY",
                "value": 25.0
            }
        ],
        "41": [  # Bot 41 - Futures emirleri
            {
                "coin_id": "BTCUSDT",
                "trade_type": "test_futures",
                "side": "BUY", 
                "value": 200.0
            },
            {
                "coin_id": "ETHUSDT",
                "trade_type": "test_futures",
                "side": "SELL",
                "value": 75.0
            },
            {
                "coin_id": "ADAUSDT",
                "trade_type": "test_futures",
                "side": "BUY",
                "value": 30.0
            }
        ],
        "99": [  # Bot 99 - Karışık emirler
            {
                "coin_id": "BTCUSDT",
                "trade_type": "spot",  # Farklı format
                "side": "BUY",
                "value": 150.0
            },
            {
                "coin_id": "DOGEUSDT",
                "trade_type": "futures",  # Yeni sembol
                "side": "SELL", 
                "value": 10.0
            }
        ]
    }
    
    # Test edge cases
    test_edge_cases = {
        "100": [
            {
                # coin_id eksik
                "trade_type": "spot",
                "side": "BUY"
            },
            {
                "coin_id": "INVALID",
                # trade_type eksik
                "side": "SELL"
            },
            {
                "coin_id": "BTCUSDT",
                "trade_type": "invalid_type",  # Geçersiz trade_type
                "side": "BUY"
            }
        ]
    }
    
    print("📊 Test Data:")
    print(f"  Bot 111: {len(test_order_data['111'])} spot emir")
    print(f"  Bot 41: {len(test_order_data['41'])} futures emir") 
    print(f"  Bot 99: {len(test_order_data['99'])} karışık emir")
    print(f"  Bot 100: {len(test_edge_cases['100'])} edge case emir")
    
    # Normal test
    print("\n🔄 Normal Test:")
    result = extract_symbol_trade_types(test_order_data)
    print(f"✅ Sonuç: {result}")
    
    # Beklenen sonuç kontrolü
    expected = {
        "BTCUSDT": ["spot", "futures"],  # Hem spot hem futures
        "ETHUSDT": ["spot", "futures"],  # Hem spot hem futures
        "BNBUSDT": ["spot"],             # Sadece spot
        "ADAUSDT": ["futures"],          # Sadece futures
        "DOGEUSDT": ["futures"]          # Sadece futures
    }
    
    print(f"🎯 Beklenen: {expected}")
    print(f"🔍 Eşleşme: {result == expected}")
    
    # Edge case test
    print("\n⚠️ Edge Case Test:")
    edge_result = extract_symbol_trade_types(test_edge_cases)
    print(f"✅ Edge Case Sonuç: {edge_result}")
    
    return result

async def test_get_symbols_filters_dict(symbol_trade_types):
    """
    get_symbols_filters_dict fonksiyonunu test eder
    """
    print("\n🧪 TEST 2: get_symbols_filters_dict")
    print("=" * 50)
    
    print("📊 Input Data:")
    for symbol, trade_types in symbol_trade_types.items():
        print(f"  {symbol}: {trade_types}")
    
    print("\n🔄 Database sorgusu başlatılıyor...")
    
    try:
        # Ana test
        filters_result = await get_symbols_filters_dict(symbol_trade_types)
        
        print(f"\n✅ Sonuç ({len(filters_result)} sembol):")
        for symbol, filters in filters_result.items():
            print(f"  {symbol}:")
            for i, filter_data in enumerate(filters):
                trade_type = filter_data.get('trade_type', 'unknown')
                step_size = filter_data.get('step_size', 0)
                min_qty = filter_data.get('min_qty', 0)
                tick_size = filter_data.get('tick_size', 0)
                print(f"    [{i+1}] {trade_type}: step={step_size}, min={min_qty}, tick={tick_size}")
        
        # Boş input test
        print("\n⚠️ Boş Input Test:")
        empty_result = await get_symbols_filters_dict({})
        print(f"✅ Boş input sonucu: {empty_result}")
        
        return filters_result
        
    except Exception as e:
        print(f"❌ Hata: {str(e)}")
        return {}

async def test_get_single_symbol_filters():
    """
    get_single_symbol_filters fonksiyonunu test eder
    """
    print("\n🧪 TEST 3: get_single_symbol_filters")
    print("=" * 50)
    
    test_cases = [
        ("BTCUSDT", "spot"),
        ("BTCUSDT", "futures"),
        ("ETHUSDT", "spot"),
        ("INVALID", "spot"),      # Geçersiz sembol
        ("BTCUSDT", "invalid"),   # Geçersiz trade_type
        ("", "spot"),             # Boş sembol
        ("BTCUSDT", "")           # Boş trade_type
    ]
    
    for symbol, trade_type in test_cases:
        print(f"\n🔍 Test: {symbol} - {trade_type}")
        try:
            result = await get_single_symbol_filters(symbol, trade_type)
            if result:
                print(f"✅ Sonuç: step={result['step_size']}, min={result['min_qty']}, tick={result['tick_size']}")
            else:
                print("❌ Filtre bulunamadı")
        except Exception as e:
            print(f"❌ Hata: {str(e)}")

async def main():
    """
    Ana test runner
    """
    print("🎯 dict_preparing.py Test Suite")
    print("=" * 60)
    
    try:
        # Test 1: Symbol extraction
        symbol_trade_types = test_extract_symbol_trade_types()
        
        # Test 2: Filters dict (database gerektiriyor)
        filters_dict = await test_get_symbols_filters_dict(symbol_trade_types)
        
        # Test 3: Single symbol filters
        await test_get_single_symbol_filters()
        
        print("\n🏁 Tüm testler tamamlandı!")
        
        # Özet
        print("\n📊 ÖZET:")
        print(f"  Extract edilen semboller: {len(symbol_trade_types)}")
        print(f"  Database'den alınan filtreler: {len(filters_dict)}")
        print(f"  Toplam trade_type kombinasyonu: {sum(len(types) for types in symbol_trade_types.values())}")
        
    except Exception as e:
        logger.error(f"❌ Test sırasında hata: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())