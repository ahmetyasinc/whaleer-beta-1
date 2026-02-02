# data_access/repos/symbol_filters.py
import asyncio
import logging
from typing import Dict, Any, Optional
from trade_engine.config import * # Asyncpg bağlantı havuzu

logger = logging.getLogger(__name__)

class SymbolFilterRepo:
    """
    Veritabanından public.symbol_filters tablosunu yükler ve RAM'de önbellekler.
    
    Amaç: OrderCalculator için O(1) hızında, borsaya özel filtre erişimi sağlamak.
    
    Önbellek Formatı (Sembol Bazlı):
    {
        "BTCUSDT": {
            "spot":   {"exchange": "Binance", "step_size": 0.001, "min_qty": 0.001, "tick_size": 0.01},
            "futures": {"exchange": "Binance", "step_size": 0.001, "min_qty": 0.001, "tick_size": 0.01}
        },
        ...
    }
    """
    
    # [symbol] -> [trade_type] -> [filter_key: value]
    _cache: Dict[str, Dict[str, Dict[str, Any]]] = {}
    
    def __init__(self):
        self._is_initialized = False

    async def initialize(self) -> bool:
        """Tüm filtreleri DB'den çeker ve RAM'e yükler."""
        if self._is_initialized:
            logger.info("SymbolFilterRepo zaten başlatılmış.")
            return True
        
        try:
            logger.info("🔄 SymbolFilterRepo başlatılıyor: Filtreler DB'den RAM'e yükleniyor...")
            
            # config.py'den asyncpg bağlantı havuzunu al
            pool = await get_async_pool()
            
            # --- Faz 1 Kısıtlamalı Sorgu (SADECE USDT ve Binance) ---
            query = """
                SELECT binance_symbol, trade_type, step_size, min_qty, tick_size
                FROM public.symbol_filters
                WHERE trade_type IN ('spot', 'futures') 
                  AND binance_symbol LIKE '%USDT'
                ORDER BY binance_symbol, trade_type;
            """
            
            # --- TÜM Filtreleri Çeken Sorgu (Gelecek/Yorum satırı için) ---
            # query_all = """
            #     SELECT binance_symbol, trade_type, step_size, min_qty, tick_size, exchange
            #     FROM public.symbol_filters
            #     WHERE trade_type IN ('spot', 'futures') 
            #     ORDER BY binance_symbol, trade_type;
            # """
            # records = await pool.fetch(query_all)
            
            records = await pool.fetch(query)
            
            new_cache: Dict[str, Dict[str, Dict[str, Any]]] = {}
            for record in records:
                symbol = record['binance_symbol']
                trade_type = record['trade_type']
                
                if symbol not in new_cache:
                    new_cache[symbol] = {}
                
                # RAM'e yüklerken, DB'de exchange sütunu yeni olduğu ve
                # bu verinin Binance'tan geldiği bilindiği için sabit değer eklenir.
                new_cache[symbol][trade_type] = {
                    "exchange": "Binance",
                    "step_size": float(record['step_size']),
                    "min_qty": float(record['min_qty']),
                    "tick_size": float(record['tick_size']),
                }

            self._cache = new_cache
            self._is_initialized = True
            
            total_pairs = len(self._cache)
            total_types = sum(len(types) for types in self._cache.values())
            logger.info(f"✅ SymbolFilterRepo başarıyla yüklendi. Toplam USDT çifti: {total_pairs} ({total_types} kombinasyon)")
            
            return True
        
        except Exception as e:
            logger.error(f"❌ SymbolFilterRepo yüklenirken hata: {e}", exc_info=True)
            self._cache = {}
            self._is_initialized = False
            return False

    def get_filters(self, symbol: str, trade_type: str) -> Optional[Dict[str, Any]]:
        """
        Belirtilen sembol ve trade_type için filtreleri döndürür (O(1) erişim).
        trade_type: 'spot', 'futures', 'test_spot', 'test_futures' olabilir.
        """
        if not self._is_initialized:
            logger.warning("SymbolFilterRepo başlatılmadı, None dönüyor.")
            return None
            
        # Sembolü büyük harfe çevir
        symbol = symbol.upper()
        
        # trade_type'ı normalize et ('test_spot' -> 'spot')
        normalized_type = trade_type.replace('test_', '')
        
        # Faz 1: USDT kontrolü
        if not symbol.endswith('USDT'):
            logger.warning(f"⚠️ {symbol} USDT çifti değil, Faz 1 kısıtlaması nedeniyle RAM'de bulunamaz.")
            return None
        
        if symbol in self._cache and normalized_type in self._cache[symbol]:
            return self._cache[symbol][normalized_type]
            
        return None
