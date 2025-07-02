import asyncio
import sys
import signal
from datetime import datetime

from services.server_only_with_listenkey import ListenKeyServerService, TestService
from logger_01 import logger

class MainApplication:
    def __init__(self):
        # 30 dakika interval ile servis başlat
        self.service = ListenKeyServerService(interval_minutes=30)
        self.test_service = TestService()
        self.logger = logger
    
    def setup_signal_handlers(self):
        """Sinyal handler'ları ayarla"""
        def signal_handler(signum, frame):
            self.logger.info(f"🛑 Sinyal alındı: {signum}")
            print(f"\n🛑 Kapatma sinyali alındı...")
            asyncio.create_task(self.service.stop_service())
        
        if sys.platform != "win32":
            try:
                signal.signal(signal.SIGTERM, signal_handler)
                signal.signal(signal.SIGINT, signal_handler)
            except ValueError:
                pass
    
    async def run_server_mode(self):
        """Sunucu modu"""
        self.setup_signal_handlers()
        
        # Başlangıç mesajları - minimal
        print("🚀 LISTENKEY SUNUCU BAŞLATILIYOR")
        print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("⏰ Interval: 30 dakika")
        print("📁 Detaylı loglar: ./logs/ klasöründe")
        print("🛑 Durdurmak için: Ctrl+C")
        print("=" * 50)
        
        # Detaylı log
        self.logger.info("🚀 Ana uygulama başlatılıyor", extra={
            "start_time": datetime.now().isoformat(),
            "mode": "server",
            "interval_minutes": 30
        })
        
        try:
            await self.service.start_service()
        except KeyboardInterrupt:
            print("\n🛑 Klavyeden durdurma sinyali")
            self.logger.info("Klavyeden durdurma sinyali alındı")
        except Exception as e:
            print(f"❌ Kritik hata: {e}")
            self.logger.critical(f"Kritik sistem hatası: {e}", extra={"error_type": type(e).__name__})
        finally:
            print("🔄 Sistem kapatılıyor...")
            self.logger.info("Sistem kapatma işlemi başladı")
            await self.service.stop_service()
            print("✅ Sistem kapatıldı")
            self.logger.info("Sistem başarıyla kapatıldı")
    
    async def run_test_mode(self):
        """Test modu"""
        print("🧪 TEST MODU BAŞLATILIYOR")
        self.logger.info("Test modu başlatıldı")
        
        try:
            result = await self.test_service.run_single_test()
            if result["success"]:
                print(f"✅ Test başarılı: {result['updated_count']}/{result['total_count']}")
                self.logger.info("Test başarılı", extra=result)
            else:
                print(f"❌ Test başarısız: {result['error']}")
                self.logger.error("Test başarısız", extra=result)
        except Exception as e:
            print(f"❌ Test hatası: {e}")
            self.logger.error(f"Test exception: {e}")
    
    async def run_interactive_mode(self):
        """İnteraktif mod"""
        print("🎮 İNTERAKTİF MOD")
        print("Komutlar: 'test', 'stress', 'status', 'health', 'manual', 'exit'")
        self.logger.info("İnteraktif mod başlatıldı")
        
        command_count = 0
        
        while True:
            try:
                command = input("\n> ").strip().lower()
                command_count += 1
                
                self.logger.info(f"İnteraktif komut: {command}", extra={
                    "command": command,
                    "command_number": command_count
                })
                
                if command == 'exit':
                    print("👋 İnteraktif moddan çıkılıyor")
                    break
                elif command == 'test':
                    result = await self.test_service.run_single_test()
                    print(f"Test sonucu: {'✅ Başarılı' if result['success'] else '❌ Başarısız'}")
                elif command == 'stress':
                    iterations = input("Kaç iterasyon? (varsayılan 3): ").strip()
                    iterations = int(iterations) if iterations.isdigit() else 3
                    print(f"🔥 Stress test başlatılıyor ({iterations} iterasyon)")
                    await self.test_service.run_stress_test(iterations)
                elif command == 'status':
                    status = await self.service.get_system_status()
                    print(f"📊 Sistem Durumu: {status}")
                elif command == 'health':
                    is_healthy = await self.service.run_health_check()
                    print(f"💚 Sistem: {'OK' if is_healthy else 'PROBLEM'}")
                elif command == 'manual':
                    print("🔄 Manuel kontrol başlatılıyor")
                    await self.service.run_manual_check()
                else:
                    print("❌ Geçersiz komut")
                    print("Kullanılabilir: test, stress, status, health, manual, exit")
                    
            except KeyboardInterrupt:
                print("\n👋 İnteraktif moddan çıkılıyor")
                break
            except Exception as e:
                print(f"❌ Komut hatası: {e}")
                self.logger.error(f"İnteraktif komut hatası: {e}", extra={"command": command})

async def main():
    app = MainApplication()
    
    # Komut satırı argümanlarını kontrol et
    if len(sys.argv) > 1:
        mode = sys.argv[1].lower()
        
        if mode == 'test':
            await app.run_test_mode()
        elif mode == 'interactive':
            await app.run_interactive_mode()
        elif mode == 'server':
            await app.run_server_mode()
        else:
            print("❌ Geçersiz mod")
            print("Kullanılabilir modlar: test, interactive, server")
    else:
        # Varsayılan: sunucu modu
        await app.run_server_mode()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 İyi günler!")
    except Exception as e:
        print(f"❌ Program hatası: {e}")
        # Son hata logu
        try:
            from logger_01 import logger
            logger.critical(f"Program crashed: {e}", extra={"error_type": type(e).__name__})
        except:
            pass