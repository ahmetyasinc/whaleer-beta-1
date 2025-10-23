# backtest/frontend_adapter.py
from datetime import datetime, timezone
import math

def _to_epoch_seconds(ts) -> int:
    # pandas.Timestamp | datetime | str kabul
    if ts is None:
        return 0
    if hasattr(ts, "to_pydatetime"):
        ts = ts.to_pydatetime()
    if isinstance(ts, str):
        try:
            ts = datetime.fromisoformat(ts)
        except Exception:
            return 0
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return int(ts.timestamp())

def _trade_type_from_event(ev) -> str:
    """
    TradeEvent alanlarını motorunuza göre eşle.
    """
    t = getattr(ev, "type", None)
    if t in ("LONG_OPEN", "LONG_CLOSE", "SHORT_OPEN", "SHORT_CLOSE"):
        return t

    side = getattr(ev, "side", "buy")
    if t == "OPEN":
        if side=="buy":
            return "LONG_OPEN"
        if side=="sell":
            return "SHORT_OPEN"
    if t == "CLOSE":
        if side=="buy":
            return "SHORT_CLOSE"
        if side=="sell":
            return "LONG_CLOSE"
    if t == "SCALE_IN":
        if side == "buy":
            return "LONG_SCALE_IN"
        if side == "sell":
            return "SHORT_SCALE_IN"
    if t == "SCALE_OUT":
        if side == "buy":
            return "SHORT_SCALE_OUT"
        if side == "sell":
            return "LONG_SCALE_OUT"
    if t == "FLIP_OPEN":
        if side == "buy":
            return "LONG_OPEN"
        if side == "sell":
            return "SHORT_OPEN"
    if t == "FLIP_CLOSE":
        if side == "buy":
            return "SHORT_CLOSE"
        if side == "sell":
            return "LONG_CLOSE"
    if t == "TP_CLOSE":
        if side == "sell":
            return "LONG_TAKE_PROFIT_CLOSE"
        if side == "buy":
            return "SHORT_TAKE_PROFIT_CLOSE"
    if t == "SL_CLOSE":
        if side == "sell":
            return "LONG_STOP_LOSS_CLOSE"
        if side == "buy":
            return "SHORT_STOP_LOSS_CLOSE"

    if t == "FORCED_CLOSE":
        return "FORCED_CLOSE"
    
    
    dq   = float(getattr(ev, "delta_qty", 0.0))
    dirn = int(getattr(ev, "position_direction", 1))

    if dirn >= 0:
        return "LONG_OPEN" if dq > 0 else "LONG_CLOSE"
    return "SHORT_OPEN" if dq < 0 else "SHORT_CLOSE"

def _fmt_used_pct(p_from: float, p_to: float) -> str:
    def pct(x):
        try:
            return round(float(x) * 100)
        except Exception:
            return 0
    return f"%{pct(p_from)} -> %{pct(p_to)}"

def build_frontend_response(
    *,
    candles_df,               # ölçeklenmiş veya ham DF: cols timestamp, open, high, low, close, [volume]
    equity_series,            # pd.Series, bar sonu equity
    metrics_dict,             # dict
    trades_list,              # List[TradeEvent]
    used_pct_series=None,     # pd.Series 0..1
    leverage_series=None,     # pd.Series >=1
    # üst bilgi :
    commission_value: float = 0.0,
    period: str = "",
    strategy_name: str = "",
    strategy_id: int | None = None,
    strategy_code: str = "",
    crypto: str = "",
    initial_balance_used: float | None = None,
):
    # ---- candles (görsel) : DF parametreden gelir (önceden ölçeklenmiş olabilir)
    candles = [
        {
            "time": _to_epoch_seconds(candles_df["timestamp"].iloc[i]),
            "open": float(candles_df["open"].iloc[i]),
            "high": float(candles_df["high"].iloc[i]),
            "low":  float(candles_df["low"].iloc[i]),
            "close":float(candles_df["close"].iloc[i]),
        }
        for i in range(len(candles_df))
    ]

    # ---- chartData (equity serisi)
    chart_data = [
        {
            "time": _to_epoch_seconds(candles_df["timestamp"].iloc[i]),
            "value": float(equity_series.iloc[i]),
        }
        for i in range(len(equity_series))
    ]

    # ---- returns: [time, retPct, leverage, usedPct]
    returns = []
    for i in range(len(equity_series)):
        if i == 0:
            r_pct = 0.0
        else:
            prev = float(equity_series.iloc[i-1])
            cur  = float(equity_series.iloc[i])
            r_pct = 0.0 if prev == 0 else (cur - prev) / prev * 100.0
        lev = float(leverage_series.iloc[i]) if leverage_series is not None else 0.0
        up  = float(used_pct_series.iloc[i] * 100.0) if used_pct_series is not None else 0.0
        returns.append([
            _to_epoch_seconds(candles_df["timestamp"].iloc[i]),
            round(r_pct, 4),
            lev,
            round(up, 1)
        ])

    # ---- trades
    trades_view = []
    for idx, ev in enumerate(trades_list, start=1):
        bar_index = int(
            getattr(ev, "idx", getattr(ev, "index", 0))
        )
        bar_ts = candles_df["timestamp"].iloc[bar_index] if 0 <= bar_index < len(candles_df) else None
        trades_view.append({
            "id": idx,
            "date": (getattr(bar_ts, "to_pydatetime", lambda: bar_ts)() or "").isoformat(timespec="seconds") if bar_ts is not None else "",
            "type": _trade_type_from_event(ev),
            "leverage": float(getattr(ev, "leverage", 1.0)),
            "usedPercentage": _fmt_used_pct(getattr(ev, "used_pct_from", 0.0), getattr(ev, "used_pct_to", 0.0)),
            "amount": float(getattr(ev, "qty", getattr(ev, "amount", 0.0))),
            "price": float(getattr(ev, "fill_price", getattr(ev, "requested_price", 0.0))),
            "commission": float(getattr(ev, "commission", 0.0)),
            "pnlPercentage": float(getattr(ev, "pnl_pct", getattr(ev, "pnlPercentage", 0.0))),
            "pnlAmount": float(getattr(ev, "pnl_amount", getattr(ev, "pnlAmount", 0.0))),
        })

    # ---- performance
    initial_balance = float(equity_series.iloc[0]) if len(equity_series) else 0.0
    final_balance   = float(equity_series.iloc[-1]) if len(equity_series) else 0.0
    total_pnl       = final_balance - initial_balance
    total_trades    = int(metrics_dict.get("num_trades", len(trades_list)))
    winning         = sum(1 for t in trades_list if float(getattr(t, "pnl_amount", 0.0)) > 0)
    losing          = sum(1 for t in trades_list if float(getattr(t, "pnl_amount", 0.0)) < 0)
    win_rate        = 0.0 if total_trades == 0 else round(winning / total_trades * 100.0, 2)

    return_pct      = float(metrics_dict.get("return_pct", (total_pnl/initial_balance*100.0 if initial_balance else 0.0)))
    max_dd          = float(metrics_dict.get("max_drawdown_pct", 0.0))
    sharpe          = float(metrics_dict.get("sharpe", 0.0))
    commission_cost = float(metrics_dict.get("commission_paid", 0.0))

    gross_profit = sum(max(0.0, float(getattr(t, "pnl_amount", 0.0))) for t in trades_list)
    gross_loss   = abs(sum(min(0.0, float(getattr(t, "pnl_amount", 0.0))) for t in trades_list))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (math.inf if gross_profit > 0 else 0.0)

    if len(candles_df) >= 2:
        bh = (float(candles_df["close"].iloc[-1]) / float(candles_df["close"].iloc[0]) - 1.0) * 100.0
    else:
        bh = 0.0

    neg = [r[1] for r in returns if r[1] < 0]
    if neg:
        mean_neg = sum(neg)/len(neg)
        neg_var = sum((x-mean_neg)**2 for x in neg)/len(neg)
        neg_std = neg_var**0.5
        avg_ret = sum(r[1] for r in returns)/len(returns) if returns else 0.0
        sortino = (avg_ret/neg_std) if neg_std else 0.0
    else:
        sortino = 0.0

    most_profitable = max((float(getattr(t, "pnl_pct", getattr(t, "pnlPercentage", 0.0))) for t in trades_list), default=0.0)
    most_losing     = min((float(getattr(t, "pnl_pct", getattr(t, "pnlPercentage", 0.0))) for t in trades_list), default=0.0)

    duration_ratio = 0.0
    volume = sum(float(getattr(t, "notional", 0.0)) for t in trades_list)

    performance = {
        "returnPercentage": round(return_pct, 2),
        "totalPnL": round(total_pnl, 2),
        "totalTrades": total_trades,
        "winningTrades": winning,
        "losingTrades": losing,
        "winRate": win_rate,
        "initialBalance": round(initial_balance, 2),
        "finalBalance": round(final_balance, 2),
        "maxDrawdown": round(max_dd, 2),
        "sharpeRatio": round(sharpe, 3),
        "profitFactor": (float("inf") if profit_factor == math.inf else round(profit_factor, 2)),
        "buyHoldReturn": round(bh, 2),
        "sortinoRatio": round(sortino, 3),
        "mostProfitableTrade": round(float(most_profitable), 2),
        "mostLosingTrade": round(float(most_losing), 2),
        "durationOftradeRatio": round(duration_ratio, 4),
        "commissionCost": round(commission_cost, 2),
        "volume": round(volume, 2),
    }

    return {
        "chartData": chart_data,
        "performance": performance,
        "trades": trades_view,
        "returns": returns,
        "candles": candles,  # Görsel: ölçeklenmiş veya ham
        "commission": float(commission_value),
        "period": period,
        "strategy_name": strategy_name,
        "strategy_id": strategy_id,
        "code": strategy_code,
        "crypto": crypto,
        "initial_balance_used": float(initial_balance_used if initial_balance_used is not None else initial_balance),
    }
