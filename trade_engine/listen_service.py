import asyncio
import sys
import time
import psycopg
import asyncpg
import os
from trade_engine.order_engine.core.order_execution_service import OrderExecutionService, OrderRequest

from trade_engine.data.last_data_load import load_last_data
from trade_engine.process.trade_engine import run_trade_engine
# listen_service.py (üst importlara ekle)
from trade_engine.process.process import run_all_bots_async, handle_rent_expiry_closures  # NEW
from trade_engine.process.save import save_result_to_json, aggregate_results_by_bot_id    # NEW

# LOGGING DEFINITION
import logging
logger = logging.getLogger("StrategyEngine")

if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

supported_intervals = [
    "1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h",
    "6h", "8h", "12h", "1d", "3d", "1w", "1M"
]

# Kilitleri ve durumları (interval, market_type) ikilisiyle (key string olarak) yönetelim:
# Key formatı: "{interval}_{market_type}" örn: "1m_spot" veya "5m_futures"
# Bu sayede Spot ve Futures birbirini bloklamaz.

def get_key(interval, market_type):
    return f"{interval}_{market_type}"

# Tüm olası kombinasyonlar için lock oluşturabiliriz veya dinamik yönetebiliriz.
# Dinamik (defaultdict) veya demand-based daha esnek olur ama burada manuel tanımlayalım.
lock_keys = []
for i in supported_intervals:
    lock_keys.append(get_key(i, "spot"))
    lock_keys.append(get_key(i, "futures"))

interval_locks = {k: asyncio.Lock() for k in lock_keys}

# Öncelikli interval: 1m (Spot ve Futures için ayrı ayrı öncelik)
priority_intervals = {"spot": "1m", "futures": "1m"}
priority_locks = {"spot": asyncio.Lock(), "futures": asyncio.Lock()}

queued_keys = set()  # 🔐 Kuyrukta bekleyen işlem anahtarları
processed_timestamps = {}  # 🕒 Key -> Timestamp (Deduplication)

order_service = OrderExecutionService()

async def dispatch_orders_to_engine(result_dict):
    """
    Strateji sonuçlarını (result_dict) tarar, OrderRequest nesnelerine çevirir
    ve yeni Execution Service kuyruğuna atar.
    """
    if not result_dict:
        return

    logger.info(f"⚡ Emirler Order Engine v2'ye iletiliyor... (Toplam Bot: {len(result_dict)})")
    
    for bot_id, trades in result_dict.items():
        # trades listesi içindeki her bir işlem kararı için:
        # Not: result_dict yapısının {bot_id: [trade_obj, ...]} döndüğünü varsayıyoruz.
        # Eğer yapı {bot_id: {symbol: details}} ise döngüyü ona göre düzenleyin.
        
        # aggregate_results_by_bot_id çıktısının liste döndürdüğü senaryosu:
        iterator = trades if isinstance(trades, list) else [trades]
        
        for trade in iterator:
            # Trade objesi bir dict mi yoksa class mı kontrolü (genelde dict döner)
            # DÜZELTME: Gelen veri formatına göre key'ler güncellendi
            symbol = trade.get("coin_id") or trade.get("symbol")
            side = trade.get("side") or trade.get("signal")  # BUY / SELL
            amount = trade.get("value") or trade.get("amount", 0) # USD cinsinden değer
            
            # Trade tipi (varsayılan futures, bottan geliyorsa onu kullan)
            trade_type = trade.get("trade_type", "futures") 
            
            if not side or side == "NEUTRAL":
                continue

            # positionside (Binance Futures için önemli)
            position_side = trade.get("positionside") or trade.get("positionSide")
            
            # Order Type ve Price (Limit Emirler için)
            order_type = trade.get("order_type", "MARKET").upper()
            price = None
            if order_type in ["LIMIT", "STOP", "TAKE_PROFIT", "STOP_MARKET", "TAKE_PROFIT_MARKET"]:
                # Strateji bazen 'limit_price', bazen 'price' dönebilir
                val = trade.get("price") or trade.get("limit_price")
                if val:
                    price = float(val)

            # --- YENİ SİSTEME UYGUN ORDER REQUEST OLUŞTURMA ---
            req = OrderRequest(
                bot_id=int(bot_id),
                symbol=symbol,
                side=side.upper(),
                amount_usd=float(amount),   # 'value' (USD) buraya gelir
                amount_coin=float(trade.get("amount")) if trade.get("amount") is not None else None, # (YENİ) Explicit Coin Qty
                exchange_name="binance",    # İleride dinamik olabilir
                trade_type=trade_type,      # spot / futures
                leverage=int(trade.get("leverage", 1)),
                order_type=order_type,       
                price=price,                 
                reduce_only=trade.get("reduce_only", False),
                position_side=position_side, 
                # stop_price vs. eklenebilir eğer strateji veriyorsa
            )

            # Kuyruğa at (Fire and Forget)
            await order_service.submit_order(req)

async def handle_notification(notify):
    """
    Kanal ve payload bilgisine göre ilgili mantığı tetikler.
    """
    payload = notify.payload
    channel = notify.channel
    interval = payload.strip()

    # Kanal -> Market Tipi Eşleşmesi
    if channel == "new_data":
        market_type = "spot"
    elif channel == "new_futures_data":
        market_type = "futures"
    else:
        logger.warning(f"⚠ Bilinmeyen kanal: {channel}")
        return

    key = get_key(interval, market_type)
    
    # Dinamik olarak lock oluşturma (eğer listede yoksa)
    if key not in interval_locks:
        interval_locks[key] = asyncio.Lock()

    # Eğer zaten kuyruktaysa tekrar eklenmesin
    if key in queued_keys:
        logger.debug(f"🔁 {key} zaten sırada bekliyor.")
        return

    queued_keys.add(key)
    p_lock = priority_locks[market_type]
    p_interval = priority_intervals[market_type]

    # Öncelikli interval (1m) kontrolü (Kendi market tipinde)
    if interval == p_interval:
        if p_lock.locked():
             # Öncelikli işlem zaten çalışıyorsa kuyruğa alma, düşür
             # (Opsiyonel: Veya bekle? Mevcut mantık discard ediyor)
            logger.warning(f"❌❌❌ {key} (Öncelikli) zaten çalışıyor.")
            queued_keys.discard(key)
            return
        async with p_lock:
             await execute_bot_logic(interval, market_type)
    else:
        # Diğer intervaller, 1m çalışıyorsa bekler
        while p_lock.locked():
            logger.debug(f"⏸ {key} için bekleniyor... (öncelikli {p_interval} çalışıyor)")
            await asyncio.sleep(1)
        await execute_bot_logic(interval, market_type)

    # İş bittikten sonra sıradan çıkar
    queued_keys.discard(key)

async def execute_bot_logic(interval, market_type):
    key = get_key(interval, market_type)
    lock = interval_locks[key]

    if lock.locked():
        logger.warning(f"❌❌❌ {key} zaten çalışıyor.")
        return

    async with lock:
        start_time = time.time()
        
        try:
            # Table name belirleme
            table_name = "binance_futures" if market_type == "futures" else "binance_data"

            last_time = load_last_data(interval, table_name=table_name)
            
            # 🔥 DEDUPLICATION CHECK 🔥
            # Her market tipi için ayrı timestamp takibi
            # processed_timestamps key'i de unique olmalı: get_key kullanıyoruz
            if key in processed_timestamps and processed_timestamps[key] == str(last_time):
                # logger.debug(f"🔁 {key} için {last_time} zaten işlendi. Atlanıyor.")
                return

            logger.info(f"🚀 Yeni {market_type.upper()} verisi. {interval} botları çalıştırılıyor... (TS: {last_time})")
            processed_timestamps[key] = str(last_time)

            # 1) Strateji + veri + bot listesi (Market Type Filtreli)
            strategies_with_indicators, coin_data_dict, bots = await run_trade_engine(
                interval, 
                min_timestamp=last_time, 
                market_type=market_type
            )

            results = []

            # 2) Kiralık kapanışları (Sadece bir kanal üstlensin veya bağımsız olsun)
            # Şu an karışıklık olmaması için sadece SPOT kanalı veya her ikisi de kontrol edebilir.
            # Ancak process/handle_rent_expiry_closures zaten atomik update yapıyor.
            # Her döngüde kontrol etmenin zararı azdır, CPU hariç.
            # Şimdilik her tetiklemede kontrol edelim.
            results = await handle_rent_expiry_closures(results)

            # 3) Botlar varsa, normal çalıştırmaları ekle
            if strategies_with_indicators and coin_data_dict and bots:
                bot_results = await run_all_bots_async(
                    bots, strategies_with_indicators, coin_data_dict, last_time, interval
                )
                # flatten edilmiş liste bekliyoruz; birleştir
                if bot_results:
                    results.extend(bot_results)
            else:
                pass
                # logger.info(f"ℹ {key}: Bot çalıştırma atlandı (eksik veri ya da aktif bot yok).")

            # 4) Sonuçları grupla + JSON'a kaydet (sadece varsa)
            result_dict = aggregate_results_by_bot_id(results)
            if result_dict:
                # Köprü fonksiyonunu çağırıyoruz. Servis nesnesini (order_service) gönderiyoruz.
                await dispatch_orders_to_engine(result_dict)
            
            elapsed = time.time() - start_time
            if results:
                logger.info(f"✅ {key} tamamlandı. Süre: {elapsed:.2f} sn. (Semboller: {len(coin_data_dict)}, Sonuç: {len(results)})")

        except Exception as e:
            logger.error(f"❌ {key} çalıştırılırken hata: {e}")

import logging
from trade_engine.order_engine.exchanges.binance.stream import BinanceStreamer

# Log Ayarları
# logging.basicConfig(...) KALDIRILDI - UnifiedRunner kontrol edecek
logger = logging.getLogger("StrategyEngine")

async def listen_for_notifications():
    conn_str = os.getenv("LISTEN_DB_URL") or os.getenv("DATABASE_URL")
    if not conn_str:
        logger.warning("❌ LISTEN_DB_URL veya DATABASE_URL ortam değişkeni bulunamadı. Fallback bağlantı kullanılıyor.")
        conn_str = "postgresql://postgres:admin@localhost/balina_db"

    await order_service.start(futures_workers=5, spot_workers=2)

    # --- PRICE CACHE BAŞLAT (STREAMER) ---
    # Order Service filtreleri yüklediği için oradan sembolleri alabiliriz
    spot_symbols = []
    futures_symbols = []

    # SymbolFilterRepo cache yapısı: { "BTCUSDT": { "spot": {...}, "futures": {...} } }
    if order_service.filter_repo._cache:
        for symbol, data in order_service.filter_repo._cache.items():
            if "spot" in data:
                spot_symbols.append(symbol)
            if "futures" in data:
                futures_symbols.append(symbol)
    
    streamer = BinanceStreamer(spot_symbols=spot_symbols, futures_symbols=futures_symbols)
    # Streamer'ı arka planda başlat
    asyncio.create_task(streamer.start())

    logger.info("🏁 Dinleyici, Emir Motoru ve Fiyat Akışı (Streamer) Aktif.")
    
    while True:
        try:
            async with await psycopg.AsyncConnection.connect(conn_str, autocommit=True) as conn:
                async with conn.cursor() as cur:
                    # İki kanalı da dinle:
                    # 1. Spot (binance_data) -> new_data
                    # 2. Futures (binance_futures) -> new_futures_data
                    await cur.execute("LISTEN new_data;")
                    await cur.execute("LISTEN new_futures_data;")
                    
                    logger.info("📡 PostgreSQL'den tetikleme bekleniyor (Spot & Futures)...")

                    async for notify in conn.notifies():
                        # logger.info(f"🔔 Tetikleme: {notify.channel} -> {notify.payload}")
                        asyncio.create_task(handle_notification(notify))

        except (asyncio.CancelledError, KeyboardInterrupt):
            logger.info("⛔ Dinleyici durduruluyor...")
            streamer.stop() # Streamer'ı temizle
            await order_service.stop() # Order Service'i ve açık sessionları kapat
            break
        except Exception as e:
            logger.error(f"❌ Dinleyicide hata: {e}. 5 sn sonra yeniden denenecek...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(listen_for_notifications())