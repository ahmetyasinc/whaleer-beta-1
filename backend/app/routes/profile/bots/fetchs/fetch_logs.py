# app/routes/profile/bots/fetchs/fetch_logs.py
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile.bots.bot_logs import BotLogs
from app.schemas.bots.bot_analysis import BotLogOut

VALID_LEVELS = {"info", "warning", "error"}

async def fetch_logs_for_bot(
    bot_id: int,
    db: AsyncSession,
    level: Optional[str] = None,
    since: Optional[datetime] = None,
    limit: int = 200
) -> List[BotLogOut]:
    query = select(BotLogs).where(BotLogs.bot_id == bot_id)

    if level and level in VALID_LEVELS:
        query = query.where(BotLogs.level == level)

    if since:
        query = query.where(BotLogs.created_at >= since)

    query = query.order_by(desc(BotLogs.created_at)).limit(max(1, min(limit, 1000)))

    result = await db.execute(query)
    rows = result.scalars().all()

    return [
        BotLogOut(
            id=int(r.id),
            level=str(r.level),
            message=r.message or "",
            details=(r.details if r.details is not None else None),
            symbol=r.symbol,
            period=r.period,
            created_at=r.created_at,
        )
        for r in rows
    ]
