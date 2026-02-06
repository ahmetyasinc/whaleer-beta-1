

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

class StreamStatus:
    """Stream ve ListenKey durumları için SMALLINT karşılıkları"""
    NEW = 1      # Yeni oluşturuldu, henüz bağlanmadı
    ACTIVE = 2   # WebSocket bağlantısı kuruldu ve veri akıyor
    EXPIRED = 3  # ListenKey süresi doldu (60 dk geçti)
    CLOSED = 4   # Kullanıcı veya sistem tarafından kapatıldı
    ERROR = 5    # Bağlantı hatası veya yetki sorunu var


class StreamConfig:
    """
    WebSocket (Stream) yönetim ayarları.
    """
    MAX_KEYS_PER_BUS = 200 
    LISTEN_KEY_REFRESH_INTERVAL = 45 * 60 
    WS_PING_INTERVAL = 20 
    WS_TIMEOUT = 10 
    RECONNECT_INITIAL_DELAY = 2  
    RECONNECT_MAX_DELAY = 30     
    RECONNECT_BACKOFF_FACTOR = 2

class BalanceEvent:
    MAP = {
        # --- SPOT MARKET EVENTS ---
        # Spot hesap bakiyesinde bir değişiklik olduğunda gelir
        "outboundAccountPosition": MarketType.SPOT,        # Spot bakiye değişimi (hesap durumu)

        # Spot bakiyesi güncellendiğinde gelir
        "balanceUpdate": MarketType.SPOT,                 # Spot balance update (wallet değişimi)

        # Spot emirler ile ilgili durum güncellemelerinde gelir
        "executionReport": MarketType.SPOT,               # Spot emir güncelleme/işlem raporu

        # Spot bir “order list” (örn OCO) için status değişimi geldiğinde
        "listStatus": MarketType.SPOT,                    # Spot list order status event

        # Spot wallet üzerindeki external lock/unlock güncellemesi
        "externalLockUpdate": MarketType.SPOT,             # Spot wallet lock/unlock update

        "eventStreamTerminated": MarketType.SPOT,

        
        # --- FUTURES MARKET EVENTS ---
        # Futures hesapta bakiye veya pozisyon değiştiğinde gelir
        "ACCOUNT_UPDATE": MarketType.FUTURES,             # Futures hesap balance/position update

        # Futures emirleri ile ilgili güncellemeler geldiğinde
        "ORDER_TRADE_UPDATE": MarketType.FUTURES,         # Futures emir update ve trade bilgisi

        # Futures hesap ayarları değiştiğinde (örn kaldıraç)
        "ACCOUNT_CONFIG_UPDATE": MarketType.FUTURES,      # Futures hesap configuration (settings) update

        "listenKeyExpired": MarketType.FUTURES,

        # --- OPTIONAL / EXTRA FUTURES EVENTS ---
        # Daha hızlı trade odaklı event (sadece trade execution push eder)
        "TRADE_LITE": MarketType.FUTURES,                 # Futures lightweight trade update

        # Koşullu (conditional) emirlerin trade güncellemesi
        "CONDITIONAL_ORDER_TRADE_UPDATE": MarketType.FUTURES,  # Futures conditional order trade update

        # Kullanıcının risk seviyesi değiştiğinde (bazı ürünlerde)
        "RISK_LEVEL_CHANGE": MarketType.FUTURES,          # Account risk level change

        # Marjin çağrısı olduğunda (margin call) gelir
        "MARGIN_CALL": MarketType.FUTURES,                # Margin call event

        # Likidasyon tetiklendiğinde gelir
        "LIQUIDATION_ORDER": MarketType.FUTURES           # Liquidation order event
    }


class SystemLimits:
    """
    🔥 MERKEZİ KONTROL: Sistemin tüm hız ve kapasite limitleri.
    Sunucuyu büyüttüğünde veya limitleri değiştirmek istediğinde sadece burayı güncelle.
    """
    # WebSocket: Tek bir Node (Otobüs) kaç kullanıcı taşıyacak?
    WS_NODE_CAPACITY = 200 
    
    # REST: Dakikada maksimum kaç ListenKey yenilenebilir? (IP Ban koruması)
    MAX_REFRESH_PER_MINUTE = 500
    
    # Auth: Binance'e aynı anda kaç paralel istek gönderilsin?
    AUTH_CONCURRENCY = 10
    
    # Auth: Paralel istekler arasında kaç saniye beklensin? (Damlama hızı)
    AUTH_DELAY = 0.1
    
    # Buffer: Veritabanına yazmadan önce veriler kaç saniye biriktirilsin?
    WS_FLUSH_INTERVAL = 2



def get_market_label(market_type_id: int) -> str:
    """ID'den okunabilir etiket döner (Loglama için)"""
    return "SPOT" if market_type_id == MarketType.SPOT else "FUTURES"