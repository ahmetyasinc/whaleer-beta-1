import asyncio
import logging
from datetime import datetime
from typing import List, Callable, Awaitable
from dataclasses import dataclass
from logger_01 import scheduler_logger, performance_logger

@dataclass
class ScheduleConfig:
    """Scheduler konfigürasyon sınıfı"""
    interval_seconds: int = 1800  # 30 dakika (30 * 60)
    max_retries: int = 3
    retry_delay: int = 5
    enable_logging: bool = True

class AsyncListenkeyScheduler:
    """Async tabanlı listenkey scheduler"""
    
    def __init__(self, config: ScheduleConfig = None):
        self.config = config or ScheduleConfig()
        self.is_running = False
        self.task = None
        self.callbacks: List[Callable[[], Awaitable[None]]] = []
        self.logger = scheduler_logger
        self.performance_logger = performance_logger
        self.execution_count = 0
        self.error_count = 0
    
    def add_callback(self, callback: Callable[[], Awaitable[None]]):
        """Async callback fonksiyonu ekle"""
        if not asyncio.iscoroutinefunction(callback):
            raise ValueError("Callback must be an async function")
        self.callbacks.append(callback)
        self.logger.info(f"Callback eklendi: {callback.__name__}")
    
    async def start(self):
        """Scheduler'ı başlat"""
        if self.is_running:
            self.logger.warning("Scheduler zaten çalışıyor!")
            return
        
        self.is_running = True
        self.task = asyncio.create_task(self._run_scheduler())
        interval_minutes = self.config.interval_seconds / 60
        self.logger.info(f"🔄 Scheduler başlatıldı (interval: {interval_minutes} dakika)")
        print(f"🔄 Scheduler başlatıldı - Her {interval_minutes} dakikada bir çalışacak")
    
    async def stop(self):
        """Scheduler'ı durdur"""
        if not self.is_running:
            return
            
        self.is_running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        
        # Özet istatistik
        interval_minutes = self.config.interval_seconds / 60
        self.logger.info(f"🛑 Scheduler durduruldu - Toplam: {self.execution_count} çalıştırma, {self.error_count} hata", extra={
            "total_executions": self.execution_count,
            "total_errors": self.error_count,
            "interval_minutes": interval_minutes
        })
        print(f"🛑 Scheduler durduruldu - {self.execution_count} döngü tamamlandı")
    
    async def _run_scheduler(self):
        """Ana scheduler döngüsü"""
        # İlk başlatmada 30 saniye bekle, sonra normal interval
        await asyncio.sleep(30)
        
        while self.is_running:
            try:
                if self.is_running:
                    start_time = datetime.now()
                    await self._execute_callbacks()
                    end_time = datetime.now()
                    
                    # Performance log
                    execution_time = (end_time - start_time).total_seconds()
                    self.performance_logger.info("Scheduler execution", extra={
                        "execution_time_seconds": execution_time,
                        "callback_count": len(self.callbacks),
                        "execution_number": self.execution_count,
                        "interval_minutes": self.config.interval_seconds / 60
                    })
                
                # Interval kadar bekle
                await asyncio.sleep(self.config.interval_seconds)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.error_count += 1
                self.logger.error(f"Scheduler hatası: {e}", extra={
                    "error_type": type(e).__name__,
                    "execution_count": self.execution_count
                })
                print(f"❌ Scheduler hatası: {e}")
                await asyncio.sleep(self.config.retry_delay)
    
    async def _execute_callbacks(self):
        """Callback fonksiyonları paralel çalıştır"""
        if not self.callbacks:
            return
            
        self.execution_count += 1
        current_time = datetime.now().strftime("%H:%M:%S")
        next_run_time = datetime.now().strftime("%H:%M:%S")
        
        # Her çalıştırmada terminale mesaj ver (30 dakika interval olduğu için)
        print(f"⚡ Döngü #{self.execution_count} çalışıyor - {current_time}")
        
        self.logger.info(f"Tetikleyici çalıştırılıyor (#{self.execution_count})", extra={
            "execution_count": self.execution_count,
            "callback_count": len(self.callbacks),
            "execution_time": current_time,
            "interval_minutes": self.config.interval_seconds / 60
        })
        
        # Tüm callback'leri paralel çalıştır
        tasks = []
        for callback in self.callbacks:
            task = asyncio.create_task(self._safe_execute_callback(callback))
            tasks.append(task)
        
        # Tüm task'lerin tamamlanmasını bekle
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Sonuçları logla
        success_count = 0
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.error_count += 1
                self.logger.error(f"Callback {self.callbacks[i].__name__} hatası: {result}")
            else:
                success_count += 1
        
        # Bir sonraki çalışma zamanını hesapla
        next_run = datetime.now()
        next_run = next_run.replace(minute=(next_run.minute + 30) % 60, second=0, microsecond=0)
        if next_run.minute < 30:
            next_run = next_run.replace(hour=next_run.hour + 1)
        
        self.logger.info(f"Döngü tamamlandı: {success_count}/{len(self.callbacks)} başarılı", extra={
            "success_count": success_count,
            "total_callbacks": len(self.callbacks),
            "next_run_time": next_run.strftime("%H:%M:%S")
        })
        
        print(f"✅ Döngü #{self.execution_count} tamamlandı - Sonraki: {next_run.strftime('%H:%M')}")
    
    async def _safe_execute_callback(self, callback: Callable[[], Awaitable[None]]):
        """Callback'i güvenli şekilde çalıştır"""
        start_time = datetime.now()
        
        for attempt in range(self.config.max_retries):
            try:
                await callback()
                execution_time = (datetime.now() - start_time).total_seconds()
                
                # Performance log
                self.performance_logger.info(f"Callback success: {callback.__name__}", extra={
                    "callback_name": callback.__name__,
                    "execution_time_seconds": execution_time,
                    "attempt": attempt + 1,
                    "execution_count": self.execution_count
                })
                return
            except Exception as e:
                if attempt == self.config.max_retries - 1:
                    execution_time = (datetime.now() - start_time).total_seconds()
                    self.performance_logger.error(f"Callback failed: {callback.__name__}", extra={
                        "callback_name": callback.__name__,
                        "execution_time_seconds": execution_time,
                        "error": str(e),
                        "max_attempts_reached": True,
                        "execution_count": self.execution_count
                    })
                    raise e
                
                self.logger.warning(f"Callback {callback.__name__} hatası (deneme {attempt + 1}): {e}")
                await asyncio.sleep(self.config.retry_delay)
    
    def update_config(self, **kwargs):
        """Konfigürasyonu güncelle"""
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
                if key == "interval_seconds":
                    interval_minutes = value / 60
                    self.logger.info(f"Config güncellendi: {key} = {value} ({interval_minutes} dakika)")
                else:
                    self.logger.info(f"Config güncellendi: {key} = {value}")
    
    def get_status(self) -> dict:
        """Detaylı durum bilgisi döndür"""
        status = {
            "is_running": self.is_running,
            "interval_seconds": self.config.interval_seconds,
            "interval_minutes": self.config.interval_seconds / 60,
            "max_retries": self.config.max_retries,
            "retry_delay": self.config.retry_delay,
            "callback_count": len(self.callbacks),
            "execution_count": self.execution_count,
            "error_count": self.error_count,
            "has_task": self.task is not None,
            "task_done": self.task.done() if self.task else None
        }
        
        self.logger.info("Status sorgulandı", extra=status)
        return status