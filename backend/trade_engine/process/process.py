# backend/trade_engine/process/process.py
import asyncio
from concurrent.futures import ProcessPoolExecutor
from os import cpu_count

from psycopg2.extras import RealDictCursor

# Projedeki mevcut API'ler
from backend.trade_engine.process.save import save_result_to_json, aggregate_results_by_bot_id
from backend.trade_engine.process.run_bot import run_bot
from backend.trade_engine.data.bot_features import load_bot_holding, load_bot_positions

# DB bağlantısı (fork-safe, config'ten)
from backend.trade_engine.config import psycopg2_connection


def _get_last_price_1m(symbol: str):
    """
    public.binance_last_price tablosundan, verilen sembol için
    interval='1m' olan en güncel 'close' değerini döndürür.
    """
    sql = """
        SELECT close
        FROM public.binance_last_price
        WHERE coin_id = %s AND "interval" = '1m'
        ORDER BY "timestamp" DESC
        LIMIT 1
    """
    with psycopg2_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (symbol,))
            row = cur.fetchone()
            return float(row["close"]) if row and row.get("close") is not None else None


def _fetch_rent_not_closed_bot_ids():
    """
    Kiralık olup rent_expiry_closed = false olan bot id'lerini döndürür.
    'active' olmasa bile dahil edilecek şekilde filtreyi dar tutuyoruz.
    """
    sql = """
        SELECT id
        FROM public.bots
        WHERE acquisition_type = 'RENTED'
          AND COALESCE(rent_expiry_closed, FALSE) = FALSE
    """
    with psycopg2_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            rows = cur.fetchall() or []
            return [r["id"] for r in rows]


def _mark_rent_closed(bot_id: int):
    """
    Kiralık süresi dolan botu işaretler:
      - rent_expiry_closed = TRUE
      - active TRUE ise FALSE yapar (aksi halde olduğu gibi bırakır)
    Tek UPDATE ile yapılır.
    """
    sql = """
        UPDATE public.bots
        SET
            rent_expiry_closed = TRUE,
            active = CASE WHEN active THEN FALSE ELSE active END
        WHERE id = %s
    """
    with psycopg2_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (bot_id,))
        conn.commit()


def _build_close_orders_for_bot(bot_id: int):
    """
    Botun tüm varlık/pozisyonlarını kapatmak için emir listesi üretir.
    Dönüş: order dict listesi (flat). Amount yerine USD 'value' döner.
    """
    orders = []

    # --- Holdings (SPOT) ---
    holdings = load_bot_holding(bot_id) or []
    for h in holdings:
        symbol = h.get("symbol")
        amount = float(h.get("amount") or 0.0)
        if not symbol or amount <= 0:
            continue

        last_price = _get_last_price_1m(symbol)
        if last_price is None:
            print(f"[rent-close][{bot_id}] {symbol} için 1m fiyat bulunamadı, emir atlandı.")
            continue

        value_usd = amount * last_price
        orders.append({
            "coin_id": symbol,
            "trade_type": "spot",
            "side": "sell",                # spot eldeki coini kapat: SELL
            "bot_id": bot_id,
            "status": "success",
            "order_type": "market",
            # "amount": amount,            # eski alan (artık kullanılmıyor)
            "value": value_usd,            # yeni: amount × last_price
            "price": last_price            # opsiyonel: şeffaflık
        })

    # --- Positions (FUTURES) ---
    positions = load_bot_positions(bot_id) or []
    for p in positions:
        symbol = p.get("symbol")
        pos = float(p.get("amount") or 0.0)
        position_side = p.get("position_side")
        if not symbol or pos == 0:
            continue

        last_price = _get_last_price_1m(symbol)
        if last_price is None:
            print(f"[rent-close][{bot_id}] {symbol} için 1m fiyat bulunamadı, emir atlandı.")
            continue

        value_usd = abs(pos) * last_price

        if position_side == "long":
            orders.append({
                "coin_id": symbol,
                "trade_type": "futures",
                "side": "sell",             # long kapat: SELL
                "positionside": "long",
                "bot_id": bot_id,
                "status": "success",
                "order_type": "market",
                "value": value_usd,
            })
        elif position_side == "short":
            orders.append({
                "coin_id": symbol,
                "trade_type": "futures",
                "side": "buy",              # short kapat: BUY
                "positionside": "short",
                "bot_id": bot_id,
                "status": "success",
                "order_type": "market",
                "value": value_usd,
            })
    return orders


async def handle_rent_expiry_closures(_: list) -> list:
    """
    Kiralık (RENTED) ve rent_expiry_closed = false botlar için
    kapanış emirlerini **DÜZ LİSTE** olarak döndürür.
    Ayrıca her botu rent_expiry_closed = true işaretler.
    Dönüş: [ {order}, {order}, ... ]  # wrapper YOK
    """
    loop = asyncio.get_running_loop()

    # 1) Kapatılacak botları çek
    bot_ids = await loop.run_in_executor(None, _fetch_rent_not_closed_bot_ids)
    if not bot_ids:
        return []

    # 2) Her bot için kapatma emirlerini paralelde üret
    close_tasks = [
        loop.run_in_executor(None, _build_close_orders_for_bot, bot_id)
        for bot_id in bot_ids
    ]
    print(f"Kapatma görevleri oluşturuldu: {len(close_tasks)}")
    all_new_orders_per_bot = await asyncio.gather(*close_tasks)  # list[list[order]]

    # 3) Flat liste + botları işaretle
    flat_orders = []
    for bot_id, new_orders in zip(bot_ids, all_new_orders_per_bot):
        if new_orders:
            flat_orders.extend(new_orders)
        # Emir olsun/olmasın işaretle
        await loop.run_in_executor(None, _mark_rent_closed, bot_id)

    return flat_orders


async def run_all_bots_async(bots, strategies_with_indicators, coin_data_dict, last_time, interval):
    #print("bots:", bots)
    loop = asyncio.get_running_loop()

    max_workers = min(len(bots), max(1, int(cpu_count() / 2)))  # En az 1 worker
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        tasks = []
        for bot, strategy_info in zip(bots, strategies_with_indicators):
            strategy_code = strategy_info['strategy_code']
            indicator_list = strategy_info['indicators']

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

        # 1) Normal bot sonuçları
        results_per_bot = await asyncio.gather(*tasks)

        # 2) Normal sonuçları FLAT listeye indir
        all_results = []
        for res in results_per_bot:
            if isinstance(res, dict):
                if "results" in res and isinstance(res["results"], list):
                    all_results.extend(res["results"])
                else:
                    all_results.append(res)
            elif isinstance(res, list):
                all_results.extend(res)

        # 3) Kiralık kapanışlarını FLAT ekle
        rent_close_orders = await handle_rent_expiry_closures([])
        if rent_close_orders:
            all_results.extend(rent_close_orders)

        # 4) Grupla -> { "<bot_id>": [ {order}, ... ] }
        result_dict = aggregate_results_by_bot_id(all_results)

        # 5) Kaydet
        #if result_dict:
            #print("result_dict: ", result_dict)
            #await save_result_to_json(result_dict, last_time, interval)

        return all_results
