from typing import Optional
from asyncpg.pool import Pool

# 1. Aktif stream_key ve ilgili api_key’i getir
async def get_stream_key_and_api_key(
    pool: Pool,
    api_id: int,
    connection_type: str
) -> Optional[dict]:
    query = """
        SELECT sk.stream_key, ak.api_key
        FROM public.stream_keys sk
        JOIN public.api_keys ak ON ak.id = sk.api_id
        WHERE sk.api_id = $1
          AND sk.connection_type = $2
          AND sk.is_active = TRUE
        LIMIT 1;
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, api_id, connection_type)
        return dict(row) if row else None

# 2. Var olan stream_key'i güncelle
async def update_stream_key(
    pool: Pool,
    api_id: int,
    connection_type: str,
    new_stream_key: str
) -> None:
    query = """
        UPDATE public.stream_keys
        SET stream_key = $1,
            updated_at = NOW()
        WHERE api_id = $2
          AND connection_type = $3;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, new_stream_key, api_id, connection_type)

# 3. Expiration süresini yenile
async def refresh_stream_key_expiration(
    pool: Pool,
    api_id: int,
    connection_type: str
) -> None:
    query = """
        UPDATE public.stream_keys
        SET stream_key_expires_at = NOW() + INTERVAL '60 minutes',
            updated_at = NOW()
        WHERE api_id = $1
          AND connection_type = $2;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, api_id, connection_type)

# 4. Upsert işlemi: ekle veya güncelle (UNIQUE constraint olmalı: api_id + connection_type)
async def upsert_stream_key(
    pool: Pool,
    user_id: int,
    api_id: int,
    connection_type: str,
    stream_key: str,
    is_active: bool = True
) -> None:
    query = """
        INSERT INTO public.stream_keys (
            user_id,
            api_id,
            connection_type,
            stream_key,
            stream_key_expires_at,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            $1, $2, $3, $4,
            NOW() + INTERVAL '60 minutes',
            $5, NOW(), NOW()
        )
        ON CONFLICT (api_id, connection_type)
        DO UPDATE SET
            stream_key = EXCLUDED.stream_key,
            stream_key_expires_at = EXCLUDED.stream_key_expires_at,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
    """
    async with pool.acquire() as conn:
        await conn.execute(
            query,
            user_id,
            api_id,
            connection_type,
            stream_key,
            is_active
        )
