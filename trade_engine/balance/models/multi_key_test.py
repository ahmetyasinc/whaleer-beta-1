import asyncio
import aiohttp
import websockets
import json
import logging
import time

# --- AYARLAR ---
# Test etmek istediğiniz hesapların API Key'lerini bu listeye ekleyin.
# Sadece 'api_key' yeterlidir (ListenKey almak için secret gerekmez).
API_CREDENTIALS = [
    # 1. Hesap
    {"api_key": ""},
    
    # 2. Hesap (Varsa)
    {"api_key": ""},
    
    # Dilerseniz daha fazla ekleyebilirsiniz...
]

FUTURES_REST_URL = "https://fapi.binance.com"
FUTURES_WS_URL = "wss://fstream.binance.com/stream"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

async def get_listen_key(session, api_key):
    """REST API üzerinden ListenKey alır."""
    url = f"{FUTURES_REST_URL}/fapi/v1/listenKey"
    headers = {"X-MBX-APIKEY": api_key}
    
    async with session.post(url, headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            return data['listenKey']
        else:
            logging.error(f"❌ ListenKey alınamadı! Status: {resp.status}")
            return None

async def listen_messages(ws):
    """Gelen WebSocket mesajlarını sürekli dinler ve basar."""
    try:
        async for msg in ws:
            data = json.loads(msg)
            
            # Abonelik onayı mesajı (result: null)
            if "result" in data and data["result"] is None:
                logging.info(f"🎉 ONAYLANDI (Msg ID: {data.get('id')}): Binance aboneliği kabul etti.")
            
            # Hata mesajı
            elif "error" in data:
                logging.error(f"❌ HATA: {data}")
            
            # Normal veri akışı (ORDER_TRADE_UPDATE, ACCOUNT_UPDATE vb.)
            else:
                # Gelen verinin tipini ve içeriğini kısaca göster
                stream_name = data.get('stream', 'Bilinmiyor')
                event_type = data.get('data', {}).get('e', 'Event Yok')
                logging.info(f"📩 VERİ GELDİ | Stream: {stream_name} | Tip: {event_type}")
                # Detay görmek isterseniz alt satırı açın:
                # logging.info(f"   -> İçerik: {data}")
                
    except asyncio.CancelledError:
        logging.info("Dinleyici görevi iptal edildi.")
    except Exception as e:
        logging.error(f"Okuma hatası: {e}")

async def multi_key_test_forever():
    # 1. Adım: Tüm API Key'ler için ListenKey'leri topla
    listen_keys = []
    logging.info("🔑 API Key'ler için ListenKey'ler alınıyor...")
    
    async with aiohttp.ClientSession() as session:
        for cred in API_CREDENTIALS:
            if "BURAYA_" in cred["api_key"]:
                logging.warning("⚠️ Lütfen script içindeki API Key alanlarını doldurun!")
                continue
                
            l_key = await get_listen_key(session, cred["api_key"])
            if l_key:
                listen_keys.append(l_key)
                logging.info(f"   -> ListenKey alındı: {l_key[:10]}...")

    if not listen_keys:
        logging.error("❌ Hiçbir geçerli ListenKey alınamadı. Test iptal.")
        return

    # 2. Adım: Tek bir WebSocket bağlantısı aç
    logging.info(f"\n🔌 WebSocket bağlantısı başlatılıyor: {FUTURES_WS_URL}")
    
    # ping_interval=20: Her 20 saniyede bir otomatik ping atar (bağlantı kopmasın diye)
    async with websockets.connect(FUTURES_WS_URL, ping_interval=20, ping_timeout=10) as ws:
        logging.info("✅ Ana bağlantı kuruldu. Şu an boşta.")

        # Dinleyiciyi arka planda başlat
        listener_task = asyncio.create_task(listen_messages(ws))

        # 3. Adım: Anahtarları ekle
        req_id = 1
        for l_key in listen_keys:
            logging.info(f"\n➕ ABONE OLUNUYOR (ID: {req_id}): {l_key[:10]}...")
            
            payload = {
                "method": "SUBSCRIBE",
                "params": [l_key],
                "id": req_id
            }
            await ws.send(json.dumps(payload))
            await asyncio.sleep(1) # Ardışık istekler arasına minik bekleme koyduk
            req_id += 1

        logging.info("\n⏳ Tüm anahtarlar gönderildi. Bağlantı SÜREKLİ AÇIK kalacak.")
        logging.info("🛑 Durdurmak için terminalde CTRL+C tuşlarına basın.\n")

        # 4. Adım: Sonsuz Bekleme (Siz kapatana kadar)
        try:
            # Event wait kullanarak CPU yormadan sonsuza kadar bekler
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            pass
        finally:
            listener_task.cancel()
            logging.info("Script kapatılıyor...")

if __name__ == "__main__":
    try:
        if len(API_CREDENTIALS) < 1 or "BURAYA_" in API_CREDENTIALS[0]["api_key"]:
            print("LÜTFEN SCRIPT İÇİNDEKİ 'API_CREDENTIALS' LİSTESİNİ DOLDURUNUZ.")
        else:
            asyncio.run(multi_key_test_forever())
    except KeyboardInterrupt:
        print("\nKullanıcı tarafından durduruldu.")