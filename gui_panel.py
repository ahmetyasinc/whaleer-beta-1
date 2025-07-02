import tkinter as tk
from tkinter import ttk, scrolledtext
import asyncio
import threading
from datetime import datetime
import os
import sys
import io
from contextlib import redirect_stdout, redirect_stderr
from scheduler import TriggerManager

class SchedulerGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("🔄 Binance ListenKey Scheduler")
        self.root.geometry("600x500")
        self.root.resizable(True, True)
        
        # Scheduler durumu
        self.trigger_manager = None
        self.running = False
        self.loop = None
        self.thread = None
        
        # Terminal çıktısı yakalama için
        self.original_stdout = sys.stdout
        self.original_stderr = sys.stderr
        
        self.setup_ui()
        self.start_async_loop()
        self.setup_output_capture()  # YENİ: Terminal çıktısını yakala
    
    def setup_output_capture(self):
        """Terminal çıktısını GUI'ya yönlendir"""
        class GUIOutput:
            def __init__(self, gui, output_type="stdout"):
                self.gui = gui
                self.output_type = output_type
                
            def write(self, text):
                if text.strip():  # Boş satırları görmezden gel
                    icon = "📤" if self.output_type == "stdout" else "❌"
                    self.gui.log(f"{icon} {text.strip()}")
                
            def flush(self):
                pass
        
        # stdout ve stderr'i GUI'ya yönlendir
        sys.stdout = GUIOutput(self, "stdout")
        sys.stderr = GUIOutput(self, "stderr")
    
    def setup_ui(self):
        # Ana container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Başlık
        title_frame = ttk.Frame(main_frame)
        title_frame.pack(fill=tk.X, pady=(0, 10))
        
        title_label = ttk.Label(title_frame, text="🔄 Binance ListenKey Scheduler", 
                               font=("Arial", 16, "bold"))
        title_label.pack()
        
        # Saat göstergesi - YENİ
        self.time_label = ttk.Label(title_frame, text="", font=("Arial", 10))
        self.time_label.pack()
        self.update_time()  # Saat güncellemeyi başlat
        
        # Durum paneli
        status_frame = ttk.LabelFrame(main_frame, text="Durum", padding="5")
        status_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.status_label = ttk.Label(status_frame, text="❌ Durmuş", 
                                     font=("Arial", 11, "bold"))
        self.status_label.pack(side=tk.LEFT)
        
        self.interval_label = ttk.Label(status_frame, text="Interval: 10s")
        self.interval_label.pack(side=tk.RIGHT)
        
        # Kontrol paneli
        control_frame = ttk.LabelFrame(main_frame, text="Kontroller", padding="5")
        control_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Interval ayarı
        interval_frame = ttk.Frame(control_frame)
        interval_frame.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(interval_frame, text="Interval (saniye):").pack(side=tk.LEFT)
        self.interval_var = tk.StringVar(value="10")
        interval_entry = ttk.Entry(interval_frame, textvariable=self.interval_var, width=8)
        interval_entry.pack(side=tk.LEFT, padx=(5, 10))
        
        ttk.Button(interval_frame, text="⚙️ Güncelle", 
                  command=self.update_interval).pack(side=tk.LEFT)
        
        # Ana butonlar
        button_frame = ttk.Frame(control_frame)
        button_frame.pack(fill=tk.X, pady=(5, 0))
        
        self.start_btn = ttk.Button(button_frame, text="▶️ Başlat", 
                                   command=self.start_scheduler)
        self.start_btn.pack(side=tk.LEFT, padx=(0, 5))
        
        self.stop_btn = ttk.Button(button_frame, text="⏹️ Durdur", 
                                  command=self.stop_scheduler, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=(0, 5))
        
        ttk.Button(button_frame, text="📊 Durum", 
                  command=self.show_status).pack(side=tk.LEFT, padx=(0, 5))
        
        ttk.Button(button_frame, text="🧪 Test (5s)", 
                  command=self.test_run).pack(side=tk.LEFT, padx=(0, 5))
        
        # YENİ: Terminal çıktısını geri yükleme butonu
        ttk.Button(button_frame, text="🖥️ Terminal", 
                  command=self.toggle_terminal_output).pack(side=tk.LEFT)
        
        # Log alanı
        log_frame = ttk.LabelFrame(main_frame, text="Log Çıktısı (Terminal + GUI)", padding="5")
        log_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 5))
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=15, width=70,
                                                 font=("Consolas", 9))
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        # Alt durum çubuğu
        status_bar = ttk.Frame(main_frame)
        status_bar.pack(fill=tk.X)
        
        self.info_label = ttk.Label(status_bar, text="Hazır", 
                                   foreground="green", font=("Arial", 8))
        self.info_label.pack(side=tk.LEFT)
        
        # Terminal durumu
        self.terminal_status = ttk.Label(status_bar, text="📤 Terminal: GUI'ya yönlendirildi", 
                                        font=("Arial", 8))
        self.terminal_status.pack(side=tk.RIGHT)
        
        # İlk log mesajı
        self.log("🚀 Scheduler GUI başlatıldı")
        self.log("💡 Başlat butonuna tıklayarak sistemi çalıştırabilirsiniz")
        self.log("📤 Terminal çıktıları artık burada görünecek")
    
    def update_time(self):
        """Saati güncelle - düzeltilmiş saat dilimi ile"""
        import time
        from datetime import datetime, timezone, timedelta
        
        # Türkiye saati (UTC+3)
        turkey_tz = timezone(timedelta(hours=3))
        now = datetime.now(turkey_tz)
        
        time_str = now.strftime("%d.%m.%Y %H:%M:%S (UTC+3)")
        self.time_label.config(text=f"🕐 {time_str}")
        
        # Her saniye güncelle
        self.root.after(1000, self.update_time)
    
    def toggle_terminal_output(self):
        """Terminal çıktısını değiştir"""
        if sys.stdout != self.original_stdout:
            # GUI'dan terminale geri döndür
            sys.stdout = self.original_stdout
            sys.stderr = self.original_stderr
            self.terminal_status.config(text="🖥️ Terminal: Konsol'da", foreground="blue")
            self.log("🖥️ Terminal çıktısı konsola yönlendirildi")
        else:
            # Terminalden GUI'ya yönlendir
            self.setup_output_capture()
            self.terminal_status.config(text="📤 Terminal: GUI'ya yönlendirildi", foreground="green")
            self.log("📤 Terminal çıktısı GUI'ya yönlendirildi")
    
    def start_async_loop(self):
        """Async loop'u ayrı thread'de başlat"""
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self._run_async_loop, daemon=True)
        self.thread.start()
    
    def _run_async_loop(self):
        """Async loop'u çalıştır"""
        asyncio.set_event_loop(self.loop)
        self.loop.run_forever()
    
    def start_scheduler(self):
        """Scheduler'ı başlat"""
        if not self.running:
            self.log("🔄 Scheduler başlatılıyor...")
            asyncio.run_coroutine_threadsafe(self._start_scheduler(), self.loop)
    
    def stop_scheduler(self):
        """Scheduler'ı durdur"""
        if self.running:
            self.log("⏹️ Scheduler durduruluyor...")
            asyncio.run_coroutine_threadsafe(self._stop_scheduler(), self.loop)
    
    def test_run(self):
        """5 saniye test modunda çalıştır"""
        if not self.running:
            self.log("🧪 Test modu başlatılıyor (5 saniye)...")
            asyncio.run_coroutine_threadsafe(self._test_run(), self.loop)
    
    async def _start_scheduler(self):
        """Scheduler'ı async olarak başlat"""
        try:
            interval = int(self.interval_var.get())
            self.trigger_manager = TriggerManager(interval_seconds=interval)
            
            async with self.trigger_manager:
                self.running = True
                self.root.after(0, self._update_ui_running)
                self.log(f"✅ Scheduler başlatıldı (interval: {interval}s)")
                
                await self.trigger_manager.start_monitoring()
                
                # Sürekli çalışmasını sağla
                while self.running:
                    await asyncio.sleep(1)
                    
        except Exception as e:
            self.log(f"❌ Scheduler başlatma hatası: {e}")
            self.running = False
            self.root.after(0, self._update_ui_error)
        finally:
            if self.trigger_manager:
                await self.trigger_manager.stop_monitoring()
            self.trigger_manager = None
            self.running = False
            self.root.after(0, self._update_ui_stopped)
    
    async def _stop_scheduler(self):
        """Scheduler'ı async olarak durdur"""
        try:
            self.running = False
            if self.trigger_manager:
                await self.trigger_manager.stop_monitoring()
                self.trigger_manager = None
            
            self.log("✅ Scheduler durduruldu")
            self.root.after(0, self._update_ui_stopped)
            
        except Exception as e:
            self.log(f"❌ Scheduler durdurma hatası: {e}")
            self.root.after(0, self._update_ui_error)

    async def _test_run(self):
        """Test çalıştırması - Veritabanı kontrollü"""
        try:
            # Başlangıç durumunu al
            initial_state = {}
            try:
                from crud_01 import get_user_listenkeys
                from db_01 import async_session
                
                async with async_session() as db:
                    initial_users = await get_user_listenkeys(db)
                    initial_state = {user.id: user.listenkey_expires_at for user in initial_users}
                    self.log(f"🗄️ Test başlangıcı: {len(initial_users)} kullanıcı takip ediliyor")
                    
            except Exception as e:
                self.log(f"⚠️ Başlangıç durumu alınamadı: {e}")
            
            # Test için kısa interval
            test_manager = TriggerManager(interval_seconds=2)
            async with test_manager:
                await test_manager.start_monitoring()
                self.log("🧪 Test başlatıldı - 5 saniye boyunca çalışacak")
                
                # 5 saniye bekle
                for i in range(5):
                    await asyncio.sleep(1)
                    self.root.after(0, lambda i=i: self.log(f"⏳ Test süresi: {i+1}/5 saniye"))
                
                await test_manager.stop_monitoring()
                
                # Final durumu kontrol et
                try:
                    async with async_session() as db:
                        final_users = await get_user_listenkeys(db)
                        final_state = {user.id: user.listenkey_expires_at for user in final_users}
                        
                        updated_count = 0
                        for user_id, final_expires in final_state.items():
                            initial_expires = initial_state.get(user_id)
                            if initial_expires != final_expires:
                                updated_count += 1
                        
                        self.log(f"📈 Test sonucu: {updated_count}/{len(final_users)} kullanıcı güncellendi")
                        
                        if updated_count > 0:
                            self.log("✅ Test başarılı - veritabanı güncellemeleri çalışıyor!")
                        else:
                            self.log("ℹ️ Test tamamlandı - bu döngüde güncelleme gerekmedi")
                            
                except Exception as e:
                    self.log(f"⚠️ Final durum kontrol hatası: {e}")
                
                self.log("✅ Test tamamlandı!")
                
        except Exception as e:
            self.log(f"❌ Test hatası: {e}")

    def update_interval(self):
        """Interval'i güncelle"""
        try:
            seconds = int(self.interval_var.get())
            if seconds < 1:
                raise ValueError("Minimum 1 saniye")
            
            if self.trigger_manager and self.running:
                # Async olarak interval değiştir
                asyncio.run_coroutine_threadsafe(self._update_interval_async(seconds), self.loop)
            else:
                self.interval_label.config(text=f"Interval: {seconds}s")
                self.log(f"⚙️ Interval {seconds} saniye olarak ayarlandı (başlatıldığında geçerli olacak)")
                
        except ValueError:
            self.log("❌ Geçersiz interval değeri! Pozitif bir sayı girin.")

    async def _update_interval_async(self, seconds: int):
        """Async olarak interval güncelle"""
        try:
            if self.trigger_manager:
                await self.trigger_manager.achange_interval(seconds)
                self.root.after(0, lambda: self.interval_label.config(text=f"Interval: {seconds}s"))
                self.root.after(0, lambda: self.log(f"✅ Interval {seconds} saniye olarak güncellendi"))
            else:
                self.root.after(0, lambda: self.log("❌ Trigger manager bulunamadı"))
        except Exception as e:
            self.root.after(0, lambda: self.log(f"❌ Interval güncelleme hatası: {e}"))

    def show_status(self):
        """Mevcut durumu göster"""
        if self.trigger_manager and self.running:
            status = "✅ Çalışıyor"
            interval = self.trigger_manager.scheduler.config.interval_seconds
        else:
            status = "❌ Durmuş"
            interval = self.interval_var.get()
        
        self.log(f"📊 Durum: {status}")
        self.log(f"⏱️ Interval: {interval} saniye")
        
        # Veritabanı durumunu kontrol et
        asyncio.run_coroutine_threadsafe(self._check_database_status(), self.loop)
        
        # Log dosyalarını kontrol et
        log_dir = "logs"
        if os.path.exists(log_dir):
            log_files = [f for f in os.listdir(log_dir) if f.endswith('.json')]
            self.log(f"📁 Log dosyası sayısı: {len(log_files)}")
        else:
            self.log("📁 Log klasörü bulunamadı")
        
        # Thread bilgisi
        if self.thread and self.thread.is_alive():
            self.log("🧵 Async thread: Aktif")
        else:
            self.log("🧵 Async thread: İnaktif")

    async def _check_database_status(self):
        """Veritabanı durumunu kontrol et"""
        try:
            from crud_01 import get_user_listenkeys
            from db_01 import async_session
            
            async with async_session() as db:
                users = await get_user_listenkeys(db)
                self.log(f"🗄️ Veritabanı: {len(users)} kullanıcıda aktif listenkey var")
                
                # Son güncellenme zamanlarını göster
                if users:
                    recent_updates = sorted(users, key=lambda x: x.listenkey_expires_at or datetime.min, reverse=True)[:3]
                    for user in recent_updates:
                        self.log(f"   👤 Kullanıcı {user.id}: {user.listenkey_expires_at}")
                        
        except Exception as e:
            self.log(f"❌ Veritabanı durum kontrolü hatası: {e}")
    
    def _update_ui_running(self):
        """UI'ı çalışır duruma getir"""
        self.status_label.config(text="✅ Çalışıyor", foreground="green")
        self.start_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)
        self.info_label.config(text="Scheduler aktif", foreground="green")
        self.interval_label.config(text=f"Interval: {self.interval_var.get()}s")
    
    def _update_ui_stopped(self):
        """UI'ı durmuş duruma getir"""
        self.status_label.config(text="❌ Durmuş", foreground="red")
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)
        self.info_label.config(text="Scheduler durmuş", foreground="red")
    
    def _update_ui_error(self):
        """UI'ı hata durumuna getir"""
        self.status_label.config(text="⚠️ Hata", foreground="orange")
        self.start_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)
        self.info_label.config(text="Hata oluştu", foreground="orange")
    
    def log(self, message):
        """Log mesajı ekle"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_msg = f"[{timestamp}] {message}\n"
        
        self.root.after(0, lambda: self._append_log(log_msg))
    
    def _append_log(self, message):
        """Log'a mesaj ekle (UI thread'de)"""
        self.log_text.insert(tk.END, message)
        self.log_text.see(tk.END)
        
        # Çok fazla log birikirse temizle (son 200 satır)
        lines = self.log_text.get("1.0", tk.END).count('\n')
        if lines > 200:
            self.log_text.delete("1.0", f"{lines-150}.0")
    
    def on_closing(self):
        """Pencere kapatılırken"""
        if self.running:
            self.log("🔄 Scheduler durduruluyor...")
            asyncio.run_coroutine_threadsafe(self._stop_scheduler(), self.loop)
            self.root.after(1000, self._force_close)  # 1 saniye sonra zorla kapat
        else:
            self._force_close()
    
    def _force_close(self):
        """Uygulamayı zorla kapat"""
        if self.loop:
            self.loop.call_soon_threadsafe(self.loop.stop)
        self.root.destroy()
    
    def run(self):
        """GUI'ı başlat"""
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        try:
            self.root.mainloop()
        except KeyboardInterrupt:
            self.on_closing()

if __name__ == "__main__":
    app = SchedulerGUI()
    app.run()