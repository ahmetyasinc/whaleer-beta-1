
import asyncio
import os
import sys
import datetime
import pandas as pd

# Ensure backend root is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))

# Imports
from backend.trade_engine.data.last_data_load import load_last_data
from backend.trade_engine.data.data_load import fetch_all_candles

async def test_latency():
    interval = "1m"
    coin_id = "BTCUSDT"

    print(f"\n🚀 Testing Data Fetch Latency for {coin_id} {interval}...\n")

    # 1. Get Load Last Data (Reference: DB Latest)
    print("1️⃣ Fetching latest timestamp via load_last_data()...")
    # This queries 'binance_data' directly with LIMIT 1 DESC
    ref_time = load_last_data(interval)
    
    if ref_time:
        try:
            readable_ref = datetime.datetime.fromtimestamp(ref_time/1000) if ref_time > 2000000000 else datetime.datetime.fromtimestamp(ref_time)
            print(f"   ✅ DB Last Timestamp (load_last_data): {ref_time} ({readable_ref})")
        except:
             print(f"   ✅ DB Last Timestamp (load_last_data): {ref_time}")
    else:
        print("   ❌ load_last_data returned None. Is DB empty?")
        return

    # 2. Get Data via fetch_all_candles() (Bot usage simulation)
    print("2️⃣ Fetching candles via fetch_all_candles()...")
    # Simulate bot requirement: BTCUSDT, 1m, 10 candles
    reqs = {(coin_id, interval): 10}
    
    coin_data_dict = await fetch_all_candles(reqs)
    
    if (coin_id, interval) in coin_data_dict:
        df = coin_data_dict[(coin_id, interval)]
        if not df.empty:
            # Sort just in case logic changed (though it should be sorted ASC)
            #df = df.sort_values(by="timestamp") 
            
            bot_last_time = df.iloc[-1]['timestamp']
            
            try:
                readable_bot = datetime.datetime.fromtimestamp(bot_last_time/1000) if bot_last_time > 2000000000 else datetime.datetime.fromtimestamp(bot_last_time)
                print(f"   ✅ Bot Data (DataFrame) Last Timestamp: {bot_last_time} ({readable_bot})")
            except:
                print(f"   ✅ Bot Data (DataFrame) Last Timestamp: {bot_last_time}")
            
            print("\n---------------------------------------------------")
            if str(ref_time) == str(bot_last_time):
                print(f"✅ SUCCESS: Timestamps MATCH! No latency detected.")
            else:
                print(f"❌ FAILURE: Timestamps DO NOT MATCH!")
                try:
                    raw_diff = abs(ref_time - bot_last_time)
                    # assuming seconds or ms
                    diff_sec = raw_diff / 1000 if raw_diff > 2000000000 else raw_diff
                    print(f"   Difference: {diff_sec:.2f} seconds.")
                    print("   This confirms the user's suspicion of a delay/missing candle.")
                except:
                    pass
            print("---------------------------------------------------\n")

        else:
            print("   ❌ DataFrame returned empty!")
    else:
        print(f"   ❌ fetch_all_candles did not return data for {coin_id}")

if __name__ == "__main__":
    if sys.platform.startswith('win'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(test_latency())
