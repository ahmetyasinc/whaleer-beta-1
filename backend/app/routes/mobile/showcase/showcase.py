from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db

from app.schemas.showcase.showcase import ShowcaseFilter, ShowcaseBotResponse
from app.services.showcase.showcase_service import ShowcaseService

from sqlalchemy import select
from app.core.auth import verify_token_mobile
from app.models.profile.bots.bots import Bots


from app.models.user import User
from app.models.profile.bots.bot_follow import BotFollow
from app.schemas.showcase.bot_follow import FollowCreate 

protected_router = APIRouter()

@protected_router.post("/mobile/showcase/newdata", response_model=List[ShowcaseBotResponse])
async def get_showcase_bots(filters: ShowcaseFilter, db: Session = Depends(get_db)):
    service = ShowcaseService(db=db)
    return await service.get_showcase_bots(filters)


@protected_router.post("/mobile/bot/follow")
async def follow_bot(follow_data: FollowCreate, db: Session = Depends(get_db), user_data: dict = Depends(verify_token_mobile)):
    user_id = int(user_data)

    # 1. Bot var mı?
    result = await db.execute(select(Bots).where(Bots.id == follow_data.bot_id))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    # 2. Zaten takip ediliyor mu?
    result = await db.execute(
        select(BotFollow).where(
            BotFollow.user_id == user_id,
            BotFollow.bot_id == follow_data.bot_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Already following this bot")

    # 3. Takip kaydı ekle
    new_follow = BotFollow(user_id=user_id, bot_id=follow_data.bot_id)
    db.add(new_follow)

    # 4. Botun sahibini bul ve takipçi sayısını artır
    result = await db.execute(select(User).where(User.id == bot.user_id))
    owner = result.scalar_one_or_none()
    if owner:
        owner.total_followers = (owner.total_followers or 0) + 1

    await db.commit()
    return {"message": "Successfully followed bot"}