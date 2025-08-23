from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import select
from app.core.auth import verify_token_mobile
from app.models.profile.bots.bots import Bots
from app.database import get_db
from app.routes.profile.bots.fetchs.fetch_holdings import fetch_holdings_for_bot
from app.routes.profile.bots.fetchs.fetch_pnl import generate_pnl_from_snapshots
from app.routes.profile.bots.fetchs.fetch_positions import fetch_positions_for_bot
from app.routes.profile.bots.fetchs.fetch_trades import fetch_trades_for_bot
from app.schemas.bots.bot_analysis import BotAnalysisOut


protected_router = APIRouter()

@protected_router.get("/mobile/bots/{bot_id}/analysis", response_model=BotAnalysisOut)
async def get_bot_analysis(
    bot_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(verify_token_mobile)
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