from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ARRAY, Float, Numeric
from app.database import Base
from sqlalchemy.sql import func


class Bots(Base):
    __tablename__ = "bots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    strategy_id = Column(Integer, nullable=False)
    api_id = Column(Integer, nullable=False)
    period = Column(String(10), nullable=False)
    stocks = Column(ARRAY(Text), nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    candle_count = Column(Integer, nullable=False)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    active_days = Column(ARRAY(Text), nullable=False, default=['Pzt', 'Sal', 'Çar', 'Per', 'Cum'])
    active_hours = Column(Text, nullable=False, default='00:00-23:59')

    initial_usd_value = Column(Numeric(12, 2), nullable=False, default=1000.00)
    current_usd_value = Column(Numeric(12, 2), nullable=False, default=1000.00)
    name = Column(String(100), nullable=False, default='Yeni Bot')
    balance = Column(Numeric(20, 4), nullable=True, default=0.0)
    fullness = Column(Numeric(5, 2), nullable=True, default=0.0)

    for_rent = Column(Boolean, nullable=False, default=False)
    for_sale = Column(Boolean, nullable=False, default=False)
    sold_count = Column(Integer, nullable=False, default=0)
    rented_count = Column(Integer, nullable=False, default=0)

    sell_price = Column(Numeric(8, 2), nullable=True)
    rent_price = Column(Numeric(8, 2), nullable=True)

    running_time = Column(Integer, nullable=False, default=0)
    profit_factor = Column(Integer, nullable=False, default=0)
    risk_factor = Column(Integer, nullable=False, default=0)
    bot_type = Column(String(10), nullable=False, default="spot")

