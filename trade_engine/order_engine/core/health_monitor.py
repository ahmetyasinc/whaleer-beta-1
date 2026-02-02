# core/health_monitor.py

import time
import socket
import psutil
from typing import Dict
from trade_engine.order_engine.core.price_store import price_store

class SystemHealthMonitor:
    def __init__(self):
        self.CPU_THRESHOLD = 80.0
        self.RAM_THRESHOLD = 85.0
        
        # --- PERFORMANS AYARLARI ---
        self.CACHE_DURATION = 5  # Saniye (Donanım ve Network'ü 5 saniyede bir kontrol et)
        
        # Son kontrol zamanı ve son sonuçları saklayalım
        self._last_check_time = 0
        self._cached_report = {}

    def _check_resources(self) -> Dict:
        """CPU ve RAM durumu (Maliyet: Düşük)"""
        try:
            cpu = psutil.cpu_percent(interval=None)
            ram = psutil.virtual_memory().percent
            status = "WARNING" if (cpu > self.CPU_THRESHOLD or ram > self.RAM_THRESHOLD) else "OK"
            return {"status": status, "cpu": f"{cpu}%", "ram": f"{ram}%"}
        except Exception as e:
            return {"status": "ERROR", "cpu": "0%", "ram": "0%"}

    def _check_network(self) -> Dict:
        """İnternet kontrolü (Maliyet: Yüksek - Bloklayabilir)"""
        try:
            # Timeout süresini kısalttık: 1 saniye içinde cevap gelmezse yok say.
            socket.create_connection(("8.8.8.8", 53), timeout=1)
            return {"status": "OK", "message": "Connected"}
        except OSError:
            return {"status": "CRITICAL", "message": "No Connection"}

    def get_full_report(self) -> Dict:
        """
        Akıllı Raporlama:
        Fiyat kontrolünü her zaman anlık yapar (Çok ucuz işlem).
        Network ve CPU kontrolünü sadece 'CACHE_DURATION' süresi dolunca yapar.
        """
        current_time = time.time()
        
        # 1. Market Data (PriceStore) her zaman ANLIK kontrol edilmeli (Maliyeti sıfıra yakın)
        market_data_health = price_store.check_health()

        # 2. Ağır İşlemler (CPU, Network) için Cache Kontrolü
        if current_time - self._last_check_time > self.CACHE_DURATION:
            # Süre dolmuş, gerçekten kontrol et ve cache'i güncelle
            resource_health = self._check_resources()
            network_health = self._check_network()
            
            self._cached_report = {
                "resources": resource_health,
                "network": network_health
            }
            self._last_check_time = current_time
        else:
            # Süre dolmamış, eski raporu kullan (Sıfır Maliyet)
            resource_health = self._cached_report.get("resources", {"status": "UNKNOWN", "cpu": "?", "ram": "?"})
            network_health = self._cached_report.get("network", {"status": "UNKNOWN", "message": "Cached"})

        # 3. Genel Durum Kararı
        overall_status = "OK"
        
        if (market_data_health.get("GLOBAL") == "CRITICAL" or 
            network_health["status"] == "CRITICAL"):
            overall_status = "CRITICAL"
        elif (market_data_health.get("GLOBAL") == "WARNING" or 
              resource_health["status"] == "WARNING"):
            overall_status = "WARNING"

        return {
            "OVERALL_STATUS": overall_status,
            "timestamp": current_time,
            "details": {
                "market_data": market_data_health,
                "resources": resource_health,  # Cache'den veya taze gelebilir
                "network": network_health      # Cache'den veya taze gelebilir
            }
        }

health_monitor = SystemHealthMonitor()