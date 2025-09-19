# app/models/user_plan.py
from sqlalchemy import (
    Column, BigInteger, String, DateTime, Boolean, ForeignKey,
    Enum as SAEnum, func, Index
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class PlanCode(str, enum.Enum):
    clam = "clam"        # ücretsiz
    octopus = "octopus"
    whale = "whale"

class PlanStatus(str, enum.Enum):
    active = "active"
    canceled = "canceled"
    expired = "expired"
    pending = "pending"

class UserPlan(Base):
    __tablename__ = "user_plans"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)

    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    plan_code = Column(SAEnum(PlanCode, name="plan_code_enum", native_enum=False, create_constraint=True, length=20), nullable=False, index=True)
    status = Column(SAEnum(PlanStatus, name="plan_status_enum", native_enum=False, create_constraint=True, length=20), nullable=False, default=PlanStatus.active)

    started_at  = Column(DateTime(timezone=True), nullable=True, default=func.now())
    expires_at  = Column(DateTime(timezone=True), nullable=True)   # ücretsiz planda NULL kalabilir
    canceled_at = Column(DateTime(timezone=True), nullable=True)

    auto_renew = Column(Boolean, nullable=False, default=True)
    notes      = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # ilişkiler
    user = relationship("User", back_populates="plans")

# Sorgu performansı için faydalı index’ler
Index("ix_user_plans_user_active", UserPlan.user_id, UserPlan.status, UserPlan.expires_at)
