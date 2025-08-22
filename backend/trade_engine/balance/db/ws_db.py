from typing import Optional, List
from asyncpg.pool import Pool


async def update_ws_name(pool: Pool, ws_id: int, name: str) -> None:
    query = """
        UPDATE public.websocket_connections
        SET name = $2
        WHERE id = $1;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, ws_id, name)

        
# Yeni websocket kaydı ekle
async def insert_ws(pool: Pool, name: str, exchange: str, url: str) -> int:
    query = """
        INSERT INTO public.websocket_connections (name, exchange, url, is_connected, created_at, reactivated_at, listenkey_count)
        VALUES ($1, $2, $3, TRUE, NOW(), NOW(), 0)
        RETURNING id;
    """
    async with pool.acquire() as conn:
        return await conn.fetchval(query, name, exchange, url)
# listenKey count güncelle
async def update_listenkey_count(pool: Pool, ws_id: int, count: int) -> None:
    query = """
        UPDATE public.websocket_connections
        SET listenkey_count = $2, reactivated_at = NOW()
        WHERE id = $1;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, ws_id, count)

# Bağlantıyı aktif/pasif işaretle
async def mark_ws_status(pool: Pool, ws_id: int, status: bool) -> None:
    query = """
        UPDATE public.websocket_connections
        SET is_connected = $2, reactivated_at = NOW()
        WHERE id = $1;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, ws_id, status)

# Aktif websocketleri getir
async def get_active_ws(pool: Pool) -> List[dict]:
    query = """
        SELECT * FROM public.websocket_connections
        WHERE is_connected = TRUE;
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query)
        return [dict(r) for r in rows]

# ws_id'ye bağlı stream_keys getir
async def get_streamkeys_by_ws(pool: Pool, ws_id: int) -> List[dict]:
    query = """
        SELECT id, api_id, user_id, connection_type, stream_key
        FROM public.stream_keys
        WHERE ws_id = $1;
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, ws_id)
        return [dict(r) for r in rows]