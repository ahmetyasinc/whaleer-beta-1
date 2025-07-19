from sqlalchemy import Column, Integer, String, Float, Numeric
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class BotPositions(Base):
    __tablename__ = "bot_positions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    bot_id = Column(Integer, nullable=False)

    symbol = Column(String(20), nullable=False)
    average_cost = Column(Numeric(18, 8), nullable=False)
    amount = Column(Numeric(18, 8), nullable=False)
    profit_loss = Column(Numeric(18, 8), nullable=False)
    status = Column(String(20), nullable=False)
    position_side = Column(String(10), nullable=False)
    leverage = Column(Numeric(5, 2), nullable=False)
    percentage = Column(Numeric, nullable=True)
