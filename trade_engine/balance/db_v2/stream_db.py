import logging
from typing import Optional, List, Dict
from trade_engine.config import asyncpg_connection
from trade_engine.balance.definitions import MarketType, StreamStatus

logger = logging.getLogger("StreamDB")

class StreamDB:
    
    @staticmethod
    async def clear_genesis_targets(market_type: int):
        """
        🔥 GENESIS TEMİZLİĞİ
        Genesis başlamadan önce, o market tipindeki 'NEW' ve 'ACTIVE' kayıtları siler.
        Böylece temiz bir sayfa açılır.
        """
        query = """
        DELETE FROM public.stream_keys 
        WHERE market_type = $1 AND status IN ($2, $3)
        """
        async with asyncpg_connection() as conn:
            await conn.execute(query, market_type, StreamStatus.NEW, StreamStatus.ACTIVE)

    @staticmethod
    async def get_active_streams(market_type: Optional[int] = None) -> List[Dict]:
        """
        Bakım için aktif streamleri getirir.
        DİKKAT: Artık 'status' sütununu da çekiyoruz ki maintenance sırasında
        statüyü koruyabilelim.
        """
        base_query = """
        SELECT sk.user_id, sk.api_id, sk.market_type, sk.listen_key, sk.status, -- status eklendi
               ak.api_key, ak.api_secret, ak.exchange
        FROM stream_keys sk
        JOIN api_keys ak ON ak.id = sk.api_id
        WHERE sk.status IN ($1, $2)
        """
        params = [StreamStatus.NEW, StreamStatus.ACTIVE]
        
        if market_type:
            base_query += " AND sk.market_type = $3"
            params.append(market_type)
            
        async with asyncpg_connection() as conn:
            rows = await conn.fetch(base_query, *params)
            return [dict(r) for r in rows]

    # ... (upsert_stream_key, get_genesis_candidates vb. aynı kalıyor) ...
    # upsert_stream_key fonksiyonunu önceki koddan aynen kullanıyoruz.
    @staticmethod
    async def upsert_stream_key(user_id: int, api_id: int, market_type: int, listen_key: str, expires_at=None, status: int = 2):
        query = """
        INSERT INTO public.stream_keys 
            (user_id, api_id, market_type, listen_key, status, expires_at, updated_at)
        VALUES 
            ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (api_id, market_type) 
        DO UPDATE SET 
            listen_key = EXCLUDED.listen_key,
            status = EXCLUDED.status,
            expires_at = EXCLUDED.expires_at,
            updated_at = NOW()
        RETURNING id;
        """
        async with asyncpg_connection() as conn:
            await conn.fetchval(query, user_id, api_id, market_type, listen_key, status, expires_at)

            
    # Diğer fonksiyonlar (get_genesis_candidates, update_status, delete_stream vb.) 
    # önceki versiyonla aynı, buraya tekrar yazıp kalabalık etmiyorum.
    @staticmethod
    async def get_genesis_candidates(market_type: int) -> List[Dict]:
        where_clause = "WHERE is_active = true"
        if market_type == MarketType.FUTURES:
            where_clause += " AND is_futures_enabled = true"
        query = f"""
        SELECT id as api_id, user_id, api_key, api_secret, exchange, is_futures_enabled
        FROM public.api_keys {where_clause}
        """
        async with asyncpg_connection() as conn:
            rows = await conn.fetch(query)
            return [dict(r) for r in rows]
    
    @staticmethod
    async def update_status(api_id: int, market_type: int, status: int):
        query = "UPDATE public.stream_keys SET status = $1, updated_at = NOW() WHERE api_id = $2 AND market_type = $3"
        async with asyncpg_connection() as conn:
            await conn.execute(query, status, api_id, market_type)

    @staticmethod
    async def delete_stream(api_id: int, market_type: int):
        query = "DELETE FROM public.stream_keys WHERE api_id = $1 AND market_type = $2"
        async with asyncpg_connection() as conn:
            await conn.execute(query, api_id, market_type)