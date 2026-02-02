import logging
from typing import List, Dict
from backend.trade_engine.config import asyncpg_connection

logger = logging.getLogger("BalanceDB")

async def batch_upsert_balances(balance_updates: List[Dict]):
    """
    Yüksek hacimli bakiye güncellemelerini tek bir transaction ile DB'ye yazar.
    'balance_updates' listesi şu formatta olmalı:
    {
        'user_id': int, 'api_id': int, 'market_type': int, 
        'asset': str, 'free': float, 'locked': float
    }
    """
    if not balance_updates:
        return

    # 1. Binance'den gelen 'f' (free) ve 'l' (locked) string olabilir, 
    # asyncpg'nin numeric (decimal) ile düzgün çalışması için tuple'a çeviriyoruz.
    data_to_sync = [
        (
            b['user_id'], 
            b['api_id'], 
            b.get('exchange_id', 1), # Default: Binance (1)
            b['market_type'], 
            b['asset'].upper(), 
            str(b['free']),   # NUMERIC(32,16) için string olarak göndermek güvenlidir
            str(b['locked'])
        ) for b in balance_updates
    ]

    # 2. ON CONFLICT (Upsert) Sorgusu
    # unique_balance_entry kısıtlamasına (api_id, asset_name, market_type) göre kontrol yapar.
    query = """
    INSERT INTO public.account_balances 
        (user_id, api_id, exchange_id, market_type, asset_name, free_amount, locked_amount, updated_at)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (api_id, asset_name, market_type) 
    DO UPDATE SET 
        free_amount = EXCLUDED.free_amount,
        locked_amount = EXCLUDED.locked_amount,
        updated_at = NOW();
    """

    try:
        async with asyncpg_connection() as conn:
            async with conn.transaction():
                # executemany: Saniyede binlerce satırı tek bir pakette DB'ye basar.
                await conn.executemany(query, data_to_sync)
                
                # İsteğe bağlı: Audit (Tarihçe) için buraya ekleme yapılabilir.
                # Ancak çok yüksek hacimde tarihçe tablosu çok hızlı şişer, 
                # sadece kritik değişimlerde tetiklemek daha iyidir.
                
        # logger.debug(f"💾 {len(balance_updates)} bakiye kaydı güncellendi.")
    except Exception as e:
        logger.error(f"❌ Batch Balance Upsert Hatası: {e}")