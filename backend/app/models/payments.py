# app/models/payments.py
from __future__ import annotations

from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import BigInteger, Integer, SmallInteger, String, Text, DateTime, Numeric, func


class Base(DeclarativeBase):
    pass


class PaymentIntent(Base):
    __tablename__ = "payment_intents"

    # PK bigint
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)

    # cols
    user_id: Mapped[int] = mapped_column(BigInteger, index=True, nullable=False)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)            # "listing_fee" | "purchase"
    bot_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    seller_wallet: Mapped[str | None] = mapped_column(Text, nullable=True)

    platform_fee_usd: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    buyer_pays_usd: Mapped[float]    = mapped_column(Numeric(10, 2), nullable=False)

    # numeric(18,9)
    quote_sol: Mapped[float] = mapped_column(Numeric(18, 9), nullable=False)

    # bigint
    quote_lamports: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # numeric(18,9)
    quote_rate_usd_per_sol: Mapped[float] = mapped_column(Numeric(18, 9), nullable=False)

    # TEXT (JSON string)
    recipient_json: Mapped[str] = mapped_column(Text, nullable=False)

    # TEXT
    reference: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    # smallint
    status: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)  # 0=pending, 1=paid

    # timestamptz
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # TEXT
    tx_sig: Mapped[str | None] = mapped_column(Text, nullable=True)
