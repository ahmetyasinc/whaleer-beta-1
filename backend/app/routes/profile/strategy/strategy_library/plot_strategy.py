import pandas as pd
import numpy as np
import math

def plot_strategy(strategy_name, strategy_graph, df, commission=0.0, type="line"):
    required_cols = ['position', 'close', 'percentage', 'stop_loss', 'take_profit']
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
    print(f"Başlangıç bakiyesi: {balance}")
    balances = []
    timestamps = []

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

        # --- AKTİF POZİSYON VARSA ---
        if active_position != 0:
            price_change = (price - price_prev) / price_prev
            if active_position < 0:
                price_change *= -1

            floating_gain = leverage * price_change * used_percentage

            hit_tp = (price >= take_price) if active_position > 0 else (price <= take_price)
            hit_sl = (price <= stop_price) if active_position > 0 else (price >= stop_price)

            # STOP NOKTALARI TETİKLENİRSE
            if hit_tp or hit_sl:
                print(f"{ts}, Kapanma sebebi: {hit_sl, hit_tp}, Active Position: {active_position} - Take Profit: {take_price} - Stop Loss: {stop_price} - Kapanış fiyatı: {price}")
                # Pozisyon kapanıyor
                balance *= (1 + floating_gain)
                balance -= balance * commission
                active_position = 0.0
                entry_price = 0.0
                leverage = 0.0
                used_percentage = 0.0
                stop_price = 0.0
                take_price = 0.0

            # POZİSYON HALA AÇIK İSE
            else:
                # Pozisyon açık: sadece floating kar
                balance *= (1 + floating_gain)

        # --- YENİ POZİSYON AÇILIYORSA ---
        if i > 0 and pos != 0 and pos != pos_prev:
            # ÖNCEK POZİSYON KAPATACAKSA
            if active_position != 0:
                print(f"{ts}, Pozisyon kapatılıyor: {active_position} - Kapanış fiyatı: {price} - Commission: {balance * commission}")
                balance -= balance * commission
            active_position = pos
            leverage = abs(pos)
            entry_price = price
            used_percentage = pct
            stop_price = sl
            take_price = tp
            balance -= balance * commission  # giriş komisyonu
            print(f"{ts}, Pozisyon açıldı: {active_position} - Giriş fiyatı: {entry_price} - Commission: {balance * commission}")

        # Pozisyon yoksa sadece bakiyeyi güncelle
        balances.append(balance)
        timestamps.append(ts)
            
    def is_valid(v):
        try:
            return not (pd.isna(v) or math.isinf(v))
        except:
            return False

    graph_data = [(t, b) for t, b in zip(timestamps, balances) if is_valid(b)]

    strategy_graph.append({
        "name": strategy_name,
        "type": type,
        "data": graph_data
    })
