from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CoinCreate(BaseModel):
    name: str
    symbol: str
    binance_symbol: str
    market_type: str

class PinCoin(BaseModel):
    coin_id:int