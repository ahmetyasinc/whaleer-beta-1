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

interval_locks = {interval: asyncio.Lock() for interval in supported_intervals}
priority_interval = "1m"
priority_lock = asyncio.Lock()
queued_intervals = set()  # 🔐 Kuyrukta bekleyen interval'leri takip eder
processed_timestamps = {}  # 🕒 Tekrarlı çalışmayı önlemek için (Deduplication)

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

async def handle_new_data(payload):
    interval = payload.strip()

    if interval not in interval_locks:
        logger.warning(f"⚠ Bilinmeyen interval: {interval}")
        return

    # Eğer zaten kuyruktaysa tekrar eklenmesin
    if interval in queued_intervals:
        logger.debug(f"🔁 {interval} zaten sırada bekliyor.")
        return

    queued_intervals.add(interval)

    # 1m için öncelikli kilit alınır
    if interval == priority_interval:
        if priority_lock.locked():
            logger.warning(f"❌❌❌ {interval} zaten çalışıyor.")
            queued_intervals.discard(interval)
            return
        async with priority_lock:
            await execute_bot_logic(interval)
    else:
        # 1m çalışıyorsa bekle
        while priority_lock.locked():
            logger.debug(f"⏸ {interval} için bekleniyor... (öncelikli {priority_interval} çalışıyor)")
            await asyncio.sleep(1)
        await execute_bot_logic(interval)

    # İş bittikten sonra sıradan çıkar
    queued_intervals.discard(interval)

# listen_service.py (execute_bot_logic'i tamamen değiştir)
async def execute_bot_logic(interval):
    lock = interval_locks[interval]

    if lock.locked():
        logger.warning(f"❌❌❌ {interval} zaten çalışıyor.")
        return

    async with lock:
        start_time = time.time()
        
        try:
            last_time = load_last_data(interval)
            
            # 🔥 DEDUPLICATION CHECK 🔥
            # Eğer bu timestamp için zaten çalıştıysak, tekrar çalışma!
            if interval in processed_timestamps and processed_timestamps[interval] == str(last_time):
                # logger.debug(f"🔁 {interval} için {last_time} zaten işlendi. Atlanıyor.")
                return

            logger.info(f"🚀 Yeni veri geldi. {interval} botları çalıştırılıyor... (TS: {last_time})")
            processed_timestamps[interval] = str(last_time)

            # 1) Strateji + veri + bot listesi
            strategies_with_indicators, coin_data_dict, bots = await run_trade_engine(interval, min_timestamp=last_time)

            # 2) Önce kiralık kapanışlarını HER KOŞULDA çalıştır (bot olsa da olmasa da)
            #    Boş bir results listesi ile başla, handle_rent_expiry_closures içine merge ettir.
            results = []
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
                logger.info(f"ℹ {interval}: Bot çalıştırma atlandı (eksik veri ya da aktif bot yok).")

            # 4) Sonuçları grupla + JSON'a kaydet (sadece varsa)
            
            result_dict = aggregate_results_by_bot_id(results)
            if result_dict:
                # Köprü fonksiyonunu çağırıyoruz. Servis nesnesini (order_service) gönderiyoruz.
                await dispatch_orders_to_engine(result_dict)
            #if result_dict:
            #    await save_result_to_json(result_dict, last_time, interval)
            
            elapsed = time.time() - start_time
            logger.info(f"✅ {last_time}, {interval} tamamlandı. Süre: {elapsed:.2f} sn. (toplam sonuç: {len(results)})")

        except Exception as e:
            logger.error(f"❌ {interval} için bot çalıştırılırken hata: {e}")

import logging
from trade_engine.order_engine.exchanges.binance.stream import BinanceStreamer

# Log Ayarları
# logging.basicConfig(...) KALDIRILDI - UnifiedRunner kontrol edecek
logger = logging.getLogger("StrategyEngine")

async def listen_for_notifications():
    conn_str = os.getenv("LISTEN_DB_URL", "postgresql://postgres:admin@localhost/balina_db")

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
                    await cur.execute("LISTEN new_data;")
                    logger.info("📡 PostgreSQL'den tetikleme bekleniyor...")

                    async for notify in conn.notifies():
                        logger.info(f"🔔 Tetikleme: {notify.payload}")
                        asyncio.create_task(handle_new_data(notify.payload))

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