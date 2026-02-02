import logging
import asyncio
from typing import Dict, Any

# Eğer core klasörü içindeyse tam yolu kullanıyoruz:
from backend.trade_engine.balance.core.network_adapter import AsyncNetworkAdapter

# Logger Tanımları
logger = logging.getLogger("BinanceNetwork")

class BinanceNetworkAdapter(AsyncNetworkAdapter):
    """
    Binance API'sine özel limit headerlarını okuyan ve
    tehlikeli sınırlara gelindiğinde otomatik fren yapan adaptör.
    """
    
    # =========================================================
    # 🛡️ GÜVENLİK AYARLARI
    # =========================================================
    # Binance genelde 1200 limit verir. Biz 1150'de frene basarız.
    MAX_WEIGHT_LIMIT = 1150 
    
    # Frene basıldığında kaç saniye beklenecek?
    # Binance limitleri her dakika başında sıfırlar, 30sn güvenli bir süredir.
    PAUSE_DURATION = 30 

    def _extract_limit_info(self, headers: Any) -> Dict[str, int]:
        """
        Her istekten dönen Header'ları okur.
        Limit dolmak üzereyse sistemi geçici olarak 'Pause' moduna alır.
        """
        limits = {}
        
        # ---------------------------------------------------------
        # 1. IP AĞIRLIK KONTROLÜ (WEIGHT) - EN KRİTİK KISIM
        # ---------------------------------------------------------
        # Header: x-mbx-used-weight-1m (Hem Spot hem Futures için ortaktır)
        if "x-mbx-used-weight-1m" in headers:
            try:
                weight = int(headers["x-mbx-used-weight-1m"])
                limits["weight_used"] = weight
                
                # Sadece limit yükseldiğinde log bas (Gürültü önleme)
                if weight > 500:
                    logger.debug(f"⚖️ [LIMIT] Anlık Weight: {weight}/1200")

                # 🔥 AKILLI FREN MEKANİZMASI (SMART BRAKING)
                if weight >= self.MAX_WEIGHT_LIMIT:
                    logger.warning(f"⚠️ IP Limiti Tehlikede! ({weight}/1200). "
                                   f"Ban yememek için {self.PAUSE_DURATION}sn soğuma molası veriliyor...")
                    
                    # 1. Adaptörü durdur (Yeni istek çıkışını engelle)
                    self._is_paused = True
                    
                    # 2. Ne zaman devam edeceğimizi belirle
                    self._pause_until = asyncio.get_running_loop().time() + self.PAUSE_DURATION
                    
            except ValueError:
                logger.error("Binance weight header parse hatası.")
            
        # ---------------------------------------------------------
        # 2. FUTURES EMİR LİMİTLERİ (Sadece Futures'ta döner)
        # ---------------------------------------------------------
        # Header: x-mbx-order-count-10s (10 saniyelik emir limiti)
        if "x-mbx-order-count-10s" in headers:
            try:
                val = int(headers["x-mbx-order-count-10s"])
                limits["orders_10s"] = val
            except ValueError:
                pass
            
        # Header: x-mbx-order-count-1m (1 dakikalık emir limiti)
        if "x-mbx-order-count-1m" in headers:
            try:
                val = int(headers["x-mbx-order-count-1m"])
                limits["orders_1m"] = val
            except ValueError:
                pass
            
        return limits