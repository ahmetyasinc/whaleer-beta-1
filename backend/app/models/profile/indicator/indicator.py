from sqlalchemy.orm import relationship, deferred
from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, TIMESTAMP, Boolean,
    ForeignKey, func
)
from app.database import Base

class Indicator(Base):
    __tablename__ = "indicators"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # columns from screenshot
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    code = Column(Text, nullable=False)

    # created_at → timestamp without time zone
    created_at = Column(
        TIMESTAMP(timezone=False),
        nullable=False,
        server_default=func.now()
    )

    public = Column(Boolean, nullable=False, server_default="false", index=True)
    tecnic = Column(Boolean, nullable=False, server_default="false", index=True)

    # new columns seen in table
    parent_indicator_id = Column(
        BigInteger,
        ForeignKey("indicators.id"),
        nullable=True
    )
    version = Column(Integer, nullable=False, server_default="1")

    favorited_by_users = relationship("IndicatorsFavorite", back_populates="indicator", cascade="all, delete-orphan")
