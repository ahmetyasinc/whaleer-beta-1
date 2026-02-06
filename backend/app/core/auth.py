from fastapi import Request, HTTPException, status, Depends, Header
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.exc import IntegrityError
from typing import Optional
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User
import logging
import httpx

load_dotenv()

# Supabase JWT Secret (Project Settings -> API -> JWT Secret)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
ALGORITHM = "HS256"

if not SUPABASE_JWT_SECRET:
    # Fallback or error
    print("WARNING: SUPABASE_JWT_SECRET is not set.")

def _parse_bearer(auth_header: str | None) -> str | None:
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None

# Configure logging
logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.WARNING)  # Suppress detailed httpx request logs
logger = logging.getLogger(__name__)

# Global JWKS Cache
JWKS_CACHE = None

async def get_supabase_jwks():
    global JWKS_CACHE
    if JWKS_CACHE:
        return JWKS_CACHE
    
    if not SUPABASE_URL:
        # Fallback logging
        logger.error("NEXT_PUBLIC_SUPABASE_URL not set in env.")
        # Attempt to retrieve from another var if possible, or fail
        raise HTTPException(status_code=500, detail="Server configuration error: Missing Supabase URL")

    try:
        url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            JWKS_CACHE = resp.json()
            logger.debug("Fetched Supabase JWKS successfully")
            return JWKS_CACHE
    except Exception as e:
        logger.error(f"Failed to fetch JWKS: {e}")
        raise HTTPException(status_code=500, detail="Authentication system error")

async def verify_token(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: AsyncSession = Depends(get_db)
) -> int:
    """
    Supabase JWT doğrular.
    Destekler: HS256 (Secret ile), ES256/RS256 (JWKS ile).
    """
    
    # 1. Token Al
    token = _parse_bearer(authorization)
    if not token:
        token = request.cookies.get("access_token")
    
    if not token:
        # logger.warning("verify_token: No token found")
        raise HTTPException(status_code=401, detail="Authentication required")

    # 2. Token Doğrula
    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg")
        
        # logger.info(f"verify_token: Algorithm found: {alg}")

        if alg == "HS256":
             payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        elif alg in ["RS256", "ES256"]:
             jwks = await get_supabase_jwks()
             payload = jwt.decode(token, jwks, algorithms=[alg], options={"verify_aud": False})
        else:
             logger.error(f"Unsupported JWT algorithm: {alg}")
             raise HTTPException(status_code=401, detail="Invalid token algorithm")
        
        supabase_uid = payload.get("sub")
        email = payload.get("email")
        user_metadata = payload.get("user_metadata", {})
        
        if not supabase_uid:
            logger.error(f"verify_token: No 'sub' in payload")
            raise HTTPException(status_code=401, detail="Invalid token: no sub")

    except JWTError as e:
        # logger.error(f"verify_token: JWT Verification Failed: {e}")
        # Detay vermemek güvenlik için daha iyidir ama debug için tutuyoruz
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"verify_token: Unexpected error: {e}")
        raise HTTPException(status_code=401, detail="Authentication error")

    # 3. User Lookup / Lazy Sync
    try:
        result = await db.execute(select(User).where(User.provider_user_id == supabase_uid))
        user = result.scalars().first()

        if user:
            # logger.info(f"verify_token: User found (id={user.id})")
            return user.id
        else:
            # Kullanıcı yok -> Oluştur
            logger.info(f"verify_token: User not found locally for Supabase UID {supabase_uid}. Creating new user...")
            
            # Metadata'dan isimleri al
            first_name = user_metadata.get("first_name", "")
            last_name = user_metadata.get("last_name", "") # Supabase 'full_name' varsa onu da parçalayabilirsin
            
            # Fallback for names if empty
            if not first_name and not last_name:
                name_parts = (user_metadata.get("full_name") or "").split(" ")
                if len(name_parts) > 0:
                    first_name = name_parts[0]
                if len(name_parts) > 1:
                    last_name = " ".join(name_parts[1:])
            
            username = user_metadata.get("username", email.split("@")[0] if email else f"user_{supabase_uid[:8]}")
            
            new_user = User(
                email=email,
                username=username,
                name=first_name or "Unknown",
                last_name=last_name or "User",
                password="", # Şifre artık Supabase'de
                provider_user_id=supabase_uid,
                auth_provider="supabase",
                is_active=True,
                is_verified=True
            )
            
            # Email çakışması kontrolü
            email_check = await db.execute(select(User).where(User.email == email))
            existing_email_user = email_check.scalars().first()
            
            if existing_email_user:
                logger.info(f"verify_token: Merging with existing user (id={existing_email_user.id}) by email")
                existing_email_user.provider_user_id = supabase_uid
                existing_email_user.auth_provider = "supabase"
                await db.commit()
                return existing_email_user.id
            
            try:
                db.add(new_user)
                await db.commit()
                await db.refresh(new_user)
                logger.info(f"verify_token: Created new user (id={new_user.id})")
                return new_user.id
            except IntegrityError:
                await db.rollback()
                logger.warning(f"verify_token: Race condition detected for email {email}. Fetching existing user from DB.")
                # Race condition: Another request created the user moments ago.
                # Recalculate/refetch since we know they must exist now (either by email or provider_id)
                # Check by provider_id first as it's the primary sync key
                race_user_check = await db.execute(select(User).where(User.provider_user_id == supabase_uid))
                race_user = race_user_check.scalars().first()
                if race_user:
                     return race_user.id
                
                # If not found by provider_id, check by email (maybe merged by another thread)
                race_email_check = await db.execute(select(User).where(User.email == email))
                race_email_user = race_email_check.scalars().first()
                if race_email_user:
                    return race_email_user.id
                
                # Should not reach here if it was truly a unique constraint violation
                logger.error("verify_token: IntegrityError occurred but user still not found.")
                raise

    except Exception as e:
        logger.error(f"verify_token: Database error during user sync: {e}")
        raise HTTPException(status_code=500, detail="Internal authentication error")

# Alias for compatibility if needed
verify_token_mobile = verify_token
    