from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.routes.profile.telegram.telegram_bot import send_telegram_message
from app.models.profile.telegram.telegram_account import TelegramAccount
from app.models.profile.bots.bots import Bots

async def _resolve_user_id_by_bot(db: AsyncSession, bot_id: int) -> Optional[int]:
    """
    Bot ID'den user_id üretir. Silinmiş botları dışlar (varsa).
    """
    q = (
        select(Bots.user_id)
        .where(Bots.id == int(bot_id))
    )
    # Eğer "deleted" kolonunu zorunlu dışlamak istiyorsanız satıra ekleyin:
    # .where(Bots.deleted.is_(False))
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def _find_active_telegram_account(db: AsyncSession, user_id: int) -> Optional[TelegramAccount]:
    """
    Kullanıcının aktif ve chat_id'si olan Telegram hesabını döndürür.
    """
    q = (
        select(TelegramAccount)
        .where(
            TelegramAccount.user_id == int(user_id),
            TelegramAccount.is_active.is_(True),
            TelegramAccount.chat_id.isnot(None),
        )
        # Birden fazla hesap varsa en son oluşturulana/updated olana göre sıralamak isteyebilirsiniz:
        # .order_by(TelegramAccount.updated_at.desc())
    )
    res = await db.execute(q)
    return res.scalar_one_or_none()

async def notify_user_by_telegram(
    text: str,
    user_id: int | None = None,
    bot_id: int | None = None,
    db: AsyncSession | None = None,
) -> dict:
    """
    Kullanıcıya Telegram mesajı yollar.
    - user_id verilirse direkt o kullanıcı hedef alınır.
    - bot_id verilirse, önce bot üzerinden user_id çözülür.
    - Hem user_id hem bot_id verilirse, bot->user çözümü ile uyuşmazlık varsa hata döner.

    Dönüş:
      {
        "ok": True/False,
        "reason": "...",
        "user_id": int|None,
        "bot_id": int|None
      }
    """
    if not text or not text.strip():
        return {"ok": False, "reason": "Mesaj metni boş olamaz.", "user_id": user_id, "bot_id": bot_id}

    if user_id is None and bot_id is None:
        return {"ok": False, "reason": "user_id veya bot_id belirtilmeli.", "user_id": None, "bot_id": None}

    # Dışarıdan session gelmediyse tek seferlik aç
    if db is None:
        async for _db in get_db():
            return await notify_user_by_telegram(text=text, user_id=user_id, bot_id=bot_id, db=_db)

    # 1) Gerekirse bot_id -> user_id çöz
    resolved_user_id: Optional[int] = user_id
    if resolved_user_id is None and bot_id is not None:
        resolved_user_id = await _resolve_user_id_by_bot(db, int(bot_id))
        if resolved_user_id is None:
            return {
                "ok": False,
                "reason": f"Bot bulunamadı veya user_id çözülemedi. bot_id={bot_id}",
                "user_id": None,
                "bot_id": bot_id,
            }

    # 2) Hem user_id hem bot_id verildi ise tutarlılık kontrolü
    if user_id is not None and bot_id is not None:
        bot_user_id = await _resolve_user_id_by_bot(db, int(bot_id))
        if bot_user_id is None:
            return {
                "ok": False,
                "reason": f"Bot bulunamadı. bot_id={bot_id}",
                "user_id": user_id,
                "bot_id": bot_id,
            }
        if int(bot_user_id) != int(user_id):
            return {
                "ok": False,
                "reason": f"Tutarsız parametreler: bot_id={bot_id} user_id={user_id} ile eşleşmiyor (bot user_id={bot_user_id}).",
                "user_id": user_id,
                "bot_id": bot_id,
            }

    # 3) Aktif Telegram hesabını bul
    acc = await _find_active_telegram_account(db, int(resolved_user_id))
    if not acc:
        return {
            "ok": False,
            "reason": "Kullanıcının aktif Telegram hesabı bağlı değil veya chat_id yok.",
            "user_id": resolved_user_id,
            "bot_id": bot_id,
        }

    # 4) Mesajı gönder
    try:
        await send_telegram_message(int(acc.chat_id), text)
        return {
            "ok": True,
            "reason": "Mesaj gönderildi.",
            "user_id": resolved_user_id,
            "bot_id": bot_id,
        }
    except Exception as e:
        # İsterseniz burada loglayın
        return {
            "ok": False,
            "reason": f"Mesaj gönderimi başarısız: {e}",
            "user_id": resolved_user_id,
            "bot_id": bot_id,
        }

# --- Geriye dönük uyumluluk için küçük yardımcılar (opsiyonel) ---

async def notify_user_by_telegram_with_user(user_id: int, text: str) -> bool:
    """
    Eski kullanım: sadece user_id ile.
    True/False döndürür (ok alanına göre).
    """
    result = await notify_user_by_telegram(text=text, user_id=user_id)
    return bool(result.get("ok", False))

async def notify_user_by_telegram_with_bot(bot_id: int, text: str) -> bool:
    """
    Yeni kısa yol: sadece bot_id ile.
    True/False döndürür (ok alanına göre).
    """
    result = await notify_user_by_telegram(text=text, bot_id=bot_id)
    return bool(result.get("ok", False))
