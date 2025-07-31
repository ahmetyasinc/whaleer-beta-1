# Gerekli modülleri ve veritabanı bağlantılarını import edelim
import asyncio
import aiohttp
import time
import logging
import hmac
import hashlib
import base64
from decimal import Decimal, ROUND_DOWN  # Precision için Decimal import ekle
from typing import Dict, Optional, Union
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
from backend.trade_engine.taha_part.utils.price_cache_new import get_price, start_connection_pool, start_websocket_services
from backend.trade_engine.taha_part.utils.dict_preparing import get_symbols_filters_dict, extract_symbol_trade_types
from backend.trade_engine.taha_part.db.db_config import get_api_credentials_by_bot_id

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
    """Ed25519 ile payload'u imzalar, hem \n string hem gerçek newline destekli."""
    try:
        private_key = private_key.strip()

        # Eğer \n string olarak geliyorsa gerçek newline'a çevir
        if "\\n" in private_key:
            private_key = private_key.replace("\\n", "\n")

        # PEM formatı kontrolü
        if not private_key.startswith("-----BEGIN PRIVATE KEY-----"):
            raise ValueError("Geçersiz PEM formatı: BEGIN satırı bulunamadı")
        if not private_key.endswith("-----END PRIVATE KEY-----"):
            raise ValueError("Geçersiz PEM formatı: END satırı bulunamadı")

        private_key_obj = serialization.load_pem_private_key(
            private_key.encode("utf-8"),
            password=None,
        )

        if not isinstance(private_key_obj, Ed25519PrivateKey):
            raise ValueError("Geçersiz Ed25519 özel anahtarı")

        signature = base64.b64encode(
            private_key_obj.sign(payload.encode("utf-8"))
        ).decode("utf-8")

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
                                print(f"✅ {trade_type} emri başarıyla gönderildi")
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
        
        print(f"✅ {len(filters)} sembol filtresi yüklendi")
        
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
                    print(f"🔧 {coin_id} için futures pozisyon hazırlığı başlatılıyor (API ID: {api_id})")
                    
                    # Config'den istenen ayarları al
                    config_settings = MARGIN_LEVERAGE_CONFIG.get(api_id, {}).get(coin_id, {})
                    
                    if config_settings:
                        # Config'den boolean margin_type al
                        margin_type_bool = config_settings.get("margin_type", True)
                        desired_leverage = config_settings.get("leverage")
                        
                        # Boolean kontrolü
                        if not isinstance(margin_type_bool, bool):
                            print(f"⚠️ Config'de margin_type boolean değil: {margin_type_bool}, True kullanılacak")
                            margin_type_bool = True
                        
                        margin_type_str = "ISOLATED" if margin_type_bool else "CROSSED"
                        
                        print(f"📊 Config ayarları - {coin_id}: margin_type={margin_type_bool} ({margin_type_str}), leverage={desired_leverage}x")
                        
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
                                print(f"✅ API ID {api_id} - {coin_id} pozisyon ayarları tamamlandı")
                                
                                # Config'i güncelle
                                config_updated = update_margin_leverage_config(
                                    api_id=api_id,
                                    symbol=coin_id,
                                    new_margin_type=margin_type_bool,
                                    new_leverage=config_settings.get("leverage", 1)
                                )
                                
                                if config_updated:
                                    print(f"✅ Config sync edildi - API ID {api_id}, {coin_id}")
                                else:
                                    print(f"⚠️ Config sync hatası - API ID {api_id}, {coin_id}")
                                    
                            else:
                                print(f"⚠️ API ID {api_id} - {coin_id} pozisyon ayarlarında sorun:")
                                print(f"   Margin: {margin_result['message']}")
                                print(f"   Leverage: {leverage_result['message']}")
                                
                        except Exception as e:
                            logger.error(f"❌ API ID {api_id} - {coin_id} pozisyon ayarlama hatası: {str(e)}")
                    else:
                        print(f"📝 API ID {api_id} için {coin_id} config'i bulunamadı - varsayılan ayarlar")
                
                # Güncel fiyatı price cache'den al
                try:
                    current_price = await get_price(coin_id, normalized_trade_type)
                    
                    if not current_price:
                        logger.error(f"❌ {coin_id} için {normalized_trade_type} fiyatı bulunamadı")
                        continue
                    
                    print(f"📊 {coin_id} güncel fiyat: ${current_price:.6f}")
                    
                except Exception as e:
                    logger.error(f"❌ {coin_id} için fiyat alınamadı: {str(e)}")
                    continue
                
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
                    
                    print(f"✅ {coin_id} quantity hesaplandı: {value}$ → {calculated_quantity} @ ${current_price:.6f}")
                    
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
                
                # Diğer parametreleri kopyala - positionside için özel dönüşüm
                for key, value in order.items():
                    if key not in ["coin_id", "side", "order_type", "value", "trade_type", 
                                   "price", "stopPrice", "activationPrice", "leverage", "margin_type"]:
                        # ✅ positionside -> positionSide dönüşümü
                        if key == "positionside":
                            # Binance'e her zaman "BOTH" gönder, kullanıcı değerini DB için sakla
                            params["positionSide"] = "BOTH"
                            print(f"🔄 positionside dönüştürüldü: {value} -> BOTH (Binance API için)")
                        elif key == "reduce_only":
                            params["reduceOnly"] = str(value).lower()
                        elif key == "timeInForce":
                            params["timeInForce"] = str(value).upper()
                        else:
                            params[key] = value
                
                # ✅ Orijinal positionside değerini DB için sakla
                original_positionside = order.get("positionside", "both")
                
                # Hazırlanan emri ekle - DB için gerekli bilgileri de ekle
                prepared_orders[trade_type].append({
                    "api_key": api_key,
                    "private_key": private_key,
                    "trade_type": trade_type,
                    "params": params,
                    # ✅ DB için orijinal değerleri sakla
                    "original_order": {
                        "bot_id": int(bot_id),
                        "coin_id": coin_id,
                        "side": side,
                        "order_type": order_type,
                        "value": value,
                        "positionside": original_positionside,  # Kullanıcının orijinal değeri
                        "price": order.get("price"),
                        "leverage": order.get("leverage"),
                        "margin_type": order.get("margin_type")
                    }
                })
                
                print(f"🎯 {coin_id} emri hazırlandı: {trade_type} | {side} | {order_type} | {calculated_quantity}")

        # Hazırlanan emirlerin özetini logla
        total_orders = sum(len(orders) for orders in prepared_orders.values())
        print(f"📋 Toplam {total_orders} emir hazırlandı:")
        for market_type, orders in prepared_orders.items():
            if orders:
                print(f"  {market_type}: {len(orders)} emir")

        return prepared_orders

    except Exception as e:
        logger.error(f"❌ Emir verisi hazırlanırken hata: {str(e)}")
        import traceback
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        return {}

async def step_qty_control(filters: Dict, coin_id: str, trade_type: str, value: float, current_price: float) -> Dict[str, Union[str, float]]:
    """
    Dolar değerini quantity'ye çevirerek step_size ve min_qty kontrolü yapar.
    Mathematical shift yaklaşımı ile precision hatalarını önler.
    """
    try:
        logger.info(f"🔍 Mathematical shift quantity kontrolü - {coin_id} {trade_type}")

        # Trade type normalize
        if trade_type in ["spot", "test_spot"]:
            normalized_trade_type = "spot"
        elif trade_type in ["futures", "test_futures"]:
            normalized_trade_type = "futures"
        else:
            normalized_trade_type = trade_type
        
        logger.info(f"📊 Normalized trade_type: {trade_type} -> {normalized_trade_type}")

        # Filtre bulma - mevcut mantık korundu
        coin_filter = None
        if coin_id in filters:
            filter_data = filters[coin_id]
            if isinstance(filter_data, list):
                for f in filter_data:
                    if f.get("trade_type") == normalized_trade_type:
                        coin_filter = f
                        logger.info(f"✅ Liste formatında filtre bulundu: {coin_id} -> {normalized_trade_type}")
                        break
            elif isinstance(filter_data, dict) and filter_data.get("trade_type") == normalized_trade_type:
                coin_filter = filter_data

        if not coin_filter:
            logger.warning(f"⚠️ {coin_id} için {normalized_trade_type} filtresi bulunamadı - varsayılan değerler")
            coin_filter = {
                "step_size": 0.001,
                "min_qty": 0.001,
                "tick_size": 0.01,
                "trade_type": normalized_trade_type
            }

        # ✅ String değerleri float'a çevir - type conversion güvenli hale getirildi
        step_size = float(coin_filter.get("step_size", 0.001)) if coin_filter.get("step_size") is not None else 0.001
        min_qty = float(coin_filter.get("min_qty", 0.001)) if coin_filter.get("min_qty") is not None else 0.001
        
        # ✅ Input parametrelerini de float'a çevir
        value_float = float(value) if value is not None else 0.0
        current_price_float = float(current_price) if current_price is not None else 0.0

        logger.info(f"📊 Filtre değerleri - step_size: {step_size}, min_qty: {min_qty}")
        logger.info(f"📊 Input değerleri - value: {value_float}, price: {current_price_float}")

        # Validation kontrolü
        if current_price_float <= 0:
            return {
                "quantity": "0",
                "status": "error",
                "message": f"Geçersiz current_price: {current_price_float}"
            }
        
        if value_float <= 0:
            return {
                "quantity": "0",
                "status": "error",
                "message": f"Geçersiz value: {value_float}"
            }

        # ✅ Mathematical shift yaklaşımı ile quantity hesaplama
        raw_quantity = value_float / current_price_float
        
        logger.info(f"🔢 Mathematical shift quantity calculation:")
        logger.info(f"   Value: ${value_float}")
        logger.info(f"   Price: ${current_price_float}")
        logger.info(f"   Raw quantity: {raw_quantity}")
        
        # Step size'ın decimal places'ını hesapla
        step_decimal_places = _get_tick_decimal_places_from_value(step_size)
        
        if step_decimal_places == 0:
            # Integer step_size (1.0 gibi)
            quantity_steps = int(raw_quantity / step_size)
            final_quantity = quantity_steps * step_size
            formatted_quantity = str(int(final_quantity))
            
            logger.info(f"   Integer step: {quantity_steps} steps -> {formatted_quantity}")
        else:
            # ✅ Mathematical shift for decimal step_size
            multiplier = 10 ** step_decimal_places
            
            logger.info(f"   Step decimal places: {step_decimal_places}")
            logger.info(f"   Multiplier: {multiplier}")
            
            # Raw quantity'yi shift et
            shifted_raw = raw_quantity * multiplier
            shifted_step = step_size * multiplier
            
            # Steps hesapla
            quantity_steps = int(shifted_raw / shifted_step)
            
            # Final quantity hesapla
            shifted_final = quantity_steps * shifted_step
            final_quantity = shifted_final / multiplier
            
            logger.info(f"   Shifted raw: {raw_quantity} * {multiplier} = {shifted_raw}")
            logger.info(f"   Shifted step: {step_size} * {multiplier} = {shifted_step}")
            logger.info(f"   Steps: int({shifted_raw} / {shifted_step}) = {quantity_steps}")
            logger.info(f"   Final: {quantity_steps} * {shifted_step} / {multiplier} = {final_quantity}")
            
            # ✅ Exact decimal places ile formatla - Binance uyumlu
            formatted_quantity = f"{final_quantity:.{step_decimal_places}f}"

        logger.info(f"✅ Mathematical shift quantity result: {formatted_quantity}")

        # Minimum quantity kontrolü
        if final_quantity < min_qty:
            return {
                "quantity": "0",
                "status": "error",
                "message": f"Quantity ({final_quantity}) minimum değerden ({min_qty}) küçük"
            }

        return {
            "quantity": formatted_quantity,
            "status": "success",
            "message": f"Quantity başarıyla hesaplandı: {formatted_quantity}"
        }

    except TypeError as te:
        logger.error(f"❌ Type conversion hatası: {str(te)}")
        return {
            "quantity": "0",
            "status": "error",
            "message": f"Type conversion hatası: {str(te)}"
        }
    except Exception as e:
        logger.error(f"❌ Mathematical shift quantity kontrolü hatası: {str(e)}")
        return {
            "quantity": "0",
            "status": "error",
            "message": f"Hesaplama hatası: {str(e)}"
        }
    
def _get_decimal_places_safe(value: float) -> int:
    """
    Precision-safe decimal places hesaplama - geliştirilmiş versiyon.
    Hem quantity hem de price için kullanılır.
    """
    try:
        # Scientific notation kontrolü
        value_str = str(value).lower()
        if 'e' in value_str:
            # 1e-05 -> 5 decimal places
            parts = value_str.split('e')
            if len(parts) == 2:
                exponent = int(parts[1])
                return abs(exponent) if exponent < 0 else 0
        
        # Normal decimal format - mathematical approach
        if '.' in str(value):
            # String'den decimal places'ı say
            decimal_part = str(value).split('.')[1]
            # Trailing zeros'ları kaldırarak gerçek decimal places'ı bul
            decimal_part = decimal_part.rstrip('0')
            return len(decimal_part)
        
        return 0
        
    except Exception as e:
        logger.error(f"❌ Decimal places hesaplama hatası: {e}")
        return 6  # Safe default

def _get_tick_decimal_places_from_value(tick_value: float) -> int:
    """
    Tick/step value'dan decimal places hesaplar.
    _get_decimal_places_safe'i wrapper olarak kullanır - DRY prensibi.
    """
    try:
        return _get_decimal_places_safe(tick_value)
    except Exception as e:
        logger.error(f"❌ Tick decimal places hesaplama hatası: {e}")
        return 2  # Price için güvenli varsayılan
def _get_decimal_places_safe(value: float) -> int:
    """
    Precision-safe decimal places hesaplama - geliştirilmiş versiyon
    """
    try:
        # Scientific notation kontrolü
        value_str = str(value).lower()
        if 'e' in value_str:
            # 1e-05 -> 5 decimal places
            parts = value_str.split('e')
            if len(parts) == 2:
                exponent = int(parts[1])
                return abs(exponent) if exponent < 0 else 0
        
        # Normal decimal format - daha safe approach
        if '.' in str(value):
            # Decimal kullanarak precision safe calculation
            decimal_value = Decimal(str(value))
            # Normalize ederek gereksiz sıfırları kaldır
            normalized = decimal_value.normalize()
            
            # Exponent'i al (negatif exponent = decimal places)
            sign, digits, exponent = normalized.as_tuple()
            if exponent < 0:
                return abs(exponent)
            else:
                return 0
        
        return 0
        
    except Exception as e:
        logger.error(f"❌ Decimal places hesaplama hatası: {e}")
        return 6  # Safe default

def _get_decimal_places(value: float) -> int:
    """
    Float değerinin ondalık basamak sayısını hesaplar.
    Scientific notation'ı da destekler.
    Backward compatibility için mevcut fonksiyon korundu.
    """
    try:
        return _get_decimal_places_safe(value)
    except Exception as e:
        logger.error(f"❌ Decimal places hesaplama hatası: {e}")
        return 8  # Güvenli varsayılan değer (maksimum 8)

def normalize_price_to_tick_size(price: float, tick_size: float) -> str:
    """
    Fiyatı en yakın tick_size değerine yuvarlar.
    Mathematical shift yaklaşımı ile precision hatalarını önler.
    """
    try:
        # ✅ Type conversion güvenli hale getirildi
        price_float = float(price) if price is not None else 0.0
        tick_size_float = float(tick_size) if tick_size is not None else 0.01
        
        if price_float <= 0 or tick_size_float <= 0:
            logger.warning(f"⚠️ Geçersiz price veya tick_size: {price_float}, {tick_size_float}")
            return str(price_float) if price_float > 0 else "0"
        
        logger.debug(f"🔢 Mathematical shift price formatting:")
        logger.debug(f"   Input price: {price_float}")
        logger.debug(f"   Tick size: {tick_size_float}")
        
        # Tick size'ın decimal places'ını hesapla
        tick_decimal_places = _get_tick_decimal_places_from_value(tick_size_float)
        
        if tick_decimal_places == 0:
            # Integer tick_size için basit round
            formatted_price = str(int(round(price_float)))
            logger.debug(f"✅ Integer tick formatting: {price_float} -> {formatted_price}")
            return formatted_price
        
        # Mathematical shift yaklaşımı
        multiplier = 10 ** tick_decimal_places
        
        logger.debug(f"   Decimal places: {tick_decimal_places}")
        logger.debug(f"   Multiplier: {multiplier}")
        
        # Shift, round, shift back
        shifted_price = price_float * multiplier
        rounded_shifted = round(shifted_price)
        final_price = rounded_shifted / multiplier
        
        logger.debug(f"   Shifted: {price_float} * {multiplier} = {shifted_price}")
        logger.debug(f"   Rounded: round({shifted_price}) = {rounded_shifted}")
        logger.debug(f"   Final: {rounded_shifted} / {multiplier} = {final_price}")
        
        # Exact decimal places ile formatla
        formatted_price = f"{final_price:.{tick_decimal_places}f}"
        
        logger.debug(f"✅ Mathematical shift result: {price_float} -> {formatted_price}")
        
        return formatted_price
        
    except TypeError as te:
        logger.error(f"❌ Price formatting type error: {te}")
        return str(price) if price else "0"
    except Exception as e:
        logger.error(f"❌ Mathematical shift price formatting hatası: {e}")
        return str(price) if price else "0"

async def validate_and_format_prices(filters: Dict, coin_id: str, order: Dict) -> Dict[str, Optional[str]]:
    """
    Order'daki price değerlerini tick_size'a göre kontrol eder ve formatlar.
    Precision hatası önlenmesi için geliştirilmiş versiyon.
    """
    try:
        trade_type = order.get("trade_type")
        if not trade_type:
            logger.error("❌ Order'da trade_type eksik")
            return {"price": None, "stopPrice": None, "activationPrice": None}
        
        normalized_trade_type = "spot" if trade_type in ["spot", "test_spot"] else "futures"
        
        print(f"🔍 Price validation başlatılıyor - {coin_id} {trade_type}")
        
        # Filtre arama - step_qty_control ile aynı mantık
        coin_filter = None
        
        if coin_id in filters:
            filter_data = filters[coin_id]
            
            if isinstance(filter_data, list):
                for filter_item in filter_data:
                    if isinstance(filter_item, dict) and filter_item.get("trade_type") == normalized_trade_type:
                        coin_filter = filter_item
                        print(f"✅ Liste formatında filtre bulundu: {coin_id} -> {normalized_trade_type}")
                        break
            
            elif isinstance(filter_data, dict):
                if filter_data.get("trade_type") == normalized_trade_type:
                    coin_filter = filter_data
                    print(f"✅ Dict formatında filtre bulundu: {coin_id} -> {normalized_trade_type}")
        
        # Tick size'ı al
        if not coin_filter:
            print(f"⚠️ {coin_id} için {normalized_trade_type} filtresi bulunamadı - varsayılan tick_size kullanılacak")
            tick_size = 0.01
        else:
            tick_size = float(coin_filter.get("tick_size", 0.01))
        
        print(f"📊 Tick size: {tick_size}")
        
        result = {
            "price": None,
            "stopPrice": None, 
            "activationPrice": None
        }
        
        # Price kontrolü ve formatting - precision safe
        if "price" in order and order["price"] is not None:
            price_value = float(order["price"])
            result["price"] = normalize_price_to_tick_size(price_value, tick_size)
            print(f"✅ Price formatlandı: {order['price']} -> {result['price']}")
        
        if "stopPrice" in order and order["stopPrice"] is not None:
            stop_price_value = float(order["stopPrice"])
            result["stopPrice"] = normalize_price_to_tick_size(stop_price_value, tick_size)
            print(f"✅ StopPrice formatlandı: {order['stopPrice']} -> {result['stopPrice']}")
        
        if "activationPrice" in order and order["activationPrice"] is not None:
            activation_price_value = float(order["activationPrice"])
            result["activationPrice"] = normalize_price_to_tick_size(activation_price_value, tick_size)
            print(f"✅ ActivationPrice formatlandı: {order['activationPrice']} -> {result['activationPrice']}")
        
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
            print(f"⚠️ Geçersiz margin_type: {margin_type}, True (ISOLATED) kullanılacak")
            margin_type_str = "ISOLATED"
        
        print(f"🔧 Margin type güncelleniyor - {symbol} -> {margin_type_str}")
        
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
                    print(f"✅ Margin type başarıyla güncellendi: {symbol} -> {margin_type_str}")
                    
                    return {
                        "success": True,
                        "message": f"Margin type {margin_type_str} başarıyla ayarlandı",
                        "margin_type": margin_type_str
                    }
                else:
                    error_text = await response.text()
                    print(f"⚠️ Margin type API hatası: {response.status} - {error_text}")
                    
                    # Zaten doğru margin type'ta ise başarılı say
                    if "No need to change margin type" in error_text:
                        print(f"✅ Margin type zaten {margin_type_str}: {symbol}")
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
        print(f"📊 Leverage güncelleniyor - {symbol} -> {leverage}x")
        
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
                    print(f"✅ Leverage başarıyla güncellendi: {symbol} -> {leverage}x")
                    
                    return {
                        "success": True,
                        "message": f"Leverage {leverage}x başarıyla ayarlandı",
                        "leverage": leverage
                    }
                else:
                    error_text = await response.text()
                    print(f"⚠️ Leverage API hatası: {response.status} - {error_text}")
                    
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
            print(f"⚠️ margin_type boolean olmalı, {type(new_margin_type)} geldi")
            new_margin_type = True  # Varsayılan ISOLATED
        
        if not isinstance(new_leverage, int) or new_leverage < 1:
            print(f"⚠️ leverage pozitif integer olmalı, {new_leverage} geldi")
            new_leverage = 1  # Varsayılan leverage
        
        margin_type_str = "ISOLATED" if new_margin_type else "CROSSED"
        
        print(f"🔄 Config güncelleniyor - API ID {api_id}, {symbol}")
        print(f"   Yeni ayarlar: margin_type={new_margin_type} ({margin_type_str}), leverage={new_leverage}")
        
        # Global config'e erişim
        global MARGIN_LEVERAGE_CONFIG
        
        # API ID yoksa oluştur
        if api_id not in MARGIN_LEVERAGE_CONFIG:
            MARGIN_LEVERAGE_CONFIG[api_id] = {}
            print(f"✅ Yeni API ID oluşturuldu: {api_id}")
        
        # Sembol config'ini güncelle - boolean olarak sakla
        MARGIN_LEVERAGE_CONFIG[api_id][symbol] = {
            "margin_type": new_margin_type,  # Boolean olarak sakla
            "leverage": new_leverage
        }
        
        print(f"✅ Config güncellendi - API ID {api_id}, {symbol}")
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
                "112": [
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
                        "leverage": 15
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
                        "leverage": 20
                        
                    }
                ],
                "111": [
                    {
                        "trade_type": "test_futures",
                        "coin_id": "BTCUSDT",  # Config'de True (ISOLATED)
                        "side": "buy",
                        "order_type": "MARKET",
                        "value": 200.0,
                        "positionside": "BOTH",
                        "leverage": 10
                        
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
                        "leverage": 25
                        
                    }
                ]
            }
    a= await prepare_order_data(test_order_data)
    b=await send_order(a)
    print("Emir gönderildi:", b)
    

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
