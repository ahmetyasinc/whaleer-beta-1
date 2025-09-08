# app/core/siws_jwt.py
from datetime import datetime, timezone, timedelta
import jwt
from app.core.settings import (
    SIWS_JWT_SECRET, SIWS_JWT_ALG, SIWS_JWT_EXPIRES
)

def make_siws_jwt(user_id: int, wallet_id: int, address: str, chain: str = "solana") -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=SIWS_JWT_EXPIRES)
    payload = {
        "sub": str(user_id),
        "wid": int(wallet_id),
        "adr": address,
        "ch": chain,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "typ": "siws",
    }
    return jwt.encode(payload, SIWS_JWT_SECRET, algorithm=SIWS_JWT_ALG)

def verify_siws_jwt(token: str) -> dict:
    return jwt.decode(token, SIWS_JWT_SECRET, algorithms=[SIWS_JWT_ALG])
