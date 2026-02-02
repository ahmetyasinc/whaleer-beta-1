# backend/trade_engine/data/candles.py (örnek konum)
import pandas as pd
from sqlalchemy import text

# Yeni config yapısına uyum
from app.database import get_sync_engine as get_engine

def get_candles(coin_id, interval, candle_count):
    query = text("""
        SELECT timestamp, open, high, low, close, volume
        FROM binance_data
        WHERE coin_id = :coin_id AND interval = :interval
        ORDER BY timestamp DESC
        LIMIT :limit
    """)

    try:
        eng = get_engine()
        with eng.connect() as conn:
            df = pd.read_sql_query(
                query,
                conn,
                params={
                    "coin_id": coin_id,
                    "interval": interval,
                    "limit": int(candle_count),
                },
            )
        df = df.sort_values(by="timestamp")
        return df
    except Exception as e:
        print(f"Veri çekme hatası: {e}")
        return pd.DataFrame()
