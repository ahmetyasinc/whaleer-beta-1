# app/services/bot_service.py
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from app.models.profile.bots.bots import Bots  # Senin Bot modelin

async def replicate_bot_for_user(
    db: AsyncSession,
    original_bot_id: int,
    new_owner_id: int,
    purchase_type: str, # "PURCHASE" | "RENT"
    rent_days: int = 0
):
    """
    Orijinal botun bir kopyasını oluşturur (Ayarlarıyla birlikte)
    ve yeni kullanıcıya atar.
    """
    # 1. Orijinal Botu Bul
    q = select(Bots).where(Bots.id == original_bot_id)
    res = await db.execute(q)
    original_bot = res.scalar_one_or_none()
    
    if not original_bot:
        raise Exception("Original bot not found")

    # 2. Kiralama Bitiş Tarihi Hesapla
    rent_expiry = None
    if purchase_type == "RENT" and rent_days > 0:
        rent_expiry = datetime.now(timezone.utc) + timedelta(days=rent_days)

    # 3. Yeni Bot Kaydı Oluştur (Kopyala)
    # Modelindeki alanlara göre burayı güncellemelisin
    new_bot_data = {
        "user_id": new_owner_id,
        "name": f"{original_bot.name} (Copy)",
        "description": original_bot.description,
        "strategy": original_bot.strategy,
        "settings": original_bot.settings, # JSONB alanını kopyala
        "status": "active", # Hemen aktif et
        "original_bot_id": original_bot.id, # Referans
        "ownership_type": purchase_type, # PURCHASE veya RENT
        "rent_expires_at": rent_expiry,
        "created_at": datetime.now(timezone.utc),
        # Diğer gerekli alanlar...
    }

    # Modelinde 'insert' yerine add kullanabilirsin
    new_bot = Bots(**new_bot_data)
    db.add(new_bot)
    await db.flush() # ID almak için flush
    
    return new_bot.id