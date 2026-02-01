from __future__ import annotations

import os, hmac, json, base64, time, hashlib
from typing import Optional
import struct

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.core.auth import verify_token
from app.models.user import User

# <- kendi model yoluna göre düzelt:
# ör: app.models.profile.telegram.telegram_account import TelegramAccount
from app.models.profile.telegram.telegram_account import TelegramAccount  # type: ignore

# ---------------------------------------------------------
# Ortak ayarlar
# ---------------------------------------------------------
TELEGRAM_BOT_TOKEN      = os.getenv("TELEGRAM_BOT_TOKEN")        # BotFather token
TELEGRAM_BOT_USERNAME   = os.getenv("TELEGRAM_BOT_USERNAME")     # t.me/<username>
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET")   # X-Telegram-Bot-Api-Secret-Token
TELEGRAM_LINK_SECRET    = os.getenv("TELEGRAM_LINK_SECRET") or (TELEGRAM_BOT_TOKEN or "change-me")

if not TELEGRAM_BOT_USERNAME:
    # deep link üretebilmek için gerekli
    # (lokalde .env’e TELEGRAM_BOT_USERNAME=WhaleerBot şeklinde ekle)
    pass
TOKEN_VERSION = 1
protected_router = APIRouter()
public_router    = APIRouter()

# ---------------------------------------------------------
# Basit, JWT’siz HMAC imzalı link token (stateless)
# ---------------------------------------------------------

def _b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")

def _b64u_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

def make_link_token(user_id: int, ttl_seconds: int = 600) -> str:
    uid = int(user_id)
    exp = int(time.time()) + int(ttl_seconds)
    nonce = int.from_bytes(os.urandom(4), "big")  # 4 byte

    # payload: [ver|uid(8)|exp(4)|nonce(4)]
    payload = struct.pack(">B Q I I", TOKEN_VERSION, uid, exp, nonce)

    mac = hmac.new(TELEGRAM_LINK_SECRET.encode("utf-8"), payload, hashlib.sha256).digest()
    sig = mac[:10]  # 10 byte yeterli; istersen 8–12 arası seç
    token_bytes = payload + sig
    return _b64u(token_bytes)

def verify_link_token(token: str) -> int:
    raw = _b64u_decode(token)
    if len(raw) < 1 + 8 + 4 + 4 + 8:  # min kontrol; bizim 1+8+4+4+10 = 27
        raise HTTPException(status_code=400, detail="Invalid token length")

    # payload ve imzayı ayır
    payload, sig = raw[:-10], raw[-10:]
    ver, uid, exp, nonce = struct.unpack(">B Q I I", payload)
    if ver != TOKEN_VERSION:
        raise HTTPException(status_code=400, detail="Invalid token version")
    if exp < int(time.time()):
        raise HTTPException(status_code=400, detail="Token expired")

    mac = hmac.new(TELEGRAM_LINK_SECRET.encode("utf-8"), payload, hashlib.sha256).digest()
    if not hmac.compare_digest(sig, mac[:10]):
        raise HTTPException(status_code=400, detail="Invalid token signature")

    if uid <= 0:
        raise HTTPException(status_code=400, detail="Invalid token payload")
    return int(uid)

# ---------------------------------------------------------
# Yardımcı: Telegram'a test mesajı (opsiyonel)
# ---------------------------------------------------------
async def send_telegram_message(chat_id: int, text: str) -> None:
    if not TELEGRAM_BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
        except Exception:
            pass

# =========================================================
# ===============  PROTECTED (Auth required)  =============
# =========================================================

@protected_router.get("/api/notifications/telegram/status")
async def telegram_status(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Bağlı mı? { connected, username?, chat_id? }
    """
    uid = int(user_id)

    # kullanıcı var mı (opsiyonel ama iyi bir kontrol)
    user = (await db.execute(select(User).where(User.id == uid))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    acc = (await db.execute(
        select(TelegramAccount).where(
            TelegramAccount.user_id == uid,
            TelegramAccount.is_active.is_(True)
        )
    )).scalar_one_or_none()

    if not acc:
        return {"connected": False}

    return {
        "connected": True,
        "username": getattr(acc, "username", None),
        "chat_id": getattr(acc, "chat_id", None),
    }

@protected_router.post("/api/notifications/telegram/link")
async def telegram_link(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Tek kullanımlık deep link üretir: t.me/<bot>?start=<token>
    Token DB’de tutulmaz; HMAC ile imzalı, 10 dk geçerli.
    """
    uid = int(user_id)

    if not TELEGRAM_BOT_USERNAME:
        raise HTTPException(status_code=500, detail="Bot username missing on server")

    token = make_link_token(uid, ttl_seconds=600)
    deep_link = f"https://t.me/{TELEGRAM_BOT_USERNAME}?start={token}"
    return {"deep_link": deep_link}

@protected_router.post("/api/notifications/telegram/unlink")
async def telegram_unlink(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Kullanıcı-telegram eşleşmesini pasifleştirir (soft unlink).
    """
    uid = int(user_id)
    acc = (await db.execute(
        select(TelegramAccount).where(TelegramAccount.user_id == uid)
    )).scalar_one_or_none()

    if not acc:
        # idempotent davran: success dönelim
        return {"message": "Already disconnected"}

    acc.is_active = False
    # istersen chat_id’yi de null’la:
    # acc.chat_id = None
    await db.commit()
    return {"message": "Disconnected"}

# =========================================================
# ==================  PUBLIC (Webhook)  ===================
# =========================================================

@public_router.post("/integrations/telegram/webhook")
async def telegram_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    print(request.headers)
    """
    Telegram webhook (genel). Güvenlik için:
    - Header: X-Telegram-Bot-Api-Secret-Token == TELEGRAM_WEBHOOK_SECRET
    İşler:
    - /start <token> → token doğrula → user_id ↔ chat_id upsert + is_active=True
    - my_chat_member (left/kicked) → is_active=False
    """
    # --- Güvenlik header’ı
    if TELEGRAM_WEBHOOK_SECRET:
        sec = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if not sec or not hmac.compare_digest(sec, TELEGRAM_WEBHOOK_SECRET):
            raise HTTPException(status_code=403, detail="Invalid webhook secret")

    try:
        update = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload")

    # ------------ 1) Kullanıcı botu engelledi / çıktı mı?
    if "my_chat_member" in update:
        mcm = update["my_chat_member"]
        chat_id = int(mcm["chat"]["id"])
        new_status = mcm.get("new_chat_member", {}).get("status")

        if new_status in ("kicked", "left"):
            # chat_id’ye göre pasifleştir
            row = (await db.execute(
                select(TelegramAccount).where(TelegramAccount.chat_id == chat_id)
            )).scalar_one_or_none()
            if row:
                row.is_active = False
                await db.commit()
        return {"ok": True}

    # ------------ 2) /start <token> akışı
    msg = update.get("message")
    if not msg:
        return {"ok": True}

    text = (msg.get("text") or "").strip()
    frm  = msg.get("from") or {}
    chat = msg.get("chat") or {}

    chat_id  = int(chat.get("id"))
    username = frm.get("username")
    first    = frm.get("first_name")

    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        if len(parts) == 1:
            # Token yok, kullanıcıya bilgi verelim
            await send_telegram_message(chat_id, "ℹ️ Hesabınızı bağlamak için lütfen Whaleer panelindeki <b>Telegram Bağla</b> butonunu kullanın.")
            return {"ok": True}

        token = parts[1].strip()
        try:
            uid = verify_link_token(token)  # <- HMAC doğrulama & exp kontrol
        except HTTPException:
            # token geçersiz → kullanıcıya bilgi de gönderebilirsin
            return {"ok": True}

        # Upsert (user_id’ye göre tek kayıt)
        acc = (await db.execute(
            select(TelegramAccount).where(TelegramAccount.user_id == uid)
        )).scalar_one_or_none()

        if acc:
            acc.chat_id  = chat_id
            acc.username = username
            acc.is_active = True
        else:
            acc = TelegramAccount(
                user_id   = uid,
                chat_id   = chat_id,
                username  = username,
                is_active = True,
            )
            db.add(acc)

        # Aynı chat_id başka kullanıcıya aitse pasifleştir (nadir ama güvenli)
        dup = (await db.execute(
            select(TelegramAccount).where(
                TelegramAccount.chat_id == chat_id,
                TelegramAccount.user_id != uid
            )
        )).scalars().all()
        for row in dup:
            row.is_active = False

        await db.commit()

        # küçük bir hoş geldin / test mesajı (opsiyonel)
        await send_telegram_message(chat_id, f"✅ Whaleer bildirimleri aktif.\nHesap ID: <b>{uid}</b>")
        return {"ok": True}

    # Diğer mesajlar (isteğe bağlı işleyebilirsin)
    return {"ok": True}
