
import asyncio
import json
import hmac
import hashlib
import time
import websockets

WS_URL =  "wss://ws-api.binance.com:9443/ws-api/v3"#"wss://ws-api.binance.com:443/ws-api/v3"

def sign_query(secret: str, payload: str) -> str:
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

async def main():
    accounts = [
        {"api_key": "7fPt5aWJFxGSF7LZ4lAmSTjcMFrvGGMLVHdvhhQJWoL0GhIsGh42R3AaSRTyLBfP", "api_secret": "0tK57oBpwnY20HQYqSHiXQNFQUV5Rla2oeIVGuYtAFOmovhrnFqwIix4c1L1Idu7", "name": "Taha"},
        {"api_key": "Obk2x1xCEn6aoJbnmroDIi8ghwjBWJM9yLp0HbfYOZoImvxgPrCiPIxjqmPW7sO3", "api_secret": "4Du3xgiCccaaKLC5acHQy0m4fnkbwhdMh7Es8RYm5qNUQstSJvSGjCd0hHWGL0bt", "name": "Ahmet"}
    ]

    async with websockets.connect(WS_URL) as ws:
            # 1) Her hesap için abonelik aç
            for acc in accounts:
                ts = str(int(time.time() * 1000))
                payload = f"apiKey={acc['api_key']}&timestamp={ts}"
                signature = sign_query(acc["api_secret"], payload)

                req = {
                    "id": int(time.time() * 1000),
                    "method": "userDataStream.subscribe.signature",
                    "params": {
                        "apiKey": acc["api_key"],
                        "timestamp": int(ts),
                        "signature": signature
                    }
                }

                await ws.send(json.dumps(req))
                resp = await ws.recv()
                print(f"[{acc['name']}] Subscribe response: {resp}")
                await asyncio.sleep(0.1)  # Rate limit güvenliği

            # 2) Mevcut abonelikleri listele
            await ws.send(json.dumps({"id": int(time.time() * 1000), "method": "session.subscriptions", "params": {}}))
            subs_resp = await ws.recv()
            print("Active subscriptions:", subs_resp)

            # 3) Gelen event'leri `subscriptionId` ile ayrıştır
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                sid = data.get("subscriptionId")
                if sid is not None:
                    print(f"[Event from SubID {sid}] {data}")
                else:
                    print("General message:", data)

asyncio.run(main())
