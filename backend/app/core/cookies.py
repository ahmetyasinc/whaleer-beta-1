# app/core/cookies.py
from typing import Optional
from fastapi import Response, Request, HTTPException
from app.core.settings import (
    SIWS_COOKIE_NAME, SIWS_COOKIE_DOMAIN, SIWS_COOKIE_SECURE,
    SIWS_COOKIE_SAMESITE, SIWS_COOKIE_PATH, SIWS_COOKIE_MAX_AGE
)
from app.core.siws_jwt import verify_siws_jwt

def set_siws_cookie(response: Response, token: str):
    response.set_cookie(
        key=SIWS_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=SIWS_COOKIE_SECURE,
        samesite=SIWS_COOKIE_SAMESITE,
        domain=SIWS_COOKIE_DOMAIN,
        path=SIWS_COOKIE_PATH,
        max_age=SIWS_COOKIE_MAX_AGE,
    )

def clear_siws_cookie(response: Response):
    response.delete_cookie(
        key=SIWS_COOKIE_NAME,
        domain=SIWS_COOKIE_DOMAIN,
        path=SIWS_COOKIE_PATH
    )

def extract_siws_payload_or_401(request: Request) -> dict:
    cookie = request.cookies.get(SIWS_COOKIE_NAME)
    if not cookie:
        raise HTTPException(status_code=401, detail="No SIWS session")
    try:
        return verify_siws_jwt(cookie)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid SIWS session")
