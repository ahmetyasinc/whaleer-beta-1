import asyncio
import logging
from datetime import datetime
from typing import Optional

# Mevcut modüllerinizi import et
from scheduler.trigger_manager import TriggerManager
from tasks.listenkey_tasks import manage_all_listenkeys
from crud_01 import get_user_listenkeys, get_all_api_keys
from db_01 import async_session
from logger_01 import logger

class ListenKeyServerService:
    """ListenKey servis işlemlerini yöneten ana sınıf"""
    
    def __init__(self, interval_minutes: int = 10):
        self.interval_minutes = interval_minutes
        self.is_running = False
        self.trigger_manager: Optional[TriggerManager] = None
        self.logger = logger
        self._tasks = []
        
    async def start_listenkey_monitoring(self):
        """ListenKey izleme servisini başlat"""
        try:
            self.logger.info("🚀 ListenKey trigger manager başlatılıyor...", 
                           extra={"service": "ListenKeyService", "interval_minutes": self.interval_minutes})
        
            # Trigger manager oluştur
            self.trigger_manager = TriggerManager(interval_seconds=self.interval_minutes * 60)
        
            # Manuel olarak başlat (context manager yerine)
            await self.trigger_manager.start_monitoring()
            self.logger.info("✅ ListenKey trigger manager başlatıldı")
        
            # Sürekli çalışmaya devam et
            while self.is_running:
                # Trigger manager durumunu kontrol et
                if self.trigger_manager.scheduler:
                    status = self.trigger_manager.scheduler.get_status()
                    if not status.get('is_running', False):
                        self.logger.warning("⚠️ Trigger manager durdu, yeniden başlatılıyor...")
                        await self.trigger_manager.start_monitoring()
            
                await asyncio.sleep(60)  # Her dakika kontrol
            
        except Exception as e:
            self.logger.error(f"❌ ListenKey servis hatası: {e}", 
                            extra={"service": "ListenKeyService", "error": str(e)})
            # Hata durumunda yeniden başlatmaya çalış
            if self.is_running:
                await asyncio.sleep(30)
                await self.start_listenkey_monitoring()

    async def run_manual_check(self):
        """Manuel ListenKey kontrolü"""
        try:
            self.logger.info("🔧 Manuel ListenKey kontrolü başlatılıyor...")
            
            start_time = datetime.now()
            await manage_all_listenkeys()
            end_time = datetime.now()
            
            duration = (end_time - start_time).total_seconds()
            self.logger.info("✅ Manuel ListenKey kontrolü tamamlandı", 
                           extra={"duration_seconds": duration})
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Manuel ListenKey kontrol hatası: {e}")
            return False
    
    async def get_system_status(self) -> dict:
        """Sistem durumunu getir"""
        try:
            async with async_session() as session:
                users = await get_user_listenkeys(session)
                all_apis = await get_all_api_keys(session)
                
                # Aktif ListenKey sayısı
                active_listenkeys = len([u for u in users if u.listenkey])
                
                # Son güncelleme zamanlarını kontrol et
                recent_updates = 0
                expired_count = 0
                
                now = datetime.now()
                for user in users:
                    if user.listenkey_expires_at:
                        time_diff = now - user.listenkey_expires_at.replace(tzinfo=None)
                        if time_diff.total_seconds() < 3600:  # Son 1 saat içinde
                            recent_updates += 1
                        elif time_diff.total_seconds() > 0:  # Süresi geçmiş
                            expired_count += 1
                
                # Trigger manager durumu
                trigger_status = None
                if self.trigger_manager:
                    trigger_status = self.trigger_manager.scheduler.get_status()
                
                return {
                    "timestamp": now.isoformat(),
                    "is_running": self.is_running,
                    "total_apis": len(all_apis),
                    "total_users_with_listenkey": len(users),
                    "active_listenkeys": active_listenkeys,
                    "recent_updates_1h": recent_updates,
                    "expired_listenkeys": expired_count,
                    "trigger_manager_status": trigger_status,
                    "interval_minutes": self.interval_minutes
                }
                
        except Exception as e:
            self.logger.error(f"❌ Sistem durumu alma hatası: {e}")
            return {"error": str(e), "timestamp": datetime.now().isoformat()}
    
    async def run_health_check(self):
        """Sistem sağlık kontrolü"""
        try:
            status = await self.get_system_status()
            
            if "error" in status:
                self.logger.error("❌ Sağlık kontrolü başarısız", extra=status)
                return False
            
            # Kritik kontroller
            warnings = []
            
            if status["expired_listenkeys"] > 0:
                warnings.append(f"{status['expired_listenkeys']} süresi geçmiş ListenKey")
            
            if status["active_listenkeys"] == 0:
                warnings.append("Hiç aktif ListenKey yok")
            
            if not status["is_running"]:
                warnings.append("Servis çalışmıyor")
            
            if warnings:
                self.logger.warning("⚠️ Sistem uyarıları", extra={
                    "warnings": warnings,
                    "status": status
                })
            else:
                self.logger.info("💚 Sistem sağlığı: OK", extra={
                    "active_listenkeys": status["active_listenkeys"],
                    "total_apis": status["total_apis"],
                    "recent_updates": status["recent_updates_1h"]
                })
            
            return len(warnings) == 0
            
        except Exception as e:
            self.logger.error(f"❌ Sağlık kontrolü hatası: {e}")
            return False
    
    async def generate_status_report(self):
        """Detaylı durum raporu oluştur"""
        try:
            self.logger.info("=" * 60)
            self.logger.info(f"📊 LİSTENKEY SERVİS DURUM RAPORU")
            self.logger.info(f"⏰ Rapor zamanı: {datetime.now()}")
            self.logger.info("=" * 60)
            
            status = await self.get_system_status()
            
            if "error" not in status:
                self.logger.info(f"🔧 Servis durumu: {'ÇALIŞIYOR' if status['is_running'] else 'DURDU'}")
                self.logger.info(f"⚙️ Kontrol aralığı: {status['interval_minutes']} dakika")
                self.logger.info(f"👥 Toplam API sayısı: {status['total_apis']}")
                self.logger.info(f"🔑 Aktif ListenKey sayısı: {status['active_listenkeys']}")
                self.logger.info(f"🔄 Son 1 saatte güncellenen: {status['recent_updates_1h']}")
                self.logger.info(f"⚠️ Süresi geçmiş ListenKey: {status['expired_listenkeys']}")
                
                if status["trigger_manager_status"]:
                    self.logger.info(f"📡 Trigger Manager: {status['trigger_manager_status']}")
            else:
                self.logger.error(f"❌ Durum raporu hatası: {status['error']}")
            
            self.logger.info("=" * 60)
            
        except Exception as e:
            self.logger.error(f"❌ Durum raporu oluşturma hatası: {e}")
    
    async def start_service(self):
        """Ana servisi başlat"""
        self.is_running = True
        self.logger.info("🚀 ListenKey servisi başlatılıyor...")
        
        # Ana servis taskları
        self._tasks = [
            asyncio.create_task(self.start_listenkey_monitoring(), name="ListenKeyMonitoring"),
            asyncio.create_task(self._health_check_loop(), name="HealthCheck"),
            asyncio.create_task(self._status_report_loop(), name="StatusReport"),
        ]
        
        self.logger.info(f"✅ {len(self._tasks)} servis task'ı başlatıldı")
        
        try:
            # Tüm taskları bekle
            await asyncio.gather(*self._tasks, return_exceptions=True)
        except Exception as e:
            self.logger.error(f"❌ Servis task hatası: {e}")
    
    async def stop_service(self):
        """Servisi durdur"""
        self.logger.info("🛑 ListenKey servisi durduruluyor...")
        self.is_running = False
        
        # Trigger manager'ı durdur
        if self.trigger_manager:
            try:
                await self.trigger_manager.stop_monitoring()
                self.logger.info("✅ Trigger manager durduruldu")
            except Exception as e:
                self.logger.error(f"Trigger manager durdurma hatası: {e}")
    
        # Tüm taskları iptal et
        for task in self._tasks:
            if not task.done():
                task.cancel()
    
        # Taskların tamamlanmasını bekle
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
    
        self.logger.info("✅ ListenKey servisi durduruldu")
    
    async def _health_check_loop(self):
        """Sağlık kontrolü döngüsü"""
        while self.is_running:
            try:
                await self.run_health_check()
                await asyncio.sleep(5 * 60)  # 5 dakikada bir
            except Exception as e:
                self.logger.error(f"❌ Sağlık kontrolü döngü hatası: {e}")
                await asyncio.sleep(60)
    
    async def _status_report_loop(self):
        """Durum raporu döngüsü"""
        while self.is_running:
            try:
                await self.generate_status_report()
                await asyncio.sleep(60 * 60)  # 1 saatte bir
            except Exception as e:
                self.logger.error(f"❌ Durum raporu döngü hatası: {e}")
                await asyncio.sleep(60)


class TestService:
    """Test işlemleri için ayrı sınıf"""
    
    def __init__(self):
        self.logger = logger
    
    async def run_single_test(self):
        """Tek seferlik test çalıştır"""
        self.logger.info("🧪 Tek seferlik ListenKey testi başlatılıyor...")
        
        try:
            # Önceki durum
            async with async_session() as session:
                users_before = await get_user_listenkeys(session)
                self.logger.info(f"📊 Test öncesi ListenKey sayısı: {len(users_before)}")
            
            # Test çalıştır
            start_time = datetime.now()
            await manage_all_listenkeys()
            end_time = datetime.now()
            
            # Sonraki durum
            async with async_session() as session:
                users_after = await get_user_listenkeys(session)
                self.logger.info(f"📊 Test sonrası ListenKey sayısı: {len(users_after)}")
            
            # Değişiklikleri analiz et
            updated_count = 0
            for user_after in users_after:
                user_before = next((u for u in users_before if u.id == user_after.id), None)
                if user_before and user_before.listenkey_expires_at != user_after.listenkey_expires_at:
                    updated_count += 1
            
            duration = (end_time - start_time).total_seconds()
            
            self.logger.info("✅ Test tamamlandı", extra={
                "duration_seconds": duration,
                "users_before": len(users_before),
                "users_after": len(users_after),
                "updated_count": updated_count,
                "success_rate": f"{(updated_count/len(users_after)*100):.1f}%" if users_after else "0%"
            })
            
            return {
                "success": True,
                "duration": duration,
                "updated_count": updated_count,
                "total_count": len(users_after)
            }
            
        except Exception as e:
            self.logger.error(f"❌ Test hatası: {e}")
            return {"success": False, "error": str(e)}
    
    async def run_stress_test(self, iterations: int = 5):
        """Stres testi - birden fazla kez çalıştır"""
        self.logger.info(f"🔥 Stres testi başlatılıyor: {iterations} iterasyon")
        
        results = []
        for i in range(iterations):
            self.logger.info(f"🔄 Stres testi iterasyon {i+1}/{iterations}")
            result = await self.run_single_test()
            results.append(result)
            
            if i < iterations - 1:  # Son iterasyon değilse bekle
                await asyncio.sleep(30)  # 30 saniye ara
        
        # Sonuçları analiz et
        successful = len([r for r in results if r.get("success")])
        avg_duration = sum([r.get("duration", 0) for r in results if r.get("success")]) / max(successful, 1)
        
        self.logger.info(f"📊 Stres testi sonucu: {successful}/{iterations} başarılı", extra={
            "success_rate": f"{(successful/iterations*100):.1f}%",
            "avg_duration": f"{avg_duration:.2f}s",
            "results": results
        })
        
        return {
            "total_iterations": iterations,
            "successful": successful,
            "success_rate": successful/iterations,
            "avg_duration": avg_duration,
            "results": results
        }