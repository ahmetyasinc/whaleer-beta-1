# app/routes/profile/settings/settings.py
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.core.get_user import get_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


class SettingsIn(BaseModel):
    name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class SettingsOut(BaseModel):
    name: str
    last_name: str
    username: str
    email: EmailStr
    phone: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None


async def _get_current_user(db: AsyncSession, user_ctx: dict) -> User:
    q = await db.execute(select(User).where(User.id == user_ctx.get("id")))
    u: Optional[User] = q.scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User not found")
    return u

import re
import bcrypt

_BCRYPT_RE = re.compile(r"^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, stored: str) -> bool:
    if not stored:
        return False
    try:
        if _BCRYPT_RE.match(stored):
            result = bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8"))
            return result
        else:
            result = (password == stored)
            return result
    except Exception as e:
        return False


@router.get("/settings", response_model=SettingsOut)
async def read_settings(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_user),
):
    u = await _get_current_user(db, user)
    return SettingsOut(
        name=u.name,
        last_name=u.last_name,
        username=u.username,
        email=u.email,
        phone=u.phone,
        bio=u.bio,
        location=u.location,
        instagram=u.instagram,
        linkedin=u.linkedin,
        github=u.github,
    )


@router.put("/settings", response_model=SettingsOut)
async def update_settings(
    payload: SettingsIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_user),
):
    u = await _get_current_user(db, user)

    # temel alanlar
    for field in [
        "name",
        "last_name",
        "username",
        "email",
        "phone",
        "bio",
        "location",
        "instagram",
        "linkedin",
        "github",
    ]:
        val = getattr(payload, field)
        if val is not None:
            setattr(u, field, val)

    # şifre değişikliği
    if payload.new_password:
        if u.password:  # mevcut şifre varsa doğrula
            if not payload.current_password or not verify_password(payload.current_password, u.password):
                raise HTTPException(400, "Current password is incorrect")
        # yeni şifreyi kaydet
        u.password = hash_password(payload.new_password)

    await db.commit()
    await db.refresh(u)

    return SettingsOut(
        name=u.name,
        last_name=u.last_name,
        username=u.username,
        email=u.email,
        phone=u.phone,
        bio=u.bio,
        location=u.location,
        instagram=u.instagram,
        linkedin=u.linkedin,
        github=u.github,
    )
