# backend/trade_engine/log/telegram/telegram_service.py
from __future__ import annotations

import asyncio
from typing import Optional, Dict, Any

from psycopg2.extras import RealDictCursor
from backend.trade_engine.config import psycopg2_connection
from backend.trade_engine.log.telegram.send_mesage import send_telegram_message  # mevcut dosya adı korunuyor

# -------------------------------
# İç yardımcılar (SYNC, to_thread ile çağrılır)
# -------------------------------

def _sync_resolve_user_id_by_bot(bot_id: int) -> Optional[int]:
    """
    SYNC: Bot ID'den user_id döndürür.
    'deleted' kolonu varsa false/NULL olanları aktif sayar.
    """
    with psycopg2_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT user_id
                FROM public.bots
                WHERE id = %s
                  AND COALESCE(deleted, FALSE) = FALSE
                """,
                (int(bot_id),),
            )
            row = cur.fetchone()
            return row["user_id"] if row else None


def _sync_find_active_telegram_account(user_id: int) -> Optional[Dict[str, Any]]:
    """
    SYNC: Kullanıcının aktif telegram hesabını döndürür (chat_id ile).
    Birden fazla varsa updated_at DESC ile en güncel olanı seçer.
    (updated_at kolonu yoksa ORDER BY yine de zarar vermez; yoksa kaldırabilirsiniz.)
    """
    with psycopg2_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, chat_id
                FROM public.telegram_accounts
                WHERE user_id = %s
                  AND is_active = TRUE
                  AND chat_id IS NOT NULL
                ORDER BY updated_at DESC NULLS LAST
                LIMIT 1
                """,
                (int(user_id),),
            )
            row = cur.fetchone()
            return dict(row) if row else None

# -------------------------------
# Async sarmalayıcılar (event loop'u bloklamaz)
# -------------------------------

async def _resolve_user_id_by_bot(bot_id: int) -> Optional[int]:
    return await asyncio.to_thread(_sync_resolve_user_id_by_bot, bot_id)

async def _find_active_telegram_account(user_id: int) -> Optional[Dict[str, Any]]:
    return await asyncio.to_thread(_sync_find_active_telegram_account, user_id)

# -------------------------------
# Ana API
# -------------------------------

async def notify_user_by_telegram(
    text: str,
    user_id: Optional[int] = None,
    bot_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Kullanıcıya Telegram mesajı yollar.
      - user_id verilirse doğrudan
      - bot_id verilirse önce bot→user çözülür
      - her ikisi verilirse tutarlılık kontrolü yapılır

    Dönüş:
      { "ok": bool, "reason": str, "user_id": int|None, "bot_id": int|None }
    """
    if not text or not text.strip():
        return {"ok": False, "reason": "Mesaj metni boş olamaz.", "user_id": user_id, "bot_id": bot_id}

    if user_id is None and bot_id is None:
        return {"ok": False, "reason": "user_id veya bot_id belirtilmeli.", "user_id": None, "bot_id": None}

    # 1) Gerekirse bot_id -> user_id çöz
    resolved_user_id: Optional[int] = user_id
    if resolved_user_id is None and bot_id is not None:
        resolved_user_id = await _resolve_user_id_by_bot(int(bot_id))
        if resolved_user_id is None:
            return {
                "ok": False,
                "reason": f"Bot bulunamadı veya user_id çözülemedi. bot_id={bot_id}",
                "user_id": None,
                "bot_id": bot_id,
            }

    # 2) Hem user_id hem bot_id verildiyse tutarlılık kontrolü
    if user_id is not None and bot_id is not None:
        bot_user_id = await _resolve_user_id_by_bot(int(bot_id))
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
                "reason": (
                    f"Tutarsız parametreler: bot_id={bot_id} user_id={user_id} ile eşleşmiyor "
                    f"(bot user_id={bot_user_id})."
                ),
                "user_id": user_id,
                "bot_id": bot_id,
            }

    # 3) Aktif Telegram hesabını bul
    acc = await _find_active_telegram_account(int(resolved_user_id))
    if not acc or not acc.get("chat_id"):
        return {
            "ok": False,
            "reason": "Kullanıcının aktif Telegram hesabı bağlı değil veya chat_id yok.",
            "user_id": resolved_user_id,
            "bot_id": bot_id,
        }

    # 4) Mesajı gönder
    try:
        await send_telegram_message(int(acc["chat_id"]), text)
        return {
            "ok": True,
            "reason": "Mesaj gönderildi.",
            "user_id": resolved_user_id,
            "bot_id": bot_id,
        }
    except Exception as e:
        return {
            "ok": False,
            "reason": f"Mesaj gönderimi başarısız: {e}",
            "user_id": resolved_user_id,
            "bot_id": bot_id,
        }

# -------------------------------
# Geriye dönük kısa yollar (opsiyonel)
# -------------------------------

async def notify_user_by_telegram_with_user(user_id: int, text: str) -> bool:
    result = await notify_user_by_telegram(text=text, user_id=user_id)
    return bool(result.get("ok", False))

async def notify_user_by_telegram_with_bot(bot_id: int, text: str) -> bool:
    result = await notify_user_by_telegram(text=text, bot_id=bot_id)
    return bool(result.get("ok", False))
