import logging
import asyncio
import math
from datetime import datetime, timedelta
from typing import List, Dict

# Tanımlar ve Veritabanı Erişimleri
from trade_engine.balance.definitions import MarketType, StreamStatus, ExchangeID, StreamConfig,SystemLimits
from trade_engine.balance.db_v2.stream_db import StreamDB
from trade_engine.balance.db_v2.balance import batch_upsert_balances
from trade_engine.config import asyncpg_connection
from trade_engine.balance.exchange.binance.stream_auth_manager import StreamAuthManager
from trade_engine.balance.exchange.factory import ExchangeFactory

logger = logging.getLogger("ListenKeyManager")

class StreamManager:
    """
    Sistemin 'Lojistik Müdürü'.
    ListenKey'lerin oluşturulması, sürelerinin uzatılması ve 
    bakiye senkronizasyonunu merkezi olarak yönetir.
    """
    def __init__(self):
        self.auth_manager = StreamAuthManager()
        self.db = StreamDB()
        self.maintenance_semaphore = asyncio.Semaphore(20)
        self.SAFE_REFRESH_PER_MINUTE = SystemLimits.MAX_REFRESH_PER_MINUTE

    def _get_expiry_time(self):
        """Binance ListenKey'leri varsayılan olarak 60 dakika geçerlidir."""
        return datetime.now() + timedelta(minutes=60)

    # ==================================================================
    # 1. GENESIS (Sistemi Sıfırdan Ayağa Kaldırma)
    # ==================================================================
    async def run_genesis(self):
        """
        Sistemi sıfırdan başlatır (Genesis Protokolü).
        1. Bağlantı tablosunu ve Stream Key tablosunu tamamen temizler (Hard Reset).
        2. Aktif API'ler için yeni key alır.
        """
        logger.info("🌍 GENESIS PROTOKOLÜ BAŞLATILIYOR...")
        
        async with asyncpg_connection() as conn:
            # =========================================================
            # ADIM 1: SAYAÇLARI VE BAĞLANTILARI SIFIRLA (HARD RESET)
            # =========================================================
            # Websocket bağlantı (Otobüs) kayıtlarını tamamen siliyoruz. 
            # WS Manager ihtiyaç duydukça sıfırdan oluşturacak.
            await conn.execute("DELETE FROM public.websocket_connections")
            logger.info("🧹 WebSocket bağlantı kayıtları temizlendi.")

            # =========================================================
            # ADIM 2: TÜM STREAM KEYLERİ SİL (ZOMBİ TEMİZLİĞİ)
            # =========================================================
            # 🔥 KRİTİK DÜZELTME:
            # WHERE koşulu olmadan TÜM tabloyu temizliyoruz.
            # Böylece 'created_at' eskide kalmış veya 'status'u yanlış kalmış
            # tüm hayalet kayıtlar silinir. Sayaç (Count) kesinlikle 0'dan başlar.
            await conn.execute("DELETE FROM public.stream_keys")
            logger.info("🧹 Stream Key tablosu tamamen sıfırlandı.")

            # =========================================================
            # ADIM 3: AKTİF KULLANICILARI BUL
            # =========================================================
            # 🔥 DÜZELTME: user_id sütunu eklendi.
            # user_id olmadan insert yapmaya çalışınca hata veriyordu.
            active_apis = await conn.fetch("""
                SELECT id, user_id, api_key, api_secret, is_futures_enabled 
                FROM api_keys 
                WHERE is_active = true
            """)
            
            total_apis = len(active_apis)
            logger.info(f"🌱 Genesis: {total_apis} aktif API bulundu, işleniyor...")

        # =========================================================
        # ADIM 4: HER KULLANICI İÇİN TAZE LISTENKEY AL
        # =========================================================
        count_spot = 0
        count_fut = 0
        
        for api in active_apis:
            # A) SPOT (Herkesin Spot hesabı vardır)
            try:
                # user_id artık 'api' sözlüğünün içinde mevcut
                await self.onboard_single_user(dict(api), MarketType.SPOT)
                count_spot += 1
            except Exception as e:
                logger.error(f"❌ Genesis Spot Hatası (API {api['id']}): {e}")

            # B) FUTURES (Sadece izin verenler)
            if api['is_futures_enabled']:
                try:
                    await self.onboard_single_user(dict(api), MarketType.FUTURES)
                    count_fut += 1
                except Exception as e:
                    logger.error(f"❌ Genesis Futures Hatası (API {api['id']}): {e}")

        logger.info(f"✅ GENESIS TAMAMLANDI: {count_spot} Spot, {count_fut} Futures stream hazırlandı.")
    # ==================================================================
    # 2. MAINTENANCE (Periyodik Süre Uzatma)
    # ==================================================================
    async def run_smart_maintenance(self):
        """Sadece sistemde aktif olan streamleri kontrol eder ve sürelerini uzatır."""
        try:
            active_streams = await self.db.get_active_streams()
            if not active_streams: return

            logger.info(f"🔧 BAKIM BAŞLADI: {len(active_streams)} stream taranıyor...")
            await self._run_smart_batch_processor(active_streams, None, is_onboarding=False)
            logger.info("✅ BAKIM TAMAMLANDI.")

        except Exception as e:
            logger.error(f"Maintenance Error: {e}")

    # ==================================================================
    # 3. AKILLI İŞLEMCİ (Damlama ve Batch Yönetimi)
    # ==================================================================
    async def _run_smart_batch_processor(self, users: List[Dict], market_type: int, is_onboarding: bool):
        total = len(users)
        batch_size = self.SAFE_REFRESH_PER_MINUTE
        total_batches = math.ceil(total / batch_size)

        for i in range(total_batches):
            start_idx = i * batch_size
            end_idx = start_idx + batch_size
            current_batch = users[start_idx:end_idx]

            if is_onboarding:
                await self.onboard_users_batch(current_batch, market_type)
            else:
                tasks = [self._process_stream_lifecycle(s) for s in current_batch]
                await asyncio.gather(*tasks)

            if i < total_batches - 1:
                await asyncio.sleep(60)

    # ==================================================================
    # 4. ÇEKİRDEK MANTIK (ListenKey ve Bakiye Yazımı)
    # ==================================================================
    async def onboard_users_batch(self, users: List[Dict], market_type: int):
        """Yeni ListenKey alır ve bakiye ile birlikte DB'ye işler."""
        
        # 1. API ID -> User ID haritasını önden çıkarıyoruz (Eksik veri gelirse tamamlamak için)
        user_map = {u['id']: u['user_id'] for u in users}
        
        try:
            # Binance'den toplu veri çekimi (Burası patlarsa tüm batch patlar, bu normal)
            results = await self.auth_manager.onboard_batch_users(users, market_type)
            expiry = self._get_expiry_time()
            
            valid_balances = []

            # 2. Döngü başlıyor: Her kullanıcıyı TEK TEK try-except içine alıyoruz
            for res in results:
                try:
                    api_id = res.get('api_id')
                    
                    # user_id eksikse haritadan tamamla
                    user_id = res.get('user_id')
                    if not user_id and api_id:
                        user_id = user_map.get(api_id)

                    # ListenKey varsa kaydet
                    if res.get('listen_key'):
                        if not user_id:
                            # User ID hala yoksa bu kaydı atla ve logla
                            logger.error(f"⚠️ User ID eksik, Stream Key kaydedilemedi! API ID: {api_id}")
                            continue 

                        await self.db.upsert_stream_key(
                            user_id=user_id,
                            api_id=api_id,
                            market_type=market_type,
                            listen_key=res['listen_key'],
                            expires_at=expiry,
                            status=StreamStatus.NEW
                        )
                    
                    # Bakiyeleri havuza ekle
                    if res.get('balances'):
                        valid_balances.extend(res['balances'])
                        
                except Exception as inner_e:
                    # Sadece o satırı logla, döngüyü kırma!
                    logger.error(f"❌ Satır İşleme Hatası (API {res.get('api_id')}): {inner_e}")

            # 3. Toplu Bakiye Yazımı (Burası ayrı bir blokta kalabilir)
            if valid_balances:
                try:
                    await batch_upsert_balances(valid_balances)
                except Exception as bal_e:
                    logger.error(f"Bakiye Yazım Hatası: {bal_e}")

        except Exception as e:
            # Auth Manager veya genel yapısal bir hata olursa buraya düşer
            logger.error(f"Genel Batch Hatası: {e}")

    async def _process_stream_lifecycle(self, stream: Dict):
        async with self.maintenance_semaphore:
            api_id = stream['api_id']
            market_type = stream['market_type']
            current_status = stream.get('status', StreamStatus.ACTIVE)
            expiry = self._get_expiry_time()
            
            try:
                # 'exchange' değeri artık Factory içinde metin olsa bile çözülecek
                service = ExchangeFactory.get_service(stream.get('exchange', 'Binance'))
                
                success = await service.keep_alive_listen_key(
                    stream['api_key'], stream['listen_key'], market_type
                )

                if success:
                    # Süre uzatıldı, statü ve key değişmez, sadece expires_at güncellenir
                    await self.db.upsert_stream_key(
                        stream['user_id'], api_id, market_type, stream['listen_key'], 
                        expires_at=expiry, status=current_status
                    )
                    return

                # Keep-alive başarısız, yeni anahtar oluşturuluyor
                new_key = await service.get_listen_key(stream['api_key'], market_type)
                if new_key:
                    await self.db.upsert_stream_key(
                        stream['user_id'], api_id, market_type, new_key, 
                        expires_at=expiry, status=StreamStatus.NEW
                    )
                else:
                    await self.db.update_status(api_id, market_type, StreamStatus.ERROR)

            except Exception as e:
                logger.error(f"Lifecycle Error API {api_id}: {e}")

    async def onboard_single_user(self, user_data: Dict, market_type: int):
        await self.onboard_users_batch([user_data], market_type)

    async def stop_single_stream(self, api_id: int, market_type: int):
        await self.db.delete_stream(api_id, market_type)