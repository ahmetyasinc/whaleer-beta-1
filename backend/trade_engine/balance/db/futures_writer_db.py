import logging
import datetime
from decimal import Decimal

async def batch_upsert_futures_balances(pool, balance_data: list):
    """
    Gelen FUTURES bakiye listesini (ACCOUNT_UPDATE event) user_api_balances tablosuna
    toplu olarak ekler/günceller (UPSERT). Sadece cüzdan varlıklarını işler.
    """
    # Bu fonksiyonda bir değişiklik yok.
    if not balance_data:
        return

    records_to_upsert = []
    for data in balance_data:
        for asset_data in data.get('assets', []):
            wallet_balance = Decimal(asset_data.get('wb', '0'))
            records_to_upsert.append(
                (
                    data['user_id'],
                    data['api_id'],
                    asset_data['a'],
                    wallet_balance,
                    wallet_balance,
                    Decimal('0'),
                    'futures',
                    datetime.datetime.now(datetime.timezone.utc)
                )
            )

    if not records_to_upsert: return

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.executemany("""
                    INSERT INTO public.user_api_balances 
                    (user_id, api_id, coin_symbol, amount, free_amount, locked_amount, account_type, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (api_id, coin_symbol, account_type) 
                    DO UPDATE SET
                        amount = EXCLUDED.amount,
                        free_amount = EXCLUDED.free_amount,
                        updated_at = EXCLUDED.updated_at,
                        user_id = EXCLUDED.user_id;
                """, records_to_upsert)
        logging.info(f"✅ [DB] {len(records_to_upsert)} adet FUTURES BAKIYE başarıyla yazıldı.")
    except Exception as e:
        logging.error(f"❌ [DB] Futures bakiye yazma hatası: {e}", exc_info=True)


async def batch_upsert_futures_orders(pool, order_data: list):
    """
    Gelen FUTURES emir listesini (ORDER_TRADE_UPDATE event) bot_trades tablosunda GÜNCeller.
    Eğer emir sistemde mevcut değilse, hiçbir işlem yapmaz (atlar).
    updated_at kolonunu KULLANMAZ.
    """
    if not order_data:
        return

    updated_count = 0
    skipped_count = 0
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                for data in order_data:
                    exists = await conn.fetchval(
                        "SELECT 1 FROM public.bot_trades WHERE order_id=$1",
                        str(data['order_id'])
                    )

                    if exists:
                        # DEĞİŞİKLİK: 'updated_at' sorgudan ve parametrelerden çıkarıldı.
                        await conn.execute("""
                            UPDATE public.bot_trades
                            SET 
                                status = $1,
                                fee = bot_trades.fee + $2,
                                price = $3,
                                amount_state = $4
                            WHERE order_id = $5
                        """,
                        data['status'],
                        data.get('commission', Decimal('0')),
                        data['price'],
                        data.get('executed_quantity'),
                        str(data['order_id'])
                        )
                        updated_count += 1
                    else:
                        skipped_count += 1
        
        if updated_count > 0:
            logging.info(f"✅ [DB] {updated_count} adet mevcut FUTURES EMRİ başarıyla güncellendi.")
        if skipped_count > 0:
            logging.info(f"ℹ️ [DB] {skipped_count} adet sistem dışı futures emri atlandı.")

    except Exception as e:
        logging.error(f"❌ [DB] Futures emir güncelleme hatası: {e}", exc_info=True)