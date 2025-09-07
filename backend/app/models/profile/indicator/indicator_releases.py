# app/models/indicator_release.py
from __future__ import annotations

import enum
from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, TIMESTAMP, Boolean,
    ForeignKey, Enum, func
)
from app.database import Base


# DB tarafında CREATE TYPE indicator_release_status AS ENUM (...)
class IndicatorReleaseStatus(str, enum.Enum):
    pending  = "pending"
    approved = "approved"
    rejected = "rejected"
    unlisted = "unlisted"


class IndicatorRelease(Base):
    __tablename__ = "indicator_releases"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # Hangi indikatörün sürümü
    indicator_id = Column(
        BigInteger,
        ForeignKey("indicators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Aynı indikatör içinde artan yayın numarası (1,2,3…)
    release_no = Column(Integer, nullable=False)

    # Publish modalındaki izinler (scanning/backtest/bot yok)
    allow_code_view  = Column(Boolean, nullable=False, server_default="false")
    allow_chart_view = Column(Boolean, nullable=False, server_default="false")

    # Kullanıcı açıklaması
    description = Column(String(500))

    # Yayın durumu (DB'deki mevcut enum tipiyle eşleşecek)
    status = Column(
        Enum(IndicatorReleaseStatus, name="indicator_release_status", create_type=False),
        nullable=False,
        server_default=IndicatorReleaseStatus.pending.value,
    )

    # İnceleme / onay bilgileri (opsiyonel)
    reviewed_by = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(TIMESTAMP, nullable=True)
    review_note = Column(Text)

    # Yayın anındaki kod snapshot'ı (önerilir)
    code_snapshot = Column(Text)
    code_hash     = Column(String(64))  # DB'de CHAR(64) ile uyumlu

    # Yayın/Geri alma zamanları (opsiyonel)
    published_at   = Column(TIMESTAMP, nullable=True)
    unpublished_at = Column(TIMESTAMP, nullable=True)

    created_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())

    # Görüntülenme sayısı
    views_count = Column(BigInteger, nullable=False, server_default="0")
