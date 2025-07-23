# price_cache_new.py
"""
WebSocket tabanlı fiyat cache yöneticisi - Minimal ve verimli versiyon
Binance WebSocket'lerden gelen fiyat verilerini sadece RAM'de tutar.
Veritabanı kayıt yok, sadece hızlı fiyat erişimi.
"""

import asyncio
import aiohttp
import json
import time
import logging
from typing import List, Tuple, Dict, Optional
from collections import defaultdict

# Logging ayarları
logger = logging.getLogger(__name__)

# Global cache'ler - Ana veri yapıları
price_cache_spot = {}
price_cache_futures = {}

# Timestamp cache'leri - Fiyat güncellik kontrolü için
price_timestamps_spot = {}
price_timestamps_futures = {}

# Global lock'lar - Thread-safe erişim için
locks_spot = defaultdict(asyncio.Lock)
locks_futures = defaultdict(asyncio.Lock)

# WebSocket connection durumları
_connection_pool = {
    "spot": {
        "websocket": None,
        "session": None,
        "connected": False,
        "last_message_time": None,
        "last_reconnect_time": None
    },
    "futures": {
        "websocket": None,
        "session": None,
        "connected": False,
        "last_message_time": None,
        "last_reconnect_time": None
    }
}

# Connection task'ları
_connection_tasks = {
    "spot": None,
    "futures": None,
    "disconnect_monitor": None
}

class PriceStats:
    """Basit fiyat istatistikleri - memory only"""
    
    def __init__(self):
        self.request_count = 0
        self.batch_request_count = 0
        self.start_time = time.time()
        self.messages_received = {"spot": 0, "futures": 0}
    
    def increment_request(self):
        """Tek fiyat isteği sayacını artır"""
        self.request_count += 1
    
    def increment_batch_request(self, batch_size: int):
        """Batch fiyat isteği sayacını artır"""
        self.batch_request_count += 1
    
    def update_message_count(self, market_type: str):
        """WebSocket mesaj sayısını güncelle"""
        self.messages_received[market_type] += 1
    
    def get_uptime(self) -> float:
        """Sistem çalışma süresini döndür (saniye)"""
        return time.time() - self.start_time
    
    def get_stats(self) -> Dict:
        """Tüm istatistikleri döndür"""
        return {
            "request_count": self.request_count,
            "batch_request_count": self.batch_request_count,
            "uptime_seconds": self.get_uptime(),
            "messages_received": self.messages_received,
            "cache_sizes": {
                "spot": len(price_cache_spot),
                "futures": len(price_cache_futures)
            }
        }

class WebSocketConnectionManager:
    """WebSocket bağlantı yöneticisi - Minimal kopma kontrolü"""
    
    def __init__(self):
        self.is_running = False
        self.stats = PriceStats()
        self.max_silence_seconds = 60  # 1 dakika sessizlik = kopma
        self.reconnect_delay = 3  # 3 saniye bekle
        
        # WebSocket URL'leri
        self.websocket_urls = {
            "spot": "wss://stream.binance.com:9443/ws/!miniTicker@arr",
            "futures": "wss://fstream.binance.com/ws/!miniTicker@arr"
        }
    
    async def start_connection_pool(self):
        """Connection pool'u başlat - tek seferlik"""
        if self.is_running:
            print("⚠️ Connection pool zaten çalışıyor")
            return
        
        self.is_running = True
        print("🚀 WebSocket Connection Pool başlatılıyor...")
        
        # Her market için connection task'ı başlat
        _connection_tasks["spot"] = asyncio.create_task(self._maintain_spot_connection())
        _connection_tasks["futures"] = asyncio.create_task(self._maintain_futures_connection())
        _connection_tasks["disconnect_monitor"] = asyncio.create_task(self._monitor_disconnections())
        
        # Bağlantıların kurulması için kısa bekle
        await asyncio.sleep(2)
        
        print("✅ WebSocket Connection Pool başlatıldı")
    
    async def stop_connection_pool(self):
        """Connection pool'u durdur"""
        if not self.is_running:
            return
        
        self.is_running = False
        print("🔴 WebSocket Connection Pool durduruluyor...")
        
        # Tüm task'ları iptal et
        for task_name, task in _connection_tasks.items():
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        # Bağlantıları kapat
        for market_type in ["spot", "futures"]:
            conn = _connection_pool[market_type]
            if conn["websocket"] and not conn["websocket"].closed:
                await conn["websocket"].close()
            if conn["session"] and not conn["session"].closed:
                await conn["session"].close()
            conn["connected"] = False
        
        print("✅ WebSocket Connection Pool durduruldu")
    
    async def _maintain_spot_connection(self):
        """Spot WebSocket bağlantısını sürekli canlı tut"""
        while self.is_running:
            try:
                await self._connect_and_listen("spot")
            except Exception as e:
                logger.error(f"❌ Spot bağlantı hatası: {e}")
                await asyncio.sleep(self.reconnect_delay)
    
    async def _maintain_futures_connection(self):
        """Futures WebSocket bağlantısını sürekli canlı tut"""
        while self.is_running:
            try:
                await self._connect_and_listen("futures")
            except Exception as e:
                logger.error(f"❌ Futures bağlantı hatası: {e}")
                await asyncio.sleep(self.reconnect_delay)
    
    async def _connect_and_listen(self, market_type: str):
        """Belirli market için bağlantı kur ve dinle"""
        conn = _connection_pool[market_type]
        url = self.websocket_urls[market_type]
        
        try:
            # Yeni session oluştur
            conn["session"] = aiohttp.ClientSession()
            
            # WebSocket bağlantısı kur
            conn["websocket"] = await conn["session"].ws_connect(url)
            conn["connected"] = True
            conn["last_reconnect_time"] = time.time()
            
            print(f"🟢 {market_type.title()} WebSocket bağlandı")
            
            # Mesajları dinle
            async for msg in conn["websocket"]:
                if not self.is_running:
                    break
                
                if msg.type == aiohttp.WSMsgType.TEXT:
                    await self._process_message(market_type, msg.data)
                    
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f"❌ {market_type.title()} WebSocket hatası: {msg.data}")
                    break
                
        except Exception as e:
            logger.error(f"❌ {market_type.title()} bağlantı hatası: {e}")
            conn["connected"] = False
            await asyncio.sleep(self.reconnect_delay)
        
        finally:
            # Bağlantıyı temizle
            if conn["websocket"] and not conn["websocket"].closed:
                await conn["websocket"].close()
            if conn["session"] and not conn["session"].closed:
                await conn["session"].close()
            conn["connected"] = False
    
    async def _process_message(self, market_type: str, data: str):
        """WebSocket mesajını işle ve cache'i güncelle - sadece memory"""
        try:
            message_data = json.loads(data)
            current_time = time.time()
            
            # İstatistikleri güncelle
            self.stats.update_message_count(market_type)
            _connection_pool[market_type]["last_message_time"] = current_time
            
            # Fiyat verilerini cache'e yaz
            if market_type == "spot":
                for ticker in message_data:
                    symbol = ticker['s']
                    price = float(ticker['c'])
                    
                    async with locks_spot[symbol]:
                        price_cache_spot[symbol] = price
                        price_timestamps_spot[symbol] = current_time
                        
            elif market_type == "futures":
                for ticker in message_data:
                    symbol = ticker['s']
                    price = float(ticker['c'])
                    
                    async with locks_futures[symbol]:
                        price_cache_futures[symbol] = price
                        price_timestamps_futures[symbol] = current_time
                
        except json.JSONDecodeError:
            logger.error(f"❌ {market_type.title()} JSON parse hatası")
        except Exception as e:
            logger.error(f"❌ {market_type.title()} mesaj işleme hatası: {e}")
    
    async def _monitor_disconnections(self):
        """Kopma durumunu kontrol et - basit ama etkili"""
        while self.is_running:
            try:
                current_time = time.time()
                
                for market_type in ["spot", "futures"]:
                    conn = _connection_pool[market_type]
                    
                    # Son mesaj zamanını kontrol et
                    if conn["last_message_time"]:
                        silence_duration = current_time - conn["last_message_time"]
                        
                        # Çok uzun süre sessizse kopma var
                        if silence_duration > self.max_silence_seconds:
                            print(f"⚠️ {market_type.title()} kopma tespit edildi: {silence_duration:.1f}s sessizlik")
                            
                            # Bağlantıyı test et
                            if conn["connected"]:
                                print(f"🔄 {market_type.title()} bağlantısı test ediliyor...")
                                
                                # WebSocket'i kapat - otomatik yeniden bağlanacak
                                if conn["websocket"] and not conn["websocket"].closed:
                                    await conn["websocket"].close()
                    
                    # İlk bağlantı kurulmamışsa kontrol et
                    elif conn["connected"] is False:
                        if conn["last_reconnect_time"]:
                            reconnect_duration = current_time - conn["last_reconnect_time"]
                            if reconnect_duration > 30:  # 30 saniyeden fazla bağlanamıyorsa
                                print(f"⚠️ {market_type.title()} uzun süredir bağlanamıyor: {reconnect_duration:.1f}s")
                
                # 30 saniyede bir kontrol
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.error(f"❌ Kopma kontrolü hatası: {e}")
                await asyncio.sleep(10)
    
    def get_connection_status(self) -> Dict:
        """Basit bağlantı durumu döndür"""
        status = {}
        current_time = time.time()
        
        for market_type in ["spot", "futures"]:
            conn = _connection_pool[market_type]
            
            # Son mesaj zamanından bu yana geçen süre
            silence_duration = None
            if conn["last_message_time"]:
                silence_duration = current_time - conn["last_message_time"]
            
            status[market_type] = {
                "connected": conn["connected"],
                "silence_seconds": silence_duration,
                "is_healthy": silence_duration is None or silence_duration < self.max_silence_seconds
            }
            
        return status

# Global connection manager instance - tek instance
_connection_manager = WebSocketConnectionManager()

# Ana API fonksiyonları
async def start_connection_pool():
    """Connection pool'u başlat - tek seferlik"""
    await _connection_manager.start_connection_pool()

async def stop_connection_pool():
    """Connection pool'u durdur"""
    await _connection_manager.stop_connection_pool()

async def get_price(symbol: str, market_type: str) -> Optional[float]:
    """
    Tek fiyat alma - Ana fonksiyon
    
    Args:
        symbol: Coin sembolü (örn: "BTCUSDT")
        market_type: "spot" veya "futures"
    
    Returns:
        Fiyat değeri veya None
    """
    _connection_manager.stats.increment_request()
    
    if market_type == "spot":
        return price_cache_spot.get(symbol)
    elif market_type == "futures":
        return price_cache_futures.get(symbol)
    else:
        raise ValueError("market_type 'spot' veya 'futures' olmalı")

async def get_multiple_prices(requests: List[Tuple[str, str]]) -> Dict[str, Optional[float]]:
    """
    Batch fiyat alma - Yüksek performans için
    
    Args:
        requests: [(symbol, market_type), ...] listesi
    
    Returns:
        {symbol: price} dictionary'si
    """
    _connection_manager.stats.increment_batch_request(len(requests))
    
    results = {}
    for symbol, market_type in requests:
        if market_type == "spot":
            results[symbol] = price_cache_spot.get(symbol)
        elif market_type == "futures":
            results[symbol] = price_cache_futures.get(symbol)
        else:
            results[symbol] = None
    
    return results

async def get_all_prices() -> Dict[str, Dict[str, Optional[float]]]:
    """
    Tüm cache'lenmiş fiyatları döndür
    
    Returns:
        {"spot": {symbol: price}, "futures": {symbol: price}}
    """
    return {
        "spot": dict(price_cache_spot),
        "futures": dict(price_cache_futures)
    }

async def get_price_with_freshness(symbol: str, market_type: str, max_age_seconds: int = 10) -> Tuple[Optional[float], bool]:
    """
    Fiyat ve veri tazeliği bilgisi ile birlikte döndür
    
    Args:
        symbol: Coin sembolü (örn: "BTCUSDT")
        market_type: "spot" veya "futures"
        max_age_seconds: Maksimum veri yaşı (saniye)
    
    Returns:
        (fiyat, veri_taze_mi) tuple'ı
    """
    _connection_manager.stats.increment_request()
    
    if market_type == "spot":
        price = price_cache_spot.get(symbol)
        timestamp = price_timestamps_spot.get(symbol)
    elif market_type == "futures":
        price = price_cache_futures.get(symbol)
        timestamp = price_timestamps_futures.get(symbol)
    else:
        raise ValueError("market_type 'spot' veya 'futures' olmalı")
    
    if price is None or timestamp is None:
        return None, False
    
    # Veri tazeliği kontrolü
    age = time.time() - timestamp
    is_fresh = age <= max_age_seconds
    
    return price, is_fresh

def get_cache_stats() -> Dict:
    """Cache istatistiklerini döndür"""
    return _connection_manager.stats.get_stats()

def get_connection_status() -> Dict:
    """Bağlantı durumunu döndür"""
    return _connection_manager.get_connection_status()

def get_symbols_by_market_type(market_type: str) -> List[str]:
    """Market tipine göre sembolleri listele"""
    if market_type == "spot":
        return list(price_cache_spot.keys())
    elif market_type == "futures":
        return list(price_cache_futures.keys())
    else:
        raise ValueError("market_type 'spot' veya 'futures' olmalı")

async def force_reconnect(market_type: str = None):
    """
    Bağlantıyı zorla yeniden kur
    
    Args:
        market_type: "spot", "futures" veya None (hepsi için)
    """
    if market_type:
        markets = [market_type]
    else:
        markets = ["spot", "futures"]
    
    for market in markets:
        conn = _connection_pool[market]
        
        print(f"🔄 {market.title()} bağlantısı zorla yenileniyor...")
        
        # Mevcut bağlantıyı kapat
        if conn["websocket"] and not conn["websocket"].closed:
            await conn["websocket"].close()
        if conn["session"] and not conn["session"].closed:
            await conn["session"].close()
        
        conn["connected"] = False

def is_cache_ready() -> bool:
    """Cache'in hazır olup olmadığını kontrol et"""
    spot_ready = len(price_cache_spot) > 0
    futures_ready = len(price_cache_futures) > 0
    return spot_ready and futures_ready

def get_cached_symbol_count() -> Dict[str, int]:
    """Market tipine göre cache'lenmiş sembol sayısını döndür"""
    return {
        "spot": len(price_cache_spot),
        "futures": len(price_cache_futures),
        "total": len(price_cache_spot) + len(price_cache_futures)
    }

async def wait_for_cache_ready(timeout_seconds: int = 30) -> bool:
    """
    Cache'in hazır olmasını bekle
    
    Args:
        timeout_seconds: Maksimum bekleme süresi
    
    Returns:
        Cache hazır mı?
    """
    start_time = time.time()
    
    while time.time() - start_time < timeout_seconds:
        if is_cache_ready():
            print("✅ Price cache hazır")
            return True
        
        await asyncio.sleep(1)
    
    print("⚠️ Price cache timeout süresi aşıldı")
    return False

# Kullanım Örneği - en basit
async def example_usage():
    """Basit kullanım örneği"""
    
    # Connection pool'u başlat
    await start_connection_pool()
    
    try:
        # Cache'in hazır olmasını bekle
        cache_ready = await wait_for_cache_ready(timeout_seconds=15)
        
        if cache_ready:
            # Tek fiyat al
            btc_price = await get_price("BTCUSDT", "spot")
            print(f"BTC Spot: ${btc_price}")
            
            # Batch fiyat al
            requests = [("BTCUSDT", "spot"), ("ETHUSDT", "spot"), ("ADAUSDT", "futures")]
            prices = await get_multiple_prices(requests)
            print(f"Batch Fiyatlar: {prices}")
            
            # Bağlantı durumu
            status = get_connection_status()
            print(f"Bağlantı Durumu: {status}")
            
            # Cache istatistikleri
            stats = get_cache_stats()
            print(f"İstatistikler: {stats}")
            
            # Sembol sayıları
            symbol_count = get_cached_symbol_count()
            print(f"Sembol Sayıları: {symbol_count}")
        else:
            print("❌ Cache hazırlanamadı")
        
    finally:
        # Durdur
        await stop_connection_pool()

# Backward compatibility
async def start_websocket_services():
    """Eski API uyumluluğu için"""
    await start_connection_pool()

async def stop_websocket_services():
    """Eski API uyumluluğu için"""
    await stop_connection_pool()

# Global stats instance
price_stats = _connection_manager.stats

# Test fonksiyonu
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    asyncio.run(example_usage())