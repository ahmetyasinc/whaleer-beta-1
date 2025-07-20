import asyncio
import logging
from typing import Dict, List, Optional, Tuple
from db.async_db import init_db_pool,fetch_data, execute_query


# Logger ayarları
logger = logging.getLogger(__name__)

async def get_api_credentials_by_bot_id(bot_id: int, trade_type: str = "spot") -> Dict:
    """
    Bot ID'den API kimlik bilgilerini getirir.
    
    Args:
        bot_id (int): Bot ID'si
        trade_type (str): "spot", "futures", "test_spot" veya "test_futures"
        
    Returns:
        dict: API kimlik bilgileri
        
    Raises:
        ValueError: Bot bulunamazsa veya API bilgileri eksikse
    """
    try:
        # Bot ID'den api_id'yi al
        bot_query = "SELECT api_id FROM public.bots WHERE id = $1"
        bot_result = await fetch_data(bot_query, [bot_id])
        
        if not bot_result:
            raise ValueError(f"Bot ID {bot_id} bulunamadı")
        
        api_id = bot_result[0]["api_id"]
        
        # Trade type'a göre API bilgilerini al
        if trade_type.lower() in ["futures", "test_futures"]:
            api_query = "SELECT api_key, api_secret FROM api_keys WHERE id = $1"
        elif trade_type.lower() in ["spot", "test_spot"]:
            api_query = "SELECT ed_public, ed_private_pem FROM api_keys WHERE id = $1"
        else:
            raise ValueError(f"Geçersiz trade_type: {trade_type}")
        
        api_result = await fetch_data(api_query, [api_id])
        
        if not api_result:
            raise ValueError(f"API ID {api_id} için kimlik bilgileri bulunamadı")
        
        return dict(api_result[0])
        
    except Exception as e:
        logger.error(f"❌ API kimlik bilgileri alınırken hata: {str(e)}")
        raise ValueError(f"API kimlik bilgileri alınamadı: {str(e)}")

async def get_bot_margin_status(bot_id: int) -> Dict:
    """
    Bot'un margin type durumunu getirir.
    
    Args:
        bot_id (int): Bot ID'si
        
    Returns:
        dict: Margin type durumu bilgileri
    """
    try:
        # Bot'un margin type durumunu kontrol et
        margin_query = """
        SELECT is_isolated, COUNT(*) as position_count
        FROM bot_positions 
        WHERE bot_id = $1 
        GROUP BY is_isolated
        """
        
        margin_result = await fetch_data(margin_query, [bot_id])
        
        if not margin_result:
            return {
                "bot_id": bot_id,
                "has_positions": False,
                "is_isolated": None,
                "position_count": 0,
                "needs_margin_setting": True
            }
        
        # Sonuçları analiz et
        isolated_count = 0
        cross_count = 0
        total_positions = 0
        
        for row in margin_result:
            if row["is_isolated"]:
                isolated_count = row["position_count"]
            else:
                cross_count = row["position_count"]
            total_positions += row["position_count"]
        
        # Eğer hiç ISOLATED pozisyon yoksa margin type ayarlanması gerekir
        needs_margin_setting = isolated_count == 0
        
        return {
            "bot_id": bot_id,
            "has_positions": total_positions > 0,
            "is_isolated": isolated_count > 0,
            "isolated_positions": isolated_count,
            "cross_positions": cross_count,
            "total_positions": total_positions,
            "needs_margin_setting": needs_margin_setting
        }
        
    except Exception as e:
        logger.error(f"❌ Bot {bot_id} margin durumu alınırken hata: {str(e)}")
        return {
            "bot_id": bot_id,
            "has_positions": False,
            "is_isolated": None,
            "position_count": 0,
            "needs_margin_setting": True,
            "error": str(e)
        }

async def update_bot_margin_status(bot_id: int, is_isolated: bool = True) -> bool:
    """
    Bot'un margin type durumunu günceller.
    
    Args:
        bot_id (int): Bot ID'si
        is_isolated (bool): ISOLATED margin type'a çevrilip çevrilmediği
        
    Returns:
        bool: Güncelleme başarılı olup olmadığı
    """
    try:
        # Mevcut kayıt var mı kontrol et
        existing_query = "SELECT COUNT(*) as count FROM bot_positions WHERE bot_id = $1"
        existing_result = await fetch_data(existing_query, [bot_id])
        
        has_existing_records = existing_result and existing_result[0]["count"] > 0
        
        if has_existing_records:
            # Mevcut kayıtları güncelle
            update_query = """
            UPDATE bot_positions 
            SET is_isolated = $1 
            WHERE bot_id = $2
            """
            await execute_query(update_query, [is_isolated, bot_id])
            
            logger.info(f"✅ Bot {bot_id} margin durumu güncellendi: is_isolated = {is_isolated}")
            
        else:
            # Yeni kayıt ekle - user_id'yi bots tablosundan al
            user_query = "SELECT user_id FROM bots WHERE id = $1"
            user_result = await fetch_data(user_query, [bot_id])
            
            if user_result:
                user_id = user_result[0]["user_id"]
                insert_query = """
                INSERT INTO bot_positions (user_id, bot_id, symbol, average_cost, amount, profit_loss, status, position_side, leverage, percentage, is_isolated)
                VALUES ($1, $2, 'SYSTEM', 0, 0, 0, 'margin_only', 'BOTH', 10, 0, $3)
                """
                await execute_query(insert_query, [user_id, bot_id, is_isolated])
                
                logger.info(f"✅ Bot {bot_id} için yeni margin kaydı eklendi: is_isolated = {is_isolated}")
            else:
                logger.error(f"❌ Bot {bot_id} için user_id bulunamadı")
                return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Bot {bot_id} margin durumu güncellenirken hata: {str(e)}")
        return False

async def get_bot_active_positions(bot_id: int) -> List[Dict]:
    """
    Bot'un aktif pozisyonlarını getirir.
    
    Args:
        bot_id (int): Bot ID'si
        
    Returns:
        list: Aktif pozisyonlar listesi
    """
    try:
        positions_query = """
        SELECT symbol, average_cost, amount, profit_loss, position_side, leverage, is_isolated
        FROM bot_positions 
        WHERE bot_id = $1 AND status = 'active'
        ORDER BY symbol
        """
        
        positions_result = await fetch_data(positions_query, [bot_id])
        
        if not positions_result:
            return []
        
        return [dict(pos) for pos in positions_result]
        
    except Exception as e:
        logger.error(f"❌ Bot {bot_id} aktif pozisyonları alınırken hata: {str(e)}")
        return []

async def get_bot_with_api_info(bot_id: int) -> Dict:
    """
    Bot bilgilerini API kimlik bilgileri ile birlikte getirir.
    
    Args:
        bot_id (int): Bot ID'si
        
    Returns:
        dict: Bot ve API bilgileri
    """
    try:
        # Bot ve API bilgilerini tek sorguda al
        bot_api_query = """
        SELECT 
            b.id as bot_id,
            b.name as bot_name,
            b.user_id,
            b.api_id,
            ak.api_key,
            ak.api_secret,
            ak.ed_public,
            ak.ed_private
        FROM bots b
        JOIN api_keys ak ON b.api_id = ak.id
        WHERE b.id = $1
        """
        
        result = await fetch_data(bot_api_query, [bot_id])
        
        if not result:
            raise ValueError(f"Bot ID {bot_id} bulunamadı")
        
        bot_info = dict(result[0])
        
        # Margin durumunu da ekle
        margin_status = await get_bot_margin_status(bot_id)
        bot_info.update(margin_status)
        
        return bot_info
        
    except Exception as e:
        logger.error(f"❌ Bot {bot_id} bilgileri alınırken hata: {str(e)}")
        raise ValueError(f"Bot bilgileri alınamadı: {str(e)}")

async def get_multiple_bots_margin_status(bot_ids: List[int]) -> Dict[int, Dict]:
    """
    Çoklu bot'ların margin durumlarını getirir.
    
    Args:
        bot_ids (list): Bot ID'leri listesi
        
    Returns:
        dict: Bot ID'ye göre margin durumları
    """
    try:
        if not bot_ids:
            return {}
        
        # Çoklu bot margin durumlarını al
        placeholders = ','.join(['$' + str(i + 1) for i in range(len(bot_ids))])
        
        margin_query = f"""
        SELECT 
            bot_id,
            is_isolated,
            COUNT(*) as position_count
        FROM bot_positions 
        WHERE bot_id IN ({placeholders})
        GROUP BY bot_id, is_isolated
        """
        
        margin_results = await fetch_data(margin_query, bot_ids)
        
        # Sonuçları organize et
        bot_margin_status = {}
        
        for bot_id in bot_ids:
            bot_margin_status[bot_id] = {
                "bot_id": bot_id,
                "has_positions": False,
                "is_isolated": None,
                "isolated_positions": 0,
                "cross_positions": 0,
                "total_positions": 0,
                "needs_margin_setting": True
            }
        
        for row in margin_results:
            bot_id = row["bot_id"]
            
            if bot_id in bot_margin_status:
                bot_margin_status[bot_id]["has_positions"] = True
                
                if row["is_isolated"]:
                    bot_margin_status[bot_id]["isolated_positions"] = row["position_count"]
                    bot_margin_status[bot_id]["is_isolated"] = True
                    bot_margin_status[bot_id]["needs_margin_setting"] = False
                else:
                    bot_margin_status[bot_id]["cross_positions"] = row["position_count"]
                
                bot_margin_status[bot_id]["total_positions"] += row["position_count"]
        
        return bot_margin_status
        
    except Exception as e:
        logger.error(f"❌ Çoklu bot margin durumları alınırken hata: {str(e)}")
        return {}

async def get_all_futures_bots_with_api() -> List[Dict]:
    """
    Tüm futures botlarını API bilgileri ile birlikte getirir.
    
    Returns:
        list: Futures botları ve API bilgileri
    """
    try:
        # Futures API'si olan tüm botları al
        bots_query = """
        SELECT 
            b.id as bot_id,
            b.name as bot_name,
            b.user_id,
            b.api_id,
            ak.api_key,
            ak.api_secret
        FROM bots b
        JOIN api_keys ak ON b.api_id = ak.id
        WHERE ak.api_key IS NOT NULL AND ak.api_secret IS NOT NULL
        ORDER BY b.id
        """
        
        bots_result = await fetch_data(bots_query)
        
        if not bots_result:
            return []
        
        # Bot ID'lerini al
        bot_ids = [bot["bot_id"] for bot in bots_result]
        
        # Çoklu margin durumlarını al
        margin_statuses = await get_multiple_bots_margin_status(bot_ids)
        
        # Sonuçları birleştir
        futures_bots = []
        for bot in bots_result:
            bot_info = dict(bot)
            bot_id = bot_info["bot_id"]
            
            if bot_id in margin_statuses:
                bot_info.update(margin_statuses[bot_id])
            
            futures_bots.append(bot_info)
        
        return futures_bots
        
    except Exception as e:
        logger.error(f"❌ Futures botları alınırken hata: {str(e)}")
        return []

# Batch işlemler için optimize edilmiş fonksiyonlar
async def batch_get_api_credentials(bot_ids: List[int], trade_type: str = "futures") -> Dict[int, Dict]:
    """
    Çoklu bot'ların API kimlik bilgilerini batch olarak getirir.
    
    Args:
        bot_ids (list): Bot ID'leri listesi
        trade_type (str): "spot" veya "futures"
        
    Returns:
        dict: Bot ID'ye göre API kimlik bilgileri
    """
    try:
        if not bot_ids:
            return {}
        
        # Batch sorgu hazırla
        placeholders = ','.join(['$' + str(i + 1) for i in range(len(bot_ids))])
        
        if trade_type.lower() == "futures":
            batch_query = f"""
            SELECT 
                b.id as bot_id,
                ak.api_key,
                ak.api_secret
            FROM bots b
            JOIN api_keys ak ON b.api_id = ak.id
            WHERE b.id IN ({placeholders})
            """
        else:  # spot
            batch_query = f"""
            SELECT 
                b.id as bot_id,
                ak.ed_public,
                ak.ed_private
            FROM bots b
            JOIN api_keys ak ON b.api_id = ak.id
            WHERE b.id IN ({placeholders})
            """
        
        batch_result = await fetch_data(batch_query, bot_ids)
        
        # Sonuçları organize et
        credentials = {}
        for row in batch_result:
            bot_id = row["bot_id"]
            row_dict = dict(row)
            del row_dict["bot_id"]  # bot_id'yi kaldır
            credentials[bot_id] = row_dict
        
        return credentials
        
    except Exception as e:
        logger.error(f"❌ Batch API kimlik bilgileri alınırken hata: {str(e)}")
        return {}

# Yardımcı fonksiyonlar
async def validate_bot_exists(bot_id: int) -> bool:
    """
    Bot'un var olup olmadığını kontrol eder.
    
    Args:
        bot_id (int): Bot ID'si
        
    Returns:
        bool: Bot var mı?
    """
    try:
        check_query = "SELECT COUNT(*) as count FROM bots WHERE id = $1"
        result = await fetch_data(check_query, [bot_id])
        
        return result and result[0]["count"] > 0
        
    except Exception as e:
        logger.error(f"❌ Bot {bot_id} varlığı kontrol edilirken hata: {str(e)}")
        return False

async def get_user_bots(user_id: int) -> List[Dict]:
    """
    Kullanıcının botlarını getirir.
    
    Args:
        user_id (int): Kullanıcı ID'si
        
    Returns:
        list: Bot listesi
    """
    try:
        user_bots_query = """
        SELECT 
            b.id as bot_id,
            b.name as bot_name,
            b.api_id,
            CASE 
                WHEN ak.api_key IS NOT NULL THEN 'futures'
                WHEN ak.ed_public IS NOT NULL THEN 'spot'
                ELSE 'unknown'
            END as api_type
        FROM bots b
        JOIN api_keys ak ON b.api_id = ak.id
        WHERE b.user_id = $1
        ORDER BY b.id
        """
        
        bots_result = await fetch_data(user_bots_query, [user_id])
        
        return [dict(bot) for bot in bots_result] if bots_result else []
        
    except Exception as e:
        logger.error(f"❌ Kullanıcı {user_id} botları alınırken hata: {str(e)}")
        return []

    
async def get_symbols_filters_dict(symbols_and_types: Dict[str, str]) -> Dict[str, Dict]:
    """
    Belirtilen sembollerin filtrelerini dict olarak getirir.
    
    Args:
        symbols_and_types (dict): {
            "BTCUSDT": "spot",
            "ETHUSDT": "futures",
            "ADAUSDT": "spot"
        }
        
    Returns:
        dict: {
            "BTCUSDT": {
                "step_size": 0.001,
                "min_qty": 0.001,
                "tick_size": 0.01,
                "trade_type": "spot"
            },
            "ETHUSDT": {
                "step_size": 0.0001,
                "min_qty": 0.0001,
                "tick_size": 0.01,
                "trade_type": "futures"
            },
            ...
        }
    """
    try:
        if not symbols_and_types:
            logger.warning("⚠️ Sembol listesi boş")
            return {}
        
        # Batch sorgu için parametreleri hazırla
        conditions = []
        params = []
        param_index = 1
        
        for symbol, trade_type in symbols_and_types.items():
            conditions.append(f"(binance_symbol = ${param_index} AND trade_type = ${param_index + 1})")
            params.extend([symbol, trade_type])
            param_index += 2
        
        symbols_query = f"""
        SELECT binance_symbol, step_size, min_qty, tick_size, trade_type
        FROM symbol_filters
        WHERE {' OR '.join(conditions)}
        ORDER BY binance_symbol
        """
        
        symbols_result = await fetch_data(symbols_query, params)
        
        if not symbols_result:
            logger.warning("⚠️ Belirtilen semboller için filtreler bulunamadı")
            return {}
        
        # Dict formatına dönüştür
        symbols_dict = {}
        for row in symbols_result:
            symbol = row["binance_symbol"]
            symbols_dict[symbol] = {
                "step_size": float(row["step_size"]),
                "min_qty": float(row["min_qty"]),
                "tick_size": float(row["tick_size"]),
                "trade_type": row["trade_type"]
            }
        
        logger.info(f"✅ {len(symbols_dict)} sembol filtresi yüklendi")
        return symbols_dict
        
    except Exception as e:
        logger.error(f"❌ Sembol filtreleri alınırken hata: {str(e)}")
        return {}
async def get_single_symbol_filters(symbol: str, trade_type: str) -> Optional[Dict]:
    """
    Tek bir sembolün filtrelerini getirir.
    
    Args:
        symbol (str): Binance sembolü (örn: 'BTCUSDT')
        trade_type (str): "spot" veya "futures"
        
    Returns:
        dict: {
            "step_size": 0.001,
            "min_qty": 0.001,
            "tick_size": 0.01,
            "trade_type": "spot"
        } veya None
    """
    try:
        if not symbol or not trade_type:
            logger.warning("⚠️ Sembol veya trade_type boş")
            return None
        
        single_symbol_query = """
        SELECT binance_symbol, step_size, min_qty, tick_size, trade_type
        FROM symbol_filters
        WHERE binance_symbol = $1 AND trade_type = $2
        """
        
        symbol_result = await fetch_data(single_symbol_query, [symbol, trade_type])
        
        if not symbol_result:
            logger.warning(f"⚠️ {symbol} sembolü için {trade_type} filtresi bulunamadı")
            return None
        
        # İlk (ve tek) sonucu al
        row = symbol_result[0]
        
        return {
            "step_size": float(row["step_size"]),
            "min_qty": float(row["min_qty"]),
            "tick_size": float(row["tick_size"]),
            "trade_type": row["trade_type"]
        }
        
    except Exception as e:
        logger.error(f"❌ {symbol} sembol filtresi alınırken hata: {str(e)}")
        return None
async def main():
    await init_db_pool()  # Veritabanı bağlantısını başlat
    # Girdi formatı
    input_symbols = {
    "BTCUSDT": "spot",
    "ETHUSDT": "futures", 
    "ADAUSDT": "spot",
    "BNBUSDT": "futures"
}

    # Fonksiyon çağrısı
    filters_result = await get_symbols_filters_dict(input_symbols)

# Çıktı formatı
# {
#     "BTCUSDT": {
#         "step_size": 0.001,
#         "min_qty": 0.001,
#         "tick_size": 0.01,
#         "trade_type": "spot"
#     },
#     "ETHUSDT": {
#         "step_size": 0.0001,
#         "min_qty": 0.0001,
#         "tick_size": 0.01,
#         "trade_type": "futures"
#     }
# }
    print(filters_result)

if __name__ == "__main__":
    asyncio.run(main())