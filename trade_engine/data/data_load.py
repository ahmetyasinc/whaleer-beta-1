# backend/trade_engine/data/candles_fetcher.py
import asyncio
import time
import pandas as pd
from sqlalchemy import text
from trade_engine.config import get_engine  # lazy & fork-safe engine

async def fetch_all_candles(coin_requirements: dict[tuple[str, str], int]):
    """
    coin_requirements: { (coin_id, interval): candle_count }
    Dönüş: { (coin_id, interval): DataFrame }
    """
    semaphore = asyncio.Semaphore(15)  # Aynı anda en fazla 15 istek

    async def fetch_one(key, candle_count):
        coin_id, interval = key
        async with semaphore:
            # t0 = time.time()
            df = await get_candles_async(coin_id, interval, candle_count)
            # print(f"⏱️ {coin_id}-{interval}: {time.time() - t0:.2f}s")
            return key, df

    tasks = [fetch_one(key, count) for key, count in coin_requirements.items()]
    results = await asyncio.gather(*tasks)

    coin_data_dict: dict[tuple[str, str], pd.DataFrame] = {}
    for (coin_id, interval), df in results:
        if len(df) >= coin_requirements[(coin_id, interval)]:
            coin_data_dict[(coin_id, interval)] = df
        else:
            # Yeterli veri yoksa atla (sessizce geçiyoruz)
            pass

    return coin_data_dict


async def get_candles_async(coin_id: str, interval: str, candle_count: int) -> pd.DataFrame:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, get_candles, coin_id, interval, candle_count)


def get_candles(coin_id: str, interval: str, candle_count: int) -> pd.DataFrame:
    """
    Postgres'ten mumları çeker (public.binance_data). Sonuç timestamp ASC olarak döner.
    """
    # Not: LIMIT için parametre kullanımı Postgres'te güvenlidir.
    sql = text("""
        SELECT timestamp, open, high, low, close, volume
        FROM public.binance_data
        WHERE coin_id = :coin_id AND interval = :interval
        ORDER BY timestamp DESC
        LIMIT :limit
    """)

    try:
        eng = get_engine()
        with eng.connect() as conn:
            df = pd.read_sql_query(
                sql,
                conn,
                params={"coin_id": coin_id, "interval": interval, "limit": int(candle_count)},
            )
        # En yeni yukarıda geldiği için stratejiler genelde ASC ister:
        if not df.empty:
            df = df.sort_values(by="timestamp").reset_index(drop=True)
        return df
    except Exception as e:
        print(f"Veri çekme hatası: {e}")
        return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])
