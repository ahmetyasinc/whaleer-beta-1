# app/services/bot_service.py
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.models.profile.bots.bots import Bots
from app.models.user import User


async def replicate_bot_for_user(
    db: AsyncSession,
    original_bot_id: int,
    new_owner_id: int,
    purchase_type: str,  # "BUY" | "RENT" | "PURCHASE" vs.
    rent_days: int = 0,
    price_paid: Optional[float] = None,
    tx_hash: Optional[str] = None,
    profit_share_rate: Optional[float] = None,
):
    """
    Orijinal botun bir kopyasını oluşturur ve yeni kullanıcıya atar.

    - Solana tarafındaki /api/bots/{bot_id}/acquire mantığını Stellar için tekrarlar.
    - Ödeme & fiyat kontrolü bu fonksiyondan önce (Stellar kontrat + PaymentIntent ile) yapılmış kabul edilir.
    """

    # purchase_type normalize et ("BUY", "PURCHASE" vs hepsi BUY gibi değerlensin)
    pt_upper = (purchase_type or "").upper()
    is_buy = pt_upper in ("BUY", "PURCHASE", "PURCHASED")
    action = "buy" if is_buy else "rent"

    # 1) Orijinal botu bul
    q = (
        select(Bots)
        .where(Bots.id == original_bot_id, Bots.deleted.is_(False))
    )
    res = await db.execute(q)
    src: Bots | None = res.scalar_one_or_none()

    if not src:
        raise Exception("Original bot not found")

    # Kendi botunu satın alma / kiralama güvenliği (opsiyonel ama mantıklı)
    if src.user_id == new_owner_id:
        raise Exception("You cannot buy or rent your own bot.")

    now = datetime.now(timezone.utc)

    # 2) Kiralamada bitiş tarihi
    rent_expires_at = None
    if not is_buy:
        days = rent_days or 30
        rent_expires_at = now + timedelta(days=days)

    if purchase_type == "BUY":
        # 3) Yeni bot kaydı (alıcı için kopya)
        new_bot = Bots(
            # sahiplik
            user_id=new_owner_id,

            # "kopya" referansları ve lisans/edinim bilgisi
            parent_bot_id=src.id,
            acquisition_type="PURCHASED" if is_buy else "RENTED",
            acquired_from_user_id=src.user_id,
            acquired_at=now,
            rent_expires_at=rent_expires_at,
            acquisition_price=price_paid,
            acquisition_tx=tx_hash,

            # davranış/konfigürasyon (orijinal bottan kopya)
            strategy_id=src.strategy_id,
            api_id=None,                     # alıcı kendi API'sini tanımlar
            period=src.period,
            stocks=list(src.stocks or []),
            active=False,                    # yeni kopya default pasif gelsin
            candle_count=src.candle_count,
            active_days=list(src.active_days or []),
            active_hours=src.active_hours,
            bot_type=src.bot_type,

            # görünen isim
            name=("[P] " if is_buy else "[R] ") + src.name,

            # finansal metrikler: yeni bot sıfırdan başladığı için reset
            initial_usd_value=None,
            current_usd_value=None,
            fullness=None,

            # listing durumu: yeni kopya listelenmiş gelmesin
            for_sale=False,
            for_rent=False,
            sell_price=None,
            rent_price=None,

            # sayaç/metrikler
            sold_count=0,
            rented_count=0,
            running_time=0,
            profit_factor=0,
            risk_factor=0,

            # gelir cüzdanı: üreticinin cüzdanı değil, alıcının kazancı için.
            # Eski acquire_bot'taki placeholder'ı korudum; sende farklı bir field varsa bunu güncelle.
            revenue_wallet="AkmufZViBgt9mwuLPhFM8qyS1SjWNbMRBK8FySHajvUA",
            sold_profit_share_rate=profit_share_rate,
            is_profit_share= True,
        )
    else:
        new_bot = Bots(
            # sahiplik
            user_id=new_owner_id,

            # "kopya" referansları ve lisans/edinim bilgisi
            parent_bot_id=src.id,
            acquisition_type="PURCHASED" if is_buy else "RENTED",
            acquired_from_user_id=src.user_id,
            acquired_at=now,
            rent_expires_at=rent_expires_at,
            acquisition_price=price_paid,
            acquisition_tx=tx_hash,

            # davranış/konfigürasyon (orijinal bottan kopya)
            strategy_id=src.strategy_id,
            api_id=None,                     # alıcı kendi API'sini tanımlar
            period=src.period,
            stocks=list(src.stocks or []),
            active=False,                    # yeni kopya default pasif gelsin
            candle_count=src.candle_count,
            active_days=list(src.active_days or []),
            active_hours=src.active_hours,
            bot_type=src.bot_type,

            # görünen isim
            name=("[P] " if is_buy else "[R] ") + src.name,

            # finansal metrikler: yeni bot sıfırdan başladığı için reset
            initial_usd_value=None,
            current_usd_value=None,
            fullness=None,

            # listing durumu: yeni kopya listelenmiş gelmesin
            for_sale=False,
            for_rent=False,
            sell_price=None,
            rent_price=None,

            # sayaç/metrikler
            sold_count=0,
            rented_count=0,
            running_time=0,
            profit_factor=0,
            risk_factor=0,

            # gelir cüzdanı: üreticinin cüzdanı değil, alıcının kazancı için.
            # Eski acquire_bot'taki placeholder'ı korudum; sende farklı bir field varsa bunu güncelle.
            revenue_wallet="AkmufZViBgt9mwuLPhFM8qyS1SjWNbMRBK8FySHajvUA",
            rent_profit_share_rate=profit_share_rate,
            is_profit_share= True,
        )
    db.add(new_bot)

    # 4) Orijinal bot sayaçlarını artır
    if is_buy:
        src.sold_count = (src.sold_count or 0) + 1
    else:
        src.rented_count = (src.rented_count or 0) + 1

    # 5) Kullanıcı toplam satış/kiralama sayaçları
    if is_buy:
        await db.execute(
            update(User)
            .where(User.id == src.user_id)
            .values(total_sold=func.coalesce(User.total_sold, 0) + 1)
            .execution_options(synchronize_session=False)
        )
    else:
        await db.execute(
            update(User)
            .where(User.id == src.user_id)
            .values(total_rented=func.coalesce(User.total_rented, 0) + 1)
            .execution_options(synchronize_session=False)
        )

    # 6) ID'yi alabilmek için flush
    await db.flush()
    # istersen:
    # await db.refresh(new_bot)

    return new_bot.id
