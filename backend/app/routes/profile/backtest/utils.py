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

def calculate_performance(df: pd.DataFrame, commission=0.0, risk_free_rate=0.02, debug=True) -> dict:
    def log(*args, **kwargs):
        if debug:
            print(*args, **kwargs)

    def fmt(x):
        """Safe formatter for prices that may be None/NaN."""
        try:
            if x is None or pd.isna(x):
                return "None"
            return f"{float(x):.6f}"
        except Exception:
            return str(x)

    print("**POSITION (HEAD 100)**")
    print(df["position"].head(100))

    required_cols = ['position', 'close', 'percentage', 'timestamp']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"'{col}' kolonu zorunludur.")

    # Are TP/SL columns present?
    has_tp_col = 'take_profit' in df.columns
    has_sl_col = 'stop_loss' in df.columns

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
    total_volume = 0.0

    tpOrSlHit = False
    active_position = 0.0
    entry_price = 0.0
    leverage = 0.0
    used_percentage = 0.0
    stop_price = None
    take_price = None
    trade_entry_time = None
    total_trade_duration = 0

    #log("=== START BACKTEST ===")
    #log(f"Rows: {len(df)}, Initial balance: {initial_balance}, Commission: {commission}, Rf: {risk_free_rate}")
    #log("First rows snapshot:\n", df[['timestamp','close','position','percentage','position_prev','price_prev']].head(5))

    for i in range(len(df)):
        row = df.iloc[i]
        price = float(row['close'])
        price_prev = float(row['price_prev'])
        pos = float(row['position'])
        pos_prev = float(row['position_prev'])
        pct = float(row['percentage']) / 100.0
        ts = row['timestamp']

        # Read TP/SL only if columns exist; None means "not set / ignore"
        tp = None
        sl = None
        if has_tp_col:
            val = row['take_profit']
            tp = None if pd.isna(val) or float(val) == 0.0 else float(val)
        if has_sl_col:
            val = row['stop_loss']
            sl = None if pd.isna(val) or float(val) == 0.0 else float(val)

        #if pd.isna(ts):
            #log(f"[{i}] WARNING: NaT timestamp row; skipping calc safety-check context -> {row.to_dict()}")

        #log(f"[{i}] {ts} | price={price:.6f} prev={price_prev:.6f} pos={pos} prev_pos={pos_prev} "f"active={active_position} bal={balance:.6f} tpOrSlHit={tpOrSlHit}")

        # Reset tp/sl latch on new signal after a hit
        if tpOrSlHit and pos != pos_prev:
            #log(f"[{i}] tpOrSlHit reset path: new signal pos {pos} vs prev {pos_prev}")
            tpOrSlHit = False

        # If a position is active, manage it
        if active_position != 0:
            if price_prev == 0:
                #log(f"[{i}] WARNING: price_prev==0 while active position. Avoiding div-by-zero in price_change.")
                price_change = 0.0
            else:
                price_change = (price - price_prev) / price_prev

            if active_position < 0:
                price_change *= -1

            floating_gain = leverage * price_change * used_percentage

            # Evaluate TP/SL ONLY if set (not None)
            hit_tp = False
            hit_sl = False
            if take_price is not None:
                hit_tp = (price >= take_price) if active_position > 0 else (price <= take_price)
            if stop_price is not None:
                hit_sl = (price <= stop_price) if active_position > 0 else (price >= stop_price)

            #log(f"[{i}] ACTIVE pos={active_position} lev={leverage} entry={fmt(entry_price)} "f"used%={used_percentage*100:.2f} tp={fmt(take_price)} sl={fmt(stop_price)} "f"price_change={price_change:.6f} floating_gain={floating_gain:.8f} hitTP={hit_tp} hitSL={hit_sl}")

            # Exit on TP/SL
            if hit_tp or hit_sl:
                gain_price = take_price if hit_tp else stop_price
                diff = (gain_price - entry_price) / entry_price if active_position > 0 else (entry_price - gain_price) / entry_price
                pnl = gain_price - price if active_position > 0 else price - gain_price
                pnl_pct = diff * 100
                trade_type = "LONG_CLOSE" if active_position > 0 else "SHORT_CLOSE"
                #log(f"[{i}] EXIT BY TP/SL -> {trade_type} at {fmt(gain_price)} | pnl%={pnl_pct:.4f} pnl$={pnl:.6f}")

                if trade_entry_time:
                    trade_duration = (ts - trade_entry_time).total_seconds() / 3600
                    total_trade_duration += trade_duration
                    #log(f"[{i}] Trade duration hours: {trade_duration:.4f}")

                trade_amount = 0.0 if entry_price == 0 else used_percentage * balance / entry_price
                trade_volume = trade_amount * price
                total_volume += trade_volume
                #log(f"[{i}] Volume add on exit: {trade_volume:.6f} (total: {total_volume:.6f})")

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
                #log(f"[{i}] Balance after pnl: {balance:.6f}")
                balance -= balance * commission
                #log(f"[{i}] Balance after commission: {balance:.6f}")
                active_position = 0.0
                entry_price = leverage = used_percentage = 0.0
                stop_price = take_price = None
                trade_entry_time = None
                tpOrSlHit = True

            # Exit to flat by signal
            elif pos == 0:
                gain_pct = (price - entry_price) / entry_price if active_position > 0 else (entry_price - price) / entry_price
                pnl = floating_gain * balance
                pnl_pct = gain_pct * leverage * used_percentage * 100
                close_type = "LONG_CLOSE" if active_position > 0 else "SHORT_CLOSE"
                #log(f"[{i}] EXIT BY SIGNAL to flat -> {close_type} | gain%={gain_pct*100:.4f} pnl%={pnl_pct:.4f} pnl$={pnl:.6f}")

                if trade_entry_time:
                    trade_duration = (ts - trade_entry_time).total_seconds() / 3600
                    total_trade_duration += trade_duration
                    #log(f"[{i}] Trade duration hours: {trade_duration:.4f}")

                trade_amount = 0.0 if entry_price == 0 else used_percentage * balance / entry_price
                trade_volume = trade_amount * price
                total_volume += trade_volume
                #log(f"[{i}] Volume add on flat exit: {trade_volume:.6f} (total: {total_volume:.6f})")

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
                #log(f"[{i}] Balance after pnl: {balance:.6f}")
                balance -= balance * commission
                #log(f"[{i}] Balance after commission: {balance:.6f}")

                active_position = 0.0
                entry_price = leverage = used_percentage = 0.0
                stop_price = take_price = None
                trade_entry_time = None

            # Hold: apply floating P&L
            else:
                balance_before = balance
                balance *= (1 + floating_gain)
                #log(f"[{i}] HOLDING -> balance {balance_before:.6f} -> {balance:.6f} (floating_gain={floating_gain:.8f})")

        # Open / flip #logic (only if not immediately after TP/SL)
        if i > 0 and pos != 0 and pos != active_position and not tpOrSlHit:
            if active_position != 0:
                gain_pct = (price - entry_price) / entry_price if active_position > 0 else (entry_price - price) / entry_price
                pnl_pct = gain_pct * leverage * used_percentage * 100
                close_type = "LONG_CLOSE" if active_position > 0 else "SHORT_CLOSE"
                #log(f"[{i}] FLIP CLOSE -> {close_type} | gain%={gain_pct*100:.4f} pnl%={pnl_pct:.4f}")

                if trade_entry_time:
                    trade_duration = (ts - trade_entry_time).total_seconds() / 3600
                    total_trade_duration += trade_duration
                    #log(f"[{i}] Trade duration hours: {trade_duration:.4f}")

                trade_amount = 0.0 if entry_price == 0 else used_percentage * balance / entry_price
                trade_volume = trade_amount * price
                total_volume += trade_volume
                #log(f"[{i}] Volume add on flip close: {trade_volume:.6f} (total: {total_volume:.6f})")

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
                #log(f"[{i}] Balance after commission (flip close): {balance:.6f}")

            # Open new position
            active_position = pos
            leverage = abs(pos)
            entry_price = price
            used_percentage = pct
            # Set TP/SL for the new trade only if provided
            take_price = tp
            stop_price = sl
            trade_entry_time = ts
            open_type = "LONG_OPEN" if pos > 0 else "SHORT_OPEN"
            #log(f"[{i}] OPEN -> {open_type} at {price:.6f} lev={leverage} used%={used_percentage*100:.2f} "f"tp={fmt(take_price)} sl={fmt(stop_price)}")

            trade_amount = used_percentage * balance / price if price != 0 else 0.0
            #if price == 0:
                #log(f"[{i}] WARNING: price==0 at open; trade_amount forced to 0")
            trade_volume = trade_amount * price
            total_volume += trade_volume
            #log(f"[{i}] Volume add on open: {trade_volume:.6f} (total: {total_volume:.6f})")

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
            #log(f"[{i}] Balance after commission (open): {balance:.6f}")

        # Returns tracking
        if balance == balance_prev or (balance_prev == 0):
            ret_val = 0.0 if balance_prev != 0 else 0.0
        else:
            ret_val = (balance - balance_prev) / balance_prev * 100.0
        returns.append((int(ts.timestamp()) if pd.notna(ts) else 0, round(ret_val, 4)))

        balances.append((int(ts.timestamp()) if pd.notna(ts) else 0, balance))
        balance_prev = balance

    # Metrics
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
        dd = (peak - b) / peak if peak != 0 else 0
        if dd > max_drawdown:
            max_drawdown = dd

    # Sharpe Ratio
    if len(returns) > 1:
        return_values = [r[1]/100 for r in returns]
        mean_return = sum(return_values) / len(return_values)
        daily_risk_free = (1 + risk_free_rate) ** (1/365) - 1
        if len(return_values) > 1:
            variance = sum((r - mean_return) ** 2 for r in return_values) / (len(return_values) - 1)
            std_dev = variance ** 0.5
            sharpe_ratio = (mean_return - daily_risk_free) / std_dev if std_dev > 0 else 0
        else:
            sharpe_ratio = 0
    else:
        sharpe_ratio = 0

    # Sortino Ratio
    if len(returns) > 1:
        return_values = [r[1]/100 for r in returns]
        mean_return = sum(return_values) / len(return_values)
        daily_risk_free = (1 + risk_free_rate) ** (1/365) - 1
        negative_returns = [r for r in return_values if r < 0]
        if len(negative_returns) > 1:
            downside_variance = sum((r - 0) ** 2 for r in negative_returns) / len(negative_returns)
            downside_deviation = downside_variance ** 0.5
            sortino_ratio = (mean_return - daily_risk_free) / downside_deviation if downside_deviation > 0 else 0
        else:
            sortino_ratio = sharpe_ratio
    else:
        sortino_ratio = 0

    # Duration Of Trade Ratio
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