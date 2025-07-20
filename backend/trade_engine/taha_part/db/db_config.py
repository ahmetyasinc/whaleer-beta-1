
import sys, json, logging,os
from typing import Dict, List, Optional, Any
from psycopg2.extras import RealDictCursor
from trade_engine.config import DB_CONFIG, get_db_connection
from trade_engine.taha_part.utils.dict_preparing import get_symbols_filters_dict, get_single_symbol_filters
logger = logging.getLogger(__name__)
import sys, json, logging, os
from typing import Dict, List, Optional, Any
from datetime import datetime
from psycopg2.extras import RealDictCursor
from trade_engine.taha_part.utils.dict_preparing import get_symbols_filters_dict, get_single_symbol_filters

logger = logging.getLogger(__name__)

async def get_api_credentials_by_bot_id(bot_id: int, trade_type: str = "spot") -> Dict:
    """
    Bot ID'den API kimlik bilgilerini getirir - API ID'yi de dahil eder.
    """
    try:
        conn = get_db_connection()
        if not conn:
            logger.error(f"❌ Veritabanı bağlantısı alınamadı - Bot ID: {bot_id}")
            return {}
            
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Bot'un api_id'sini al
                cursor.execute("SELECT api_id FROM bots WHERE id = %s", (bot_id,))
                bot_result = cursor.fetchone()
                
                if not bot_result:
                    logger.warning(f"⚠️ Bot ID {bot_id} bulunamadı")
                    return {}
                
                api_id = bot_result["api_id"]
                
                # Trade type'a göre API bilgilerini al
                if trade_type.lower() in ["futures", "test_futures"]:
                    cursor.execute("""
                        SELECT id, api_key, api_secret 
                        FROM api_keys 
                        WHERE id = %s
                    """, (api_id,))
                elif trade_type.lower() in ["spot", "test_spot"]:
                    cursor.execute("""
                        SELECT id, ed_public, ed_private_pem 
                        FROM api_keys 
                        WHERE id = %s
                    """, (api_id,))
                else:
                    logger.error(f"❌ Geçersiz trade_type: {trade_type}")
                    return {}
                
                api_result = cursor.fetchone()
                
                if not api_result:
                    logger.warning(f"⚠️ API ID {api_id} için kimlik bilgileri bulunamadı")
                    return {}
                
                # API ID'yi de dahil et
                result = dict(api_result)
                logger.info(f"✅ Bot {bot_id} için {trade_type} API bilgileri alındı (API ID: {api_id})")
                return result
                
    except Exception as e:
        logger.error(f"❌ API kimlik bilgileri alınırken hata: {str(e)}")
        return {}

async def get_user_id_by_bot_id(bot_id: int) -> Optional[int]:
    """
    Bot ID'ye göre user ID'yi getirir.
    """
    try:
        conn = get_db_connection()
        if not conn:
            logger.error("❌ Veritabanı bağlantısı alınamadı")
            return None
            
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SELECT user_id FROM bots WHERE id = %s", (bot_id,))
                result = cursor.fetchone()
                
                if result:
                    return result['user_id']
                else:
                    logger.warning(f"⚠️ Bot ID {bot_id} için user bulunamadı")
                    return None
                    
    except Exception as e:
        logger.error(f"❌ User ID getirme hatası: {str(e)}")
        return None

async def save_trade_to_db(bot_id: int, user_id: int, trade_result: dict, order_params: dict) -> bool:
    """
    Emir sonucunu bot_trades tablosuna kaydeder.
    """
    try:
        # Hata durumunda kayıt yapma
        if "error" in trade_result:
            logger.warning(f"⚠️ Hatalı emir kaydedilmeyecek: {trade_result.get('error')}")
            return False
            
        # Gerekli alanları extract et
        symbol = order_params.get("symbol", "")
        side = order_params.get("side", "").upper()
        quantity = float(order_params.get("quantity", 0))
        price = float(order_params.get("price", 0)) if order_params.get("price") else 0.0
        
        # Trade result'tan bilgileri al
        order_id = str(trade_result.get("orderId", ""))
        executed_qty = float(trade_result.get("executedQty", quantity))
        
        # Commission bilgisini kontrol et
        commission = 0.0
        if "fills" in trade_result and trade_result["fills"]:
            total_commission = 0.0
            for fill in trade_result["fills"]:
                total_commission += float(fill.get("commission", 0))
            commission = total_commission
        else:
            commission = float(trade_result.get("commission", 0))
        
        # Position side futures için
        position_side = order_params.get("positionSide", "BOTH").upper()
        
        # Leverage bilgisi
        leverage = 1
        if "leverage" in order_params:
            leverage = int(order_params.get("leverage", 1))
            
        # Trade type belirleme
        trade_type = order_params.get("trade_type", "spot")
        
        # Status belirleme
        status = trade_result.get("status", "FILLED")
        
        conn = get_db_connection()
        if not conn:
            logger.error("❌ Veritabanı bağlantısı alınamadı")
            return False
            
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                insert_query = """
                    INSERT INTO bot_trades (
                        user_id, bot_id, symbol, side, amount, price, 
                        fee, order_id, status, trade_type, position_side, 
                        leverage, amount_state, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """
                
                cursor.execute(
                    insert_query,
                    (
                        user_id, bot_id, symbol, side, executed_qty, price,
                        commission, order_id, status, trade_type, position_side,
                        leverage, executed_qty, datetime.now()
                    )
                )
                
                conn.commit()
        
        logger.info(f"✅ Trade kaydedildi: {symbol} | {side} | {executed_qty} | Order ID: {order_id}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Trade kaydetme hatası: {str(e)}")
        return False

async def get_all_api_margin_leverage_infos() -> Dict[int, Dict[str, Any]]:
    """
    Tüm API ID'leri için margin ve leverage bilgilerini getirir.
    
    Returns:
        dict: {
            111: {
                "BTCUSDT": {"leverage": 10, "margin_boolean": true},
                "ETHUSDT": {"leverage": 5, "margin_boolean": true}
            },
            17: {
                "BNBUSDT": {"leverage": 15, "margin_boolean": false}
            }
        }
    """
    try:
        conn = get_db_connection()
        if not conn:
            logger.error("❌ Veritabanı bağlantısı alınamadı")
            return {}
            
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Tüm API ID'leri ve margin_leverage_infos'ları al
                cursor.execute("""
                    SELECT api_id, margin_leverage_infos, updated_at
                    FROM user_futures_json_settings
                    WHERE margin_leverage_infos IS NOT NULL
                    ORDER BY api_id
                """)
                
                results = cursor.fetchall()
        
        if not results:
            logger.warning("⚠️ Hiç margin/leverage bilgisi bulunamadı")
            return {}
        
        # Sonuçları organize et
        all_infos = {}
        
        for row in results:
            api_id = row["api_id"]
            margin_leverage_data = row["margin_leverage_infos"]
            
            if margin_leverage_data:
                all_infos[api_id] = margin_leverage_data
                logger.debug(f"📊 API ID {api_id}: {len(margin_leverage_data)} sembol")
        
        logger.info(f"✅ {len(all_infos)} API ID için margin/leverage bilgisi alındı")
        return all_infos
        
    except Exception as e:
        logger.error(f"❌ Tüm margin/leverage bilgileri alınamadı: {str(e)}")
        return {}


async def get_user_margin_leverage_info(api_id: int) -> Optional[Dict[str, Any]]:
    """
    Belirtilen API ID için margin ve leverage bilgilerini getirir.
    
    Args:
        api_id (int): API ID
        
    Returns:
        dict: {
            "BTCUSDT": {"leverage": 10, "margin_boolean": true},
            "ETHUSDT": {"leverage": 5, "margin_boolean": true}
        } veya None
    """
    try:
        conn = get_db_connection()
        if not conn:
            logger.error("❌ Veritabanı bağlantısı alınamadı")
            return None
            
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # API ID'ye göre margin_leverage_infos'u al
                cursor.execute("""
                    SELECT margin_leverage_infos, updated_at
                    FROM user_futures_json_settings
                    WHERE api_id = %s
                """, (api_id,))
                
                result = cursor.fetchone()
        
        if not result:
            logger.warning(f"⚠️ API ID {api_id} için margin/leverage bilgisi bulunamadı")
            return None
        
        # JSON verisini kontrol et
        margin_leverage_data = result["margin_leverage_infos"]
        
        if not margin_leverage_data:
            logger.info(f"📊 API ID {api_id} için margin/leverage bilgisi boş")
            return {}
        
        logger.info(f"✅ API ID {api_id} için margin/leverage bilgisi alındı: {len(margin_leverage_data)} sembol")
        return margin_leverage_data
        
    except Exception as e:
        logger.error(f"❌ API ID {api_id} margin/leverage bilgisi alınamadı: {str(e)}")
        return None


async def update_symbol_margin_leverage(api_id: int, symbol: str, leverage: int, margin_boolean: bool) -> bool:
    """
    Belirtilen API ID ve sembol için margin/leverage bilgisini günceller.
    
    Args:
        api_id (int): API ID
        symbol (str): Sembol (örn: "BTCUSDT")
        leverage (int): Leverage değeri
        margin_boolean (bool): Margin durumu (true: ISOLATED, false: CROSSED)
        
    Returns:
        bool: Güncelleme başarılı mı
    """
    try:
        conn = get_db_connection()
        if not conn:
            logger.error("❌ Veritabanı bağlantısı alınamadı")
            return False
            
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Mevcut bilgileri al
                cursor.execute("""
                    SELECT margin_leverage_infos
                    FROM user_futures_json_settings
                    WHERE api_id = %s
                """, (api_id,))
                
                result = cursor.fetchone()
                
                if result:
                    # Mevcut kayıt var, güncelle
                    current_data = result["margin_leverage_infos"] or {}
                    
                    # Yeni sembol bilgisini ekle/güncelle
                    current_data[symbol] = {
                        "leverage": leverage,
                        "margin_boolean": margin_boolean
                    }
                    
                    # Veritabanında güncelle
                    cursor.execute("""
                        UPDATE user_futures_json_settings
                        SET margin_leverage_infos = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE api_id = %s
                    """, (json.dumps(current_data), api_id))
                    
                    logger.info(f"✅ {symbol} margin/leverage bilgisi güncellendi (API ID: {api_id})")
                    
                else:
                    # Yeni kayıt oluştur
                    new_data = {
                        symbol: {
                            "leverage": leverage,
                            "margin_boolean": margin_boolean
                        }
                    }
                    
                    cursor.execute("""
                        INSERT INTO user_futures_json_settings (api_id, margin_leverage_infos, updated_at)
                        VALUES (%s, %s, CURRENT_TIMESTAMP)
                    """, (api_id, json.dumps(new_data)))
                    
                    logger.info(f"✅ {symbol} için yeni margin/leverage kaydı oluşturuldu (API ID: {api_id})")
                
                conn.commit()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ {symbol} margin/leverage bilgisi güncellenemedi (API ID: {api_id}): {str(e)}")
        return False


async def get_symbol_margin_leverage(api_id: int, symbol: str) -> Optional[Dict[str, Any]]:
    """
    Belirtilen API ID ve sembol için margin/leverage bilgisini getirir.
    
    Args:
        api_id (int): API ID
        symbol (str): Sembol (örn: "BTCUSDT")
        
    Returns:
        dict: {"leverage": 10, "margin_boolean": true} veya None
    """
    try:
        # Tüm margin/leverage bilgilerini al
        all_info = await get_user_margin_leverage_info(api_id)
        
        if not all_info:
            return None
        
        # Belirtilen sembolü ara
        symbol_info = all_info.get(symbol)
        
        if symbol_info:
            logger.info(f"✅ {symbol} için margin/leverage bilgisi bulundu (API ID: {api_id})")
            return symbol_info
        else:
            logger.warning(f"⚠️ {symbol} için margin/leverage bilgisi bulunamadı (API ID: {api_id})")
            return None
            
    except Exception as e:
        logger.error(f"❌ {symbol} margin/leverage bilgisi alınamadı (API ID: {api_id}): {str(e)}")
        return None


async def delete_symbol_margin_leverage(api_id: int, symbol: str) -> bool:
    """
    Belirtilen API ID ve sembol için margin/leverage bilgisini siler.
    
    Args:
        api_id (int): API ID
        symbol (str): Sembol (örn: "BTCUSDT")
        
    Returns:
        bool: Silme başarılı mı
    """
    try:
        conn = get_db_connection()
        if not conn:
            logger.error("❌ Veritabanı bağlantısı alınamadı")
            return False
            
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Mevcut bilgileri al
                cursor.execute("""
                    SELECT margin_leverage_infos
                    FROM user_futures_json_settings
                    WHERE api_id = %s
                """, (api_id,))
                
                result = cursor.fetchone()
                
                if result and result["margin_leverage_infos"]:
                    current_data = result["margin_leverage_infos"]
                    
                    # Sembolü sil
                    if symbol in current_data:
                        del current_data[symbol]
                        
                        # Güncellenen veriyi kaydet
                        cursor.execute("""
                            UPDATE user_futures_json_settings
                            SET margin_leverage_infos = %s, updated_at = CURRENT_TIMESTAMP
                            WHERE api_id = %s
                        """, (json.dumps(current_data), api_id))
                        
                        conn.commit()
                        logger.info(f"✅ {symbol} margin/leverage bilgisi silindi (API ID: {api_id})")
                        return True
                    else:
                        logger.warning(f"⚠️ {symbol} API ID {api_id} için bulunamadı")
                        return False
                else:
                    logger.warning(f"⚠️ API ID {api_id} için margin/leverage bilgisi bulunamadı")
                    return False
        
    except Exception as e:
        logger.error(f"❌ {symbol} margin/leverage bilgisi silinemedi (API ID: {api_id}): {str(e)}")
        return False


async def get_active_apis_margin_leverage_infos() -> Dict[int, Dict[str, Any]]:
    """
    Aktif botların API ID'leri için margin ve leverage bilgilerini getirir.
    
    Returns:
        dict: {
            111: {
                "BTCUSDT": {"leverage": 10, "margin_boolean": true},
                "ETHUSDT": {"leverage": 5, "margin_boolean": true}
            }
        }
    """
    try:
        conn = get_db_connection()
        if not conn:
            logger.error("❌ Veritabanı bağlantısı alınamadı")
            return {}
            
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Aktif botların API ID'lerini al ve margin/leverage bilgilerini getir
                cursor.execute("""
                    SELECT DISTINCT 
                        b.api_id,
                        ufjs.margin_leverage_infos
                    FROM bots b
                    JOIN user_futures_json_settings ufjs ON b.api_id = ufjs.api_id
                    WHERE b.active = true
                    AND ufjs.margin_leverage_infos IS NOT NULL
                    ORDER BY b.api_id
                """)
                
                results = cursor.fetchall()
        
        if not results:
            logger.warning("⚠️ Aktif botlar için margin/leverage bilgisi bulunamadı")
            return {}
        
        # Sonuçları organize et
        active_infos = {}
        
        for row in results:
            api_id = row["api_id"]
            margin_leverage_data = row["margin_leverage_infos"]
            
            if margin_leverage_data:
                active_infos[api_id] = margin_leverage_data
                logger.debug(f"📊 Aktif bot API ID {api_id}: {len(margin_leverage_data)} sembol")
        
        logger.info(f"✅ {len(active_infos)} aktif bot için margin/leverage bilgisi alındı")
        return active_infos
        
    except Exception as e:
        logger.error(f"❌ Aktif botlar için margin/leverage bilgileri alınamadı: {str(e)}")
        return {}


async def get_bot_trades(bot_id: int, limit: int = 10) -> List[dict]:
    """
    Bot'un trade kayıtlarını getirir
    
    Args:
        bot_id (int): Bot ID
        limit (int): Kayıt limiti
        
    Returns:
        List[dict]: Trade kayıtları
    """
    try:
        query = """
            SELECT id, symbol, side, amount, price, order_id, status, 
                   trade_type, position_side, created_at
            FROM bot_trades 
            WHERE bot_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        """
        
        # Mevcut connection pool'u kullan
        async with get_db_connection() as conn:
            records = await conn.fetch(query, bot_id, limit)
            
            return [dict(record) for record in records]
            
    except Exception as e:
        logger.error(f"❌ Bot {bot_id} trade kayıtları alınamadı: {str(e)}")
        return []
    
async def main():
    """
    Ana fonksiyon - örnek kullanım
    """
    bot_id = 111  # Örnek bot ID'si
    trade_type = "spot"  # Örnek trade type
    api_credentials = await get_api_credentials_by_bot_id(bot_id, trade_type)
    
    if api_credentials:
        print(f"Bot ID {bot_id} için {trade_type} API kimlik bilgileri: {api_credentials}")
    else:
        print(f"Bot ID {bot_id} için {trade_type} API kimlik bilgileri alınamadı.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    try:
        import asyncio
        asyncio.run(main())
    except Exception as e:
        logger.error(f"❌ Ana fonksiyon çalıştırılırken hata: {str(e)}")
        sys.exit(1)

