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
    Gelen FUTURES emir listesini (ORDER_TRADE_UPDATE event) bot_trades tablosuna
    toplu olarak ekler/günceller (UPSERT). Güncellemeyi (user_id, order_id) üzerinden yapar.
    """
    if not order_data:
        return

    records_to_upsert = []
    for data in order_data:
        records_to_upsert.append(
            (
                data['user_id'],
                None, # bot_id
                datetime.datetime.fromtimestamp(data['event_time'] / 1000, tz=datetime.timezone.utc),
                data['symbol'],
                data['side'].lower(),
                Decimal(data.get('executed_quantity', '0')),
                Decimal(data.get('commission', '0')),
                str(data['order_id']),
                data['status'],
                'futures',
                data['position_side'].lower(),
                Decimal(data.get('price', '0')),
                data.get('client_order_id'),
                Decimal(data.get('realized_profit', '0'))
                # api_id buradan kaldırıldı
            )
        )

    if not records_to_upsert: return

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                # DEĞİŞİKLİK: ON CONFLICT (user_id, order_id) olarak güncellendi ve sorgudan api_id kaldırıldı.
                await conn.executemany("""
                    INSERT INTO public.bot_trades 
                    (user_id, bot_id, created_at, symbol, side, amount, fee, order_id, status, trade_type, position_side, price, client_order_id, realized_profit)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    ON CONFLICT (user_id, order_id)
                    DO UPDATE SET
                        status = EXCLUDED.status,
                        amount = EXCLUDED.amount,
                        fee = EXCLUDED.fee,
                        realized_profit = EXCLUDED.realized_profit,
                        created_at = EXCLUDED.created_at;
                """, records_to_upsert)
        logging.info(f"✅ [DB] {len(records_to_upsert)} adet FUTURES EMIR başarıyla yazıldı/güncellendi.")
    except Exception as e:
        logging.error(f"❌ [DB] Futures emir yazma/güncelleme hatası: {e}", exc_info=True)