from app.models import User
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from typing import Dict, Any
from app.core.auth import verify_token

async def get_user(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
) -> Dict[str, Any]:
    
    user_id = int(user_id)

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Kullanıcı bilgilerini dict olarak döndür
    return {
        "id": user.id,  # int
        "name": user.name,
        "last_name": user.last_name,
        "username": user.username,
        "email": user.email,
        "role": user.role,  # Enum'dan string değerini al
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "profile_picture": user.profile_picture
    }