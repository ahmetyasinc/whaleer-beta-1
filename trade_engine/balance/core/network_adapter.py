import aiohttp
import asyncio
import logging
import json as ujson  # Hız için ujson
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, Union

logger = logging.getLogger(__name__)

# =========================================================
# 1. ESNEK CEVAP YAPISI
# =========================================================
@dataclass(slots=True)
class NetworkResponse:
    data: Optional[Union[Dict, list]] = None
    text: Optional[str] = None
    status_code: int = 0
    success: bool = False
    error_msg: Optional[str] = None
    limit_info: Dict[str, int] = field(default_factory=dict) 

# =========================================================
# 2. BASE ADAPTER (GÜNCELLENMİŞ - FINAL)
# =========================================================
class AsyncNetworkAdapter:
    """
    Tüm borsaların ortak kullandığı ana motor.
    Multi-Exchange uyumlu: JSON ve Form-Data desteği eklendi.
    """
    def __init__(self, timeout: int = 10, pool_size: int = 100, max_concurrent_requests: int = 10):
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.pool_size = pool_size
        self._session: Optional[aiohttp.ClientSession] = None
        self._semaphore = asyncio.Semaphore(max_concurrent_requests)
        self._is_paused = False
        self._pause_until = 0

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            connector = aiohttp.TCPConnector(limit=self.pool_size, ssl=True)
            
            # 🔥 GÜNCELLEME: Content-Type kaldırıldı, isteğe göre belirlenecek.
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
            }
            
            self._session = aiohttp.ClientSession(
                connector=connector, 
                timeout=self.timeout,
                json_serialize=ujson.dumps,
                headers=headers
            )
        return self._session

    async def _check_pause_state(self):
        """Global fren kontrolü (Rate Limit yedik mi?)"""
        if self._is_paused:
            wait_time = self._pause_until - asyncio.get_running_loop().time()
            if wait_time > 0:
                logger.warning(f"⛔ Global Limit: {wait_time:.2f}sn bekleniyor...")
                await asyncio.sleep(wait_time)
            else:
                self._is_paused = False

    def _extract_limit_info(self, headers: Any) -> Dict[str, int]:
        """Alt sınıflar (BinanceNetworkAdapter) bunu ezecek."""
        return {}

    async def request(self, method: str, url: str, headers: dict = None, 
                      params: dict = None, data: dict = None, json: dict = None,
                      max_retries: int = 3, **kwargs) -> NetworkResponse:
        
        await self._check_pause_state()
        
        async with self._semaphore:
            session = await self._get_session()
            attempt = 0
            
            while attempt <= max_retries:
                try:
                    attempt += 1
                    # 🔥 GÜNCELLEME: 'json' parametresi eklendi.
                    # aiohttp session.request hem 'data' hem 'json' alabilir.
                    async with session.request(
                        method, 
                        url, 
                        headers=headers, 
                        params=params, 
                        data=data, 
                        json=json,
                        **kwargs
                    ) as response:
                        
                        status = response.status
                        text_content = await response.text()
                        limits = self._extract_limit_info(response.headers)

                        # SENARYO 1: BAŞARI (200-299)
                        if 200 <= status < 300:
                            try:
                                json_data = ujson.loads(text_content) if text_content else {}
                                return NetworkResponse(data=json_data, status_code=status, success=True, limit_info=limits)
                            except ValueError:
                                return NetworkResponse(text=text_content, status_code=status, success=True, limit_info=limits)

                        # SENARYO 2: 429 RATE LIMIT (Çok hızlı istek attın)
                        elif status == 429:
                            retry_after = int(response.headers.get("Retry-After", 10))
                            logger.critical(f"⛔ 429 ALINDI! {retry_after}sn mola veriliyor.")
                            self._is_paused = True
                            self._pause_until = asyncio.get_running_loop().time() + retry_after
                            await asyncio.sleep(retry_after)
                            
                            # Limit bilgisini dön ama başarısız işaretle
                            return NetworkResponse(success=False, status_code=429, error_msg="Rate Limited", limit_info=limits)
                        
                        # SENARYO 3: 403 WAF / IP BAN RİSKİ
                        elif status == 403:
                            logger.error(f"⛔ WAF/CloudFront Engeli (403): {url}")
                            if attempt <= max_retries:
                                await asyncio.sleep(2) # Kısa bir bekleme
                                continue
                            return NetworkResponse(text=text_content, status_code=status, success=False, error_msg="WAF Blocked", limit_info=limits)

                        # SENARYO 4: SUNUCU HATALARI (500+)
                        elif status >= 500:
                            logger.warning(f"⚠️ Sunucu Hatası {status}. Tekrar deneniyor ({attempt}/{max_retries})...")
                            await asyncio.sleep(1 * attempt)
                            continue

                        # SENARYO 5: DİĞER HATALAR (400 Bad Request vb.)
                        else:
                            return NetworkResponse(text=text_content, status_code=status, success=False, error_msg=f"HTTP {status}", limit_info=limits)

                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    logger.error(f"❌ Ağ Hatası ({attempt}): {e}")
                    if attempt <= max_retries:
                        await asyncio.sleep(1 * attempt)
                        continue
                    return NetworkResponse(success=False, error_msg=f"Max Retry: {str(e)}")
                
                except Exception as e:
                    logger.critical(f"❌ Kritik Hata: {e}")
                    return NetworkResponse(success=False, error_msg=f"Critical: {str(e)}")

            return NetworkResponse(success=False, error_msg="Max retries reached")
            
    # Kısa yollar (Helper Methods)
    async def get(self, url: str, **kwargs) -> NetworkResponse:
        return await self.request("GET", url, **kwargs)

    async def post(self, url: str, **kwargs) -> NetworkResponse:
        return await self.request("POST", url, **kwargs)
    
    async def put(self, url: str, **kwargs) -> NetworkResponse:
        return await self.request("PUT", url, **kwargs)

    async def delete(self, url: str, **kwargs) -> NetworkResponse:
        return await self.request("DELETE", url, **kwargs)

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()