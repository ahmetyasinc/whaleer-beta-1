import asyncio
import json
import logging
import websockets
from trade_engine.balance.db_v2.balance import batch_upsert_balances
from trade_engine.balance.definitions import StreamStatus
from trade_engine.balance.db_v2.stream_db import StreamDB

logger = logging.getLogger("BinanceWSNode")

class BinanceWSNode:
    def __init__(self, ws_id: int, market_type: int):
        self.ws_id = ws_id
        self.market_type = market_type
        # ListenKey'ler için doğru combined stream adresi 
        self.base_uri = "wss://stream.binance.com:9443/stream?streams=" if market_type == 1 else "wss://fstream.binance.com/stream?streams="
        self.balance_buffer = {} 
        self.flush_interval = 2
        self.stream_map = {}

    async def start(self, streams: list):
        # Haritayı oluştur: listen_key -> api_info
        self.stream_map = {s['listen_key']: s for s in streams}
        
        # Sadece ListenKey'leri '/' ile birleştiriyoruz (Binance Standart)
        stream_names = "/".join(self.stream_map.keys())
        uri = f"{self.base_uri}{stream_names}"
        
        logger.info(f"🔗 Bağlanılıyor: {uri}")
        
        # Buffer temizleme döngüsünü başlat
        asyncio.create_task(self._flush_loop())
        
        async with websockets.connect(uri) as ws:
            logger.info(f"✅ WS Node {self.ws_id} BAĞLANDI. {len(streams)} API dinleniyor.")
            
            # Bağlanan NEW anahtarları ACTIVE yap [cite: 76-78]
            for s in streams:
                if s['status'] == 1: # NEW
                    await StreamDB.update_status(s['api_id'], s['market_type'], 2) # ACTIVE
                    logger.info(f"🔓 API {s['api_id']} statüsü ACTIVE olarak güncellendi.")

            async for message in ws:
                data = json.loads(message)
                # 📢 Her mesajı logla (Bağlantıyı doğrulamak için)
                logger.info(f"📥 Mesaj Geldi: {data.get('stream', 'unknown')[:10]}...")
                await self._parse_to_buffer(data)

    async def _parse_to_buffer(self, envelope):
        # Combined stream formatı: {'stream': 'listenKey', 'data': {...}}
        listen_key = envelope.get('stream')
        msg = envelope.get('data', {})
        
        user_info = self.stream_map.get(listen_key)
        if not user_info: return

        event_type = msg.get('e')
        updates = []

        # SPOT ve FUTURES bakiye mesajlarını ayıkla [cite: 101-103]
        if event_type == 'outboundAccountPosition':
            updates = [{"a": b['a'], "f": b['f'], "l": b['l']} for b in msg.get('B', [])]
        elif event_type == 'ACCOUNT_UPDATE':
            # Futures bakiye verisi 'cw' (cross wallet) içinde gelir
            updates = [{"a": b['a'], "f": b['cw'], "l": 0} for b in msg.get('a', {}).get('B', [])]

        if updates:
            for u in updates:
                key = (user_info['api_id'], u['a'], self.market_type)
                self.balance_buffer[key] = {
                    "user_id": user_info['user_id'],
                    "api_id": user_info['api_id'],
                    "asset": u['a'],
                    "free": u['f'],
                    "locked": u['l'],
                    "market_type": self.market_type
                }
            logger.info(f"⚡ {user_info['api_id']} için {len(updates)} varlık tampona eklendi.")

    async def _flush_loop(self):
        while True:
            await asyncio.sleep(self.flush_interval)
            if self.balance_buffer:
                to_update = list(self.balance_buffer.values())
                self.balance_buffer.clear()
                # 8 hane Decimal normalizasyonu ile DB'ye yaz
                await batch_upsert_balances(to_update)
                logger.info(f"📤 {len(to_update)} bakiye toplu olarak DB'ye işlendi.")