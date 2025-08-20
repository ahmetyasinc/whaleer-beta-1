from typing import Optional, List
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
            is_active
        )
        VALUES (
            $1, $2, $3, $4,
            NOW() + INTERVAL '60 minutes',
            $5
        )
        ON CONFLICT (api_id, connection_type)
        DO UPDATE SET
            stream_key = EXCLUDED.stream_key,
            stream_key_expires_at = EXCLUDED.stream_key_expires_at,
            is_active = EXCLUDED.is_active;
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


# 3. Expiration süresini yenile (tekli)
async def refresh_stream_key_expiration(
    pool: Pool,
    api_id: int,
    connection_type: str
) -> None:
    query = """
        UPDATE public.stream_keys
        SET stream_key_expires_at = NOW() + INTERVAL '60 minutes'
        WHERE api_id = $1
          AND connection_type = $2;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, api_id, connection_type)




# 5. Toplu expiration yenileme
# 5. Toplu expiration yenileme
async def bulk_refresh_stream_keys(
    pool: Pool,
    api_ids: List[int],
    connection_type: str
) -> None:
    query = """
        UPDATE public.stream_keys
        SET stream_key_expires_at = NOW() + INTERVAL '60 minutes'
        WHERE connection_type = $1
          AND api_id = ANY($2::int[]);
    """
    async with pool.acquire() as conn:
        await conn.execute(query, connection_type, api_ids)


# 6. Toplu upsert (birden fazla listenKey’i tek seferde ekle/güncelle)
async def bulk_upsert_stream_keys(
    pool: Pool,
    records: List[dict]
) -> None:
    """
    records örneği:
    [
      {"user_id": 1, "api_id": 10, "connection_type": "futures", "stream_key": "abc", "is_active": True},
      {"user_id": 2, "api_id": 11, "connection_type": "futures", "stream_key": "def", "is_active": True}
    ]
    """
    if not records:
        return

    query = f"""
        INSERT INTO public.stream_keys (
            user_id,
            api_id,
            connection_type,
            stream_key,
            stream_key_expires_at,
            is_active
        )
        VALUES
            {",".join(
                f"({r['user_id']}, {r['api_id']}, '{r['connection_type']}', '{r['stream_key']}', NOW() + INTERVAL '60 minutes', {str(r.get('is_active', True)).upper()})"
                for r in records
            )}
        ON CONFLICT (api_id, connection_type)
        DO UPDATE SET
            stream_key = EXCLUDED.stream_key,
            stream_key_expires_at = EXCLUDED.stream_key_expires_at,
            is_active = EXCLUDED.is_active;
    """

    async with pool.acquire() as conn:
        await conn.execute(query)
