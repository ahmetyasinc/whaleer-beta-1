import asyncio
import signal
import sys
import os
from scheduler import TriggerManager
from datetime import datetime

class SchedulerApp:
    """Ana scheduler uygulaması"""
    
    def __init__(self):
        self.trigger_manager = None
        self.running = True
        self.command_queue = asyncio.Queue()
    
    def setup_signal_handlers(self):
        """Signal handler'ları ayarla"""
        def signal_handler(signum, frame):
            print(f"\nSignal {signum} alındı, uygulama kapatılıyor...")
            self.running = False
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def run_interactive_mode(self):
        """İnteraktif mod - Windows uyumlu"""
        print("=== Async Listenkey Tetikleyici Sistemi ===")
        print("Komutlar:")
        print("  start - Sistemi başlat")
        print("  stop  - Sistemi durdur")
        print("  interval <saniye> - Aralığı değiştir")
        print("  status - Sistem durumunu göster")
        print("  quit  - Çıkış")
        print()
        
        async with TriggerManager(interval_seconds=10) as manager:
            self.trigger_manager = manager
            
            # Input task'ını başlat
            input_task = asyncio.create_task(self._input_handler())
            
            try:
                while self.running:
                    try:
                        # 0.5 saniye bekle
                        await asyncio.sleep(0.5)
                        
                        # Queue'dan komut al
                        try:
                            command = self.command_queue.get_nowait()
                            await self.handle_command(command)
                            self.command_queue.task_done()
                        except asyncio.QueueEmpty:
                            continue
                            
                    except KeyboardInterrupt:
                        print("\nÇıkış yapılıyor...")
                        break
            finally:
                input_task.cancel()
                try:
                    await input_task
                except asyncio.CancelledError:
                    pass
    
    async def _input_handler(self):
        """Windows uyumlu input handler"""
        loop = asyncio.get_event_loop()
        while self.running:
            try:
                # Blocking input'u thread'de çalıştır
                command_str = await loop.run_in_executor(
                    None, 
                    lambda: input("Komut gir (veya 'help'): ").strip().lower()
                )
                command = command_str.split()
                await self.command_queue.put(command)
            except (EOFError, KeyboardInterrupt):
                self.running = False
                break
            except Exception as e:
                print(f"Input hatası: {e}")
    
    async def handle_command(self, command):
        """Komutları işle"""
        if not command:
            return
            
        try:
            if command[0] == "start":
                await self.trigger_manager.start_monitoring()
            
            elif command[0] == "stop":
                await self.trigger_manager.stop_monitoring()
            
            elif command[0] == "interval" and len(command) > 1:
                try:
                    seconds = int(command[1])
                    if seconds < 1:
                        print("❌ Interval minimum 1 saniye olmalı!")
                        return
                    self.trigger_manager.change_interval(seconds)
                    print(f"✅ Interval {seconds} saniye olarak ayarlandı.")
                except ValueError:
                    print("❌ Geçersiz saniye değeri!")
            
            elif command[0] == "status":
                status = "Çalışıyor" if self.trigger_manager.scheduler.is_running else "Durmuş"
                print(f"📊 Durum: {status}")
                print(f"⏱️  Interval: {self.trigger_manager.scheduler.config.interval_seconds} saniye")
                
                # Log dosyası bilgisi
                if os.path.exists("logs"):
                    log_files = [f for f in os.listdir("logs") if f.endswith('.json')]
                    print(f"📁 Aktif log dosyası sayısı: {len(log_files)}")
            
            elif command[0] == "logs":
                # Son log dosyasını göster
                today = datetime.now().strftime("%Y-%m-%d")
                log_file = f"logs/scheduler_listenkey_logs_{today}.json"
                if os.path.exists(log_file):
                    print(f"📄 Log dosyası: {log_file}")
                    # Son 5 satırı göster
                    try:
                        with open(log_file, 'r', encoding='utf-8') as f:
                            lines = f.readlines()
                            print("Son 5 log girişi:")
                            for line in lines[-5:]:
                                print(f"  {line.strip()}")
                    except Exception as e:
                        print(f"❌ Log okuma hatası: {e}")
                else:
                    print("❌ Log dosyası bulunamadı")
            
            elif command[0] == "test":
                if not self.trigger_manager.scheduler.is_running:
                    print("🧪 5 saniye test başlatılıyor...")
                    old_interval = self.trigger_manager.scheduler.config.interval_seconds
                    self.trigger_manager.change_interval(2)  # 2 saniye interval
                    await self.trigger_manager.start_monitoring()
                    
                    # 5 saniye bekle
                    for i in range(5):
                        await asyncio.sleep(1)
                        print(f"⏳ Test: {i+1}/5 saniye")
                    
                    await self.trigger_manager.stop_monitoring()
                    self.trigger_manager.change_interval(old_interval)  # Eski interval'e dön
                    print("✅ Test tamamlandı!")
                else:
                    print("❌ Scheduler çalışırken test yapılamaz. Önce durdurun.")
            
            elif command[0] == "quit" or command[0] == "exit":
                print("👋 Çıkış yapılıyor...")
                self.running = False
            
            elif command[0] == "help":
                print("📋 Kullanılabilir Komutlar:")
                print("  start                 - Sistemi başlat")
                print("  stop                  - Sistemi durdur") 
                print("  interval <saniye>     - Aralığı değiştir")
                print("  status                - Sistem durumunu göster")
                print("  logs                  - Son log girişlerini göster")
                print("  test                  - 5 saniye test çalıştır")
                print("  quit/exit             - Çıkış")
            
            else:
                print("❌ Geçersiz komut! 'help' yazın.")
                
        except Exception as e:
            print(f"❌ Komut işleme hatası: {e}")

async def test_scheduler():
    """Test fonksiyonu"""
    print("🧪 Scheduler test modunda çalışıyor...")
    print("📌 5 saniye interval ile 20 saniye test yapılacak...")
    
    # Logs klasörünü oluştur
    os.makedirs("logs", exist_ok=True)
    
    async with TriggerManager(interval_seconds=5) as manager:
        await manager.start_monitoring()
        
        # Progress göster
        for i in range(20):
            await asyncio.sleep(1)
            if i % 5 == 0:
                print(f"⏳ Test süresi: {i+1}/20 saniye")
        
        print("✅ Test tamamlandı!")

async def test_scheduler_real():
    """Gerçek veritabanı ile test fonksiyonu - main_01.py mantığı"""
    print("🧪 Scheduler gerçek veritabanı ile test modunda çalışıyor...")
    print("📌 Veritabanı değişiklik takibi ile 30 saniye test yapılacak...")
    
    # Logs klasörünü oluştur
    os.makedirs("logs", exist_ok=True)
    
    # Başlangıç durumunu al
    print("\n📊 VERİTABANI DURUMU - TEST BAŞLANGIÇ:")
    try:
        from db_01 import async_session
        from crud_01 import get_user_listenkeys
        
        async with async_session() as db:
            initial_users = await get_user_listenkeys(db)
            print(f"   Toplam listenkey bulunan kullanıcı: {len(initial_users)}")
            
            initial_state = {}
            for i, user in enumerate(initial_users[:3]):  # İlk 3 kullanıcı
                print(f"   👤 Kullanıcı {user.id}: expires_at = {user.listenkey_expires_at}")
                initial_state[user.id] = user.listenkey_expires_at
                
    except Exception as e:
        print(f"❌ Başlangıç durumu alınamadı: {e}")
        initial_state = {}
    
    async with TriggerManager(interval_seconds=5) as manager:
        await manager.start_monitoring()
        
        # Progress göster ve ara kontrollerle
        for i in range(30):
            await asyncio.sleep(1)
            if i % 10 == 0 and i > 0:  # Her 10 saniyede bir kontrol
                print(f"⏳ Test süresi: {i+1}/30 saniye")
                
                # Ara durum kontrolü
                try:
                    async with async_session() as db:
                        current_users = await get_user_listenkeys(db)
                        
                        updated_count = 0
                        for user in current_users[:3]:
                            initial_expires = initial_state.get(user.id)
                            if initial_expires != user.listenkey_expires_at:
                                updated_count += 1
                        
                        if updated_count > 0:
                            print(f"   📈 Ara durum: {updated_count} kullanıcı güncellenmiş!")
                        else:
                            print(f"   📊 Ara durum: Henüz güncelleme yok")
                            
                except Exception as e:
                    print(f"   ⚠️ Ara durum kontrol hatası: {e}")
        
        print("\n📊 VERİTABANI DURUMU - TEST SONU:")
        try:
            async with async_session() as db:
                final_users = await get_user_listenkeys(db)
                print(f"   Toplam listenkey bulunan kullanıcı: {len(final_users)}")
                
                total_updated = 0
                for user in final_users[:3]:
                    initial_expires = initial_state.get(user.id)
                    if initial_expires != user.listenkey_expires_at:
                        print(f"   ✅ Kullanıcı {user.id}: DEĞİŞTİ! {initial_expires} -> {user.listenkey_expires_at}")
                        total_updated += 1
                    else:
                        print(f"   ❌ Kullanıcı {user.id}: değişmedi {user.listenkey_expires_at}")
                
                print(f"\n📈 TEST SONUCU: {total_updated}/{len(final_users)} kullanıcı güncellendi")
                
                if total_updated > 0:
                    print("✅ VERİTABANI GÜNCELLEMESİ BAŞARILI!")
                else:
                    print("❌ VERİTABANI GÜNCELLENMEDİ!")
                    
        except Exception as e:
            print(f"❌ Final durum kontrol hatası: {e}")
        
        print("✅ Gerçek veritabanı testi tamamlandı!")

async def main():
    """Ana fonksiyon"""
    # Logs klasörünü oluştur
    os.makedirs("logs", exist_ok=True)
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "test":
            await test_scheduler()
        elif sys.argv[1] == "test-real":
            await test_scheduler_real()
    else:
        app = SchedulerApp()
        app.setup_signal_handlers()
        await app.run_interactive_mode()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Program sonlandırıldı.")
    except Exception as e:
        print(f"❌ Program hatası: {e}")