from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, select
from app.core.auth import verify_token
from app.models.profile.bots.bots import Bots
from app.database import get_db
from app.schemas.bots.bots import BotsBase, BotsCreate, BotsUpdate, BotsOut
from app.routes.profile.bots.fetchs.fetch_holdings import fetch_holdings_for_bot
from app.routes.profile.bots.fetchs.fetch_pnl import generate_pnl_from_snapshots
from app.routes.profile.bots.fetchs.fetch_positions import fetch_positions_for_bot
from app.routes.profile.bots.fetchs.fetch_trades import fetch_trades_for_bot
from app.schemas.bots.bot_analysis import BotAnalysisOut
from app.models.profile.bots.bot_snapshots import BotSnapshots
from app.models.profile.bots.bot_trades import BotTrades
from app.models.profile.bots.bot_positions import BotPositions
from app.models.profile.bots.bot_holdings import BotHoldings

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