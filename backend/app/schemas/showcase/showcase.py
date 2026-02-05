from typing import Optional
from pydantic import BaseModel
from typing import List  # veya gelecekteki model türüne göre güncellenebilir

class MarginSummary(BaseModel):
    total_margin: Optional[float] = None
    day_margin: Optional[float] = None
    week_margin: Optional[float] = None
    month_margin: Optional[float] = None

class ShowcaseFilter(BaseModel):
    bot_type: Optional[str] = None
    active: Optional[bool] = None
    min_sell_price: Optional[float] = None
    max_sell_price: Optional[float] = None
    min_rent_price: Optional[float] = None
    max_rent_price: Optional[float] = None
    min_profit_factor: Optional[float] = None
    max_risk_factor: Optional[float] = None
    min_created_minutes_ago: Optional[int] = None
    min_trade_frequency: Optional[int] = None
    min_profit_margin: Optional[float] = None
    profit_margin_unit: Optional[str] = None
    min_uptime_minutes: Optional[int] = None
    demand: Optional[int] = None
    limit: Optional[int] = 5

class OtherBotSummary(BaseModel):
    id: int
    name: str
    isActive: bool
    profitRate: float
    runningTime: int
    totalTrades: int
    winRate: float

class UserSummary(BaseModel):
    id: int
    username: str
    display_name: str
    description: Optional[str]
    join_date: str
    location: Optional[str]
    email: Optional[str]
    gsm: Optional[str]
    instagram: Optional[str]
    linkedin: Optional[str]
    github: Optional[str]
    totalFollowers: Optional[int]
    totalSold: Optional[int] = 0
    totalRented: Optional[int] = 0
    avg_bots_profit_lifetime: Optional[float] = 0.0
    bots_winRate_LifeTime: Optional[float] = 0.0
    allbots: Optional[int] = 0
    bots: list[OtherBotSummary]

class Trade(BaseModel):
    id: int
    pair: str
    type: str
    action: str
    time: str
    price: float

class Position(BaseModel):
    id: int
    pair: str
    type: str
    profit: float

class BotSummary(BaseModel):
    bot_id: int
    name: str
    bot_type: str
    creator: str
    profitRate: float
    startDate: str
    runningTime: Optional[int]
    winRate: float
    totalMargin: float
    dayMargin: float
    weekMargin: float
    monthMargin: float
    profitFactor: Optional[float] = None
    riskFactor: Optional[float] = None
    totalTrades: int
    dayTrades: int
    weekTrades: int
    monthTrades: int
    strategy: str
    soldCount: int = 0
    rentedCount: int = 0
    avg_fullness: float
    for_rent: bool
    for_sale: bool
    rent_price: Optional[float]
    sell_price: Optional[float]
    coins: Optional[str]
    trades: list[Trade]
    positions: list[Position]


class ChartDataPoint(BaseModel):
    timestamp: str
    value: float

class ShowcaseBotResponse(BaseModel):
    user: UserSummary
    bot: BotSummary
    chartData: list[ChartDataPoint]
    tradingData: List[dict] = []

