import aiohttp
import asyncio
import json
from backend.trade_engine import config

WS_URL = "wss://fstream.binance.com/ws"

async def ws_listener(pool, api_id: int):
    # DB’den aktif listenKey ve api_key al
    record = await get_stream_key_and_api_key(pool, api_id, "futures")
    if not record:
        print(f"❌ api_id={api_id} için aktif listenKey yok")
        return

    listen_key = record["stream_key"]
    ws_url = f"{WS_URL}/{listen_key}"

    async with aiohttp.ClientSession() as session:
        async with session.ws_connect(ws_url) as ws:
            print(f"📡 WS bağlantısı kuruldu (api_id={api_id})")
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    print(f"📥 api_id={api_id} event:", json.dumps(data, indent=2))
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    print(f"❌ api_id={api_id} WS hata: {msg}")
                    break

async def main():
    pool = await config.get_async_pool()
    async with pool.acquire() as conn:
        records = await conn.fetch("SELECT id FROM api_keys;")

    if not records:
        print("⚠️ api_keys tablosunda kayıt yok")
        return

    # Tüm API’ler için paralel WS dinleme
    await asyncio.gather(*(ws_listener(pool, r["id"]) for r in records))

if __name__ == "__main__":
    asyncio.run(main())