# Standart kütüphaneler
import asyncio, time, logging, traceback
from typing import Optional, Dict, List
import aiohttp, hmac, hashlib, base64
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

# Proje bağımlılıkları
from trade_engine.taha_part.utils.dict_preparing import (
    extract_symbol_trade_types,
    get_symbols_filters_dict
)
from trade_engine.taha_part.db.db_config import (
    get_api_credentials_by_bot_id,
    get_user_id_by_bot_id,
    save_trade_to_db
)
from trade_engine.taha_part.utils.order_final import (
    update_margin_type,
    update_leverage,
    step_qty_control,
    validate_and_format_prices
)
from trade_engine.taha_part.utils.price_cache_new import get_price

# Logger - production için ERROR seviyesi
logger = logging.getLogger(__name__)

# Sabitler
API_URLS = {
    "spot": "https://api.binance.com/api/v3/order",
    "futures": "https://fapi.binance.com/fapi/v1/order",
    "test_spot": "https://testnet.binance.vision/api/v3/order",
    "test_futures": "https://testnet.binancefuture.com/fapi/v1/order"
}

MARGIN_LEVERAGE_CONFIG = {
    41: {
        "BTCUSDT": {"margin_type": True, "leverage": 10},
        "ETHUSDT": {"margin_type": True, "leverage": 15},
        "ADAUSDT": {"margin_type": False, "leverage": 8},
        "XRPUSDT": {"margin_type": True, "leverage": 20}
    },
    111: {
        "BTCUSDT": {"margin_type": False, "leverage": 20},
        "ETHUSDT": {"margin_type": True, "leverage": 12}
    },
    17: {
        "BTCUSDT": {"margin_type": False, "leverage": 5}
    }
}

# ============ MAIN PRODUCTION FUNCTIONS ============

async def execute_orders(order_data: dict, silent_mode: bool = True) -> dict:
    """
    🚀 MAIN PRODUCTION FUNCTION - Emirleri hazırlar ve gönderir
    
    Args:
        order_data (dict): Bot ID bazında emirler
        silent_mode (bool): Sessiz mod
        
    Returns:
        dict: Sonuçlar ve istatistikler
    """
    try:
        if not silent_mode:
            logger.info(f"📋 {len(order_data)} bot için işlem başlıyor")
        
        # 1. Emirleri hazırla
        prepared_orders = await prepare_orders_production(order_data)
        
        if not _has_valid_orders(prepared_orders):
            logger.error("❌ Geçerli emir hazırlanamadı")
            return _create_error_response("No valid orders prepared")
        
        # 2. Emirleri gönder  
        results = await send_orders_production(prepared_orders)
        
        # 3. İstatistikleri hesapla
        stats = _calculate_order_stats(results)
        
        if not silent_mode:
            logger.info(f"✅ Tamamlandı: {stats['success_count']} başarılı, {stats['error_count']} hata")
        
        return _create_success_response(stats, results)
        
    except Exception as e:
        logger.error(f"❌ Execute orders hatası: {str(e)}")
        return _create_error_response(str(e))

async def prepare_orders_production(order_data: dict) -> dict:
    """
    Emirleri production ortamında hazırlar - hata kontrolü güçlendirilmiş
    
    Args:
        order_data (dict): Ham emir verisi
        
    Returns:
        dict: Hazırlanmış emirler
    """
    prepared_orders = {
        "spot": [],
        "test_spot": [],
        "futures": [],  
        "test_futures": []
    }
    
    try:
        # Symbol filtrelerini al
        symbol_trade_types = extract_symbol_trade_types(order_data)
        filters = await get_symbols_filters_dict(symbol_trade_types)
        
        # Her bot için emirleri işle
        for bot_id, orders in order_data.items():
            for order in orders:
                try:
                    prepared_order = await _prepare_single_order_safe(
                        bot_id=bot_id,
                        order=order,
                        filters=filters
                    )
                    
                    if prepared_order:
                        trade_type = prepared_order["trade_type"]
                        prepared_orders[trade_type].append(prepared_order)
                        
                except Exception as e:
                    logger.error(f"❌ Bot {bot_id} emir hazırlama hatası: {str(e)}")
                    continue
        
        return prepared_orders
        
    except Exception as e:
        logger.error(f"❌ Prepare orders hatası: {str(e)}")
        return prepared_orders

async def send_orders_production(prepared_orders: dict) -> dict:
    """
    Hazırlanan emirleri güvenli şekilde gönderir
    
    Args:
        prepared_orders (dict): Hazırlanmış emirler
        
    Returns:
        dict: API yanıtları
    """
    results = {
        "spot": [],
        "test_spot": [],
        "futures": [],
        "test_futures": []
    }
    
    try:
        for trade_type, orders in prepared_orders.items():
            if not orders:
                continue
                
            for order in orders:
                try:
                    result = await _send_single_order_safe(order, trade_type)
                    results[trade_type].append(result)
                    
                except Exception as e:
                    logger.error(f"❌ {trade_type} emir gönderme hatası: {str(e)}")
                    results[trade_type].append({"error": str(e)})
        
        return results
        
    except Exception as e:
        logger.error(f"❌ Send orders hatası: {str(e)}")
        return results

# ============ HELPER FUNCTIONS ============

async def _prepare_single_order_safe(bot_id: str, order: dict, filters: dict) -> Optional[dict]:
    """
    Tek bir emri güvenli şekilde hazırlar
    """
    try:
        # Gerekli alanları kontrol et
        required_fields = ["trade_type", "coin_id", "side", "order_type", "value"]
        for field in required_fields:
            if field not in order:
                logger.error(f"❌ Bot {bot_id}: Eksik alan - {field}")
                return None
        
        trade_type = order["trade_type"]
        coin_id = order["coin_id"]
        
        # API credentials al
        api_credentials = await get_api_credentials_by_bot_id(int(bot_id), trade_type)
        if not api_credentials:
            logger.error(f"❌ Bot {bot_id}: API bilgileri bulunamadı")
            return None
        
        # API anahtarları al
        api_key, private_key = _get_api_keys(api_credentials, trade_type)
        if not api_key or not private_key:
            logger.error(f"❌ Bot {bot_id}: API anahtarları geçersiz")
            return None
        
        api_id = api_credentials.get("id")
        normalized_trade_type = "spot" if trade_type in ["spot", "test_spot"] else "futures"
        
        # Futures margin/leverage setup
        if trade_type in ["futures", "test_futures"]:
            await _setup_futures_config(api_key, private_key, coin_id, trade_type, api_id)
        
        # Price al
        current_price = await get_price(coin_id, normalized_trade_type)
        if not current_price:
            logger.error(f"❌ Bot {bot_id}: {coin_id} fiyat alınamadı")
            return None
        
        # Quantity hesapla
        qty_result = await step_qty_control(
            filters=filters,
            coin_id=coin_id,
            trade_type=normalized_trade_type,
            value=float(order["value"]),
            current_price=current_price
        )
        
        if qty_result.get("status") == "error":
            logger.error(f"❌ Bot {bot_id}: Quantity kontrolü başarısız")
            return None
        
        # Price validation
        price_validation = await validate_and_format_prices(filters, coin_id, order)
        
        # Parametreleri oluştur
        params = _build_safe_params(order, qty_result["quantity"], price_validation)
        
        return {
            "api_key": api_key,
            "private_key": private_key,
            "trade_type": trade_type,
            "params": params,
            "bot_id": bot_id,
            "original_order": order
        }
        
    except Exception as e:
        logger.error(f"❌ Bot {bot_id} emir hazırlama hatası: {str(e)}")
        return None

async def _send_single_order_safe(order: dict, trade_type: str) -> dict:
    """
    Tek emri güvenli şekilde gönderir
    """
    try:
        # API parametrelerini hazırla
        api_params = _prepare_api_params(order)
        
        # API isteği gönder
        response = await _make_api_request(order, api_params)
        
        # Başarılıysa DB'ye kaydet
        if "error" not in response and order.get("bot_id"):
            await _save_trade_safely(order, response)
        
        return response
        
    except Exception as e:
        logger.error(f"❌ {trade_type} emir gönderme hatası: {str(e)}")
        return {"error": str(e)}

def _prepare_api_params(order: dict) -> dict:
    """
    API parametrelerini hazırlar
    """
    params = order.get("params", {}).copy()
    
    # Internal parametreleri kaldır
    internal_keys = ["bot_id", "original_order", "trade_type"]
    for key in internal_keys:
        params.pop(key, None)
    
    # Timestamp ekle
    params["timestamp"] = int(time.time() * 1000)
    
    # İmza oluştur
    payload = "&".join(f"{k}={v}" for k, v in params.items())
    signature = _create_signature(order["private_key"], payload, order["trade_type"])
    params["signature"] = signature
    
    return params

async def _make_api_request(order: dict, api_params: dict) -> dict:
    """
    API isteğini gerçekleştirir
    """
    try:
        api_url = API_URLS.get(order["trade_type"])
        if not api_url:
            return {"error": f"Geçersiz trade_type: {order['trade_type']}"}
        
        headers = {
            "X-MBX-APIKEY": order["api_key"],
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(api_url, headers=headers, data=api_params, timeout=30) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    return {"error": f"HTTP {response.status}: {error_text}"}
                    
    except asyncio.TimeoutError:
        return {"error": "API timeout"}
    except Exception as e:
        return {"error": f"API request error: {str(e)}"}

async def _save_trade_safely(order: dict, trade_result: dict) -> bool:
    """
    Trade'i güvenli şekilde DB'ye kaydeder
    """
    try:
        bot_id = int(order["bot_id"])
        user_id = await get_user_id_by_bot_id(bot_id)
        
        if not user_id:
            return False
        
        # DB parametrelerini hazırla
        db_params = _prepare_db_params(trade_result, order["original_order"])
        
        return await save_trade_to_db(
            bot_id=bot_id,
            user_id=user_id,
            trade_result=trade_result,
            order_params=db_params
        )
        
    except Exception as e:
        logger.error(f"❌ DB kayıt hatası: {str(e)}")
        return False

# ============ UTILITY FUNCTIONS ============

def _get_api_keys(api_credentials: dict, trade_type: str) -> tuple:
    """API anahtarlarını trade type'a göre döndürür"""
    if trade_type in ["futures", "test_futures"]:
        return (api_credentials.get("api_key"), api_credentials.get("api_secret"))
    elif trade_type in ["spot", "test_spot"]:
        return (api_credentials.get("ed_public"), api_credentials.get("ed_private_pem"))
    return None, None

async def _setup_futures_config(api_key: str, private_key: str, symbol: str, 
                               trade_type: str, api_id: int) -> None:
    """Futures margin/leverage ayarları"""
    try:
        config = MARGIN_LEVERAGE_CONFIG.get(api_id, {}).get(symbol, {})
        if not config:
            return
        
        margin_type = config.get("margin_type", True)
        leverage = config.get("leverage")
        
        # Margin type ayarla
        await update_margin_type(api_key, private_key, symbol, trade_type, margin_type)
        
        # Leverage ayarla
        if leverage:
            await update_leverage(api_key, private_key, symbol, trade_type, leverage)
            
    except Exception as e:
        logger.error(f"❌ Futures config hatası: {str(e)}")

def _create_signature(private_key: str, payload: str, trade_type: str) -> str:
    """İmza oluşturur"""
    try:
        if trade_type in ["futures", "test_futures"]:
            return hmac.new(private_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
        elif trade_type in ["spot", "test_spot"]:
            private_key_obj = serialization.load_pem_private_key(private_key.encode(), password=None)
            signature = base64.b64encode(private_key_obj.sign(payload.encode())).decode()
            return signature
        else:
            raise ValueError(f"Geçersiz trade_type: {trade_type}")
    except Exception as e:
        raise ValueError(f"İmza hatası: {str(e)}")

def _build_safe_params(order: dict, quantity: str, price_validation: dict) -> dict:
    """Emir parametrelerini güvenli şekilde oluşturur"""
    params = {
        "symbol": order["coin_id"],
        "side": order["side"].upper(),
        "type": order["order_type"].upper(),
        "quantity": quantity
    }
    
    # Price parametreleri
    if price_validation.get("price"):
        params["price"] = price_validation["price"]
    if price_validation.get("stopPrice"):
        params["stopPrice"] = price_validation["stopPrice"]
    if price_validation.get("activationPrice"):
        params["activationPrice"] = price_validation["activationPrice"]
    
    # Ek parametreler
    trade_type = order.get("trade_type", "spot")
    excluded_keys = {
        "coin_id", "side", "order_type", "value", "trade_type",
        "price", "stopPrice", "activationPrice", "leverage", "margin_type"
    }
    
    for key, value in order.items():
        if key not in excluded_keys:
            if key == "positionside" and trade_type in ["futures", "test_futures"]:
                params["positionSide"] = str(value).upper()
            elif key == "reduce_only" and trade_type in ["futures", "test_futures"]:
                params["reduceOnly"] = str(value).lower()
            elif key == "timeInForce":
                params["timeInForce"] = str(value).upper()
            else:
                params[key] = value
    
    return params

def _prepare_db_params(trade_result: dict, order_params: dict) -> dict:
    """DB parametrelerini hazırlar"""
    raw_trade_type = order_params.get("trade_type", "spot")
    normalized_trade_type = raw_trade_type.replace("test_", "")
    
    db_params = {
        "trade_type": normalized_trade_type,
        "symbol": trade_result.get('symbol'),
        "side": trade_result.get('side', '').lower(),
        "amount": float(trade_result.get('executedQty', 0) or trade_result.get('origQty', 0)),
        "price": float(trade_result.get('price', 0) or trade_result.get('avgPrice', 0)),
        "order_id": str(trade_result.get('orderId', '')),
        "status": trade_result.get('status', 'UNKNOWN'),
        "fee": 0.0,
        "amount_state": float(trade_result.get('executedQty', 0) or trade_result.get('origQty', 0)),
        "leverage": 1.0
    }
    
    # Fee hesaplama
    fills = trade_result.get('fills', [])
    if fills:
        db_params["fee"] = sum(float(fill.get('commission', 0)) for fill in fills)
    
    # Position side
    if normalized_trade_type == "spot":
        db_params["position_side"] = None
    else:
        position_side = order_params.get("positionside", "BOTH")
        db_params["position_side"] = str(position_side).upper() if position_side else "BOTH"
        db_params["leverage"] = float(order_params.get("leverage", 1))
    
    return db_params

def _has_valid_orders(prepared_orders: dict) -> bool:
    """Geçerli emir var mı kontrol eder"""
    return any(len(orders) > 0 for orders in prepared_orders.values())

def _calculate_order_stats(results: dict) -> dict:
    """Emir istatistiklerini hesaplar"""
    success_count = 0
    error_count = 0
    
    for responses in results.values():
        for response in responses:
            if "error" in response:
                error_count += 1
            else:
                success_count += 1
    
    return {"success_count": success_count, "error_count": error_count}

def _create_success_response(stats: dict, results: dict) -> dict:
    """Başarı yanıtı oluşturur"""
    return {
        "status": "success",
        "total_success": stats["success_count"],
        "total_error": stats["error_count"],
        "results": results
    }

def _create_error_response(message: str) -> dict:
    """Hata yanıtı oluşturur"""
    return {"status": "error", "message": message}

# ============ PRODUCTION USAGE ============

if __name__ == "__main__":
    import logging
    
    # Production logger setup
    logging.basicConfig(
        level=logging.ERROR,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    async def main():
        """Production kullanım örneği"""
        
        # Gerçek emir verisi
        order_data = {
            "111": [
                {
                    "trade_type": "test_spot",  # Test için "test_spot", Production için "spot"
                    "coin_id": "BTCUSDT",
                    "side": "buy",
                    "order_type": "MARKET",
                    "value": 220.0
                }
            ]
        }
        
        print("🚀 Production Trading Engine başlatılıyor...")
        
        # Cache başlat
        from trade_engine.taha_part.utils.price_cache_new import start_connection_pool, wait_for_cache_ready
        
        await start_connection_pool()
        cache_ready = await wait_for_cache_ready(timeout_seconds=15)
        
        if not cache_ready:
            print("❌ Price cache hazır değil!")
            return
        
        print("✅ Price cache hazır")
        
        # Emirleri işle - sessiz mod
        result = await execute_orders(order_data, silent_mode=True)
        
        # Sonucu göster
        if result["status"] == "success":
            print(f"✅ Başarılı: {result['total_success']} emir")
            print(f"❌ Hatalı: {result['total_error']} emir")
            
            # Detaylar
            for trade_type, responses in result["results"].items():
                if responses:
                    print(f"📊 {trade_type}: {len(responses)} yanıt")
        else:
            print(f"❌ İşlem hatası: {result['message']}")
    
    asyncio.run(main())