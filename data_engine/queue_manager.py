import asyncio
import time
from datetime import datetime
import logging

# ✅ Shared Global Data Queue
# Item structure: (source_type, coin_id, interval, timestamp, open, high, low, close, volume)
# source_type: 'spot' or 'futures'
data_queue = asyncio.Queue(maxsize=20000) # Increased size for combined traffic

async def process_shared_queue(db_pool):
    """
    Consumer: Reads from the shared `data_queue`, separates data by source,
    and performs batch inserts into the respective tables.
    """
    print("🚀 Shared DB Writer (Consumer) Started...")
    
    batch_size = 200  # Combined batch size
    flush_interval = 1.0 # Max wait time (seconds)
    
    batch = []
    last_flush = time.time()
    
    while True:
        try:
            # 1. Get data from queue
            try:
                item = await asyncio.wait_for(data_queue.get(), timeout=0.1)
                batch.append(item)
            except asyncio.TimeoutError:
                pass # No data, continue to check flush conditions
            
            current_time = time.time()
            
            # 2. Flush if batch is full or time is up
            if len(batch) >= batch_size or (batch and current_time - last_flush >= flush_interval):
                async with db_pool.acquire() as conn:
                    async with conn.transaction():
                        
                        # Separate batches
                        spot_batch = []
                        futures_batch = []
                        
                        # item: (source, coin_id, interval, timestamp, open, high, low, close, volume)
                        for item in batch:
                            source = item[0]
                            data = item[1:] # original tuple part
                            if source == 'spot':
                                spot_batch.append(data)
                            elif source == 'futures':
                                futures_batch.append(data)
                        
                        # --- SPOT INSERT ---
                        if spot_batch:
                            await conn.executemany(
                                """
                                INSERT INTO binance_data
                                  (coin_id, interval, "timestamp", open, high, low, close, volume)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                ON CONFLICT (coin_id, interval, "timestamp") DO UPDATE 
                                SET 
                                    open = EXCLUDED.open,
                                    high = EXCLUDED.high,
                                    low = EXCLUDED.low,
                                    close = EXCLUDED.close,
                                    volume = EXCLUDED.volume
                                """,
                                spot_batch
                            )
                            
                            # Spot Last Price
                            latest_map_spot = {}
                            for item in spot_batch:
                                # item: (coin_id, interval, timestamp, open, high, low, close, volume)
                                key = (item[0], item[1])
                                if key not in latest_map_spot or item[2] > latest_map_spot[key][2]:
                                    latest_map_spot[key] = item
                            
                            last_price_batch_spot = [
                                (item[0], item[1], item[2], item[6]) 
                                for item in latest_map_spot.values()
                            ]
                            
                            if last_price_batch_spot:
                                await conn.executemany(
                                    """
                                    INSERT INTO binance_last_price (coin_id, "interval", "timestamp", close)
                                    VALUES ($1, $2, $3, $4)
                                    ON CONFLICT (coin_id, "interval") DO UPDATE
                                    SET "timestamp" = EXCLUDED."timestamp",
                                        close       = EXCLUDED.close
                                    WHERE EXCLUDED."timestamp" > binance_last_price."timestamp"
                                    """,
                                    last_price_batch_spot
                                )

                        # --- FUTURES INSERT ---
                        if futures_batch:
                            await conn.executemany(
                                """
                                INSERT INTO binance_futures
                                  (coin_id, interval, "timestamp", open, high, low, close, volume)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                ON CONFLICT (coin_id, interval, "timestamp") DO UPDATE 
                                SET 
                                    open = EXCLUDED.open,
                                    high = EXCLUDED.high,
                                    low = EXCLUDED.low,
                                    close = EXCLUDED.close,
                                    volume = EXCLUDED.volume
                                """,
                                futures_batch
                            )
                            
                            # Futures Last Price
                            latest_map_futures = {}
                            for item in futures_batch:
                                key = (item[0], item[1])
                                if key not in latest_map_futures or item[2] > latest_map_futures[key][2]:
                                    latest_map_futures[key] = item
                            
                            last_price_batch_futures = [
                                (item[0], item[1], item[2], item[6]) 
                                for item in latest_map_futures.values()
                            ]
                            
                            if last_price_batch_futures:
                                await conn.executemany(
                                    """
                                    INSERT INTO binance_futures_last_price (coin_id, "interval", "timestamp", close)
                                    VALUES ($1, $2, $3, $4)
                                    ON CONFLICT (coin_id, "interval") DO UPDATE
                                    SET "timestamp" = EXCLUDED."timestamp",
                                        close       = EXCLUDED.close
                                    WHERE EXCLUDED."timestamp" > binance_futures_last_price."timestamp"
                                    """,
                                    last_price_batch_futures
                                )

                        # --- NOTIFICATIONS (Post-Commit Logic moved here) ---
                        # We send NOTIFY specifically for the intervals present in the batch.
                        # This triggers the listen_service WITHOUT needing a DB trigger.
                        
                        if spot_batch:
                            # spot_batch item: (coin_id, interval, ...) -> interval is at index 1
                            # Trigger ONLY on BTCUSDT (Leader) to prevent duplicate notifications
                            unique_intervals = {row[1] for row in spot_batch if row[0] == 'BTCUSDT'}
                            for interval in unique_intervals:
                                await conn.execute(f"NOTIFY new_data, '{interval}'")

                        if futures_batch:
                            # futures_batch item: (coin_id, interval, ...) -> interval is at index 1
                            # Trigger ONLY on BTCUSDT (Leader)
                            unique_intervals = {row[1] for row in futures_batch if row[0] == 'BTCUSDT'}
                            for interval in unique_intervals:
                                await conn.execute(f"NOTIFY new_futures_data, '{interval}'")

                print(f"[{datetime.now().strftime('%H:%M:%S')}] 💾 Batch Persisted: {len(batch)} items (Spot: {len(spot_batch)}, Futures: {len(futures_batch)})")
                batch = []
                last_flush = current_time
                
        except Exception as e:
            print(f"❌ Shared DB Writer Error: {e}")
            await asyncio.sleep(1)
