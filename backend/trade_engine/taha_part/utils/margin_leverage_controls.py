from typing import Dict, Optional, Any, List
import logging
import asyncio
from psycopg2.extras import RealDictCursor
from copy import deepcopy
from backend.trade_engine.taha_part.db.db_config import (
    get_all_api_margin_leverage_infos,
    get_user_margin_leverage_info,
    update_symbol_margin_leverage,
    get_symbol_margin_leverage,
    delete_symbol_margin_leverage,
    get_active_apis_margin_leverage_infos,
)
from backend.trade_engine.taha_part.utils.order_final import (
    update_margin_type,
    update_leverage)
from backend.trade_engine.config import get_db_connection

logger = logging.getLogger(__name__)

# Ana margin/leverage dict'i - backend'de kullanılacak
margin_leverage_cache: Dict[int, Dict[str, Dict[str, Any]]] = {}




async def initialize_margin_leverage_cache() -> bool:
    """
    Veritabanından tüm API ID'lerin margin/leverage bilgilerini alarak ana dict'i oluşturur.
    
    Returns:
        bool: Cache başarıyla oluşturuldu mu
    """
    global margin_leverage_cache
    
    try:
        print("🔄 Margin/leverage cache başlatılıyor...")
        
        # Veritabanından tüm bilgileri al
        all_infos = await get_all_api_margin_leverage_infos()
        
        if all_infos:
            # Ana dict'i güncelle
            margin_leverage_cache = deepcopy(all_infos)
            
            # Başarı logları
            total_api_ids = len(margin_leverage_cache)
            total_symbols = sum(len(symbols) for symbols in margin_leverage_cache.values())
            
            print(f"✅ Margin/leverage cache başarıyla oluşturuldu:")
            print(f"  📊 {total_api_ids} API ID")
            print(f"  📊 {total_symbols} toplam sembol")
            
            # Her API ID'nin özetini logla
            for api_id, symbols_data in margin_leverage_cache.items():
                logger.debug(f"  API ID {api_id}: {len(symbols_data)} sembol")
                
            return True
        else:
            print("⚠️ Veritabanında margin/leverage bilgisi bulunamadı")
            margin_leverage_cache = {}
            return True  # Boş cache de geçerli
            
    except Exception as e:
        logger.error(f"❌ Margin/leverage cache oluşturulamadı: {str(e)}")
        margin_leverage_cache = {}
        return False


async def reload_margin_leverage_cache() -> bool:
    """
    Cache'i veritabanından yeniden yükler.
    
    Returns:
        bool: Yeniden yükleme başarılı mı
    """
    print("🔄 Margin/leverage cache yeniden yükleniyor...")
    return await initialize_margin_leverage_cache()


def get_margin_leverage_cache() -> Dict[int, Dict[str, Dict[str, Any]]]:
    """
    Ana margin/leverage cache'ini döndürür.
    
    Returns:
        dict: {
            api_id: {
                "BTCUSDT": {"leverage": 10, "margin_boolean": true},
                "ETHUSDT": {"leverage": 5, "margin_boolean": false}
            }
        }
    """
    return deepcopy(margin_leverage_cache)


def get_api_margin_leverage_info(api_id: int) -> Optional[Dict[str, Dict[str, Any]]]:
    """
    Belirtilen API ID'nin margin/leverage bilgilerini cache'den alır.
    
    Args:
        api_id (int): API ID
        
    Returns:
        dict: {
            "BTCUSDT": {"leverage": 10, "margin_boolean": true},
            "ETHUSDT": {"leverage": 5, "margin_boolean": false}
        } veya None
    """
    try:
        if api_id in margin_leverage_cache:
            result = deepcopy(margin_leverage_cache[api_id])
            logger.debug(f"✅ API ID {api_id} cache'den alındı: {len(result)} sembol")
            return result
        else:
            print(f"⚠️ API ID {api_id} cache'de bulunamadı")
            return None
            
    except Exception as e:
        logger.error(f"❌ API ID {api_id} cache'den alınamadı: {str(e)}")
        return None


def get_symbol_margin_leverage_info(api_id: int, symbol: str) -> Optional[Dict[str, Any]]:
    """
    Belirtilen API ID ve sembol için margin/leverage bilgisini cache'den alır.
    
    Args:
        api_id (int): API ID
        symbol (str): Sembol (örn: "BTCUSDT")
        
    Returns:
        dict: {"leverage": 10, "margin_boolean": true} veya None
    """
    try:
        if api_id in margin_leverage_cache:
            api_data = margin_leverage_cache[api_id]
            
            if symbol in api_data:
                result = deepcopy(api_data[symbol])
                logger.debug(f"✅ {symbol} bilgisi cache'den alındı (API ID {api_id})")
                return result
            else:
                print(f"⚠️ {symbol} API ID {api_id} cache'de bulunamadı")
                return None
        else:
            print(f"⚠️ API ID {api_id} cache'de bulunamadı")
            return None
            
    except Exception as e:
        logger.error(f"❌ {symbol} bilgisi cache'den alınamadı (API ID {api_id}): {str(e)}")
        return None


def add_symbol_to_cache(api_id: int, symbol: str, leverage: int, margin_boolean: bool) -> bool:
    """
    Cache'e yeni sembol ekler veya mevcut sembolü günceller.
    
    Args:
        api_id (int): API ID
        symbol (str): Sembol (örn: "BTCUSDT")
        leverage (int): Leverage değeri
        margin_boolean (bool): Margin durumu
        
    Returns:
        bool: Ekleme başarılı mı
    """
    global margin_leverage_cache
    
    try:
        # API ID yoksa oluştur
        if api_id not in margin_leverage_cache:
            margin_leverage_cache[api_id] = {}
            print(f"📝 Yeni API ID {api_id} cache'e eklendi")
        
        # Sembol bilgisini ekle/güncelle
        old_info = margin_leverage_cache[api_id].get(symbol)
        
        margin_leverage_cache[api_id][symbol] = {
            "leverage": leverage,
            "margin_boolean": margin_boolean
        }
        
        if old_info:
            print(f"🔄 {symbol} güncellendi (API ID {api_id}): {old_info} -> leverage={leverage}, margin_boolean={margin_boolean}")
        else:
            print(f"➕ {symbol} eklendi (API ID {api_id}): leverage={leverage}, margin_boolean={margin_boolean}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ {symbol} cache'e eklenemedi (API ID {api_id}): {str(e)}")
        return False


def remove_symbol_from_cache(api_id: int, symbol: str) -> bool:
    """
    Cache'den sembol siler.
    
    Args:
        api_id (int): API ID
        symbol (str): Sembol (örn: "BTCUSDT")
        
    Returns:
        bool: Silme başarılı mı
    """
    global margin_leverage_cache
    
    try:
        if api_id in margin_leverage_cache:
            if symbol in margin_leverage_cache[api_id]:
                removed_info = margin_leverage_cache[api_id].pop(symbol)
                print(f"🗑️ {symbol} cache'den silindi (API ID {api_id}): {removed_info}")
                
                # API ID'nin sembol listesi boşsa API ID'yi de sil
                if not margin_leverage_cache[api_id]:
                    del margin_leverage_cache[api_id]
                    print(f"🗑️ API ID {api_id} cache'den silindi (boş)")
                
                return True
            else:
                print(f"⚠️ {symbol} API ID {api_id} cache'de bulunamadı")
                return False
        else:
            print(f"⚠️ API ID {api_id} cache'de bulunamadı")
            return False
            
    except Exception as e:
        logger.error(f"❌ {symbol} cache'den silinemedi (API ID {api_id}): {str(e)}")
        return False


def remove_api_from_cache(api_id: int) -> bool:
    """
    Cache'den API ID'yi ve tüm sembollerini siler.
    
    Args:
        api_id (int): API ID
        
    Returns:
        bool: Silme başarılı mı
    """
    global margin_leverage_cache
    
    try:
        if api_id in margin_leverage_cache:
            removed_data = margin_leverage_cache.pop(api_id)
            symbols_count = len(removed_data)
            
            print(f"🗑️ API ID {api_id} cache'den silindi ({symbols_count} sembol)")
            
            # Silinen sembolleri logla
            for symbol in removed_data.keys():
                logger.debug(f"  🗑️ Silinen sembol: {symbol}")
            
            return True
        else:
            print(f"⚠️ API ID {api_id} cache'de bulunamadı")
            return False
            
    except Exception as e:
        logger.error(f"❌ API ID {api_id} cache'den silinemedi: {str(e)}")
        return False


async def sync_symbol_with_database(api_id: int, symbol: str, leverage: int, margin_boolean: bool) -> bool:
    """
    Sembol bilgisini hem cache'e hem veritabanına ekler/günceller.
    
    Args:
        api_id (int): API ID
        symbol (str): Sembol (örn: "BTCUSDT")
        leverage (int): Leverage değeri
        margin_boolean (bool): Margin durumu
        
    Returns:
        bool: Senkronizasyon başarılı mı
    """
    try:
        # Önce veritabanında güncelle
        db_success = await update_symbol_margin_leverage(api_id, symbol, leverage, margin_boolean)
        
        if db_success:
            # Veritabanı başarılıysa cache'i güncelle
            cache_success = add_symbol_to_cache(api_id, symbol, leverage, margin_boolean)
            
            if cache_success:
                print(f"✅ {symbol} başarıyla senkronize edildi (API ID {api_id})")
                return True
            else:
                logger.error(f"❌ {symbol} veritabanında güncellendi ama cache'de hata (API ID {api_id})")
                return False
        else:
            logger.error(f"❌ {symbol} veritabanında güncellenemedi (API ID {api_id})")
            return False
            
    except Exception as e:
        logger.error(f"❌ {symbol} senkronizasyonu başarısız (API ID {api_id}): {str(e)}")
        return False


async def sync_api_with_database(api_id: int) -> bool:
    """
    Belirtilen API ID'nin tüm bilgilerini veritabanından cache'e senkronize eder.
    
    Args:
        api_id (int): API ID
        
    Returns:
        bool: Senkronizasyon başarılı mı
    """
    try:
        print(f"🔄 API ID {api_id} veritabanından senkronize ediliyor...")
        
        # Veritabanından güncel bilgileri al
        db_data = await get_user_margin_leverage_info(api_id)
        
        if db_data:
            # Cache'den mevcut API ID'yi sil
            if api_id in margin_leverage_cache:
                del margin_leverage_cache[api_id]
                logger.debug(f"🗑️ API ID {api_id} cache'den temizlendi")
            
            # Yeni bilgileri cache'e ekle
            margin_leverage_cache[api_id] = deepcopy(db_data)
            
            print(f"✅ API ID {api_id} başarıyla senkronize edildi ({len(db_data)} sembol)")
            return True
        else:
            print(f"⚠️ API ID {api_id} veritabanında bulunamadı")
            
            # Cache'den de sil
            if api_id in margin_leverage_cache:
                del margin_leverage_cache[api_id]
                print(f"🗑️ API ID {api_id} cache'den silindi")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ API ID {api_id} senkronizasyonu başarısız: {str(e)}")
        return False


def get_cache_summary() -> Dict[str, Any]:
    """
    Cache'in özet bilgilerini döndürür.
    
    Returns:
        dict: {
            "total_api_ids": int,
            "total_symbols": int,
            "api_summary": {api_id: symbol_count},
            "symbol_summary": {symbol: api_id_count}
        }
    """
    try:
        api_summary = {}
        symbol_summary = {}
        total_symbols = 0
        
        for api_id, symbols_data in margin_leverage_cache.items():
            # API ID bazında sembol sayısı
            symbol_count = len(symbols_data)
            api_summary[api_id] = symbol_count
            total_symbols += symbol_count
            
            # Sembol bazında API ID sayısı
            for symbol in symbols_data.keys():
                if symbol not in symbol_summary:
                    symbol_summary[symbol] = 0
                symbol_summary[symbol] += 1
        
        return {
            "total_api_ids": len(margin_leverage_cache),
            "total_symbols": total_symbols,
            "api_summary": api_summary,
            "symbol_summary": symbol_summary
        }
        
    except Exception as e:
        logger.error(f"❌ Cache özeti alınamadı: {str(e)}")
        return {
            "total_api_ids": 0,
            "total_symbols": 0,
            "api_summary": {},
            "symbol_summary": {}
        }


def is_cache_initialized() -> bool:
    """
    Cache'in başlatılıp başlatılmadığını kontrol eder.
    
    Returns:
        bool: Cache başlatılmış mı
    """
    return isinstance(margin_leverage_cache, dict)


def clear_cache() -> bool:
    """
    Cache'i temizler.
    
    Returns:
        bool: Temizleme başarılı mı
    """
    global margin_leverage_cache
    
    try:
        old_count = len(margin_leverage_cache)
        margin_leverage_cache = {}
        
        print(f"🗑️ Cache temizlendi ({old_count} API ID silindi)")
        return True
        
    except Exception as e:
        logger.error(f"❌ Cache temizlenemedi: {str(e)}")
        return False
    

async def update_margin_leverage_in_cache(margin_leverage_dict: dict, api_id: int, symbol: str, leverage: int, margin_boolean: bool) -> None:
    """
    Ana cache dict'ini günceller - bellek içi işlem
    
    Args:
        margin_leverage_dict (dict): Ana cache dict referansı
        api_id (int): API ID
        symbol (str): Sembol
        leverage (int): Leverage değeri
        margin_boolean (bool): Margin durumu
    """
    try:
        # API ID yoksa oluştur
        if api_id not in margin_leverage_dict:
            margin_leverage_dict[api_id] = {}
        
        # Sembol bilgisini güncelle
        margin_leverage_dict[api_id][symbol] = {
            "leverage": leverage,
            "margin_boolean": margin_boolean
        }
        
        logger.debug(f"✅ Cache güncellendi: API {api_id} - {symbol} (leverage={leverage}, margin_boolean={margin_boolean})")
        
    except Exception as e:
        logger.error(f"❌ Cache güncellemesi başarısız: {str(e)}")
