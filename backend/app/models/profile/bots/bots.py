from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ARRAY, Float
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
    active_days = Column(ARRAY(Text), nullable=False, default=['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
    active_hours = Column(Text, nullable=False, default='00:00-23:59')
    created_at = Column(TIMESTAMP, server_default=func.now())
    initial_usd_value = Column(Integer, nullable=False, default=1000)
    current_usd_value = Column(Integer, nullable=False, default=1000)
    name = Column(String(100), nullable=False, default='New Bot')
    balance = Column(Float, nullable=True, default=None)
