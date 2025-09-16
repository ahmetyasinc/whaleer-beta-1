from fastapi import APIRouter, HTTPException, Depends, Response
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from app.models import User
from app.database import get_db
from app.core.auth import create_access_token, create_refresh_token
import logging
from datetime import datetime
import bcrypt

from dotenv import load_dotenv
import os
load_dotenv()

SECRET_KEY = "38842270259879952027900728229105"  # .env'e taşı
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 saat
REFRESH_TOKEN_EXPIRE_DAYS = 30   # 30 gün

router = APIRouter()

# --------------------------
# Pydantic modelleri
# --------------------------
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    password: str
    confirmPassword: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# --------------------------
# Logger
# --------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------
# Yardımcı fonksiyonlar
# --------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception as e:
        logger.warning(f"Password verify error: {e}")
        return False

# --------------------------
# Login
# --------------------------
@router.post("/api/login/")
async def login(response: Response, data: LoginRequest, db: AsyncSession = Depends(get_db)):
    username = data.username
    password = data.password
    
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=401, detail="Geçersiz kullanıcı adı veya şifre!")

    # ✅ Hash ile şifre doğrulama
    if not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Geçersiz kullanıcı adı veya şifre!")

    user.last_login = datetime.utcnow()
    await db.commit()
    
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    response.set_cookie(
        key="access_token",
        value=access_token,
        secure=False,
        max_age=60 * ACCESS_TOKEN_EXPIRE_MINUTES,
        samesite="Lax",
        path="/"
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        secure=False,
        max_age=86400 * REFRESH_TOKEN_EXPIRE_DAYS,
        samesite="Lax",
        path="/"
    )

    return {"message": "Giriş başarılı"}

# --------------------------
# Register
# --------------------------
@router.post("/api/register/")
async def add_user(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Şifre doğrulama
    if data.password != data.confirmPassword:
        raise HTTPException(status_code=400, detail="Şifreler eşleşmiyor!")

    # Aynı e-posta var mı?
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalars().first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kullanılıyor!")

    # ✅ Şifreyi hashle
    hashed_password = hash_password(data.password)

    # Yeni kullanıcı
    user = User(
        name=data.first_name,
        last_name=data.last_name,
        username=data.username,
        email=data.email,
        password=hashed_password
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"message": "Kayıt başarılı"}

# --------------------------
# Refresh token
# --------------------------
@router.post("/api/refresh-token/")
async def refresh_token(request: RefreshTokenRequest, response: Response, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(request.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(status_code=401, detail="Geçersiz refresh token")

        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

        new_access_token = create_access_token({"sub": str(user.id)})
        return {"access_token": new_access_token, "token_type": "bearer"}
    
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token")
