import httpx

TELEGRAM_BOT_TOKEN = "8419963818:AAFTcPEt8kUY4SmBwCHS-8cT5OrfxgQ0k2E"

async def send_telegram_message(chat_id: int, text: str) -> None:
    if not TELEGRAM_BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            await client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
        except Exception:
            pass