import asyncio
import time
import logging
import hmac
import hashlib
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Optional, Any, List

# Network Modüllerini Import Et
try:
    from backend.trade_engine.order_engine.core.network.network_binance import BinanceNetworkAdapter
    from backend.trade_engine.order_engine.core.network.network_adapter import NetworkResponse
except ImportError:
    logging.warning("Network modülleri bulunamadı. Mock data gerekebilir.")

logger = logging.getLogger(__name__)

# =========================================================
# 1. VERİ YAPILARI (DATA STRUCTURES)
# =========================================================

@dataclass(slots=True)
class SymbolConfig:
    leverage: int
    is_isolated: bool
    last_update: float = field(default_factory=time.time)
    ready: bool = False

@dataclass(slots=True)
class ApiSession:
    api_id: int
    hedge_mode: bool = False  # Varsayılan False, kontrol edilmeli
    symbols: Dict[str, SymbolConfig] = field(default_factory=dict)

@dataclass(slots=True)
class UserContext:
    user_id: int
    apis: Dict[int, ApiSession] = field(default_factory=dict)

# =========================================================
# 2. STATE MANAGER (OPTİMİZE EDİLDİ)
# =========================================================

class FuturesStateManager:
    def __init__(self):
        self._store: Dict[int, UserContext] = {}

    def get_symbol_config(self, user_id: int, api_id: int, symbol: str) -> Optional[SymbolConfig]:
        try:
            return self._store[user_id].apis[api_id].symbols[symbol]
        except (KeyError, AttributeError):
            return None

    def get_api_hedge_mode(self, user_id: int, api_id: int) -> bool:
        """Cache'den hedge modunu döndürür. Veri yoksa False döner."""
        try:
            return self._store[user_id].apis[api_id].hedge_mode
        except (KeyError, AttributeError):
            return False

    def update_hedge_mode(self, user_id: int, api_id: int, hedge: bool):
        """Sadece Hedge Mode bilgisini günceller."""
        if user_id not in self._store:
            self._store[user_id] = UserContext(user_id=user_id)
        
        user_ctx = self._store[user_id]
        if api_id not in user_ctx.apis:
            user_ctx.apis[api_id] = ApiSession(api_id=api_id, hedge_mode=hedge)
        else:
            user_ctx.apis[api_id].hedge_mode = hedge

    def update_state(self, user_id: int, api_id: int, symbol: str, lev: int, is_iso: bool, hedge: bool):
        # 1. Hedge modunu güncelle
        self.update_hedge_mode(user_id, api_id, hedge)
        
        # 2. Sembol ayarlarını güncelle
        session = self._store[user_id].apis[api_id]
        if symbol in session.symbols:
            cfg = session.symbols[symbol]
            cfg.leverage = lev
            cfg.is_isolated = is_iso
            cfg.last_update = time.time()
            cfg.ready = True
        else:
            session.symbols[symbol] = SymbolConfig(leverage=lev, is_isolated=is_iso, ready=True)

    async def load_state_from_db(self, pool):
        """
        [User + API ID] kombinasyonuna göre ayarları yükler.
        Doğrusu budur çünkü Binance ayarları API Key (Hesap) bazlıdır.
        """
        logger.info("♻️ Futures Cache: User+API bazlı yükleme başlatılıyor...")
        
        # position_mode (Hedge Mode) verisini de çekiyoruz
        query = """
            SELECT user_id, api_id, symbol, leverage, margin_type, position_mode
            FROM public.user_symbol_settings
            WHERE exchange = 'Binance'
        """
        
        try:
            rows = await pool.fetch(query)
            count = 0
            
            for row in rows:
                u_id = row['user_id']
                a_id = row['api_id']  # <-- En kritik anahtar burası
                sym = row['symbol']
                
                # Veritabanındaki değerleri al
                lev = row['leverage']
                is_isolated = row['margin_type']
                
                # position_mode null gelirse varsayılan False (One-Way) olsun
                is_hedge = row['position_mode'] if row['position_mode'] is not None else False
                
                # Cache'i güncelle (User -> API -> Symbol hiyerarşisiyle)
                self.update_state(
                    user_id=u_id,
                    api_id=a_id, # API ID burada ayırt edici faktördür
                    symbol=sym,
                    lev=lev,
                    is_iso=is_isolated,
                    hedge=is_hedge
                )
                count += 1
            
            logger.info(f"✅ Cache Hazır: {count} ayar [User+API] bazlı olarak RAM'e yüklendi.")
            
        except Exception as e:
            logger.error(f"❌ Cache yükleme hatası: {e}", exc_info=True)

# =========================================================
# 3. EXCHANGE INTERFACE
# =========================================================

class BaseExchange(ABC):
    def __init__(self, api_key: str, private_key: str, is_test: bool = False):
        self.api_key = api_key
        self.private_key = private_key
        self.is_test = is_test
        self.name = "Unknown"
        self.time_offset = 0  # Server Time - Local Time

    @abstractmethod
    async def sync_time(self): pass

    @abstractmethod
    async def set_leverage(self, symbol: str, leverage: int) -> bool: pass

    @abstractmethod
    async def set_margin_type(self, symbol: str, is_isolated: bool) -> bool: pass

    @abstractmethod
    async def set_position_mode(self, dual_side: bool) -> bool: pass

    @abstractmethod
    async def get_position_mode(self) -> bool: pass
    
    @abstractmethod
    async def get_account_positions(self) -> List[Dict]: pass
    
    @abstractmethod
    async def close(self): pass

# =========================================================
# 4. BINANCE IMPLEMENTATION (HATA YÖNETİMİ GÜÇLENDİRİLDİ)
# =========================================================

class BinanceFuturesExchange(BaseExchange):
    def __init__(self, api_key: str, private_key: str, is_test: bool = False):
        super().__init__(api_key, private_key, is_test)
        self.name = "Binance"
        self.base_url = "https://testnet.binancefuture.com/fapi/v1" if is_test else "https://fapi.binance.com/fapi/v1"
        self.v2_base_url = "https://testnet.binancefuture.com/fapi/v2" if is_test else "https://fapi.binance.com/fapi/v2"
        
        # Pool size ve concurrent limitleri korundu
        self.network = BinanceNetworkAdapter(timeout=10, pool_size=100, max_concurrent_requests=20)

    async def sync_time(self):
        """Sunucu zamanı ile senkronize ol"""
        try:
            url = f"{self.base_url}/time"
            resp = await self.network.get(url)
            if resp.success and resp.data:
                server_time = int(resp.data.get("serverTime"))
                local_time = int(time.time() * 1000)
                self.time_offset = server_time - local_time
                logger.info(f"⏳ Zaman Senkronizasyonu: Offset {self.time_offset}ms")
            else:
                logger.warning("⚠️ Zaman senkronizasyonu başarısız, offset 0 varsayılıyor.")
        except Exception as e:
            logger.error(f"❌ Zaman senkronizasyonu hatası: {e}")

    async def close(self):
        await self.network.close()

    async def _hmac_sign(self, payload: str) -> str:
        return hmac.new(self.private_key.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()

    # --- DÜZELTME BURADA: resp.json_data yerine resp.data ---
    async def _post_signed(self, endpoint: str, params: dict) -> tuple[bool, dict]:
        try:
            # Timestamp Calculation with Offset
            params["timestamp"] = int(time.time() * 1000 + self.time_offset)
            query = "&".join([f"{k}={v}" for k, v in params.items()])
            params["signature"] = await self._hmac_sign(query)
            
            headers = {"X-MBX-APIKEY": self.api_key}
            url = f"{self.base_url}{endpoint}"

            # 👇 DEBUG LOGLARI BURAYA (FUTURES İÇİN) 👇
            logger.debug(f"--------------------------------------------------")
            logger.debug(f"🚀 [FUTURES ISTEK] {url}")
            logger.debug(f"📦 [PARAMETRELER] {params}")
            logger.debug(f"--------------------------------------------------")

            resp: NetworkResponse = await self.network.post(url, headers=headers, data=params)

            if resp.success:
                # DÜZELTME: NetworkAdapter yapısına uygun olarak resp.data kullanıyoruz
                data = resp.data if resp.data else {}
                return True, data
            
            # Hata Yönetimi
            try:
                # Error data için de resp.data veya text parse deneyelim
                error_data = resp.data if resp.data else json.loads(resp.text)
                if error_data.get("code") == -4046:
                    return True, {}
            except:
                pass
            
            if resp.text and "No need" in resp.text:
                return True, {}
                
            logger.error(f"Binance Error ({endpoint}): {resp.error_msg} - {resp.text}")
            
            # Hata detayını çağıran yere dönüyoruz ki kullanıcıya gösterebilelim
            final_error_data = {}
            try:
                final_error_data = resp.data if resp.data else json.loads(resp.text)
            except:
                final_error_data = {"msg": resp.text, "code": "UNKNOWN"}
                
            return False, final_error_data

        except Exception as e:
            logger.error(f"Binance POST Exception: {e}")
            return False, {}

    async def set_leverage(self, symbol: str, leverage: int) -> bool:
        # Tuple döndüğü için ilk elemanını (success) alıyoruz
        return (await self._post_signed("/leverage", {"symbol": symbol, "leverage": leverage}))[0]

    async def set_margin_type(self, symbol: str, is_isolated: bool) -> bool:
        type_str = "ISOLATED" if is_isolated else "CROSSED"
        return (await self._post_signed("/marginType", {"symbol": symbol, "marginType": type_str}))[0]

    async def set_position_mode(self, dual_side: bool) -> bool:
        val_str = "true" if dual_side else "false"
        return (await self._post_signed("/positionSide/dual", {"dualSidePosition": val_str}))[0]

    async def get_position_mode(self) -> bool:
        """
        API'den mevcut modun Hedge (Dual Side) olup olmadığını sorgular.
        Zaman senkronizasyonu kullanır.
        """
        try:
            params = {"timestamp": int(time.time() * 1000 + self.time_offset)}
            query = "&".join([f"{k}={v}" for k, v in params.items()])
            sig = await self._hmac_sign(query)
            
            headers = {"X-MBX-APIKEY": self.api_key}
            url = f"{self.base_url}/positionSide/dual?{query}&signature={sig}"
            
            resp: NetworkResponse = await self.network.get(url, headers=headers)
            
            # { "dualSidePosition": true/false, ... }
            if resp.success and resp.data:
                return resp.data.get("dualSidePosition", False)
            return False
            
        except Exception as e:
            logger.error(f"Get Position Mode Error: {e}")
            return False


    async def get_account_positions(self) -> List[Dict]:
        try:
            params = {"timestamp": int(time.time() * 1000 + self.time_offset)}
            query = "&".join([f"{k}={v}" for k, v in params.items()])
            sig = await self._hmac_sign(query)
            
            headers = {"X-MBX-APIKEY": self.api_key}
            url = f"{self.v2_base_url}/account?{query}&signature={sig}"
            
            resp: NetworkResponse = await self.network.get(url, headers=headers)
            
            if resp.success and resp.data:
                return resp.data.get("positions", [])
            return []
        except Exception as e:
            logger.error(f"Get Positions Exception: {e}")
            return []

# =========================================================
# 5. FUTURES GUARD (HEDGE MODE CACHING & SYNC)
# =========================================================

class FuturesGuard:
    # Singleton benzeri kullanım için class attribute
    state_manager = FuturesStateManager()

    def __init__(self, exchange: BaseExchange, api_id: int, user_id: int):
        self.exchange = exchange
        self.api_id = api_id
        self.user_id = user_id
        self.trade_type_db = "futures"

    async def check_batch_orders(self, conn, orders: List[Any]) -> List[Any]:
        if not orders: return []
        tasks = []
        for order in orders:
            # Order objesi dict veya class instance olabilir
            symbol = order.get('symbol') if isinstance(order, dict) else getattr(order, 'symbol', None)
            target_lev = order.get('leverage', 20) if isinstance(order, dict) else getattr(order, 'leverage', 20)

            if symbol:
                tasks.append(self._verify_single_order_safe(conn, order, symbol, target_lev))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        valid_orders = []
        for res in results:
            if res and not isinstance(res, Exception):
                valid_orders.append(res)
        return valid_orders

    async def _verify_single_order_safe(self, conn, order_obj, symbol: str, target_lev: int):
        try:
            applied_lev = await self.get_leverage_fast(conn, symbol, target_lev)
            # Eğer 0 döndüyse ayar yapılamamış demektir, emri iptal et.
            if applied_lev == 0: return None
            
            # Ayarlanan leverage, istenenle eşleşiyor mu?
            return order_obj if applied_lev == target_lev else None
        except Exception as e:
            logger.error(f"❌ Verification Failed {symbol}: {e}")
            return None

    async def get_leverage_fast(self, conn, symbol: str, required_leverage: int) -> int:
        # Cache Kontrolü
        sym_cfg = self.state_manager.get_symbol_config(self.user_id, self.api_id, symbol)
        account_hedge = self.state_manager.get_api_hedge_mode(self.user_id, self.api_id)

        # Eğer cache'de her şey tamamsa ve istediğimiz gibiyse API'ye gitme
        if sym_cfg and sym_cfg.ready:
            if (sym_cfg.leverage == required_leverage and 
                sym_cfg.is_isolated is True and 
                account_hedge is True):
                return sym_cfg.leverage

        # Cache eksik veya hatalı -> API ile Senkronize Ol
        return await self._sync_change_process(conn, symbol, required_leverage)

    async def _sync_change_process(self, conn, symbol: str, target_lev: int) -> int:
        """
        API ile senkronizasyon sağlar.
        Strateji:
        1. Hedge Mode Cache kontrol et -> False ise API'den aç.
        2. Margin Type (Isolated) -> API'den ayarla.
        3. Leverage -> API'den ayarla.
        4. Başarılıysa DB ve Cache güncelle.
        """
        
        # --- ADIM 1: POSITION (HEDGE) MODE ---
        cached_hedge = self.state_manager.get_api_hedge_mode(self.user_id, self.api_id)
        is_hedge_verified = cached_hedge

        if not is_hedge_verified:
            # Önce gerçekten ne olduğunu soralım (API'ye güven)
            actual_mode = await self.exchange.get_position_mode()
            
            if actual_mode:
                 # Zaten Hedge modundaymış!
                 is_hedge_verified = True
                 self.state_manager.update_hedge_mode(self.user_id, self.api_id, True)
            else:
                # One-Way modunda, değiştirmeyi dene
                try:
                    if await self.exchange.set_position_mode(True):
                        is_hedge_verified = True
                        self.state_manager.update_hedge_mode(self.user_id, self.api_id, True)
                    else:
                        logger.warning(f"⚠️ Hedge Mode aktif edilemedi (User: {self.user_id}). One-Way devam ediliyor.")
                except Exception as e:
                    logger.error(f"Position Mode API Error: {e}")

        # --- ADIM 2: MARGIN TYPE (ISOLATED) ---
        if not await self.exchange.set_margin_type(symbol, True):
            logger.error(f"❌ {symbol} Margin Type (ISOLATED) ayarlanamadı. Emir iptal.")
            return 0

        # --- ADIM 3: LEVERAGE ---
        if not await self.exchange.set_leverage(symbol, target_lev):
            logger.error(f"❌ {symbol} Leverage ({target_lev}x) ayarlanamadı.")
            return 0 

        # --- ADIM 4: DB & CACHE UPDATE ---
        # İşlemler başarılı, son durumu kaydet.
        
        # A) DB Upsert (Asyncpg)
        await self._upsert_db_settings(
            conn, 
            symbol, 
            is_isolated=True, 
            lev=target_lev, 
            is_hedge=is_hedge_verified
        )

        # B) Cache Update
        self.state_manager.update_state(
            self.user_id, 
            self.api_id, 
            symbol, 
            target_lev, 
            is_iso=True, 
            hedge=is_hedge_verified
        )
        
        return target_lev

    async def _upsert_db_settings(self, conn, symbol: str, is_isolated: bool, lev: int, is_hedge: bool):
        try:
            query = """
                INSERT INTO public.user_symbol_settings 
                (user_id, api_id, symbol, trade_type, margin_type, leverage, position_mode, exchange, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                ON CONFLICT (user_id, api_id, symbol, trade_type) 
                DO UPDATE SET 
                    margin_type = EXCLUDED.margin_type,
                    leverage = EXCLUDED.leverage,
                    position_mode = EXCLUDED.position_mode,
                    exchange = EXCLUDED.exchange,
                    updated_at = NOW()
            """
            
            await conn.execute(
                query,
                self.user_id, self.api_id, symbol, self.trade_type_db, 
                is_isolated, lev, is_hedge, self.exchange.name
            )
            
        except Exception as e:
            logger.error(f"❌ DB Write Hatası: {e}")