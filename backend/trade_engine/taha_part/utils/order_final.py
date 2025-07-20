# Gerekli modülleri ve veritabanı bağlantılarını import edelim
import asyncio
import aiohttp
import time
import logging
import hmac
import hashlib
import base64
from typing import Dict, Optional, Union  # Dict ve Union import'unu ekle
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
from trade_engine.taha_part.utils.price_cache_new import get_price, start_connection_pool, start_websocket_services
from trade_engine.taha_part.utils.dict_preparing import get_symbols_filters_dict, extract_symbol_trade_types
from trade_engine.taha_part.db.db_config import get_api_credentials_by_bot_id
from trade_engine.taha_part.utils.margin_leverage_controls import (
get_symbol_margin_leverage_info,sync_symbol_with_database, get_all_api_margin_leverage_infos)
# Logger ayarları
logger = logging.getLogger(__name__)

# Sabit değerler
API_URLS = {
    "spot": "https://api.binance.com/api/v3/order",
    "futures": "https://fapi.binance.com/fapi/v1/order",
    "test_spot": "https://testnet.binance.vision/api/v3/order",
    "test_futures":"https://testnet.binancefuture.com/fapi/v1/order" 
    
}

MARGIN_LEVERAGE_URLS = {
    "futures": {
        "marginType": "https://fapi.binance.com/fapi/v1/marginType",
        "leverage": "https://fapi.binance.com/fapi/v1/leverage"
    },
    "test_futures": {
        "marginType": "https://testnet.binancefuture.com/fapi/v1/marginType", 
        "leverage": "https://testnet.binancefuture.com/fapi/v1/leverage"
    }
}

# Static margin/leverage konfigürasyonu - API ID bazlı
MARGIN_LEVERAGE_CONFIG = {
    41: {  # API ID 1 için
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
    111: {  # API ID 2 için
        "BTCUSDT": {
            "margin_type": False,
            "leverage": 20
        },
        "ETHUSDT": {
            "margin_type": True,
            "leverage": 12
        }
    },
    17: {  # API ID 3 için
        "BTCUSDT": {
            "margin_type": False,
            "leverage": 5
        }
    }
    # Diğer API ID'ler için gerektiğinde eklenecek
}


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

async def send_order(prepared_orders: dict) -> dict:
    """
    Hazırlanan emir verisini Binance API'ye gönderir.
    
    Args:
        prepared_orders (dict): Trade type bazında emirleri içeren veri.
        
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

        # ✅ DÜZELTME: trade_type bazında iterate et
        for trade_type, orders in prepared_orders.items():
            if not orders:  # Boş liste kontrolü
                continue
                
            for order in orders:
                try:
                    # API bilgilerini ve parametreleri al
                    api_key = order["api_key"]
                    private_key = order["private_key"]
                    params = order.get("params", {}).copy()  # ✅ Copy oluştur
                    order_trade_type = order.get("trade_type")

                    # ✅ YENİ: trade_type'ı params'dan çıkar
                    if "trade_type" in params:
                        del params["trade_type"]
                        logger.debug(f"🗑️ trade_type params'dan silindi")

                    # Timestamp ekle
                    params["timestamp"] = int(time.time() * 1000)

                    # İmza türünü belirle
                    payload = "&".join(f"{k}={v}" for k, v in params.items())
                    if order_trade_type in ["futures", "test_futures"]:
                        signature = await hmac_sign(private_key, payload)
                    elif order_trade_type in ["spot", "test_spot"]:
                        signature = await ed25519_sign(private_key, payload)
                    else:
                        raise ValueError(f"Geçersiz trade_type: {order_trade_type}")

                    params["signature"] = signature

                    # API URL'yi belirle
                    api_url = API_URLS.get(order_trade_type)
                    if not api_url:
                        raise ValueError(f"Geçersiz trade_type: {order_trade_type}")

                    headers = {
                        "X-MBX-APIKEY": api_key,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }

                    # ✅ DEBUG: Gönderilen parametreleri logla
                    logger.debug(f"📤 {order_trade_type} API'ye gönderilen params: {list(params.keys())}")

                    # API isteğini gönder
                    async with aiohttp.ClientSession() as session:
                        async with session.post(api_url, headers=headers, data=params) as response:
                            if response.status == 200:
                                responses[trade_type].append(await response.json())
                                logger.info(f"✅ {trade_type} emri başarıyla gönderildi")
                            else:
                                error_text = await response.text()
                                logger.error(f"❌ {trade_type} API hatası: {response.status} - {error_text}")
                                responses[trade_type].append({
                                    "error": f"HTTP {response.status}: {error_text}"
                                })
                except Exception as e:
                    logger.error(f"❌ {trade_type.capitalize()} emri gönderilirken hata: {str(e)}")
                    responses[trade_type].append({"error": str(e)})

        return responses

    except Exception as e:
        logger.error(f"❌ Emir gönderme işlemi sırasında hata: {str(e)}")
        return {}

    
async def prepare_order_data(order_data: dict) -> dict:
    """
    Gelen emir verisini spot ve futures (gerçek ve test) formatına dönüştürür.
    step_qty_control ile quantity hesaplaması ve validate_and_format_prices ile tick_size kontrolü yapar.
    API ID bazlı margin type ve leverage ayarlaması yapar.
    """
    try:
        prepared_orders = {
            "spot": [],
            "test_spot": [],
            "futures": [],
            "test_futures": []
        }
        
        # Symbol filtrelerini al - minimize database calls
        symbol_trade_types = extract_symbol_trade_types(order_data)
        filters = await get_symbols_filters_dict(symbol_trade_types)
        
        logger.info(f"✅ {len(filters)} sembol filtresi yüklendi")
        
        for bot_id, orders in order_data.items():
            for order in orders:
                # trade_type doğrudan gelen veriden alınır
                trade_type = order.get("trade_type")
                if not trade_type:
                    logger.error(f"Bot ID {bot_id} için trade_type eksik.")
                    continue
                
                try:
                    # API bilgilerini al
                    api_credentials = await get_api_credentials_by_bot_id(int(bot_id), trade_type)
                    if not api_credentials:
                        logger.error(f"Bot ID {bot_id} için API bilgileri bulunamadı.")
                        continue
                    
                    # API key ve private key belirleme
                    api_key = api_credentials.get("api_key") if trade_type in ["futures", "test_futures"] else api_credentials.get("ed_public")
                    private_key = api_credentials.get("api_secret") if trade_type in ["futures", "test_futures"] else api_credentials.get("ed_private_pem")

                    # API ID'yi al
                    api_id = api_credentials.get("id")
                    
                    if not api_key or not private_key:
                        logger.error(f"Bot ID {bot_id} için gerekli API bilgileri eksik.")
                        continue
                    
                    if not api_id:
                        logger.error(f"Bot ID {bot_id} için API ID bulunamadı.")
                        continue
                    
                except Exception as e:
                    logger.error(f"❌ Bot ID {bot_id} için API kimlik bilgileri alınamadı: {str(e)}")
                    continue
                
                # Emir parametrelerini al
                coin_id = order["coin_id"]
                side = order["side"].upper()
                order_type = order["order_type"].upper()
                value = float(order["value"])
                
                # Trade type'ı price cache için normalize et
                normalized_trade_type = "spot" if trade_type in ["spot", "test_spot"] else "futures"
                
                # 🔧 Futures emirleri için API ID bazlı margin/leverage kontrolü
                if trade_type in ["futures", "test_futures"]:
                    logger.info(f"🔧 {coin_id} için futures pozisyon hazırlığı başlatılıyor (API ID: {api_id})")
                    
                    # Config'den istenen ayarları al
                    config_settings = MARGIN_LEVERAGE_CONFIG.get(api_id, {}).get(coin_id, {})
                    
                    if config_settings:
                        # Config'den boolean margin_type al
                        margin_type_bool = config_settings.get("margin_type", True)
                        desired_leverage = config_settings.get("leverage")
                        
                        # Boolean kontrolü
                        if not isinstance(margin_type_bool, bool):
                            logger.warning(f"⚠️ Config'de margin_type boolean değil: {margin_type_bool}, True kullanılacak")
                            margin_type_bool = True
                        
                        margin_type_str = "ISOLATED" if margin_type_bool else "CROSSED"
                        
                        logger.info(f"📊 Config ayarları - {coin_id}: margin_type={margin_type_bool} ({margin_type_str}), leverage={desired_leverage}x")
                        
                        try:
                            # Margin type güncelle - boolean değer gönder
                            margin_result = await update_margin_type(
                                api_key=api_key,
                                private_key=private_key,
                                symbol=coin_id,
                                trade_type=trade_type,
                                margin_type=margin_type_bool  # Boolean gönder
                            )
                            
                            # Leverage güncelle
                            leverage_result = {"success": True, "message": "Leverage belirtilmedi"}
                            if desired_leverage is not None:
                                leverage_result = await update_leverage(
                                    api_key=api_key,
                                    private_key=private_key,
                                    symbol=coin_id,
                                    trade_type=trade_type,
                                    leverage=desired_leverage
                                )
                            
                            # Sonuçları logla
                            if margin_result["success"] and leverage_result["success"]:
                                logger.info(f"✅ API ID {api_id} - {coin_id} pozisyon ayarları tamamlandı")
                                
                                # Config'i güncelle
                                config_updated = update_margin_leverage_config(
                                    api_id=api_id,
                                    symbol=coin_id,
                                    new_margin_type=margin_type_bool,
                                    new_leverage=config_settings.get("leverage", 1)
                                )
                                
                                if config_updated:
                                    logger.info(f"✅ Config sync edildi - API ID {api_id}, {coin_id}")
                                else:
                                    logger.warning(f"⚠️ Config sync hatası - API ID {api_id}, {coin_id}")
                                    
                            else:
                                logger.warning(f"⚠️ API ID {api_id} - {coin_id} pozisyon ayarlarında sorun:")
                                logger.warning(f"   Margin: {margin_result['message']}")
                                logger.warning(f"   Leverage: {leverage_result['message']}")
                                
                        except Exception as e:
                            logger.error(f"❌ API ID {api_id} - {coin_id} pozisyon ayarlama hatası: {str(e)}")
                    else:
                        logger.info(f"📝 API ID {api_id} için {coin_id} config'i bulunamadı - varsayılan ayarlar")
                
                # ... (geri kalan kod aynı)
                
                try:
                    # Güncel fiyatı price cache'den al
                    current_price = await get_price(coin_id, normalized_trade_type)
                    
                    if not current_price:
                        logger.error(f"❌ {coin_id} için {normalized_trade_type} fiyatı bulunamadı")
                        continue
                    
                    logger.info(f"📊 {coin_id} güncel fiyat: ${current_price:.6f}")
                    
                except Exception as e:
                    logger.error(f"❌ {coin_id} için fiyat alınamadı: {str(e)}")
                    continue
                
                # ... (geri kalan kod aynı kalacak)
                
                # Quantity kontrolü ve hesaplama
                try:
                    qty_result = await step_qty_control(
                        filters=filters,
                        coin_id=coin_id,
                        trade_type=normalized_trade_type,
                        value=value,
                        current_price=current_price
                    )
                    
                    if qty_result["status"] == "error":
                        logger.error(f"❌ {coin_id} quantity kontrolü başarısız: {qty_result['message']}")
                        continue
                    
                    # Hesaplanan quantity'yi al
                    calculated_quantity = qty_result["quantity"]
                    
                    logger.info(f"✅ {coin_id} quantity hesaplandı: {value}$ → {calculated_quantity} @ ${current_price:.6f}")
                    
                except Exception as e:
                    logger.error(f"❌ {coin_id} quantity hesaplama hatası: {str(e)}")
                    continue
                
                # Price validation ve formatting
                try:
                    price_validation = await validate_and_format_prices(
                        filters=filters,
                        coin_id=coin_id,
                        order=order
                    )
                    
                except Exception as e:
                    logger.error(f"❌ {coin_id} price validation hatası: {str(e)}")
                    price_validation = {"price": None, "stopPrice": None, "activationPrice": None}
                
                # Temel parametreler
                params = {
                    "symbol": coin_id,
                    "side": side,
                    "type": order_type,
                    "quantity": calculated_quantity,
                    "timestamp": int(time.time() * 1000)
                }
                
                # Price parametrelerini ekle
                if price_validation["price"]:
                    params["price"] = price_validation["price"]
                
                if price_validation["stopPrice"]:
                    params["stopPrice"] = price_validation["stopPrice"]
                
                if price_validation["activationPrice"]:
                    params["activationPrice"] = price_validation["activationPrice"]
                
                # Diğer parametreleri kopyala
                for key, value in order.items():
                    if key not in ["coin_id", "side", "order_type", "value", "trade_type", 
                                   "price", "stopPrice", "activationPrice", "leverage", "margin_type"]:  # leverage ve margin_type eklendi
                        if key == "positionside":
                            params["positionSide"] = str(value).upper()
                        elif key == "reduce_only":
                            params["reduceOnly"] = str(value).lower()
                        elif key == "timeInForce":
                            params["timeInForce"] = str(value).upper()
                        else:
                            params[key] = value
                
                # Hazırlanan emri ekle
                prepared_orders[trade_type].append({
                    "api_key": api_key,
                    "private_key": private_key,
                    "trade_type": trade_type,
                    "params": params
                })
                
                logger.info(f"🎯 {coin_id} emri hazırlandı: {trade_type} | {side} | {order_type} | {calculated_quantity}")

        # Hazırlanan emirlerin özetini logla
        total_orders = sum(len(orders) for orders in prepared_orders.values())
        logger.info(f"📋 Toplam {total_orders} emir hazırlandı:")
        for market_type, orders in prepared_orders.items():
            if orders:
                logger.info(f"  {market_type}: {len(orders)} emir")

        return prepared_orders

    except Exception as e:
        logger.error(f"❌ Emir verisi hazırlanırken hata: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return {}

async def step_qty_control(filters: Dict, coin_id: str, trade_type: str, value: float, current_price: float) -> Dict[str, Union[str, float]]:
    """
    Dolar değerini quantity'ye çevirerek step_size ve min_qty kontrolü yapar.
    Liste formatındaki filtreleri destekler: filters["BTCUSDT"] = [{"trade_type": "spot", ...}, {...}]
    """
    try:
        logger.info(f"🔍 Quantity kontrolü başlatılıyor - {coin_id} {trade_type}")
        
        # Trade type'ı normalize et
        if trade_type in ["spot", "test_spot"]:
            normalized_trade_type = "spot"
        elif trade_type in ["futures", "test_futures"]:
            normalized_trade_type = "futures"
        else:
            logger.warning(f"Geçersiz trade_type: {trade_type}")
            normalized_trade_type = trade_type
        
        logger.info(f"📊 Normalized trade_type: {trade_type} -> {normalized_trade_type}")
        
        # ✅ YENİ: Liste formatında filtre arama
        coin_filter = None
        
        if coin_id in filters:
            filter_data = filters[coin_id]
            
            # Liste formatı kontrolü
            if isinstance(filter_data, list):
                # Liste içinde doğru trade_type'ı ara
                for filter_item in filter_data:
                    if isinstance(filter_item, dict) and filter_item.get("trade_type") == normalized_trade_type:
                        coin_filter = filter_item
                        logger.info(f"✅ Liste formatında filtre bulundu: {coin_id} -> {normalized_trade_type}")
                        break
            
            # Eski format desteği (backward compatibility)
            elif isinstance(filter_data, dict):
                if filter_data.get("trade_type") == normalized_trade_type:
                    coin_filter = filter_data
                    logger.info(f"✅ Dict formatında filtre bulundu: {coin_id} -> {normalized_trade_type}")
        
        # Filtre bulunamadıysa varsayılan değerler
        if not coin_filter:
            logger.warning(f"⚠️ {coin_id} için {normalized_trade_type} filtresi bulunamadı - varsayılan değerler kullanılacak")
            
            # Varsayılan filtre değerleri
            default_filters = {
                "spot": {"step_size": 0.00001, "min_qty": 0.00001, "tick_size": 0.01},
                "futures": {"step_size": 0.001, "min_qty": 0.001, "tick_size": 0.01}
            }
            
            coin_filter = default_filters.get(normalized_trade_type, {
                "step_size": 0.00001,
                "min_qty": 0.00001,
                "tick_size": 0.01
            })
            coin_filter["trade_type"] = normalized_trade_type
            
            logger.info(f"🔧 Varsayılan filtre kullanılıyor: {coin_filter}")
        
        # Filtre değerlerini al
        step_size = float(coin_filter.get("step_size", 0.00001))
        min_qty = float(coin_filter.get("min_qty", 0.00001))
        filter_trade_type = coin_filter.get("trade_type")
        
        logger.info(f"📊 Filtre değerleri - step_size: {step_size}, min_qty: {min_qty}, trade_type: {filter_trade_type}")
        
        # Temel validasyonlar
        if not step_size or not min_qty:
            logger.error("❌ Filtre bilgileri eksik")
            return {
                "quantity": "0",
                "status": "error",
                "message": "Filtre bilgileri eksik (step_size veya min_qty)"
            }
        
        # Fiyat kontrolü
        if not current_price or current_price <= 0:
            logger.error("❌ Geçersiz fiyat bilgisi")
            return {
                "quantity": "0",
                "status": "error",
                "message": "Geçersiz fiyat bilgisi"
            }
        
        # Hesaplama - adım adım
        raw_quantity = value / current_price
        quantity_steps = int(raw_quantity / step_size)
        final_quantity = quantity_steps * step_size
        
        logger.info(f"🔢 Hesaplama - raw: {raw_quantity:.8f}, steps: {quantity_steps}, final: {final_quantity:.8f}")
        
        # Minimum quantity kontrolü
        if final_quantity < min_qty:
            logger.warning(f"⚠️ Minimum quantity altında: {final_quantity} < {min_qty}")
            return {
                "quantity": "0",
                "status": "error",
                "message": f"Quantity ({final_quantity}) minimum değerden ({min_qty}) küçük"
            }
        
        # Formatı belirle
        if step_size >= 1:
            formatted_quantity = str(int(final_quantity))
        else:
            decimal_places = _get_decimal_places(step_size)
            logger.info(f"📝 Formatlama - decimal_places: {decimal_places}")
            formatted_quantity = f"{final_quantity:.{decimal_places}f}"
            
            # Sondaki sıfırları kaldır
            formatted_quantity = formatted_quantity.rstrip('0').rstrip('.')
            if not formatted_quantity or formatted_quantity == '':
                formatted_quantity = "0"
        
        logger.info(f"✅ Başarılı - formatted_quantity: {formatted_quantity}")
        
        return {
            "quantity": formatted_quantity,
            "status": "success",
            "message": f"Quantity başarıyla hesaplandı: {formatted_quantity}"
        }
        
    except Exception as e:
        logger.error(f"❌ {coin_id} quantity kontrolü sırasında hata: {str(e)}")
        return {
            "quantity": "0",
            "status": "error",
            "message": f"Hesaplama hatası: {str(e)}"
        }

def _get_decimal_places(value: float) -> int:
    """
    Float değerinin ondalık basamak sayısını hesaplar.
    Scientific notation'ı da destekler.
    """
    try:
        # Scientific notation kontrolü (1e-05 gibi)
        if 'e' in str(value).lower():
            # 1e-05 -> 0.00001 formatına çevir
            formatted_value = f"{value:.10f}"
            # Sondaki sıfırları kaldır
            formatted_value = formatted_value.rstrip('0').rstrip('.')
            if '.' in formatted_value:
                return len(formatted_value.split('.')[1])
            return 0
        else:
            # Normal float format
            value_str = str(value)
            if '.' in value_str:
                return len(value_str.split('.')[1])
            return 0
    except Exception as e:
        logger.error(f"❌ Decimal places hesaplama hatası: {e}")
        return 5  # Güvenli varsayılan değer

def normalize_price_to_tick_size(price: float, tick_size: float) -> str:
    """
    Fiyatı en yakın tick_size değerine yuvarlar.
    
    Args:
        price (float): Yuvarlanacak fiyat
        tick_size (float): Tick size değeri (örn: 0.01, 0.001)
        
    Returns:
        str: Formatlanmış fiyat string'i
    """
    try:
        if not price or not tick_size or tick_size <= 0:
            logger.warning(f"⚠️ Geçersiz price veya tick_size: {price}, {tick_size}")
            return str(price) if price else "0"
        
        # En yakın tick_size'a yuvarlama
        rounded_price = round(price / tick_size) * tick_size
        
        # Ondalık basamak sayısını belirle
        decimal_places = _get_decimal_places(tick_size)
        
        # Formatla
        formatted_price = f"{rounded_price:.{decimal_places}f}"
        
        # Sondaki gereksiz sıfırları kaldır (opsiyonel)
        if '.' in formatted_price:
            formatted_price = formatted_price.rstrip('0').rstrip('.')
            if not formatted_price:
                formatted_price = "0"
        
        logger.info(f"📝 Price formatting: {price} -> {formatted_price} (tick_size: {tick_size})")
        
        return formatted_price
        
    except Exception as e:
        logger.error(f"❌ Price formatting hatası: {e}")
        return str(price) if price else "0"

async def validate_and_format_prices(filters: Dict, coin_id: str, order: Dict) -> Dict[str, Optional[str]]:
    """
    Order'daki price değerlerini tick_size'a göre kontrol eder ve formatlar.
    Liste formatındaki filtreleri destekler.
    """
    try:
        # Trade type'ı order'dan al
        trade_type = order.get("trade_type")
        if not trade_type:
            logger.error("❌ Order'da trade_type eksik")
            return {"price": None, "stopPrice": None, "activationPrice": None}
        
        # Trade type'ı normalize et
        normalized_trade_type = "spot" if trade_type in ["spot", "test_spot"] else "futures"
        
        logger.info(f"🔍 Price validation başlatılıyor - {coin_id} {trade_type}")
        
        # ✅ YENİ: Liste formatında filtre arama (step_qty_control ile aynı mantık)
        coin_filter = None
        
        if coin_id in filters:
            filter_data = filters[coin_id]
            
            # Liste formatı kontrolü
            if isinstance(filter_data, list):
                for filter_item in filter_data:
                    if isinstance(filter_item, dict) and filter_item.get("trade_type") == normalized_trade_type:
                        coin_filter = filter_item
                        logger.info(f"✅ Liste formatında filtre bulundu: {coin_id} -> {normalized_trade_type}")
                        break
            
            # Eski format desteği
            elif isinstance(filter_data, dict):
                if filter_data.get("trade_type") == normalized_trade_type:
                    coin_filter = filter_data
                    logger.info(f"✅ Dict formatında filtre bulundu: {coin_id} -> {normalized_trade_type}")
        
        # Filter bulunamadıysa varsayılan değerler
        if not coin_filter:
            logger.warning(f"⚠️ {coin_id} için {normalized_trade_type} filtresi bulunamadı - varsayılan tick_size kullanılacak")
            tick_size = 0.01  # Varsayılan tick_size
        else:
            tick_size = float(coin_filter.get("tick_size", 0.01))
        
        logger.info(f"📊 Tick size: {tick_size}")
        
        # Price parametrelerini kontrol et ve formatla
        result = {
            "price": None,
            "stopPrice": None, 
            "activationPrice": None
        }
        
        # Price kontrolü (LIMIT emirleri için)
        if "price" in order and order["price"] is not None:
            price_value = float(order["price"])
            result["price"] = normalize_price_to_tick_size(price_value, tick_size)
            logger.info(f"✅ Price formatlandı: {order['price']} -> {result['price']}")
        
        # StopPrice kontrolü
        if "stopPrice" in order and order["stopPrice"] is not None:
            stop_price_value = float(order["stopPrice"])
            result["stopPrice"] = normalize_price_to_tick_size(stop_price_value, tick_size)
            logger.info(f"✅ StopPrice formatlandı: {order['stopPrice']} -> {result['stopPrice']}")
        
        # ActivationPrice kontrolü
        if "activationPrice" in order and order["activationPrice"] is not None:
            activation_price_value = float(order["activationPrice"])
            result["activationPrice"] = normalize_price_to_tick_size(activation_price_value, tick_size)
            logger.info(f"✅ ActivationPrice formatlandı: {order['activationPrice']} -> {result['activationPrice']}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Price validation hatası: {e}")
        return {
            "price": None,
            "stopPrice": None,
            "activationPrice": None
        }
    
async def update_margin_type(api_key: str, private_key: str, symbol: str, trade_type: str, 
                           margin_type: Union[bool, str] = True) -> Dict[str, Union[bool, str]]:
    """
    Futures pozisyonu için margin type'ı günceller.
    
    Args:
        api_key (str): Binance API anahtarı
        private_key (str): Binance private key (HMAC için)
        symbol (str): Sembol (örn: BTCUSDT)
        trade_type (str): "futures" veya "test_futures"
        margin_type (Union[bool, str]): True/False veya "ISOLATED"/"CROSSED"
        
    Returns:
        dict: Güncelleme sonucu
    """
    try:
        # Boolean değeri string'e çevir
        if isinstance(margin_type, bool):
            margin_type_str = "ISOLATED" if margin_type else "CROSSED"
        elif isinstance(margin_type, str) and margin_type in ["ISOLATED", "CROSSED"]:
            margin_type_str = margin_type
        else:
            logger.warning(f"⚠️ Geçersiz margin_type: {margin_type}, True (ISOLATED) kullanılacak")
            margin_type_str = "ISOLATED"
        
        logger.info(f"🔧 Margin type güncelleniyor - {symbol} -> {margin_type_str}")
        
        # Trade type kontrolü
        if trade_type not in ["futures", "test_futures"]:
            return {
                "success": False,
                "message": f"Geçersiz trade_type: {trade_type}",
                "margin_type": margin_type_str
            }
        
        # URL'yi al
        urls = MARGIN_LEVERAGE_URLS.get(trade_type)
        if not urls:
            return {
                "success": False,
                "message": f"{trade_type} için URL bulunamadı",
                "margin_type": margin_type_str
            }
        
        margin_url = urls["marginType"]
        
        # Headers ayarları
        headers = {
            "X-MBX-APIKEY": api_key,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # Parametreler
        margin_params = {
            "symbol": symbol,
            "marginType": margin_type_str,
            "timestamp": int(time.time() * 1000)
        }
        
        # HMAC imzası oluştur
        margin_payload = "&".join(f"{k}={v}" for k, v in margin_params.items())
        margin_signature = await hmac_sign(private_key, margin_payload)
        margin_params["signature"] = margin_signature
        
        # API isteği gönder
        async with aiohttp.ClientSession() as session:
            async with session.post(margin_url, headers=headers, data=margin_params) as response:
                if response.status == 200:
                    margin_response = await response.json()
                    logger.info(f"✅ Margin type başarıyla güncellendi: {symbol} -> {margin_type_str}")
                    
                    return {
                        "success": True,
                        "message": f"Margin type {margin_type_str} başarıyla ayarlandı",
                        "margin_type": margin_type_str
                    }
                else:
                    error_text = await response.text()
                    logger.warning(f"⚠️ Margin type API hatası: {response.status} - {error_text}")
                    
                    # Zaten doğru margin type'ta ise başarılı say
                    if "No need to change margin type" in error_text:
                        logger.info(f"✅ Margin type zaten {margin_type_str}: {symbol}")
                        return {
                            "success": True,
                            "message": f"Margin type zaten {margin_type_str}",
                            "margin_type": margin_type_str
                        }
                    
                    return {
                        "success": False,
                        "message": f"HTTP {response.status}: {error_text}",
                        "margin_type": margin_type_str
                    }
        
    except Exception as e:
        logger.error(f"❌ Margin type güncelleme hatası: {str(e)}")
        return {
            "success": False,
            "message": f"Margin type hatası: {str(e)}",
            "margin_type": margin_type_str if 'margin_type_str' in locals() else "ISOLATED"
        }
    
async def update_leverage(api_key: str, private_key: str, symbol: str, trade_type: str, 
                         leverage: int) -> Dict[str, Union[bool, str, int]]:
    """
    Futures pozisyonu için leverage'ı günceller.
    
    Args:
        api_key (str): Binance API anahtarı
        private_key (str): Binance private key (HMAC için)
        symbol (str): Sembol (örn: BTCUSDT)
        trade_type (str): "futures" veya "test_futures"
        leverage (int): Leverage değeri (1-125 arası)
        
    Returns:
        dict: Güncelleme sonucu
    """
    try:
        logger.info(f"📊 Leverage güncelleniyor - {symbol} -> {leverage}x")
        
        # Trade type kontrolü
        if trade_type not in ["futures", "test_futures"]:
            return {
                "success": False,
                "message": f"Geçersiz trade_type: {trade_type}",
                "leverage": leverage
            }
        
        # Leverage değeri kontrolü
        if not isinstance(leverage, int) or leverage < 1 or leverage > 125:
            return {
                "success": False,
                "message": f"Geçersiz leverage değeri: {leverage} (1-125 arası olmalı)",
                "leverage": leverage
            }
        
        # URL'yi al
        urls = MARGIN_LEVERAGE_URLS.get(trade_type)
        if not urls:
            return {
                "success": False,
                "message": f"{trade_type} için URL bulunamadı",
                "leverage": leverage
            }
        
        leverage_url = urls["leverage"]
        
        # Headers ayarları
        headers = {
            "X-MBX-APIKEY": api_key,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # Parametreler
        leverage_params = {
            "symbol": symbol,
            "leverage": leverage,
            "timestamp": int(time.time() * 1000)
        }
        
        # HMAC imzası oluştur
        leverage_payload = "&".join(f"{k}={v}" for k, v in leverage_params.items())
        leverage_signature = await hmac_sign(private_key, leverage_payload)
        leverage_params["signature"] = leverage_signature
        
        # API isteği gönder
        async with aiohttp.ClientSession() as session:
            async with session.post(leverage_url, headers=headers, data=leverage_params) as response:
                if response.status == 200:
                    leverage_response = await response.json()
                    logger.info(f"✅ Leverage başarıyla güncellendi: {symbol} -> {leverage}x")
                    
                    return {
                        "success": True,
                        "message": f"Leverage {leverage}x başarıyla ayarlandı",
                        "leverage": leverage
                    }
                else:
                    error_text = await response.text()
                    logger.warning(f"⚠️ Leverage API hatası: {response.status} - {error_text}")
                    
                    return {
                        "success": False,
                        "message": f"HTTP {response.status}: {error_text}",
                        "leverage": leverage
                    }
        
    except Exception as e:
        logger.error(f"❌ Leverage güncelleme hatası: {str(e)}")
        return {
            "success": False,
            "message": f"Leverage hatası: {str(e)}",
            "leverage": leverage
        }
    
def update_margin_leverage_config(api_id: int, symbol: str, new_margin_type: bool, 
                                 new_leverage: int) -> bool:
    """
    MARGIN_LEVERAGE_CONFIG'i günceller.
    
    Args:
        api_id (int): API ID
        symbol (str): Sembol (örn: BTCUSDT)
        new_margin_type (bool): True=ISOLATED, False=CROSSED
        new_leverage (int): Yeni leverage değeri
        
    Returns:
        bool: Güncelleme başarılı mı
    """
    try:
        # Boolean kontrolü
        if not isinstance(new_margin_type, bool):
            logger.warning(f"⚠️ margin_type boolean olmalı, {type(new_margin_type)} geldi")
            new_margin_type = True  # Varsayılan ISOLATED
        
        if not isinstance(new_leverage, int) or new_leverage < 1:
            logger.warning(f"⚠️ leverage pozitif integer olmalı, {new_leverage} geldi")
            new_leverage = 1  # Varsayılan leverage
        
        margin_type_str = "ISOLATED" if new_margin_type else "CROSSED"
        
        logger.info(f"🔄 Config güncelleniyor - API ID {api_id}, {symbol}")
        logger.info(f"   Yeni ayarlar: margin_type={new_margin_type} ({margin_type_str}), leverage={new_leverage}")
        
        # Global config'e erişim
        global MARGIN_LEVERAGE_CONFIG
        
        # API ID yoksa oluştur
        if api_id not in MARGIN_LEVERAGE_CONFIG:
            MARGIN_LEVERAGE_CONFIG[api_id] = {}
            logger.info(f"✅ Yeni API ID oluşturuldu: {api_id}")
        
        # Sembol config'ini güncelle - boolean olarak sakla
        MARGIN_LEVERAGE_CONFIG[api_id][symbol] = {
            "margin_type": new_margin_type,  # Boolean olarak sakla
            "leverage": new_leverage
        }
        
        logger.info(f"✅ Config güncellendi - API ID {api_id}, {symbol}")
        logger.debug(f"   Güncellenmiş config: {MARGIN_LEVERAGE_CONFIG[api_id][symbol]}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Config güncelleme hatası: {str(e)}")
        return False

async def main():
   # Price cache'i başlat
    from trade_engine.taha_part.utils.price_cache_new import start_connection_pool, wait_for_cache_ready
    
    print("🔄 Price cache başlatılıyor...")
    await start_connection_pool()
    
    # Cache'in hazır olmasını bekle
    cache_ready = await wait_for_cache_ready(timeout_seconds=15)
    
    if not cache_ready:
        print("❌ Price cache hazır değil, test atlanıyor")
        return
    
    print("✅ Price cache hazır")
    asyncio.sleep(5) 
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
                        "price": 0.8,
                        "positionside": "BOTH",
                        "timeInForce": "GTC",
                        "leverage": 25,
                        "margin_type": False  # Boolean - CROSSED
                    }
                ]
            }
    a= await prepare_order_data(test_order_data)
    b=await send_order(a)
    print("Emir gönderildi:", b)
    

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
