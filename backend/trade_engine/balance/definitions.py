

class ExchangeID:
    """Borsa tanımları için SMALLINT karşılıkları"""
    BINANCE = 1
    # OKX = 2  # İleride eklenebilir
    # BYBIT = 3

class MarketType:
    """İşlem tipi tanımları için SMALLINT karşılıkları"""
    SPOT = 1
    FUTURES = 2

class WSUrl:
    """WebSocket ana bağlantı adresleri (Dinamik Stream URL'leri)"""
    BINANCE_SPOT = "wss://stream.binance.com:9443/stream"
    BINANCE_FUTURES = "wss://fstream.binance.com/stream"

class BalanceEvent:
    """
    Binance'den gelen bakiye güncelleme event isimleri.
    Bu eşleşme, gelen ham verinin hangi MarketType'a ait olduğunu belirler.
    """
    # Spot: outboundAccountPosition (Hesap durumu değiştiğinde gelir)
    # Futures: ACCOUNT_UPDATE (Bakiye veya pozisyon değiştiğinde gelir)
    MAP = {
        "outboundAccountPosition": MarketType.SPOT,
        "ACCOUNT_UPDATE": MarketType.FUTURES
    }

def get_market_label(market_type_id: int) -> str:
    """ID'den okunabilir etiket döner (Loglama için)"""
    return "SPOT" if market_type_id == MarketType.SPOT else "FUTURES"