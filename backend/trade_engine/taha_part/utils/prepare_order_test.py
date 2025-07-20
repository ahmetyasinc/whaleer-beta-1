# Standard library imports
import asyncio
import logging
import traceback
import time
import json
from collections import defaultdict

# Project imports - config.py uyumlu import'lar
from trade_engine.config import DB_CONFIG, get_db_connection
from trade_engine.taha_part.db.db_config import get_api_credentials_by_bot_id
from trade_engine.taha_part.utils.dict_preparing import get_symbols_filters_dict, extract_symbol_trade_types
from trade_engine.taha_part.utils.price_cache_new import (
    start_connection_pool, 
    stop_connection_pool,
    get_price,
    get_connection_status,
    wait_for_cache_ready,
    is_cache_ready,
    get_cached_symbol_count
)
# Margin/Leverage Cache imports - get_margin_leverage_cache kullanımı
from trade_engine.taha_part.utils.margin_leverage_controls import (
    initialize_margin_leverage_cache,
    get_margin_leverage_cache,
    get_symbol_margin_leverage_info,
    clear_cache,
    reload_margin_leverage_cache
)
# Local imports - modüler yapı
from trade_engine.taha_part.utils.order_final import prepare_order_data, send_order, MARGIN_LEVERAGE_CONFIG


# Logger konfigürasyonu
logger = logging.getLogger(__name__)

if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('order_test.log', encoding='utf-8')
        ]
    )

def debug_margin_leverage_config():
    """
    MARGIN_LEVERAGE_CONFIG'i debug eder ve boolean kontrollerini test eder
    """
    logger.info("🔍 MARGIN_LEVERAGE_CONFIG debug başlatılıyor...")
    
    if not MARGIN_LEVERAGE_CONFIG:
        logger.error("❌ MARGIN_LEVERAGE_CONFIG boş!")
        return False
    
    # Config özeti
    total_api_ids = len(MARGIN_LEVERAGE_CONFIG)
    total_symbols = sum(len(symbols) for symbols in MARGIN_LEVERAGE_CONFIG.values())
    
    logger.info(f"📊 Config özeti:")
    logger.info(f"   Total API IDs: {total_api_ids}")
    logger.info(f"   Total symbols: {total_symbols}")
    
    # Her API ID için detaylı kontrol
    for api_id, symbols_config in MARGIN_LEVERAGE_CONFIG.items():
        logger.info(f"\n📋 API ID {api_id} konfigürasyonu:")
        logger.info(f"   Toplam sembol: {len(symbols_config)}")
        
        for symbol, config in symbols_config.items():
            margin_type_bool = config.get('margin_type', True)
            leverage = config.get('leverage', 1)
            
            # Boolean kontrolü
            if not isinstance(margin_type_bool, bool):
                logger.warning(f"   ⚠️ {symbol}: margin_type boolean değil! Tip: {type(margin_type_bool)}, Değer: {margin_type_bool}")
                continue
            
            # String dönüşümü
            margin_type_str = "ISOLATED" if margin_type_bool else "CROSSED"
            
            logger.info(f"   ✅ {symbol}: margin_type={margin_type_bool} ({margin_type_str}), leverage={leverage}")
            
            # Leverage kontrolü
            if not isinstance(leverage, int) or leverage < 1:
                logger.warning(f"   ⚠️ {symbol}: Geçersiz leverage: {leverage}")
    
    # Test API ID'leri için özel kontrol
    test_api_ids = [41, 111, 17]  # order_final.py'deki test API ID'leri
    
    logger.info("\n🔍 Test API ID'leri kontrolü:")
    for api_id in test_api_ids:
        if api_id in MARGIN_LEVERAGE_CONFIG:
            config = MARGIN_LEVERAGE_CONFIG[api_id]
            logger.info(f"   API ID {api_id}: {len(config)} sembol")
            
            # Boolean dönüşüm testleri
            for symbol, symbol_config in config.items():
                margin_type_bool = symbol_config.get('margin_type', True)
                leverage = symbol_config.get('leverage', 1)
                
                # Boolean kontrolü ve dönüşüm
                if isinstance(margin_type_bool, bool):
                    margin_type_str = "ISOLATED" if margin_type_bool else "CROSSED"
                    logger.info(f"     {symbol}: {margin_type_bool} -> {margin_type_str}, leverage={leverage}")
                else:
                    logger.warning(f"     {symbol}: HATA - margin_type boolean değil!")
        else:
            logger.warning(f"   ⚠️ API ID {api_id} config'de bulunamadı!")
    
    logger.info("✅ MARGIN_LEVERAGE_CONFIG debug tamamlandı")
    return True

async def debug_margin_leverage_cache():
    """
    Margin/Leverage cache sağlığını kontrol eder ve test eder
    Ana cache dict'ini kullanarak optimize edilmiş kontrol
    """
    logger.info("🔍 Margin/Leverage cache sağlık kontrolü başlatılıyor...")
    
    try:
        # Cache'i başlat
        logger.info("🔄 Margin/Leverage cache başlatılıyor...")
        init_success = await initialize_margin_leverage_cache()
        
        if not init_success:
            logger.error("❌ Margin/Leverage cache başlatılamadı!")
            return False
        
        # Ana cache dict'ini al - optimize edilmiş approach
        margin_leverage_dict = get_margin_leverage_cache()
        
        if not margin_leverage_dict:
            logger.warning("⚠️ Cache boş!")
            return False
        
        # Cache özeti - optimized summary
        total_api_ids = len(margin_leverage_dict)
        total_symbols = sum(len(symbols) for symbols in margin_leverage_dict.values())
        
        logger.info(f"📊 Cache özeti:")
        logger.info(f"   Total API IDs: {total_api_ids}")
        logger.info(f"   Total symbols: {total_symbols}")
        
        if total_api_ids == 0:
            logger.warning("⚠️ Cache'de hiç API ID yok!")
            return False
        
        # API ID'leri listele
        logger.info("📋 API ID'leri ve sembol sayıları:")
        for api_id, symbols_data in margin_leverage_dict.items():
            symbol_count = len(symbols_data)
            logger.info(f"   API ID {api_id}: {symbol_count} sembol")
        
        # Test API ID'leri (111 ve 41 - test bot'ları)
        test_api_ids = [111, 41]
        for api_id in test_api_ids:
            logger.info(f"🔍 API ID {api_id} test ediliyor...")
            
            # Test sembolleri - cache'den direkt kontrol
            test_symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
            for symbol in test_symbols:
                if api_id in margin_leverage_dict and symbol in margin_leverage_dict[api_id]:
                    symbol_info = margin_leverage_dict[api_id][symbol]
                    leverage = symbol_info.get('leverage', 'N/A')
                    margin_boolean = symbol_info.get('margin_boolean', 'N/A')
                    margin_type = "ISOLATED" if margin_boolean else "CROSSED"
                    
                    logger.info(f"   ✅ {symbol}: leverage={leverage}, margin_type={margin_type}")
                else:
                    logger.info(f"   ❌ {symbol}: cache'de bulunamadı")
        
        # En çok kullanılan sembolleri göster - optimize edilmiş
        symbol_usage_count = defaultdict(int)
        for api_id, symbols_data in margin_leverage_dict.items():
            for symbol in symbols_data.keys():
                symbol_usage_count[symbol] += 1
        
        if symbol_usage_count:
            logger.info("🔥 En çok kullanılan semboller:")
            sorted_symbols = sorted(symbol_usage_count.items(), key=lambda x: x[1], reverse=True)
            for symbol, count in sorted_symbols[:5]:
                logger.info(f"   {symbol}: {count} API ID'de kullanılıyor")
        
        logger.info("✅ Margin/Leverage cache sağlık kontrolü tamamlandı")
        return True
        
    except Exception as e:
        logger.error(f"❌ Margin/Leverage cache test hatası: {str(e)}")
        return False

async def debug_price_cache_health():
    """
    Price cache sağlığını kontrol eder - price_cache_new.py'ye uygun
    """
    logger.info("🔍 Price cache sağlık kontrolü başlatılıyor...")
    
    max_wait_seconds = 15
    for attempt in range(max_wait_seconds):
        await asyncio.sleep(1)
        
        # Bağlantı durumunu kontrol et
        connection_status = get_connection_status()
        spot_connected = connection_status.get("spot", {}).get("connected", False)
        futures_connected = connection_status.get("futures", {}).get("connected", False)
        spot_healthy = connection_status.get("spot", {}).get("is_healthy", False)
        futures_healthy = connection_status.get("futures", {}).get("is_healthy", False)
        
        # Test fiyatları al
        btc_spot_price = await get_price("BTCUSDT", "spot")
        btc_futures_price = await get_price("BTCUSDT", "futures")
        eth_spot_price = await get_price("ETHUSDT", "spot") 
        eth_futures_price = await get_price("ETHUSDT", "futures")
        
        # Cache sembol sayıları
        symbol_counts = get_cached_symbol_count()
        
        logger.info(f"[{attempt+1:2d}s] Bağlantı - Spot: {spot_connected} (sağlıklı: {spot_healthy}), Futures: {futures_connected} (sağlıklı: {futures_healthy})")
        logger.info(f"     Fiyatlar - BTC Spot: ${btc_spot_price}, Futures: ${btc_futures_price}")
        logger.info(f"              ETH Spot: ${eth_spot_price}, Futures: ${eth_futures_price}")
        logger.info(f"     Cache - Spot: {symbol_counts['spot']} sembol, Futures: {symbol_counts['futures']} sembol")
        
        # Başarı koşulları
        has_spot_prices = btc_spot_price is not None and eth_spot_price is not None
        has_futures_prices = btc_futures_price is not None and eth_futures_price is not None
        cache_ready = is_cache_ready()
        
        if spot_connected and futures_connected and spot_healthy and futures_healthy and cache_ready:
            logger.info("✅ Price cache tamamen hazır!")
            return True
        elif futures_connected and futures_healthy and has_futures_prices:
            logger.info("⚠️ Sadece futures fiyatları hazır, spot fiyatları eksik")
            
        if attempt == max_wait_seconds - 1:
            logger.warning(f"❌ {max_wait_seconds} saniyede cache tam olarak hazırlanamadı")
            return False
    
    return False

def validate_order_structure(order_data):
    """
    Order verilerinin yapısal doğruluğunu kontrol eder
    Boolean margin_type kontrolü eklenmiş
    """
    validation_errors = []
    required_fields = ['trade_type', 'coin_id', 'side', 'order_type', 'value']
    
    for bot_id, orders in order_data.items():
        if not isinstance(orders, list):
            validation_errors.append(f"Bot {bot_id}: orders list değil")
            continue
            
        for i, order in enumerate(orders):
            if not isinstance(order, dict):
                validation_errors.append(f"Bot {bot_id}, Emir {i+1}: dict değil")
                continue
                
            # Gerekli alanları kontrol et
            missing_fields = [field for field in required_fields if field not in order]
            if missing_fields:
                validation_errors.append(
                    f"Bot {bot_id}, Emir {i+1}: Eksik alanlar {missing_fields}"
                )
            
            # Trade type kontrolü
            trade_type = order.get('trade_type')
            valid_trade_types = ['spot', 'futures', 'test_spot', 'test_futures']
            if trade_type and trade_type not in valid_trade_types:
                validation_errors.append(
                    f"Bot {bot_id}, Emir {i+1}: Geçersiz trade_type '{trade_type}'"
                )
            
            # Futures için positionSide kontrolü
            if trade_type in ['futures', 'test_futures']:
                if 'positionside' not in order and 'positionSide' not in order:
                    validation_errors.append(
                        f"Bot {bot_id}, Emir {i+1}: Futures emirleri için positionside gerekli"
                    )
                
                # Margin type kontrolü - artık boolean de olabilir
                margin_type = order.get('margin_type')
                if margin_type is not None:
                    if isinstance(margin_type, bool):
                        # Boolean değer - geçerli
                        margin_type_str = "ISOLATED" if margin_type else "CROSSED"
                        logger.debug(f"Bot {bot_id}, Emir {i+1}: Boolean margin_type={margin_type} ({margin_type_str})")
                    elif isinstance(margin_type, str):
                        # String değer - geçerli seçenekleri kontrol et
                        if margin_type not in ["ISOLATED", "CROSSED"]:
                            validation_errors.append(
                                f"Bot {bot_id}, Emir {i+1}: Geçersiz margin_type '{margin_type}' (ISOLATED/CROSSED veya True/False olmalı)"
                            )
                    else:
                        validation_errors.append(
                            f"Bot {bot_id}, Emir {i+1}: margin_type boolean veya string olmalı, {type(margin_type)} geldi"
                        )
            
            # Leverage kontrolü
            leverage = order.get('leverage')
            if leverage is not None:
                if not isinstance(leverage, int) or leverage < 1 or leverage > 125:
                    validation_errors.append(
                        f"Bot {bot_id}, Emir {i+1}: Geçersiz leverage '{leverage}' (1-125 arası integer)"
                    )
    
    is_valid = len(validation_errors) == 0
    return is_valid, validation_errors

def format_response_output(response_data, response_type="SUCCESS"):
    """
    Response verilerini formatlar
    """
    if not response_data:
        return "❌ Boş response verisi"
    
    output_lines = []
    
    if response_type == "SUCCESS":
        output_lines.append("✅ BAŞARILI RESPONSE:")
        key_fields = ['symbol', 'orderId', 'price', 'origQty', 'executedQty', 'status', 'side', 'type']
    else:
        output_lines.append("❌ HATA RESPONSE:")
        key_fields = ['error', 'code', 'msg']
    
    for field in key_fields:
        if field in response_data:
            output_lines.append(f"    {field}: {response_data[field]}")
    
    return "\n".join(output_lines)

async def test_comprehensive_orders():
    """
    Comprehensive test scenario - boolean margin_type kontrolü ile
    """
    try:
        logger.info("🚀 Comprehensive Order Test başlatılıyor...")
        
        # Price cache'i başlat
        await start_connection_pool()
        
        # Margin/Leverage cache'i başlat
        logger.info("🔄 Margin/Leverage cache başlatılıyor...")
        margin_cache_ready = await debug_margin_leverage_cache()
        
        if not margin_cache_ready:
            logger.warning("⚠️ Margin/Leverage cache hazır değil, test devam ediyor...")
        
        # Static config debug
        logger.info("🔍 Static MARGIN_LEVERAGE_CONFIG debug...")
        debug_margin_leverage_config()
        
        # Price cache kontrolü
        cache_ready = await wait_for_cache_ready(timeout_seconds=15)
        
        # Test verilerini hazırla - boolean margin_type ile
        if cache_ready:
            # Hem spot hem futures test et
            test_order_data = {
                "111": [
                    {
                        "trade_type": "test_spot",
                        "coin_id": "BTCUSDT",
                        "side": "buy",
                        "order_type": "MARKET",
                        "value": 100.0
                    },
                    {
                        "trade_type": "test_futures",
                        "coin_id": "BTCUSDT",
                        "side": "buy",
                        "order_type": "MARKET",
                        "value": 500.0,
                        "positionside": "BOTH",
                        "leverage": 15,
                        "margin_type": True  # Boolean - ISOLATED
                    },
                    {
                        "trade_type": "test_futures",
                        "coin_id": "ETHUSDT",
                        "side": "sell",
                        "order_type": "LIMIT",
                        "value": 300.0,
                        "price": 2985.123,
                        "positionside": "BOTH",
                        "timeInForce": "IOC",
                        "leverage": 20,
                        "margin_type": False  # Boolean - CROSSED
                    }
                ],
                "41": [
                    {
                        "trade_type": "test_futures",
                        "coin_id": "BTCUSDT",  # Config'de True (ISOLATED)
                        "side": "buy",
                        "order_type": "MARKET",
                        "value": 200.0,
                        "positionside": "BOTH",
                        "leverage": 10,
                        "margin_type": True  # Boolean - ISOLATED
                    },
                    {
                        "trade_type": "test_futures",
                        "coin_id": "ADAUSDT",  # Config'de False (CROSSED)
                        "side": "sell",
                        "order_type": "LIMIT",
                        "value": 150.0,
                        "price": 0.5,
                        "positionside": "BOTH",
                        "timeInForce": "GTC",
                        "leverage": 25,
                        "margin_type": False  # Boolean - CROSSED
                    }
                ]
            }
        else:
            # Sadece futures test et
            logger.info("⚠️ Spot fiyatları alınamadığı için sadece futures testi yapılacak")
            test_order_data = {
                "111": [
                    {
                        "trade_type": "test_futures",
                        "coin_id": "BTCUSDT",
                        "side": "buy",
                        "order_type": "MARKET",
                        "value": 100.0,
                        "positionside": "BOTH",
                        "leverage": 15,
                        "margin_type": True  # Boolean - ISOLATED
                    },
                    {
                        "trade_type": "test_futures", 
                        "coin_id": "ETHUSDT",
                        "side": "sell",
                        "order_type": "LIMIT",
                        "value": 200.0,
                        "price": 2987.456,
                        "timeInForce": "GTC",
                        "positionside": "BOTH",
                        "leverage": 20,
                        "margin_type": False  # Boolean - CROSSED
                    }
                ],
                "41": [
                    {
                        "trade_type": "test_futures",
                        "coin_id": "BTCUSDT",  # Config'de True (ISOLATED)
                        "side": "buy",
                        "order_type": "MARKET",
                        "value": 150.0,
                        "positionside": "BOTH",
                        "leverage": 10
                        # margin_type yok - config'den alınacak
                    },
                    {
                        "trade_type": "test_futures",
                        "coin_id": "ADAUSDT",  # Config'de False (CROSSED)
                        "side": "sell",
                        "order_type": "LIMIT",
                        "value": 100.0,
                        "price": 0.5,
                        "positionside": "BOTH",
                        "timeInForce": "FOK",
                        "leverage": 25,
                        "margin_type": True  # Boolean - ISOLATED (config'i override edecek)
                    }
                ]
            }
        
        # Boolean margin_type kontrolü
        logger.info("🔍 Boolean margin_type test:")
        for bot_id, orders in test_order_data.items():
            for order in orders:
                trade_type = order.get('trade_type')
                coin_id = order.get('coin_id')
                order_margin_type = order.get('margin_type')
                
                if trade_type in ['futures', 'test_futures'] and order_margin_type is not None:
                    # Boolean kontrolü
                    if isinstance(order_margin_type, bool):
                        margin_type_str = "ISOLATED" if order_margin_type else "CROSSED"
                        logger.info(f"  {bot_id} - {coin_id}: Boolean margin_type={order_margin_type} ({margin_type_str})")
                    else:
                        logger.warning(f"  {bot_id} - {coin_id}: margin_type boolean değil! Tip: {type(order_margin_type)}")
        
        # Data validasyonu
        logger.info("\n🔍 Order data doğrulaması yapılıyor...")
        is_valid, validation_errors = validate_order_structure(test_order_data)
        
        if not is_valid:
            logger.error("❌ Order data doğrulaması başarısız:")
            for error in validation_errors:
                logger.error(f"  {error}")
            return None
        
        # Test data özeti
        total_orders_expected = sum(len(orders) for orders in test_order_data.values())
        futures_orders_count = sum(1 for orders in test_order_data.values() 
                                 for order in orders 
                                 if order.get('trade_type') in ['futures', 'test_futures'])
        
        logger.info(f"📊 Test Data Özeti:")
        for bot_id, orders in test_order_data.items():
            logger.info(f"  Bot {bot_id}: {len(orders)} emir")
            
            # Sembol ve margin_type dağılımını göster
            for order in orders:
                symbol = order.get('coin_id', 'unknown')
                trade_type = order.get('trade_type', 'unknown')
                margin_type = order.get('margin_type')
                
                if trade_type in ['futures', 'test_futures']:
                    if margin_type is not None:
                        if isinstance(margin_type, bool):
                            margin_type_str = "ISOLATED" if margin_type else "CROSSED"
                            logger.info(f"    {symbol} ({trade_type}): margin_type={margin_type} ({margin_type_str})")
                        else:
                            logger.info(f"    {symbol} ({trade_type}): margin_type={margin_type}")
                    else:
                        logger.info(f"    {symbol} ({trade_type}): margin_type=Config'den alınacak")
                else:
                    logger.info(f"    {symbol} ({trade_type}): Spot emir")
        
        logger.info(f"  📋 Toplam beklenen: {total_orders_expected} emir")
        logger.info(f"  🔧 Futures emirler: {futures_orders_count} emir (margin/leverage kontrolü)")
        logger.info("✅ Order data doğrulaması başarılı")
        
        # Order preparation
        logger.info("📋 Test emirleri hazırlanıyor (boolean margin_type kontrolü ile)...")
        prepared_orders = await prepare_order_data(test_order_data)
        
        if not prepared_orders:
            logger.error("❌ Order preparation başarısız!")
            return None
        
        # Preparation sonuçları
        logger.info("✅ Order Preparation Results:")
        for trade_type, orders in prepared_orders.items():
            if orders:
                logger.info(f"  {trade_type}: {len(orders)} emir hazırlandı")
        
        # Order sending
        logger.info("📤 Emirler API'ye gönderiliyor...")
        send_results = await send_order(prepared_orders)
        
        # Detaylı sonuç analizi
        logger.info("📊 DETAYLI ORDER SEND RESULTS:")
        logger.info("=" * 80)
        
        for trade_type, results in send_results.items():
            if results:
                logger.info(f"\n🔍 {trade_type.upper()} SONUÇLARI ({len(results)} emir):")
                
                for i, result in enumerate(results):
                    logger.info(f"\n📋 Emir #{i+1}:")
                    
                    if "error" in result:
                        error_output = format_response_output(result, "ERROR")
                        logger.error(error_output)
                    else:
                        success_output = format_response_output(result, "SUCCESS")
                        logger.info(success_output)
        
        # Test özeti
        total_prepared = sum(len(orders) for orders in prepared_orders.values())
        total_sent = sum(len(results) for results in send_results.values())
        success_count = sum(1 for results in send_results.values() 
                          for result in results if "error" not in result)
        error_count = total_sent - success_count
        
        logger.info("\n" + "=" * 80)
        logger.info("📈 KAPSAMLI TEST ÖZET (Boolean Margin Type Kontrolü):")
        logger.info("=" * 80)
        logger.info(f"  📊 Beklenen emir sayısı: {total_orders_expected}")
        logger.info(f"  📋 Hazırlanan emir sayısı: {total_prepared}")
        logger.info(f"  📤 Gönderilen emir sayısı: {total_sent}")
        logger.info(f"  ✅ Başarılı emirler: {success_count}")
        logger.info(f"  ❌ Hatalı emirler: {error_count}")
        logger.info(f"  🔧 Futures emirler (margin/leverage): {futures_orders_count}")
        success_rate = (success_count/total_sent*100) if total_sent > 0 else 0
        logger.info(f"  📈 Başarı oranı: {success_rate:.1f}%")
        logger.info(f"  🎯 Boolean margin_type kontrolü: ✅ Aktif")
        
        return {
            "prepared_orders": prepared_orders,
            "send_results": send_results,
            "summary": {
                "expected_orders": total_orders_expected,
                "prepared_orders": total_prepared,
                "sent_orders": total_sent,
                "success_count": success_count,
                "error_count": error_count,
                "success_rate": success_rate,
                "futures_orders": futures_orders_count,
                "margin_cache_ready": margin_cache_ready
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Test sırasında hata: {str(e)}")
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return None
    finally:
        logger.info("🏁 Test tamamlandı")

async def test_edge_cases():
    """
    Edge case testing - boolean margin_type kontrolü ile
    """
    try:
        logger.info("🧪 Edge Case Test başlatılıyor...")
        
        edge_cases = {
            "999": [  # Geçersiz bot ID
                {
                    "trade_type": "test_futures",
                    "coin_id": "BTCUSDT",
                    "side": "buy",
                    "order_type": "MARKET",
                    "value": 10.0,
                    "positionside": "BOTH",
                    "leverage": 10,
                    "margin_type": True  # Boolean - ISOLATED
                }
            ],
            "111": [
                {
                    # trade_type eksik
                    "coin_id": "BTCUSDT", 
                    "side": "buy",
                    "order_type": "MARKET",
                    "value": 10.0,
                    "margin_type": True
                },
                {
                    "trade_type": "test_futures",
                    "coin_id": "BTCUSDT",
                    "side": "buy",
                    "order_type": "MARKET",
                    "value": 10.0,
                    "positionside": "BOTH",
                    "leverage": 150,  # Geçersiz leverage
                    "margin_type": True
                },
                {
                    "trade_type": "test_futures",
                    "coin_id": "BTCUSDT",
                    "side": "buy",
                    "order_type": "MARKET",
                    "value": 10.0,
                    "positionside": "BOTH",
                    "leverage": 0,  # Geçersiz leverage
                    "margin_type": False
                },
                {
                    "trade_type": "test_futures",
                    "coin_id": "BTCUSDT",
                    "side": "buy",
                    "order_type": "MARKET",
                    "value": 10.0,
                    "positionside": "BOTH",
                    "margin_type": "INVALID_MARGIN"  # Geçersiz margin type string
                },
                {
                    "trade_type": "test_futures",
                    "coin_id": "BTCUSDT",
                    "side": "buy",
                    "order_type": "MARKET",
                    "value": 10.0,
                    "positionside": "BOTH",
                    "margin_type": 123  # Geçersiz margin type - integer
                },
                {
                    "trade_type": "test_futures",
                    "coin_id": "INVALIDCOIN",  # Geçersiz coin
                    "side": "buy",
                    "order_type": "MARKET", 
                    "value": 10.0,
                    "positionside": "BOTH",
                    "leverage": 10,
                    "margin_type": True
                }
            ]
        }
        
        logger.info("🔍 Edge case emirleri test ediliyor...")
        
        # Edge case için validation
        is_valid, validation_errors = validate_order_structure(edge_cases)
        
        if validation_errors:
            logger.info("⚠️ Beklenen validation hataları:")
            for error in validation_errors:
                logger.info(f"  {error}")
        
        # Prepare orders
        prepared_orders = await prepare_order_data(edge_cases)
        
        if prepared_orders is None:
            logger.error("❌ Edge case preparation tamamen başarısız")
            prepared_orders = {}
        
        logger.info("🔍 Edge Case Preparation Results:")
        total_edge_prepared = sum(len(orders) for orders in prepared_orders.values() if orders)
        
        for trade_type, orders in prepared_orders.items():
            order_count = len(orders) if orders else 0
            logger.info(f"  {trade_type}: {order_count} emir (beklenen: düşük sayı)")
        
        # Send orders if any prepared
        if prepared_orders and any(orders for orders in prepared_orders.values()):
            logger.info("📤 Edge case emirleri gönderiliyor...")
            edge_send_results = await send_order(prepared_orders)
            
            total_edge_sent = sum(len(results) for results in edge_send_results.values() if results)
            total_edge_success = sum(1 for results in edge_send_results.values() 
                                   for result in results if "error" not in result)
            
            logger.info(f"\n📈 Edge Case Özet:")
            logger.info(f"  📤 Gönderilen: {total_edge_sent}")
            logger.info(f"  ✅ Başarılı: {total_edge_success}")
            logger.info(f"  ❌ Hatalı: {total_edge_sent - total_edge_success}")
            logger.info(f"  🔧 Boolean margin_type validation: ✅ Aktif")
        else:
            logger.info("📤 Edge case emirleri gönderilemedi - hazırlanan emir yok")
        
        return {
            "prepared_orders": prepared_orders,
            "total_prepared": total_edge_prepared
        }
        
    except Exception as e:
        logger.error(f"❌ Edge case test hatası: {str(e)}")
        return {
            "prepared_orders": {},
            "total_prepared": 0
        }

async def main():
    """
    Ana test runner - boolean margin_type kontrolü ile
    """
    print("🎯 Order System Test Suite (Boolean Margin Type Kontrolü)")
    print("=" * 60)
    
    # Static config debug
    print("\n🔍 Static MARGIN_LEVERAGE_CONFIG debug...")
    debug_margin_leverage_config()
    
    # Margin/Leverage cache'i başlat
    print("\n🔄 Margin/Leverage cache başlatılıyor...")
    margin_cache_ready = await debug_margin_leverage_cache()
    
    if margin_cache_ready:
        print("✅ Margin/Leverage cache hazır")
    else:
        print("⚠️ Margin/Leverage cache hazır değil, test devam ediyor...")
    
    # Price cache'i başlat
    print("\n🔄 Price cache başlatılıyor...")
    await start_connection_pool()
    
    # Cache'in hazır olmasını bekle
    cache_ready = await wait_for_cache_ready(timeout_seconds=10)
    
    if not cache_ready:
        print("⚠️ Price cache tam hazır değil, test devam ediyor...")
    else:
        print("✅ Price cache hazır")
    
    try:
        # Test 1: Comprehensive order test
        print("\n📋 Test 1: Comprehensive Order Processing (Boolean Margin Type)")
        comprehensive_result = await test_comprehensive_orders()
        
        if comprehensive_result:
            print(f"✅ Comprehensive test tamamlandı")
            print(f"   Beklenen: {comprehensive_result['summary']['expected_orders']} emir")
            print(f"   Hazırlanan: {comprehensive_result['summary']['prepared_orders']} emir") 
            print(f"   Başarılı: {comprehensive_result['summary']['success_count']}")
            print(f"   Hatalı: {comprehensive_result['summary']['error_count']}")
            print(f"   Futures emirler: {comprehensive_result['summary']['futures_orders']}")
            print(f"   Boolean margin_type kontrolü: ✅ Aktif")
        else:
            print("❌ Comprehensive test başarısız")
        
        print("\n" + "=" * 50)
        
        # Test 2: Edge case test
        print("\n🧪 Test 2: Edge Case Handling (Boolean Margin Type)")
        edge_result = await test_edge_cases()
        
        if edge_result:
            total_edge_orders = edge_result.get('total_prepared', 0)
            print(f"✅ Edge case test tamamlandı")
            print(f"   İşlenen emirler: {total_edge_orders} (düşük sayı beklenir)")
            print(f"   Boolean validation: ✅ Aktif")
        else:
            print("❌ Edge case test başarısız")
        
        print("\n🏁 Tüm testler tamamlandı!")
        
    finally:
        # Cache'leri temizle
        print("\n🧹 Cache temizleniyor...")
        await stop_connection_pool()

if __name__ == "__main__":
    # Test runner
    asyncio.run(main())