from fastapi import Request, Response, HTTPException, status, Header
from jose import jwt, JWTError, ExpiredSignatureError
from datetime import datetime, timedelta
from typing import Optional

SECRET_KEY = "38842270259879952027900728229105"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 saat yani 60 olmalı
REFRESH_TOKEN_EXPIRE_DAYS = 30   # 30 gün


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):    
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def verify_token(request: Request, response: Response):
    auth_token = request.cookies.get("access_token")
    refresh_token = request.cookies.get("refresh_token")

    if not auth_token and not refresh_token:
        print("Authentication required")
        raise HTTPException(status_code=401, detail="Authentication required")

    if not auth_token and refresh_token:
        try:
            print("REFRESHİNG")
            refresh_payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = refresh_payload.get("sub")
            if not user_id:
                print("Invalid refresh token")
                raise HTTPException(status_code=401, detail="Invalid refresh token")

            new_access_token = create_access_token({"sub": user_id})
            # ✅ Doğru kullanım
            response.set_cookie(
                key="access_token",
                value=new_access_token,
                secure=False,
                max_age=60 * ACCESS_TOKEN_EXPIRE_MINUTES,
                samesite="Lax",
                path="/"
            )
            return user_id

        except JWTError:
            print("Invalid refresh token")
            raise HTTPException(status_code=401, detail="Invalid refresh token")

    try:
        if auth_token:
            payload = jwt.decode(auth_token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                print("Invalid token")
                raise HTTPException(status_code=401, detail="Invalid token")
            return user_id

    except ExpiredSignatureError:
        if not refresh_token:
            print("Token expired, and no refresh token provided")
            raise HTTPException(status_code=401, detail="Token expired, and no refresh token provided")

        try:
            refresh_payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = refresh_payload.get("sub")
            if not user_id:
                print("Invalid refresh token")
                raise HTTPException(status_code=401, detail="Invalid refresh token")

            new_access_token = create_access_token({"sub": user_id})
            # ✅ Doğru kullanım
            response.set_cookie(
                key="access_token",
                value=new_access_token,
                secure=False,
                max_age=60 * ACCESS_TOKEN_EXPIRE_MINUTES,
                samesite="Lax",
                path="/"
            )
            return user_id

        except JWTError:
            print("Invalid refresh token")
            raise HTTPException(status_code=401, detail="Invalid refresh token")

    except JWTError:
        print("Invalid token")
        raise HTTPException(status_code=401, detail="Invalid token")

def _parse_bearer(auth_header: str | None) -> str | None:
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None

async def verify_token_mobile(
    authorization: str | None = Header(default=None, alias="Authorization")
) -> int:
    """
    Sadece mobil istemciler için:
    - Authorization: Bearer <access_token> bekler
    - Cookie KULLANMAZ
    - Süresi dolmuş access'te 401 döndürür (mobil refresh endpoint'ini kullanmalı)
    """
    token = _parse_bearer(authorization)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header required")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        # tip güvenliği (int'e çevir)
        try:
            return int(user_id)
        except (TypeError, ValueError):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    except ExpiredSignatureError:
        # Mobil taraf 401 görünce /auth/refresh çağıracak
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
def validate_refresh_token_and_get_user_id(refresh_token: str) -> int:
    """
    - Refresh token imza + exp doğrulaması
    - İçindeki 'sub' alanını int olarak döndürür
    """
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Malformed refresh token")

    try:
        return int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token subject")
    