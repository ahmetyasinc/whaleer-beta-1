# app/models/strategy_release.py
from __future__ import annotations

import enum
from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, TIMESTAMP, Boolean,
    ForeignKey, Enum, func
)
from app.database import Base

# DB'de zaten CREATE TYPE ile tanımladığın enum'la eşleşir
class ReleaseStatus(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"
    unlisted = "unlisted"

class StrategyRelease(Base):
    __tablename__ = "strategy_releases"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    strategy_id = Column(
        BigInteger,
        ForeignKey("strategies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Aynı strateji içinde artan yayın numarası
    release_no = Column(Integer, nullable=False)

    # Modal izinleri
    allow_code_view     = Column(Boolean, nullable=False, server_default="false")
    allow_chart_view    = Column(Boolean, nullable=False, server_default="false")
    allow_scanning      = Column(Boolean, nullable=False, server_default="false")
    allow_backtesting   = Column(Boolean, nullable=False, server_default="false")
    allow_bot_execution = Column(Boolean, nullable=False, server_default="false")

    description = Column(String(500))

    status = Column(
        Enum(ReleaseStatus, name="strategy_release_status", create_type=False),
        nullable=False,
        server_default=ReleaseStatus.pending.value,
    )

    reviewed_by  = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    reviewed_at  = Column(TIMESTAMP, nullable=True)
    review_note  = Column(Text)

    code_snapshot  = Column(Text)
    code_hash      = Column(String(64))  # CHAR(64) ile uyumlu

    published_at    = Column(TIMESTAMP, nullable=True)
    unpublished_at  = Column(TIMESTAMP, nullable=True)

    created_by  = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    created_at  = Column(TIMESTAMP, nullable=False, server_default=func.now())

    views_count = Column(BigInteger, nullable=False, server_default="0")