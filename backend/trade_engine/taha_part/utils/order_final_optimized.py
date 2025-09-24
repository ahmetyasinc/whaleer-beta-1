# Standart kütüphaneler
from datetime import datetime
import time, asyncio, aiohttp, logging, json, os, traceback
from typing import Optional, Dict, List
from decimal import Decimal
from backend.trade_engine.config import get_db_connection
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
    Hazırlanan emirleri Binance API'ye gönderir ve başarılı olanları DB'ye kaydeder
    Ayrıca her emir için Telegram bildirimi atar:
      - Başarılı: işlem detayı
      - Hatalı: hata olduğunu bildirir, ham hata içeriğini paylaşmaz
    """
    try:
        responses = {
            "spot": [],
            "test_spot": [],
            "futures": [],
            "test_futures": []
        }

        for trade_type, orders in prepared_orders.items():
            if not orders:
                continue

            for order in orders:
                try:
                    # API bilgileri ve parametreler
                    api_key = order["api_key"]
                    private_key = order["private_key"]
                    params = order.get("params", {}).copy()
                    order_trade_type = order.get("trade_type")
                    original_order = order.get("original_order", {})  # Orijinal (DB/log) veri
                    bot_id = order.get("bot_id")  # Bildirim için gerekli

                    # API'ye gitmeyecek dahili anahtarları temizle
                    api_params = params.copy()
                    for k in ["bot_id", "original_order", "trade_type"]:
                        if k in api_params:
                            del api_params[k]

                    # Timestamp ve imza
                    api_params["timestamp"] = int(time.time() * 1000)
                    payload = "&".join(f"{k}={v}" for k, v in api_params.items())
                    signature = await _create_signature(private_key, payload, order_trade_type)
                    api_params["signature"] = signature

                    # URL/Headers
                    api_url = API_URLS.get(order_trade_type)
                    if not api_url:
                        raise ValueError(f"Geçersiz trade_type: {order_trade_type}")

                    headers = {
                        "X-MBX-APIKEY": api_key,
                        "Content-Type": "application/x-www-form-urlencoded"
                    }

                    async with aiohttp.ClientSession() as session:
                        async with session.post(api_url, headers=headers, data=api_params) as response:
                            if response.status == 200:
                                trade_result = await response.json()
                                responses[trade_type].append(trade_result)

                                # Konsol bilgi
                                symbol = trade_result.get('symbol', 'N/A')
                                side = trade_result.get('side', 'N/A')
                                order_id = trade_result.get('orderId', 'N/A')
                                status = trade_result.get('status', 'N/A')
                                print(f"    💰 {symbol} {side} - Order ID: {order_id} - Status: {status}")

                                # DB kayıt (mevcut akış)
                                if bot_id:
                                    db_params = original_order.copy()
                                    db_params.update({
                                        "symbol": symbol,
                                        "side": side,
                                        "quantity": api_params.get("quantity"),
                                        "price": api_params.get("price")
                                    })
                                    db_saved = await save_successful_trade(
                                        bot_id=int(bot_id),
                                        trade_result=trade_result,
                                        order_params=db_params
                                    )
                                    if db_saved:
                                        print(f"      💾 DB'ye kaydedildi")
                                    else:
                                        print(f"      ❌ DB kayıt başarısız")

                                print(f"✅ {trade_type} emri başarıyla gönderildi")

                                # ✅ Telegram: Başarı bildirimi (gizli olmayan bilgiler)
                                try:
                                    if bot_id:
                                        price_line = ""
                                        if api_params.get("price"):
                                            price_line = f"\n💵 Fiyat: <b>{api_params.get('price')}</b>"
                                        qty_line = f"<b>{api_params.get('quantity','N/A')}</b>" if api_params.get("quantity") else "N/A"
                                        order_type = (original_order.get('order_type') or api_params.get('type') or 'N/A')
                                        msg = (
                                            f"✅ <b>Emir Başarıyla Gerçekleşti</b>\n\n"
                                            f"🤖 Bot: <b>#{bot_id}</b>\n"
                                            f"📈 Sembol: <b>{symbol}</b>\n"
                                            f"↔️ Yön: <b>{side}</b>\n"
                                            f"🧾 Tür: <b>{str(order_type).upper()}</b>\n"
                                            f"🔢 Miktar: {qty_line}"
                                            f"{price_line}\n"
                                            f"🆔 Order ID: <code>{order_id}</code>\n"
                                            f"📊 Durum: <b>{status}</b>\n\n"
                                            f"ℹ️ Detayları Whaleer panelinden görüntüleyebilirsiniz."
                                        )
                                        await notify_user_by_telegram(text=msg, bot_id=int(bot_id))
                                except Exception as _tel_err:
                                    logger.warning(f"Telegram başarı bildirimi gönderilemedi: {str(_tel_err)}")

                            else:
                                error_text = await response.text()
                                logger.error(f"❌ {trade_type} API hatası: {response.status} - {error_text}")
                                responses[trade_type].append({
                                    "error": f"HTTP {response.status}: {error_text}"
                                })

                                # ❗ Telegram: Hata bildirimi (ham hata içeriği paylaşmadan)
                                try:
                                    if bot_id:
                                        # Oluşturulmak istenen emir bilgisi
                                        symbol = original_order.get("coin_id", "N/A")
                                        side = str(original_order.get("side", "N/A")).upper()
                                        order_type = str(original_order.get("order_type", "N/A")).upper()
                                        qty = api_params.get("quantity") or original_order.get("value", "N/A")
                                        price_line = ""
                                        # LIMIT/STOP gibi durumlarda kullanıcıya fiyatı da gösterebiliriz
                                        p = api_params.get("price") or original_order.get("price")
                                        if p:
                                            price_line = f"\n💵 Hedef Fiyat: <b>{p}</b>"

                                        msg = (
                                            f"⚠️ <b>Emir İşlenemedi</b>\n\n"
                                            f"🤖 Bot: <b>#{bot_id}</b>\n"
                                            f"📈 Sembol: <b>{symbol}</b>\n"
                                            f"↔️ Yön: <b>{side}</b>\n"
                                            f"🧾 Tür: <b>{order_type}</b>\n"
                                            f"🔢 Hedef Miktar: <b>{qty}</b>"
                                            f"{price_line}\n\n"
                                            f"❗ Bir hata oluştu. Lütfen emrinizi ve bakiye/izin ayarlarınızı kontrol edin."
                                            f" Gerekirse <a href=\"https://whaleer.com/support\">Destek</a> kanalımızdan bize ulaşabilirsiniz. 🙏"
                                        )
                                        await notify_user_by_telegram(text=msg, bot_id=int(bot_id))
                                except Exception as _tel_err:
                                    logger.warning(f"Telegram hata bildirimi gönderilemedi: {str(_tel_err)}")

                except Exception as e:
                    logger.error(f"❌ {trade_type} emri işlenirken hata: {str(e)}")
                    responses[trade_type].append({"error": str(e)})

                    # ❗ Telegram: Beklenmeyen exception - kullanıcıya ham hata vermeden bildir
                    try:
                        bot_id = order.get("bot_id")
                        if bot_id:
                            symbol = (order.get("original_order") or {}).get("coin_id") or (order.get("params") or {}).get("symbol") or "N/A"
                            side = (order.get("original_order") or {}).get("side") or (order.get("params") or {}).get("side") or "N/A"
                            order_type = (order.get("original_order") or {}).get("order_type") or (order.get("params") or {}).get("type") or "N/A"
                            qty = (order.get("params") or {}).get("quantity") or (order.get("original_order") or {}).get("value") or "N/A"
                            price_line = ""
                            p = (order.get("params") or {}).get("price") or (order.get("original_order") or {}).get("price")
                            if p:
                                price_line = f"\n💵 Hedef Fiyat: <b>{p}</b>"

                            msg = (
                                f"⚠️ <b>Emir İşleme Alınamadı</b>\n\n"
                                f"🤖 Bot: <b>#{bot_id}</b>\n"
                                f"📈 Sembol: <b>{symbol}</b>\n"
                                f"↔️ Yön: <b>{str(side).upper()}</b>\n"
                                f"🧾 Tür: <b>{str(order_type).upper()}</b>\n"
                                f"🔢 Hedef Miktar: <b>{qty}</b>"
                                f"{price_line}\n\n"
                                f"❗ Bir hata oluştu. Lütfen emrinizi ve bakiye/izin ayarlarınızı kontrol edin."
                                f" Gerekirse <a href=\"https://whaleer.com/profile/support\">Destek</a> kanalımızdan bize ulaşabilirsiniz. 🙏"
                            )
                            await notify_user_by_telegram(text=msg, bot_id=int(bot_id))
                    except Exception as _tel_err:
                        logger.warning(f"Telegram exception bildirimi gönderilemedi: {str(_tel_err)}")
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

async def main():
    """
    Ana test fonksiyonu - order_final_optimized.py için comprehensive test
    """
    print("=" * 60)
    print("🚀 ORDER FINAL OPTIMIZED TEST BAŞLATIYOR")
    print("=" * 60)
    
    try:
        # Price cache'i başlat
        from trade_engine.taha_part.utils.price_cache_new import start_connection_pool, wait_for_cache_ready
        
        print("🔄 Price cache başlatılıyor...")
        await start_connection_pool()
        
        # Cache'in hazır olmasını bekle
        cache_ready = await wait_for_cache_ready(timeout_seconds=15)
        
        if not cache_ready:
            print("❌ Price cache hazır değil, test atlanıyor")
            return
        
        print("✅ Price cache hazır - test başlıyor")
        await asyncio.sleep(2)
        
        # Test senaryoları - gerçek veri formatı
        test_scenarios = [
            {
                "name": "Spot Market Order Test",
                "data": {
                    "111": [
                        {
                            "trade_type": "test_spot",
                            "coin_id": "BTCUSDT",
                            "side": "buy",
                            "order_type": "MARKET",
                            "value": 50.0
                        }
                    ]
                }
            },
            {
                "name": "Futures Market Order Test",
                "data": {
                    "111": [
                        {
                            "trade_type": "test_futures",
                            "coin_id": "BTCUSDT",
                            "side": "buy",
                            "order_type": "MARKET",
                            "value": 200.0,
                            "positionside": "BOTH",
                            "leverage": 15,
                            "margin_type": True  # Boolean - ISOLATED
                        }
                    ]
                }
            },
            {
                "name": "Mixed Orders Test",
                "data": {
                    "111": [
                        {
                            "trade_type": "test_spot",
                            "coin_id": "ETHUSDT",
                            "side": "buy",
                            "order_type": "MARKET",
                            "value": 75.0
                        },
                        {
                            "trade_type": "test_futures",
                            "coin_id": "ETHUSDT",
                            "side": "sell",
                            "order_type": "MARKET",
                            "value": 150.0,
                            "positionside": "BOTH",
                            "leverage": 20,
                            "margin_type": False  # Boolean - CROSSED
                        }
                    ]
                }
            },
            {
                "name": "Limit Order Test",
                "data": {
                    "111": [
                        {
                            "trade_type": "test_spot",
                            "coin_id": "ADAUSDT",
                            "side": "buy",
                            "order_type": "LIMIT",
                            "value": 25.0,
                            "price": 0.35,
                            "timeInForce": "GTC"
                        }
                    ]
                }
            },
            {
                "name": "Multi-Bot Test",
                "data": {
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
                            "positionside": "long",  # ✅ DB'ye "long" kaydedilir, Binance'e "BOTH"
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
                            "positionside": "short",  # ✅ DB'ye "short" kaydedilir, Binance'e "BOTH"
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
                            "positionside": "both",  # ✅ DB'ye "both" kaydedilir, Binance'e "BOTH"
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
                            "positionside": "long",  # ✅ DB'ye "long" kaydedilir, Binance'e "BOTH"
                            "timeInForce": "GTC",
                            "leverage": 25,
                            "margin_type": False  # Boolean - CROSSED
                        }
                    ]
                }
            }
        ]
        
        # Her test senaryosunu çalıştır
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\n📋 TEST {i}: {scenario['name']}")
            print("-" * 40)
            
            # Emirleri hazırla
            print("🔧 Emirler hazırlanıyor...")
            prepared_orders = await prepare_order_data(scenario['data'])
            
            if not prepared_orders:
                print("❌ Hiç emir hazırlanamadı!")
                continue
            
            # Hazırlanan emirleri göster
            total_prepared = sum(len(orders) for orders in prepared_orders.values())
            print(f"✅ {total_prepared} emir hazırlandı")
            
            for trade_type, orders in prepared_orders.items():
                if orders:
                    print(f"  • {trade_type}: {len(orders)} emir")
            
            # Emirleri gönder
            print("📤 Emirler gönderiliyor...")
            results = await send_order(prepared_orders)
            
            # Sonuçları analiz et
            await _analyze_results(results, scenario['name'])
            
            # Test arasında bekle
            print("⏳ Bir sonraki test için bekleniyor...")
            await asyncio.sleep(3)
        
        # Genel özet - DB kontrolü kaldırıldı
        print("\n" + "=" * 60)
        print("🎯 TEST TAMAMLANDI - DB kayıt işlemi kaldırıldı")
        print("=" * 60)
        
        print("💡 Tüm emirler sadece API'ye gönderildi")
        print("💡 DB kayıt özelliği daha sonra tekrar eklenecek")
        
    except Exception as e:
        print(f"❌ Test sırasında hata: {str(e)}")
        traceback.print_exc()


async def _analyze_results(results: dict, scenario_name: str) -> None:
    """
    Test sonuçlarını analiz eder ve detaylı rapor verir
    
    Args:
        results (dict): API sonuçları
        scenario_name (str): Test senaryosu adı
    """
    try:
        print(f"\n📊 {scenario_name} - Sonuç Analizi:")
        print("-" * 30)
        
        total_success = 0
        total_error = 0
        
        for trade_type, responses in results.items():
            if not responses:
                continue
                
            success_count = sum(1 for r in responses if "error" not in r)
            error_count = sum(1 for r in responses if "error" in r)
            
            total_success += success_count
            total_error += error_count
            
            if success_count > 0 or error_count > 0:
                print(f"  • {trade_type}:")
                print(f"    ✅ Başarılı: {success_count}")
                print(f"    ❌ Hatalı: {error_count}")
                
                # Hata detaylarını göster
                for response in responses:
                    if "error" in response:
                        print(f"    🔴 Hata: {response['error']}")
                    elif "orderId" in response:
                        symbol = response.get("symbol", "N/A")
                        side = response.get("side", "N/A")
                        quantity = response.get("executedQty", response.get("origQty", "N/A"))
                        print(f"    🟢 Başarılı: {symbol} {side} {quantity}")
        
        # Genel özet
        total_orders = total_success + total_error
        success_rate = (total_success / total_orders * 100) if total_orders > 0 else 0
        
        print(f"\n📈 Genel Özet:")
        print(f"  • Toplam Emir: {total_orders}")
        print(f"  • Başarılı: {total_success}")
        print(f"  • Hatalı: {total_error}")
        print(f"  • Başarı Oranı: {success_rate:.1f}%")
        
    except Exception as e:
        logger.error(f"❌ Sonuç analizi hatası: {str(e)}")
        print(f"❌ Sonuç analizi hatası: {str(e)}")


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

async def save_trade_to_db(bot_id: int, user_id: int, trade_result: dict, order_params: dict) -> bool:
    """
    Trade'i DB'ye kaydeder.
    Komisyonu her zaman USDT'ye çevirerek kaydeder.
    """
    try:
        if "error" in trade_result:
            logger.warning(f"⚠ Hatalı emir kaydedilmeyecek: {trade_result.get('error')}")
            return False

        symbol = trade_result.get("symbol", "")
        side = trade_result.get("side", "").lower()
        order_id = str(trade_result.get("orderId", ""))
        status = trade_result.get("status", "FILLED")
        requested_qty = float(order_params.get("amount", 0))
        executed_qty = float(trade_result.get("executedQty", 0) or trade_result.get("origQty", 0))
        trade_type = order_params.get("trade_type", "spot")
        normalized_trade_type = "spot" if trade_type in ["spot", "test_spot"] else "futures"

        current_price = await get_price(symbol, normalized_trade_type)
        if not current_price or current_price <= 0:
            current_price = float(
                trade_result.get("price")
                or trade_result.get("avgPrice")
                or order_params.get("price", 0.0)
            )
            logger.warning(f"⚠ {symbol} için price cache fallback: {current_price}")

        # ================================================================= #
        # YENİ EKLENEN KOMİSYON DÖNÜŞTÜRME BÖLÜMÜ BAŞLANGICI                  #
        # ================================================================= #

        # 1. Komisyon miktarını ve birimini al
        commission_amount = 0.0
        commission_asset = ""

        if trade_result.get("fills"):
            # 'fills' varsa, içindeki tüm komisyonları topla ve ilk birimi baz al
            commission_amount = sum(float(fill.get("commission", 0)) for fill in trade_result.get("fills", []))
            if trade_result["fills"]:
                commission_asset = trade_result["fills"][0].get("commissionAsset", "")
        else:
            # 'fills' yoksa, ana yanıttan al
            commission_amount = float(trade_result.get("commission", 0) or 0.0)
            commission_asset = trade_result.get("commissionAsset", "")

        commission_in_usdt = commission_amount

        # 2. Eğer birim USDT değilse ve komisyon miktarı sıfırdan büyükse, çevir
        if commission_asset and commission_asset.upper() != "USDT" and commission_amount > 0:
            try:
                # Örn: BNB ise "BNBUSDT" paritesinin fiyatını al
                conversion_symbol = f"{commission_asset.upper()}USDT"
                
                # Fiyatı price_cache'den al (market_type='spot' çünkü komisyon varlıkları spot'ta işlem görür)
                price = await get_price(conversion_symbol, "spot")

                if price and price > 0:
                    commission_in_usdt = commission_amount * price
                    logger.info(f"💰 Komisyon dönüştürüldü: {commission_amount} {commission_asset} -> {commission_in_usdt:.6f} USDT (Fiyat: {price})")
                else:
                    logger.warning(f"⚠️ {conversion_symbol} için fiyat alınamadı. Komisyon orijinal değeriyle kaydedilecek.")
            except Exception as e:
                logger.error(f"❌ Komisyon dönüştürme hatası: {str(e)}. Komisyon orijinal değeriyle kaydedilecek.")
        

        db_trade_type = trade_type.replace("test_", "")
        position_side = None
        leverage = order_params.get("leverage", 1)

        if normalized_trade_type == "futures":
            user_position_side = order_params.get("positionside", "both").lower()
            position_side = user_position_side
            
            # API ID'sini almak için api_credentials'a erişim gerekebilir.
            # Bu örnekte order_params içinde olduğunu varsayıyoruz.
            api_id = order_params.get("api_id") 
            if api_id:
                conn = get_db_connection()
                with conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                        cursor.execute("""
                            SELECT leverage FROM user_symbol_settings
                            WHERE user_id=%s AND api_id=%s AND symbol=%s AND trade_type=%s
                        """, (user_id, api_id, symbol, db_trade_type))
                        row = cursor.fetchone()
                        if row:
                            leverage = row["leverage"]

        conn = get_db_connection()
        if not conn:
            logger.error("❌ Veritabanı bağlantısı alınamadı")
            return False

        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                insert_query = """
                    INSERT INTO bot_trades (
                        user_id, bot_id, created_at, symbol, side, amount,
                        fee, order_id, status, trade_type, position_side,
                        price, amount_state, leverage
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """
                unlevered_qty = float(requested_qty) / float(leverage or 1)

                params = (
                    user_id,
                    bot_id,
                    datetime.now(),
                    symbol,
                    side,
                    unlevered_qty,
                    commission_in_usdt, # <-- BURASI GÜNCELLENDİ
                    order_id,
                    status,
                    db_trade_type,
                    position_side,
                    current_price,
                    unlevered_qty, # BURAYI WEBSOCKET DÜZENLEYECEK
                    leverage
                )

                cursor.execute(insert_query, params)
                conn.commit()

        logger.info(
            f"✅ Trade kaydedildi: {symbol} | {side} | Amount: {requested_qty} "
            f"| Fee (USDT): {commission_in_usdt:.6f} | Order ID: {order_id}"
        )
        return True

    except Exception as e:
        logger.error(f"❌ Trade kaydetme hatası: {str(e)}")
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
                "trade_type": "futures",
                "coin_id": "SOLUSDT",
                "side": "buy",
                "order_type": "MARKET",
                "value": 15.0,
                "leverage": 4
                
            }
        ]
        
           
        
    }
    await start_connection_pool()
        
        # Cache'in hazır olmasını bekle
    cache_ready = await wait_for_cache_ready(timeout_seconds=15)
    result=await send_order(await prepare_order_data(test_one))

if __name__ == "__main__":
    import asyncio
    import logging
    
    # Logger ayarları
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    # Ana test fonksiyonunu çalıştır
    asyncio.run(last_trial())
    