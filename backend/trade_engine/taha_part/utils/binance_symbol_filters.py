"""
Bu dosya, Binance API'den alınan sembol bilgilerini PostgreSQL veritabanına kaydetmek için kullanılır.

Fonksiyonlar:
1. fetch_and_store_symbols(url, market_type):
   - Binance API'den sembol bilgilerini alır.
   - LOT_SIZE ve PRICE_FILTER bilgilerini işleyerek veritabanına kaydeder.
   - Eğer sembol zaten varsa, bilgileri günceller.

2. run_all():
   - Spot ve Futures market bilgilerini ayrı ayrı alır ve kaydeder.

Kullanım:
- Bu dosya doğrudan çalıştırıldığında, hem Spot hem de Futures market bilgileri güncellenir.
"""

import requests
import psycopg2
from datetime import datetime, timezone

def fetch_and_store_symbols(url, market_type):
    response = requests.get(url)
    data = response.json()

    connection = psycopg2.connect(
        dbname="balina_db",
        user="postgres",
        password="admin",
        host="localhost",
        port="5432"
    )
    cursor = connection.cursor()

    for symbol_info in data["symbols"]:
        symbol = symbol_info["symbol"]

        filters = {f["filterType"]: f for f in symbol_info["filters"]}
        if "LOT_SIZE" not in filters or "PRICE_FILTER" not in filters:
            continue

        step_size = float(filters["LOT_SIZE"]["stepSize"])
        min_qty = float(filters["LOT_SIZE"]["minQty"])
        tick_size = float(filters["PRICE_FILTER"]["tickSize"])
        updated_at = datetime.now(timezone.utc)

        cursor.execute("""
            INSERT INTO symbol_filters (binance_symbol, market_type, step_size, min_qty, tick_size, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (binance_symbol, market_type)
            DO UPDATE SET
                step_size = EXCLUDED.step_size,
                min_qty = EXCLUDED.min_qty,
                tick_size = EXCLUDED.tick_size,
                updated_at = EXCLUDED.updated_at;
        """, (symbol, market_type, step_size, min_qty, tick_size, updated_at))

    connection.commit()
    cursor.close()
    connection.close()
    print(f"{market_type.upper()} market verileri başarıyla güncellendi. Toplam: {len(data['symbols'])} çift.")

def run_all():
    # Spot market
    fetch_and_store_symbols(
        url="https://api.binance.com/api/v3/exchangeInfo",
        market_type="spot"
    )

    # Futures market (USDT-margined)
    fetch_and_store_symbols(
        url="https://fapi.binance.com/fapi/v1/exchangeInfo",
        market_type="futures"
    )

# Çalıştır
if __name__ == "__main__":
    run_all()
