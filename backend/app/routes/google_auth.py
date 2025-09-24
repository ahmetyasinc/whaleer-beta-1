# app/routes/google_auth.py
import os
import json
import time
import secrets
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from jose import jwt, jwk
from jose.utils import base64url_decode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models import User
from app.core.auth import create_access_token, create_refresh_token  # senin JWT üreticilerin

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth:google"])

# ── ÇEVRE DEĞİŞKENLERİ ──────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
# Backend taban URL (callback kendisini tam URL ile yazmalı)
BACKEND_BASE_URL = os.environ.get("BACKEND_BASE_URL", "http://localhost:8000")
# Cookie domain istiyorsan .env'de ayarla (lokalde boş bırak)
COOKIE_DOMAIN = os.environ.get("COOKIE_DOMAIN", None)

# Google sabitleri
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISS = {"https://accounts.google.com", "accounts.google.com"}

# JWKS cache (çok basit)
_JWKS_CACHE = {"keys": None, "ts": 0, "ttl": 60 * 60}


# ── Yardımcılar ────────────────────────────────────────────────────────────────
def _now_ts() -> int:
    return int(time.time())

async def _get_google_jwks():
    """Basit JWKS cache."""
    try:
        if _JWKS_CACHE["keys"] and (_now_ts() - _JWKS_CACHE["ts"] < _JWKS_CACHE["ttl"]):
            return _JWKS_CACHE["keys"]
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(GOOGLE_JWKS_URL)
            r.raise_for_status()
            data = r.json()
            _JWKS_CACHE["keys"] = data
            _JWKS_CACHE["ts"] = _now_ts()
            return data
    except Exception as e:
        logger.exception("JWKS fetch error: %s", e)
        raise HTTPException(status_code=502, detail="Google JWKS alınamadı")

def _sign_state(redirect_uri: str, nonce: str) -> str:
    """
    State'i imzalamak için basit bir JWT kullanıyoruz (server-secret ile).
    İçine redirect_uri ve nonce koyuyoruz.
    """
    state_payload = {
        "redirect_uri": redirect_uri,
        "nonce": nonce,
        "iat": _now_ts(),
        "exp": _now_ts() + 600,  # 10 dk
    }
    # NOT: Bu secret'ı mevcut core auth yapınla ortak kullanabilirsin
    secret = os.environ.get("STATE_JWT_SECRET", "change-this-in-prod")
    return jwt.encode(state_payload, secret, algorithm="HS256")

def _verify_state(state_token: str) -> dict:
    secret = os.environ.get("STATE_JWT_SECRET", "change-this-in-prod")
    try:
        data = jwt.decode(state_token, secret, algorithms=["HS256"])
        return data
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz state")

def _ensure_client_config():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth istemci bilgileri eksik")

def _build_callback_url() -> str:
    return f"{BACKEND_BASE_URL.rstrip('/')}/api/auth/google/callback"

def _gen_nonce(n_bytes: int = 16) -> str:
    return secrets.token_urlsafe(n_bytes)

def _build_username_from_email(email: str) -> str:
    local = (email or "").split("@")[0].lower()
    # Temizleme
    safe = "".join(ch for ch in local if ch.isalnum() or ch in ("_", ".", "-"))
    return safe or f"user{secrets.randbelow(1_000_000)}"


# ── ID Token doğrulama ─────────────────────────────────────────────────────────
async def verify_google_id_token(id_token: str, nonce_expected: str) -> dict:
    """
    Google ID Token (JWT) doğrulama:
      - imza (JWKS)
      - iss, aud, exp
      - nonce
    """
    # Header'dan kid çek
    headers = jwt.get_unverified_header(id_token)
    kid = headers.get("kid")
    if not kid:
        raise HTTPException(status_code=400, detail="ID token header eksik")

    # Payload'ı imzasız oku (claim'leri kontrol için)
    unverified_claims = jwt.get_unverified_claims(id_token)

    # iss
    iss = unverified_claims.get("iss")
    if iss not in GOOGLE_ISS:
        raise HTTPException(status_code=400, detail="Geçersiz issuer")

    # aud
    aud = unverified_claims.get("aud")
    if aud != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Geçersiz audience")

    # exp
    exp = unverified_claims.get("exp")
    if not exp or _now_ts() >= int(exp):
        raise HTTPException(status_code=400, detail="ID token süresi geçmiş")

    # nonce
    nonce = unverified_claims.get("nonce")
    if not nonce or nonce != nonce_expected:
        raise HTTPException(status_code=400, detail="Nonce uyuşmuyor")

    # JWKS ile imza doğrula
    jwks = await _get_google_jwks()
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        raise HTTPException(status_code=400, detail="Uygun JWKS anahtarı bulunamadı")
    # jose ile verify
    # -> jose.jwt.decode() otomatik verify edebilir; ancak kid eşleşmesini kendimiz yaptığımız için manuel doğrulayalım
    public_key = jwk.construct(key)
    signing_input, encoded_signature = id_token.rsplit(".", 1)
    decoded_sig = base64url_decode(encoded_signature.encode("utf-8"))
    if not public_key.verify(signing_input.encode("utf-8"), decoded_sig):
        raise HTTPException(status_code=400, detail="ID token imza doğrulaması başarısız")

    return unverified_claims


# ── ROUTES ─────────────────────────────────────────────────────────────────────
@router.get("/api/auth/google/start")
async def google_start(redirect_uri: str):
    """
    Frontend popup'ı buraya gelir:
    - nonce üret
    - state içine (imzalı) redirect_uri + nonce koy
    - kullanıcıyı Google Auth ekranına yönlendir
    """
    _ensure_client_config()
    nonce = _gen_nonce()
    state = _sign_state(redirect_uri=redirect_uri, nonce=nonce)

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": _build_callback_url(),
        "state": state,
        "nonce": nonce,
        "prompt": "consent",  # istersen kaldır
        "access_type": "offline",  # Google bazı durumlarda refresh döndürür; şart değil
    }
    # Redirect
    qs = "&".join(f"{k}={httpx.QueryParams({k: v})[k]}" for k, v in params.items())
    url = f"{GOOGLE_AUTH_URL}?{qs}"
    return RedirectResponse(url, status_code=302)

@router.get("/auth/google/callback")
async def google_callback(
    response: Response,
    code: str = "",
    state: str = "",
    db: AsyncSession = Depends(get_db)
):
    """
    Google dönüşü:
    - state doğrula
    - code -> token exchange
    - id_token doğrula
    - user'ı bul/oluştur
    - kendi access/refresh token üret
    - cookie'lere yaz ve frontend done sayfasına yönlendir
    """
    _ensure_client_config()

    # 1) State doğrula
    try:
        state_data = _verify_state(state)
        frontend_done_url = state_data["redirect_uri"]
        nonce_expected = state_data["nonce"]
    except HTTPException:
        return RedirectResponse(url=f"/?status=error&reason=state")

    # 2) Token exchange
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token_res = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": _build_callback_url(),
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            token_res.raise_for_status()
            token_data = token_res.json()
    except Exception:
        return RedirectResponse(url=f"{frontend_done_url}?status=error&reason=exchange")

    id_token = token_data.get("id_token")
    if not id_token:
        return RedirectResponse(url=f"{frontend_done_url}?status=error&reason=no_id_token")

    # 3) ID Token doğrula
    try:
        claims = await verify_google_id_token(id_token, nonce_expected=nonce_expected)
    except HTTPException:
        return RedirectResponse(url=f"{frontend_done_url}?status=error&reason=invalid_id")

    # 4) Kullanıcıyı bul/oluştur
    sub = claims.get("sub")
    email = claims.get("email")
    email_verified = claims.get("email_verified", False)
    given_name = claims.get("given_name") or ""
    family_name = claims.get("family_name") or ""
    picture = claims.get("picture") or None

    if not sub:
        return RedirectResponse(url=f"{frontend_done_url}?status=error&reason=no_sub")

    # Google provider ID ile ara
    result = await db.execute(
        select(User).where((User.auth_provider == "google") & (User.provider_user_id == sub))
    )
    user = result.scalars().first()

    if not user and email:
        # Email ile eşleşme var mı?
        result2 = await db.execute(select(User).where(User.email == email))
        by_email = result2.scalars().first()
        if by_email:
            user = by_email
            user.auth_provider = "google"
            user.provider_user_id = sub
        else:
            # Yeni kullanıcı
            username = _build_username_from_email(email) if email else f"user{secrets.randbelow(1_000_000)}"
            user = User(
                name=given_name,
                last_name=family_name,
                username=username,
                email=email,
                password=None,
                profile_picture=picture,
                is_verified=bool(email_verified),
                auth_provider="google",
                provider_user_id=sub,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                last_login=datetime.utcnow(),
            )
            db.add(user)
            await db.flush()

    if not user:
        return RedirectResponse(url=f"{frontend_done_url}?status=error&reason=no_userinfo")

    # Güncelle
    user.last_login = datetime.utcnow()
    if picture and not user.profile_picture:
        user.profile_picture = picture
    await db.commit()
    await db.refresh(user)

    # 5) Whaleer token üret ve cookie yaz
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    resp = RedirectResponse(url=f"{frontend_done_url}?status=ok", status_code=302)
    resp.set_cookie(
        key="access_token",
        value=access_token,
        secure=False,
        max_age=60 * 60,
        samesite="Lax",
        path="/"
    )
    resp.set_cookie(
        key="refresh_token",
        value=refresh_token,
        secure=False,
        max_age=86400 * 30,
        samesite="Lax",
        path="/"
    )
    return resp
