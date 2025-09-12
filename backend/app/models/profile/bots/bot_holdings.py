# models/bot_holdings.py
from sqlalchemy import Column, Integer, String, Numeric, Index
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class BotHoldings(Base):
    __tablename__ = "bot_holdings"
    __table_args__ = (
        Index("ix_holdings_bot_symbol", "bot_id", "symbol"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    bot_id = Column(Integer, nullable=False)

    symbol = Column(String(20), nullable=False)
    amount = Column(Numeric(20, 8), nullable=False)

    # Fiyat/maliyet
    average_cost  = Column(Numeric(20, 8), nullable=False)     # price
    open_cost     = Column(Numeric(20, 8), nullable=False)     # notional (USDT)

    # Performans
    realized_pnl   = Column(Numeric(20, 8), nullable=False)    # USDT
    unrealized_pnl = Column(Numeric(20, 8), nullable=False)    # USDT
    percentage     = Column(Numeric(5, 2), nullable=True)      # opsiyonel: %
