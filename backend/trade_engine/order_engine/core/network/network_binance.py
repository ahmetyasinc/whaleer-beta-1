import logging
from typing import Dict, Any
from .network_adapter import AsyncNetworkAdapter  # Base class'ı import ediyoruz

# Logger tanımlıyoruz
logger = logging.getLogger("BinanceNetwork")

class BinanceNetworkAdapter(AsyncNetworkAdapter):
    """
    Binance'e özel limit headerlarını okuyan ve yorumlayan adaptör.
    NetworkAdapter (Base) sınıfının tüm özelliklerini taşır, 
    sadece limit okuma yeteneği eklenmiştir.
    """
    
    def _extract_limit_info(self, headers: Any) -> Dict[str, int]:
        """
        Base class'taki metodu override ediyoruz (eziyoruz).
        NetworkResponse.limit_info içine bu veriler dolacak.
        """
        limits = {}
        
        # 1. IP Weight (Tüm Binance API'leri için ortak IP limiti)
        # Header: x-mbx-used-weight-1m
        if "x-mbx-used-weight-1m" in headers:
            try:
                weight = int(headers["x-mbx-used-weight-1m"])
                limits["weight_used"] = weight
                
                # 🔥 EKLENEN KISIM: Harcanan limiti loga basıyoruz
                logger.info(f"⚖️ [LIMIT] Dakikalık Kullanım (Used Weight): {weight}")
                
            except ValueError:
                pass
            
        # 2. Order Count (Sadece Futures API'lerinde döner)
        # Header: x-mbx-order-count-10s (10 saniyelik emir limiti)
        if "x-mbx-order-count-10s" in headers:
            try:
                val = int(headers["x-mbx-order-count-10s"])
                limits["orders_10s"] = val
                # İstersen emir sayısını da görebilirsin (opsiyonel)
                # logger.info(f"⚡ [LIMIT] 10sn Emir Sayısı: {val}")
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