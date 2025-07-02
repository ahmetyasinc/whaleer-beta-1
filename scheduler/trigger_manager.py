import asyncio
import os
import json
from datetime import datetime
from .async_scheduler import AsyncListenkeyScheduler, ScheduleConfig
from tasks.listenkey_tasks import manage_all_listenkeys
from crud_01 import get_all_api_keys, get_user_listenkeys
from db_01 import async_session
from logger_01 import trigger_logger, performance_logger

class TriggerManager:
    """Listenkey trigger işlemlerini yöneten sınıf"""
    
    def __init__(self, interval_minutes: int = 30):
        self.interval_minutes = interval_minutes
        self.interval_seconds = interval_minutes * 60
        self.logger = trigger_logger
        self.performance_logger = performance_logger
        self.status_log_count = 0
        
        # Scheduler config oluştur
        config = ScheduleConfig(
            interval_seconds=self.interval_seconds,
            max_retries=3,
            retry_delay=5
        )
        
        self.scheduler = AsyncListenkeyScheduler(config)
        self.setup_triggers()
    
    def setup_triggers(self):
        """Trigger'ları ayarla"""
        # Callback'leri ekle
        self.scheduler.add_callback(manage_all_listenkeys)
        self.scheduler.add_callback(self._log_status)
        
        self.logger.info("Trigger'lar kuruldu", extra={
            "interval_minutes": self.interval_minutes,
            "interval_seconds": self.interval_seconds,
            "callback_count": 2
        })
    
    async def start_monitoring(self):
        """Monitoring başlat"""
        try:
            self.logger.info("🔄 TriggerManager monitoring başlatılıyor...", extra={
                "interval_minutes": self.interval_minutes
            })
            await self.scheduler.start()
            self.logger.info("✅ TriggerManager monitoring başlatıldı")
        except Exception as e:
            self.logger.error(f"❌ TriggerManager başlatma hatası: {e}")
            raise

    async def stop_monitoring(self):
        """Monitoring durdur"""
        try:
            self.logger.info("🛑 TriggerManager monitoring durduruluyor...")
            await self.scheduler.stop()
            
            # Özet istatistik
            scheduler_status = self.scheduler.get_status()
            self.logger.info("TriggerManager durduruldu", extra={
                "total_executions": scheduler_status["execution_count"],
                "total_errors": scheduler_status["error_count"],
                "status_logs_count": self.status_log_count,
                "interval_minutes": self.interval_minutes
            })
            
            self.logger.info("✅ TriggerManager monitoring durduruldu")
        except Exception as e:
            self.logger.error(f"❌ TriggerManager durdurma hatası: {e}")

    async def __aenter__(self):
        """Context manager enter"""
        await self.start_monitoring()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        await self.stop_monitoring()
    
    async def _log_status(self):
        """Durum logla"""
        start_time = datetime.now()
        
        try:
            async with async_session() as session:
                users = await get_user_listenkeys(session)
                self.status_log_count += 1
                
                execution_time = (datetime.now() - start_time).total_seconds()
                
                # Her status logunda terminale mesaj ver (30 dakikada bir olduğu için)
                print(f"📊 Status #{self.status_log_count}: {len(users)} aktif ListenKey")
                
                self.logger.info(f"Status check tamamlandı", extra={
                    "active_listenkeys": len(users),
                    "check_number": self.status_log_count,
                    "execution_time_seconds": execution_time,
                    "interval_minutes": self.interval_minutes
                })
                
                # Performance log
                self.performance_logger.info("Status check performance", extra={
                    "execution_time_seconds": execution_time,
                    "active_listenkeys_count": len(users),
                    "check_number": self.status_log_count,
                    "interval_minutes": self.interval_minutes
                })
                
        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()
            self.logger.error(f"❌ Status log hatası: {e}", extra={
                "execution_time_seconds": execution_time,
                "error_type": type(e).__name__,
                "check_number": self.status_log_count
            })
            print(f"❌ Status kontrolü başarısız: {e}")
    
    def get_detailed_status(self) -> dict:
        """Detaylı durum bilgisi"""
        scheduler_status = self.scheduler.get_status()
        return {
            **scheduler_status,
            "trigger_manager_status_logs": self.status_log_count,
            "interval_minutes": self.interval_minutes,
            "interval_seconds": self.interval_seconds
        }