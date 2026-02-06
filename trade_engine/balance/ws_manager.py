import asyncio
import json
import logging
import websockets
from typing import Dict, List
from trade_engine.config import asyncpg_connection
from trade_engine.balance.db_v2.balance import batch_upsert_balances
from trade_engine.balance.db_v2.stream_db import StreamDB
from trade_engine.balance.definitions import MarketType, StreamStatus, SystemLimits

logger = logging.getLogger("WebSocketService")

# ==============================================================================
# 1. BÖLÜM: WORKER (İŞÇİ) - BINANCE NODE
# ==============================================================================
class BinanceWSNode:
    def __init__(self, ws_id: int, market_type: int):
        self.ws_id = ws_id
        self.market_type = market_type
        self.is_running = False
        self.ws_connection = None 
        
        if market_type == MarketType.SPOT:
            self.base_uri = "wss://stream.binance.com:9443/stream?streams="
        else:
            self.base_uri = "wss://fstream.binance.com/stream?streams="
            
        # BUFFER TANIMLARI
        self.balance_buffer = {} 
        self.order_buffer = {}
        
        self.flush_interval = SystemLimits.WS_FLUSH_INTERVAL
        self.stream_map = {} 

    async def start(self, streams: List[Dict]):
        self.is_running = True
        self.stream_map = {s['listen_key']: s for s in streams}
        
        stream_names = "/".join(self.stream_map.keys())
        uri = f"{self.base_uri}{stream_names}" if stream_names else self.base_uri.rstrip("?streams=")
        
        asyncio.create_task(self._flush_loop())
        
        while self.is_running:
            try:
                logger.info(f"🔌 Node {self.ws_id} Bağlanıyor... (Key Sayısı: {len(self.stream_map)})")
                async with websockets.connect(uri) as ws:
                    self.ws_connection = ws 
                    logger.info(f"✅ Node {self.ws_id} BAĞLANDI.")
                    
                    # Status Güncelleme
                    for key, s in self.stream_map.items():
                        if s.get('status') == StreamStatus.NEW:
                            await StreamDB.update_status(s['api_id'], self.market_type, StreamStatus.ACTIVE)

                    async for message in ws:
                        await self._process_message(json.loads(message))
                        
            except Exception as e:
                logger.error(f"❌ Node {self.ws_id} Koptu: {e}")
                self.ws_connection = None
                await asyncio.sleep(5)

    async def subscribe_user(self, stream_data: Dict):
        listen_key = stream_data['listen_key']
        if listen_key in self.stream_map: return 

        self.stream_map[listen_key] = stream_data
        
        if self.ws_connection:
            payload = {"method": "SUBSCRIBE", "params": [f"{listen_key}"], "id": stream_data['api_id']}
            try:
                await self.ws_connection.send(json.dumps(payload))
                logger.info(f"➕ Node {self.ws_id}: {listen_key[:10]}... eklendi.")
                await StreamDB.update_status(stream_data['api_id'], self.market_type, StreamStatus.ACTIVE)
            except Exception as e:
                logger.warning(f"Subscribe Hata: {e}")

    async def unsubscribe_user(self, listen_key: str):
        if listen_key not in self.stream_map: return

        if self.ws_connection:
            payload = {"method": "UNSUBSCRIBE", "params": [f"{listen_key}"], "id": 100}
            try:
                await self.ws_connection.send(json.dumps(payload))
                logger.info(f"➖ Node {self.ws_id}: {listen_key[:10]}... çıkarıldı.")
            except Exception as e:
                logger.warning(f"Unsubscribe Hata: {e}")
        del self.stream_map[listen_key]

    async def _process_message(self, envelope):
        stream_name = envelope.get('stream')
        msg = envelope.get('data', {})
        user_info = self.stream_map.get(stream_name)
        if not user_info: return

        event_type = msg.get('e')
        updates = []

        # --- A) BAKİYE İŞLEMLERİ ---
        if self.market_type == MarketType.SPOT and event_type == 'outboundAccountPosition':
            updates = [{"a": b['a'], "f": b['f'], "l": b['l']} for b in msg.get('B', [])]
        elif self.market_type == MarketType.FUTURES and event_type == 'ACCOUNT_UPDATE':
            updates = [{"a": b['a'], "f": b['cw'], "l": 0} for b in msg.get('a', {}).get('B', [])]

        if updates:
            for u in updates:
                key = (user_info['api_id'], u['a'])
                self.balance_buffer[key] = {
                    "user_id": user_info['user_id'],
                    "api_id": user_info['api_id'],
                    "asset": u['a'],
                    "free": u['f'],
                    "locked": u['l'],
                    "market_type": self.market_type
                }
        
        # --- B) EMİR GÜNCELLEMELERİ ---
        if event_type in ['executionReport', 'ORDER_TRADE_UPDATE']:
            await self._handle_order_update(msg, user_info)

    async def _handle_order_update(self, data, user_info):
        try:
            order_data = data.get('o', data) if self.market_type == MarketType.FUTURES else data
            
            binance_order_id = str(order_data.get('i'))
            client_oid = order_data.get('c')
            
            unique_key = (user_info['user_id'], binance_order_id if binance_order_id else client_oid)
            
            self.order_buffer[unique_key] = {
                'status': order_data.get('X'),
                'filled_qty': float(order_data.get('z', 0)),
                'avg_price': float(order_data.get('L', 0)) if self.market_type == MarketType.SPOT else float(order_data.get('ap', 0)),
                'fee': float(order_data.get('n', 0)),
                'binance_order_id': binance_order_id,
                'client_oid': client_oid,
                'user_id': user_info['user_id']
            }
            
        except Exception as e:
            logger.error(f"Buffer Error: {e}")

    async def _flush_loop(self):
        while self.is_running:
            await asyncio.sleep(self.flush_interval)
            
            # 1. Bakiye Buffer'ını Boşalt
            if self.balance_buffer:
                to_update_balance = list(self.balance_buffer.values())
                self.balance_buffer.clear()
                await batch_upsert_balances(to_update_balance)
                logger.info(f"💾 Node {self.ws_id}: {len(to_update_balance)} bakiye güncellendi.")

            # 2. Emir Buffer'ını Boşalt
            if self.order_buffer:
                orders_to_process = list(self.order_buffer.values())
                self.order_buffer.clear()
                
                async with asyncpg_connection() as conn:
                    for order in orders_to_process:
                        try:
                            query = """
                                UPDATE public.bot_trades
                                SET status = $1, amount_state = $2, price = $3, fee = $4, order_id = $5, client_algo_id = $6
                                WHERE user_id = $7 AND (order_id = $5 OR client_algo_id = $6)
                            """
                            await conn.execute(query, order['status'], order['filled_qty'], order['avg_price'], order['fee'], order['binance_order_id'], order['client_oid'], order['user_id'])
                        except Exception as e:
                            logger.error(f"Batch Order SQL Error: {e}")

# ==============================================================================
# 2. BÖLÜM: MANAGER (YÖNETİCİ) - GÜÇLENDİRİLMİŞ SAYAÇ SİSTEMİ
# ==============================================================================
class WebSocketService:
    def __init__(self):
        self.active_nodes = {}
        self.CAPACITY_LIMIT = SystemLimits.WS_NODE_CAPACITY

    async def start(self):
        logger.info("🧠 WebSocket Service Başlatılıyor...")
        await self._ensure_nodes_running()
        await self._assign_orphans()
        
        # Periyodik Senkronizasyon Döngüsü
        while True:
            await asyncio.sleep(30)
            await self._sync_all_counts() # 30 saniyede bir sayaçları gerçek veriye eşitle
            await self._ensure_nodes_running()

    async def _sync_all_counts(self):
        """Tüm Node'ların sayaçlarını 'stream_keys' tablosundaki GERÇEK sayıya eşitler."""
        async with asyncpg_connection() as conn:
            # 1. Node ID'lerini çek
            node_ids = await conn.fetch("SELECT id FROM websocket_connections")
            for row in node_ids:
                ws_id = row['id']
                # 2. Gerçek sayıyı hesapla ve güncelle
                await conn.execute("""
                    UPDATE public.websocket_connections
                    SET listenkey_count = (SELECT COUNT(*)::int FROM public.stream_keys WHERE ws_id = $1)
                    WHERE id = $1
                """, ws_id)

    async def _update_node_count_safe(self, ws_id: int):
        """Tek bir node için güvenli sayaç güncellemesi"""
        if not ws_id: return
        async with asyncpg_connection() as conn:
            await conn.execute("""
                UPDATE public.websocket_connections
                SET listenkey_count = (SELECT COUNT(*)::int FROM public.stream_keys WHERE ws_id = $1)
                WHERE id = $1
            """, ws_id)

    async def add_stream_dynamic(self, stream_data: Dict):
        m_type = stream_data['market_type']
        target_node = None
        
        # 1. Hedef Node Belirle
        if stream_data.get('ws_id'):
             target_node = self.active_nodes.get(stream_data['ws_id'])
        
        if not target_node:
            for ws_id, node in self.active_nodes.items():
                if node.market_type == m_type and len(node.stream_map) < self.CAPACITY_LIMIT:
                    target_node = node
                    break
        
        # 2. Ekleme İşlemi
        if target_node:
            # Eğer zaten bağlıysa tekrar DB işlemi yapma
            if stream_data.get('ws_id') != target_node.ws_id:
                async with asyncpg_connection() as conn:
                    await conn.execute("UPDATE stream_keys SET ws_id = $1 WHERE id = $2", target_node.ws_id, stream_data['id'])
                
                # 🔥 KRİTİK: +1 yapmak yerine gerçek sayıyı güncelle
                await self._update_node_count_safe(target_node.ws_id)

            await target_node.subscribe_user(stream_data)
        else:
            await self._assign_orphans()

    async def remove_stream_dynamic(self, listen_key: str, market_type: int):
        target_ws_id = None
        
        # 1. Node'u bul ve Memory'den çıkar
        for ws_id, node in self.active_nodes.items():
            if node.market_type == market_type and listen_key in node.stream_map:
                target_ws_id = ws_id
                await node.unsubscribe_user(listen_key)
                break
        
        # 2. DB'den çıkar (Hafızada node olmasa bile DB'den ws_id'yi bulup temizle)
        async with asyncpg_connection() as conn:
            if not target_ws_id:
                row = await conn.fetchrow("SELECT ws_id FROM public.stream_keys WHERE listen_key = $1", listen_key)
                if row: target_ws_id = row['ws_id']

            await conn.execute("UPDATE public.stream_keys SET ws_id = NULL WHERE listen_key = $1", listen_key)
            
            # 🔥 KRİTİK: -1 yapmak yerine gerçek sayıyı güncelle
            if target_ws_id:
                await self._update_node_count_safe(target_ws_id)
                logger.info(f"➖ Stream Silindi (Node {target_ws_id} senkronize edildi).")

    async def _assign_orphans(self):
        async with asyncpg_connection() as conn:
            orphans = await conn.fetch("""
                SELECT id, listen_key, api_id, user_id, market_type, status 
                FROM public.stream_keys 
                WHERE ws_id IS NULL AND status IN ($1, $2)
            """, StreamStatus.NEW, StreamStatus.ACTIVE)

            if not orphans: return

            for orphan in orphans:
                m_type = orphan['market_type']
                ws_id = await conn.fetchval("""
                    SELECT id FROM public.websocket_connections
                    WHERE type_id = $1 AND is_connected = true AND listenkey_count < $2
                    ORDER BY listenkey_count ASC LIMIT 1
                """, m_type, self.CAPACITY_LIMIT)

                if not ws_id:
                    ws_name = f"BN_{'SPOT' if m_type == 1 else 'FUT'}_NODE"
                    ws_id = await conn.fetchval("""
                        INSERT INTO public.websocket_connections (type_id, is_connected, listenkey_count, name)
                        VALUES ($1, true, 0, $2) RETURNING id
                    """, m_type, ws_name)

                # DB'ye ws_id ata
                await conn.execute("UPDATE stream_keys SET ws_id = $1 WHERE id = $2", ws_id, orphan['id'])
                
                # 🔥 KRİTİK: Gerçek sayıyı güncelle
                await self._update_node_count_safe(ws_id)
                
                # Node hafızadaysa abone et
                if ws_id in self.active_nodes:
                    orphan_dict = dict(orphan)
                    orphan_dict['ws_id'] = ws_id
                    await self.active_nodes[ws_id].subscribe_user(orphan_dict)

    async def _ensure_nodes_running(self):
        async with asyncpg_connection() as conn:
            db_conns = await conn.fetch("SELECT id, type_id FROM websocket_connections WHERE is_connected = true")
            for row in db_conns:
                ws_id = row['id']
                m_type = row['type_id']
                if ws_id not in self.active_nodes:
                    streams = await conn.fetch("""
                        SELECT listen_key, api_id, user_id, market_type, status 
                        FROM stream_keys WHERE ws_id = $1 AND status IN (1, 2)
                    """, ws_id)
                    node = BinanceWSNode(ws_id, m_type)
                    self.active_nodes[ws_id] = node
                    asyncio.create_task(node.start([dict(s) for s in streams]))
                    logger.info(f"▶️ Node {ws_id} hafızaya yüklendi ve başlatıldı.")