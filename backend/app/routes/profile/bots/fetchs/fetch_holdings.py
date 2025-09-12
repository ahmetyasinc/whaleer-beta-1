from sqlalchemy import select
from app.models.profile.bots.bot_holdings import BotHoldings
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.bots.bot_analysis import HoldingsOut

async def fetch_holdings_for_bot(bot_id: int, db: AsyncSession):
    result = await db.execute(
        select(BotHoldings).where(BotHoldings.bot_id == bot_id)
    )
    holdings = result.scalars().all()

    return [
        HoldingsOut(
            symbol=holding.symbol or "",
            amount=float(holding.amount or 0),
            cost=float(holding.average_cost or 0),
            profit=float((holding.realized_pnl+holding.unrealized_pnl) or 0),
        )
        for holding in holdings
    ]

