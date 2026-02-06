import asyncio
import json
import logging
from trade_engine.config import asyncpg_connection
from trade_engine.balance.definitions import MarketType, StreamStatus
from trade_engine.balance.exchange.binance.listenkey_manager import StreamManager
from trade_engine.balance.db_v2.stream_db import StreamDB

logger = logging.getLogger("Orchestrator")

class SystemOrchestrator:
    def __init__(self, ws_service):
        self.stream_manager = StreamManager()
        self.ws_service = ws_service
        self.is_running = False

    async def start(self):
        self.is_running = True
        logger.info("🎧 Orchestrator: Veritabanı sinyalleri (Trigger + 1m) dinleniyor...")
        
        # NOT: run_genesis() buradan kaldırıldı. Artık run_system.py içinde yapılıyor.
        
        try:
            async with asyncpg_connection() as conn:
                # 1. Kanal: Tablo Değişimleri
                await conn.add_listener('system_event_signal', self._handle_db_notification)
                
                # 2. Kanal: Zaman Sinyalleri
                await conn.add_listener('new_data', self._handle_time_notification)
                
                while self.is_running:
                    await asyncio.sleep(1)
                    
        except Exception as e:
            logger.error(f"Orchestrator Bağlantı Hatası: {e}")

    # --- LISTENER HANDLERS ---
    def _handle_db_notification(self, connection, pid, channel, payload):
        asyncio.create_task(self._process_event_queue())

    def _handle_time_notification(self, connection, pid, channel, payload):
        if payload in ['1m', '30m']:
            logger.info(f"⏰ ZAMAN SİNYALİ ({payload}): Rutin Bakım Başlatılıyor...")
            asyncio.create_task(self.stream_manager.run_smart_maintenance())

    # --- PROCESSORS ---
    async def _process_event_queue(self):
        try:
            async with asyncpg_connection() as conn:
                events = await conn.fetch("DELETE FROM public.system_event_queue RETURNING event_type, payload")
                for event in events:
                    try:
                        e_type = event['event_type']
                        raw_payload = event['payload']
                        payload = json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload
                        
                        logger.info(f"🔔 OLAY ALGILANDI: {e_type} (ID: {payload.get('id')})")
                        await self._dispatch_action(e_type, payload)
                    except Exception as inner_e:
                        logger.error(f"Event Ayrıştırma Hatası: {inner_e}")
        except Exception as e:
            logger.error(f"Kuyruk İşleme Hatası: {e}")

    async def _dispatch_action(self, event_type, payload):
        data = payload.get('data') or {}
        entity_id = payload.get('id')

        # --- STREAM YÖNETİMİ ---
        if event_type == "STREAM_ADD":
             #async with asyncpg_connection() as conn:
                #stream_row = await conn.fetchrow("SELECT * FROM stream_keys WHERE id = $1", entity_id)
                #if stream_row:
                    #logger.info(f"➕ STREAM EKLENİYOR: {stream_row['listen_key'][:10]}...")
                    #await self.ws_service.add_stream_dynamic(dict(stream_row))
            logger.info(f"👀 Yeni Stream Sinyali Geldi: {entity_id} (WS Manager devralacak)")
        
        elif event_type == "STREAM_DELETE":
            listen_key = data.get('listen_key')
            m_type = data.get('market_type')
            if listen_key:
                logger.info(f"➖ STREAM SİLİNİYOR: {listen_key[:10]}...")
                await self.ws_service.remove_stream_dynamic(listen_key, m_type)

        elif event_type == "STREAM_UPDATE":
            new_status = data.get('status')
            listen_key = data.get('listen_key')
            m_type = data.get('market_type')

            if new_status in [StreamStatus.EXPIRED, StreamStatus.CLOSED, StreamStatus.ERROR]:
                logger.warning(f"⚠️ Status değişti ({new_status}). Stream durduruluyor.")
                if listen_key:
                    await self.ws_service.remove_stream_dynamic(listen_key, m_type)

            elif new_status in [StreamStatus.NEW, StreamStatus.ACTIVE]:
                await self.ws_service.add_stream_dynamic(data)

        # --- API YÖNETİMİ ---
        elif event_type == "API_ADD":
            logger.info(f"✨ Yeni API ({entity_id}) eklendi.")
            await self.stream_manager.onboard_single_user(data, MarketType.SPOT)
            if data.get('is_futures_enabled'):
                await self.stream_manager.onboard_single_user(data, MarketType.FUTURES)
        
        elif event_type == "API_DELETE":
            logger.info(f"🛑 API ({entity_id}) silindi.")
            await StreamDB.delete_stream(entity_id, MarketType.SPOT)
            await StreamDB.delete_stream(entity_id, MarketType.FUTURES)

        elif event_type == "API_UPDATE":
            is_active = data.get('is_active')
            if is_active is True:
                logger.info(f"✅ API ({entity_id}) AKTİF edildi.")
                await self.stream_manager.onboard_single_user(data, MarketType.SPOT)
                if data.get('is_futures_enabled'):
                    await self.stream_manager.onboard_single_user(data, MarketType.FUTURES)
            elif is_active is False:
                logger.info(f"⛔ API ({entity_id}) PASİF'e çekildi.")
                await StreamDB.delete_stream(entity_id, MarketType.SPOT)
                await StreamDB.delete_stream(entity_id, MarketType.FUTURES)

        elif event_type == "FUTURES_ENABLED":
            logger.info(f"🚀 API ({entity_id}) Futures açıldı.")
            await self.stream_manager.onboard_single_user(data, MarketType.FUTURES)
        
        elif event_type == "FUTURES_DISABLED":
            logger.info(f"📉 API ({entity_id}) Futures kapatıldı.")
            await StreamDB.delete_stream(entity_id, MarketType.FUTURES)