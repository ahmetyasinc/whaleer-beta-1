import os
import asyncio
import httpx
from dotenv import load_dotenv

# .env.local dosyasını yükle
load_dotenv(".env.local")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET")

async def set_webhook():
    if not TELEGRAM_BOT_TOKEN:
        print("❌ HATA: TELEGRAM_BOT_TOKEN bulunamadı. .env.local dosyasını kontrol edin.")
        return

    print(f"Bot Token: {TELEGRAM_BOT_TOKEN[:5]}...{TELEGRAM_BOT_TOKEN[-5:]}")

    # Kullanıcıdan public URL iste
    public_url = input("Public HTTPS URL girin (örnek: https://xyz.ngrok-free.app): ").strip().rstrip("/")
    
    if not public_url.startswith("https://"):
        print("❌ HATA: URL 'https://' ile başlamalıdır.")
        return

    webhook_endpoint = f"{public_url}/api/integrations/telegram/webhook"
    
    # NOT: main.py'de include_router prefix yoksa:
    # app/main.py kontrol edildiginde: 
    # api_router = APIRouter(prefix="/api") -> api_router.include_router(tg_public)
    # tg_public -> @public_router.post("/integrations/telegram/webhook")
    # Sonuç: /api/integrations/telegram/webhook
    
    print(f"Target Webhook URL: {webhook_endpoint}")

    # Telegram API'ye istek at
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook"
    
    params = {
        "url": webhook_endpoint,
        "secret_token": TELEGRAM_WEBHOOK_SECRET
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, data=params)
            data = response.json()
            
            if data.get("ok"):
                print("✅ BAŞARILI! Webhook kuruldu.")
                print(data)
            else:
                print("❌ BAŞARISIZ! Telegram hatası:")
                print(data)
                
        except Exception as e:
            print(f"❌ İstek hatası: {e}")

if __name__ == "__main__":
    asyncio.run(set_webhook())
