# backend/trade_engine/exchange/factory.py
from backend.trade_engine.balance.definitions import ExchangeID
from backend.trade_engine.network_binance import BinanceNetworkAdapter
from backend.trade_engine.balance.exchange.binance.services import BinanceService

class ExchangeFactory:
    _instances = {}

    @classmethod
    def get_service(cls, exchange_id: int):
        if exchange_id in cls._instances:
            return cls._instances[exchange_id]

        if exchange_id == ExchangeID.BINANCE:
            # Binance Network Adaptörünü oluştur (Limit Takibi İçin)
            network = BinanceNetworkAdapter() 
            service = BinanceService(network)
            cls._instances[exchange_id] = service
            return service
        
        # İleride:
        # elif exchange_id == ExchangeID.OKX: ...
        
        else:
            raise ValueError(f"Desteklenmeyen Borsa ID: {exchange_id}")