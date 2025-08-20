from sqlalchemy import Column, Integer, Numeric, TIMESTAMP, ForeignKey
from app.database import Base

class ApiSnapshot(Base):
    __tablename__ = "api_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    api_id = Column(Integer, nullable=False, index=True)
    timestamp = Column(TIMESTAMP(timezone=False), nullable=False, index=True)
    usd_value = Column(Numeric(20, 8), nullable=False)

    #user = relationship("User", back_populates="snapshots")
