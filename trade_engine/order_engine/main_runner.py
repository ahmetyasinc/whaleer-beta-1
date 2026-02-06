import asyncio
import logging
import sys

# Windows Fix (Windows kullanıyorsan gerekli)
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# --- Importlar ---
from trade_engine.order_engine.core.order_execution_service import OrderExecutionService, OrderRequest
from trade_engine.order_engine.exchanges.binance.stream import BinanceStreamer
from trade_engine.order_engine.core.price_store import price_store
#from data_access.file.order_log_writer import OrderLogWriter

# DB & Config
# DİKKAT: get_async_pool fonksiyonunun config.py içinde tanımlı olduğundan emin ol
from trade_engine.config import close_async_pool, get_async_pool

# Test amaçlı
from trade_engine.order_engine.exchanges.binance.arregements.futures_arragements import FuturesGuard

# Log Ayarları
DEBUG_MODE = False  # <-- Test ederken TRUE yap, normalde FALSE

logging.basicConfig(
    # Debug modu açıksa DEBUG, değilse INFO seviyesinde çalış
    level=logging.DEBUG if DEBUG_MODE else logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logging.getLogger("websockets").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)

logger = logging.getLogger("MultiBotRunner")

# =========================================================
# JSON ADAPTER (VERİ DÖNÜŞTÜRÜCÜ)
# =========================================================
def parse_json_to_orders(raw_data: dict) -> list[OrderRequest]:
    order_requests = []
    for bot_id_str, orders_list in raw_data.items():
        try:
            bot_id = int(bot_id_str)
        except ValueError:
            continue

        for item in orders_list:
            try:
                # 1. Position Side (Futures için)
                # "positionside" yoksa ve futures ise varsayılan BOTH (One-way) olsun
                p_side = item.get("positionside")
                if not p_side and "futures" in item.get("trade_type", "futures"):
                    p_side = "BOTH" 

                # 2. Değerleri Güvenli Okuma (Helper Variables)
                _price = float(item["price"]) if item.get("price") else None
                _callback_rate = float(item["callbackRate"]) if item.get("callbackRate") else None
                
                # reduceOnly genelde boolean gelir ama string "true" gelirse diye önlem
                _reduce_only = item.get("reduceOnly", False)
                if isinstance(_reduce_only, str):
                    _reduce_only = _reduce_only.lower() == "true"

                # --- ESKİ & YENİ PARAMETRE EŞLEMESİ (Mapping) ---
                # Kullanıcı JSON'da 'stopPrice' (Eski) veya 'triggerPrice' (Yeni) gönderebilir.
                # İkisini de kontrol et, hangisi varsa onu al.
                raw_stop_price = item.get("stopPrice") or item.get("triggerPrice")
                _stop_price = float(raw_stop_price) if raw_stop_price else None

                # workingType parametresi için de aynısını yapalım (CamelCase veya snake_case)
                raw_working_type = item.get("workingType") or item.get("working_type")
                _working_type = raw_working_type if raw_working_type else "CONTRACT_PRICE"

                req = OrderRequest(
                    bot_id=bot_id,
                    symbol=item.get("coin_id"),
                    side=item.get("side").upper(),
                    amount_usd=float(item.get("value")),
                    trade_type=item.get("trade_type", "futures"),
                    order_type=item.get("order_type", "MARKET").upper(),
                    leverage=int(item.get("leverage", 1)),
                    
                    # --- FİYAT VE ZAMANLAMALAR ---
                    price=_price,
                    stop_price=_stop_price, # Artık hem eskiyi hem yeniyi kapsıyor
                    time_in_force=item.get("timeInForce", "GTC"),
                    
                    # --- POZİSYON DETAYLARI ---
                    position_side=p_side.upper() if p_side else None,
                    reduce_only=_reduce_only,
                    
                    # --- GELİŞMİŞ EMİR TİPLERİ ---
                    callback_rate=_callback_rate,
                    working_type=_working_type 
                )
                order_requests.append(req)
            except Exception as e:
                logger.error(f"Parse Error (Bot {bot_id}): {e}")
    return order_requests

# =========================================================
# 🏁 MAIN MULTI-BOT TEST
# =========================================================
async def main():
    logger.info("🔥 MULTI-BOT TESTİ BAŞLATILIYOR...")

    # ---------------------------------------------------------
    # ADIM 1: DB BAĞLANTISI VE CACHE PRE-WARMING (KRİTİK ADIM)
    # ---------------------------------------------------------
    try:
        logger.info("⚙️ Veritabanı bağlantısı kuruluyor...")
        pool = await get_async_pool()
        
        logger.info("♻️ Futures Cache (Ayarlar) DB'den RAM'e yükleniyor...")
        # Singleton olan state_manager üzerinden yükleme yapıyoruz.
        # Bu sayede bot emir atarken API'ye gitmek zorunda kalmayacak.
        await FuturesGuard.state_manager.load_state_from_db(pool)
        
    except Exception as e:
        logger.critical(f"⚠️ Cache Yükleme veya DB Hatası: {e}", exc_info=True)
        # Hata olsa bile devam etmek istersen burayı pass geçebilirsin
        # ama cache boş olacağı için ilk emirler yavaş olur.

    # ---------------------------------------------------------
    # ADIM 2: SENARYO VERİSİ (JSON SİMÜLASYONU)
    # ---------------------------------------------------------
    # Burada test etmek istediğin senaryoları tanımlıyorsun.
    """
    multi_bot_data = {
        
        "120": [ 
            # --- TEST 1: Futures LIMIT LONG (Deftere Yazdırma) ---
            # Mevcut fiyatın çok altına yazıyoruz ki "Open Orders"ta beklesin.
            {
                "trade_type": "futures",
                "coin_id": "SOLUSDT",
                "side": "buy",
                "order_type": "STOP_MARKET",
                "value": 20.0,
                "leverage": 2,
                "stopPrice": 150.0,      # Tetikleyici Fiyat
                "workingType": "MARK_PRICE",
                "positionside": "long"
            },
            ]
    }
    """
    # ...
    multi_bot_data = {
        "120": [ 
             {
         "trade_type": "futures",
        "coin_id": "BTCUSDT",
        "side": "buy",
        "order_type": "LIMIT",
        "positionside": "long",
        "value": 21.0,
        "leverage": 9,
        "price": 66950,       # Limit Fiyatı
        "timeInForce": "GTC"
        

    },
        ]
    }
    # ...
    # ---------------------------------------------------------
    # ADIM 3: VERİYİ İŞLE VE SİSTEMİ KUR
    # ---------------------------------------------------------
    logger.info("🔄 JSON verisi işleniyor...")
    orders = parse_json_to_orders(multi_bot_data)
    if not orders:
        logger.warning("⚠️ Hiç emir oluşturulmadı! JSON verisini kontrol et.")
    else:
        logger.info(f"✅ Toplam {len(orders)} emir kuyruğa hazırlandı. (Bot ID'ler: {[o.bot_id for o in orders]})")

    # ---------------------------------------------------------
    # ADIM 4: FİYAT AKIŞINI BAŞLAT (STREAMER)
    # ---------------------------------------------------------
    unique_symbols = list(set(o.symbol for o in orders))
    # Hem spot hem futures streamlerini başlatıyoruz ki fiyat verisi RAM'de (PriceStore) olsun
    streamer = BinanceStreamer(spot_symbols=unique_symbols, futures_symbols=unique_symbols)
    asyncio.create_task(streamer.start())

    logger.info("⏳ Fiyatların (PriceStore) dolması bekleniyor (4 sn)...")
    await asyncio.sleep(4)

    # ---------------------------------------------------------
    # ADIM 5: ORDER ENGINE (MOTOR) BAŞLAT
    # ---------------------------------------------------------
    engine = OrderExecutionService()
    # İşçi sayılarını ihtiyaca göre ayarla
    await engine.start(futures_workers=5, spot_workers=2)

    # ---------------------------------------------------------
    # ADIM 6: EMİRLERİ GÖNDER
    # ---------------------------------------------------------
    logger.info("🚀 ÇOKLU EMİR GÖNDERİMİ BAŞLIYOR...")
    
    for i, req in enumerate(orders):
        # Emri motora ilet
        await engine.submit_order(req)
        
        # Loglama
        logger.info(f"📨 [BOT-{req.bot_id}] {req.symbol} {req.side} Kuyruğa İletildi")
        
        # Gerçekçilik için milisaniyelik farklar (opsiyonel)
        await asyncio.sleep(0.01)

    # ---------------------------------------------------------
    # ADIM 7: İZLEME VE KAPANIŞ
    # ---------------------------------------------------------
    logger.info("👀 Workerların işlemleri tamamlaması bekleniyor...")
    
    # İşlemlerin bitmesi için bir süre bekle (Test amaçlı)
    # Gerçek prodüksiyonda burası `while True` olabilir.
    for _ in range(10):
        await asyncio.sleep(1)

    logger.info("🛑 Kapanış işlemleri başlatılıyor...")
    await engine.stop()     # Motoru durdur
    streamer.stop()         # Stream'i kes
    await close_async_pool()# DB bağlantısını kapat
    logger.info("👋 Test Başarıyla Tamamlandı.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Kullanıcı tarafından durduruldu.")