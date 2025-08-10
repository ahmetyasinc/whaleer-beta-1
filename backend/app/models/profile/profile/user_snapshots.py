from sqlalchemy import Column, Integer, Numeric, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class UserSnapshot(Base):
    __tablename__ = "user_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    timestamp = Column(TIMESTAMP(timezone=False), nullable=False, index=True)
    user_usd_value = Column(Numeric(20, 8), nullable=False)

    #user = relationship("User", back_populates="snapshots")
