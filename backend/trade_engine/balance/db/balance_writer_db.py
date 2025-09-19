import logging
import datetime

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
    Gelen SPOT emir listesini bot_trades tablosuna toplu olarak ekler.
    """
    if not order_data:
        return

    records_to_insert = [
        (
            data['user_id'],
            None, # bot_id bilgisi genel kullanıcı veri akışından gelmez.
            datetime.datetime.fromtimestamp(data['event_time'] / 1000),
            data['symbol'],
            data['side'].lower(),
            data['executed_quantity'], # Gerçekleşen miktar
            data.get('commission'), # <-- GÜNCELLENDİ (Artık komisyon verisini alıyor)
            str(data['order_id']),
            data['status'],
            'spot', # Bu fonksiyon spot verisi için
            None, # position_side spot emirlerinde olmaz
            data['price'],
            data['client_order_id'] # Yeni eklediğimiz client_order_id sütunu için
        ) for data in order_data
    ]

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.executemany("""
                    INSERT INTO public.bot_trades 
                    (user_id, bot_id, created_at, symbol, side, amount, fee, order_id, status, trade_type, position_side, price, client_order_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                """, records_to_insert)
        logging.info(f"✅ [DB] {len(records_to_insert)} adet SPOT EMİR başarıyla yazıldı.")
    except Exception as e:
        logging.error(f"❌ [DB] Spot emir yazma hatası: {e}", exc_info=True)