# balance_update_manager.py (Hata Düzeltilmiş Final Sürüm)
from decimal import Decimal
import asyncio
import logging
import argparse
from typing import List, Dict, Optional, Any

# 3. parti kütüphaneler
from binance import AsyncClient, BinanceAPIException

# Yerel import: Bağlantı havuzunu başlatan ve bağlantı kiralayan fonksiyonlar config.py'den alınır.
from backend.trade_engine.config import get_async_pool, get_async_connection

# --- Proje Yapılandırması ve Loglama ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# --- Veritabanı İşlemleri (config.py'ye uyarlanmış) ---

# balance_update_manager.py içindeki YENİ get_api_keys_from_db fonksiyonu

# balance_update_manager.py içindeki bu fonksiyonu güncelle

async def get_api_keys_from_db(stream_key_ids: Optional[List[int]] = None) -> List[Dict[str, Any]]:
    """
    Veritabanından stream_key ID'sini, user_id'yi ve bunlarla ilişkili ASIL api_id'yi çeker.
    Artık stream_key_ids listesine göre filtreleme yapabilir.
    """
    # get_async_connection fonksiyonu dosyanızda zaten mevcut.
    async with await get_async_connection() as conn:
        if not conn:
            logging.error("get_api_keys_from_db: Veritabanı bağlantısı alınamadı.")
            return []
        
        sql = """
            SELECT 
                sk.id,          -- stream_keys tablosunun kendi ID'si
                sk.user_id, 
                ak.id AS api_id,-- api_keys tablosunun ID'si (Bakiye için lazım olan)
                ak.api_key, 
                ak.api_secret 
            FROM 
                public.stream_keys sk
            JOIN 
                public.api_keys ak ON sk.api_id = ak.id
            WHERE 
                ak.is_active = TRUE
        """
        # Parametre adı 'stream_key_ids' olarak güncellendi ve sorgu düzeltildi.
        if stream_key_ids:
            sql += " AND sk.id = ANY($1::int[])"
            records = await conn.fetch(sql, stream_key_ids)
        else:
            records = await conn.fetch(sql)
        
        return [dict(rec) for rec in records]

async def update_permissions_in_db(stream_key_id: int, is_futures_enabled: bool):
    """Kullanıcının futures izin durumunu DOĞRU TABLODA (stream_keys) günceller."""
    async with await get_async_connection() as conn:
        if not conn:
            logging.error(f"update_permissions_in_db (Stream Key ID: {stream_key_id}): Veritabanı bağlantısı alınamadı.")
            return
            
        # --- HATA DÜZELTMESİ BURADA ---
        # Hedef tablo 'stream_keys' olarak güncellendi.
        await conn.execute(
            "UPDATE public.stream_keys SET is_futures_enabled = $1 WHERE id = $2",
            is_futures_enabled, stream_key_id
        )
    logging.info(f"Stream Key ID {stream_key_id} için futures izni güncellendi: {is_futures_enabled}")

# balance_update_manager.py içindeki bu fonksiyonu güncelle

# Lütfen update_balances_in_db fonksiyonunu bu blokla tamamen değiştirin.

async def update_balances_in_db(api_id: int, user_id: int, balances: List[Dict[str, Any]]):
    """user_api_balances tablosunda tam senkronizasyon (ekle/güncelle + artık olmayanları sil)."""
    async with await get_async_connection() as conn:
        if not conn:
            logging.error(f"update_balances_in_db (API ID: {api_id}): Veritabanı bağlantısı alınamadı.")
            return

        async with conn.transaction():
            if not balances:
                logging.info(f"API ID {api_id} için güncellenecek bakiye bulunamadı. Tüm kayıtlar siliniyor.")
                await conn.execute("DELETE FROM public.user_api_balances WHERE api_id = $1", api_id)
                return

            # --- DEĞİŞTİRİLDİ: SQL sorgusu ve veri listesi yeni sütunları içerecek şekilde güncellendi ---
            
            # 1) Ekle veya güncelle (upsert)
            insert_query = """
                INSERT INTO public.user_api_balances 
                (api_id, user_id, coin_symbol, amount, free_amount, locked_amount, account_type, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (api_id, coin_symbol, account_type)
                DO UPDATE SET 
                    amount = EXCLUDED.amount,
                    free_amount = EXCLUDED.free_amount,
                    locked_amount = EXCLUDED.locked_amount,
                    user_id = EXCLUDED.user_id,
                    updated_at = NOW()
            """
            data_to_insert = [
                (
                    api_id, 
                    user_id, 
                    b['asset'], 
                    b['amount'], 
                    b['free_amount'], 
                    b['locked_amount'], 
                    b['account_type']
                ) for b in balances
            ]
            await conn.executemany(insert_query, data_to_insert)

            # 2) Artık olmayan coinleri silme mantığı aynı kalabilir, doğru çalışıyor.
            existing_assets = [b['asset'] for b in balances]
            existing_accounts = [b['account_type'] for b in balances]

            await conn.execute(
                """
                DELETE FROM public.user_api_balances
                WHERE api_id = $1
                  AND (coin_symbol, account_type) NOT IN (
                      SELECT UNNEST($2::text[]), UNNEST($3::text[])
                  )
                """,
                api_id,
                existing_assets,
                existing_accounts
            )

    logging.info(f"API ID {api_id} için {len(balances)} bakiye (total/free/locked) güncellendi, artık olmayanlar silindi.")

async def process_user(api_key_data: Dict[str, Any]):
    """Tek bir kullanıcı için izinleri kontrol eder, spot ve futures bakiyelerini çeker ve DB'ye yazar."""
    stream_key_id = api_key_data['id']
    api_id = api_key_data['api_id']
    user_id = api_key_data['user_id']
    api_key = api_key_data['api_key']
    api_secret = api_key_data['api_secret']
    
    logging.info(f"Stream Key ID {stream_key_id} (İlişkili API ID: {api_id}) için işlem başlatıldı...")
    
    client = None # finally bloğunda kontrol için
    try:
        client = await AsyncClient.create(api_key, api_secret)
        restrictions = await client.get_account_api_permissions()
        is_futures_enabled = restrictions.get('enableFutures', False)
        is_spot_enabled = restrictions.get('enableSpotAndMarginTrading', False)
        
        await update_permissions_in_db(stream_key_id, is_futures_enabled)

        all_balances = []
        if is_spot_enabled:
            spot_account = await client.get_account()
            for b in spot_account.get('balances', []):
                # --- DEĞİŞTİRİLDİ: Spot için free, locked ve total değerlerini alıyoruz ---
                free_balance = Decimal(b['free'])
                locked_balance = Decimal(b['locked'])
                total_balance = free_balance + locked_balance
                
                if total_balance > 0:
                    all_balances.append({
                        'asset': b['asset'],
                        'amount': total_balance,
                        'free_amount': free_balance,
                        'locked_amount': locked_balance,
                        'account_type': 'spot'
                    })

        if is_futures_enabled:
            futures_account_balance = await client.futures_account_balance()
            for b in futures_account_balance:
                balance = Decimal(b['balance'])
                if balance != 0:
                    # --- DEĞİŞTİRİLDİ: Futures için total ve free aynı, locked 0 kabul edilir ---
                    # Bu API endpoint'i pozisyonlardaki kilitli miktarı değil, cüzdan bakiyesini verir.
                    all_balances.append({
                        'asset': b['asset'],
                        'amount': balance,
                        'free_amount': balance, # Futures cüzdan bakiyesi 'free' olarak kabul edilir
                        'locked_amount': Decimal('0'), # Bu endpoint'te locked bilgisi yok
                        'account_type': 'futures'
                    })

        # Bakiye güncellemesi, api_keys'e bağlı olduğu için api_id kullanır
        await update_balances_in_db(api_id, user_id, all_balances)

    except BinanceAPIException as e:
        logging.error(f"Stream Key ID {stream_key_id} için Binance API hatası: {e.code} - {e.message}")
    except Exception as e:
        logging.error(f"Stream Key ID {stream_key_id} için beklenmedik bir hata oluştu: {e}", exc_info=True)
    finally:
        if client:
            await client.close_connection()

async def main(args):
    """Komut satırı argümanlarına göre ana iş akışını yönetir."""
    # ### HATA DÜZELTMESİ: pool.close() KALDIRILDI ###
    # Pool'u burada oluşturup işimizi yapıyoruz ancak kapatmıyoruz.
    # Kapatma işini bizi çağıran ana uygulama (run_services.py) yapacak.
    pool = await get_async_pool()
    
    if not pool:
        logging.critical("Veritabanı bağlantı havuzu alınamadı. Script sonlandırılıyor.")
        return

    async def run_update():
        logging.info("Bakiye güncelleme döngüsü başlıyor...")
        start_time = asyncio.get_event_loop().time()
        
        # user_ids argümanı None olabilir, bu yüzden args.user_ids olarak düzeltildi
        api_keys = await get_api_keys_from_db(args.user_ids if hasattr(args, 'user_ids') else None)
        
        if not api_keys:
            logging.warning("Veritabanında işlenecek aktif API anahtarı bulunamadı.")
            return

        tasks = [process_user(key_data) for key_data in api_keys]
        await asyncio.gather(*tasks)
        
        end_time = asyncio.get_event_loop().time()
        logging.info(f"Bakiye güncelleme döngüsü {end_time - start_time:.2f} saniyede tamamlandı.")

    # periodic None olabilir, bu yüzden hasattr ile kontrol etmek daha güvenli
    is_periodic = hasattr(args, 'periodic') and args.periodic is not None and args.periodic > 0
    if is_periodic:
        logging.info(f"Periyodik mod aktif. Her {args.periodic} dakikada bir güncelleme yapılacak.")
        while True:
            await run_update()
            logging.info(f"{args.periodic} dakika bekleniyor...")
            await asyncio.sleep(args.periodic * 60)
    else:
        # Eğer periyodik değilse, --all veya --user-ids modudur, bu yüzden sadece bir kez çalıştır.
        await run_update()
    
    # ### HATA DÜZELTMESİ: BU SATIR KALDIRILDI ###
    # await pool.close()
    # logging.info("Veritabanı bağlantı havuzu kapatıldı.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Binance Bakiye Güncelleme Yöneticisi")
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--all', action='store_true', help="Tüm aktif kullanıcıların bakiyesini bir kez günceller.")
    group.add_argument('--user-ids', nargs='+', type=int, help="Sadece belirtilen API ID'lere sahip kullanıcıları günceller.")
    group.add_argument('--periodic', type=int, metavar='MINUTES', help="Tüm kullanıcıları belirtilen dakika aralığıyla periyodik olarak günceller.")
    
    args = parser.parse_args()
    
    try:
        # Bu script tek başına çalıştırıldığında havuzun kapatılması gerekir.
        # Bu yüzden try...finally bloğu ekliyoruz.
        loop = asyncio.get_event_loop()
        try:
            loop.run_until_complete(main(args))
        finally:
            # main'den çağrılmadığında pool'u kapatmak için
            # config'deki global pool'a erişip kapatabiliriz.
            from backend.trade_engine.config import _pool
            if _pool and not _pool._closed:
                 loop.run_until_complete(_pool.close())
                 logging.info("Veritabanı bağlantı havuzu kapatıldı (__main__).")

    except KeyboardInterrupt:
        logging.info("Script kullanıcı tarafından sonlandırıldı.")