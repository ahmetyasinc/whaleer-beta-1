from fastapi import APIRouter, HTTPException, Depends, Response
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from app.models import User
from app.database import get_db
from app.core.auth import create_access_token, create_refresh_token, validate_refresh_token_and_get_user_id
import logging
from datetime import datetime
from app.schemas.mobile.auth import MobileLoginRequest, MobileAuthResponse, MobileAuthUser
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.models import User  # kendi yoluna göre düzelt

from dotenv import load_dotenv
import os
load_dotenv()

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

# Giriş verileri için Pydantic modeli
class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    password: str
    confirmPassword: str

# Refresh token isteği için Pydantic modeli
class RefreshTokenRequest(BaseModel):
    refresh_token: str

class MobileRefreshRequest(BaseModel):
    refresh_token: str

class MobileRefreshResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"

# Logger kullanımı
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@router.post("/mobile/login", response_model=MobileAuthResponse)
async def mobile_login(
    data: MobileLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    # 1) Kullanıcıyı bul
    result = await db.execute(select(User).where(User.username == data.username))
    user: User | None = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz kullanıcı adı veya şifre")

    # 3) Son giriş tarihi
    user.last_login = datetime.utcnow()
    await db.commit()

    # 4) Token üret
    sub = {"sub": str(user.id)}
    access_token = create_access_token(sub)          # kısa ömür (örn. 5–15 dk)
    refresh_token = create_refresh_token(sub)        # uzun ömür (örn. 7–30 gün, rotasyonlu)

    # 5) JSON olarak dön (cookie SET ETMİYORUZ)
    return MobileAuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=MobileAuthUser(id=user.id, username=user.username, followers=user.total_followers),
    )

@router.post("/mobile/refresh", response_model=MobileRefreshResponse)
async def mobile_refresh(
    payload: MobileRefreshRequest = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """
    - refresh_token doğrulanır (imza + exp + istenirse jti/rotasyon tablosu).
    - Kullanıcı aktif mi kontrol edilir (ban/deleted vs.).
    - Yeni access_token üretilir.
    - Rotasyon yapıyorsan yeni refresh_token da üretip dön.
    """
    # örnek pseudo: validate_refresh(payload.refresh_token) -> user_id
    user_id = validate_refresh_token_and_get_user_id(payload.refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Refresh token geçersiz")

    # kullanıcıyı kontrol et
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

    # yeni tokenlar
    new_access = create_access_token({"sub": str(user.id)})
    # rotasyon varsa:
    # new_refresh = rotate_and_issue_new_refresh_token(old=payload.refresh_token, user_id=user.id)
    new_refresh = None  # rotasyon yoksa None bırak

    return MobileRefreshResponse(access_token=new_access, refresh_token=new_refresh)