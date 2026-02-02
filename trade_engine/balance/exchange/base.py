# backend/trade_engine/exchange/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class BaseExchangeService(ABC):
    """
    Tüm borsaların (Binance, OKX, Bybit) uyması gereken ortak arayüz.
    """
    
    @abstractmethod
    async def get_listen_key(self, api_key: str, market_type: int) -> Optional[str]:
        """WebSocket için gerekli olan ListenKey'i alır."""
        pass

    @abstractmethod
    async def keep_alive_listen_key(self, api_key: str, listen_key: str, market_type: int) -> bool:
        """ListenKey süresini uzatır (Heartbeat)."""
        pass

    @abstractmethod
    async def get_balance_snapshot(self, api_key: str, api_secret: str, market_type: int) -> list:
        """
        REST API üzerinden anlık bakiye çeker.
        Dönüş Formatı: [{'asset': 'BTC', 'free': 0.1, 'locked': 0.0}, ...]
        """
        pass