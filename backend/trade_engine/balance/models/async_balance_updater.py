import asyncio
import argparse
import aiohttp
import time
from decimal import Decimal
from backend.trade_engine.balance.models.signing import ed25519_sign_binance, hmac_sha256_sign_binance

# Proje içinde oluşturduğumuz yapılandırma modülü
from backend.trade_engine import config

BASE_URLS = {
    "spot": "https://api.binance.com",
    "futures": "https://fapi.binance.com",
    "test_spot": "https://testnet.binance.vision",
    "test_futures": "https://testnet.binancefuture.com"
}

async def fetch_api_key_details(pool, api_id: int):
    """Veritabanından belirtilen api_id'ye ait tüm detayları çeker."""
    print(f"🔄 Veritabanından api_id={api_id} için anahtar bilgileri çekiliyor...")
    try:
        async with await config.get_async_connection() as conn:
            query = "SELECT * FROM api_keys WHERE id = $1;"
            record = await conn.fetchrow(query, api_id)
            if record:
                print("✅ Anahtar bilgileri veritabanından başarıyla çekildi.")
                # ✅ Debug: mevcut alanları göster
                available_fields = list(record.keys())
                print(f"🔍 Mevcut alanlar: {', '.join(available_fields)}")
                if 'trade_type' in record:
                    print(f"🔍 trade_type değeri: {record['trade_type']}")
                return record
            else:
                print(f"❌ Veritabanında api_id={api_id} ile eşleşen bir anahtar bulunamadı.")
                return None
    except Exception as e:
        print(f"❌ Veritabanı sorgusu sırasında hata: {e}")
        return None
    



async def display_account_balance(key_details: dict):
    """Spot ve Futures bakiyeleri ayrı ayrı çekilir ve birlikte yazdırılır."""
    is_test = key_details.get('is_test_api', False)
    spot_url = BASE_URLS["test_spot" if is_test else "spot"]
    futures_url = BASE_URLS["test_futures" if is_test else "futures"]

    balances = []

    # ✅ Spot bakiyesini çek
    try:
        spot_response = await get_spot_balance(key_details['api_key'], key_details['ed_private_pem'], spot_url)
        for b in spot_response.get('balances', []):
            total = Decimal(b['free']) + Decimal(b['locked'])
            if total > 0:
                balances.append({'asset': b['asset'], 'total': total, 'type': 'Spot'})
    except Exception as e:
        print(f"❌ Spot bakiyesi alınamadı: {e}")

    # ✅ Futures bakiyesini çek
    try:
        futures_response = await get_futures_balance(key_details['api_key'], key_details['api_secret'], futures_url)
        for b in futures_response:
            total = Decimal(b['balance'])
            if total > 0:
                balances.append({'asset': b['asset'], 'total': total, 'type': 'Futures'})
    except Exception as e:
        print(f"❌ Futures bakiyesi alınamadı: {e}")

    # Sonuçları yazdır
    print("\n" + "="*40)
    print(f"💰 CÜZDAN BAKİYESİ (api_id: {key_details['id']}) 💰")
    print("="*40)

    if not balances:
        print("Sıfırdan büyük değerliğe sahip hiçbir varlık bulunamadı.")
    else:
        print(f"{'TÜR':<10} | {'VARLIK':<10} | {'MİKTAR':<25}")
        print("-"*50)
        for b in balances:
            print(f"{b['type']:<10} | {b['asset']:<10} | {b['total']:<25}")

async def main(api_id: int):
    """Ana fonksiyon. Havuzu başlatır, işlemleri yürütür ve kapatır."""
    pool = await config.get_async_pool()
    if not pool:
        print("❌ Veritabanı havuzu başlatılamadı. İşlem iptal ediliyor.")
        return

    key_details = await fetch_api_key_details(pool, api_id)
    print(f"🔄 api_id={api_id} için anahtar bilgileri alındı: {key_details}")
    if key_details:
        await display_account_balance(key_details)

    await pool.close()
    print("\n✅ İşlem tamamlandı. Veritabanı havuzu kapatıldı.")

async def get_spot_balance(api_key: str, ed_private: str, base_url: str):
    """
    Spot hesap bakiyesini çeker - Ed25519 imzalama kullanır
    
    Args:
        api_key (str): Binance API anahtarı
        ed_private (str): Ed25519 private key (PEM formatında)
        base_url (str): Binance API base URL'i
        
    Returns:
        dict: Binance API yanıtı (bakiye bilgileri)
    """
    try:
        # API endpoint ve parametreler
        endpoint = "/api/v3/account"
        timestamp = int(time.time() * 1000)
        
        # Query string hazırla
        query_string = f"timestamp={timestamp}"
        
        # Ed25519 ile imzala
        signature = await ed25519_sign_binance(ed_private, query_string)
        
        # Tam URL oluştur
        url = f"{base_url}{endpoint}?{query_string}&signature={signature}"
        
        # HTTP headers hazırla
        headers = {
            "X-MBX-APIKEY": api_key,
            "Content-Type": "application/json"
        }
        
        # API isteği gönder
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Spot bakiye bilgileri başarıyla çekildi")
                    return data
                else:
                    error_text = await response.text()
                    print(f"❌ Spot bakiye çekme hatası: {response.status} - {error_text}")
                    return {"balances": []}
                    
    except Exception as e:
        print(f"❌ Spot bakiye çekme işlemi sırasında hata: {str(e)}")
        return {"balances": []}

async def get_futures_balance(api_key: str, api_secret: str, base_url: str):
    """
    Futures hesap bakiyesini çeker - HMAC-SHA256 imzalama kullanır
    
    Args:
        api_key (str): Binance API anahtarı
        api_secret (str): Binance API secret key
        base_url (str): Binance Futures API base URL'i
        
    Returns:
        list: Binance Futures API yanıtı (bakiye listesi)
    """
    try:
        # API endpoint ve parametreler
        endpoint = "/fapi/v2/balance"
        timestamp = int(time.time() * 1000)
        
        # Query string hazırla
        query_string = f"timestamp={timestamp}"
        
        # HMAC-SHA256 ile imzala
        signature = await hmac_sha256_sign_binance(api_secret, query_string)
        
        # Tam URL oluştur
        url = f"{base_url}{endpoint}?{query_string}&signature={signature}"
        
        # HTTP headers hazırla
        headers = {
            "X-MBX-APIKEY": api_key,
            "Content-Type": "application/json"
        }
        
        # API isteği gönder
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Futures bakiye bilgileri başarıyla çekildi")
                    return data
                else:
                    error_text = await response.text()
                    print(f"❌ Futures bakiye çekme hatası: {response.status} - {error_text}")
                    return []
                    
    except Exception as e:
        print(f"❌ Futures bakiye çekme işlemi sırasında hata: {str(e)}")
        return []


if __name__ == "__main__":
    asyncio.run(main(41))