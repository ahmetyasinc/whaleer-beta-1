from sqlalchemy import select
from app.models.profile.bots.bot_trades import BotTrades
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.bots.bot_analysis import TradeOut

async def fetch_trades_for_bot(bot_id: int, db: AsyncSession):
    result = await db.execute(
        select(BotTrades).where(
            BotTrades.bot_id == bot_id,
            BotTrades.amount_state != 0
        )
    )
    trades = result.scalars().all()

    return [
        TradeOut(
            date=str(trade.created_at),
            symbol=trade.symbol,
            amount=float(trade.amount),
            fee=float(trade.fee),
            price=float(trade.price),
            trade_type=trade.trade_type,
            side=trade.side,
            position_side=trade.position_side or "",
            leverage=float(trade.leverage or 0),
            status=trade.status
        )
        for trade in trades
    ]