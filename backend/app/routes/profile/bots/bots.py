from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import Session
from sqlalchemy import delete, select, update, func
from app.core.auth import verify_token
from app.models.profile.bots.bots import Bots
from app.database import get_db
from typing import Literal
from datetime import datetime, timedelta, timezone
from app.schemas.bots.bots import BotsCreate, BotsUpdate, BotsOut, BotListingUpdate, CheckoutSummaryOut, AcquireBotIn, AcquireBotOut
from app.routes.profile.bots.fetchs.fetch_holdings import fetch_holdings_for_bot
from app.routes.profile.bots.fetchs.fetch_pnl import generate_pnl_from_snapshots
from app.routes.profile.bots.fetchs.fetch_positions import fetch_positions_for_bot
from app.routes.profile.bots.fetchs.fetch_trades import fetch_trades_for_bot
from app.routes.profile.bots.fetchs.fetch_logs import fetch_logs_for_bot
from app.schemas.bots.bot_analysis import BotAnalysisOut
from app.models.profile.bots.bot_snapshots import BotSnapshots
from app.models.profile.bots.bot_trades import BotTrades
from app.models.profile.bots.bot_positions import BotPositions
from app.models.profile.bots.bot_holdings import BotHoldings
from typing import Optional

from app.models.user import User
from app.models.profile.bots.bot_follow import BotFollow
from app.schemas.showcase.bot_follow import FollowCreate 

from app.routes.profile.telegram.telegram_service import notify_user_by_telegram  

protected_router = APIRouter()

# GET all bots for user
@protected_router.get("/api/get-bots", response_model=list[BotsOut])
async def get_all_bots(db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(
        select(Bots)
        .where(Bots.user_id == int(user_id),Bots.deleted.is_(False))
        .order_by(Bots.id) 
    )
    return result.scalars().all()

# POST new bot (otomatik user_id eklenir)
@protected_router.post("/api/create-bots", response_model=BotsOut)
async def create_bot(bot: BotsCreate, db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    new_bot = Bots(**bot.dict(), user_id=int(user_id))
    db.add(new_bot)
    await db.commit()
    await db.refresh(new_bot)
    await notify_user_by_telegram(
        int(user_id),
        f"""🤖 <b>Yeni botunuz hazır!</b>
        Bot adı: <b>{new_bot.name}</b> ✅
        🔔 Bundan sonra bu botun yaptığı işlemler hakkında Telegram üzerinden anlık bildirimler alacaksınız.  
        🌐 Daha fazla detay ve performans grafikleri için <a href="https://whaleer.com">whaleer.com</a> adresini ziyaret edebilirsiniz.
        İyi kazançlar dileriz 🚀"""
        )
    return new_bot

# PATCH update bot (sadece kendi botunu güncelleyebilir)
@protected_router.put("/api/update-bot/{bot_id}", response_model=BotsOut)
async def update_bot(
    bot_id: int,
    bot_data: BotsUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    result = await db.execute(
        select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id),Bots.deleted.is_(False))
    )
    bot = result.scalar_one_or_none()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    data_dict = bot_data.dict(exclude_unset=True)

    for field, value in data_dict.items():
        # strategy_id None gelirse güncellemeyi atla
        if field == "strategy_id" and value is None:
            continue
        setattr(bot, field, value)

        # Eğer initial_usd_value güncelleniyorsa current_usd_value da eşitlensin
        if field == "initial_usd_value" and value is not None:
            bot.current_usd_value = value

    await db.commit()
    await db.refresh(bot)
    return bot



# DELETE bot (sadece kendi botunu silebilir)
@protected_router.delete("/api/bots/{bot_id}")
async def delete_bot(bot_id: int, db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    # Bot'u sorgula
    result = await db.execute(
        select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id))
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    # 4 tablodaki verileri sil
    await db.execute(delete(BotFollow).where(BotFollow.bot_id == bot_id))
    await db.execute(delete(BotSnapshots).where(BotSnapshots.bot_id == bot_id))
    await db.execute(delete(BotPositions).where(BotPositions.bot_id == bot_id))
    await db.execute(delete(BotHoldings).where(BotHoldings.bot_id == bot_id))
    await db.execute(delete(BotTrades).where(BotTrades.bot_id == bot_id))

    # Bot'u sil
    await db.delete(bot)
    await db.commit()

    return {"detail": "Bot and all related data deleted"}

@protected_router.post("/api/bots/delete/{bot_id}")
async def soft_delete_bot(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    # Bot'u kullanıcıya ait mi diye kontrol et
    result = await db.execute(
        select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id),Bots.deleted.is_(False))
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    if getattr(bot, "deleted", False):
        return {"detail": "Bot already marked as deleted"}

    bot.deleted = True
    bot.for_sale = False
    bot.for_rent = False
    bot.active = False

    await db.commit()

    return {"detail": "Bot marked as deleted"}


# PATCH activate (sadece kendi botunu aktif hale getirebilir)
@protected_router.post("/api/bots/{bot_id}/activate")
async def activate_bot(bot_id: int, db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id),Bots.deleted.is_(False)))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")
    bot.active = True
    await db.commit()
    return {"detail": "Bot activated"}

# PATCH deactivate (sadece kendi botunu pasif hale getirebilir)
@protected_router.post("/api/bots/{bot_id}/deactivate")
async def deactivate_bot(bot_id: int, db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id),Bots.deleted.is_(False)))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")
    bot.active = False
    await db.commit()
    return {"detail": "Bot deactivated"}

@protected_router.get("/api/bots/{bot_id}/analysis", response_model=BotAnalysisOut)
async def get_bot_analysis(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
    # Opsiyonel log filtreleri:
    log_level: Optional[str] = Query(None, description="info|warning|error"),
    log_limit: int = Query(200, ge=1, le=1000),
    log_since: Optional[datetime] = Query(None, description="ISO8601 datetime")
):
    result = await db.execute(
        select(Bots).where(
            Bots.id == bot_id,
            Bots.user_id == int(user_id),
            Bots.deleted.is_(False)
        )
    )
    bot = result.scalar_one_or_none()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    trades = await fetch_trades_for_bot(bot_id, db)
    open_positions = await fetch_positions_for_bot(bot_id, db)
    holdings = await fetch_holdings_for_bot(bot_id, db)
    pnl_data = await generate_pnl_from_snapshots(bot_id, db)

    # Loglar
    logs = await fetch_logs_for_bot(
        bot_id=bot_id,
        db=db,
        level=log_level,
        since=log_since,
        limit=log_limit
    )

    profit = float((bot.current_usd_value or 0) - (bot.initial_usd_value or 0))

    return BotAnalysisOut(
        bot_id=bot.id,
        bot_name=bot.name,
        bot_current_value=float(bot.current_usd_value or 0),
        bot_profit=profit,
        trades=trades,
        open_positions=open_positions,
        holdings=holdings,
        pnl_data=pnl_data,
        logs=logs
    )

@protected_router.post("/bot/follow")
async def follow_bot(follow_data: FollowCreate, db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = int(user_data)

    # 1. Bot var mı?
    stmt = select(Bots).where(
        Bots.id == follow_data.bot_id,
        Bots.deleted.is_(False)
    )
    result = await db.execute(stmt)
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    # 2. Zaten takip ediliyor mu?
    result = await db.execute(
        select(BotFollow).where(
            BotFollow.user_id == user_id,
            BotFollow.bot_id == follow_data.bot_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already following this bot")

    # 3. Takip kaydı ekle
    new_follow = BotFollow(user_id=user_id, bot_id=follow_data.bot_id)
    db.add(new_follow)

    # 4. Botun sahibini bul ve takipçi sayısını artır
    result = await db.execute(select(User).where(User.id == bot.user_id))
    owner = result.scalar_one_or_none()
    if owner:
        owner.total_followers = (owner.total_followers or 0) + 1

    await db.commit()
    return {"message": "Successfully followed bot"}

@protected_router.post("/bot/unfollow")
async def unfollow_bot(
    follow_data: FollowCreate,
    db: Session = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    user_id = int(user_data)

    # 1. Bot var mı?
    stmt = select(Bots).where(
        Bots.id == follow_data.bot_id,
        Bots.deleted.is_(False)
    )
    result = await db.execute(stmt)
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    # 2. Takip kaydı var mı?
    result = await db.execute(
        select(BotFollow).where(
            BotFollow.user_id == user_id,
            BotFollow.bot_id == follow_data.bot_id
        )
    )
    follow = result.scalar_one_or_none()
    if not follow:
        raise HTTPException(status_code=400, detail="You are not following this bot")

    # 3. Kaydı sil
    await db.delete(follow)

    # 4. Botun sahibinin takipçi sayısını azalt
    result = await db.execute(select(User).where(User.id == bot.user_id))
    owner = result.scalar_one_or_none()
    if owner and (owner.total_followers or 0) > 0:
        owner.total_followers -= 1

    await db.commit()
    return {"message": "Successfully unfollowed bot"}

@protected_router.get("/user/following-bots")
async def list_followed_bots(
    db: AsyncSession = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    user_id = int(user_data)

    # 1. Takip edilen bot_id'lerini çek
    result = await db.execute(
        select(BotFollow.bot_id).where(BotFollow.user_id == user_id)
    )
    followed_bot_ids = [row[0] for row in result.all()]

    if not followed_bot_ids:
        return []

    bots_result = await db.execute(
        select(Bots).where(Bots.id.in_(followed_bot_ids),Bots.deleted.is_(False))
    )
    bots = bots_result.scalars().all()

    response = []

    for bot in bots:
        # Botun yaratıcısını bul
        user_result = await db.execute(
            select(User.name).where(User.id == bot.user_id)
        )
        creator_name = user_result.scalar_one_or_none() or "Unknown"

        # totalMargin hesaplama
        try:
            total_margin = ((bot.current_usd_value - bot.initial_usd_value) / bot.initial_usd_value) * 100
        except ZeroDivisionError:
            total_margin = 0.0

        response.append({
            "bot_id": bot.id,
            "name": bot.name,
            "creator": creator_name,
            "totalMargin": round(total_margin, 2),
            "runningTime": bot.running_time
        })

    return response

@protected_router.patch("/api/bots/{bot_id}/listing", response_model=BotsOut)
async def update_bot_listing(
    bot_id: int,
    payload: BotListingUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    # Bot sahiplik kontrolü
    result = await db.execute(
        select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id),Bots.deleted.is_(False))
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    # Kısmi güncelleme (yalnızca gönderilen alanlar)
    data = payload.dict(exclude_unset=True)

    # (İsteğe bağlı) iş kuralları:
    # for_sale False ise sell_price'ı sıfırlamak isterseniz: 
    if data.get("for_sale") is False:
        data["sell_price"] = None
    # for_rent False ise rent_price'ı sıfırlamak isterseniz:
    if data.get("for_rent") is False:
        data["rent_price"] = None

    for field, value in data.items():
        setattr(bot, field, value)

    await db.commit()
    await db.refresh(bot)
    return bot

@protected_router.get(
    "/api/bots/{bot_id}/checkout-summary",
    response_model=CheckoutSummaryOut
)
async def get_checkout_summary(
    bot_id: int,
    action: Literal["buy", "rent"] = Query(..., description="buy | rent"),
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Sepete eklerken uygunluk kontrolü ve özet.
    Girdi: bot_id (path), action (buy|rent)
    Çıktı: bot_name, owner_username, price, revenue_wallet
    """
    # 1) Bot var mı?
    result = await db.execute(select(Bots).where(Bots.id == bot_id,Bots.deleted.is_(False)))
    bot: Bots | None = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found.")

    requester_id = int(user_id)

    # 2) Kendi botu mu?
    if requester_id == bot.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot buy or rent your own bot."
        )

    # 3) Daha önce satın alma / kiralama kontrolü
    # (parent_bot_id = bot.id olan kayıtları arıyoruz)
    q = select(Bots).where(
        Bots.parent_bot_id == bot.id,
        Bots.user_id == requester_id,
        Bots.deleted.is_(False),
    )
    user_copy = (await db.execute(q)).scalars().all()

    now = datetime.now(timezone.utc)

    for copy in user_copy:
        # Satın almışsa (daima kalıcı lisans)
        if copy.acquisition_type == "PURCHASED":
            raise HTTPException(
                status_code=400,
                detail="You have already purchased this bot."
            )
        # Kiralamış ve lisans süresi bitmemişse
        if copy.acquisition_type == "RENTED":
            if copy.rent_expires_at and copy.rent_expires_at > now:
                raise HTTPException(
                    status_code=400,
                    detail="You already have an active rental for this bot."
                )

    # 4) Aksiyon bazlı uygunluk + fiyat
    if action == "buy":
        if not bot.for_sale or bot.sell_price is None:
            raise HTTPException(status_code=400, detail="This bot is not currently for sale.")
        price = float(bot.sell_price)
    else:  # rent
        if not bot.for_rent or bot.rent_price is None:
            raise HTTPException(status_code=400, detail="This bot is not currently available for rental.")
        price = float(bot.rent_price)

    # 5) Owner adını User tablosundan çek
    ures = await db.execute(select(User).where(User.id == bot.user_id))
    owner = ures.scalar_one_or_none()
    owner_username = (
        getattr(owner, "username", None)
        or getattr(owner, "name", None)
        or getattr(owner, "email", None)
        or f"user_{bot.user_id}"
    )

    # 6) Özet
    return CheckoutSummaryOut(
        bot_name=bot.name,
        owner_username=owner_username,
        action=action,
        price=price,
        revenue_wallet=bot.revenue_wallet,
    )

@protected_router.post("/api/bots/{bot_id}/acquire", response_model=AcquireBotOut)
async def acquire_bot(
    bot_id: int,
    payload: AcquireBotIn = Body(...),
    db: AsyncSession = Depends(get_db),
    user_data: dict = Depends(verify_token),
):
    """
    Bir botu satın alma veya kiralama.
    - Orijinal botu kilitleyerek (FOR UPDATE) uygunluk kontrolü yapar.
    - Alıcı için yeni bir bot satırı oluşturur (kopya).
    - Orijinal bottaki sayaçları artırır.
    """

    requester_id = int(user_data)

    # 1) Orijinal botu kilitle (yarış koşullarına karşı)
    #   SQLAlchemy 2.0: with_for_update(nowait=False, of=...)
    q = (
        select(Bots)
        .where(Bots.id == bot_id,Bots.deleted.is_(False))
        .with_for_update()
    )
    res = await db.execute(q)
    src: Bots | None = res.scalar_one_or_none()

    if not src:
        raise HTTPException(status_code=404, detail="Bot not found.")

    if src.user_id == requester_id:
        raise HTTPException(status_code=400, detail="You cannot buy or rent your own bot.")

    # 2) Aksiyon ve fiyat uygunluğu
    if payload.action == "buy":
        if not src.for_sale or src.sell_price is None:
            raise HTTPException(status_code=400, detail="This bot is not for sale.")
        expected_price = float(src.sell_price)
    else:  # rent
        if not src.for_rent or src.rent_price is None:
            raise HTTPException(status_code=400, detail="This bot is not available for rent.")
        expected_price = float(src.rent_price)

    if float(payload.price_paid) < expected_price:
        raise HTTPException(status_code=400, detail="Paid price is lower than listing price.")

    # 3) Kiralamada bitiş tarihi
    now = datetime.now(timezone.utc)
    rent_expires_at = None
    if payload.action == "rent":
        days = payload.rent_duration_days or 30
        rent_expires_at = now + timedelta(days=days)

    # 4) Yeni bot kaydı (alıcı için kopya)
    new_bot = Bots(
        # sahiplik
        user_id=requester_id,

        # "kopya" referansları ve lisans/edinim
        parent_bot_id=src.id,
        acquisition_type="PURCHASED" if payload.action == "buy" else "RENTED",
        acquired_from_user_id=src.user_id,
        acquired_at=now,
        rent_expires_at=rent_expires_at,
        acquisition_price=payload.price_paid,
        acquisition_tx=(payload.tx or None),

        # davranış/konfigürasyon (orijinalden kopya)
        strategy_id=src.strategy_id,
        api_id=None,                # Not: alıcı kendi API'sine güncelleyebilir
        period=src.period,
        stocks=list(src.stocks or []),
        active=False,                # istersen başlangıçta False yapabilirsin
        candle_count=src.candle_count,
        active_days=list(src.active_days or []),
        active_hours=src.active_hours,
        bot_type=src.bot_type,

        # görünür isim
        name="[P] " + src.name if payload.action == "buy" else "[R] " + src.name,

        # finansal başlangıç: alıcının botu yeni başlıyor → metrikler sıfır
        initial_usd_value=None,
        current_usd_value=None,
        fullness=None,

        # listelenme bayrakları: yeni kopya listelenmiş gelmesin
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

        # gelir cüzdanı: üreticinin cüzdanı değil, alıcının kazancı için kendi hesabı
        revenue_wallet= "AkmufZViBgt9mwuLPhFM8qyS1SjWNbMRBK8FySHajvUA",
    )

    db.add(new_bot)

    # 5) Orijinal bot sayaçlarını artır
    if payload.action == "buy":
        src.sold_count = (src.sold_count or 0) + 1
    else:
        src.rented_count = (src.rented_count or 0) + 1

    if payload.action == "buy":
        # total_sold += 1
        await db.execute(
            update(User)
            .where(User.id == src.user_id)
            .values(total_sold=func.coalesce(User.total_sold, 0) + 1)
            .execution_options(synchronize_session=False)
        )
    else:
        # total_rented += 1
        await db.execute(
            update(User)
            .where(User.id == src.user_id)
            .values(total_rented=func.coalesce(User.total_rented, 0) + 1)
            .execution_options(synchronize_session=False)
        )

    # 6) Commit
    await db.commit()
    await db.refresh(new_bot)

    return AcquireBotOut(
        new_bot_id=new_bot.id,
        action=payload.action,
        parent_bot_id=src.id,
        price_paid=payload.price_paid,
        rent_expires_at=rent_expires_at.isoformat() if rent_expires_at else None,
    )

