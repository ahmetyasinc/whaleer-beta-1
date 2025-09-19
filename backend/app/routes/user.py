from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User
from app.core.auth import verify_token

router = APIRouter()

@router.get("/api/user-info")
async def get_user_info(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    user_id = int(user_id)

    if user_id is None:
        raise HTTPException(status_code=401, detail="Geçersiz token: user_id bulunamadı.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "role": user.role,
    }
