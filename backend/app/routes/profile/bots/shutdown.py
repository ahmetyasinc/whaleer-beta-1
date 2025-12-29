# app/routers/bots.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from enum import Enum
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.core.auth import verify_token
from app.models import Bots
from .close_positions.close_positions import main as close_positions_main
import logging

router = APIRouter()

class ShutdownScope(str, Enum):
    bot = "bot"
    api = "api"
    user = "user"

class ShutdownRequest(BaseModel):
    scope: ShutdownScope
    id: int = Field(..., gt=0)
    close_positions: bool = True

class ShutdownResponse(BaseModel):
    affected_bot_ids: List[int]
    closed_positions: int = 0
    message: str = "Shutdown completed."

@router.post("/shutdown/bots", response_model=ShutdownResponse)
async def shutdown_bots(
    payload: ShutdownRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(verify_token),
):
    user_id = int(user_id)

    base_q = select(Bots).where(
        Bots.user_id == user_id,
        Bots.deleted.is_(False),
    )

    if payload.scope == ShutdownScope.bot:
        q = base_q.where(Bots.id == payload.id)
    elif payload.scope == ShutdownScope.api:
        q = base_q.where(Bots.api_id == payload.id)
    else: 
        q = base_q

    bots = (await db.execute(q)).scalars().all()
    if not bots:
        raise HTTPException(status_code=404, detail="Kapatılacak bot bulunamadı.")

    affected_ids: List[int] = []

    closed_positions_total = 0
    if payload.close_positions:
        try:
            closed_positions_total = await close_positions_main(bots=bots, db=db)
        except Exception as exc:
            logging.exception("Pozisyon kapatma sırasında hata: %s", exc)

    for b in bots:
        b.active = False
        b.deleted = True
        b.for_sale = False
        b.for_rent = False
        affected_ids.append(b.id)

    await db.commit()

    return ShutdownResponse(
        affected_bot_ids=affected_ids,
        closed_positions=closed_positions_total,
        message=f"{len(affected_ids)} bot kapatılıp silindi."
    )
