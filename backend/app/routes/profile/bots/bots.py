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
@protected_router.get("/get-bots", response_model=list[BotsOut])
async def get_all_bots(db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(
        select(Bots)
        .where(Bots.user_id == int(user_id),Bots.deleted.is_(False))
        .order_by(Bots.id) 
    )
    return result.scalars().all()

# POST new bot (otomatik user_id eklenir)
@protected_router.post("/create-bots", response_model=BotsOut)
async def create_bot(
    bot: BotsCreate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    new_bot = Bots(**bot.dict(), user_id=int(user_id))
    db.add(new_bot)
    await db.commit()
    await db.refresh(new_bot)

    await notify_user_by_telegram(
        text=(
            f"""🤖 <b>Yeni botunuz hazır!</b>
Bot adı: <b>{new_bot.name}</b> ✅
🔔 Bundan sonra bu botun yaptığı işlemler hakkında Telegram üzerinden anlık bildirimler alacaksınız.  
🌐 Daha fazla detay ve performans grafikleri için <a href="https://whaleer.com">whaleer.com</a> adresini ziyaret edebilirsiniz.
İyi kazançlar dileriz 🚀"""
        ),
        user_id=int(user_id),  # veya bot_id=new_bot.id
        db=db,                  # mevcut session’ı yeniden kullan
    )

    return new_bot


from decimal import Decimal, InvalidOperation
from pydantic import BaseModel

class BotDepositUpdate(BaseModel):
    deposit_balance: Decimal | float | int

@protected_router.patch("/bots/{bot_id}/deposit-balance", response_model=BotsOut)
async def update_bot_deposit_balance(
    bot_id: int,
    payload: BotDepositUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Sadece deposit_balance alanını günceller.
    - Bot, giriş yapan kullanıcıya ait değilse 404 döner.
    - deposit_balance >= 0 olmalı.
    """
    # --- Bot'u yetki ve silinmemişlik kontrolü ile getir ---
    result = await db.execute(
      select(Bots).where(
          Bots.id == bot_id,
          Bots.user_id == int(user_id),
          Bots.deleted.is_(False),
      )
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    # --- deposit_balance doğrulama ---
    raw_val = payload.deposit_balance

    try:
        val = Decimal(str(raw_val))
    except (InvalidOperation, ValueError):
        raise HTTPException(
            status_code=422,
            detail="deposit_balance must be a valid decimal number.",
        )

    if val < 0:
        raise HTTPException(
            status_code=422,
            detail="deposit_balance must be ≥ 0.",
        )

    # Eğer değer aynıysa gereksiz commit yapmayalım
    changed = False
    if bot.deposit is None or bot.deposit != val:
        bot.deposit = val
        changed = True

    if changed:
        await db.commit()
        await db.refresh(bot)

    # BotsOut şemasına uygun tam bot objesini döndürür
    return bot

@protected_router.put("/update-bot/{bot_id}", response_model=BotsOut)
async def update_bot(
    bot_id: int,
    bot_data: BotsUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    # — Botu yetki ve silinmemişlik kontrolü ile getir
    result = await db.execute(
        select(Bots).where(
            Bots.id == bot_id,
            Bots.user_id == int(user_id),
            Bots.deleted.is_(False),
        )
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    # Frontend tüm alanları gönderebilir; sadece izinlileri al
    raw = bot_data.dict(exclude_unset=False)
    ALLOWED = {"name", "active_days", "active_hours"}
    payload = {k: v for k, v in raw.items() if k in ALLOWED}

    # — Doğrulayıcılar
    import re
    HOURS_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$")

    EN_VALID = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}

    def validate_days(days_list):
        if not isinstance(days_list, list) or not days_list:
            raise HTTPException(status_code=422, detail="active_days must be a non-empty list.")
        normalized, seen = [], set()
        for d in days_list:
            if not isinstance(d, str):
                raise HTTPException(status_code=422, detail="active_days items must be strings.")
            d = d.strip()
            if d not in EN_VALID:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid day '{d}'. Use one of {sorted(list(EN_VALID))}."
                )
            if d not in seen:
                seen.add(d)
                normalized.append(d)
        return normalized

    def validate_hours(s):
        if not isinstance(s, str):
            raise HTTPException(status_code=422, detail="active_hours must be a string.")
        s = s.strip()
        if not HOURS_RE.match(s):
            raise HTTPException(
                status_code=422,
                detail="active_hours must match HH:MM-HH:MM (e.g., '00:00-23:59')."
            )
        return s

    changed = False

    # — name
    if "name" in payload:
        new_name = (payload["name"] or "").strip()
        if not new_name:
            raise HTTPException(status_code=422, detail="name cannot be empty.")
        if len(new_name) > 100:
            raise HTTPException(status_code=422, detail="name length must be ≤ 100 characters.")
        if new_name != bot.name:
            bot.name = new_name
            changed = True

    # — active_days (EN gelir; geleni aynen sakla, sadece doğrula & dedupe)
    if "active_days" in payload and payload["active_days"] is not None:
        new_days = validate_days(payload["active_days"])
        if bot.active_days is None or list(new_days) != list(bot.active_days):
            bot.active_days = new_days
            changed = True

    # — active_hours
    if "active_hours" in payload and payload["active_hours"] is not None:
        new_hours = validate_hours(payload["active_hours"])
        if (bot.active_hours or "") != new_hours:
            bot.active_hours = new_hours
            changed = True

    # — conditional seed fields (sadece DB'de boşsa doldur)
    # initial_usd_value -> hem initial hem current aynı değer
    if bot.initial_usd_value is None and raw.get("initial_usd_value") is not None:
        try:
            val = Decimal(str(raw["initial_usd_value"]))
        except (InvalidOperation, ValueError):
            raise HTTPException(status_code=422, detail="initial_usd_value must be a valid decimal number.")
        if val < 0:
            raise HTTPException(status_code=422, detail="initial_usd_value must be ≥ 0.")
        bot.initial_usd_value = val
        bot.current_usd_value = val
        bot.maximum_usd_value = val
        # current_usd_value da ilk değerle başlasın (boşsa veya zorunlu olarak eşitlemek isterseniz)
        if bot.current_usd_value is None:
            bot.current_usd_value = val
        changed = True

    # api_id -> sadece DB'de null ise set et
    if bot.api_id is None and raw.get("api_id") is not None:
        try:
            new_api_id = int(raw["api_id"])
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="api_id must be an integer.")
        if new_api_id <= 0:
            raise HTTPException(status_code=422, detail="api_id must be a positive integer.")
        bot.api_id = new_api_id
        changed = True

    if changed:
        await db.commit()
        await db.refresh(bot)

    return bot



# DELETE bot (sadece kendi botunu silebilir)
@protected_router.delete("/bots/{bot_id}")
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

@protected_router.post("/bots/delete/{bot_id}")
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
@protected_router.post("/bots/{bot_id}/activate")
async def activate_bot(bot_id: int, db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id),Bots.deleted.is_(False)))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")
    bot.active = True
    await db.commit()
    return {"detail": "Bot activated"}

# PATCH deactivate (sadece kendi botunu pasif hale getirebilir)
@protected_router.post("/bots/{bot_id}/deactivate")
async def deactivate_bot(bot_id: int, db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id),Bots.deleted.is_(False)))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")
    bot.active = False
    await db.commit()
    return {"detail": "Bot deactivated"}

@protected_router.get("/bots/{bot_id}/analysis", response_model=BotAnalysisOut)
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



import logging

logger = logging.getLogger(__name__)

@protected_router.patch("/bots/{bot_id}/listing", response_model=BotsOut)
async def update_bot_listing(
    bot_id: int,
    payload: BotListingUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    logger.info("=== [update_bot_listing] START ===")
    logger.info("User %s is updating listing for bot_id=%s", user_id, bot_id)
    logger.info("Raw payload: %s", payload.dict())

    # 1) Botu sahibine göre çek
    try:
        result = await db.execute(
            select(Bots).where(
                Bots.id == bot_id,
                Bots.user_id == int(user_id),
                Bots.deleted.is_(False),
            )
        )
        bot: Bots | None = result.scalar_one_or_none()
    except Exception as e:
        logger.exception("[update_bot_listing] DB select error: %s", e)
        raise

    if not bot:
        logger.warning(
            "[update_bot_listing] Bot not found or unauthorized. bot_id=%s, user_id=%s",
            bot_id, user_id
        )
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    logger.info("[update_bot_listing] Found bot id=%s name=%s", bot.id, bot.name)

    # 2) Sadece listing ile ilgili alanları güncellenebilir yap
    allowed_fields = {
        "for_sale",
        "sell_price",
        "for_rent",
        "rent_price",
        "listing_description",
        "is_profit_share",
        "rent_profit_share_rate",
        "sold_profit_share_rate",
    }

    raw_data = payload.dict(exclude_unset=True)
    logger.info("[update_bot_listing] raw_data (exclude_unset): %s", raw_data)

    data = {k: v for k, v in raw_data.items() if k in allowed_fields}
    logger.info("[update_bot_listing] filtered data (allowed_fields): %s", data)

    # 3) İş kuralları

    # 3.a) Satış durumu
    if "for_sale" in data:
        logger.info("[update_bot_listing] Incoming for_sale=%s", data["for_sale"])
        if data["for_sale"] is False:
            logger.info("[update_bot_listing] for_sale=False, resetting sell_price & sold_profit_share_rate")
            data["sell_price"] = None
            data["sold_profit_share_rate"] = 0
        else:
            # for_sale True ise fiyat var mı?
            sell_price = data.get("sell_price", bot.sell_price)
            logger.info("[update_bot_listing] Effective sell_price=%s (payload or existing)", sell_price)
            if sell_price is None:
                logger.warning("[update_bot_listing] for_sale=True but sell_price is None")
                raise HTTPException(
                    status_code=400,
                    detail="sell_price is required when for_sale is true.",
                )

    # 3.b) Kiralama durumu
    if "for_rent" in data:
        logger.info("[update_bot_listing] Incoming for_rent=%s", data["for_rent"])
        if data["for_rent"] is False:
            logger.info("[update_bot_listing] for_rent=False, resetting rent_price & rent_profit_share_rate")
            data["rent_price"] = None
            data["rent_profit_share_rate"] = 0
        else:
            rent_price = data.get("rent_price", bot.rent_price)
            logger.info("[update_bot_listing] Effective rent_price=%s (payload or existing)", rent_price)
            if rent_price is None:
                logger.warning("[update_bot_listing] for_rent=True but rent_price is None")
                raise HTTPException(
                    status_code=400,
                    detail="rent_price is required when for_rent is true.",
                )

    # 3.c) Açıklamayı normalize et
    if "listing_description" in data:
        logger.info("[update_bot_listing] Raw listing_description=%r", data["listing_description"])
        desc = (data["listing_description"] or "").strip()
        data["listing_description"] = desc if desc else None
        logger.info("[update_bot_listing] Normalized listing_description=%r", data["listing_description"])

    # 3.d) Profit share kuralları
    if "is_profit_share" in data:
        logger.info("[update_bot_listing] Incoming is_profit_share=%s", data["is_profit_share"])

        if data["is_profit_share"] is False:
            logger.info("[update_bot_listing] is_profit_share=False, zeroing profit share rates")
            data["rent_profit_share_rate"] = 0
            data["sold_profit_share_rate"] = 0
        else:
            # is_profit_share True ise oranların 0–100 aralığında olduğundan emin ol
            rent_rate = data.get("rent_profit_share_rate", bot.rent_profit_share_rate or 0)
            sold_rate = data.get("sold_profit_share_rate", bot.sold_profit_share_rate or 0)

            logger.info(
                "[update_bot_listing] Effective profit share rates (rent=%s, sold=%s)",
                rent_rate, sold_rate
            )

            for field_name, val in [
                ("rent_profit_share_rate", rent_rate),
                ("sold_profit_share_rate", sold_rate),
            ]:
                if val is not None:
                    fval = float(val)
                    logger.info(
                        "[update_bot_listing] Checking %s=%s (float=%s)",
                        field_name, val, fval
                    )
                    if fval < 0 or fval > 100:
                        logger.warning(
                            "[update_bot_listing] %s out of range: %s",
                            field_name, fval
                        )
                        raise HTTPException(
                            status_code=400,
                            detail=f"{field_name} must be between 0 and 100.",
                        )
                    # data içinde yoksa (sadece validasyon yaptık) set edelim
                    if field_name not in data:
                        data[field_name] = fval

    logger.info("[update_bot_listing] Final data to set on bot: %s", data)

    # 4) Alanları modele uygula
    for field, value in data.items():
        logger.info("[update_bot_listing] Setting bot.%s = %r", field, value)
        setattr(bot, field, value)

    try:
        await db.commit()
        await db.refresh(bot)
    except Exception as e:
        logger.exception("[update_bot_listing] DB commit/refresh error: %s", e)
        raise

    logger.info("[update_bot_listing] SUCCESS for bot_id=%s", bot.id)
    logger.info("=== [update_bot_listing] END ===")
    return bot


@protected_router.get(
    "/bots/{bot_id}/checkout-summary",
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

@protected_router.post("/bots/{bot_id}/acquire", response_model=AcquireBotOut)
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

