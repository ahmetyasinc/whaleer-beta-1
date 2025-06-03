import pandas as pd

class EmptyClass:
    def int(self, default=0, **kwargs):
        return default

    def float(self, default=0.0, **kwargs):
        return default

    def bool(self, default=False, **kwargs):
        return default

    def string(self, default="", **kwargs):
        return default
    
    def color(self, default="", **kwargs):
        return default

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    allowed_modules = {"math", "time", "ta", "numpy", "pandas"}
    if name in allowed_modules:
        return __import__(name, globals, locals, fromlist, level)
    raise ImportError(f"Module '{name}' is not allowed")


def empty(*args, **kwargs):
    pass

def calculate_performance(df: pd.DataFrame, commission=0.0, risk_free_rate=0.02) -> dict:
    
    required_cols = ['position', 'close', 'percentage']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"'{col}' kolonu zorunludur.")

    df = df.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    df = df.sort_values(by='timestamp').reset_index(drop=True)
    df[['position', 'close', 'percentage']] = df[['position', 'close', 'percentage']].astype(float)

    df['position_prev'] = df['position'].shift(fill_value=0)
    df['price_prev'] = df['close'].shift(fill_value=0)

    initial_balance = df['close'].iloc[0]
    balance = initial_balance
    balance_prev = initial_balance
    balances = []
    trades = []
    returns = []
    total_volume = 0.0  # İşlem hacmi takibi

    tpOrSlHit = False  # Take Profit veya Stop Loss tetiklendi mi?
    active_position = 0.0
    entry_price = 0.0
    leverage = 0.0
    used_percentage = 0.0
    stop_price = 0.0
    take_price = 0.0
    trade_entry_time = None
    total_trade_duration = 0

    for i in range(len(df)):
        row = df.iloc[i]
        price = row['close']
        price_prev = row['price_prev']
        pos = row['position']
        pos_prev = row['position_prev']
        pct = row['percentage'] / 100.0
        sl = row.get('stop_loss', 0.0)
        tp = row.get('take_profit', 0.0)
        ts = row['timestamp']

        # Yeni pozisyon açma koşulları
        if tpOrSlHit and pos != pos_prev:
            tpOrSlHit = False

        # Pozisyon açıksa kontrolleri yap
        if active_position != 0:
            price_change = (price - price_prev) / price_prev
            if active_position < 0:
                price_change *= -1

            floating_gain = leverage * price_change * used_percentage
            hit_tp = (price >= take_price) if active_position > 0 else (price <= take_price)
            hit_sl = (price <= stop_price) if active_position > 0 else (price >= stop_price)

            # Stop loss veya take profit tetiklendiğinde
            if hit_tp or hit_sl:
                gain_pct = take_price if hit_tp else stop_price
                diff = (gain_pct - entry_price) / entry_price if active_position > 0 else (entry_price - gain_pct) / entry_price
                pnl = gain_pct - price if active_position > 0 else price - gain_pct # bu mumdaki kar dolar
                pnl_pct = diff * 100 #işlemdeki kar yüzdesi
                trade_type = "LONG_CLOSE" if active_position > 0 else "SHORT_CLOSE"
                
                # Trade süresini hesapla
                if trade_entry_time:
                    trade_duration = (ts - trade_entry_time).total_seconds() / 3600  # saat cinsinden
                    total_trade_duration += trade_duration
                
                # İşlem hacmini hesapla (pozisyon büyüklüğü * fiyat)
                trade_amount = used_percentage * balance / entry_price
                trade_volume = trade_amount * price
                total_volume += trade_volume
                
                trades.append({
                    "id": len(trades) + 1,
                    "date": ts,
                    "type": trade_type,
                    "leverage": leverage,
                    "usedPercentage": used_percentage * 100,
                    "amount": trade_amount,
                    "price": price,
                    "commission": balance * commission,
                    "pnlPercentage": round(pnl_pct, 2)
                })
                balance += pnl
                balance -= balance * commission
                active_position = 0.0
                entry_price = leverage = used_percentage = stop_price = take_price = 0.0
                trade_entry_time = None
                tpOrSlHit = True
            # Pozisyon kapatma koşulu
            elif pos == 0: 
                gain_pct = (price - entry_price) / entry_price if active_position > 0 else (entry_price - price) / entry_price
                pnl = floating_gain * balance
                pnl_pct = gain_pct * leverage * used_percentage * 100

                close_type = "LONG_CLOSE" if active_position > 0 else "SHORT_CLOSE"
                active_position = 0.0
                # Trade süresini hesapla
                if trade_entry_time:
                    trade_duration = (ts - trade_entry_time).total_seconds() / 3600  # saat cinsinden
                    total_trade_duration += trade_duration

                # İşlem hacmini hesapla (pozisyon büyüklüğü * fiyat)
                trade_amount = used_percentage * balance / entry_price
                trade_volume = trade_amount * price
                total_volume += trade_volume

                trades.append({
                    "id": len(trades) + 1,
                    "date": ts,
                    "type": close_type,
                    "leverage": leverage,
                    "usedPercentage": used_percentage * 100,
                    "amount": trade_amount,
                    "price": price,
                    "commission": balance * commission,
                    "pnlPercentage": round(pnl_pct, 2)
                })
                balance += pnl
                balance -= balance * commission
            # İşlem Kapanmayacak kar hesapla
            else:
                balance *= (1 + floating_gain)
        
        if i > 0 and pos != 0 and pos != active_position and not tpOrSlHit:
            # Önceki pozisyonu kapat
            if active_position != 0:
                gain_pct = (price - entry_price) / entry_price if active_position > 0 else (entry_price - price) / entry_price
                pnl_pct = gain_pct * leverage * used_percentage * 100
                close_type = "LONG_CLOSE" if active_position > 0 else "SHORT_CLOSE"
                
                # Trade süresini hesapla
                if trade_entry_time:
                    trade_duration = (ts - trade_entry_time).total_seconds() / 3600  # saat cinsinden
                    total_trade_duration += trade_duration
                
                # İşlem hacmini hesapla (pozisyon büyüklüğü * fiyat)
                trade_amount = used_percentage * balance / entry_price
                trade_volume = trade_amount * price
                total_volume += trade_volume
                
                trades.append({
                    "id": len(trades) + 1,
                    "date": ts,
                    "type": close_type,
                    "leverage": leverage,
                    "usedPercentage": used_percentage * 100,
                    "amount": trade_amount,
                    "price": price,
                    "commission": balance * commission,
                    "pnlPercentage": round(pnl_pct, 2)
                })
                balance -= balance * commission

            # Yeni pozisyon açılıyor
            active_position = pos
            leverage = abs(pos)
            entry_price = price
            used_percentage = pct
            stop_price = sl
            take_price = tp
            trade_entry_time = ts
            open_type = "LONG_OPEN" if pos > 0 else "SHORT_OPEN"
            
            # Açılış işlemi için de hacim hesapla
            trade_amount = used_percentage * balance / price
            trade_volume = trade_amount * price
            total_volume += trade_volume
            
            trades.append({
                "id": len(trades) + 1,
                "date": ts,
                "type": open_type,
                "leverage": leverage,
                "usedPercentage": used_percentage * 100,
                "amount": trade_amount,
                "price": price,
                "commission": balance * commission
            })
            balance -= balance * commission
        
        if balance == balance_prev:
            returns.append((int(ts.timestamp()), 0.0))
        else:
            returnable = (balance - balance_prev) / balance_prev
            returns.append((int(ts.timestamp()), round(returnable * 100, 4)))

        balances.append((int(ts.timestamp()), balance))
        balance_prev = balance

    # Metrikler
    pnl_list = [t.get('pnlPercentage', 0) for t in trades if 'pnlPercentage' in t]
    wins = [p for p in pnl_list if p > 0]
    losses = [p for p in pnl_list if p < 0]
    most_win = max(wins) if wins else 0
    most_loss = min(losses) if losses else 0
    winRate = (
        100 if wins and not losses else
        0 if losses and not wins else
        round(len(wins) / (len(wins) + len(losses)) * 100, 2) if wins or losses else 0
    )

    # Max Drawdown
    max_drawdown = 0
    peak = balances[0][1]
    for _, b in balances:
        if b > peak:
            peak = b
        dd = (peak - b) / peak
        if dd > max_drawdown:
            max_drawdown = dd

    # Sharpe Ratio hesaplama
    if len(returns) > 1:
        return_values = [r[1]/100 for r in returns]  # Yüzdelik değerleri ondalığa çevir
        mean_return = sum(return_values) / len(return_values)
        
        # Günlük risksiz getiri (yıllık %2'yi günlüğe çevir)
        daily_risk_free = (1 + risk_free_rate) ** (1/365) - 1
        
        # Standart sapma hesaplama
        if len(return_values) > 1:
            variance = sum((r - mean_return) ** 2 for r in return_values) / (len(return_values) - 1)
            std_dev = variance ** 0.5
            sharpe_ratio = (mean_return - daily_risk_free) / std_dev if std_dev > 0 else 0
        else:
            sharpe_ratio = 0
    else:
        sharpe_ratio = 0

    # Sortino Ratio hesaplama
    if len(returns) > 1:
        return_values = [r[1]/100 for r in returns]
        mean_return = sum(return_values) / len(return_values)
        daily_risk_free = (1 + risk_free_rate) ** (1/365) - 1
        
        # Sadece negatif getiriler için standart sapma
        negative_returns = [r for r in return_values if r < 0]
        if len(negative_returns) > 1:
            downside_variance = sum((r - 0) ** 2 for r in negative_returns) / len(negative_returns)
            downside_deviation = downside_variance ** 0.5
            sortino_ratio = (mean_return - daily_risk_free) / downside_deviation if downside_deviation > 0 else 0
        else:
            sortino_ratio = sharpe_ratio  # Negatif getiri yoksa Sharpe ile aynı
    else:
        sortino_ratio = 0

    # Duration Of Trade Ratio hesaplama
    total_period_hours = (df['timestamp'].iloc[-1] - df['timestamp'].iloc[0]).total_seconds() / 3600
    duration_ratio = total_trade_duration / total_period_hours if total_period_hours > 0 else 0

    return {
        "chartData": [{"time": t, "value": round(b, 2)} for t, b in balances],
        "performance": {
            "returnPercentage": round((balance - initial_balance) / initial_balance * 100, 2),
            "totalPnL": round(balance - initial_balance, 2),
            "totalTrades": len([t for t in trades if 'CLOSE' in t['type']]),
            "winningTrades": len(wins),
            "losingTrades": len(losses),
            "winRate": round(winRate, 2),
            "initialBalance": round(initial_balance, 2),
            "finalBalance": round(balance, 2),
            "maxDrawdown": round(-max_drawdown * 100, 2),
            "sharpeRatio": round(sharpe_ratio, 3),
            "profitFactor": round(sum(wins) / abs(sum(losses)), 2) if losses else None,
            "buyHoldReturn": round((df['close'].iloc[-1] - initial_balance) / initial_balance * 100, 2),
            "sortinoRatio": round(sortino_ratio, 3),
            "mostProfitableTrade": round(most_win, 2),
            "mostLosingTrade": round(most_loss, 2),
            "durationOftradeRatio": round(duration_ratio, 4),
            "commissionCost": round(initial_balance * commission * len(trades), 2),
            "volume": round(total_volume, 2)
        },
        "trades": trades[::-1],
        "returns": returns
    }