# app/models/keys/ed25519_stock.py
from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Boolean, Text, text

from app.database import Base

class Ed25519Stock(Base):
    __tablename__ = "ed25519_stock"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    public_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    private_key: Mapped[str] = mapped_column(Text, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))

    def __repr__(self) -> str:
        return f"<Ed25519Stock id={self.id} used={self.is_used}>"
