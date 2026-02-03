import asyncio
import aiohttp
import asyncpg
import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

# Path setup to find .env (one level up from scripts)
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
env_path = os.path.join(parent_dir, '.env')

if not load_dotenv(env_path):
    print(f"⚠️ Warning: .env file not found at {env_path}")
    # Fallback normal load
    load_dotenv()

# Database URL cleanup
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    print("❌ Error: DATABASE_URL not found in environment variables.")
    sys.exit(1)

# Constants
# Using data-api.binance.vision for Spot as api.binance.com appears blocked/SSL-broken
SPOT_API_URL = "https://data-api.binance.vision/api/v3"
FUTURES_API_URL = "https://fapi.binance.com/fapi/v1"

async def get_db_pool():
    try:
        pool = await asyncpg.create_pool(DATABASE_URL)
        return pool
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)

async def fetch_top_15_symbols(session, market_type):
    print(f"🔍 Fetching Top 15 {market_type} coins by 24h Volume...")
    try:
        if market_type == 'spot':
            url = f"{SPOT_API_URL}/ticker/24hr"
        else:
            url = f"{FUTURES_API_URL}/ticker/24hr"

        async with session.get(url) as response:
            if response.status != 200:
                print(f"❌ Error fetching tickers: {response.status}")
                return []
            data = await response.json()
            
            # Filter USDT pairs
            pairs = [d for d in data if d['symbol'].endswith('USDT')]
            
            # Sort by quoteVolume (descending)
            pairs.sort(key=lambda x: float(x['quoteVolume']), reverse=True)
            
            top_15 = [d['symbol'] for d in pairs[:15]]
            print(f"✅ Top 15: {', '.join(top_15)}")
            return top_15
    except Exception as e:
        print(f"❌ Error fetching Top 15: {e}")
        return []

async def fetch_candles(session, symbol, interval, market_type, limit=5000):
    candles = []
    end_time = None # Current time
    
    if market_type == 'spot':
        url = f"{SPOT_API_URL}/klines"
        limit_per_req = 1000
    else:
        url = f"{FUTURES_API_URL}/klines"
        limit_per_req = 1000  # Futures max limit is 1500, but 1000 is safe

    total_fetched = 0
    print(f"   ⏳ Fetching {symbol} {interval}...")

    # Loop needed to get 5000 (Binance limit is usually 1000 per call)
    while total_fetched < limit:
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit_per_req
        }
        if end_time:
            params["endTime"] = end_time

        try:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    text = await response.text()
                    print(f"      ❌ API Error {response.status}: {text}")
                    break
                
                data = await response.json()
                if not data:
                    break
                
                # Prepend to keep chronological order (we go backwards)
                # But actually we just collect all batches and sort later
                candles.extend(data)
                
                total_fetched += len(data)
                
                # Oldest candle in this batch is the first one [0]
                # Open time is index 0
                first_open_time = data[0][0]
                
                # Next request should end before this open time
                end_time = first_open_time - 1
                
                if len(data) < limit_per_req:
                    # No more data available
                    break
                    
                await asyncio.sleep(0.1) # Rate limit protection

        except Exception as e:
            print(f"      ❌ Request Failed (URL: {url}): {e}")
            break

    # Sort by timestamp (oldest first)
    candles.sort(key=lambda x: x[0])
    
    # Trim to exact limit if we got more
    if len(candles) > limit:
        candles = candles[-limit:]
        
    return candles

async def save_to_db(pool, symbol, interval, candles, market_type):
    if not candles:
        return

    table_name = "binance_data" if market_type == 'spot' else "binance_futures"
    
    # Prepare data
    records = []
    for c in candles:
        # Binance kline: [open_time, open, high, low, close, volume, ...]
        ts = datetime.utcfromtimestamp(c[0] / 1000)
        records.append((
            symbol,
            interval,
            ts,
            float(c[1]), # open
            float(c[2]), # high
            float(c[3]), # low
            float(c[4]), # close
            float(c[5])  # volume
        ))

    async with pool.acquire() as conn:
        async with conn.transaction():
            # 1. Delete old data
            # print(f"   🗑️  Cleaning old data for {symbol} {interval} in {table_name}...")
            await conn.execute(f"""
                DELETE FROM {table_name}
                WHERE coin_id = $1 AND interval = $2
            """, symbol, interval)
            
            # 2. Bulk Insert
            # print(f"   💾 Inserting {len(records)} records...")
            await conn.copy_records_to_table(
                table_name,
                columns=['coin_id', 'interval', 'timestamp', 'open', 'high', 'low', 'close', 'volume'],
                records=records
            )
    print(f"   ✅ {symbol} {interval}: Saved {len(records)} candles.")

async def main():
    print("Welcome to Whaleer Data Fixer 🐳")
    print("---------------------------------")
    
    # 1. Market Selection
    print("Select Market Type:")
    print("1. Spot")
    print("2. Futures")
    choice = input("Choice (1/2): ").strip()
    market_type = 'spot' if choice == '1' else 'futures'
    print(f"Selected: {market_type.upper()}")

    # 2. Symbol Selection
    print("\nEnter Symbols:")
    print("- Type comma separated list (e.g. BTCUSDT, ETHUSDT)")
    print("- Type 'TOP15' for top 15 by volume")
    sym_input = input("Symbols: ").strip().upper()
    
    pool = await get_db_pool()
    timeout = aiohttp.ClientTimeout(total=60)
    
    # Use standard connector
    async with aiohttp.ClientSession(timeout=timeout) as session:
        
        symbols = []
        if sym_input == 'TOP15':
            symbols = await fetch_top_15_symbols(session, market_type)
        else:
            symbols = [s.strip() for s in sym_input.split(',') if s.strip()]
        
        if not symbols:
            print("❌ No symbols selected.")
            return

        # 3. Interval Selection
        print("\nEnter Intervals (comma separated, e.g. 1m, 5m, 1h):")
        int_input = input("Intervals: ").strip()
        intervals = [i.strip() for i in int_input.split(',') if i.strip()]
        
        if not intervals:
            print("❌ No intervals selected.")
            return

        print("\n---------------------------------")
        print(f"Processing {len(symbols)} symbols x {len(intervals)} intervals...")
        print("---------------------------------")

        for symbol in symbols:
            for interval in intervals:
                candles = await fetch_candles(session, symbol, interval, market_type)
                if candles:
                    await save_to_db(pool, symbol, interval, candles, market_type)
                else:
                    print(f"   ⚠️ No data found for {symbol} {interval}")

    await pool.close()
    print("\n✅ All operations completed.")

if __name__ == "__main__":
    if sys.platform.startswith('win'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Aborted by user.")
