import logging
import datetime
from decimal import Decimal
# Not: Bu fonksiyonlar artık kendi dosyalarında.
# Spot ve Futures için veri yazma mantığını burada merkezileştireceğiz.

# Lütfen batch_upsert_balances fonksiyonunu bu blokla tamamen değiştirin

async def batch_upsert_balances(pool, balance_data: list):
    """
    Gelen SPOT bakiye listesini (Decimal objeleri içerebilir) 
    user_api_balances tablosuna toplu olarak ekler/günceller (UPSERT).
    """
    if not balance_data:
        return

    records_to_upsert = []
    for data in balance_data:
        # Gelen verinin Decimal olduğunu ve 'free'/'locked' anahtarlarını içerdiğini varsayıyoruz.
        free_val = data.get('free')
        locked_val = data.get('locked')
        
        # Eğer veri eksikse bu kaydı atla
        if free_val is None or locked_val is None:
            logging.warning(f"Eksik bakiye verisi atlandı: {data}")
            continue

        total_val = free_val + locked_val # Decimal objeleriyle hassas toplama
        
        records_to_upsert.append(
            (
                data['user_id'],
                data['api_id'],
                data['asset'],
                total_val,      # amount sütunu
                free_val,       # free_amount sütunu
                locked_val,     # locked_amount sütunu
                'spot',
                datetime.datetime.now(datetime.timezone.utc) # Zaman dilimi bilgisi eklemek en iyisidir
            )
        )

    if not records_to_upsert:
        return

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                # "Varsa güncelle, yoksa ekle" mantığını bu SQL komutu sağlar.
                await conn.executemany("""
                    INSERT INTO public.user_api_balances 
                    (user_id, api_id, coin_symbol, amount, free_amount, locked_amount, account_type, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (api_id, coin_symbol, account_type) 
                    DO UPDATE SET
                        amount = EXCLUDED.amount,
                        free_amount = EXCLUDED.free_amount,
                        locked_amount = EXCLUDED.locked_amount,
                        updated_at = EXCLUDED.updated_at,
                        user_id = EXCLUDED.user_id;
                """, records_to_upsert)
        logging.info(f"✅ [DB] {len(records_to_upsert)} adet SPOT BAKİYE başarıyla yazıldı.")
    except Exception as e:
        logging.error(f"❌ [DB] Spot bakiye yazma hatası: {e}", exc_info=True)

# balance_writer_db.py dosyasındaki fonksiyon

async def batch_insert_orders(pool, order_data: list):
    """
    Gelen SPOT emir listesini bot_trades tablosunda GÜNCeller.
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
                        "SELECT 1 FROM public.bot_trades WHERE user_id=$1 AND order_id=$2",
                        data['user_id'], str(data['order_id'])
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
                            WHERE user_id = $5 AND order_id = $6
                        """,
                        data['status'],
                        data.get('commission', Decimal('0')),
                        data['price'],
                        data['executed_quantity'],
                        data['user_id'],
                        str(data['order_id'])
                        )
                        updated_count += 1
                    else:
                        skipped_count += 1

        if updated_count > 0:
            logging.info(f"✅ [DB] {updated_count} adet mevcut SPOT EMRİ başarıyla güncellendi.")
        if skipped_count > 0:
            logging.info(f"ℹ️ [DB] {skipped_count} adet sistem dışı spot emri atlandı.")

    except Exception as e:
        logging.error(f"❌ [DB] Spot emir güncelleme hatası: {e}", exc_info=True)