from dataclasses import dataclass
from typing import Literal, Optional, List

ExecutionMode = Literal["next_open", "same_bar_close"]
BarPath = Literal["OLHC", "OHLC"]
ConflictRule = Literal["stop_first", "take_first", "mid"]
TimeInForce = Literal["IOC", "GTC"]
ScaleoutPolicy = Literal["FIFO", "LIFO"]
FeeModel = Literal["capital_based", "notional_based"]

@dataclass
class BacktestConfig:
    symbol: str
    timeframe: str
    initial_balance: float
    commission: float  # 0..1 (ör. 0.001 = %0.1)
    slippage_bps: float = 0.0
    execution_mode: ExecutionMode = "next_open"
    bar_path: BarPath = "OLHC"
    conflict_rule: ConflictRule = "stop_first"
    time_in_force: TimeInForce = "IOC"
    scaleout_policy: ScaleoutPolicy = "FIFO"
    fee_model: FeeModel = "notional_based"
    allow_short_spot: bool = False
    funding_rate_per_bar: Optional[float] = None
    extra_indicator_codes: Optional[List[str]] = None

    def validate(self) -> None:
        if not (0.0 <= self.commission <= 1.0):
            raise ValueError("commission must be between 0 and 1")
        if self.initial_balance <= 0:
            raise ValueError("initial_balance must be > 0")
        if self.slippage_bps < 0:
            raise ValueError("slippage_bps must be >= 0")
