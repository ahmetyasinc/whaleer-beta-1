from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import select
from app.core.auth import verify_token
from app.models.profile.bots.bots import Bots
from app.database import get_db
from typing import List

from app.models.user import User

from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserLastLogin(BaseModel):
    id: int
    username: str
    last_login: Optional[datetime]

    class Config:
        from_attributes = True



protected_router = APIRouter()

@protected_router.get("/fetch/user/last_login", response_model=List[UserLastLogin])
async def get_user_last_login(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users