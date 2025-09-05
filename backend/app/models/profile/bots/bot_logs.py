from sqlalchemy import Column, Integer, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB, ENUM, BIGINT
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class BotLogs(Base):
    __tablename__ = "bot_logs"

    id = Column(BIGINT, primary_key=True, index=True, autoincrement=True)

    # Kimle/neyle ilgili?
    user_id = Column(Integer, nullable=True)
    bot_id = Column(Integer, nullable=False)

    # Bağlam
    symbol = Column(String(20), nullable=True)
    period = Column(String(16), nullable=True)

    # Log içeriği
    level = Column(ENUM("info", "warning", "error", name="bot_log_level"), nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSONB, nullable=True)

    # Zaman
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
