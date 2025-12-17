# core/price_store.py
import threading
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Optional, Dict

@dataclass
class PriceTicker:
    bid: float
    ask: float
    last: float
    timestamp: float

class PriceStore:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(PriceStore, cls).__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self._data_lock = threading.Lock()
        self._prices = defaultdict(dict)
        
        # Sağlık kriterleri (Saniye cinsinden)
        self.STALE_THRESHOLD = 10  # 10 saniyeden eskiyse 'BAYAT' sayılır
        self.WARNING_THRESHOLD = 5 # 5 saniyeden eskiyse 'UYARI' verir

    def update_price(self, exchange: str, symbol: str, ticker_data: PriceTicker):
        with self._data_lock:
            self._prices[exchange][symbol] = ticker_data

    def get_price(self, exchange: str, symbol: str) -> Optional[PriceTicker]:
        with self._data_lock:
            return self._prices.get(exchange, {}).get(symbol)

    # --- YENİ EKLENEN KISIM: HEALTH CHECK ---
    def check_health(self) -> Dict:
        """
        Sistemin o anki sağlık durumunu analiz eder ve bir rapor (sözlük) döner.
        Dönüş Formatı:
        {
            "BINANCE_SPOT": {"status": "OK", "latency": 0.5},
            "BINANCE_FUTURES": {"status": "CRITICAL", "latency": 60.0},
            "GLOBAL_STATUS": "WARNING" 
        }
        """
        health_report = {}
        current_time = time.time()
        global_status = "OK"

        with self._data_lock:
            # Kayıtlı tüm borsaları (Exchange Key) dön
            for exchange_key, symbols in self._prices.items():
                
                # O borsadaki sembollerin en güncel olanına bakacağız
                # (Eğer 1 sembol bile güncelse bağlantı var demektir)
                min_latency = float('inf')
                
                for sym, ticker in symbols.items():
                    latency = current_time - ticker.timestamp
                    if latency < min_latency:
                        min_latency = latency
                
                # Hiç veri yoksa
                if min_latency == float('inf'):
                    status = "NO_DATA"
                    global_status = "CRITICAL"
                
                # Veri çok eskiyse (Bağlantı kopmuş olabilir)
                elif min_latency > self.STALE_THRESHOLD:
                    status = "CRITICAL"  # İşlem durdurulmalı
                    global_status = "CRITICAL"
                
                # Veri biraz gecikmeliyse
                elif min_latency > self.WARNING_THRESHOLD:
                    status = "WARNING"
                    if global_status != "CRITICAL": global_status = "WARNING"
                
                # Her şey yolunda
                else:
                    status = "OK"

                health_report[exchange_key] = {
                    "status": status,
                    "latency": round(min_latency, 2) if min_latency != float('inf') else -1
                }

        health_report["GLOBAL"] = global_status
        return health_report

price_store = PriceStore()