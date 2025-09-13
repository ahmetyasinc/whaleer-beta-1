import asyncio
import logging

# Servislerin ana fonksiyonlarını import ediyoruz
try:
    from backend.trade_engine.balance.models.spot_ws_service import main as spot_main
except ImportError:
    spot_main = None

# YENİ EKLENDİ: Futures servisini (ws_service.py) import ediyoruz
try:
    # Bu dosya adının ve yolunun projenizdekiyle aynı olduğundan emin olun
    from backend.trade_engine.balance.models.ws_service import main as futures_main
except ImportError:
    futures_main = None

# Temel loglama ayarları
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('ServiceRunner')


# YÖNETİLECEK SERVİSLERİN TANIMLANMASI
# Servisleri ve onların çalışan task'larını burada takip edeceğiz.
managed_services = {
    "spot": {"func": spot_main, "task": None},
    # GÜNCELLENDİ: Futures servisi sözlüğe eklendi
    "futures": {"func": futures_main, "task": None},
}


async def start_service(name: str):
    """Belirtilen isimdeki servisi başlatır."""
    if name not in managed_services:
        logger.error(f"'{name}' isminde bir servis tanimli degil. Mevcutlar: {list(managed_services.keys())}")
        return

    service = managed_services[name]
    if service["task"] and not service["task"].done():
        logger.warning(f"'{name}' servisi zaten calisiyor.")
        return

    if not service["func"]:
        # DEĞİŞTİ: Daha açıklayıcı bir hata mesajı
        logger.error(f"'{name}' servisinin ana fonksiyonu import edilemedi. Dosya yolu dogru mu? (Örn: backend.trade_engine.balance.models.ws_service)")
        return
        
    logger.info(f"▶️ '{name}' servisi baslatiliyor...")
    # Servisi bir asyncio Task'ı olarak başlatıp sözlüğe kaydediyoruz.
    service["task"] = asyncio.create_task(service["func"]())
    await asyncio.sleep(1) # Servisin başlaması için kısa bir süre verelim.
    logger.info(f"✅ '{name}' servisi baslatildi.")


async def stop_service(name: str):
    """Belirtilen isimdeki servisi durdurur."""
    if name not in managed_services:
        logger.error(f"'{name}' isminde bir servis tanimli degil.")
        return

    service = managed_services[name]
    if not service["task"] or service["task"].done():
        logger.warning(f"'{name}' servisi zaten calismiyor.")
        return

    logger.info(f"🛑 '{name}' servisi durduruluyor...")
    # Task'a iptal sinyali gönderiyoruz.
    service["task"].cancel()
    try:
        # Task'ın sonlanmasını bekliyoruz.
        await service["task"]
    except asyncio.CancelledError:
        logger.info(f"✅ '{name}' servisi basariyla durduruldu.")
    
    service["task"] = None


def show_status():
    """Tüm servislerin durumunu gösterir."""
    logger.info("--- Servis Durumu ---")
    if not managed_services:
        logger.info("Tanimli servis yok.")
        return

    for name, service in managed_services.items():
        if service.get("func"): # Sadece import edilebilen servisleri göster
            if service["task"] and not service["task"].done():
                status = "🟢 Calisiyor"
            else:
                status = "🔴 Duruyor"
            logger.info(f"- {name.ljust(10)}: {status}")
    logger.info("---------------------")


def show_help():
    """Kullanılabilir komutları gösterir."""
    print("\n--- Komutlar ---")
    print("start <isim>  -> Belirtilen servisi baslatir (or: start spot)")
    print("stop <isim>   -> Belirtilen servisi durdurur (or: stop futures)")
    print("status        -> Tum servislerin durumunu gosterir")
    print("exit          -> Programdan cikar")
    print("help          -> Bu yardim menusunu gosterir")
    print("----------------\n")


async def command_loop():
    """Kullanıcıdan komutları alıp işleyen ana döngü."""
    loop = asyncio.get_running_loop()
    logger.info("Komut Yoneticisi baslatildi. Komutlar icin 'help' yazin.")
    
    while True:
        # input() fonksiyonu block edici olduğu için onu ayrı bir thread'de çalıştırıyoruz.
        command = await loop.run_in_executor(None, lambda: input("> ").strip().lower())
        parts = command.split()
        if not parts:
            continue

        action = parts[0]
        
        if action == "exit":
            logger.info("Cikis yapiliyor... Tum servisler durdurulacak.")
            # Çıkmadan önce çalışan tüm servisleri durdur
            for name in list(managed_services.keys()):
                if managed_services[name]["task"] and not managed_services[name]["task"].done():
                    await stop_service(name)
            break
        elif action == "status":
            show_status()
        elif action == "help":
            show_help()
        elif action in ["start", "stop"] and len(parts) > 1:
            service_name = parts[1]
            if action == "start":
                await start_service(service_name)
            else: # stop
                await stop_service(service_name)
        else:
            logger.warning(f"Gecersiz komut: '{command}'. Yardim icin 'help' yazin.")


if __name__ == "__main__":
    try:
        asyncio.run(command_loop())
    except KeyboardInterrupt:
        print("\nProgram kapatildi.")