from sqlalchemy import (
    Column, Integer, String, Text, Boolean, TIMESTAMP, ARRAY, text, Numeric, Enum
)
from app.database import Base
from sqlalchemy.sql import func

class Bots(Base):
    __tablename__ = "bots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    strategy_id = Column(Integer, nullable=False)
    api_id = Column(Integer, nullable=True)
    period = Column(String(10), nullable=True)
    stocks = Column(ARRAY(Text), nullable=True)
    active = Column(Boolean, nullable=False, default=False)
    candle_count = Column(Integer, nullable=False)

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    active_days = Column(ARRAY(Text), nullable=False, default=['Pzt', 'Sal', 'Çar', 'Per', 'Cum'])
    active_hours = Column(Text, nullable=False, default='00:00-23:59')

    initial_usd_value = Column(Numeric(12, 2), nullable=True)
    current_usd_value = Column(Numeric(12, 2), nullable=True)
    name = Column(String(100), nullable=False, default='New Bot')
    fullness = Column(Numeric(5, 2), nullable=True, default=0.0)

    for_rent = Column(Boolean, nullable=False, default=False)
    for_sale = Column(Boolean, nullable=False, default=False)
    sold_count = Column(Integer, nullable=False, default=0)
    rented_count = Column(Integer, nullable=False, default=0)

    sell_price = Column(Numeric(8, 2), nullable=True)
    rent_price = Column(Numeric(8, 2), nullable=True)

    running_time = Column(Integer, nullable=False, default=0)
    profit_factor = Column(Integer, nullable=False, default=0)
    risk_factor = Column(Integer, nullable=False, default=0)
    bot_type = Column(String(10), nullable=False, default="spot")

    revenue_wallet = Column(
        String(64),
        nullable=False,
        server_default=text("'AkmufZViBgt9mwuLPhFM8qyS1SjWNbMRBK8FySHajvUA'")
    )

    # ---- Yeni alanlar (lisans/edinim) ----
    parent_bot_id = Column(Integer, nullable=True, index=True)  # kopyalandığı/orijinal bot id
    acquisition_type = Column(
        Enum("ORIGINAL", "PURCHASED", "RENTED", name="bot_acquisition_type"),
        nullable=False,
        server_default="ORIGINAL",
        index=True
    )
    acquired_from_user_id = Column(Integer, nullable=True, index=True)
    acquired_at = Column(TIMESTAMP(timezone=True), nullable=True)
    rent_expires_at = Column(TIMESTAMP(timezone=True), nullable=True, index=True)
    acquisition_price = Column(Numeric(8, 2), nullable=True)  # satın alma veya kira bedeli
    acquisition_tx = Column(String(128), nullable=True)       # blokzincir işlem referansı

    enter_on_start = Column(Boolean, nullable=False, server_default=text("false"))
    deleted = Column(Boolean, nullable=False, server_default=text("false"))

    description = Column(Text, nullable=True)