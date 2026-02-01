# balance_update_manager.py
from decimal import Decimal
import asyncio
import logging
import argparse
from typing import List, Dict, Optional, Any

from binance import AsyncClient
from binance.exceptions import BinanceAPIException

from trade_engine.config import (
    get_async_pool,
    asyncpg_connection,
    close_async_pool,
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# ---------------- DB Helpers (Değişiklik yok) ----------------

async def get_api_keys_from_db(stream_key_ids: Optional[List[int]] = None) -> List[Dict[str, Any]]:
    async with asyncpg_connection() as conn:
        sql = """
            SELECT 
                sk.id, sk.user_id, ak.id AS api_id,
                ak.api_key, ak.api_secret
            FROM public.stream_keys sk
            JOIN public.api_keys ak ON sk.api_id = ak.id
            WHERE ak.is_active = TRUE
        """
        if stream_key_ids:
            sql += " AND sk.id = ANY($1::int[])"
            records = await conn.fetch(sql, stream_key_ids)
        else:
            records = await conn.fetch(sql)
        return [dict(r) for r in records]

async def update_permissions_in_db(stream_key_id: int, is_futures_enabled: bool):
    async with asyncpg_connection() as conn:
        await conn.execute(
            "UPDATE public.stream_keys SET is_futures_enabled = $1 WHERE id = $2",
            is_futures_enabled, stream_key_id
        )
    logging.info(f"Stream Key ID {stream_key_id} için futures izni güncellendi: {is_futures_enabled}")

async def update_balances_in_db(api_id: int, user_id: int, balances: List[Dict[str, Any]]):
    async with asyncpg_connection() as conn:
        async with conn.transaction():
            if not balances:
                logging.info(f"API ID {api_id}: Güncellenecek bakiye yok. Tüm kayıtlar siliniyor.")
                await conn.execute("DELETE FROM public.user_api_balances WHERE api_id = $1", api_id)
                return

            insert_sql = """
                INSERT INTO public.user_api_balances 
                    (api_id, user_id, coin_symbol, amount, free_amount, locked_amount, account_type, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (api_id, coin_symbol, account_type)
                DO UPDATE SET 
                    amount        = EXCLUDED.amount,
                    free_amount   = EXCLUDED.free_amount,
                    locked_amount = EXCLUDED.locked_amount,
                    user_id       = EXCLUDED.user_id,
                    updated_at    = NOW()
            """
            data_to_insert = [
                (
                    api_id, user_id, b['asset'], b['amount'], b['free_amount'],
                    b['locked_amount'], b['account_type'],
                )
                for b in balances
            ]
            await conn.executemany(insert_sql, data_to_insert)

            existing_assets = [b['asset'] for b in balances]
            existing_accounts = [b['account_type'] for b in balances]

            delete_sql = """
                DELETE FROM public.user_api_balances uab
                WHERE uab.api_id = $1
                  AND (uab.coin_symbol, uab.account_type) NOT IN (
                      SELECT t.asset, t.account_type
                      FROM UNNEST($2::text[], $3::text[]) AS t(asset, account_type)
                  );
            """
            await conn.execute(delete_sql, api_id, existing_assets, existing_accounts)

    logging.info(f"API ID {api_id}: {len(balances)} bakiye upsert + eksikler silindi.")

# ---------------- Core Flow (Değişiklik burada) ----------------

async def process_user(api_key_data: Dict[str, Any]):
    stream_key_id = api_key_data['id']
    api_id        = api_key_data['api_id']
    user_id       = api_key_data['user_id']
    api_key       = api_key_data['api_key']
    api_secret    = api_key_data['api_secret']

    logging.info(f"[StreamKey {stream_key_id} | API {api_id}] işlem başlatılıyor...")
    client = None
    try:
        client = await AsyncClient.create(api_key, api_secret)

        restrictions = await client.get_account_api_permissions()
        is_futures_enabled = restrictions.get('enableFutures', False)
        is_spot_enabled    = restrictions.get('enableSpotAndMarginTrading', False)
        await update_permissions_in_db(stream_key_id, is_futures_enabled)

        all_balances: List[Dict[str, Any]] = []

        # Spot (Değişiklik yok)
        if is_spot_enabled:
            spot_account = await client.get_account()
            for b in spot_account.get('balances', []):
                free_balance   = Decimal(b['free'])
                locked_balance = Decimal(b['locked'])
                total_balance  = free_balance + locked_balance
                if total_balance > 0:
                    all_balances.append({
                        'asset':         b['asset'],
                        'amount':        total_balance,
                        'free_amount':   free_balance,
                        'locked_amount': locked_balance,
                        'account_type':  'spot',
                    })

        # ####################################################################
        # ### DEĞİŞİKLİĞİN YAPILDIĞI BÖLÜM BURASI ###
        # ####################################################################
        if is_futures_enabled:
            # Daha detaylı bilgi (varlıklar + pozisyonlar) için futures_account() kullanılıyor.
            futures_account_info = await client.futures_account()
            
            # 1. Adım: Açık pozisyonlardaki toplam teminatı (marjin) hesapla
            total_initial_margin = Decimal('0')
            for pos in futures_account_info.get('positions', []):
                # Sadece açık pozisyonları dikkate al
                if Decimal(pos.get('positionAmt', '0')) != 0:
                    total_initial_margin += Decimal(pos.get('initialMargin', '0'))

            # 2. Adım: Cüzdandaki varlıkları işle
            for asset in futures_account_info.get('assets', []):
                wallet_balance = Decimal(asset.get('walletBalance', '0'))
                
                # Sadece bakiyesi olan varlıkları kaydet
                if wallet_balance > 0:
                    locked = Decimal('0')
                    free = wallet_balance

                    # Eğer varlık USDT ise, hesaplanan toplam marjini "kilitli" olarak ata
                    if asset.get('asset') == 'USDT':
                        locked = total_initial_margin
                        free = wallet_balance - locked
                    
                    all_balances.append({
                        'asset':         asset.get('asset'),
                        'amount':        wallet_balance,  # Toplam cüzdan bakiyesi
                        'free_amount':   free,            # Cüzdan bakiyesi - pozisyonlardaki teminat
                        'locked_amount': locked,          # Pozisyonlardaki toplam teminat
                        'account_type':  'futures',
                    })
        # ####################################################################
        # ### DEĞİŞİKLİK SONU ###
        # ####################################################################

        await update_balances_in_db(api_id, user_id, all_balances)

    except BinanceAPIException as e:
        logging.error(f"[StreamKey {stream_key_id}] Binance API hatası: {e.code} - {e.message}")
    except Exception as e:
        logging.error(f"[StreamKey {stream_key_id}] Beklenmedik hata: {e}", exc_info=True)
    finally:
        if client:
            await client.close_connection()

# ---------------- Main Loop (Değişiklik yok) ----------------

async def main(args):
    await get_async_pool()
    async def run_update():
        logging.info("Bakiye güncelleme döngüsü başlıyor...")
        start = asyncio.get_event_loop().time()
        stream_key_ids = args.user_ids if hasattr(args, 'user_ids') else None
        api_keys = await get_api_keys_from_db(stream_key_ids)
        if not api_keys:
            logging.warning("İşlenecek aktif API anahtarı bulunamadı.")
            return
        tasks = [process_user(k) for k in api_keys]
        await asyncio.gather(*tasks)
        dur = asyncio.get_event_loop().time() - start
        logging.info(f"Bakiye güncelleme döngüsü {dur:.2f} sn’de tamamlandı.")

    is_periodic = getattr(args, 'periodic', None)
    if isinstance(is_periodic, int) and is_periodic > 0:
        logging.info(f"Periyodik mod: her {is_periodic} dk’da bir çalışacak.")
        while True:
            await run_update()
            logging.info(f"{is_periodic} dk bekleniyor...")
            await asyncio.sleep(is_periodic * 60)
    else:
        await run_update()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Binance Bakiye Güncelleme Yöneticisi")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--all', action='store_true', help="Tüm aktif kullanıcıların bakiyesini bir kez günceller.")
    group.add_argument('--user-ids', nargs='+', type=int, help="Sadece belirtilen stream_key_id kayıtlarını günceller.")
    group.add_argument('--periodic', type=int, metavar='MINUTES', help="Tüm kullanıcıları periyodik olarak günceller.")
    args = parser.parse_args()
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(main(args))
    except KeyboardInterrupt:
        logging.info("Script kullanıcı tarafından sonlandırıldı.")
    finally:
        try:
            loop.run_until_complete(close_async_pool())
            logging.info("Veritabanı bağlantı havuzu kapatıldı (__main__).")
        except Exception:
            pass