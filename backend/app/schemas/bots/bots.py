from typing import List, Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field

class BotsBase(BaseModel):
    strategy_id: Optional[int] = None
    api_id: Optional[int] = None
    period: Optional[str] = None
    stocks: Optional[List[str]] = None
    active: Optional[bool] = None
    candle_count: Optional[int] = None
    active_days: Optional[List[str]] = None
    active_hours: Optional[str] = None
    name: Optional[str] = None
    initial_usd_value: Optional[float] = None
    current_usd_value: Optional[float] = None
    bot_type: Optional[str] = None
    enter_on_start: Optional[bool] = Field(False, description="Bot starts trading immediately on current signal if True")


class BotsCreate(BotsBase):
    pass


class BotsUpdate(BaseModel):
    name: Optional[str] = None
    strategy_id: Optional[int] = None
    api_id: Optional[int] = None
    period: Optional[str] = None
    stocks: Optional[List[str]] = None
    active: Optional[bool] = None
    candle_count: Optional[int] = None
    active_days: Optional[List[str]] = None
    active_hours: Optional[str] = None
    initial_usd_value: Optional[float] = None


class BotsOut(BotsBase):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    for_sale: Optional[bool] = None
    for_rent: Optional[bool] = None
    sell_price: Optional[float] = None
    rent_price: Optional[float] = None
    revenue_wallet: Optional[str] = None
    acquisition_type: Optional[str] = None
    rent_expires_at: Optional[datetime] = None
    enter_on_start: Optional[bool] = None
    description: Optional[str] = None
    
    class Config:
        orm_mode = True


class BotListingUpdate(BaseModel):
    for_sale: Optional[bool] = None
    for_rent: Optional[bool] = None
    sell_price: Optional[float] = None
    rent_price: Optional[float] = None
    revenue_wallet: Optional[str] = None
    is_profit_share: Optional[bool] = None
    sold_profit_share_rate: Optional[float] = None
    rent_profit_share_rate: Optional[float] = None
    listing_description: Optional[str] = Field(None, max_length=1000)


class CheckoutSummaryOut(BaseModel):
    bot_name: Optional[str] = None
    owner_username: Optional[str] = None
    action: Optional[Literal["buy", "rent"]] = None
    price: Optional[float] = None
    revenue_wallet: Optional[str] = None


class AcquireBotIn(BaseModel):
    action: Optional[Literal["buy", "rent"]] = None
    price_paid: Optional[float] = Field(None, description="Ödenen fiyat (USDT)")
    tx: Optional[str] = Field(None, description="Zincir işlem imzası (tx signature)")
    rent_duration_days: Optional[int] = Field(None, ge=1, le=365, description="Kiralama süresi (gün)")


class AcquireBotOut(BaseModel):
    new_bot_id: Optional[int] = None
    action: Optional[Literal["buy", "rent"]] = None
    parent_bot_id: Optional[int] = None
    price_paid: Optional[float] = None
    rent_expires_at: Optional[str] = None
