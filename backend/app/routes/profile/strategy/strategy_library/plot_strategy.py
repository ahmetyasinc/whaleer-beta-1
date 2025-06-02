import pandas as pd
import numpy as np
import math
from app.routes.profile.strategy.strategy_library.print_strategy import custom_print

def plot_strategy(strategy_name, strategy_graph, print_outputs, df, commission=0.0, *, color="orange", width=2, linestyle="line", info_return=False, info_trades=False):
    required_cols = ['position', 'close', 'percentage']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"DataFrame içinde '{col}' sütunu bulunmalıdır!")

    if not np.issubdtype(df.index.dtype, np.datetime64):
        if 'timestamp' in df.columns:
            df = df.copy()
            df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        else:
            raise ValueError("Zaman bilgisi için ya datetime index ya da 'timestamp' sütunu olmalı!")
    else:
        df['timestamp'] = df.index

    df = df.sort_values(by='timestamp').copy()
    df[['position', 'close', 'percentage']] = df[['position', 'close', 'percentage']].astype(float)
    df['position_prev'] = df['position'].shift(fill_value=0)
    df['price_prev'] = df['close'].shift(fill_value=0)

    initial_balance = df['close'].iloc[0]
    balance = initial_balance
    balances = []
    timestamps = []
    trades = []

    active_position = 0.0
    entry_price = 0.0
    leverage = 0.0
    used_percentage = 0.0
    stop_price = 0.0
    take_price = 0.0

    for i in range(len(df)):
        row = df.iloc[i]
        price = row['close']
        price_prev = row['price_prev']
        pos = row['position']
        pos_prev = row['position_prev']
        pct = row['percentage'] / 100.0
        sl = row['stop_loss']
        tp = row['take_profit']
        ts = row['timestamp']

        if active_position != 0:
            price_change = (price - price_prev) / price_prev
            if active_position < 0:
                price_change *= -1

            floating_gain = leverage * price_change * used_percentage

            hit_tp = (price >= take_price) if active_position > 0 else (price <= take_price)
            hit_sl = (price <= stop_price) if active_position > 0 else (price >= stop_price)

            if hit_tp or hit_sl:
                gain_pct = floating_gain * 100
                trades.append({
                    "- timestamp -": ts,
                    "entry  -": entry_price,
                    "exit  -": price,
                    "type -": "long" if active_position > 0 else "short",
                    "gain_(%)": round(gain_pct, 2),
                })
                balance *= (1 + floating_gain)
                balance -= balance * commission
                active_position = 0.0
                entry_price = leverage = used_percentage = stop_price = take_price = 0.0
            else:
                balance *= (1 + floating_gain)

        if i > 0 and pos != 0 and pos != pos_prev:
            if active_position != 0:
                balance -= balance * commission
                gain_pct = (price - entry_price) / entry_price * 100 if active_position != 0 else 0.0
                trades.append({
                    "- timestamp -": ts,
                    "entry  -": entry_price,
                    "exit  -": price,
                    "type -": "long" if active_position > 0 else "short",
                    "gain_(%)": round(gain_pct, 2),
                })
            active_position = pos
            leverage = abs(pos)
            entry_price = price
            used_percentage = pct
            stop_price = sl
            take_price = tp
            balance -= balance * commission

        balances.append(balance)
        timestamps.append(ts)

    def is_valid(v):
        try:
            return not (pd.isna(v) or math.isinf(v))
        except:
            return False

    graph_data = [(t, b) for t, b in zip(timestamps, balances) if is_valid(b)]

    graph_entry = {
        "name": strategy_name,
        "data": graph_data,
        "style": {
            "color": color,
            "width": width,
            "linestyle": linestyle
        }
    }
    if info_return:
        chart_balance = df["close"].iloc[-1]
        chart_initial_balance = df["close"].iloc[0]
        chart_return = (chart_balance- chart_initial_balance) / chart_initial_balance * 100
        total_return = (balance - initial_balance) / initial_balance * 100
        difference = (balance - chart_balance) / chart_balance * 100
        custom_print(print_outputs, f"Total Stock Return: {chart_return:.2f}%")
        custom_print(print_outputs, f"Total Strategy Return: {total_return:.2f}%")
        custom_print(print_outputs, f"Difference: {difference:.2f}%")

    if info_trades and trades:
        trades_df = pd.DataFrame(trades)
        custom_print(print_outputs, "Trades:")
        custom_print(print_outputs, trades_df)



    strategy_graph.append(graph_entry)