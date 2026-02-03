# backend/trade_engine/data/last_data_loader.py
from psycopg2.extras import RealDictCursor
from trade_engine.config import psycopg2_connection

def load_last_data(interval: str, table_name: str = "binance_data"):
    """
    Belirtilen tabloda (varsayılan: binance_data) BTCUSDT için verilen interval'e ait
    en son (timestamp DESC) kaydın timestamp'ini döndürür.
    Veri yoksa None döner.
    """
    sql = f"""
        SELECT timestamp
        FROM public.{table_name}
        WHERE coin_id = 'BTCUSDT' AND interval = %s
        ORDER BY timestamp DESC
        LIMIT 1;
    """

    try:
        with psycopg2_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, (interval,))
                row = cur.fetchone()

        return row["timestamp"] if row else None

    except Exception as e:
        print(f"Veritabanı hatası: {e}")
        return None
