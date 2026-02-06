import logging
from typing import List, Dict
from decimal import Decimal, ROUND_HALF_UP # Hassas hesaplama için eklendi
from trade_engine.config import asyncpg_connection

logger = logging.getLogger("BalanceDB")

async def batch_upsert_balances(balance_updates: List[Dict]):
    """
    USER_API_BALANCES tablosuna bakiye verilerini Decimal kullanarak yazar.
    Gereksiz ondalık gürültüsünü temizleyerek tam 8 hane normalize eder.
    """
    if not balance_updates:
        return

    def get_account_type_label(m_type: int):
        return "spot" if m_type == 1 else "futures"

    data_to_sync = []
    # 8 haneli hassasiyet maskesi
    precision = Decimal('0.00000000')

    for b in balance_updates:
        try:
            # Sayıları string üzerinden Decimal'e çeviriyoruz (float gürültüsünü önler)
            # quantize(...) ile tam 8 hane olacak şekilde yuvarlıyoruz
            free = Decimal(str(b['free'])).quantize(precision, rounding=ROUND_HALF_UP)
            locked = Decimal(str(b['locked'])).quantize(precision, rounding=ROUND_HALF_UP)
            total_amount = free + locked # Toplam miktar (amount)

            # Verileri listeye ekliyoruz
            data_to_sync.append((
                int(b['user_id']),                       # user_id
                int(b['api_id']),                        # api_id
                str(b['asset']).upper(),                 # coin_symbol
                total_amount,                            # amount (Normalize edildi)
                get_account_type_label(b['market_type']),# account_type
                free,                                    # free_amount
                locked                                   # locked_amount
            ))
        except Exception as e:
            logger.warning(f"Bakiye dönüştürme hatası ({b.get('asset')}): {e}")
            continue

    # unique_api_coin kısıtlamasına göre upsert [cite: 103]
    query = """
    INSERT INTO public.user_api_balances 
        (user_id, api_id, coin_symbol, amount, account_type, free_amount, locked_amount, updated_at)
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (api_id, coin_symbol, account_type) 
    DO UPDATE SET 
        amount = EXCLUDED.amount,
        free_amount = EXCLUDED.free_amount,
        locked_amount = EXCLUDED.locked_amount,
        updated_at = NOW();
    """

    try:
        async with asyncpg_connection() as conn:
            async with conn.transaction():
                # Tek bir batch işleminde tüm normalize verileri gönderiyoruz
                await conn.executemany(query, data_to_sync)
        logger.info(f"✅ {len(data_to_sync)} bakiye kaydı 8 hane normalize edilerek işlendi.")
    except Exception as e:
        logger.error(f"❌ Batch Balance Upsert Hatası: {e}")