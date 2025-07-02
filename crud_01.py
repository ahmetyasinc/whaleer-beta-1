from sqlalchemy import text, select
from db_01 import async_session  # engine & session yapılandırmasını buradan alıyoruz
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

# Türkiye saat dilimi
TURKEY_TZ = timezone(timedelta(hours=3))

async def get_db():
    """Database session generator"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_api_key_raw(user_id: int, api_name: str):
    async with async_session() as session:
        query = text("""
            SELECT * FROM api_keys 
            WHERE user_id = :user_id AND api_name = :api_name
        """)
        result = await session.execute(query, {"user_id": user_id, "api_name": api_name})
        row = result.mappings().first()
        return row  # None olabilir, dict değil; Row nesnesi döner

async def get_user_listenkeys(session: AsyncSession):
    """Listenkey'i olan tüm kullanıcıları getir"""
    query = text("""
        SELECT user_id as id, api_key, listenkey, listenkey_expires_at
        FROM api_keys 
        WHERE listenkey IS NOT NULL AND listenkey != ''
    """)
    result = await session.execute(query)
    return result.mappings().all()

async def update_listenkey(session: AsyncSession, user_id: int):
    """Kullanıcının listenkey'inin expire süresini güncelle"""
    # Türkiye saati ile
    expires_at = datetime.now(TURKEY_TZ) + timedelta(minutes=59)
    
    print(f"🔄 Kullanıcı {user_id} için yeni expire zamanı: {expires_at}")
    
    query = text("""
        UPDATE api_keys
        SET listenkey_expires_at = :expires_at
        WHERE user_id = :user_id AND listenkey IS NOT NULL
    """)
    
    result = await session.execute(query, {
        "expires_at": expires_at,
        "user_id": user_id
    })
    
    await session.commit()
    affected_rows = result.rowcount
    print(f"✅ Kullanıcı {user_id}: {affected_rows} satır güncellendi")
    return affected_rows > 0  # Güncellenen satır sayısı > 0 ise True

async def update_listenkey_with_key(api_key: str, user_id: int, listen_key: str, session: AsyncSession):
    """Yeni listenkey ile güncelleme (eski fonksiyon)"""
    # Türkiye saati ile
    expires_at = datetime.now(TURKEY_TZ) + timedelta(minutes=59)

    result = await session.execute(
        text("""
            UPDATE api_keys
            SET listenkey = :listen_key,
                listenkey_expires_at = :expires_at
            WHERE api_key = :api_key AND user_id = :user_id
        """),
        {
            "listen_key": listen_key,
            "expires_at": expires_at,
            "api_key": api_key,
            "user_id": user_id
        }
    )
    await session.commit()
    
    affected_rows = result.rowcount
    print(f"✅ update_listenkey_with_key: Kullanıcı {user_id}, {affected_rows} satır güncellendi")
    return affected_rows > 0

async def get_all_api_keys(session: AsyncSession):
    result = await session.execute(text("""
        SELECT id as api_id, user_id, api_name, api_key, listenkey
        FROM api_keys
    """))
    return result.mappings().all()

