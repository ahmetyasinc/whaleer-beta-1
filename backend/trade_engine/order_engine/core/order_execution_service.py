import asyncio
import logging
import time
import hmac
import uuid
import hashlib
from typing import Dict, Any, Optional
from dataclasses import dataclass

# --- Proje İçi Bağımlılıklar ---
from config import asyncpg_connection
from data_access.repos.symbol_filters import SymbolFilterRepo
from data_access.repos import crud
from core.price_store import price_store

# Logic Katmanları
from core.order_normalizer import OrderNormalizer
from core.exchange_definitions import ExchangeDefinitionFactory

# Network & Exchange
from core.network.network_binance import BinanceNetworkAdapter
from exchanges.binance.arregements.futures_arragements import BaseExchange, BinanceFuturesExchange, FuturesGuard

logger = logging.getLogger("OrderService")

# =========================================================
# 1. RATE LIMITER (Hız Sınırı Koruyucusu)
# =========================================================
class RateLimiter:
    """
    Token Bucket algoritması ile saniyede belirli sayıda işleme izin verir.
    Fazlası gelirse asenkron olarak bekletir (Damla damla akış sağlar).
    """
    def __init__(self, max_rate: int, time_window: int = 1):
        self.rate = max_rate
        self.window = time_window
        self.tokens = max_rate
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self):
        """İzin al, token yoksa bekle."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            
            # Zaman penceresi dolduysa tokenları yenile
            if elapsed > self.window:
                self.tokens = self.rate
                self.last_update = now
            
            # Token bittiyse, pencerenin dolmasını bekle
            if self.tokens <= 0:
                wait_time = self.window - elapsed
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                    self.tokens = self.rate - 1
                    self.last_update = time.monotonic()
            else:
                self.tokens -= 1

# =========================================================
# 2. BINANCE SPOT EXCHANGE
# =========================================================
class BinanceSpotExchange(BaseExchange):
    """Binance Spot API Uygulaması (Standart HMAC)"""
    def __init__(self, api_key: str, private_key: str, is_test: bool = False):
        super().__init__(api_key, private_key, is_test)
        self.name = "BinanceSpot"
        self.base_url = "https://testnet.binance.vision/api/v3" if is_test else "https://api.binance.com/api/v3"
        self.network = BinanceNetworkAdapter(timeout=10, pool_size=100)

    async def close(self):
        await self.network.close()

    # Spot'ta bu metodlar pass geçilir
    async def set_leverage(self, symbol: str, leverage: int) -> bool: return True
    async def set_margin_type(self, symbol: str, is_isolated: bool) -> bool: return True
    async def set_position_mode(self, dual_side: bool) -> bool: return True
    async def get_account_positions(self) -> list: return []

    # --- DÜZELTME BURADA: resp.json() yerine resp.data kullanıldı ---
    async def _post_signed(self, endpoint: str, params: dict) -> tuple[bool, dict]:
        # Key Kontrolü
        if not self.api_key or not self.private_key:
            logger.error(f"❌ Spot Error: API Key veya Secret TANIMSIZ! Endpoint: {endpoint}")
            return False, {}

        try:
            params["timestamp"] = int(time.time() * 1000)
            query = "&".join([f"{k}={v}" for k, v in params.items()])
            
            # HMAC SHA256 İmzalama
            secret_bytes = self.private_key.encode("utf-8")
            query_bytes = query.encode("utf-8")
            
            sig = hmac.new(secret_bytes, query_bytes, hashlib.sha256).hexdigest()
            params["signature"] = sig
            
            headers = {"X-MBX-APIKEY": self.api_key}
            url = f"{self.base_url}{endpoint}"

            
            
            logger.debug(f"--------------------------------------------------")
            logger.debug(f"🚀 [ISTEK BASLATIYOR] {self.name}")
            logger.debug(f"🔗 URL    : {url}")
            logger.debug(f"📦 PARAMS : {params}")
            logger.debug(f"--------------------------------------------------")
            # ------------------------------------------------------------------
            
            resp = await self.network.post(url, headers=headers, data=params)
            
            if resp.success: 
                # DÜZELTME: resp.data kullanıyoruz çünkü NetworkAdapter yapın böyle
                data = resp.data if resp.data else {}
                return True, data
            
            logger.error(f"Spot Error: {resp.text}")
            return False, {}
        except Exception as e:
            logger.error(f"Spot Exception: {e}")
            return False, {}

# =========================================================
# 3. VERİ TRANSFER OBJELERİ
# =========================================================
@dataclass
class OrderRequest:
    bot_id: int
    symbol: str
    side: str          # BUY / SELL
    amount_usd: float  # İşlem Hacmi (Margin)
    
    # Opsiyoneller
    exchange_name: str = "binance"
    trade_type: str = "futures"    # spot / futures
    leverage: int = 1
    order_type: str = "MARKET"
    price: Optional[float] = None
    stop_price: Optional[float] = None
    reduce_only: bool = False
    time_in_force: str = "GTC"
    position_side: Optional[str] = None
    #09.12.25
    callback_rate: Optional[float] = None   # Trailing Stop için %
    working_type: str = "CONTRACT_PRICE"    # MARK_PRICE veya CONTRACT_PRICE

@dataclass
class SessionContext:
    exchange: BaseExchange
    guard: Optional[FuturesGuard]
    user_id: int  # DB kayıtları için gerekli

# =========================================================
# 4. ANA SERVİS: ORDER EXECUTION ENGINE
# =========================================================
class OrderExecutionService:
    def __init__(self):
        # Kuyruklar
        self.queue_futures = asyncio.Queue()
        self.queue_spot = asyncio.Queue()
        
        self.running = False
        self.filter_repo = SymbolFilterRepo()
        
        # 🔥 HIZ LİMİTLERİ (Rate Limiters)
        self.limiter_futures = RateLimiter(max_rate=28, time_window=1)
        self.limiter_spot = RateLimiter(max_rate=8, time_window=1)
        
        # Session Cache: (bot_id, trade_type) -> SessionContext
        self._sessions: Dict[tuple, SessionContext] = {}
        self._workers = []

    async def start(self, futures_workers=5, spot_workers=2):
        """Servisi başlatır."""
        logger.info("🚀 Order Engine Başlatılıyor...")
        
        # 1. Filtreleri Yükle
        if not await self.filter_repo.initialize():
            logger.critical("❌ Filtreler yüklenemedi! Servis duruyor.")
            return

        self.running = True

        # 2. Workerları Başlat
        for i in range(futures_workers):
            self._workers.append(asyncio.create_task(
                self._worker_loop(self.queue_futures, "FUTURES", i, self.limiter_futures)
            ))
        
        for i in range(spot_workers):
            self._workers.append(asyncio.create_task(
                self._worker_loop(self.queue_spot, "SPOT", i, self.limiter_spot)
            ))
            
        logger.info(f"✅ Motor Aktif: {futures_workers} Futures Worker | {spot_workers} Spot Worker")

    async def stop(self):
        """Servisi durdurur ve bağlantıları kapatır."""
        self.running = False
        
        # Sessionları temizle
        for key, ctx in self._sessions.items():
            await ctx.exchange.close()
        self._sessions.clear()
        logger.info("🛑 Motor Durduruldu.")

    async def submit_order(self, req: OrderRequest):
        """Dış dünyadan gelen emri doğru kuyruğa atar."""
        target_queue = self.queue_spot if req.trade_type == "spot" else self.queue_futures
        await target_queue.put(req)

    # ---------------------------------------------------------
    # WORKER LOOP
    # ---------------------------------------------------------
    async def _worker_loop(self, queue: asyncio.Queue, lane_name: str, worker_id: int, limiter: RateLimiter):
        logger.debug(f"Worker {lane_name}-{worker_id} hazır.")
        while self.running:
            try:
                # 1. Kuyruktan Emir Al
                req: OrderRequest = await queue.get()
                
                # 2. 🔥 RATE LIMITER KONTROLÜ
                await limiter.acquire()
                
                # 3. İşlem Hattını Çalıştır
                await self._execute_pipeline(req)
                
                queue.task_done()
            except Exception as e:
                logger.error(f"💥 Worker {lane_name}-{worker_id} Exception: {e}", exc_info=True)
    def _calculate_commission_in_usd(self, response_data: dict) -> float:
        """
        Borsa cevabındaki 'fills' bilgisini tarar, ödenen komisyonu
        PriceStore kullanarak USD'ye çevirir.
        """
        total_fee_usd = 0.0
        fills = response_data.get("fills", [])
        
        if not fills:
            return 0.0

        for fill in fills:
            try:
                commission = float(fill.get("commission", 0))
                asset = fill.get("commissionAsset", "USDT") 

                if asset in ["USDT", "BUSD", "USDC", "USD"]:
                    total_fee_usd += commission
                else:
                    symbol_key = f"{asset}USDT"
                    # Burası RAM'den okuduğu için çok hızlıdır, bloklamaz.
                    ticker = price_store.get_price("BINANCE_SPOT", symbol_key)
                    
                    if ticker:
                        price_usd = ticker.last
                        total_fee_usd += (commission * price_usd)
            except Exception as e:
                logger.error(f"Fee Hesaplama Hatası: {e}")

        return total_fee_usd
    
    def _generate_client_id(self, bot_id: int) -> str:
        """
        Benzersiz bir Client ID oluşturur.
        Format: b{bot_id}_{kısa_uuid}
        Örnek: b120_a1b2c3d4
        Binance limiti genelde 36 karakterdir, bu format güvenlidir.
        """
        unique_suffix = uuid.uuid4().hex[:12]
        return f"b{bot_id}_{unique_suffix}"

    # ---------------------------------------------------------
    # PIPELINE (İŞLEM HATTI)
    # ---------------------------------------------------------
    async def _execute_pipeline(self, req: OrderRequest):
        import uuid # ID üretimi için gerekli
        start_t = time.perf_counter()
        
        # ADIM 1: Session (Bağlantı) Hazırlığı
        session = await self._get_or_create_session(req)
        if not session: return

        # ADIM 2: Anlık Fiyat (RAM)
        price_key = f"{req.exchange_name.upper()}_{req.trade_type.upper()}" 
        if "TEST" in req.trade_type.upper(): price_key = f"{req.exchange_name.upper()}_FUTURES"

        ticker = price_store.get_price(price_key, req.symbol)
        if not ticker:
            logger.warning(f"⚠️ Fiyat Yok: {price_key} -> {req.symbol}")
            return
        
        current_price = ticker.last

        # ADIM 3: Normalizasyon
        raw_dict = {
            "coin_id": req.symbol,
            "trade_type": req.trade_type,
            "value": req.amount_usd,
            "leverage": req.leverage,
            "side": req.side,
            "price": req.price,
            "stopPrice": req.stop_price,
            "order_type": req.order_type,
            "reduce_only": req.reduce_only
        }
        
        normalized_result = OrderNormalizer.normalize_order(raw_dict, self.filter_repo._cache, current_price)
        if not normalized_result:
            return 

        api_params = normalized_result["api_params"]
        formatted_qty = api_params.get("quantity")
        formatted_price = api_params.get("price") 

        # --- ID OLUŞTURMA ---
        # Format: b{bot_id}_{random_hex} -> Örnek: b120_a1b2c3d4e5f6
        client_oid = f"b{req.bot_id}_{uuid.uuid4().hex[:12]}"

        # ADIM 4: Tanımlama
        try:
            definition = ExchangeDefinitionFactory.get_definition(req.exchange_name, req.trade_type)
            
            # Parametreyi borsaya iletiyoruz (API'de algo veya normal id olarak gidecek)
            endpoint, payload = definition.prepare_request(
                req, 
                formatted_price, 
                formatted_qty, 
                client_order_id=client_oid
            )
        except ValueError as e:
            logger.error(f"⛔ Tanım Hatası: {e}")
            return

        # ADIM 5: Güvenlik (Guard)
        if req.trade_type == "futures" and session.guard:
            try:
                async with asyncpg_connection() as conn:
                    await session.guard.get_leverage_fast(conn, req.symbol, req.leverage)
            except Exception as e:
                logger.error(f"🛡️ Guard Blokladı: {e}")
                return

        # ADIM 6: Ateşleme (Network)
        success, response_data = await session.exchange._post_signed(endpoint, payload)

        elapsed = (time.perf_counter() - start_t) * 1000
        status_icon = "✅" if success else "❌"
        logger.info(f"{status_icon} [BOT:{req.bot_id}] [{req.trade_type.upper()}] {req.symbol} {req.side} | {elapsed:.2f}ms")

        # ADIM 7: Veritabanı Kaydı
        if success and response_data:
            # executedQty bazen string gelir, floata çeviriyoruz.
            exec_qty = float(response_data.get("executedQty", 0))
            
            # Ortalama fiyatı bulmaya çalışalım (Futures vs Spot farkı)
            avg_p = float(response_data.get("avgPrice", 0))
            if avg_p == 0 and "cummulativeQuoteQty" in response_data and exec_qty > 0:
                 # Spot market emirlerinde avgPrice dönmeyebilir, kendimiz hesaplarız
                 cumm_quote = float(response_data["cummulativeQuoteQty"])
                 avg_p = cumm_quote / exec_qty

            fee_usd = self._calculate_commission_in_usd(response_data)

            # --- ID AYRIŞTIRMA ---
            final_order_id = response_data.get("orderId")
            final_algo_id = response_data.get("algoId") # Algo emir ise bu dolu gelir

            trade_record = {
                "user_id": session.user_id,
                "bot_id": req.bot_id,
                "symbol": req.symbol,
                "side": req.side.lower(),
                "trade_type": req.trade_type,
                "order_type": req.order_type,
                "position_side": req.position_side.lower() if req.position_side else "both",
                "leverage": req.leverage,
                
                # Miktarlar ve Fiyat
                "amount": float(formatted_qty),   # Bizim gönderdiğimiz (Talep Edilen)
                "amount_state": exec_qty,         # Gerçekleşen (Kısmi olabilir)
                "price": avg_p,                   # Ortalama Fiyat
                
                "order_id": final_order_id,       # Normal Order ID
                "algo_id": final_algo_id,         # Algo Order ID (Varsa)
                
                # GÜNCELLEME: Bizim ürettiğimiz ID'yi DB'deki mevcut 'client_algo_id' alanına kaydediyoruz.
                "client_algo_id": client_oid,    
                
                "status": response_data.get("status", "NEW"),
                "fee": fee_usd
            }
            
            # Asenkron olarak kaydet (Fire and forget)
            asyncio.create_task(crud.insert_bot_trade(trade_record))
    # ---------------------------------------------------------
    # SESSION FACTORY (LAZY LOADING)
    # ---------------------------------------------------------
    async def _get_or_create_session(self, req: OrderRequest) -> Optional[SessionContext]:
        key = (req.bot_id, req.trade_type)
        if key in self._sessions:
            return self._sessions[key]

        try:
            creds = await crud.get_api_credentials_by_bot_id(req.bot_id, req.trade_type)
            
            if not creds:
                logger.error(f"❌ API Key Bulunamadı: Bot {req.bot_id}")
                return None

            api_k = creds.get("api_key")
            api_s = creds.get("api_secret")
            
            # Gerçek ID'ler
            real_api_id = creds.get("id")
            real_user_id = creds.get("user_id")

            if not real_api_id or not real_user_id:
                logger.error(f"❌ Kritik ID Eksikliği: Bot {req.bot_id}")
                return None

            exchange = None
            guard = None
            
            # 1. Binance Futures
            if req.exchange_name == "binance" and "futures" in req.trade_type:
                exchange = BinanceFuturesExchange(
                    api_key=api_k,
                    private_key=api_s,
                    is_test=("test" in req.trade_type)
                )
                guard = FuturesGuard(
                    exchange=exchange, 
                    api_id=real_api_id, 
                    user_id=real_user_id
                )

            # 2. Binance Spot
            elif req.exchange_name == "binance" and "spot" in req.trade_type:
                exchange = BinanceSpotExchange(
                    api_key=api_k,
                    private_key=api_s,
                    is_test=("test" in req.trade_type)
                )
                guard = None

            if exchange:
                # user_id Context'e eklendi
                ctx = SessionContext(exchange=exchange, guard=guard, user_id=real_user_id)
                self._sessions[key] = ctx
                return ctx
            
            logger.error(f"Bilinmeyen Borsa/Tip: {req.exchange_name} {req.trade_type}")
            return None

        except Exception as e:
            logger.error(f"Session Oluşturma Hatası (Bot {req.bot_id}): {e}", exc_info=True)
            return None