from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db

from app.schemas.showcase.showcase import ShowcaseFilter, ShowcaseBotResponse
from app.services.showcase.showcase_service import ShowcaseService

protected_router = APIRouter()

@protected_router.post("/showcase/newdata", response_model=List[ShowcaseBotResponse])
async def get_showcase_bots(filters: ShowcaseFilter, db: Session = Depends(get_db)):
    service = ShowcaseService(db=db)
    return await service.get_showcase_bots(filters)

@protected_router.get("/showcase/bot/{bot_id}", response_model=ShowcaseBotResponse)
async def get_single_bot(bot_id: int, db: Session = Depends(get_db)):
    service = ShowcaseService(db=db)
    bot_data = await service.get_showcase_bot_by_id(bot_id)
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    return bot_data


