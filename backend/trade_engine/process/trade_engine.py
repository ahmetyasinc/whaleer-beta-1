import asyncio
import logging
from backend.trade_engine.data.bot_load import load_active_bots
from backend.trade_engine.data.strategy_load import load_strategy
from backend.trade_engine.data.indicator_load import load_indicators
from backend.trade_engine.data.data_load import fetch_all_candles

logger = logging.getLogger(__name__)

async def run_trade_engine(interval, min_timestamp=None):
    bots = load_active_bots(interval)
    if not bots:
        #logger.debug("Aktif bot bulunamadı.")
        return [], {}, []

    strategies_with_indicators = []
    coin_requirements = {}

    for bot in bots:
        strategy_code = load_strategy(bot['strategy_id'])
        indicator_list = load_indicators(bot['strategy_id'])

        strategies_with_indicators.append({
            'strategy_id': bot['strategy_id'],
            'strategy_code': strategy_code,
            'indicators': indicator_list
        })

        for coin_id in bot['stocks']:
            key = (coin_id, bot['period'])
            # Candle count check
            if key not in coin_requirements or coin_requirements[key] < bot['candle_count']:
                coin_requirements[key] = bot['candle_count']

    # --- RETRY LOOP FOR DATA CONSISTENCY ---
    max_retries = 10
    retry_delay = 0.5
    
    coin_data_dict = {}
    
    for attempt in range(max_retries):
        coin_data_dict = await fetch_all_candles(coin_requirements)
        
        if not min_timestamp:
            break

        # Check if all required data is up-to-date
        all_fresh = True
        missing_coins = []
        
        for key, df in coin_data_dict.items():
            if df.empty:
                all_fresh = False
                missing_coins.append(f"{key[0]} (EMPTY)")
                continue
                
            last_ts = df.iloc[-1]['timestamp']
            # Basic comparison: convert to string to handle type diffs (datetime vs Timestamp)
            # or use >= if types are compatible.
            # Convert both to string for safer comparison
            if str(last_ts) < str(min_timestamp):
                all_fresh = False
                missing_coins.append(f"{key[0]} ({last_ts} < {min_timestamp})")
        
        # Check if any required key is completely missing from dict
        for req_key in coin_requirements:
            if req_key not in coin_data_dict:
                all_fresh = False
                missing_coins.append(f"{req_key[0]} (MISSING)")

        if all_fresh:
            if attempt > 0:
                logger.info(f"✅ Data consistent after {attempt} retries.")
            break
        
        if attempt < max_retries - 1:
            logger.warning(f"⏳ Waiting for data consistency ({attempt+1}/{max_retries}). Missing/Stale: {missing_coins[:5]}...")
            await asyncio.sleep(retry_delay)
        else:
            logger.error(f"⚠ Max retries reached. Proceeding with potentially stale data. Missing/Stale: {missing_coins[:10]}")

    return strategies_with_indicators, coin_data_dict, bots