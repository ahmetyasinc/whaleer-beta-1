from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class TradeOut(BaseModel):
    date: str
    symbol: str
    amount: float
    fee: float
    price: float
    trade_type: str 
    side: str
    position_side: str
    leverage: float
    status: str

class OpenPositionOut(BaseModel):
    symbol: str
    amount: float
    cost: float
    position_side: str
    leverage: float
    profit: float
    entryPrice: float
    totalValue: float

class HoldingsOut(BaseModel):
    symbol: str
    amount: float
    cost: float
    profit: float

class PnLPoint(BaseModel):
    date: str
    pnl: float

class BotLogOut(BaseModel):
    id: int
    level: str                  # "info" | "warning" | "error"
    message: str
    details: Optional[Dict[str, Any]] = None
    symbol: Optional[str] = None
    period: Optional[str] = None
    created_at: datetime

class BotAnalysisOut(BaseModel):
    bot_id: int
    bot_name: str
    bot_profit: float
    bot_current_value: float
    trades: List[TradeOut]
    open_positions: List[OpenPositionOut]
    holdings: List[HoldingsOut]
    pnl_data: List[PnLPoint]
    logs: List[BotLogOut]