from sqlalchemy import select
from app.database import get_db
from app.routes.profile.telegram.telegram_bot import send_telegram_message
from app.models.profile.telegram.telegram_account import TelegramAccount

# Tek seferlik session açıp kapatan yardımcı
async def notify_user_by_telegram(user_id: int, text: str) -> bool:
    """
    user_id'e bağlı aktif Telegram hesabı varsa mesaj yollar.
    Dönüş: True = yollandı, False = kullanıcı bağlı değil.
    """
    print(f"notify_user_by_telegram: user_id={user_id}")
    async for db in get_db():  # get_db bir generator -> async for ile bir session açılır
        acc = (await db.execute(
            select(TelegramAccount).where(
                TelegramAccount.user_id == int(user_id),
                TelegramAccount.is_active.is_(True),
                TelegramAccount.chat_id.isnot(None)
            )
        )).scalar_one_or_none()

        if not acc:
            return False  # kullanıcı telegram bağlamamış ya da pasif

        await send_telegram_message(int(acc.chat_id), text)
        return True
