# ws_db.py
# DEĞİŞİKLİK: Fonksiyonlar artık 'pool' parametresi almıyor ve
# config.asyncpg_connection kullanarak kendi bağlantılarını yönetiyor.

from typing import Optional, List
from trade_engine.config import asyncpg_connection

async def delete_ws(ws_id: int) -> None:
    """Verilen ws_id'yi websocket_connections tablosundan sil."""
    query = "DELETE FROM public.websocket_connections WHERE id = $1;"
    async with asyncpg_connection() as conn:
        await conn.execute(query, ws_id)

async def update_ws_name(ws_id: int, name: str) -> None:
    query = """
        UPDATE public.websocket_connections
        SET name = $2
        WHERE id = $1;
    """
    async with asyncpg_connection() as conn:
        await conn.execute(query, ws_id, name)

async def insert_ws(name: str, exchange: str, url: str) -> int:
    query = """
        INSERT INTO public.websocket_connections (name, exchange, url, is_connected, created_at, reactivated_at, listenkey_count)
        VALUES ($1, $2, $3, TRUE, NOW(), NOW(), 0)
        RETURNING id;
    """
    async with asyncpg_connection() as conn:
        return await conn.fetchval(query, name, exchange, url)

async def update_listenkey_count(ws_id: int, count: int) -> None:
    query = """
        UPDATE public.websocket_connections
        SET listenkey_count = $2, reactivated_at = NOW()
        WHERE id = $1;
    """
    async with asyncpg_connection() as conn:
        await conn.execute(query, ws_id, count)

async def mark_ws_status(ws_id: int, status: bool) -> None:
    query = """
        UPDATE public.websocket_connections
        SET is_connected = $2, reactivated_at = NOW()
        WHERE id = $1;
    """
    async with asyncpg_connection() as conn:
        await conn.execute(query, ws_id, status)

async def get_active_ws() -> List[dict]:
    query = """
        SELECT * FROM public.websocket_connections
        WHERE is_connected = TRUE;
    """
    async with asyncpg_connection() as conn:
        rows = await conn.fetch(query)
        return [dict(r) for r in rows]

async def get_streamkeys_by_ws(ws_id: int) -> List[dict]:
    """
    Verilen bir ws_id'ye bağlı olan SADECE 'active' veya 'new' durumundaki
    stream_key'leri getirir.
    """
    query = """
        SELECT id, api_id, user_id, connection_type, stream_key
        FROM public.stream_keys
        WHERE ws_id = $1 AND status IN ('active', 'new');
    """
    async with asyncpg_connection() as conn:
        rows = await conn.fetch(query, ws_id)
        return [dict(r) for r in rows]

async def update_ws_url_and_count(ws_id: int, url: str, count: int) -> None:
    query = """
        UPDATE public.websocket_connections
        SET url = $2, listenkey_count = $3, reactivated_at = NOW()
        WHERE id = $1;
    """
    async with asyncpg_connection() as conn:
        await conn.execute(query, ws_id, url, count)

async def set_stream_key_closed_and_null_ws_id(stream_key: str) -> None:
    """
    Verilen bir stream_key'in durumunu 'closed' olarak günceller ve ws_id'sini NULL yapar.
    """
    query = """
        UPDATE public.stream_keys
        SET status = 'closed', ws_id = NULL
        WHERE stream_key = $1;
    """
    async with asyncpg_connection() as conn:
        await conn.execute(query, stream_key)