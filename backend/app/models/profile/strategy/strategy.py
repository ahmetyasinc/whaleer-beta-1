from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, TIMESTAMP, Boolean,
    ForeignKey, func
    )
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy.dialects.postgresql import ARRAY

class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(Text, nullable=False)
    public = Column(Boolean, default=False)
    tecnic = Column(Boolean, default=False) 
    indicator_ids = Column(ARRAY(Integer)) 
    created_at = Column(TIMESTAMP, server_default=func.now())

    parent_strategy_id = Column(
        BigInteger,
        ForeignKey("strategies.id"),
        nullable=True
    )
    version = Column(Integer, nullable=False, server_default="1")
    
    # RELOTIONSHIP
    favorited_by_users = relationship("StrategiesFavorite", back_populates="strategy", cascade="all, delete-orphan")