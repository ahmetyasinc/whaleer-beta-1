# data_access/repos/crud.py
import asyncio
import logging
from typing import Dict, List, Optional, Any

# Yeni config yapısından connection context manager'ı alıyoruz
from config import asyncpg_connection

# Logger ayarları
logger = logging.getLogger(__name__)

# ==========================================
# YARDIMCI FONKSİYONLAR (Private Helpers)
# ==========================================

async def _fetch(query: str, *args) -> List[Any]:
    """
    Veri çekmek için sarmalayıcı fonksiyon.
    Otomatik connection pool yönetimi sağlar.
    """
    try:
        async with asyncpg_connection() as conn:
            return await conn.fetch(query, *args)
    except Exception as e:
        logger.error(f"❌ Fetch hatası (Query: {query[:50]}...): {e}")
        raise e

async def _execute(query: str, *args) -> None:
    """
    Veri güncellemek/eklemek için sarmalayıcı fonksiyon.
    """
    try:
        async with asyncpg_connection() as conn:
            await conn.execute(query, *args)
    except Exception as e:
        logger.error(f"❌ Execute hatası: {e}")
        raise e

# ==========================================
# BUSINESS LOGIC
# ==========================================

async def get_api_credentials_by_bot_id(bot_id: int, trade_type: str = "spot") -> Dict:
    """
    Bot ID'den API kimlik bilgilerini getirir.
    
    GÜNCELLEME: FuturesGuard'ın doğru çalışması ve Cache eşleşmesi için
    artık 'id' (api_id) ve 'user_id' bilgilerini de döndürüyor.
    """
    try:
        # 1. Bot ID'den api_id'yi al
        bot_query = "SELECT api_id FROM public.bots WHERE id = $1"
        bot_result = await _fetch(bot_query, bot_id)
        
        if not bot_result:
            raise ValueError(f"Bot ID {bot_id} bulunamadı")
        
        api_id = bot_result[0]["api_id"]
        
        # 2. API Key, Secret VE ID bilgilerini çek
        # DİKKAT: Cache sisteminin çalışması için 'id' ve 'user_id' şarttır.
        api_query = """
            SELECT id, user_id, api_key, api_secret 
            FROM public.api_keys 
            WHERE id = $1
        """
        
        api_result = await _fetch(api_query, api_id)
        
        if not api_result:
            raise ValueError(f"API ID {api_id} için kimlik bilgileri bulunamadı")
        
        # Sonuç: {'id': 30, 'user_id': 4, 'api_key': '...', 'api_secret': '...'}
        return dict(api_result[0])
        
    except Exception as e:
        logger.error(f"❌ API kimlik bilgileri hatası (Bot: {bot_id}): {str(e)}")
        raise ValueError(f"API hatası: {str(e)}")

async def get_bot_margin_status(bot_id: int) -> Dict:
    """
    Bot'un margin type durumunu analiz eder.
    """
    try:
        margin_query = """
        SELECT is_isolated, COUNT(*) as position_count
        FROM public.bot_positions 
        WHERE bot_id = $1 
        GROUP BY is_isolated
        """
        
        margin_result = await _fetch(margin_query, bot_id)
        
        status = {
            "bot_id": bot_id,
            "has_positions": False,
            "is_isolated": None,
            "position_count": 0,
            "needs_margin_setting": True,
            "isolated_positions": 0,
            "cross_positions": 0,
            "total_positions": 0
        }

        if not margin_result:
            return status
        
        for row in margin_result:
            count = row["position_count"]
            status["total_positions"] += count
            
            if row["is_isolated"]:
                status["isolated_positions"] = count
            else:
                status["cross_positions"] = count
        
        status["has_positions"] = status["total_positions"] > 0
        status["is_isolated"] = status["isolated_positions"] > 0
        status["needs_margin_setting"] = status["isolated_positions"] == 0
        
        return status
        
    except Exception as e:
        logger.error(f"❌ Bot {bot_id} margin durumu hatası: {str(e)}")
        return {**status, "error": str(e)}

async def update_bot_margin_status(bot_id: int, is_isolated: bool = True) -> bool:
    """
    Bot'un margin type durumunu günceller veya yoksa oluşturur.
    """
    try:
        existing_query = "SELECT 1 FROM public.bot_positions WHERE bot_id = $1 LIMIT 1"
        existing_result = await _fetch(existing_query, bot_id)
        
        if existing_result:
            update_query = """
            UPDATE public.bot_positions 
            SET is_isolated = $1 
            WHERE bot_id = $2
            """
            await _execute(update_query, is_isolated, bot_id)
            # print(f"✅ Bot {bot_id} margin güncellendi: Isolated={is_isolated}")
            
        else:
            user_query = "SELECT user_id FROM public.bots WHERE id = $1"
            user_result = await _fetch(user_query, bot_id)
            
            if user_result:
                user_id = user_result[0]["user_id"]
                insert_query = """
                INSERT INTO public.bot_positions 
                (user_id, bot_id, symbol, average_cost, amount, profit_loss, status, position_side, leverage, percentage, is_isolated)
                VALUES ($1, $2, 'SYSTEM', 0, 0, 0, 'margin_only', 'BOTH', 10, 0, $3)
                """
                await _execute(insert_query, user_id, bot_id, is_isolated)
                # print(f"✅ Bot {bot_id} için yeni margin kaydı oluşturuldu.")
            else:
                logger.error(f"❌ Bot {bot_id} için user_id bulunamadı")
                return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Bot {bot_id} margin update hatası: {str(e)}")
        return False

async def get_bot_active_positions(bot_id: int) -> List[Dict]:
    """
    Bot'un aktif pozisyonlarını getirir.
    """
    try:
        positions_query = """
        SELECT symbol, average_cost, amount, profit_loss, position_side, leverage, is_isolated
        FROM public.bot_positions 
        WHERE bot_id = $1 AND status = 'active'
        ORDER BY symbol
        """
        
        rows = await _fetch(positions_query, bot_id)
        return [dict(pos) for pos in rows] if rows else []
        
    except Exception as e:
        logger.error(f"❌ Bot {bot_id} pozisyon hatası: {str(e)}")
        return []

async def get_multiple_bots_margin_status(bot_ids: List[int]) -> Dict[int, Dict]:
    """
    Çoklu bot margin durumu.
    """
    try:
        if not bot_ids:
            return {}
        
        margin_query = """
        SELECT 
            bot_id,
            is_isolated,
            COUNT(*) as position_count
        FROM public.bot_positions 
        WHERE bot_id = ANY($1::int[])
        GROUP BY bot_id, is_isolated
        """
        
        margin_results = await _fetch(margin_query, bot_ids)
        
        bot_margin_status = {
            bid: {
                "bot_id": bid,
                "has_positions": False,
                "is_isolated": None,
                "isolated_positions": 0,
                "cross_positions": 0,
                "total_positions": 0,
                "needs_margin_setting": True
            } for bid in bot_ids
        }
        
        for row in margin_results:
            bot_id = row["bot_id"]
            if bot_id in bot_margin_status:
                status = bot_margin_status[bot_id]
                status["has_positions"] = True
                status["total_positions"] += row["position_count"]
                
                if row["is_isolated"]:
                    status["isolated_positions"] = row["position_count"]
                    status["is_isolated"] = True
                    status["needs_margin_setting"] = False
                else:
                    status["cross_positions"] = row["position_count"]
        
        return bot_margin_status
        
    except Exception as e:
        logger.error(f"❌ Çoklu bot margin hatası: {str(e)}")
        return {}

async def get_all_futures_bots_with_api() -> List[Dict]:
    """
    Tüm futures botlarını tek seferde çeker.
    """
    try:
        bots_query = """
        SELECT 
            b.id as bot_id,
            b.name as bot_name,
            b.user_id,
            b.api_id,
            ak.api_key,
            ak.api_secret
        FROM public.bots b
        JOIN public.api_keys ak ON b.api_id = ak.id
        WHERE ak.api_key IS NOT NULL AND ak.api_secret IS NOT NULL
        ORDER BY b.id
        """
        
        bots_result = await _fetch(bots_query)
        
        if not bots_result:
            return []
        
        bot_ids = [bot["bot_id"] for bot in bots_result]
        margin_statuses = await get_multiple_bots_margin_status(bot_ids)
        
        futures_bots = []
        for bot in bots_result:
            bot_info = dict(bot)
            bot_id = bot_info["bot_id"]
            
            if bot_id in margin_statuses:
                bot_info.update(margin_statuses[bot_id])
            
            futures_bots.append(bot_info)
        
        return futures_bots
        
    except Exception as e:
        logger.error(f"❌ Futures bot listesi hatası: {str(e)}")
        return []

async def batch_get_api_credentials(bot_ids: List[int], trade_type: str = "futures") -> Dict[int, Dict]:
    """
    Çoklu bot API bilgilerini çeker.
    """
    try:
        if not bot_ids:
            return {}
        
        if trade_type.lower() == "futures":
            batch_query = """
            SELECT 
                b.id as bot_id,
                ak.api_key,
                ak.api_secret,
                ak.id as api_id,
                ak.user_id
            FROM public.bots b
            JOIN public.api_keys ak ON b.api_id = ak.id
            WHERE b.id = ANY($1::int[])
            """
        else:
            batch_query = """
            SELECT 
                b.id as bot_id,
                ak.ed_public,
                ak.ed_private,
                ak.id as api_id,
                ak.user_id
            FROM public.bots b
            JOIN public.api_keys ak ON b.api_id = ak.id
            WHERE b.id = ANY($1::int[])
            """
        
        batch_result = await _fetch(batch_query, bot_ids)
        
        credentials = {}
        for row in batch_result:
            d = dict(row)
            bid = d.pop("bot_id")
            credentials[bid] = d
        
        return credentials
        
    except Exception as e:
        logger.error(f"❌ Batch API credentials hatası: {str(e)}")
        return {}

async def get_symbols_filters_dict(symbols_and_types: Dict[str, str]) -> Dict[str, Dict]:
    """
    Sembol filtrelerini getirir.
    """
    try:
        if not symbols_and_types:
            return {}
        
        conditions = []
        params = []
        param_index = 1
        
        for symbol, trade_type in symbols_and_types.items():
            conditions.append(f"(binance_symbol = ${param_index} AND trade_type = ${param_index + 1})")
            params.extend([symbol, trade_type])
            param_index += 2
        
        symbols_query = f"""
        SELECT binance_symbol, step_size, min_qty, tick_size, trade_type
        FROM public.symbol_filters
        WHERE {' OR '.join(conditions)}
        """
        
        symbols_result = await _fetch(symbols_query, *params)
        
        symbols_dict = {}
        if symbols_result:
            for row in symbols_result:
                s_dict = dict(row)
                symbols_dict[s_dict["binance_symbol"]] = {
                    "step_size": float(s_dict["step_size"]),
                    "min_qty": float(s_dict["min_qty"]),
                    "tick_size": float(s_dict["tick_size"]),
                    "trade_type": s_dict["trade_type"]
                }
        
        return symbols_dict
        
    except Exception as e:
        logger.error(f"❌ Sembol filtreleri hatası: {str(e)}")
        return {}

async def insert_bot_trade(trade_data: dict):
    """
    public.bot_trades tablosuna işlem sonucunu kaydeder.
    
    DÜZELTME NOTLARI:
    1. order_id ($12): DB'de VARCHAR(64) -> str() olarak gönderiliyor.
    2. algo_id ($13): DB'de BIGINT -> int() olarak gönderiliyor. (HATA BURADAYDI)
    """
    
    sql = """
    INSERT INTO public.bot_trades (
        user_id, bot_id, symbol, side, trade_type, 
        order_type, position_side, leverage, 
        amount, amount_state, price, 
        order_id, algo_id, 
        client_algo_id,
        status, fee, created_at
    ) VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, 
        $9, $10, $11, 
        $12, $13, 
        $14, 
        $15, $16, NOW()
    )
    RETURNING id;
    """
    
    # Fee (Komisyon) genelde float gelir
    fee_amount = trade_data.get("fee", 0.0)

    # ID Değerlerini güvenli şekilde alalım
    order_id_val = trade_data.get("order_id")
    algo_id_val = trade_data.get("algo_id")

    params = (
        trade_data.get("user_id"),
        trade_data.get("bot_id"),
        trade_data.get("symbol"),
        trade_data.get("side"),          
        trade_data.get("trade_type"),    
        trade_data.get("order_type", "DEFAULT"),    
        trade_data.get("position_side"), 
        trade_data.get("leverage"),
        
        trade_data.get("amount"),        
        trade_data.get("amount_state"),  
        trade_data.get("price"),         
        
        # --- KRİTİK DÜZELTME BURADA ---
        
        # $12: order_id -> DB: VARCHAR (String)
        # Eğer değer varsa string'e çevir, yoksa None gönder.
        str(order_id_val) if order_id_val is not None else None, 
        
        # $13: algo_id -> DB: BIGINT (Integer)
        # HATA ÇÖZÜMÜ: Burası eskiden str() idi, int() yapıldı.
        int(algo_id_val) if algo_id_val is not None else None,

        # $14: client_algo_id -> DB: VARCHAR (String)
        # Zaten string gelir, dokunmuyoruz.
        trade_data.get("client_algo_id"),
        
        # ------------------------------
        
        trade_data.get("status"),
        float(fee_amount)
    )

    try:
        async with asyncpg_connection() as conn:
            record_id = await conn.fetchval(sql, *params)
            return record_id
    except Exception as e:
        # Hata durumunda loga basar ama programı durdurmaz (None döner)
        logger.error(f"❌ Trade DB Kayıt Hatası: {e}")
        return None

# ==========================================
# TEST BLOKU (OPSİYONEL)
# ==========================================
async def main():
    print("🚀 CRUD Test Başlıyor...")
    # Test kodları buraya gelebilir
    from config import close_async_pool
    await close_async_pool()

if __name__ == "__main__":
    asyncio.run(main())