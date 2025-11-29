# schemas.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class RunBacktestPayload(BaseModel):
    crypto: str
    period: str                     # "1m", "15m", "1h"...
    initial_balance: Optional[float] = Field(default=None, gt=0)  # <-- optional
    strategy: int                   # strategy id

class BacktestResponse(BaseModel):
    equity: List[float]
    metrics: Dict[str, Any]
    trades: List[Dict[str, Any]]
