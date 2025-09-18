# app/models/profile/telegram/telegram_account.py
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database import Base  # senin Base'in

class TelegramAccount(Base):
    __tablename__ = "telegram_accounts"
    # __table_args__ = (...)  # İstersen constraint/index ekleyebilirsin; aşağıda notlara bak

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # users.id BIGINT ise bunu da BIGINT yap
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)

    # Telegram chat id'leri 64-bit'e sığar
    chat_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)

    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False,
                                            default=True, server_default="true")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now()
    )
