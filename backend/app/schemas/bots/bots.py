from pydantic import BaseModel
from typing import List
from datetime import datetime

class BotsBase(BaseModel):
    strategy_id: int
    api_id: int
    period: str
    stocks: List[str]
    active: bool
    candle_count: int
    active_days: List[str]
    active_hours: str
    name: str | None = None
    initial_usd_value: float | None = 1000
    current_usd_value: float | None = 1000
    balance: float | None = None
    bot_type: str


class BotsCreate(BotsBase):
    pass

class BotsUpdate(BaseModel):
    name: str | None = None
    strategy_id: int | None = None
    api_id: int | None = None
    period: str | None = None
    stocks: List[str] | None = None
    active: bool | None = None
    candle_count: int | None = None
    active_days: List[str] | None = None
    active_hours: str | None = None
    initial_usd_value: float | None = 1000
    balance: float | None = None

class BotsOut(BotsBase):
    id: int
    created_at: datetime

    
    class Config:
        orm_mode = True
