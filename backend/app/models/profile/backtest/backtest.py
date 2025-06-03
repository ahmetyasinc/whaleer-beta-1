from sqlalchemy import Column, Integer, DateTime, Numeric, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class BacktestArchive(Base):
    __tablename__ = "backtest_archive"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    commission = Column(Numeric(5, 4), default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    data = Column(JSON)
