import pandas as pd

def calculate_performance(
    df: pd.DataFrame,
    commission: float = 0.0,
    risk_free_rate: float = 0.02,
    debug: bool = False,
    initial_balance: float = 10000.0
) -> dict:
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

    def pnl_pct_from(entry_price: float, exit_price: float, side: float) -> float:
        """
        Price-based P&L % from entry to exit.
        side > 0 => long, side < 0 => short.
        """
        try:
            if entry_price == 0:
                return 0.0
            raw = (exit_price - entry_price) / entry_price
            return (raw * 100.0) if side > 0 else (-raw * 100.0)
        except Exception:
            return 0.0

    def pnl_amount_from(entry_price: float, exit_price: float, side: float, qty: float) -> float:
        """
        Currency P&L on the closed quantity (qty in asset units).
        Long:  (exit - entry) * qty
        Short: (entry - exit) * qty
        """
        if qty <= 0 or entry_price == 0:
            return 0.0
        diff = (exit_price - entry_price)
        return diff * qty if side > 0 else (-diff * qty)

    def pct_str(p01: float) -> str:
        """Format a 0..1 ratio as '%XX' (integer)."""
        try:
            if p01 is None or pd.isna(p01):
                return "%0"
            p01 = max(0.0, min(1.0, float(p01)))
            return f"%{int(round(p01 * 100))}"
        except Exception:
            return "%0"

    def pct_change_str(old_p01: float, new_p01: float) -> str:
        return f"{pct_str(old_p01)} -> {pct_str(new_p01)}"

    log("First rows snapshot:\n", df[['timestamp','close','position','percentage']].head(100))

    # Validate / clean numeric columns
    for col in ['position', 'close', 'percentage']:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Align rows where exactly one of (position, percentage) is zero: force both to zero
    mismatch_mask = (
        ((df['position'] == 0) & (df['percentage'] != 0)) |
        ((df['position'] != 0) & (df['percentage'] == 0))
    )
    if debug:
        n_fix = int(mismatch_mask.sum())
        if n_fix:
            log(f"Aligned {n_fix} rows where only one of (position, percentage) was zero -> set both to 0.")
    df.loc[mismatch_mask, ['position', 'percentage']] = 0

    # Final NaN check after cleaning
    if df[['position', 'close', 'percentage']].isna().any().any():
        raise ValueError("position/close/percentage contain non-numeric values.")

    # Optional TP/SL
    has_tp_col = 'take_profit' in df.columns
    has_sl_col = 'stop_loss' in df.columns

    # Prep
    df = df.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    df = df.sort_values(by='timestamp').reset_index(drop=True)
    df[['position', 'close', 'percentage']] = df[['position', 'close', 'percentage']].astype(float)
    df['position_prev'] = df['position'].shift(fill_value=0)
    df['price_prev'] = df['close'].shift(fill_value=0)

    # State
    balance = float(initial_balance)
    balance_prev = float(initial_balance)
    balances = []
    trades = []
    returns = []
    total_volume = 0.0
    commission_paid_total = 0.0  # <— NEW: track real commission paid

    tpOrSlHit = False
    active_position = 0.0
    entry_price = 0.0
    leverage = 0.0
    used_percentage = 0.0  # 0..1
    stop_price = None
    take_price = None
    trade_entry_time = None
    total_trade_duration = 0.0
    position_size = 0.0  # asset units

    log("=== START BACKTEST ===")
    log(f"Rows: {len(df)}, Initial balance: {initial_balance}, Commission: {commission}")
    log("First rows snapshot:\n", df[['timestamp','close','position','percentage']].head(100))

    first_close = float(df['close'].iloc[0])
    last_close = float(df['close'].iloc[-1])

    last_idx = len(df) - 1

    for i in range(len(df)):
        row = df.iloc[i]
        price = float(row['close'])
        price_prev = float(row['price_prev'])
        pos = float(row['position'])
        pos_prev = float(row['position_prev'])
        pct = float(row['percentage']) / 100.0  # 0..1
        ts = row['timestamp']

        # Read TP/SL if present
        tp = None
        sl = None
        if has_tp_col:
            val = row['take_profit']
            tp = None if pd.isna(val) or float(val) == 0.0 else float(val)
        if has_sl_col:
            val = row['stop_loss']
            sl = None if pd.isna(val) or float(val) == 0.0 else float(val)

        # Reset latch after a new signal arrives
        if tpOrSlHit and pos != pos_prev:
            tpOrSlHit = False

        # === Manage active position ===
        if active_position != 0:
            # price change for current bar
            if price_prev == 0:
                price_change = 0.0
            else:
                price_change = (price - price_prev) / price_prev
            if active_position < 0:
                price_change *= -1

            floating_gain = leverage * price_change * used_percentage

            # TP/SL checks
            hit_tp = False
            hit_sl = False
            if take_price is not None:
                hit_tp = (price >= take_price) if active_position > 0 else (price <= take_price)
            if stop_price is not None:
                hit_sl = (price <= stop_price) if active_position > 0 else (price >= stop_price)

            # --- Exit by TP/SL ---
            if hit_tp or hit_sl:
                exit_price = take_price if hit_tp else stop_price
                # Keep your MTM-style balance logic as-is:
                diff = (exit_price - entry_price) / entry_price if active_position > 0 else (entry_price - exit_price) / entry_price
                pnl = exit_price - price if active_position > 0 else price - exit_price  # (legacy)
                pnl_pct = pnl_pct_from(entry_price, exit_price, active_position)

                # Realized P&L (currency) on full size:
                qty = position_size
                pnl_amount = pnl_amount_from(entry_price, exit_price, active_position, qty)

                trade_type = "LONG_CLOSE" if active_position > 0 else "SHORT_CLOSE"

                if trade_entry_time:
                    trade_duration = (ts - trade_entry_time).total_seconds() / 3600
                    total_trade_duration += trade_duration

                trade_amount = qty
                trade_volume = abs(trade_amount * exit_price)
                total_volume += trade_volume
                commission_fee = trade_volume * commission
                commission_paid_total += commission_fee

                change_str = pct_change_str(used_percentage, 0.0)

                trades.append({
                    "id": len(trades) + 1,
                    "date": ts,
                    "type": trade_type,
                    "leverage": leverage,
                    "usedPercentage": change_str,
                    "amount": trade_amount,
                    "price": exit_price,
                    "commission": round(commission_fee, 6),
                    "pnlPercentage": round(pnl_pct, 2),
                    "pnlAmount": round(pnl_amount, 2),
                })

                balance += pnl         # (legacy calc kept)
                balance -= commission_fee

                # reset all
                active_position = 0.0
                entry_price = leverage = used_percentage = 0.0
                stop_price = take_price = None
                trade_entry_time = None
                position_size = 0.0
                tpOrSlHit = True

            # --- Exit to flat by signal (pos == 0) ---
            elif pos == 0:
                pnl = floating_gain * balance  # (legacy)
                pnl_pct = pnl_pct_from(entry_price, price, active_position)

                # Realized P&L in currency on full size:
                qty = position_size
                pnl_amount = pnl_amount_from(entry_price, price, active_position, qty)

                close_type = "LONG_CLOSE" if active_position > 0 else "SHORT_CLOSE"

                if trade_entry_time:
                    trade_duration = (ts - trade_entry_time).total_seconds() / 3600
                    total_trade_duration += trade_duration

                trade_amount = qty
                trade_volume = abs(trade_amount * price)
                total_volume += trade_volume
                commission_fee = trade_volume * commission
                commission_paid_total += commission_fee

                change_str = pct_change_str(used_percentage, 0.0)

                trades.append({
                    "id": len(trades) + 1,
                    "date": ts,
                    "type": close_type,
                    "leverage": leverage,
                    "usedPercentage": change_str,
                    "amount": trade_amount,
                    "price": price,
                    "commission": round(commission_fee, 6),
                    "pnlPercentage": round(pnl_pct, 2),
                    "pnlAmount": round(pnl_amount, 2),
                })
                balance += pnl         # (legacy)
                balance -= commission_fee

                active_position = 0.0
                entry_price = leverage = used_percentage = 0.0
                stop_price = take_price = None
                trade_entry_time = None
                position_size = 0.0

            # --- Force close at end-of-data (treat as if pos==0) ---
            elif i == last_idx:
                pnl = floating_gain * balance                      # same "legacy" MTM style as signal exit
                pnl_pct = pnl_pct_from(entry_price, price, active_position)

                qty = position_size
                pnl_amount = pnl_amount_from(entry_price, price, active_position, qty)

                close_type = "LONG_END_CLOSE" if active_position > 0 else "SHORT_END_CLOSE"
        
                if trade_entry_time:
                    trade_duration = (ts - trade_entry_time).total_seconds() / 3600
                    total_trade_duration += trade_duration
        
                trade_amount = qty
                trade_volume = abs(trade_amount * price)
                total_volume += trade_volume
                #commission_fee = trade_volume * commission
                #commission_paid_total += commission_fee
        
                change_str = pct_change_str(used_percentage, 0.0)
        
                trades.append({
                    "id": len(trades) + 1,
                    "date": ts,
                    "type": close_type,                   # <- clearly labeled as end-of-data close
                    "leverage": leverage,
                    "usedPercentage": change_str,
                    "amount": trade_amount,
                    "price": price,
                    "commission": 0.0, #round(commission_fee, 6),
                    "pnlPercentage": round(pnl_pct, 2),
                    "pnlAmount": round(pnl_amount, 2),
                })
        
                balance += pnl
                #balance -= commission_fee
        
                # reset state
                active_position = 0.0
                entry_price = leverage = used_percentage = 0.0
                stop_price = take_price = None
                trade_entry_time = None
                position_size = 0.0
    

            # --- Hold: MTM, then rebalance by percentage change on same side ---
            else:
                # 1) Mark-to-market using *current* used_percentage
                balance *= (1 + floating_gain)

                # 2) Rebalance size when percentage changes but side is same
                desired_pct = pct  # 0..1
                same_side = (pos != 0) and (active_position * pos > 0)

                if same_side and abs(desired_pct - used_percentage) > 1e-12:
                    if desired_pct > used_percentage:
                        # SCALE IN (partial open)
                        add_pct = desired_pct - used_percentage
                        add_amount = (add_pct * balance) / price if price != 0 else 0.0

                        # VWAP entry price after adding size
                        if position_size + add_amount > 0:
                            entry_price = (
                                (entry_price * position_size) + (price * add_amount)
                            ) / (position_size + add_amount)

                        change_str = pct_change_str(used_percentage, desired_pct)

                        position_size += add_amount
                        used_percentage = desired_pct

                        trade_type = "LONG_PARTIAL_OPEN" if active_position > 0 else "SHORT_PARTIAL_OPEN"
                        trade_volume = abs(add_amount * price)
                        total_volume += trade_volume
                        commission_fee = trade_volume * commission
                        commission_paid_total += commission_fee

                        trades.append({
                            "id": len(trades) + 1,
                            "date": ts,
                            "type": trade_type,
                            "leverage": leverage,
                            "usedPercentage": change_str,
                            "amount": add_amount,
                            "price": price,
                            "commission": round(commission_fee, 6)
                        })
                        balance -= commission_fee

                    else:
                        # SCALE OUT (partial close)
                        reduce_pct = used_percentage - desired_pct  # > 0
                        close_frac = reduce_pct / used_percentage if used_percentage > 0 else 1.0
                        close_amount = position_size * close_frac

                        change_str = pct_change_str(used_percentage, desired_pct)

                        trade_type = "LONG_PARTIAL_CLOSE" if active_position > 0 else "SHORT_PARTIAL_CLOSE"
                        trade_volume = abs(close_amount * price)
                        total_volume += trade_volume
                        commission_fee = trade_volume * commission
                        commission_paid_total += commission_fee

                        realized_pct = pnl_pct_from(entry_price, price, active_position)
                        pnl_amount = pnl_amount_from(entry_price, price, active_position, close_amount)

                        trades.append({
                            "id": len(trades) + 1,
                            "date": ts,
                            "type": trade_type,
                            "leverage": leverage,
                            "usedPercentage": change_str,
                            "amount": close_amount,
                            "price": price,
                            "commission": round(commission_fee, 6),
                            "pnlPercentage": round(realized_pct, 2),
                            "pnlAmount": round(pnl_amount, 2),
                        })
                        balance -= commission_fee

                        position_size -= close_amount
                        used_percentage = desired_pct

                        if desired_pct <= 0:
                            active_position = 0.0
                            leverage = 0.0
                            entry_price = 0.0
                            take_price = None
                            stop_price = None
                            trade_entry_time = None
                            position_size = 0.0

        # === Open / flip logic (only if not immediately after TP/SL) ===
        if i > 0 and i < last_idx and pos != 0 and pos != active_position and not tpOrSlHit:
            if active_position != 0:
                # Close old side (flip close). MTM already applied above.
                pnl_pct = pnl_pct_from(entry_price, price, active_position)
                pnl_amount = pnl_amount_from(entry_price, price, active_position, position_size)
                close_type = "LONG_CLOSE" if active_position > 0 else "SHORT_CLOSE"

                if trade_entry_time:
                    trade_duration = (ts - trade_entry_time).total_seconds() / 3600
                    total_trade_duration += trade_duration

                trade_amount = position_size
                trade_volume = abs(trade_amount * price)
                total_volume += trade_volume
                commission_fee = trade_volume * commission
                commission_paid_total += commission_fee

                change_str = pct_change_str(used_percentage, 0.0)

                trades.append({
                    "id": len(trades) + 1,
                    "date": ts,
                    "type": close_type,
                    "leverage": leverage,
                    "usedPercentage": change_str,
                    "amount": trade_amount,
                    "price": price,
                    "commission": round(commission_fee, 6),
                    "pnlPercentage": round(pnl_pct, 2),
                    "pnlAmount": round(pnl_amount, 2),
                })
                balance -= commission_fee

            # Open new side
            old_pct_for_open = 0.0  # from flat
            active_position = pos
            leverage = abs(pos)
            entry_price = price
            used_percentage = pct
            take_price = tp
            stop_price = sl
            trade_entry_time = ts
            open_type = "LONG_OPEN" if pos > 0 else "SHORT_OPEN"

            trade_amount = used_percentage * balance / price if price != 0 else 0.0  # asset units
            trade_volume = abs(trade_amount * price)
            total_volume += trade_volume
            position_size = trade_amount
            commission_fee = trade_volume * commission
            commission_paid_total += commission_fee

            change_str = pct_change_str(old_pct_for_open, used_percentage)

            trades.append({
                "id": len(trades) + 1,
                "date": ts,
                "type": open_type,
                "leverage": leverage,
                "usedPercentage": change_str,
                "amount": trade_amount,
                "price": price,
                "commission": round(commission_fee, 6)
            })
            balance -= commission_fee

        # === Returns tracking ===
        if balance == balance_prev or (balance_prev == 0):
            ret_val = 0.0 if balance_prev != 0 else 0.0
        else:
            ret_val = (balance - balance_prev) / balance_prev * 100.0
        returns.append((int(ts.timestamp()) if pd.notna(ts) else 0, round(ret_val, 4)))

        balances.append((int(ts.timestamp()) if pd.notna(ts) else 0, balance))
        balance_prev = balance

    # === Metrics ===
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

    # Max Drawdown (keep original sign convention)
    max_drawdown = 0.0
    peak = balances[0][1]
    for _, b in balances:
        if b > peak:
            peak = b
        dd = (peak - b) / peak if peak != 0 else 0.0
        if dd > max_drawdown:
            max_drawdown = dd

    # Sharpe Ratio (simple daily rf; your original basis)
    if len(returns) > 1:
        return_values = [r[1] / 100 for r in returns]
        mean_return = sum(return_values) / len(return_values)
        daily_risk_free = (1 + risk_free_rate) ** (1 / 365) - 1
        if len(return_values) > 1:
            variance = sum((r - mean_return) ** 2 for r in return_values) / (len(return_values) - 1)
            std_dev = variance ** 0.5
            sharpe_ratio = (mean_return - daily_risk_free) / std_dev if std_dev > 0 else 0
        else:
            sharpe_ratio = 0
    else:
        sharpe_ratio = 0

    # Sortino Ratio (same basis)
    if len(returns) > 1:
        return_values = [r[1] / 100 for r in returns]
        mean_return = sum(return_values) / len(return_values)
        daily_risk_free = (1 + risk_free_rate) ** (1 / 365) - 1
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

    # Buy&Hold asset return independent of initial balance
    buy_hold_return = ((last_close / first_close) - 1.0) * 100.0 if first_close > 0 else 0.0

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
            "profitFactor": round(sum(wins) / abs(sum(losses)), 2) if losses else None,  # still % based
            "buyHoldReturn": round(buy_hold_return, 2),
            "sortinoRatio": round(sortino_ratio, 3),
            "mostProfitableTrade": round(most_win, 2),
            "mostLosingTrade": round(most_loss, 2),
            "durationOftradeRatio": round(duration_ratio, 4),
            "commissionCost": round(commission_paid_total, 2),  # <— NEW, real total
            "volume": round(total_volume, 2)
        },
        "trades": trades[::-1],
        "returns": returns
    }
