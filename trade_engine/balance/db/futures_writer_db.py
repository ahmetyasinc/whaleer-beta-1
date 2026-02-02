# futures_writer_db.py
# DEĞİŞİKLİK: Fonksiyonlar artık 'pool' parametresi almıyor ve
# config.asyncpg_connection kullanarak kendi bağlantılarını yönetiyor.

import logging
import datetime
from decimal import Decimal
from trade_engine.config import asyncpg_connection

async def batch_upsert_futures_balances(balance_data: list):
    """
    Gelen FUTURES bakiye listesini (ACCOUNT_UPDATE event) user_api_balances tablosuna
    toplu olarak ekler/günceller (UPSERT). Sadece cüzdan varlıklarını işler.
    """
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
        async with asyncpg_connection() as conn:
            async with conn.transaction():
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
        logging.info(f"✅ [DB] {len(records_to_upsert)} adet FUTURES BAKIYE (WS) başarıyla yazıldı.")
    except Exception as e:
        logging.error(f"❌ [DB] Futures bakiye yazma hatası (WS): {e}", exc_info=True)
        
async def batch_upsert_futures_orders(order_data: list):
    """
    Gelen FUTURES emir listesini (ORDER_TRADE_UPDATE event) bot_trades tablosunda GÜNCeller.
    Eğer emir sistemde mevcut değilse, kısa bir süre bekleyip (retry) tekrar dener.
    Bu, 'Race Condition' (Emir oluşmadan güncelleme gelmesi) durumunu çözer.
    """
    if not order_data:
        return

    import asyncio 

    async with asyncpg_connection() as conn:
        for attempt in range(3): # 3 Kez Dene
            pending_orders = []
            
            async with conn.transaction():
                for data in order_data:
                    # 1. Mevcut mu kontrol et
                    exists = await conn.fetchval(
                        "SELECT 1 FROM public.bot_trades WHERE order_id=$1",
                        str(data['order_id'])
                    )

                    if exists:
                        # Varsa Güncelle
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
                    else:
                        # Yoksa bir sonraki tur için sakla
                        pending_orders.append(data)
            
            # Eğer bekleyen emir yoksa işlem tamam
            if not pending_orders:
                updated_count = len(order_data) - len(pending_orders) # (Basitçe hepsi işlendi varsayımı)
                logging.info(f"✅ [DB] Futures Emir Güncellemesi Başarılı.")
                return

            # Bekleyen varsa ve son deneme değilse bekle
            if attempt < 2:
                logging.warning(f"⏳ [DB] {len(pending_orders)} emir henüz DB'de yok. {attempt+1}. deneme için 1sn bekleniyor... (Order ID: {[o['order_id'] for o in pending_orders]})")
                order_data = pending_orders # Listeyi güncelle
                await asyncio.sleep(1.0)
            else:
                # Son denemede de bulunamadıysa logla ve bırak
                logging.error(f"❌ [DB] {len(pending_orders)} emir bulunamadı ve güncellenemedi! (Order ID: {[o['order_id'] for o in pending_orders]})")