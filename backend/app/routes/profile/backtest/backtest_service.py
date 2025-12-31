# backtest_service.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Tuple
import math
import pandas as pd

from .schemas import RunBacktestPayload
from .config import BacktestConfig
from .backtest_engine import BacktestEngine
from .repository import fetch_candles, fetch_strategy_by_id
from app.database import get_db
from app.services.allowed_globals.allowed_globals import build_allowed_globals

# Frontend adaptörü
from .frontend_adapter import build_frontend_response

router = APIRouter()

DEFAULTS = {
    "commission": 0.001,
    "execution_mode": "next_open",
    "bar_path": "OLHC",
    "conflict_rule": "stop_first",
    "time_in_force": "IOC",
    "scaleout_policy": "FIFO",
    "fee_model": "notional_based",
    "slippage_bps": 0.0,
    "allow_short_spot": False,
    "funding_rate_per_bar": None,
}

def coalesce_float(v, default): return default if v is None else float(v)
def coalesce_str(v, default):   return default if v is None else str(v)
def coalesce_bool(v, default):  return default if v is None else bool(v)


def _scale_candles_to_initial(
    candles: pd.DataFrame,
    target_initial: Optional[float],
) -> Tuple[pd.DataFrame, float]:
    """
    Görsel amaçlı ölçekleme:
      - target_initial verilirse, ilk open -> target_initial olacak şekilde
        O/H/L/C kolonları oransal ölçeklenir.
      - verilmezse ölçekleme yapılmaz; initial_balance_used = ilk open.
    Dönüş: (candles_for_front, initial_balance_used)
    """
    if candles is None or len(candles) == 0:
        # Boş veri; ölçek yok
        return candles, float(target_initial) if target_initial is not None else 0.0

    first_open = float(candles["open"].iloc[0])

    # initial_balance verilmediyse, hiçbir ölçekleme yok; kullanılan değer ilk open
    if target_initial is None:
        return candles, first_open

    initial_balance_used = float(target_initial)

    # İlk open uygunsuzsa (0/NaN/Inf) ölçekleme yapma
    if not math.isfinite(first_open) or first_open == 0.0:
        return candles, initial_balance_used

    scale = initial_balance_used / first_open

    # Sadece O/H/L/C ölçeklenir; volume dokunulmaz
    scaled = candles.copy()
    for col in ("open", "high", "low", "close"):
        scaled[col] = pd.to_numeric(scaled[col], errors="coerce") * scale

    return scaled, initial_balance_used


@router.post("/run-backtest/")
async def run_backtest(body: RunBacktestPayload, db: AsyncSession = Depends(get_db)):
    """
    Frontend'in beklediği tek parça JSON döner.
    - Backtest hesaplaması HAM mumlarla yapılır (ölçekleme yok).
    - Response içindeki 'candles' görseli, initial_balance'a göre (opsiyonel) ölçeklenir.
    """
    # 1) Strateji & mumlar
    strategy = await fetch_strategy_by_id(db, body.strategy)
    if not strategy or not strategy.get("user_code"):
        raise HTTPException(400, "Strategy not found or invalid")

    candles = await fetch_candles(db, body.crypto, body.period)
    if candles is None or candles.empty:
        raise HTTPException(400, "No candles for given symbol/period")

    # 2) Allowed globals (senin whitelist mimarin)
    allowed_globals = build_allowed_globals(
        candles.copy(),
        print_outputs=None,
        indicator_results=None,
        updated=False,
        make_empty=True,
    )

    # 3) Commission
    commission_cfg = coalesce_float(strategy.get("commission"), DEFAULTS["commission"])
    if "commission" in allowed_globals and allowed_globals["commission"] is not None:
        commission_cfg = coalesce_float(allowed_globals["commission"], commission_cfg)

    # 4) Birleşik kullanıcı kodu (indicator_codes + user_code)
    indicator_codes = strategy.get("indicator_codes") or []
    combined_code = "\n\n".join(indicator_codes + [strategy["user_code"]])

    # 5) initial_balance (engine için): verilmişse onu, yoksa ilk OPEN
    first_open = float(candles["open"].iloc[0])
    engine_initial = float(body.initial_balance) if body.initial_balance is not None else first_open

    # 6) Engine config (strategy alanlarıyla birleşik)
    cfg = BacktestConfig(
        symbol=body.crypto,
        timeframe=body.period,
        initial_balance=engine_initial,
        commission=commission_cfg,
        execution_mode=coalesce_str(strategy.get("execution_mode"), DEFAULTS["execution_mode"]),
        time_in_force=coalesce_str(strategy.get("time_in_force"), DEFAULTS["time_in_force"]),
        fee_model=coalesce_str(strategy.get("fee_model"), DEFAULTS["fee_model"]),
        scaleout_policy=coalesce_str(strategy.get("scaleout_policy"), DEFAULTS["scaleout_policy"]),
        bar_path=coalesce_str(strategy.get("bar_path"), DEFAULTS["bar_path"]),
        conflict_rule=coalesce_str(strategy.get("conflict_rule"), DEFAULTS["conflict_rule"]),
        slippage_bps=coalesce_float(strategy.get("slippage_bps"), DEFAULTS["slippage_bps"]),
        allow_short_spot=coalesce_bool(strategy.get("allow_short_spot"), DEFAULTS["allow_short_spot"]),
        funding_rate_per_bar=strategy.get("funding_rate_per_bar"),
    )

    # 7) Engine çalıştır (HAM candles ile)
    engine = BacktestEngine(cfg)
    result = engine.run(
        candles=candles,
        user_code=combined_code,
        globals_whitelist=allowed_globals,
    )

    # 8) Frontend için görsel candles'ı ölçekle
    candles_for_front, initial_balance_used = _scale_candles_to_initial(
        candles=candles,
        target_initial=body.initial_balance  # None ise ölçek yok; ilk open kullanılacak
    )
    #print(f"Result Trades: {result.trades}")
    # 9) Frontend response’u oluştur
    response_json = build_frontend_response(
        candles_df=candles_for_front,               # ölçeklenmiş (veya aynı) DF
        equity_series=result.equity_curve,
        metrics_dict=result.metrics,
        trades_list=result.trades,
        used_pct_series=result.used_pct_series,
        leverage_series=result.leverage_series,

        commission_value=cfg.commission,
        period=body.period,
        strategy_name=strategy.get("name") or "",
        strategy_id=strategy.get("id"),
        strategy_code=strategy["user_code"],
        crypto=body.crypto,
        initial_balance_used=float(initial_balance_used),
    )

    return response_json
