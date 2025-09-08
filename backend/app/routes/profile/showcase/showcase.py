from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession  # ← önemli

from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db

from app.schemas.showcase.showcase import ShowcaseFilter, ShowcaseBotResponse
from app.services.showcase.showcase_service import ShowcaseService

from app.models.profile.bots.bots import Bots
from app.models.user import User
from app.core.auth import verify_token


protected_router = APIRouter()

@protected_router.post("/showcase/newdata", response_model=List[ShowcaseBotResponse])
async def get_showcase_bots(filters: ShowcaseFilter, db: Session = Depends(get_db)):
    service = ShowcaseService(db=db)
    return await service.get_showcase_bots(filters)

@protected_router.get("/showcase/mydata", response_model=List[ShowcaseBotResponse])
async def get_showcase_my_bots(
    user_id: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    service = ShowcaseService(db=db)
    return await service.get_showcase_my_bots(int(user_id))

@protected_router.get("/showcase/bot/{bot_id}", response_model=ShowcaseBotResponse)
async def get_single_bot(bot_id: int, db: Session = Depends(get_db)):
    service = ShowcaseService(db=db)
    bot_data = await service.get_showcase_bot_by_id(bot_id)
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot_data

@protected_router.get("/showcase/searchdata")
async def get_showcase_bots(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(
            Bots.id,
            Bots.name,
            User.username.label("user_name"),
            Bots.bot_type.label("type"),
            Bots.initial_usd_value,
            Bots.current_usd_value,
            Bots.for_rent,
            Bots.for_sale,
            Bots.rent_price,
            Bots.sell_price,
        )
        .join(User, User.id == Bots.user_id, isouter=True)
    )

    res = await db.execute(stmt)
    rows = res.mappings().all()

    bots = []
    for r in rows:
        # Eğer satılık da kiralık da değilse ekleme
        if not r["for_rent"] and not r["for_sale"]:
            continue

        init_val = float(r["initial_usd_value"] or 0)
        curr_val = float(r["current_usd_value"] or 0)

        if init_val > 0:
            total_profit_pct = ((curr_val - init_val) / init_val) * 100
        else:
            total_profit_pct = 0.0

        bot = {
            "id": r["id"],
            "name": r["name"],
            "user_name": r["user_name"],
            "type": r["type"],
            "totalProfitPercentage": round(total_profit_pct, 2),
        }

        if r["for_rent"]:
            bot["rent_price"] = float(r["rent_price"]) if r["rent_price"] is not None else None
        if r["for_sale"]:
            bot["sell_price"] = float(r["sell_price"]) if r["sell_price"] is not None else None

        bots.append(bot)

    return {"bots": bots}


