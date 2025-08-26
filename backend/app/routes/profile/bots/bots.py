from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import Session
from sqlalchemy import delete, select
from app.core.auth import verify_token
from app.models.profile.bots.bots import Bots
from app.database import get_db
from app.schemas.bots.bots import BotsCreate, BotsUpdate, BotsOut
from app.routes.profile.bots.fetchs.fetch_holdings import fetch_holdings_for_bot
from app.routes.profile.bots.fetchs.fetch_pnl import generate_pnl_from_snapshots
from app.routes.profile.bots.fetchs.fetch_positions import fetch_positions_for_bot
from app.routes.profile.bots.fetchs.fetch_trades import fetch_trades_for_bot
from app.schemas.bots.bot_analysis import BotAnalysisOut
from app.models.profile.bots.bot_snapshots import BotSnapshots
from app.models.profile.bots.bot_trades import BotTrades
from app.models.profile.bots.bot_positions import BotPositions
from app.models.profile.bots.bot_holdings import BotHoldings

from app.models.user import User
from app.models.profile.bots.bot_follow import BotFollow
from app.schemas.showcase.bot_follow import FollowCreate 


protected_router = APIRouter()

# GET all bots for user
@protected_router.get("/api/get-bots", response_model=list[BotsOut])
async def get_all_bots(db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(
        select(Bots)
        .where(Bots.user_id == int(user_id))
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
    return new_bot

# PATCH update bot (sadece kendi botunu güncelleyebilir)
@protected_router.put("/api/update-bot/{bot_id}", response_model=BotsOut)
async def update_bot(
    bot_id: int,
    bot_data: BotsUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    print(bot_id, bot_data, user_id)
    result = await db.execute(
        select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id))
    )
    bot = result.scalar_one_or_none()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    for field, value in bot_data.dict(exclude_unset=True).items():
        setattr(bot, field, value)
    print(bot.name, bot.period, bot.stocks, bot.candle_count, bot.active_days, bot.active_hours, bot.active)
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

# PATCH activate (sadece kendi botunu aktif hale getirebilir)
@protected_router.post("/api/bots/{bot_id}/activate")
async def activate_bot(bot_id: int, db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id)))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")
    bot.active = True
    await db.commit()
    return {"detail": "Bot activated"}

# PATCH deactivate (sadece kendi botunu pasif hale getirebilir)
@protected_router.post("/api/bots/{bot_id}/deactivate")
async def deactivate_bot(bot_id: int, db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id)))
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
    user_id: dict = Depends(verify_token)
):
    result = await db.execute(
        select(Bots).where(Bots.id == bot_id, Bots.user_id == int(user_id))
    )
    bot = result.scalar_one_or_none()

    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found or unauthorized")

    trades = await fetch_trades_for_bot(bot_id, db)
    open_positions = await fetch_positions_for_bot(bot_id, db)
    holdings = await fetch_holdings_for_bot(bot_id, db)
    pnl_data = await generate_pnl_from_snapshots(bot_id, db)
    profit = bot.current_usd_value - bot.initial_usd_value

    return BotAnalysisOut(
        bot_id=bot.id,
        bot_name=bot.name,
        bot_current_value=bot.current_usd_value,
        bot_profit=profit,
        trades=trades,
        open_positions=open_positions,
        holdings=holdings,
        pnl_data=pnl_data
    )

@protected_router.post("/bot/follow")
async def follow_bot(follow_data: FollowCreate, db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = int(user_data)

    # 1. Bot var mı?
    result = await db.execute(select(Bots).where(Bots.id == follow_data.bot_id))
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
    result = await db.execute(select(Bots).where(Bots.id == follow_data.bot_id))
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
        select(Bots).where(Bots.id.in_(followed_bot_ids))
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
