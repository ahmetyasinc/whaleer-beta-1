from app.models.profile.bots.bot_snapshots import BotSnapshots
from app.schemas.bots.bot_analysis import PnLPoint
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def generate_pnl_from_snapshots(bot_id: int, db: AsyncSession) -> list[PnLPoint]:
    result = await db.execute(
        select(BotSnapshots)
        .where(BotSnapshots.bot_id == bot_id)
        .order_by(BotSnapshots.timestamp)
    )
    snapshots = result.scalars().all()

    pnl_points = []

    for snapshot in snapshots:
        try:
            capital = float(snapshot.balance_usdt) - float(snapshot.total_profit)
            if capital == 0:
                pnl_percent = 0.0
            else:
                pnl_percent = (float(snapshot.total_profit) / capital) * 100
        except Exception:
            pnl_percent = 0.0

        pnl_points.append(
            PnLPoint(
                date=snapshot.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                pnl=round(pnl_percent, 2)
            )
        )

    return pnl_points

