import logging, asyncio
from typing import List, Dict, Optional

from trade_engine.balance.definitions import MarketType, ExchangeID, SystemLimits
from trade_engine.balance.exchange.factory import ExchangeFactory

logger = logging.getLogger("StreamAuthManager")

class StreamAuthManager:
    def __init__(self):
        # 👈 Limitler buradan geliyor
        self.CONCURRENCY_LIMIT = SystemLimits.AUTH_CONCURRENCY
        self.REQUEST_DELAY = SystemLimits.AUTH_DELAY

    async def onboard_batch_users(self, users: List[Dict], market_type: int) -> List[Dict]:
        results = []
        # Semaphore limiti artık definitions'dan geliyor
        semaphore = asyncio.Semaphore(self.CONCURRENCY_LIMIT)
        
        async def _safe_process(user):
            async with semaphore:
                await asyncio.sleep(self.REQUEST_DELAY)
                return await self._process_single_user(user, market_type)

        tasks = [_safe_process(user) for user in users]
        processed_users = await asyncio.gather(*tasks)
        
        return [u for u in processed_users if u is not None]

    async def _process_single_user(self, user: Dict, market_type: int) -> Optional[Dict]:
        """
        Tek bir kullanıcı için ListenKey ve Bakiye alır.
        """
        try:
            user_id = user.get('user_id')
            # Trigger payload'unda id = api_keys.id gelir, bunu api_id olarak alalım
            api_id = user.get('id') or user.get('api_id')
            
            exchange_id = user.get('exchange_id', ExchangeID.BINANCE) 
            api_key = user.get('api_key')
            api_secret = user.get('api_secret')

            # --- FABRİKADAN İŞÇİ ÇAĞIR ---
            exchange_service = ExchangeFactory.get_service(exchange_id)
            
            # 1. ListenKey İste
            listen_key = await exchange_service.get_listen_key(api_key, market_type)
            if not listen_key:
                return None

            # 2. Bakiye İste (Opsiyonel, varsa çek)
            balances = []
            if api_secret:
                balances = await exchange_service.get_balance_snapshot(api_key, api_secret, market_type)
                # Bakiye verisine meta-data ekle (DB için)
                for b in balances:
                    b.update({'user_id': user_id, 'api_id': api_id, 'market_type': market_type})

            return {
                "user_id": user_id,
                "api_id": api_id,
                "exchange_id": exchange_id,
                "listen_key": listen_key,
                "balances": balances
            }

        except Exception as e:
            logger.error(f"User Auth Error (UID: {user.get('user_id')}): {e}")
            return None