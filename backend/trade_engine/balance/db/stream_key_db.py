# stream_key_db.py
import logging
import datetime
from typing import Optional, List
from backend.trade_engine.config import asyncpg_connection

# --- spot_ws_service.py'dan taşınan ve güncellenen fonksiyonlar ---

async def get_keys_for_spot_subscription() -> List[dict]:
    """'new' veya 'active' durumundaki spot anahtarlarının api_id'lerini getirir."""
    async with asyncpg_connection() as conn:
        rows = await conn.fetch("SELECT api_id FROM public.stream_keys WHERE spot_status IN ('new', 'active')")
        return [dict(row) for row in rows]

async def batch_update_spot_keys(updates: dict):
    """Spot anahtarlarının sub_id ve durumunu toplu olarak günceller."""
    if not updates: return
    update_data = []
    for api_id, values in updates.items():
        update_data.append((api_id, values.get('sub_id'), values.get('spot_status')))
    
    if not update_data: return
    
    async with asyncpg_connection() as conn:
        async with conn.transaction():
            await conn.executemany(
                "UPDATE public.stream_keys SET sub_id = $2, spot_status = $3 WHERE api_id = $1", 
                update_data
            )

# --- Var olan diğer fonksiyonlar (config'e uyarlanmış halleri) ---

async def update_key_sub_id_and_status(api_id: int, sub_id: int, new_status: str):
    query = "UPDATE public.stream_keys SET sub_id = $2, status = $3 WHERE api_id = $1;"
    async with asyncpg_connection() as conn:
        await conn.execute(query, api_id, sub_id, new_status)

async def update_status_by_api_id(api_id: int, new_status: str):
    query = "UPDATE public.stream_keys SET status = $2 WHERE api_id = $1;"
    async with asyncpg_connection() as conn:
        await conn.execute(query, api_id, new_status)

async def set_key_as_closed(api_id: int, connection_type: Optional[str] = None):
    if connection_type:
        query = "UPDATE public.stream_keys SET status = 'closed', sub_id = NULL WHERE api_id = $1 AND connection_type = $2;"
        args = (api_id, connection_type)
    else:
        query = "UPDATE public.stream_keys SET status = 'closed', sub_id = NULL WHERE api_id = $1;"
        args = (api_id,)
    async with asyncpg_connection() as conn:
        await conn.execute(query, *args)
        
async def get_all_keys() -> List[dict]:
    async with asyncpg_connection() as conn:
        query = "SELECT api_id, user_id, status FROM stream_keys"
        records = await conn.fetch(query)
        return [dict(record) for record in records]
    
async def get_api_credentials(api_id: int) -> Optional[dict]:
    async with asyncpg_connection() as conn:
        query = """
            SELECT ak.api_key, ak.api_secret, sk.user_id
            FROM public.stream_keys sk JOIN public.api_keys ak ON sk.api_id = ak.id
            WHERE sk.api_id = $1 LIMIT 1;
        """
        record = await conn.fetchrow(query, api_id)
        return dict(record) if record else None
    
async def attach_listenkeys_to_ws(ws_id: int, listenkeys: list):
    if not listenkeys: return
    query = "UPDATE public.stream_keys SET ws_id = $1, status = 'active' WHERE stream_key = ANY($2::text[]);"
    async with asyncpg_connection() as conn:
        await conn.execute(query, ws_id, listenkeys)
    
async def get_active_and_new_listenkeys(connection_type: str = "futures") -> List[str]:
    query = "SELECT stream_key FROM public.stream_keys WHERE connection_type = $1 AND status IN ('active', 'new');"
    async with asyncpg_connection() as conn:
        rows = await conn.fetch(query, connection_type)
    return [r["stream_key"] for r in rows]

async def upsert_stream_key(user_id: int, api_id: int, connection_type: str, stream_key: str, status: str = "new") -> None:
    query = """
        INSERT INTO public.stream_keys (user_id, api_id, connection_type, stream_key, stream_key_expires_at, status)
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '60 minutes', $5)
        ON CONFLICT (api_id, connection_type) DO UPDATE SET
            stream_key = EXCLUDED.stream_key,
            stream_key_expires_at = EXCLUDED.stream_key_expires_at,
            status = EXCLUDED.status;
    """
    async with asyncpg_connection() as conn:
        await conn.execute(query, user_id, api_id, connection_type, stream_key, status)

async def refresh_stream_key_expiration(stream_key: str):
    """Belirtilen stream_key'in son kullanma tarihini 60 dakika uzatır."""
    query = "UPDATE public.stream_keys SET stream_key_expires_at = NOW() + INTERVAL '60 minutes' WHERE stream_key = $1;"
    async with asyncpg_connection() as conn:
        await conn.execute(query, stream_key)

async def bulk_refresh_stream_keys(stream_keys: List[str]):
    """Verilen stream_key listesinin son kullanma tarihlerini toplu olarak 60 dakika uzatır."""
    if not stream_keys:
        return
    query = "UPDATE public.stream_keys SET stream_key_expires_at = NOW() + INTERVAL '60 minutes' WHERE stream_key = ANY($1::text[]);"
    async with asyncpg_connection() as conn:
        await conn.execute(query, stream_keys)

async def bulk_upsert_stream_keys(keys_data: List[dict]):
    """Toplu stream_key ekleme/güncelleme işlemi yapar."""
    if not keys_data:
        return
    
    records_to_upsert = [
        (
            d['user_id'], 
            d['api_id'], 
            d['connection_type'], 
            d['stream_key'],
            d.get('status', 'new')
        ) for d in keys_data
    ]
    
    query = """
        INSERT INTO public.stream_keys (user_id, api_id, connection_type, stream_key, stream_key_expires_at, status)
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '60 minutes', $5)
        ON CONFLICT (api_id, connection_type) DO UPDATE SET
            stream_key = EXCLUDED.stream_key,
            stream_key_expires_at = EXCLUDED.stream_key_expires_at,
            status = EXCLUDED.status;
    """
    async with asyncpg_connection() as conn:
        await conn.executemany(query, records_to_upsert)

async def update_streamkey_status(api_id: int, connection_type: str, new_status: str):
    """Belirli bir api_id ve connection_type için durumu günceller."""
    query = "UPDATE public.stream_keys SET status = $3 WHERE api_id = $1 AND connection_type = $2;"
    async with asyncpg_connection() as conn:
        await conn.execute(query, api_id, connection_type, new_status)