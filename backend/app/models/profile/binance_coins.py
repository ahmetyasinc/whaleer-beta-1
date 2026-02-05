from sqlalchemy import Column, Integer, String, TIMESTAMP, func, Numeric
from sqlalchemy.orm import relationship
from app.database import Base

class BinanceCoin(Base):
    __tablename__ = "binance_coins"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    symbol = Column(String(50), nullable=False)
    binance_symbol = Column(String(50), nullable=False)
    market_type = Column(String(20), nullable=False, default='spot')
    tick_size = Column(Numeric(18, 10), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    pinned_by_users = relationship("BinanceCoinsPinned", back_populates="coin", cascade="all, delete-orphan")
