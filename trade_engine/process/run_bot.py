from trade_engine.process.library.allowed_globals import allowed_globals_
from trade_engine.control.control_the_results import control_the_results
from trade_engine.log.log import log_info, log_warning, log_error
from psycopg2.extras import RealDictCursor
from trade_engine.config import psycopg2_connection
import math


def build_effective_min_arg(min_usd_map: dict | float | int | None, floor: float = 10.0):
    """
    - dict gelirse her sembol için değeri en az `floor` olacak şekilde normalize eder.
    - skaler/None gelirse en az `floor` olacak şekilde skaler döner.
    """
    if not min_usd_map:
        return float(floor)

    if isinstance(min_usd_map, dict):
        normalized = {}
        for sym, val in min_usd_map.items():
            try:
                num = float(val)
            except (TypeError, ValueError):
                num = float('nan')
            normalized[sym] = float(floor) if (not math.isfinite(num) or num < floor) else num
        return normalized

    # skaler geldiyse (float/int/str)
    try:
        num = float(min_usd_map)
    except (TypeError, ValueError):
        num = float('nan')
    return float(floor) if (not math.isfinite(num) or num < floor) else num


def _get_last_price_1m(symbol: str):
    sql = """
        SELECT close
        FROM binance_last_price
        WHERE coin_id = %s AND "interval" = '1m'
        ORDER BY "timestamp" DESC
        LIMIT 1
    """
    with psycopg2_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (symbol,))
            row = cur.fetchone()
            return float(row["close"]) if row and row.get("close") is not None else None


def _get_min_qty(symbol: str, trade_type: str):
    """
    symbol_filters tablosundan ilgili kayıt (trade_type=spot|futures) için min_qty döndürür.
    Birden fazla satır varsa en son güncelleneni alır.
    """
    sql = """
        SELECT min_qty
        FROM symbol_filters
        WHERE binance_symbol = %s AND trade_type = %s
        ORDER BY updated_at DESC NULLS LAST, id DESC
        LIMIT 1
    """
    with psycopg2_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (symbol, trade_type))
            row = cur.fetchone()
            return float(row["min_qty"]) if row and row.get("min_qty") is not None else None


def run_bot(bot, strategy_code, indicator_list, coin_data_dict):

    order_fields = {
        "order_type": "", "stop_loss": 0.0, "take_profit": 0.0, "price": 0.0, "limit_price": 0.0, "trigger_price": 0.0, 
        "stop_price": 0.0, "stop_limit_price": 0.0,
        "callback_rate": 0.0, "activation_price": 0.0, "time_in_force": ""
    }

    df_dict = {}
    for coin_id in bot['stocks']:
        key = (coin_id, bot['period'])
        df = coin_data_dict.get(key)
        if df is not None:
            df = df.copy()
            df['coin_id'] = coin_id
            df_dict[coin_id] = df

    if not df_dict:
        msg = f"Bot ID: {bot['id']} için veri bulunamadı."
        print(msg)
        log_warning(
            bot_id=bot['id'],
            user_id=bot.get('user_id'),
            message=msg,
            symbol=None,
            period=bot.get('period')
        )
        return {"bot_id": bot['id'], "status": "no_data", "duration": 0.0}

    try:
        #print(f"Bot ID: {bot['id']} çalıştırılıyor...")
        results = []

        def two_vals_differ(lst, tol=1e-9):
            if not (isinstance(lst, list) and len(lst) == 2):
                return False
            a, b = lst[0], lst[1]
            try:
                return abs(float(a) - float(b)) > tol
            except Exception:
                return a != b

        enter_on_start = bool(bot.get('enter_on_start', False))

        for coin_id in bot['stocks']:
            if coin_id not in df_dict:
                msg = f"Bot {bot['id']} / {coin_id}: veri yok, atlandı."
                log_warning(
                    bot_id=bot['id'], user_id=bot.get('user_id'),
                    message=msg, symbol=coin_id, period=bot.get('period')
                )
                results.append({
                    "bot_id": bot['id'], "coin_id": coin_id,
                    "period": bot['period'], "status": "skipped", "message": "No data."
                })
                continue

            allowed_globals = allowed_globals_(df_dict[coin_id], bot['id'])

            for indicator in indicator_list:
                exec(indicator['code'], allowed_globals)

            exec(strategy_code, allowed_globals)

            result_df = allowed_globals['df']
            last_positions = (
                result_df['position'].iloc[-2:].tolist()
                if 'position' in result_df.columns and len(result_df) >= 2 else None
            )
            last_percentage = (
                result_df['percentage'].iloc[-2:].tolist()
                if 'percentage' in result_df.columns and len(result_df) >= 2 else None
            )
            # --- DEBUG: CHECK CANDLE DATA ---
            # if 'timestamp' in result_df.columns and len(result_df) >= 2:
            #      last_times = result_df['timestamp'].iloc[-2:].tolist()
            #      last_closes = result_df['close'].iloc[-2:].tolist()
            #      print(f"🔎 [DEBUG] Bot {bot['id']} / {coin_id}:")
            #      print(f"   Timestamps: {last_times}")
            #      print(f"   Closes:     {last_closes}")
            # --------------------------------
            print(f"Bot {bot['id']} / {coin_id}: last_positions={last_positions}, last_percentage={last_percentage}")
            both_same = not two_vals_differ(last_positions) and not two_vals_differ(last_percentage)
            both_zero_positions = all(v == 0 for v in last_positions)
            both_zero_percentage = all(v == 0 for v in last_percentage)

            should_append = (
                enter_on_start
            )
            if not should_append and (both_zero_positions or both_zero_percentage):
                should_append = True
            if not should_append and not both_same:
                should_append = True

            if not should_append:
                msg = f"{coin_id}: değişiklik yok, sinyal atlandı."
                log_info(
                    bot_id=bot['id'], user_id=bot.get('user_id'),
                    message=msg, symbol=coin_id, period=bot.get('period'),
                    details={"last_positions": last_positions, "last_percentage": last_percentage}
                )
                continue

            order_info = {
                field: result_df[field].iloc[-1]
                for field in order_fields
                if field in result_df.columns and len(result_df) > 0
            }

            result_entry = {
                "bot_id": bot['id'],
                "coin_id": coin_id,
                "status": "success",
                "last_positions": last_positions,
                "last_percentage": last_percentage,
            }
            result_entry.update(order_info)
            results.append(result_entry)

        #print("results:", results)
        bot_type = (bot.get('bot_type') or '').lower()
        trade_type = 'spot' if bot_type == 'spot' else 'futures'

        min_usd_map = {}
        for coin_id in bot['stocks']:
            min_qty = _get_min_qty(coin_id, trade_type)
            #print("coin_id, trade_type, min_qty:", coin_id, trade_type, min_qty)
            last_px = _get_last_price_1m(coin_id)
            if min_qty is not None and last_px is not None:
                min_usd_map[coin_id] = float(min_qty) * float(last_px)

        effective_min_arg = build_effective_min_arg(min_usd_map, floor=10.0)

        #print("effective_min_arg:", effective_min_arg)
        results = control_the_results(
            bot.get('user_id'),
            bot['id'],
            results,
            min_usd=effective_min_arg
        )

        return {
            "bot_id": bot['id'],
            "status": "success",
            "results": results
        }

    except Exception as e:
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Bot çalışırken hata oluştu:\n{error_msg}")
        log_error(
            bot_id=bot['id'], user_id=bot.get('user_id'),
            message="Bot çalıştırma hatası",
            symbol=None, period=bot.get('period'),
            details={"error": error_msg}
        )
        return {"bot_id": bot['id'], "status": "error", "error": error_msg}