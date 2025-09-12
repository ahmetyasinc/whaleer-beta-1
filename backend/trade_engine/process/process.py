import asyncio
from concurrent.futures import ProcessPoolExecutor
from os import cpu_count

# Var olan importların:
from backend.trade_engine.process.save import save_result_to_json, aggregate_results_by_bot_id
from backend.trade_engine.process.run_bot import run_bot

# (İstersen doğrudan bu ikisini kullanabiliriz, şema bağımlılığını azaltır)
from backend.trade_engine.data.bot_features import load_bot_holding, load_bot_positions

# DB bağlantısı (senin projendeki konfige göre)
import psycopg2
from psycopg2.extras import RealDictCursor
from backend.trade_engine.config import DB_CONFIG

# Emir gönderim sistemi (ileride aktif edeceksin)
from backend.trade_engine.taha_part.utils.order_final_optimized import (
    prepare_order_data,
    send_order
)


def _get_conn():
    return psycopg2.connect(
        dbname=DB_CONFIG["dbname"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        host=DB_CONFIG["host"],
        port=DB_CONFIG.get("port", 5432),
        cursor_factory=RealDictCursor
    )


def _fetch_rent_not_closed_bot_ids():
    """
    Kiralık olup rent_expiry_closed = false olan bot id'lerini döndürür.
    'active' olmasa bile dahil edilecek şekilde filtreyi dar tutuyoruz.
    """
    sql = """
        SELECT id
        FROM bots
        WHERE acquisition_type = 'RENTED'
          AND COALESCE(rent_expiry_closed, false) = false
    """
    with _get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
        return [r["id"] for r in rows]


def _mark_rent_closed(bot_id: int):
    sql = """
        UPDATE bots
        SET rent_expiry_closed = TRUE
        WHERE id = %s
    """
    with _get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (bot_id,))
        conn.commit()


def _merge_into_results(results_per_bot: list, bot_id: int, new_orders: list):
    """
    results_per_bot yapısını bozmadan ekleme yapar.
    new_orders -> [{'coin_id': 'ETHUSDT', 'trade_type': 'spot'|'futures', 'side': 'sell'|'buy',
                    'bot_id': 123, 'status': 'success', 'order_type': 'market', 'amount': 0.01}, ...]
    """
    # Bot için var olan entry’yi bul
    for entry in results_per_bot:
        if isinstance(entry, dict) and entry.get("bot_id") == bot_id:
            # results yoksa oluştur
            if "results" not in entry or not isinstance(entry["results"], list):
                entry["results"] = []
            entry["results"].extend(new_orders)
            return
    # Yoksa yeni bir entry ekle
    results_per_bot.append({
        "bot_id": bot_id,
        "status": "success",
        "results": list(new_orders)  # kopya
    })


def _build_close_orders_for_bot(bot_id: int):
    """
    Bu fonksiyon **senkron** çalışır (executor’da çağıracağız).
    - Holdings ve Positions’ı okuyup kapatma emir listesi üretir.
    - Dönüş: order dict listesi (results_per_bot içindeki 'results' formatında)
    """
    orders = []

    # --- Holdings (SPOT) ---
    holdings = load_bot_holding(bot_id) or []

    # Beklenen örnek eleman: {'symbol': 'ETHUSDT', 'amount': 0.01, ...}
    for h in holdings:
        symbol = h.get("symbol")
        amount = float(h.get("amount") or 0.0)
        if symbol and amount > 0:
            orders.append({
                "coin_id": symbol,
                "trade_type": "spot",
                "side": "sell",                 # spot coin elde -> sat
                "bot_id": bot_id,
                "status": "success",
                "order_type": "market",
                "amount": amount
            })

    # --- Positions (FUTURES) ---
    positions = load_bot_positions(bot_id) or []
    # Beklenen örnek eleman: {'symbol': 'BTCUSDT', 'position': 0.02} (pozitif=long, negatif=short)
    for p in positions:
        symbol = p.get("symbol")
        pos = float(p.get("amount") or 0.0)
        position_side = p.get("position_side")
        if not symbol or pos == 0:
            continue

        if position_side == "long":
            # long kapat: SELL
            orders.append({
                "coin_id": symbol,
                "trade_type": "futures",
                "side": "sell",
                "positionside": "long",
                "bot_id": bot_id,
                "status": "success",
                "order_type": "market",
                "amount": abs(pos)
            })
        elif position_side == "short":
            # short kapat: BUY
            orders.append({
                "coin_id": symbol,
                "trade_type": "futures",
                "side": "buy",
                "positionside": "short",
                "bot_id": bot_id,
                "status": "success",
                "order_type": "market",
                "amount": abs(pos)
            })
    return orders


async def handle_rent_expiry_closures(results_per_bot: list):
    """
    - rent_expiry_closed = false olan kiralık botları bulur
    - her biri için holdings + positions'ı kapatma emirlerine çevirir
    - results_per_bot yapısına **bozmadan** merge eder
    - en sonda rent_expiry_closed = true işaretler
    """
    loop = asyncio.get_running_loop()

    # 1) Kapama gerektiren botları al
    bot_ids = await loop.run_in_executor(None, _fetch_rent_not_closed_bot_ids)
    if not bot_ids:
        return results_per_bot  # iş yok

    # 2) Her bot için kapatma emirlerini üret
    close_tasks = [
        loop.run_in_executor(None, _build_close_orders_for_bot, bot_id)
        for bot_id in bot_ids
    ]
    all_new_orders_per_bot = await asyncio.gather(*close_tasks)  # list[list[order]]
    # 3) Merge + flag’i true yapma
    # (DİKKAT: rent_expiry_closed = true yalnızca emir oluşturduysak işaretleniyor.
    #  İstersen, emri olmasa bile işaretleyecek şekilde değiştirebilirsin.)
    for bot_id, new_orders in zip(bot_ids, all_new_orders_per_bot):
        _merge_into_results(results_per_bot, bot_id, new_orders)
        # DB update’i bloklayan IO, kısa olduğu için direkt çağırıyoruz
        await loop.run_in_executor(None, _mark_rent_closed, bot_id)

    return results_per_bot


async def run_all_bots_async(bots, strategies_with_indicators, coin_data_dict, last_time, interval):
    loop = asyncio.get_running_loop()

    max_workers = min(len(bots), max(1, int(cpu_count() / 2)))  # En az 1

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        tasks = []
        for bot, strategy_info in zip(bots, strategies_with_indicators):
            strategy_code = strategy_info['strategy_code']
            indicator_list = strategy_info['indicators']

            # 🔹 Sadece gerekli verileri coin_data_dict'ten çek
            required_keys = [(coin_id, bot['period']) for coin_id in bot['stocks']]
            filtered_coin_data = {
                key: coin_data_dict.get(key)
                for key in required_keys
                if key in coin_data_dict
            }

            task = loop.run_in_executor(
                executor, run_bot, bot, strategy_code, indicator_list, filtered_coin_data
            )
            tasks.append(task)

        # 1) Normal bot çalıştırmaları
        results_per_bot = await asyncio.gather(*tasks)
        results_per_bot = await handle_rent_expiry_closures(results_per_bot)
        # 2) Çıktıları normalize edip tek list yap
        all_results = []
        for res in results_per_bot:
            if isinstance(res, dict):
                if "results" in res and isinstance(res["results"], list):
                    all_results.extend(res["results"])
                else:
                    all_results.append(res)
            elif isinstance(res, list):
                all_results.extend(res)      

        # 4) Grupla ve JSON’a kaydet
        result_dict = aggregate_results_by_bot_id(all_results)
        # TAHANIN PARTI (AÇILMALI!)
        result = await send_order(await prepare_order_data(result_dict))
        # print(result)
        print("result_dict1: ", result_dict)
        if result_dict:
            print("result_dict2: ", result_dict)
            await save_result_to_json(result_dict, last_time, interval)

        return all_results
