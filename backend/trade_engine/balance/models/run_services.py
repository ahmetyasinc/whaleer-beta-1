import asyncio
import logging
from backend.trade_engine import config

# Gerekli fonksiyonları ve ayarları listenkey servisinden import ediyoruz
try:
    from backend.trade_engine.balance.models.listenkey_service import refresh_or_create_all, BINANCE_CONFIG
except ImportError:
    refresh_or_create_all = None
    BINANCE_CONFIG = None

# Yönetilecek diğer servisleri import ediyoruz
try:
    from backend.trade_engine.balance.models.spot_ws_service import main as spot_main
except ImportError:
    spot_main = None

try:
    from backend.trade_engine.balance.models.ws_service import main as futures_main
except ImportError:
    futures_main = None

# Temel loglama ayarları
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('ServiceRunner')


# ### YÖNETİLECEK SERVİSLER ###
managed_services = {
    "spot": {"func": spot_main, "task": None},
    "futures": {"func": futures_main, "task": None},
}


# ### TRIGGER DİNLEME VE YENİLEME MANTIĞI ###

async def notification_handler(conn, pid, channel, payload):
    """Veritabanından bildirim geldiğinde bu fonksiyon tetiklenir."""
    logger.info(f"🔥 Veritabanından tetikleyici sinyali alındı! (Kanal: {channel})")
    logger.info("...Listen key yenileme öncesi 15 saniye bekleniyor...")
    await asyncio.sleep(15)
    
    await run_refresh_logic()


# --- YENİ EKLENEN FONKSİYON: 'start all' İÇİN ---
async def initial_refresh():
    """'start all' komutu için başlangıç listen key yenilemesini yapar."""
    logger.info("🚀 Başlangıç listen key yenilemesi tetiklendi...")
    await run_refresh_logic()
# --- YENİ FONKSİYON BİTTİ ---


async def run_refresh_logic():
    """Listen key yenileme işlemini yürüten merkezi fonksiyon."""
    if not refresh_or_create_all or not BINANCE_CONFIG:
        logger.error("Listenkey servisi import edilemediği için yenileme yapılamıyor.")
        return
        
    logger.info("⏳ Listen Key yenileme süreci başlatılıyor...")
    pool = await config.get_async_pool()
    if pool:
        futures_config = BINANCE_CONFIG.get('futures')
        if futures_config:
            await refresh_or_create_all(pool, futures_config)
        else:
            logger.error("Yenileme için 'futures' market ayarları bulunamadı!")
    else:
        logger.error("Yenileme için DB havuzu alınamadı.")


async def listen_for_db_triggers():
    """Veritabanından 'run_listenkey_refresh' bildirimini sürekli dinler."""
    logger.info("Veritabanı trigger dinleyicisi başlatılıyor...")
    pool = await config.get_async_pool()
    if not pool:
        logger.critical("DB bağlantı havuzu oluşturulamadı. Trigger dinlenemiyor.")
        return

    conn = None
    while True:
        try:
            conn = await pool.acquire()
            await conn.add_listener('run_listenkey_refresh', notification_handler)
            logger.info("✅ Trigger dinleyicisi aktif. 'run_listenkey_refresh' kanalı dinleniyor.")
            while True:
                await asyncio.sleep(3600)
        except Exception as e:
            logger.error(f"❌ Trigger dinleyicisinde hata: {e}. 5 saniye sonra yeniden denenecek.")
        finally:
            if conn:
                await conn.remove_listener('run_listenkey_refresh', notification_handler)
                await pool.release(conn)
        await asyncio.sleep(5)


# ### SERVİS YÖNETİM FONKSİYONLARI ###
# ... (start_service, stop_service, show_status, show_help fonksiyonları burada değişmeden kalır) ...
async def start_service(name: str):
    if name not in managed_services:
        logger.error(f"'{name}' isminde bir servis tanimli degil. Mevcutlar: {list(managed_services.keys())}")
        return
    service = managed_services[name]
    if service["task"] and not service["task"].done():
        logger.warning(f"'{name}' servisi zaten calisiyor.")
        return
    if not service["func"]:
        logger.error(f"'{name}' servisinin ana fonksiyonu import edilemedi.")
        return
    logger.info(f"▶️ '{name}' servisi baslatiliyor...")
    service["task"] = asyncio.create_task(service["func"]())
    await asyncio.sleep(1)
    logger.info(f"✅ '{name}' servisi baslatildi.")

async def stop_service(name: str):
    if name not in managed_services:
        logger.error(f"'{name}' isminde bir servis tanimli degil.")
        return
    service = managed_services[name]
    if not service["task"] or service["task"].done():
        logger.warning(f"'{name}' servisi zaten calismiyor.")
        return
    logger.info(f"🛑 '{name}' servisi durduruluyor...")
    service["task"].cancel()
    try:
        await service["task"]
    except asyncio.CancelledError:
        logger.info(f"✅ '{name}' servisi basariyla durduruldu.")
    service["task"] = None

def show_status():
    logger.info("--- Servis Durumu ---")
    for name, service in managed_services.items():
        status = "🟢 Calisiyor" if service["task"] and not service["task"].done() else "🔴 Duruyor"
        logger.info(f"- {name.ljust(10)}: {status}")
    logger.info("---------------------")

def show_help():
    print("\n--- Komutlar ---")
    print("start <isim>  -> Belirtilen servisi baslatir (örn: start futures)")
    print("start all     -> Tanimli tum servisleri baslatir")
    print("stop <isim>   -> Belirtilen servisi durdurur (örn: stop spot)")
    print("stop all      -> Tanimli tum servisleri durdurur")
    print("status        -> Tum servislerin durumunu gosterir")
    print("exit          -> Programdan cikar")
    print("help          -> Bu yardim menusunu gosterir")
    print("----------------\n")


# ### ANA KOMUT DÖNGÜSÜ ###

async def command_loop():
    """Kullanıcıdan komutları alıp işleyen ve trigger dinleyicisini başlatan ana döngü."""
    loop = asyncio.get_running_loop()
    
    listener_task = asyncio.create_task(listen_for_db_triggers())
    
    logger.info("Komut Yoneticisi baslatildi. Komutlar icin 'help' yazin.")
    
    while True:
        command = await loop.run_in_executor(None, lambda: input("> ").strip().lower())
        parts = command.split()
        if not parts:
            continue
        action = parts[0]
        
        if action == "exit":
            logger.info("Cikis yapiliyor... Tum servisler ve dinleyici durdurulacak.")
            listener_task.cancel()
            tasks_to_stop = [stop_service(name) for name in managed_services if managed_services[name].get("task")]
            await asyncio.gather(*tasks_to_stop)
            try:
                await listener_task
            except asyncio.CancelledError:
                logger.info("✅ Trigger dinleyicisi durduruldu.")
            break
        elif action == "status":
            show_status()
        elif action == "help":
            show_help()
        elif action in ["start", "stop"] and len(parts) > 1:
            service_name = parts[1]
            if service_name == "all":
                # --- 'start all' İÇİN GÜNCELLEME BURADA ---
                if action == "start":
                    logger.info("Tüm servisler başlatılıyor ve başlangıç yenilemesi yapılıyor...")
                    # Yenileme işlemini arka planda başlatıyoruz ki diğer işlemler engellenmesin
                    asyncio.create_task(initial_refresh())
                else: # stop
                     logger.info("Tüm servisler durduruluyor...")
                
                tasks = [start_service(name) if action == "start" else stop_service(name) for name in managed_services]
                await asyncio.gather(*tasks)
                # --- GÜNCELLEME BİTTİ ---
            else:
                await (start_service(service_name) if action == "start" else stop_service(service_name))
        else:
            logger.warning(f"Gecersiz komut: '{command}'. Yardim icin 'help' yazin.")


if __name__ == "__main__":
    try:
        asyncio.run(command_loop())
    except KeyboardInterrupt:
        print("\nProgram kapatildi.")