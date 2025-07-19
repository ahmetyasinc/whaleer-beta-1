from sqlalchemy import Column, Integer, String, Float, Numeric, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class BotTrades(Base):
    __tablename__ = "bot_trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    bot_id = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP(timezone=False), nullable=False, server_default=func.now())

    symbol = Column(String(20), nullable=False)
    side = Column(String(10), nullable=False)
    amount = Column(Numeric(18, 8), nullable=False)
    fee = Column(Numeric(18, 8), nullable=False, default=0)
    order_id = Column(String(64), nullable=True)
    status = Column(String(20), nullable=False)
    trade_type = Column(String(10), nullable=False)
    position_side = Column(String(10), nullable=True)
    price = Column(Numeric(18, 8), nullable=False)
    amount_state = Column(Numeric(18, 8), nullable=True)
    leverage = Column(Numeric(5, 2), nullable=True)
