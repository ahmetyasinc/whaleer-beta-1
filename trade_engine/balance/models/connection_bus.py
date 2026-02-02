import asyncio
import json
import logging
import websockets
from datetime import datetime

from backend.trade_engine.balance.definitions import (
    WSUrl, StreamConfig, BalanceEvent, MarketType, StreamStatus
)
from backend.trade_engine.balance.db import stream_db

logger = logging.getLogger("ConnectionBus")

class ConnectionBus:
    """
    Tek bir WebSocket bağlantısı üzerinden birden fazla ListenKey'i dinleyen 
    ve bağlantı sağlığını yöneten 'Otobüs' sınıfı.
    """
    def __init__(self, bus_id: int, market_type: int):
        self.bus_id = bus_id
        self.market_type = market_type
        self.ws = None
        self.is_running = False
        
        # URL Belirleme
        self.base_url = (WSUrl.BINANCE_SPOT if market_type == MarketType.SPOT 
                         else WSUrl.BINANCE_FUTURES)
        
        # Abonelik Takibi: {listen_key: api_id}
        self.subscriptions = {}
        self.pending_subs = asyncio.Queue()

    async def start(self):
        """Otobüsü çalıştırır ve bağlantı döngüsünü başlatır."""
        self.is_running = True
        reconnect_delay = StreamConfig.RECONNECT_INITIAL_DELAY

        while self.is_running:
            try:
                logger.info(f"🚌 Bus-{self.bus_id} bağlanıyor: {self.base_url}")
                async with websockets.connect(self.base_url, ping_interval=None) as ws:
                    self.ws = ws
                    reconnect_delay = StreamConfig.RECONNECT_INITIAL_DELAY # Resetle
                    
                    # 1. Mevcut yolcuları (ListenKeys) tekrar bindir
                    await self._resubscribe_existing()
                    
                    # 2. Mesaj dinleme ve Yeni abonelik yönetimi görevlerini başlat
                    await asyncio.gather(
                        self._listen_messages(),
                        self._handle_new_subscriptions(),
                        self._keep_alive_ping()
                    )

            except Exception as e:
                logger.error(f"⚠️ Bus-{self.bus_id} bağlantısı koptu: {e}")
                self.ws = None
                
                # Akıllı Reconnect (Exponential Backoff)
                await asyncio.sleep(reconnect_delay)
                reconnect_delay = min(
                    reconnect_delay * StreamConfig.RECONNECT_BACKOFF_FACTOR, 
                    StreamConfig.RECONNECT_MAX_DELAY
                )

    async def _listen_messages(self):
        """Binance'den gelen ham verileri yakalar ve yönlendirir."""
        async for message in self.ws:
            data = json.loads(message)
            
            # Gelen veri bir stream verisi mi? (Combined stream formatı)
            if "data" in data and "stream" in data:
                event_data = data["data"]
                event_type = event_data.get("e")
                
                # Definitions'daki MAP'i kullanarak yönlendir
                if event_type in BalanceEvent.MAP:
                    await self._route_to_parser(event_data)
            
            elif "result" in data:
                logger.debug(f"ℹ️ Bus-{self.bus_id} İşlem Sonucu: {data}")

    async def _handle_new_subscriptions(self):
        """Kuyruğa yeni eklenen ListenKey'leri canlı bağlantıya abone eder."""
        while self.ws:
            api_id, listen_key = await self.pending_subs.get()
            
            subscribe_msg = {
                "method": "SUBSCRIBE",
                "params": [listen_key],
                "id": api_id # Takip için api_id kullanıyoruz
            }
            
            await self.ws.send(json.dumps(subscribe_msg))
            self.subscriptions[listen_key] = api_id
            logger.info(f"✅ Bus-{self.bus_id}: Yeni abone eklendi -> {api_id}")
            self.pending_subs.task_done()

    async def _keep_alive_ping(self):
        """Bağlantının kopmaması için periyodik PING gönderir."""
        while self.ws:
            await asyncio.sleep(StreamConfig.WS_PING_INTERVAL)
            try:
                await self.ws.ping()
            except: break

    async def _resubscribe_existing(self):
        """Bağlantı koptuğunda hafızadaki tüm key'leri tek seferde tekrar abone yapar."""
        if not self.subscriptions: return
        
        keys = list(self.subscriptions.keys())
        msg = {
            "method": "SUBSCRIBE",
            "params": keys,
            "id": self.bus_id
        }
        await self.ws.send(json.dumps(msg))
        logger.info(f"🔄 Bus-{self.bus_id}: {len(keys)} yolcu tekrar bindirildi.")

    async def _route_to_parser(self, event_data: dict):
        """
        GELECEK ADIM: Burada veriyi MarketType'a göre 
        spot_stream.py veya futures_stream.py'ya paslayacağız.
        """
        pass