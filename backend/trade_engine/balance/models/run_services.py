# run_services.py

import asyncio
import logging
import argparse
import json

from backend.trade_engine import config

# ListenKey servisi import'ları
try:
    from backend.trade_engine.balance.models.listenkey_service import refresh_or_create_all, BINANCE_CONFIG
except ImportError:
    refresh_or_create_all = None
    BINANCE_CONFIG = None

# Bakiye güncelleme için gerekli fonksiyonları doğrudan import et
try:
    from backend.trade_engine.balance.models.balance_update_manager import (
        main as balance_manager_main,
        process_user,
        get_api_keys_from_db
    )
except ImportError:
    balance_manager_main = None
    process_user = None
    get_api_keys_from_db = None

# WebSocket servisleri import'ları
try:
    from backend.trade_engine.balance.models.spot_ws_service import main as spot_main
except ImportError:
    spot_main = None
try:
    from backend.trade_engine.balance.models.ws_service import main as futures_main
except ImportError:
    futures_main = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('ServiceRunner')


managed_services = {
    "spot": {"func": spot_main, "task": None},
    "futures": {"func": futures_main, "task": None},
}


# --- TRIGGER DİNLEME VE YENİLEME MANTIĞI ---

async def _api_key_event_callback(conn, pid, channel, payload):
    """'api_key_events' kanalından gelen bildirimleri işler."""
    logger.info(f"🔥 API Anahtarı değişikliği sinyali alındı! (Kanal: {channel})")
    try:
        data = json.loads(payload)
        stream_key_id = data.get("stream_key_id")
        if not stream_key_id or not process_user or not get_api_keys_from_db:
            logger.warning("Gerekli fonksiyonlar yüklenemediği için API olayı işlenemiyor.")
            return

        api_key_data_list = await get_api_keys_from_db([stream_key_id])
        if not api_key_data_list:
            logger.warning(f"Stream Key ID {stream_key_id} için veritabanında aktif kayıt bulunamadı.")
            return
        
        api_key_data = api_key_data_list[0]
        logger.info(f"API ID {api_key_data['api_id']} için anlık bakiye ve izin güncellemesi başlatılıyor...")
        
        asyncio.create_task(process_user(api_key_data))

    except Exception as e:
        logger.error(f"API anahtarı olayını işlerken hata: {e}", exc_info=True)


async def listen_for_api_key_events():
    """Yeni 'api_key_events' kanalını dinleyen ana döngü."""
    logger.info("API anahtarı olay dinleyicisi başlatılıyor...")
    pool = await config.get_async_pool()
    if not pool:
        logger.critical("API olay dinleyicisi için DB havuzu oluşturulamadı.")
        return

    conn = None
    channel_name = 'api_key_events'
    while True:
        try:
            conn = await pool.acquire()
            await conn.add_listener(channel_name, _api_key_event_callback)
            logger.info(f"✅ API olay dinleyicisi aktif. '{channel_name}' kanalı dinleniyor.")
            while True:
                await asyncio.sleep(3600)
        except (asyncio.CancelledError, ConnectionAbortedError):
            logger.info("API olay dinleyicisi durduruluyor.")
            break
        except Exception as e:
            logger.error(f"❌ API olay dinleyicisinde hata: {e}. 5 saniye sonra yeniden denenecek.")
        finally:
            if conn:
                try:
                    await conn.remove_listener(channel_name, _api_key_event_callback)
                    await pool.release(conn)
                except Exception:
                    pass
        await asyncio.sleep(5)


async def notification_handler(conn, pid, channel, payload):
    """'run_listenkey_refresh' kanalından gelen bildirimleri işler."""
    logger.info(f"🔥 ListenKey yenileme sinyali alındı! (Kanal: {channel})")
    await asyncio.sleep(5)
    await run_refresh_logic()


async def listen_for_db_triggers():
    """'run_listenkey_refresh' kanalını dinleyen ana döngü."""
    logger.info("ListenKey yenileme trigger dinleyicisi başlatılıyor...")
    pool = await config.get_async_pool()
    if not pool:
        logger.critical("DB bağlantı havuzu oluşturulamadı. Trigger dinlenemiyor.")
        return
    conn = None
    channel_name = 'run_listenkey_refresh'
    while True:
        try:
            conn = await pool.acquire()
            await conn.add_listener(channel_name, notification_handler)
            logger.info(f"✅ ListenKey trigger dinleyicisi aktif. '{channel_name}' kanalı dinleniyor.")
            while True:
                await asyncio.sleep(3600)
        except (asyncio.CancelledError, ConnectionAbortedError):
            logger.info("ListenKey yenileme dinleyicisi durduruluyor.")
            break
        except Exception as e:
            logger.error(f"❌ Trigger dinleyicisinde hata: {e}. 5 saniye sonra yeniden denenecek.")
        finally:
            if conn:
                try:
                    await conn.remove_listener(channel_name, notification_handler)
                    await pool.release(conn)
                except Exception:
                    pass
        await asyncio.sleep(5)


async def initial_refresh():
    """Başlangıçta ve `start futures/all` komutlarında çalışan listen key yenileme mantığı."""
    logger.info("🚀 Başlangıç listen key yenilemesi tetiklendi...")
    await run_refresh_logic()


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
            logger.info("✅ Listen Key yenileme süreci tamamlandı.")
        else:
            logger.error("Yenileme için 'futures' market ayarları bulunamadı!")
    else:
        logger.error("Yenileme için DB havuzu alınamadı.")


# --- SERVİS YÖNETİM FONKSİYONLARI ---

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
    if not service["task"].done():
        logger.info(f"✅ '{name}' servisi baslatildi.")
    else:
        logger.error(f"❌ '{name}' servisi başlatılamadı veya hemen sonlandı.")


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


# --- MERKEZİ KAPATMA FONKSİYONU ---
async def shutdown_gracefully(listenkey_task, apikey_task):
    """Tüm servisleri ve dinleyici görevlerini temiz bir şekilde kapatır."""
    logger.info("Temiz kapatma işlemi başlatılıyor... Tüm servisler ve dinleyiciler durdurulacak.")
    
    if listenkey_task:
        listenkey_task.cancel()
    if apikey_task:
        apikey_task.cancel()
    
    tasks_to_stop = [stop_service(name) for name, service in managed_services.items() if service.get("task") and not service["task"].done()]
    if tasks_to_stop:
        await asyncio.gather(*tasks_to_stop)
    
    try:
        if listenkey_task: await listenkey_task
    except asyncio.CancelledError:
        logger.info("✅ ListenKey refresh dinleyicisi durduruldu.")
    
    try:
        if apikey_task: await apikey_task
    except asyncio.CancelledError:
        logger.info("✅ API Key olay dinleyicisi durduruldu.")


# --- ANA KOMUT DÖNGÜSÜ ---
async def command_loop():
    loop = asyncio.get_running_loop()
    
    if balance_manager_main:
        logger.info("============= BAŞLANGIÇ SENKRONİZASYONU =============")
        logger.info("Servisler başlamadan önce tüm kullanıcı bakiyeleri güncelleniyor...")
        try:
            initial_args = argparse.Namespace(all=True, user_ids=None, periodic=None)
            await balance_manager_main(initial_args)
            logger.info("✅ Bakiye senkronizasyonu tamamlandı.")
        except Exception as e:
            logger.error(f"❌ Başlangıç bakiye senkronizasyonu sırasında hata: {e}", exc_info=True)
        logger.info("=====================================================")
    else:
        logger.warning("Balance Update Manager import edilemediği için başlangıç senkronizasyonu atlandı.")
    
    listenkey_refresh_listener = asyncio.create_task(listen_for_db_triggers())
    api_key_events_listener = asyncio.create_task(listen_for_api_key_events())
    
    logger.info("AUTO-START: 'start all' komutu otomatik olarak çalıştırılıyor...")
    await initial_refresh()
    logger.info("ListenKey işlemleri tamamlandı, şimdi tüm servisler başlatılıyor.")
    start_tasks = [start_service(name) for name in managed_services]
    await asyncio.gather(*start_tasks)
    logger.info("✅ Otomatik başlatma tamamlandı. Komutlar için 'help' yazabilirsiniz.")
    
    try:
        while True:
            command = await loop.run_in_executor(None, lambda: input("> ").strip().lower())
            parts = command.split()
            if not parts: continue
            action = parts[0]
            
            if action == "exit":
                await shutdown_gracefully(listenkey_refresh_listener, api_key_events_listener)
                break
            elif action == "status":
                show_status()
            elif action == "help":
                show_help()
            elif action in ["start", "stop"] and len(parts) > 1:
                service_name = parts[1]
                if service_name == "all":
                    if action == "start":
                        logger.info("Tüm servisler başlatılıyor...")
                        await initial_refresh()
                        tasks = [start_service(name) for name in managed_services]
                        await asyncio.gather(*tasks)
                    else: 
                        logger.info("Tüm servisler durduruluyor...")
                        tasks = [stop_service(name) for name in managed_services]
                        await asyncio.gather(*tasks)
                else:
                    if action == "start" and service_name == "futures":
                        logger.info(f"'{service_name}' servisi için ön hazırlık: ListenKey yenilemesi yapılıyor...")
                        await initial_refresh()
                    
                    await (start_service(service_name) if action == "start" else stop_service(service_name))
            else:
                logger.warning(f"Gecersiz komut: '{command}'. Yardim icin 'help' yazin.")
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("\nProgram durdurma sinyali (Ctrl+C) alındı.")
        await shutdown_gracefully(listenkey_refresh_listener, api_key_events_listener)


if __name__ == "__main__":
    try:
        asyncio.run(command_loop())
    except KeyboardInterrupt:
        pass
    finally:
        logger.info("Program sonlandı.")