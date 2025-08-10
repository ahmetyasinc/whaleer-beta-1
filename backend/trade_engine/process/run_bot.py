#BURADA HATA ÇIKABİLİR
from backend.app.services.allowed_globals.allowed_globals_indicator import allowed_globals_indicator 
from backend.trade_engine.control.control_the_results import control_the_results

def run_bot(bot, strategy_code, indicator_list, coin_data_dict):

    order_fields = {
        "order_type": "", "limit_price": 0.0, "stop_price": 0.0, "stop_limit_price": 0.0,
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
        print(f"Bot ID: {bot['id']} için veri bulunamadı.")
        return {"bot_id": bot['id'], "status": "no_data", "duration": 0.0}

    try:
        print(f"Bot ID: {bot['id']} çalıştırılıyor...")
        results = []

        for coin_id in bot['stocks']:
            if coin_id not in df_dict:
                results.append({
                    "bot_id": bot['id'], "coin_id": coin_id,
                    "period": bot['period'], "status": "skipped", "message": "No data."
                })
                continue

            allowed_globals = allowed_globals_indicator(df, print_outputs=None, indicator_results=None, updated=False, for_strategy=False, for_backtest=True)

            for indicator in indicator_list:
                exec(indicator['code'], allowed_globals)

            exec(strategy_code, allowed_globals)

            result_df = allowed_globals['df']
            last_positions = result_df['position'].iloc[-2:].tolist() if 'position' in result_df.columns and len(result_df) >= 2 else None
            last_percentage = result_df['percentage'].iloc[-2:].tolist() if 'percentage' in result_df.columns and len(result_df) >= 2 else None

            order_info = {
                field: result_df[field].iloc[-1]
                for field in order_fields
                if field in result_df.columns and len(result_df) > 0
            }

            result_entry = {
                "bot_id": bot['id'], "coin_id": coin_id, #"period": bot['period'],
                "status": "success", "last_positions": last_positions, "last_percentage": last_percentage,
            }
            result_entry.update(order_info)
            results.append(result_entry)

        results = control_the_results(bot['id'], results)

        # 💡 Toplam sürenin de eklenmesi için metadata objesi
        return {
            "bot_id": bot['id'],
            "status": "success",
            "results": results
        }

    except Exception as e:
        import traceback
        error_msg = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Bot ID: {bot['id']} çalışırken hata oluştu:\n{error_msg}")
        return {"bot_id": bot['id'], "status": "error", "error": error_msg}

