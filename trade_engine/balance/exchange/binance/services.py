# backend/trade_engine/exchange/binance/services.py
import logging
import time
import hmac
import hashlib
from typing import Optional, List
from urllib.parse import urlencode

from backend.trade_engine.balance.exchange.base import BaseExchangeService
from backend.trade_engine.balance.definitions import MarketType
from backend.trade_engine.balance.core.network_binance import BinanceNetworkAdapter
logger = logging.getLogger("BinanceService")

class BinanceService(BaseExchangeService):
    def __init__(self, network: BinanceNetworkAdapter):
        self.network = network
        self.endpoints = {
            MarketType.SPOT: "https://api.binance.com",
            MarketType.FUTURES: "https://fapi.binance.com"
        }

    async def get_listen_key(self, api_key: str, market_type: int) -> Optional[str]:
        base_url = self.endpoints.get(market_type)
        path = "/api/v3/userDataStream" if market_type == MarketType.SPOT else "/fapi/v1/listenKey"
        
        # Binance kuralı: Header'da API Key olmalı
        headers = {"X-MBX-APIKEY": api_key}
        
        resp = await self.network.post(f"{base_url}{path}", headers=headers)
        
        if resp.success and resp.data:
            return resp.data.get("listenKey")
        else:
            logger.error(f"❌ ListenKey Hatası ({market_type}): {resp.error_msg}")
            return None

    async def keep_alive_listen_key(self, api_key: str, listen_key: str, market_type: int) -> bool:
        base_url = self.endpoints.get(market_type)
        path = "/api/v3/userDataStream" if market_type == MarketType.SPOT else "/fapi/v1/listenKey"
        
        headers = {"X-MBX-APIKEY": api_key}
        params = {"listenKey": listen_key} # Spot parametre ister
        
        # Futures bazen body ister, duruma göre özelleştirilebilir ama PUT genelde params kabul eder
        resp = await self.network.put(f"{base_url}{path}", headers=headers, params=params)
        return resp.success

    async def get_balance_snapshot(self, api_key: str, api_secret: str, market_type: int) -> list:
        """
        REST üzerinden imzalı (Signed) bakiye isteği.
        """
        base_url = self.endpoints.get(market_type)
        if market_type == MarketType.SPOT:
            path = "/api/v3/account"
            balance_key = "balances" # Spot yanıtı: {'balances': [...]}
        else:
            path = "/fapi/v2/account"
            balance_key = "assets"   # Futures yanıtı: {'assets': [...]}

        # İmza Oluşturma (Signature)
        timestamp = int(time.time() * 1000)
        params = {"timestamp": timestamp}
        query_string = urlencode(params)
        signature = hmac.new(api_secret.encode('utf-8'), query_string.encode('utf-8'), hashlib.sha256).hexdigest()
        
        full_url = f"{base_url}{path}?{query_string}&signature={signature}"
        headers = {"X-MBX-APIKEY": api_key}

        resp = await self.network.get(full_url, headers=headers)
        
        if resp.success and resp.data:
            raw_balances = resp.data.get(balance_key, [])
            return self._normalize_balances(raw_balances, market_type)
        return []

    def _normalize_balances(self, raw_data: list, market_type: int) -> list:
        """
        Binance verisini bizim standart formata çevirir.
        Girdi: [{'asset': 'BTC', 'free': '0.1'}]
        Çıktı: [{'asset': 'BTC', 'free': 0.1, 'locked': 0.0}]
        """
        normalized = []
        for item in raw_data:
            # Spot: asset, Futures: asset veya assetName
            asset = item.get('asset') or item.get('assetName')
            # Spot: free/locked, Futures: availableBalance/maintMargin vb.
            # Basitlik için Futures'da walletBalance kullanacağız
            
            if market_type == MarketType.SPOT:
                free = float(item.get('free', 0))
                locked = float(item.get('locked', 0))
            else:
                # Futures yapısı biraz farklıdır, 'walletBalance' ve 'availableBalance'
                # Burada walletBalance'ı total, available'ı free kabul edelim
                total = float(item.get('walletBalance', 0))
                free = float(item.get('availableBalance', 0))
                locked = total - free

            if free > 0 or locked > 0:
                normalized.append({
                    "asset": asset,
                    "free": free,
                    "locked": locked
                })
        return normalized