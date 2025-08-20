from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, func, Text, TIMESTAMP, Float, Boolean
from app.database import Base

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    exchange = Column(String(50), nullable=False)
    api_name = Column(String(100), nullable=False)
    api_key = Column(Text, nullable=False)
    api_secret = Column(Text, nullable=True)
    user_id = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    spot_balance = Column(Float, nullable=False, default=0)
    futures_balance = Column(Float, nullable=False, default=0)
    default = Column(Boolean, default=False)
    is_test_api = Column(Boolean, default=False)


class UserAPIBalance(Base):
    __tablename__ = "user_api_balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    api_id = Column(Integer, ForeignKey("api_keys.id"), nullable=False)  # Assuming api_keys table
    coin_symbol = Column(String(10), nullable=False)
    amount = Column(Numeric(20, 8), nullable=False, default=0)
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())