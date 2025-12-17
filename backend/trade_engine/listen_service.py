import asyncio
import sys
import time
import psycopg
from backend.trade_engine.taha_part.utils.price_cache_new import (
    start_connection_pool,
    wait_for_cache_ready
)
import asyncpg
import os
from backend.trade_engine.order_engine.core.order_execution_service import OrderExecutionService, OrderRequest

from backend.trade_engine.data.last_data_load import load_last_data
from backend.trade_engine.process.trade_engine import run_trade_engine
# listen_service.py (üst importlara ekle)
from backend.trade_engine.process.process import run_all_bots_async, handle_rent_expiry_closures  # NEW
from backend.trade_engine.process.save import save_result_to_json, aggregate_results_by_bot_id    # NEW
# Emir gönderim sistemi (ileride aktif edeceksin)
from backend.trade_engine.taha_part.utils.order_final_optimized import (
    prepare_order_data,
    send_order
)
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

order_service = OrderExecutionService()

async def dispatch_orders_to_engine(result_dict):
    """
    Strateji sonuçlarını (result_dict) tarar, OrderRequest nesnelerine çevirir
    ve yeni Execution Service kuyruğuna atar.
    """
    if not result_dict:
        return

    print(f"⚡ Emirler Order Engine v2'ye iletiliyor... (Toplam Bot: {len(result_dict)})")
    
    for bot_id, trades in result_dict.items():
        # trades listesi içindeki her bir işlem kararı için:
        # Not: result_dict yapısının {bot_id: [trade_obj, ...]} döndüğünü varsayıyoruz.
        # Eğer yapı {bot_id: {symbol: details}} ise döngüyü ona göre düzenleyin.
        
        # aggregate_results_by_bot_id çıktısının liste döndürdüğü senaryosu:
        iterator = trades if isinstance(trades, list) else [trades]
        
        for trade in iterator:
            # Trade objesi bir dict mi yoksa class mı kontrolü (genelde dict döner)
            symbol = trade.get("symbol")
            side = trade.get("signal")  # BUY / SELL
            amount = trade.get("amount", 0) # USD cinsinden değer
            
            # Trade tipi (varsayılan futures, bottan geliyorsa onu kullan)
            trade_type = trade.get("trade_type", "futures") 
            
            if not side or side == "NEUTRAL":
                continue

            # --- YENİ SİSTEME UYGUN ORDER REQUEST OLUŞTURMA ---
            req = OrderRequest(
                bot_id=int(bot_id),
                symbol=symbol,
                side=side.upper(),
                amount_usd=float(amount),
                exchange_name="binance",    # İleride dinamik olabilir
                trade_type=trade_type,      # spot / futures
                leverage=int(trade.get("leverage", 1)),
                order_type="MARKET",        # Strateji market emri üretiyor varsayımı
                reduce_only=trade.get("reduce_only", False),
                # stop_price vs. eklenebilir eğer strateji veriyorsa
            )

            # Kuyruğa at (Fire and Forget)
            await order_service.submit_order(req)

async def handle_new_data(payload):
    interval = payload.strip()

    if interval not in interval_locks:
        print(f"⚠ Bilinmeyen interval: {interval}")
        return

    # Eğer zaten kuyruktaysa tekrar eklenmesin
    if interval in queued_intervals:
        print(f"🔁 {interval} zaten sırada bekliyor.")
        return

    queued_intervals.add(interval)

    # 1m için öncelikli kilit alınır
    if interval == priority_interval:
        if priority_lock.locked():
            print(f"❌❌❌ {interval} zaten çalışıyor.")
            queued_intervals.discard(interval)
            return
        async with priority_lock:
            await execute_bot_logic(interval)
    else:
        # 1m çalışıyorsa bekle
        while priority_lock.locked():
            print(f"⏸ {interval} için bekleniyor... (öncelikli {priority_interval} çalışıyor)")
            await asyncio.sleep(1)
        await execute_bot_logic(interval)

    # İş bittikten sonra sıradan çıkar
    queued_intervals.discard(interval)

# listen_service.py (execute_bot_logic'i tamamen değiştir)
async def execute_bot_logic(interval):
    lock = interval_locks[interval]

    if lock.locked():
        print(f"❌❌❌ {interval} zaten çalışıyor.")
        return

    async with lock:
        start_time = time.time()
        print(f"🚀 Yeni veri geldi. {interval} botları çalıştırılıyor...")

        try:
            last_time = load_last_data(interval)

            # 1) Strateji + veri + bot listesi
            strategies_with_indicators, coin_data_dict, bots = await run_trade_engine(interval)

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
                print(f"ℹ {interval}: Bot çalıştırma atlandı (eksik veri ya da aktif bot yok).")

            # 4) Sonuçları grupla + JSON'a kaydet (sadece varsa)
            
            result_dict = aggregate_results_by_bot_id(results)
            if result_dict:
                # Köprü fonksiyonunu çağırıyoruz. Servis nesnesini (order_service) gönderiyoruz.
                await dispatch_orders_to_engine(order_service, result_dict)
            #if result_dict:
            #    await save_result_to_json(result_dict, last_time, interval)
            
            # TAHANIN PARTI
            print("result_dict:", result_dict)

            #result = await send_order(await prepare_order_data(result_dict))
            
            elapsed = time.time() - start_time
            print(f"✅ {last_time}, {interval} tamamlandı. Süre: {elapsed:.2f} sn. (toplam sonuç: {len(results)})")

        except Exception as e:
            print(f"❌ {interval} için bot çalıştırılırken hata: {e}")

async def listen_for_notifications():
    conn_str = "postgresql://postgres:admin@localhost/balina_db"


    # Pool ve cache'i önce başlat
    await start_connection_pool()
    await wait_for_cache_ready()

    await order_service.start(futures_workers=5, spot_workers=2)

    print("🏁 Dinleyici ve Emir Motoru (V2) Aktif.")

    while True:
        try:
            async with await psycopg.AsyncConnection.connect(conn_str, autocommit=True) as conn:
                async with conn.cursor() as cur:
                    await cur.execute("LISTEN new_data;")
                    print("📡 PostgreSQL'den tetikleme bekleniyor...")

                    async for notify in conn.notifies():
                        print(f"🔔 Tetikleme: {notify.payload}")
                        asyncio.create_task(handle_new_data(notify.payload))

        except (asyncio.CancelledError, KeyboardInterrupt):
            print("⛔ Dinleyici durduruluyor...")
            break
        except Exception as e:
            print(f"❌ Dinleyicide hata: {e}. 5 sn sonra yeniden denenecek...")
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(listen_for_notifications())