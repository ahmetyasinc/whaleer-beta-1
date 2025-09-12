# models/bot_positions.py
from sqlalchemy import Column, Integer, String, Numeric, Index
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class BotPositions(Base):
    __tablename__ = "bot_positions"
    __table_args__ = (
        Index("ix_positions_bot_symbol", "bot_id", "symbol"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    bot_id = Column(Integer, nullable=False)

    symbol = Column(String(20), nullable=False)

    # Pozisyon metrikleri
    average_cost  = Column(Numeric(18, 8), nullable=False)     # entry price
    amount        = Column(Numeric(18, 8), nullable=False)     # qty (pozitif)
    position_side = Column(String(10), nullable=False)         # 'long' | 'short'
    leverage      = Column(Numeric(5, 2), nullable=False)

    # PnL ve notional
    open_cost      = Column(Numeric(20, 8), nullable=False)    # notional (USDT)
    realized_pnl   = Column(Numeric(20, 8), nullable=False)    # USDT
    unrealized_pnl = Column(Numeric(20, 8), nullable=False)    # USDT

    percentage     = Column(Numeric, nullable=True)            # opsiyonel: %
