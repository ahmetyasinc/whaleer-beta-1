from app.models.profile.bots.bot_positions import BotPositions
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.bots.bot_analysis import OpenPositionOut

async def fetch_positions_for_bot(bot_id: int, db: AsyncSession):
    result = await db.execute(
        select(BotPositions).where(BotPositions.bot_id == bot_id)
    )
    positions = result.scalars().all()

    return [
        OpenPositionOut(
            symbol=pos.symbol or "",
            amount=float(pos.amount or 0),
            cost=float(pos.average_cost or 0),
            position_side=pos.position_side or "",
            leverage=float(pos.leverage or 0),
            profit=float((pos.realized_pnl+pos.unrealized_pnl) or 0),
        )
        for pos in positions
    ]

