# run_bot.py

from backend.trade_engine.process.library.allowed_globals import allowed_globals_ 
from backend.trade_engine.control.control_the_results import control_the_results
from backend.trade_engine.log import log_info, log_warning, log_error  # 🔹 eklendi

def run_bot(bot, strategy_code, indicator_list, coin_data_dict):

    order_fields = {
        "order_type": "", "stop_loss": 0.0, "take_profit": 0.0, "price": 0.0, "stop_price": 0.0, "stop_limit_price": 0.0,
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
        # 🔹 log düş
        log_warning(
            bot_id=bot['id'], 
            user_id=bot.get('user_id'),
            message=msg,
            symbol=None, 
            period=bot.get('period')
        )
        return {"bot_id": bot['id'], "status": "no_data", "duration": 0.0}

    try:
        print(f"Bot ID: {bot['id']} çalıştırılıyor...")
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

            allowed_globals = allowed_globals_(df_dict[coin_id])

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

            should_append = enter_on_start or two_vals_differ(last_positions) or two_vals_differ(last_percentage)

            if not should_append:
                # 🔹 Logla (bilgi)
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

        results = control_the_results(bot.get('user_id'), bot['id'], results, min_usd=10.0)

        return {
            "bot_id": bot['id'],
            "status": "success",
            "results": results
        }

    except Exception as e:
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Bot çalışırken hata oluştu:\n{error_msg}")
        # 🔹 Hata logla
        log_error(
            bot_id=bot['id'], user_id=bot.get('user_id'),
            message="Bot çalıştırma hatası", 
            symbol=None, period=bot.get('period'),
            details={"error": error_msg}
        )
        return {"bot_id": bot['id'], "status": "error", "error": error_msg}
