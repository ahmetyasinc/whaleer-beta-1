# app/models/trading/bot_snapshots.py

from sqlalchemy import Column, Integer, Numeric, Boolean, TIMESTAMP, JSON
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class BotSnapshots(Base):
    __tablename__ = "bot_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, nullable=False)
    timestamp = Column(TIMESTAMP(timezone=False), nullable=False, server_default=func.now())

    balance_usdt = Column(Numeric(18, 8), nullable=False)
    total_profit = Column(Numeric(18, 8), nullable=False)

    pnl_ratio = Column(Numeric(18, 6), nullable=True)
    fullness = Column(Numeric(20, 8), nullable=True)
    active = Column(Boolean, nullable=True)
