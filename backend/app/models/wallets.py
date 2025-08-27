from sqlalchemy import (
    Column, BigInteger, Integer, String, Text, Boolean, DateTime,
    ForeignKey, SmallInteger, Index
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base  # senin Base import'un
from sqlalchemy.dialects.postgresql import INET

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    chain = Column(String(16), nullable=False, default="solana")
    address = Column(Text, nullable=False)
    label = Column(Text)
    is_primary = Column(Boolean, nullable=False, default=False)
    is_verified = Column(Boolean, nullable=False, default=False)
    verified_at = Column(DateTime(timezone=True))
    last_sign_in_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("uq_wallet_chain_address", "chain", "address", unique=True),
        Index("ix_wallets_user_id", "user_id"),
        Index("ix_wallets_created_at", "created_at"),
        # partial unique index SQLAlchemy'de Index + postgresql_where ile Alembic'te yapılır
    )

class SiwsNonce(Base):
    __tablename__ = "siws_nonces"

    id         = Column(BigInteger, primary_key=True, index=True)
    user_id    = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # ← EKLENDİ
    chain      = Column(String(16), nullable=False, default="solana")
    address    = Column(Text)
    nonce      = Column(Text, nullable=False, unique=True, index=True)
    status     = Column(SmallInteger, nullable=False, default=0)
    purpose    = Column(String(24), nullable=False, server_default="link_wallet")               # ← EKLENDİ
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    consumed_at= Column(DateTime(timezone=True))
    request_ip = Column(INET)
    user_agent = Column(Text)

    __table_args__ = (
        Index("ix_siws_nonces_status", "status"),
        Index("ix_siws_nonces_expires", "expires_at"),
        Index("ix_siws_nonces_user", "user_id"),
    )

class WalletSignin(Base):
    __tablename__ = "wallet_signins"

    id = Column(BigInteger, primary_key=True, index=True)
    wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    nonce_id = Column(BigInteger, ForeignKey("siws_nonces.id", ondelete="SET NULL"), nullable=False)
    signature = Column(Text, nullable=False)
    verified = Column(Boolean, nullable=False, default=True)
    remote_ip = Column(INET)
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    wallet = relationship("Wallet")
    nonce = relationship("SiwsNonce")
