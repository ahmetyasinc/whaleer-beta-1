# Standart kütüphaneler
from datetime import datetime
import time, asyncio, aiohttp, logging, json, os, traceback
from typing import Optional, Dict, List
from decimal import Decimal
from backend.trade_engine.config import get_db_connection, get_async_pool
from psycopg2.extras import RealDictCursor
from backend.trade_engine.taha_part.utils.price_cache_new import start_connection_pool, wait_for_cache_ready
from binance.helpers import round_step_size
from backend.trade_engine.log.telegram.telegram_service import notify_user_by_telegram

# DB fonksiyonları - sıfırdan ekle
from backend.trade_engine.taha_part.db.db_config import (
    get_api_credentials_by_bot_id,
    get_user_id_by_bot_id,  # ✅ Tekrar eklendi

)

# Mevcut utils fonksiyonları
from backend.trade_engine.taha_part.utils.order_final import (
    get_symbols_filters_dict,
    hmac_sign,
    ed25519_sign,
    update_margin_type,
    update_leverage,    
    get_price,
    extract_symbol_trade_types
)

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


async def calculate_order_params(
    filters: dict,
    coin_id: str,
    trade_type: str,
    value: float,
    current_price: float,
    price: float = None,
    stop_price: float = None,
    activation_price: float = None,
    leverage: int = 1
) -> dict:
    try:
        # trade_type normalize
        match trade_type:
            case "spot" | "test_spot":
                normalized_trade_type = "spot"
                leverage = Decimal("1")  # Spot için leverage daima 1
            case "futures" | "test_futures":
                normalized_trade_type = "futures"
                leverage = Decimal(str(leverage)) if leverage else Decimal("1")
            case _:
                raise ValueError(f"Geçersiz trade_type: {trade_type}")

        # Filtre seç
        coin_filters = filters.get(coin_id)
        if not coin_filters:
            raise ValueError(f"{coin_id} için filtre bulunamadı")

        selected_filter = next(
            (f for f in coin_filters if f["trade_type"] == normalized_trade_type),
            None
        )
        if not selected_filter:
            raise ValueError(f"{coin_id} için {trade_type} filtresi bulunamadı (DB'de {normalized_trade_type} aranıyor)")

        step_size = Decimal(str(selected_filter["step_size"]))
        min_qty   = Decimal(str(selected_filter["min_qty"]))
        tick_size = Decimal(str(selected_filter["tick_size"]))

        # ✅ Notional = margin × leverage
        notional = Decimal(str(value)) * leverage
        raw_qty = notional / Decimal(str(current_price))

        # Step kontrolü
        formatted_quantity = Decimal(str(round_step_size(raw_qty, float(step_size))))

        print(f"📊 {coin_id} qty hesaplandı: margin={value}, lev={leverage} → {formatted_quantity}")

        if formatted_quantity < min_qty:
            raise ValueError(f"Quantity {formatted_quantity} min_qty {min_qty}'dan küçük")

        # Price parametreleri
        formatted_price = str(round_step_size(Decimal(str(price)), float(tick_size))) if price else None
        formatted_stop  = str(round_step_size(Decimal(str(stop_price)), float(tick_size))) if stop_price else None
        formatted_act   = str(round_step_size(Decimal(str(activation_price)), float(tick_size))) if activation_price else None

        return {
            "quantity": str(formatted_quantity),
            "status": "success",
            "message": f"{value}$ margin ile {formatted_quantity} adet hesaplandı",
            "price": formatted_price,
            "stopPrice": formatted_stop,
            "activationPrice": formatted_act,
            "leverage": int(leverage)  # DB için integer dönelim
        }

    except Exception as e:
        return {
            "quantity": "0",
            "status": "error",
            "message": f"Hata: {str(e)}",
            "price": None,
            "stopPrice": None,
            "activationPrice": None,
            "leverage": int(leverage) if leverage else 1
        }

async def send_order(prepared_orders: dict) -> dict:
    """
    Hazırlanan emirleri Binance API'ye gönderir ve başarılı olanları DB'ye kaydeder.
    Eğer original_order'da 'take_profit' varsa:
      1) Önce MARKET/LIMIT ana emir gönderilir ve kaydedilir
      2) Ardından TP emri (spot: LIMIT SELL, futures: TAKE_PROFIT_MARKET) açılır ve kaydedilir
    """
    try:
        responses = {"spot": [], "test_spot": [], "futures": [], "test_futures": []}

        for ttype, orders in prepared_orders.items():
            if not orders:
                continue

            for order in orders:
                try:
                    api_key = order["api_key"]
                    private_key = order["private_key"]
                    params = order.get("params", {}).copy()
                    order_trade_type = order.get("trade_type")
                    original_order = order.get("original_order", {})
                    bot_id = order.get("bot_id")

                    # API'ye gitmeyecek dahili alanları temizle
                    api_params = {k: v for k, v in params.items() if k not in ("bot_id", "original_order", "trade_type")}
                    api_params["timestamp"] = int(time.time() * 1000)

                    # İmza
                    payload = "&".join(f"{k}={v}" for k, v in api_params.items())
                    signature = await _create_signature(private_key, payload, order_trade_type)
                    api_params["signature"] = signature

                    # URL & Header
                    api_url = API_URLS.get(order_trade_type)
                    if not api_url:
                        raise ValueError(f"Geçersiz trade_type: {order_trade_type}")
                    headers = {"X-MBX-APIKEY": api_key, "Content-Type": "application/x-www-form-urlencoded"}

                    # === 1) Ana emir ===
                    async with aiohttp.ClientSession() as session:
                        async with session.post(api_url, headers=headers, data=api_params) as response:
                            if response.status == 200:
                                trade_result = await response.json()
                                responses[ttype].append(trade_result)

                                symbol = trade_result.get("symbol", "N/A")
                                side = trade_result.get("side", "N/A")
                                qty_log = trade_result.get("executedQty") or trade_result.get("origQty", "N/A")
                                print(f"📤 MARKET/LIMIT order gönderildi: {symbol} {side} {qty_log}")

                                # DB kaydı (ana emir)
                                if bot_id:
                                    db_params = original_order.copy()
                                    db_params.update({
                                        "symbol": symbol,
                                        "side": side,
                                        "quantity": api_params.get("quantity"),
                                        "price": api_params.get("price"),  # yoksa save_trade_to_db fallback hesaplar
                                        "trade_type": order_trade_type,
                                        "api_id": order.get("api_id"),
                                    })
                                    await save_successful_trade(int(bot_id), trade_result, db_params)

                                # === 2) TP zinciri (isteğe bağlı) ===
                                if original_order.get("take_profit") is not None:
                                    try:
                                        executed_qty = float(trade_result.get("executedQty") or 0)
                                        if executed_qty <= 0:
                                            executed_qty = float(
                                                trade_result.get("origQty")
                                                or original_order.get("amount")
                                                or 0
                                            )
                                        if executed_qty <= 0:
                                            raise ValueError("TP için geçerli quantity bulunamadı")

                                        # Spotta bakiye yansıması için kısa bekleme
                                        if "spot" in order_trade_type:
                                            await asyncio.sleep(1)

                                        tp_price = float(original_order["take_profit"])

                                        # Filtreler
                                        symbol_filters = (await get_symbols_filters_dict({symbol: [order_trade_type]})).get(symbol, [])
                                        normalized_type = "futures" if "futures" in order_trade_type else "spot"
                                        selected_filter = next((f for f in symbol_filters if f["trade_type"] == normalized_type), None)
                                        if not selected_filter:
                                            raise ValueError(f"{symbol} için {order_trade_type} filtresi bulunamadı")

                                        step_size = float(selected_filter["step_size"])
                                        tick_size = float(selected_filter["tick_size"])

                                        qty = float(round_step_size(executed_qty, step_size))
                                        if qty <= 0:
                                            raise ValueError(f"{symbol} için TP qty geçersiz: {executed_qty} -> {qty}")
                                        qty_str = str(qty)
                                        price_str = str(round_step_size(tp_price, tick_size))

                                        # TP parametreleri
                                        if "spot" in order_trade_type:
                                            tp_params = {
                                                "symbol": symbol,
                                                "side": "SELL",
                                                "type": "LIMIT",
                                                "price": price_str,
                                                "quantity": qty_str,
                                                "timeInForce": "GTC",
                                                "timestamp": int(time.time() * 1000),
                                            }
                                        else:
                                            tp_params = {
                                                "symbol": symbol,
                                                "side": "SELL",
                                                "type": "TAKE_PROFIT_MARKET",
                                                "stopPrice": price_str,
                                                "quantity": qty_str,
                                                "timestamp": int(time.time() * 1000),
                                            }

                                        # TP imza ve gönderim
                                        tp_payload = "&".join(f"{k}={v}" for k, v in tp_params.items())
                                        tp_signature = await _create_signature(private_key, tp_payload, order_trade_type)
                                        tp_params["signature"] = tp_signature

                                        async with aiohttp.ClientSession() as tp_session:
                                            async with tp_session.post(api_url, headers=headers, data=tp_params) as tp_resp:
                                                if tp_resp.status == 200:
                                                    tp_result = await tp_resp.json()
                                                    responses[ttype].append(tp_result)
                                                    print(f"📤 TP order gönderildi: {symbol} SELL {qty_str} @ {price_str}")

                                                    # DB kaydı (TP)
                                                    if bot_id:
                                                        tp_db_params = original_order.copy()
                                                        tp_db_params.update({
                                                            "symbol": symbol,
                                                            "side": "SELL",
                                                            "quantity": qty_str,
                                                            "price": price_str,
                                                            "trade_type": order_trade_type,
                                                            "api_id": order.get("api_id"),
                                                        })
                                                        await save_successful_trade(int(bot_id), tp_result, tp_db_params)
                                                else:
                                                    error_text = await tp_resp.text()
                                                    logger.error(f"❌ TP order hatası: {tp_resp.status} - {error_text}")
                                                    responses[ttype].append({"error": f"TP order failed: {error_text}"})
                                    except Exception as tp_err:
                                        logger.error(f"❌ TP order oluşturma hatası: {str(tp_err)}")

                            else:
                                error_text = await response.text()
                                logger.error(f"❌ {order_trade_type} API hatası: {response.status} - {error_text}")
                                responses[ttype].append({"error": f"HTTP {response.status}: {error_text}"})

                except Exception as e:
                    logger.error(f"❌ {order_trade_type} emri işlenirken hata: {str(e)}")
                    responses[ttype].append({"error": str(e)})

        return responses

    except Exception as e:
        logger.error(f"❌ Emir gönderme işlemi sırasında hata: {str(e)}")
        return {}





"""

async def send_order(prepared_orders: dict) -> dict:
    
    Hazırlanan emirleri Binance API'ye gönderir ve başarılı olanları DB'ye kaydeder.
    Tüm emirler HMAC imzası ile gönderilir.
    
    try:
        responses = { "spot": [], "test_spot": [], "futures": [], "test_futures": [] }
        for trade_type, orders in prepared_orders.items():
            if not orders: continue
            for order in orders:
                try:
                    api_key = order["api_key"]
                    private_key = order["private_key"]
                    params = order.get("params", {}).copy()
                    order_trade_type = order.get("trade_type")
                    
                    api_params = params.copy()
                    internal_params = ["bot_id", "original_order", "trade_type"]
                    for param in internal_params:
                        if param in api_params: del api_params[param]
                    
                    api_params["timestamp"] = int(time.time() * 1000)

                    # İMZA OLUŞTURMA (Her zaman HMAC)
                    payload = "&".join(f"{k}={v}" for k, v in api_params.items())
                    signature = await _create_signature(private_key, payload, order_trade_type)
                    api_params["signature"] = signature

                    # API isteği
                    api_url = API_URLS.get(order_trade_type)
                    if not api_url: raise ValueError(f"Geçersiz trade_type: {order_trade_type}")

                    headers = { "X-MBX-APIKEY": api_key, "Content-Type": "application/x-www-form-urlencoded" }

                    async with aiohttp.ClientSession() as session:
                        async with session.post(api_url, headers=headers, data=api_params) as response:
                            if response.status == 200:
                                trade_result = await response.json()
                                responses[trade_type].append(trade_result)
                                print(f"✅ {trade_type} emri başarıyla gönderildi (HMAC ile)")
                                # ... (DB kayıt ve loglama kısımları aynı kalır)
                            else:
                                error_text = await response.text()
                                logger.error(f"❌ {trade_type} API hatası: {response.status} - {error_text}")
                                responses[trade_type].append({"error": f"HTTP {response.status}: {error_text}"})
                except Exception as e:
                    logger.error(f"❌ {trade_type} emri işlenirken hata: {str(e)}")
                    responses[trade_type].append({"error": str(e)})
        return responses
    except Exception as e:
        logger.error(f"❌ Emir gönderme işlemi sırasında hata: {str(e)}")
        return {}
    
"""
async def prepare_order_data(order_data: dict) -> dict:
    """
    Gelen emir verisini Binance API formatına dönüştürür.
    Futures için margin/leverage ayarları user_symbol_settings tablosu üzerinden kontrol edilir.

    Args:
        order_data (dict): Bot ID bazında emirleri içeren veri

    Returns:
        dict: Hazırlanan emirler
    """
    try:
        prepared_orders = {
            "spot": [],
            "test_spot": [],
            "futures": [],
            "test_futures": []
        }

        # Symbol filtrelerini al - minimize DB calls
        symbol_trade_types = extract_symbol_trade_types(order_data)
        filters = await get_symbols_filters_dict(symbol_trade_types)
        print(filters)

        print(f"✅ {len(filters)} sembol filtresi yüklendi")

        for bot_id, orders in order_data.items():
            for order in orders:
                trade_type = order.get("trade_type")
                if not trade_type:
                    logger.error(f"Bot ID {bot_id} için trade_type eksik")
                    continue

                # API kimlik bilgilerini al
                api_credentials = await _get_api_credentials(bot_id, trade_type)
                if not api_credentials:
                    continue

                api_id = api_credentials.get("id")
                user_id = await get_user_id_by_bot_id(int(bot_id))
                if not user_id:
                    logger.error(f"❌ Bot ID {bot_id} için user_id bulunamadı")
                    continue

                api_key, private_key = _extract_api_keys(api_credentials, trade_type)

                # Futures için margin/leverage DB kontrolü
                if trade_type in ["futures", "test_futures"]:
                    conn = get_db_connection()
                    settings = await sync_margin_leverage(
                        user_id=user_id,
                        api_id=api_id,
                        api_key=api_key,
                        private_key=private_key,
                        symbol=order["coin_id"],
                        trade_type=trade_type,
                        order=order,
                        conn=conn
                    )
                    if not settings:
                        logger.error(f"❌ {order['coin_id']} için margin/leverage senkronizasyonu başarısız")
                        continue
                    print(f"📊 DB ayarları - {order['coin_id']}: margin_type={settings['margin_type']} leverage={settings['leverage']}")

                # Emir parametrelerini hazırla
                prepared_order = await _prepare_single_order(
                    bot_id=bot_id,
                    order=order,
                    api_credentials=api_credentials,
                    filters=filters
                )

                if prepared_order:
                    prepared_orders[trade_type].append(prepared_order)
                    print(f"✅ {order['coin_id']} emri hazırlandı: {trade_type}")

        # Özet bilgi
        total_orders = sum(len(orders) for orders in prepared_orders.values())
        print(f"📋 Toplam {total_orders} emir hazırlandı")

        return prepared_orders

    except Exception as e:
        logger.error(f"❌ Emir verisi hazırlanırken hata: {str(e)}")
        return {}

def _normalize_position_side(order: dict, trade_type: str) -> tuple:
    """
    Binance'e her zaman BOTH gönder, DB için kullanıcı gönderdiğini sakla
    """
    user_position_side = str(order.get("positionside", "both")).lower()
    api_position_side = "BOTH" if trade_type in ["futures", "test_futures"] else None
    return api_position_side, user_position_side
"""
async def _prepare_single_order(bot_id: int, order: dict, api_credentials: dict, filters: dict):
    try:
        # ✅ Önce status kontrolü
        status = str(order.get("status", "success")).lower()
        if status == "error":
            logger.warning(f"⚠ Bot {bot_id} için {order.get('coin_id')} emri atlandı (status=error)")
            return None
        if "status" in order:
            del order["status"]  # ✅ API'ye gitmesin

        if not api_key or not private_key:
            logger.error(f"Bot {bot_id} ({api_credentials.get('id')}) için HMAC anahtarları veritabanında bulunamadı. Emir atlanıyor.")
            return None # Fonksiyondan erken çık ve bu emri atla
        # =======================================

        api_id = api_credentials.get("id")
        user_id = await get_user_id_by_bot_id(int(bot_id))

        trade_type = order.get("trade_type")
        coin_id = order["coin_id"]
        side = order["side"].upper()
        order_type = order["order_type"].upper()
        value = Decimal(str(order["value"]))  # ✅ Decimal ile güvenli

        api_key, private_key = _extract_api_keys(api_credentials, trade_type)
        api_id = api_credentials.get("id")
        user_id = await get_user_id_by_bot_id(int(bot_id))

        leverage = Decimal("1")

        # ✅ Futures setup
        if trade_type in ["futures", "test_futures"]:
            conn = get_db_connection()
            settings = await sync_margin_leverage(
                user_id=user_id,
                api_id=api_id,
                api_key=api_key,
                private_key=private_key,
                symbol=coin_id,
                trade_type=trade_type,
                order=order,
                conn=conn
            )

            if not settings:
                logger.error(f"❌ {coin_id} için margin/leverage ayarları alınamadı")
                return None

            leverage = Decimal(str(settings.get("leverage", 1)))
            margin_type_bool = settings.get("margin_type", True)
            margin_type_str = "ISOLATED" if margin_type_bool else "CROSSED"
            print(f"✅ DB ayarları - {coin_id}: margin_type={margin_type_str}, leverage={leverage}x")

        # ✅ Güncel fiyat
        current_price = await get_price(coin_id, "futures" if "futures" in trade_type else "spot")

        # ✅ Quantity hesaplama
        calc_result = await calculate_order_params(
            filters=filters,
            coin_id=coin_id,
            trade_type=trade_type,
            value=value,
            current_price=current_price,
            price=order.get("price"),
            stop_price=order.get("stopPrice"),
            activation_price=order.get("activationPrice"),
            leverage=int(leverage)
        )

        if calc_result["status"] == "error":
            logger.error(f"❌ {coin_id} için hesaplama hatası: {calc_result['message']}")
            return None

        api_position_side, user_position_side = _normalize_position_side(order, trade_type)

        params = {
            "symbol": coin_id,
            "side": side,
            "type": order_type,
            "quantity": calc_result["quantity"],
            "timestamp": int(time.time() * 1000),
        }

        for key in ["price", "stopPrice", "activationPrice"]:
            if calc_result.get(key):
                params[key] = calc_result[key]

        if api_position_side:
            params["positionSide"] = api_position_side

        # Ek parametreler
        blacklist = {"coin_id", "side", "order_type", "value", "trade_type", "price", "stopPrice", "activationPrice"}
        for key, val in order.items():
            if key not in blacklist:
                if key.lower() == "timeinforce":
                    params["timeInForce"] = str(val).upper()
                elif key.lower() == "reduce_only":
                    params["reduceOnly"] = str(val).lower()
                elif key.lower() == "positionside":
                    params["positionSide"] = "BOTH"
                else:
                    params[key] = str(val)

        if order_type == "LIMIT" and "timeInForce" not in params:
            params["timeInForce"] = "GTC"

        return {
            "api_key": api_key,
            "private_key": private_key,
            "trade_type": trade_type,
            "params": params,
            "bot_id": bot_id,
            "original_order": {**order, "positionside": user_position_side, "leverage": int(leverage), "amount": calc_result["quantity"]}
        }

    except Exception as e:
        logger.error(f"❌ Emir hazırlama hatası: {str(e)}")
        return None
"""
async def _prepare_single_order(bot_id: int, order: dict, api_credentials: dict, filters: dict):
    try:
        # ✅ Önce status kontrolü
        status = str(order.get("status", "success")).lower()
        if status == "error":
            logger.warning(f"⚠ Bot {bot_id} için {order.get('coin_id')} emri atlandı (status=error)")
            return None
        if "status" in order:
            del order["status"]  # ✅ API'ye gitmesin

        # ✅ API keyleri al
        api_key, private_key = _extract_api_keys(api_credentials, order.get("trade_type"))
        if not api_key or not private_key:
            logger.error(f"Bot {bot_id} ({api_credentials.get('id')}) için HMAC anahtarları bulunamadı. Emir atlanıyor.")
            return None

        api_id = api_credentials.get("id")
        user_id = await get_user_id_by_bot_id(int(bot_id))

        trade_type = order.get("trade_type")
        coin_id = order["coin_id"]
        side = order["side"].upper()
        order_type = order["order_type"].upper()
        value = Decimal(str(order["value"]))  # ✅ Decimal ile güvenli

        leverage = Decimal("1")

        # ✅ Futures setup
        if trade_type in ["futures", "test_futures"]:
            conn = get_db_connection()
            settings = await sync_margin_leverage(
                user_id=user_id,
                api_id=api_id,
                api_key=api_key,
                private_key=private_key,
                symbol=coin_id,
                trade_type=trade_type,
                order=order,
                conn=conn
            )

            if not settings:
                logger.error(f"❌ {coin_id} için margin/leverage ayarları alınamadı")
                return None

            leverage = Decimal(str(settings.get("leverage", 1)))
            margin_type_bool = settings.get("margin_type", True)
            margin_type_str = "ISOLATED" if margin_type_bool else "CROSSED"
            print(f"✅ DB ayarları - {coin_id}: margin_type={margin_type_str}, leverage={leverage}x")

        # ✅ Güncel fiyat
        current_price = await get_price(coin_id, "futures" if "futures" in trade_type else "spot")

        # ✅ Quantity hesaplama
        calc_result = await calculate_order_params(
            filters=filters,
            coin_id=coin_id,
            trade_type=trade_type,
            value=value,
            current_price=current_price,
            price=order.get("price"),
            stop_price=order.get("stopPrice"),
            activation_price=order.get("activationPrice"),
            leverage=int(leverage)
        )

        if calc_result["status"] == "error":
            logger.error(f"❌ {coin_id} için hesaplama hatası: {calc_result['message']}")
            return None

        api_position_side, user_position_side = _normalize_position_side(order, trade_type)

        params = {
            "symbol": coin_id,
            "side": side,
            "type": order_type,
            "quantity": calc_result["quantity"],
            "timestamp": int(time.time() * 1000),
        }

        for key in ["price", "stopPrice", "activationPrice"]:
            if calc_result.get(key):
                params[key] = calc_result[key]

        if api_position_side:
            params["positionSide"] = api_position_side

        # Ek parametreler
        blacklist = {"coin_id", "side", "order_type", "value", "trade_type", "price", "stopPrice", "activationPrice", "take_profit"}
        for key, val in order.items():
            if key not in blacklist:
                if key.lower() == "timeinforce":
                    params["timeInForce"] = str(val).upper()
                elif key.lower() == "reduce_only":
                    params["reduceOnly"] = str(val).lower()
                elif key.lower() == "positionside":
                    params["positionSide"] = "BOTH"
                else:
                    params[key] = str(val)

        if order_type == "LIMIT" and "timeInForce" not in params:
            params["timeInForce"] = "GTC"

        return {
            "api_key": api_key,
            "private_key": private_key,
            "trade_type": trade_type,
            "params": params,
            "bot_id": bot_id,
            "api_id": api_id,
            "original_order": {
                **order,
                "positionside": user_position_side,
                "leverage": int(leverage),
                "amount": calc_result["quantity"]
            }
        }

    except Exception as e:
        logger.error(f"❌ Emir hazırlama hatası: {str(e)}")
        return None

async def _get_api_credentials(bot_id: str, trade_type: str) -> Optional[dict]:
    """
    API kimlik bilgilerini getirir - reusable function
    
    Args:
        bot_id (str): Bot ID
        trade_type (str): Trade type
        
    Returns:
        Optional[dict]: API kimlik bilgileri
    """
    try:
        api_credentials = await get_api_credentials_by_bot_id(int(bot_id), trade_type)
        if not api_credentials:
            logger.error(f"Bot ID {bot_id} için API bilgileri bulunamadı")
            return None
        
        return api_credentials
        
    except Exception as e:
        logger.error(f"❌ Bot ID {bot_id} için API kimlik bilgileri alınamadı: {str(e)}")
        return None
"""
def _extract_api_keys(api_credentials: dict, trade_type: str) -> tuple:
    
    #Trade type'a göre doğru API anahtarlarını seçer
    
    #Args:
    #    api_credentials (dict): API kimlik bilgileri
    #    trade_type (str): Trade type
        
    #Returns:
    #    tuple: (api_key, private_key)
    
    if trade_type in ["futures", "test_futures"]:
        return (
            api_credentials.get("api_key"),
            api_credentials.get("api_secret")
        )
    elif trade_type in ["spot", "test_spot"]:
        return (
            api_credentials.get("ed_public"),
            api_credentials.get("ed_private_pem")
        )
    
    return None, None
"""

def _extract_api_keys(api_credentials: dict, trade_type: str) -> tuple:
    """
    Tüm trade type'ları için standart HMAC API anahtarlarını seçer.
    Ed25519 anahtarları (`ed_public`, `ed_private_pem`) artık kullanılmaz.
    """
    # DEĞİŞİKLİK: Spot ve Futures için her zaman HMAC anahtarlarını kullan
    api_key = api_credentials.get("api_key")
    api_secret = api_credentials.get("api_secret")
    
    if not api_key or not api_secret:
        logger.error(f"API credentials içinde 'api_key' veya 'api_secret' bulunamadı.")
        return None, None
        
    return api_key, api_secret

async def _handle_futures_position_setup(api_key: str, private_key: str, symbol: str, 
                                        trade_type: str, api_id: int, user_id: int) -> None:
    """
    Futures emirleri için margin/leverage ayarlarını DB tabanlı yapar.
    """
    try:
        conn = get_db_connection()
        settings = await sync_margin_leverage(
            user_id=user_id,
            api_id=api_id,
            api_key=api_key,
            private_key=private_key,
            symbol=symbol,
            trade_type=trade_type,
            order={"symbol": symbol},  # basit placeholder order
            conn=conn
        )

        if not settings:
            print(f"⚠️ {symbol} için margin/leverage ayarları bulunamadı")
            return

        margin_type_bool = settings.get("margin_type", True)
        leverage = settings.get("leverage", 1)
        margin_type_str = "ISOLATED" if margin_type_bool else "CROSSED"

        print(f"✅ DB ayarları - {symbol}: margin_type={margin_type_str}, leverage={leverage}x")

    except Exception as e:
        logger.error(f"❌ API ID {api_id} - {symbol} pozisyon ayarlama hatası: {str(e)}")
"""
async def _create_signature(private_key: str, payload: str, trade_type: str) -> str:
    
    #Trade type'a göre doğru imzayı oluşturur
    
    #Args:
        #private_key (str): Private key
        #payload (str): Payload
        #trade_type (str): Trade type
        
    #Returns:
        #str: İmza
    
    if trade_type in ["futures", "test_futures"]:
        return await hmac_sign(private_key, payload)
    elif trade_type in ["spot", "test_spot"]:
        return await ed25519_sign(private_key, payload)
    else:
        raise ValueError(f"Geçersiz trade_type: {trade_type}")
"""
async def _create_signature(private_key: str, payload: str, trade_type: str) -> str:
    """
    Tüm trade type'ları için HMAC imzası oluşturur.
    'private_key' parametresi bu context'te api_secret'tır.
    """
    # Önceki konuşmamızda kararlaştırdığımız gibi,
    # tüm piyasa türleri (spot, futures vb.) için HMAC kullanıyoruz.
    # Bu nedenle trade_type'ı kontrol eden if/elif bloğuna artık gerek yok.
    return await hmac_sign(private_key, payload)
   
def _build_order_params(coin_id: str, side: str, order_type: str, quantity: str, 
                       price_validation: dict, order: dict) -> dict:
    """
    Emir parametrelerini oluşturur - status ve margin_type API'ye gönderilmez
    """
    params = {
        "symbol": coin_id,
        "side": side,
        "type": order_type,
        "quantity": quantity
    }
    
    # Price parametrelerini ekle
    if price_validation["price"]:
        params["price"] = price_validation["price"]
    
    if price_validation["stopPrice"]:
        params["stopPrice"] = price_validation["stopPrice"]
    
    if price_validation["activationPrice"]:
        params["activationPrice"] = price_validation["activationPrice"]
    
    trade_type = order.get("trade_type", "spot")
    
    # ✅ STATUS EKLENDI - API'ye gönderilmemeli
    excluded_keys = {
        "coin_id", "side", "order_type", "value", "trade_type", 
        "price", "stopPrice", "activationPrice", 
        "leverage",  # API parametresi değil
        "margin_type",  # Config'den alınır
        "status"  # ✅ API'ye gönderilmez
    }
    
    for key, value in order.items():
        if key not in excluded_keys:
            if key == "positionside":
                if trade_type in ["futures", "test_futures"]:
                    # ✅ Binance'e her zaman "BOTH" gönder - kullanıcı niyeti DB'de saklanır
                    params["positionSide"] = "BOTH"
            elif key == "reduce_only":
                if trade_type in ["futures", "test_futures"]:
                    params["reduceOnly"] = str(value).lower()
            elif key == "timeInForce":
                params["timeInForce"] = str(value).upper()
            else:
                params[key] = value
    
    return params

async def get_or_create_symbol_settings(user_id: int, api_id: int, symbol: str, trade_type: str, 
                                        desired_margin_type: bool, desired_leverage: int, exchange: str = "Binance"):
    """
    user_symbol_settings tablosunu lazy-style kontrol eder:
    - Yoksa yeni satır ekler
    - Varsa, farklıysa günceller ve Binance ile sync eder
    """
    try:
        conn = get_db_connection()
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # DB'den kontrol et
                cursor.execute("""
                    SELECT * FROM user_symbol_settings
                    WHERE user_id = %s AND api_id = %s AND symbol = %s AND trade_type = %s
                """, (user_id, api_id, symbol, trade_type))
                
                row = cursor.fetchone()
                
                if not row:
                    # Yoksa ekle
                    cursor.execute("""
                        INSERT INTO user_symbol_settings (user_id, api_id, symbol, margin_type, leverage, trade_type, exchange, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, now(), now())
                        RETURNING *
                    """, (user_id, api_id, symbol, desired_margin_type, desired_leverage, trade_type, exchange))
                    
                    row = cursor.fetchone()
                    conn.commit()
                    print(f"✅ Yeni satır eklendi: {symbol}, margin_type={desired_margin_type}, leverage={desired_leverage}")
                    
                    # Binance ile sync et
                    await sync_margin_leverage(api_id, symbol, trade_type, desired_margin_type, desired_leverage)
                
                else:
                    # Varsa, değerler farklı mı?
                    update_needed = False
                    
                    if row["margin_type"] != desired_margin_type:
                        update_needed = True
                        row["margin_type"] = desired_margin_type
                    
                    if row["leverage"] != desired_leverage:
                        update_needed = True
                        row["leverage"] = desired_leverage
                    
                    if update_needed:
                        cursor.execute("""
                            UPDATE user_symbol_settings
                            SET margin_type=%s, leverage=%s, updated_at=now()
                            WHERE id=%s
                            RETURNING *
                        """, (row["margin_type"], row["leverage"], row["id"]))
                        
                        row = cursor.fetchone()
                        conn.commit()
                        print(f"🔄 DB güncellendi: {symbol}, margin_type={row['margin_type']}, leverage={row['leverage']}")
                        
                        # Binance ile sync et
                        await sync_margin_leverage(api_id, symbol, trade_type, row["margin_type"], row["leverage"])
                
                return row
                
    except Exception as e:
        print(f"❌ get_or_create_symbol_settings hatası: {e}")
        return None


async def sync_margin_leverage(user_id: int, api_id: int, api_key: str, private_key: str,
                               symbol: str, trade_type: str, order: dict, conn) -> dict:
    """
    Emirde gelen leverage ve DB'deki leverage aynı mı kontrol eder.
    - Farklıysa önce Binance üzerinde düzeltir, sonra DB günceller.
    - Margin type için de aynı kontrol yapılır.
    """
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("""
                    SELECT * FROM user_symbol_settings
                    WHERE user_id=%s AND api_id=%s AND symbol=%s AND trade_type=%s
                """, (user_id, api_id, symbol, trade_type))
                row = cursor.fetchone()

                desired_margin_type = order.get("margin_type", True)
                desired_leverage = int(order.get("leverage", 10))

                if not row:
                    # İlk kez işlem yapılıyorsa kayıt oluştur
                    cursor.execute("""
                        INSERT INTO user_symbol_settings 
                            (user_id, api_id, symbol, margin_type, leverage, trade_type, exchange, created_at, updated_at)
                        VALUES (%s,%s,%s,%s,%s,%s,'Binance', now(), now())
                        RETURNING *
                    """, (user_id, api_id, symbol, desired_margin_type, desired_leverage, trade_type))
                    row = cursor.fetchone()
                    conn.commit()
                    print(f"✅ Yeni kayıt: {symbol}, lev={desired_leverage}, margin={desired_margin_type}")

                    await _apply_binance_sync(api_key, private_key, symbol, trade_type, desired_margin_type, desired_leverage)

                else:
                    update_needed = False

                    # Margin değişti mi?
                    if row["margin_type"] != desired_margin_type:
                        row["margin_type"] = desired_margin_type
                        update_needed = True

                    # Leverage değişti mi?
                    if row["leverage"] != desired_leverage:
                        print(f"🔄 {symbol} için leverage DB={row['leverage']} → Emir={desired_leverage}")
                        row["leverage"] = desired_leverage
                        update_needed = True

                    if update_needed:
                        cursor.execute("""
                            UPDATE user_symbol_settings
                            SET margin_type=%s, leverage=%s, updated_at=now()
                            WHERE id=%s
                            RETURNING *
                        """, (row["margin_type"], row["leverage"], row["id"]))
                        row = cursor.fetchone()
                        conn.commit()

                        # Binance üzerinde güncelle
                        await _apply_binance_sync(api_key, private_key, symbol, trade_type, row["margin_type"], row["leverage"])

                return row

    except Exception as e:
        logger.error(f"❌ sync_margin_leverage hatası: {str(e)}")
        return {}


async def _apply_binance_sync(api_key: str, private_key: str, symbol: str, trade_type: str,
                              margin_type: bool, leverage: int, conn=None, row_id=None):
    """
    Binance üzerinde margin_type ve leverage günceller.
    Eğer Binance güncellemesi başarısız olursa DB eski haline döndürülür.
    """
    try:
        margin_result = await update_margin_type(api_key, private_key, symbol, trade_type, margin_type)
        leverage_result = await update_leverage(api_key, private_key, symbol, trade_type, leverage)

        if margin_result.get("success") and leverage_result.get("success"):
            print(f"✅ Binance sync başarılı: {symbol} margin={margin_type}, leverage={leverage}")
            return True
        else:
            error_msg = f"⚠️ Binance sync hatalı: {symbol} - " \
                        f"Margin: {margin_result.get('message')} / Leverage: {leverage_result.get('message')}"
            logger.error(error_msg)

            # Eğer DB bağlantısı ve satır id'si verilmişse rollback yap
            if conn and row_id:
                with conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                        cursor.execute("""
                            UPDATE user_symbol_settings
                            SET updated_at=now()
                            WHERE id=%s
                        """, (row_id,))
                        conn.commit()
                logger.warning(f"↩️ DB rollback yapıldı (id={row_id})")

            return False

    except Exception as e:
        logger.error(f"❌ Binance sync exception: {str(e)}")

        # Rollback fallback
        if conn and row_id:
            try:
                with conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                        cursor.execute("""
                            UPDATE user_symbol_settings
                            SET updated_at=now()
                            WHERE id=%s
                        """, (row_id,))
                        conn.commit()
                logger.warning(f"↩️ DB rollback yapıldı (id={row_id})")
            except Exception as db_err:
                logger.error(f"❌ Rollback sırasında hata: {db_err}")

        return False


# ✅ Test verisi - status ile
async def last_trial():
    testttt = {
        "111": [
            {
                "status": "success",  # ✅ Kontrolde kullanılır ama API'ye gönderilmez
                "trade_type": "test_spot",
                "coin_id": "BTCUSDT",
                "side": "buy",
                "order_type": "MARKET",
                "value": 100.0
            },
            {
                "status": "error",  # ❌ Bu emir atlanacak
                "trade_type": "test_futures",
                "coin_id": "ETHUSDT",
                "side": "buy",
                "order_type": "MARKET",
                "value": 200.0,
                "positionside": "BOTH"
            },
            {
                "status": "success",  # ✅ Kontrolde geçer, API'ye status gönderilmez
                "trade_type": "test_futures",
                "coin_id": "BTCUSDT",
                "side": "buy",
                "order_type": "MARKET",
                "value": 500.0,
                "positionside": "BOTH"
            }
        ]
    }
    
    await start_connection_pool()
    cache_ready = await wait_for_cache_ready(timeout_seconds=15)
    result = await send_order(await prepare_order_data(testttt))
    
    print("📊 Sonuçlar:", result)





async def save_successful_trade(bot_id: int, trade_result: dict, order_params: dict) -> bool:
    """
    Başarılı trade'i veritabanına kaydeder
    """
    try:
        # User ID'yi al
        user_id = await get_user_id_by_bot_id(bot_id)
        if not user_id:
            logger.warning(f"⚠ Bot {bot_id} için user_id bulunamadı")
            return False
        
        return await save_trade_to_db(
            bot_id=bot_id,
            user_id=user_id,
            trade_result=trade_result,
            order_params=order_params
        )
        
    except Exception as e:
        logger.error(f"❌ DB kayıt hatası (Bot {bot_id}): {str(e)}")
        return False

import traceback
from datetime import datetime
from psycopg2.extras import RealDictCursor
# Diğer gerekli importlarınız...

import asyncpg
from datetime import datetime
import traceback

async def save_trade_to_db(bot_id: int, user_id: int, trade_result: dict, order_params: dict) -> bool:
    """
    Bir emri veritabanına İLK KEZ kaydeder.
    Market emirleri için anlık fiyatı çeker.
    'updated_at' kolonu kullanmaz.
    Veritabanı bağlantısını kendi içinde yönetir.
    """
    order_id_log = trade_result.get("orderId", "N/A") # Loglama için
    try:
        if "error" in trade_result:
            logger.warning(f"⚠ Hatalı emir kaydedilmeyecek: {trade_result.get('error')}")
            return False

        # --- Gerekli verileri al ---
        symbol = trade_result.get("symbol", "")
        order_id = str(trade_result.get("orderId", ""))
        status = trade_result.get("status", "NEW")
        order_type = trade_result.get("origType", "MARKET").upper()
        side = trade_result.get("side", "").lower()
        
        trade_type = order_params.get("trade_type", "spot")
        db_trade_type = trade_type.replace("test_", "")
        position_side = order_params.get("positionside", "both").lower()
        leverage = float(order_params.get("leverage", 1))
        amount = float(order_params.get("amount", 0))

        # --- Fiyatı Akıllıca Belirle ---
        price = float(trade_result.get("price") or 0.0)
        
        if order_type == "MARKET" and price <= 0:
            logger.info(f"Market emri (ID: {order_id}) için anlık fiyat çekiliyor: {symbol}")
            live_price = await get_price(symbol, db_trade_type)
            if live_price and live_price > 0:
                price = live_price
                logger.info(f"Anlık fiyat bulundu: {price}")
            else:
                logger.warning(f"{symbol} için anlık fiyat alınamadı, 0 olarak kaydedilecek.")

        # --- Başlangıç Değerlerini Ayarla ---
        fee = Decimal("0.0")
        amount_state = Decimal("0.0")

        # === VERİTABANI INSERT İŞLEMİ ===
        # DEĞİŞİKLİK: 'pool' artık parametre olarak beklenmiyor, fonksiyon içinde alınıyor.
        pool = await get_async_pool()
        if not pool:
            logger.error("❌ Veritabanı bağlantı havuzu alınamadı (save_trade_to_db)")
            return False

        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO public.bot_trades (
                    bot_id, user_id, created_at, symbol, side, amount, fee, order_id, status,
                    trade_type, position_side, price, amount_state, leverage
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (user_id, order_id) DO NOTHING;
            """,
            bot_id,
            user_id,
            datetime.now(),
            symbol,
            side,
            amount,
            fee,
            order_id,
            status,
            db_trade_type,
            position_side,
            price,
            amount_state,
            leverage
            )
        
        logger.info(f"✅ Trade İLK KEZ kaydedildi: Order ID {order_id} | Price: {price} | Status: {status}")
        return True

    except Exception as e:
        logger.error(f"❌ Trade ilk kayıt hatası (Order ID: {order_id_log}): {e}")
        logger.debug(f"🔍 Detaylı hata: {traceback.format_exc()}")
        return False

async def last_trial():
    testttt= {
        "112": [
            {
                "trade_type": "test_futures",
                "coin_id": "BTCUSDT",
                "side": "buy",
                "order_type": "LIMIT",
                "value": 108700,
                "price": 3000,
                "positionside": "long",  # ✅ Kullanıcı "long" gönderdi, DB'ye "long" kaydedilir, Binance'e "BOTH"
                "timeInForce": "GTC",
                "leverage": 3,
            },
            {
                "trade_type": "test_futures",
                "coin_id": "BTCUSDT",
                "side": "sell",
                "order_type": "MARKET",
                "value": 500.0,
               "positionside": "long"  # ✅ Kullanıcı "long" gönderdi, DB'ye "long" kaydedilir, Binance'e "BOTH"
            },
            {
                "trade_type": "test_futures",
                "coin_id": "ETHUSDT",
                "side": "sell",
                "order_type": "LIMIT",
                "value": 300.0,
                "price": 3500.124566,
                "positionside": "short",  # ✅ Kullanıcı "short" gönderdi, DB'ye "short" kaydedilir, Binance'e "BOTH"
                "timeInForce": "GTC"
            },
             {
                "trade_type": "test_futures",
                "coin_id": "BTCUSDT",
                "side": "buy",
                "order_type": "MARKET",
                "value": 250.0,
                "positionside": "both"  # ✅ Kullanıcı "both" gönderdi, DB'ye "both" kaydedilir, Binance'e "BOTH"
            },
            {
                "trade_type": "test_futures",
                "coin_id": "ADAUSDT",
                "side": "buy",
                "order_type": "LIMIT",
                "value": 150.0,
                "price": 0.85,
                "positionside": "long",  # ✅ Kullanıcı "long" gönderdi, DB'ye "long" kaydedilir, Binance'e "BOTH"
                "timeInForce": "GTC"
            }
        ]
        
           
        
    }
    test_one ={"120": [
            
              {
                 "coin_id": "SOLUSDT",
            "trade_type": "spot",
            "side": "buy",
            "status": "success",
            "order_type": "market",
            "take_profit": 212.15,
            "value": 10,
            #"leverage": 2,
            #"positionside": "long",

                
            }
        ]
    }
    await start_connection_pool()
        
        # Cache'in hazır olmasını bekle
    cache_ready = await wait_for_cache_ready(timeout_seconds=15)
    result=await send_order(await prepare_order_data(test_one))

if __name__ == "__main__":

    # Logger ayarları
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    # Ana test fonksiyonunu çalıştır
    asyncio.run(last_trial())
    