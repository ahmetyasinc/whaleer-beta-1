# app/models.py
from sqlalchemy import (
    Column, Integer, String, Text, TIMESTAMP, Boolean,
    ForeignKey, func, Numeric, Index
)
from app.database import Base

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    exchange = Column(String(50), nullable=False)          
    api_name = Column(String(100), nullable=False)

    # HMAC
    api_key = Column(Text, nullable=True)                  
    api_secret = Column(Text, nullable=True)

    # ED (opsiyonel — UI gönderiyorsa tut)
    ed_public = Column(String, nullable=True)              
    ed_public_pem = Column(Text, nullable=True)            
    ed_private_pem = Column(Text, nullable=True)           

    user_id = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=False)
    # Bakiye alanları → numeric(18,8)
    spot_balance = Column(Numeric(18, 8), nullable=False, default=0)
    futures_balance = Column(Numeric(18, 8), nullable=False, default=0)

    spot_usdt_balance = Column(Numeric(18, 8), nullable=False, default=0)
    futures_usdt_balance = Column(Numeric(18, 8), nullable=False, default=0)

    default = Column(Boolean, default=False)
    is_test_api = Column(Boolean, default=False)
