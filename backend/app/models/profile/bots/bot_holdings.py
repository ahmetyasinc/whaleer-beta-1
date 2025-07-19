from sqlalchemy import Column, Integer, String, Numeric
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class BotHoldings(Base):
    __tablename__ = "bot_holdings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    bot_id = Column(Integer, nullable=False)

    symbol = Column(String(20), nullable=False)
    amount = Column(Numeric(20, 8), nullable=False)
    average_cost = Column(Numeric(20, 8), nullable=False)
    percentage = Column(Numeric, nullable=True)
    profit_loss = Column(Numeric(18, 8), nullable=False)
