from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db

from app.core.auth import verify_token

from app.schemas.showcase.showcase import ShowcaseFilter, ShowcaseBotResponse
from app.services.showcase.showcase_service import ShowcaseService


protected_router = APIRouter()

@protected_router.post("/showcase/newdata")#, response_model=List[ShowcaseBotResponse])
async def get_showcase_bots(filters: ShowcaseFilter, db: Session = Depends(get_db)):
    service = ShowcaseService(db=db)
    return await service.get_showcase_bots(filters)

