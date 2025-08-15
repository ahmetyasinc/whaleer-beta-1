from typing import Optional
from fastapi import HTTPException
from sqlalchemy import select
from app.models.profile.strategy.strategy import Strategy
from app.models.profile.indicator.indicator import Indicator
from app.models.profile.binance_data import BinanceData
from app.routes.profile.backtest.utils import calculate_performance
import pandas as pd

from app.services.allowed_globals.allowed_globals import build_allowed_globals

async def run_backtest_logic(
    strategy_id: int,
    period: str,
    crypto: dict,
    user_id: int,
    db,
    initial_balance: Optional[float] = None,  # <— CHANGED: now optional
):
    # Fetch strategy
    strategy_obj = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            (Strategy.user_id == user_id) | (Strategy.public == True) | (Strategy.tecnic == True)
        )
    )
    strategy = strategy_obj.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found.")

    strategy_code = strategy.code
    indicator_ids = strategy.indicator_ids or []

    # Fetch indicators
    indicators = await db.execute(
        select(Indicator).where(Indicator.id.in_(indicator_ids))
    )
    indicator_codes = [ind.code for ind in indicators.scalars().all()]

    # Fetch Binance candles
    result = await db.execute(
        select(
            BinanceData.timestamp,
            BinanceData.open,
            BinanceData.high,
            BinanceData.low,
            BinanceData.close,
            BinanceData.volume,
        )
        .where(BinanceData.interval == period, BinanceData.coin_id == crypto["binance_symbol"])
        .order_by(BinanceData.timestamp.desc())
        .limit(5000)
    )

    rows = result.all()
    if not rows:
        raise HTTPException(status_code=404, detail="No market data found.")

    # To DataFrame
    df = pd.DataFrame(rows, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    df_data = df.copy()

    # Build candlestick JSON (raw)
    df_data_json = df_data[["timestamp", "open", "high", "low", "close"]].copy()
    df_data_json["time"] = df_data_json["timestamp"].apply(
        lambda x: int(x.timestamp()) if hasattr(x, "timestamp") else int(pd.to_datetime(x).timestamp())
    )
    df_data_json = df_data_json.sort_values("time").reset_index(drop=True)

    # Decide initial balance:
    # - if user provided -> use it
    # - else -> use first close
    if len(df_data_json) == 0:
        raise HTTPException(status_code=404, detail="No market data found after processing.")
    first_close_raw = float(df_data_json["close"].iloc[0]) if pd.notna(df_data_json["close"].iloc[0]) else 0.0
    if first_close_raw <= 0:
        # extremely rare/invalid; fall back to a sane default
        first_close_raw = 1.0

    initial_balance_used = float(initial_balance) if initial_balance is not None else first_close_raw

    # Normalize candles to the initial balance (overlay-friendly)
    factor = initial_balance_used / first_close_raw if first_close_raw != 0 else 1.0
    df_scaled = df_data_json.copy()
    for col in ["open", "high", "low", "close"]:
        df_scaled[col] = df_scaled[col].astype(float) * factor

    candlestick_data = df_scaled[["time", "open", "high", "low", "close"]].to_dict(orient="records")

    # Allowed globals for strategy/indicators
    allowed_globals = build_allowed_globals(df, print_outputs=None, indicator_results=None, updated=False, make_empty=True)

    # Run indicators
    for indicator_code in indicator_codes:
        try:
            exec(indicator_code, allowed_globals)
        except Exception as e:
            print(f"Indicator kodu çalıştırılırken hata oluştu: {e}")

    # Run strategy -> expects df with 'position' and 'percentage'
    try:
        exec(strategy_code, allowed_globals)
        df = allowed_globals["df"]
    except Exception as e:
        print(f"Strateji kodu çalıştırılırken hata oluştu: {e}")

    if "position" not in df.columns or "percentage" not in df.columns:
        raise HTTPException(status_code=400, detail="Strategy must output 'position' and 'percentage'.")

    # Build maps to enrich returns (shifted by 1 to align)
    pos_series = df["position"].shift(1).where(df["position"].shift(1).notna(), 0.0)
    pct_series = df["percentage"].shift(1).where(df["percentage"].shift(1).notna(), 0.0)
    pos_map = dict(zip(df_data_json["time"].tolist(), pos_series.tolist()))
    pct_map = dict(zip(df_data_json["time"].tolist(), pct_series.tolist()))

    # Calculate performance with the chosen initial balance
    result = calculate_performance(
        df,
        commission=allowed_globals.get("commission", 0.0),
        initial_balance=initial_balance_used,  # <— pass resolved balance
    )

    # Enrich bottom chart payload
    enriched_returns = [
        [t, pnl, pos_map.get(t), pct_map.get(t)]
        for (t, pnl) in result["returns"]
    ]
    result["returns"] = enriched_returns

    return {
        "chartData": result["chartData"],
        "performance": result["performance"],
        "trades": result["trades"],
        "returns": result["returns"],
        "candles": candlestick_data,                # scaled using initial_balance_used
        "commission": allowed_globals.get("commission", 0.0),
        "period": period,
        "strategy_name": strategy.name,
        "strategy_id": strategy.id,
        "code": strategy.code,
        "crypto": crypto,
        # Optional: expose which initial balance was used (handy for UI/debug)
        "initial_balance_used": initial_balance_used,
    }
