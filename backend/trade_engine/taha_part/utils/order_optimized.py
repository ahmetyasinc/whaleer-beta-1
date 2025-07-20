import asyncio
import time
import logging
from typing import Dict, List, Optional, Union, Any
import aiohttp
import hmac
import hashlib
import base64
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

# Proje içi import'lar
from trade_engine.taha_part.utils.dict_preparing import (
    extract_symbol_trade_types,
    get_symbols_filters_dict
)
from trade_engine.taha_part.db.db_config import get_api_credentials_by_bot_id
from trade_engine.taha_part.utils.price_cache_new import get_price

# Sabitler
API_URLS = {
    "spot": "https://api.binance.com/api/v3/order",
    "futures": "https://fapi.binance.com/fapi/v1/order",
    "test_spot": "https://testnet.binance.vision/api/v3/order",
    "test_futures": "https://testnet.binancefuture.com/fapi/v1/order"
}
# Test data
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
                "positionside": "BOTH"
            },
            {
                "trade_type": "test_futures",
                "coin_id": "ETHUSDT",
                "side": "sell",
                "order_type": "LIMIT",
                "value": 300.0,
                "price": 2985.123,
                "positionside": "BOTH",
                "timeInForce": "IOC"
            }
        ],
        "41": [
            {
                "trade_type": "test_futures",
                "coin_id": "BTCUSDT",
                "side": "buy",
                "order_type": "MARKET",
                "value": 200.0,
                "positionside": "BOTH"
            },
            {
                "trade_type": "test_futures",
                "coin_id": "ADAUSDT",
                "side": "sell",
                "order_type": "LIMIT",
                "value": 150.0,
                "price": 0.5,
                "positionside": "BOTH",
                "timeInForce": "GTC"
            }
        ]
    }
MARGIN_LEVERAGE_CONFIG = {
    41: {  # API ID 41 için
        "BTCUSDT": {
            "margin_type": True,
            "leverage": 10
        },
        "ETHUSDT": {
            "margin_type": True,
            "leverage": 15
        },
        "ADAUSDT": {
            "margin_type": False,
            "leverage": 8
        },
        "XRPUSDT": {
            "margin_type": True,
            "leverage": 20
        }
    },
    111: {  # API ID 111 için
        "BTCUSDT": {
            "margin_type": False,
            "leverage": 20
        },
        "ETHUSDT": {
            "margin_type": True,
            "leverage": 12
        }
    },
    17: {  # API ID 17 için
        "BTCUSDT": {
            "margin_type": False,
            "leverage": 5
        }
    }
}

from trade_engine.taha_part.utils.order_final import (
    update_margin_type,
    update_leverage,
    update_margin_leverage_config,
    step_qty_control,
    validate_and_format_prices,
    prepare_order_data
)

# Logger kurulumu
logger = logging.getLogger(__name__)

async def hmac_sign(secret_key: str, payload: str) -> str:
    """HMAC-SHA256 ile payload'u imzalar."""
    try:
        signature = hmac.new(secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return signature
    except Exception as e:
        raise ValueError(f"HMAC imzalama hatası: {e}")

async def ed25519_sign(private_key: str, payload: str) -> str:
    """Ed25519 ile payload'u imzalar."""
    try:
        private_key_obj = serialization.load_pem_private_key(
            private_key.encode(), password=None
        )
        if not isinstance(private_key_obj, Ed25519PrivateKey):
            raise ValueError("Geçersiz Ed25519 özel anahtarı")
        signature = base64.b64encode(private_key_obj.sign(payload.encode())).decode()
        return signature
    except Exception as e:
        raise ValueError(f"Ed25519 imzalama hatası: {e}")

async def send_order_optimized(prepared_orders: dict) -> dict:
    """
    Hazırlanan emirleri paralel olarak gönderir.
    
    Args:
        prepared_orders (dict): Trade type bazında emirleri içeren veri
        
    Returns:
        dict: API yanıtları
    """
    try:
        responses = {
            "spot": [],
            "test_spot": [],
            "futures": [],
            "test_futures": []
        }
        
        # Tüm emirleri tek listede topla
        all_orders = []
        for trade_type, orders in prepared_orders.items():
            if orders:  # Boş liste kontrolü
                for order in orders:
                    all_orders.append({
                        "trade_type": trade_type,
                        "order_data": order
                    })
        
        if not all_orders:
            logger.info("📋 Gönderilecek emir bulunamadı")
            return responses
        
        logger.info(f"📤 {len(all_orders)} emir paralel gönderilecek")
        
        # Emirleri paralel gönder
        send_tasks = []
        for order_item in all_orders:
            send_tasks.append(_send_single_order(order_item))
        
        # Paralel execution
        start_time = time.time()
        send_results = await asyncio.gather(*send_tasks, return_exceptions=True)
        send_time = time.time() - start_time
        
        # Sonuçları organize et
        for result in send_results:
            if isinstance(result, Exception):
                logger.error(f"❌ Emir gönderme hatası: {result}")
                continue
            
            if result and result.get("success"):
                trade_type = result["trade_type"]
                responses[trade_type].append(result["response"])
            elif result and result.get("error"):
                trade_type = result["trade_type"]
                responses[trade_type].append({"error": result["error"]})
        
        total_sent = sum(len(orders) for orders in responses.values())
        logger.info(f"📤 {total_sent} emir paralel gönderildi")
        logger.info(f"⚡ Paralel gönderim süresi: {send_time:.2f}s")
        logger.info(f"📊 Emir başına ortalama: {send_time/max(total_sent, 1):.3f}s")
        
        return responses
        
    except Exception as e:
        logger.error(f"❌ Paralel emir gönderme hatası: {str(e)}")
        return {}

async def _send_single_order(order_item: dict) -> Optional[dict]:
    """
    Tek bir emri API'ye gönderir.
    
    Args:
        order_item (dict): Emir bilgisi
        
    Returns:
        dict: Gönderim sonucu
    """
    try:
        trade_type = order_item["trade_type"]
        order = order_item["order_data"]
        
        # API bilgilerini al
        api_key = order["api_key"]
        private_key = order["private_key"]
        params = order.get("params", {}).copy()
        order_trade_type = order.get("trade_type")
        
        # trade_type'ı params'dan çıkar
        if "trade_type" in params:
            del params["trade_type"]
        
        # Timestamp ekle
        params["timestamp"] = int(time.time() * 1000)
        
        # İmza türünü belirle
        payload = "&".join(f"{k}={v}" for k, v in params.items())
        if order_trade_type in ["futures", "test_futures"]:
            signature = await hmac_sign(private_key, payload)
        elif order_trade_type in ["spot", "test_spot"]:
            signature = await ed25519_sign(private_key, payload)
        else:
            return {
                "success": False,
                "trade_type": trade_type,
                "error": f"Geçersiz trade_type: {order_trade_type}"
            }
        
        params["signature"] = signature
        
        # API URL'yi belirle
        api_url = API_URLS.get(order_trade_type)
        if not api_url:
            return {
                "success": False,
                "trade_type": trade_type,
                "error": f"API URL bulunamadı: {order_trade_type}"
            }
        
        headers = {
            "X-MBX-APIKEY": api_key,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # API isteği gönder
        async with aiohttp.ClientSession() as session:
            async with session.post(api_url, headers=headers, data=params) as response:
                if response.status == 200:
                    response_data = await response.json()
                    logger.info(f"✅ {trade_type} emri başarıyla gönderildi")
                    return {
                        "success": True,
                        "trade_type": trade_type,
                        "response": response_data
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"❌ {trade_type} API hatası: {response.status} - {error_text}")
                    return {
                        "success": False,
                        "trade_type": trade_type,
                        "error": f"HTTP {response.status}: {error_text}"
                    }
                    
    except Exception as e:
        logger.error(f"❌ Emir gönderme hatası: {str(e)}")
        return {
            "success": False,
            "trade_type": order_item.get("trade_type", "unknown"),
            "error": str(e)
        }

def build_order_params(order: dict, calculated_quantity: str, price_validation: dict) -> dict:
    """
    Emir parametrelerini oluşturur.
    leverage ve margin_type parametrelerini API'ye göndermez.
    """
    # Temel parametreler
    params = {
        "symbol": order["coin_id"],
        "side": order["side"].upper(),
        "type": order["order_type"].upper(),
        "quantity": calculated_quantity,
        "timestamp": int(time.time() * 1000)
    }
    
    # Price parametrelerini ekle
    if price_validation.get("price"):
        params["price"] = price_validation["price"]
    
    if price_validation.get("stopPrice"):
        params["stopPrice"] = price_validation["stopPrice"]
    
    if price_validation.get("activationPrice"):
        params["activationPrice"] = price_validation["activationPrice"]
    
    # Diğer parametreleri kopyala (leverage ve margin_type hariç)
    for key, value in order.items():
        if key not in ["coin_id", "side", "order_type", "value", "trade_type", 
                       "price", "stopPrice", "activationPrice", "leverage", "margin_type"]:
            if key == "positionside":
                params["positionSide"] = str(value).upper()
            elif key == "reduce_only":
                params["reduceOnly"] = str(value).lower()
            elif key == "timeInForce":
                params["timeInForce"] = str(value).upper()
            else:
                params[key] = value
    
    return params

async def process_single_order(bot_id: str, order: dict, api_credentials: dict, filters: dict) -> dict:
    """
    Tek bir emri paralel olarak işler.
    """
    try:
        # Temel validasyonlar
        trade_type = order.get("trade_type")
        if not trade_type or not api_credentials:
            return {"success": False}
        
        # API bilgilerini hazırla
        api_key = api_credentials.get("api_key") if trade_type in ["futures", "test_futures"] else api_credentials.get("ed_public")
        private_key = api_credentials.get("api_secret") if trade_type in ["futures", "test_futures"] else api_credentials.get("ed_private_pem")
        api_id = api_credentials.get("id")
        
        if not all([api_key, private_key, api_id]):
            return {"success": False}
        
        coin_id = order["coin_id"]
        normalized_trade_type = "spot" if trade_type in ["spot", "test_spot"] else "futures"
        
        # Paralel işlemler listesi
        parallel_tasks = []
        
        # 1. Price cache sorgusu
        parallel_tasks.append(get_price(coin_id, normalized_trade_type))
        
        # 2. Futures için margin/leverage işlemleri
        if trade_type in ["futures", "test_futures"]:
            config_settings = MARGIN_LEVERAGE_CONFIG.get(api_id, {}).get(coin_id, {})
            
            if config_settings:
                margin_type_bool = config_settings.get("margin_type", True)
                desired_leverage = config_settings.get("leverage")
                
                # Margin ve leverage'ı paralel güncelle
                parallel_tasks.append(
                    update_margin_type(api_key, private_key, coin_id, trade_type, margin_type_bool)
                )
                
                if desired_leverage:
                    parallel_tasks.append(
                        update_leverage(api_key, private_key, coin_id, trade_type, desired_leverage)
                    )
        
        # Paralel execution
        start_time = time.time()
        results = await asyncio.gather(*parallel_tasks, return_exceptions=True)
        logger.debug(f"🚀 {coin_id} paralel işlem süresi: {time.time() - start_time:.2f}s")
        
        # İlk result price'dır
        current_price = results[0] if not isinstance(results[0], Exception) else None
        
        if not current_price:
            logger.error(f"❌ {coin_id} fiyat bilgisi alınamadı")
            return {"success": False}
        
        # Sıralı işlemler (paralel olamayan)
        # Quantity hesaplama
        qty_result = await step_qty_control(
            filters=filters,
            coin_id=coin_id,
            trade_type=normalized_trade_type,
            value=float(order["value"]),
            current_price=current_price
        )
        
        if qty_result["status"] == "error":
            return {"success": False}
        
        # Price validation
        price_validation = await validate_and_format_prices(filters, coin_id, order)
        
        # Emir parametrelerini hazırla
        params = build_order_params(order, qty_result["quantity"], price_validation)
        
        return {
            "success": True,
            "trade_type": trade_type,
            "order_data": {
                "api_key": api_key,
                "private_key": private_key,
                "trade_type": trade_type,
                "params": params
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Single order processing hatası: {str(e)}")
        return {"success": False}

async def prepare_order_data_optimized(order_data: dict) -> dict:
    """
    Performans optimizasyonlu emir hazırlama fonksiyonu.
    Sıralı işlemler yerine paralel processing kullanır.
    """
    try:
        prepared_orders = {
            "spot": [],
            "test_spot": [],
            "futures": [],
            "test_futures": []
        }
        
        # 1. Symbol filtrelerini al (tek seferde)
        symbol_trade_types = extract_symbol_trade_types(order_data)
        filters = await get_symbols_filters_dict(symbol_trade_types)
        
        # 2. Tüm bot ID'leri için API credentials'ı paralel al
        all_bot_ids = list(order_data.keys())
        api_tasks = []
        
        for bot_id in all_bot_ids:
            for order in order_data[bot_id]:
                trade_type = order.get("trade_type")
                if trade_type:
                    api_tasks.append(
                        get_api_credentials_by_bot_id(int(bot_id), trade_type)
                    )
        
        # Paralel API credential çekimi
        start_time = time.time()
        api_results = await asyncio.gather(*api_tasks, return_exceptions=True)
        logger.info(f"🚀 API credentials paralel çekim süresi: {time.time() - start_time:.2f}s")
        
        # 3. Emir processing'i paralel yap
        order_tasks = []
        api_result_index = 0
        
        for bot_id, orders in order_data.items():
            for order in orders:
                api_credentials = api_results[api_result_index]
                api_result_index += 1
                
                if isinstance(api_credentials, Exception):
                    logger.error(f"❌ Bot {bot_id} API hatası: {api_credentials}")
                    continue
                
                # Her emri paralel işle
                order_tasks.append(
                    process_single_order(
                        bot_id=bot_id,
                        order=order,
                        api_credentials=api_credentials,
                        filters=filters
                    )
                )
        
        # Paralel emir işleme
        start_time = time.time()
        processed_orders = await asyncio.gather(*order_tasks, return_exceptions=True)
        logger.info(f"🚀 Emir processing paralel süresi: {time.time() - start_time:.2f}s")
        
        # 4. Sonuçları organize et
        for result in processed_orders:
            if isinstance(result, Exception):
                logger.error(f"❌ Emir processing hatası: {result}")
                continue
            
            if result and result.get("success"):
                trade_type = result["trade_type"]
                prepared_orders[trade_type].append(result["order_data"])
        
        # Özet log
        total_orders = sum(len(orders) for orders in prepared_orders.values())
        logger.info(f"📋 Toplam {total_orders} emir hazırlandı (optimized)")
        
        return prepared_orders
        
    except Exception as e:
        logger.error(f"❌ Optimized emir hazırlama hatası: {str(e)}")
        return {}

async def main():
    """
    Optimized version + send_order ile tam test
    """
    # Price cache'i başlat
    from trade_engine.taha_part.utils.price_cache_new import start_connection_pool, wait_for_cache_ready
    from trade_engine.taha_part.utils.order_final import send_order
    
    print("🔄 Price cache başlatılıyor...")
    await start_connection_pool()
    
    cache_ready = await wait_for_cache_ready(timeout_seconds=15)
    if not cache_ready:
        print("❌ Price cache hazır değil, test atlanıyor")
        return
    
    print("✅ Price cache hazır")
    await asyncio.sleep(2)
    
    # Test data
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
                "positionside": "BOTH"
            },
            {
                "trade_type": "test_futures",
                "coin_id": "ETHUSDT",
                "side": "sell",
                "order_type": "LIMIT",
                "value": 300.0,
                "price": 2985.123,
                "positionside": "BOTH",
                "timeInForce": "IOC"
            }
        ],
        "41": [
            {
                "trade_type": "test_futures",
                "coin_id": "BTCUSDT",
                "side": "buy",
                "order_type": "MARKET",
                "value": 200.0,
                "positionside": "BOTH"
            },
            {
                "trade_type": "test_futures",
                "coin_id": "ADAUSDT",
                "side": "sell",
                "order_type": "LIMIT",
                "value": 150.0,
                "price": 0.5,
                "positionside": "BOTH",
                "timeInForce": "GTC"
            }
        ]
    }
    
    print("\n🚀 Full Optimized Test (Hazırlama + Gönderme)...")
    print("=" * 50)
    
    # Optimized version (hazırlama + gönderme)
    total_start_time = time.time()
    
    # Hazırlama
    preparation_start = time.time()
    optimized_result = await prepare_order_data_optimized(test_order_data)
    preparation_time = time.time() - preparation_start
    
    # Gönderme
    send_start = time.time()
    optimized_send_result = await send_order_optimized(optimized_result)
    send_time = time.time() - send_start
    
    total_time = time.time() - total_start_time
    total_orders = sum(len(orders) for orders in optimized_result.values())
    
    print(f"\n📊 Optimized Full Test Sonuçları:")
    print(f"⏱️ Hazırlama süresi: {preparation_time:.2f}s")
    print(f"📤 Gönderme süresi: {send_time:.2f}s")
    print(f"🎯 Toplam süre: {total_time:.2f}s")
    print(f"📋 Hazırlanan emirler: {total_orders}")
    if total_orders > 0:
        print(f"📊 Emir başına ortalama: {total_time/total_orders:.3f}s")
        print(f"🔥 Throughput: {total_orders/total_time:.1f} emir/saniye")
    
    # Original version ile karşılaştırma
    print("\n📊 Original Version Karşılaştırma:")
    original_total_start = time.time()
    original_result = await prepare_order_data(test_order_data)
    original_preparation_time = time.time() - original_total_start
    
    original_send_start = time.time()
    original_send_result = await send_order(original_result)
    original_send_time = time.time() - original_send_start
    
    original_total_time = original_preparation_time + original_send_time
    original_orders = sum(len(orders) for orders in original_result.values())
    
    print(f"⏱️ Original hazırlama: {original_preparation_time:.2f}s")
    print(f"📤 Original gönderme: {original_send_time:.2f}s")
    print(f"🎯 Original toplam: {original_total_time:.2f}s")
    print(f"📋 Original emirler: {original_orders}")
    
    # Performans karşılaştırması
    if original_total_time > 0:
        performance_improvement = ((original_total_time - total_time) / original_total_time) * 100
        print(f"\n⚡ Performans Artışı:")
        print(f"   Hazırlama: %{((original_preparation_time - preparation_time) / original_preparation_time) * 100:.1f}")
        print(f"   Gönderme: %{((original_send_time - send_time) / original_send_time) * 100:.1f}")
        print(f"   Toplam: %{performance_improvement:.1f}")
        
        if performance_improvement > 0:
            print(f"   ✅ Optimized version %{performance_improvement:.1f} daha hızlı!")
        else:
            print(f"   ⚠️ Optimized version %{abs(performance_improvement):.1f} daha yavaş")
    
    print("\n🏁 Test tamamlandı!")
   
async def trying():
    a= send_order_optimized(prepare_order_data_optimized())
if __name__ == "__main__":
    asyncio.run(trying(test_order_data))