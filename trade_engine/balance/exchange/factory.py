from trade_engine.balance.definitions import ExchangeID
from trade_engine.balance.core.network_binance import BinanceNetworkAdapter
from trade_engine.balance.exchange.binance.services import BinanceService

class ExchangeFactory:
    _instances = {}

    @classmethod
    def get_service(cls, exchange_id):
        # exchange_id veritabanından "Binance" (string) veya 1 (int) gelebilir
        # Hepsini standart bir kimliğe çeviriyoruz
        if str(exchange_id).lower() == "binance":
            exchange_id = ExchangeID.BINANCE
        
        if exchange_id in cls._instances:
            return cls._instances[exchange_id]

        if exchange_id == ExchangeID.BINANCE:
            network = BinanceNetworkAdapter() 
            service = BinanceService(network)
            cls._instances[exchange_id] = service
            return service
        
        else:
            raise ValueError(f"Desteklenmeyen Borsa ID: {exchange_id}")