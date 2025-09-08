
    


import asyncio
import json
import hmac
import hashlib
import time
import websockets

WS_URL = "wss://ws-api.binance.com:9443/ws-api/v3"

def sign_query(secret: str, params: dict) -> str:
    """
    Parametreleri alfabetik sıraya göre dizip HMAC-SHA256 imzası üretir.
    """
    sorted_items = sorted(params.items(), key=lambda x: x[0])  # alfabetik sırala
    query_string = "&".join([f"{k}={v}" for k, v in sorted_items])
    return hmac.new(secret.encode(), query_string.encode(), hashlib.sha256).hexdigest()

async def place_order(ws, user_account, order_params):
    timestamp = int(time.time() * 1000)

    params_to_sign = {
        **order_params,
        "recvWindow": 5000,
        "timestamp": timestamp
    }

    signature = sign_query(user_account["api_secret"], params_to_sign)

    final_params = {
        "apiKey": user_account["api_key"],
        **params_to_sign,
        "signature": signature
    }

    request = {
        "id": f"order-{timestamp}",
        "method": "order.place",
        "params": final_params
    }

    print(f"\n[{user_account['name']}] için SPOT emri gönderiliyor: {json.dumps(order_params)}")
    await ws.send(json.dumps(request))

async def main():
    # Kendi API bilgilerinizi girin
    accounts = [
        {"api_key": "7fPt5aWJFxGSF7LZ4lAmSTjcMFrvGGMLVHdvhhQJWoL0GhIsGh42R3AaSRTyLBfP", "api_secret": "0tK57oBpwnY20HQYqSHiXQNFQUV5Rla2oeIVGuYtAFOmovhrnFqwIix4c1L1Idu7", "name": "Taha"},
        {"api_key": "Obk2x1xCEn6aoJbnmroDIi8ghwjBWJM9yLp0HbfYOZoImvxgPrCiPIxjqmPW7sO3", "api_secret": "4Du3xgiCccaaKLC5acHQy0m4fnkbwhdMh7Es8RYm5qNUQstSJvSGjCd0hHWGL0bt", "name": "Ahmet"}
    ]

    async with websockets.connect(WS_URL) as ws:
        # 1) Her hesap için userDataStream aboneliği aç
        for acc in accounts:
            ts = int(time.time() * 1000)
            payload = {"apiKey": acc["api_key"], "timestamp": ts}
            signature = sign_query(acc["api_secret"], payload)

            req = {
                "id": f"sub-{acc['name']}-{ts}",
                "method": "userDataStream.subscribe.signature",
                "params": {
                    "apiKey": acc["api_key"],
                    "timestamp": ts,
                    "signature": signature
                }
            }
            await ws.send(json.dumps(req))
            resp = await ws.recv()
            print(f"[{acc['name']}] Subscribe response: {resp}")
            await asyncio.sleep(0.1)

        # 2) Emir Gönderme
        taha_account = accounts[0]
        spot_order = {
            "symbol": "BTCUSDT",
            "side": "SELL",
            "type": "LIMIT",
            "quantity": "0.001",
            "price": "65000.00",
            "timeInForce": "GTC"
        }
        await place_order(ws, taha_account, spot_order)

        # 3) Gelen mesajları dinle
        print("\n--- Gelen Mesajlar Dinleniyor ---")
        while True:
            try:
                msg = await ws.recv()
                data = json.loads(msg)

                if data.get("id", "").startswith("order-"):
                    print(f"[EMİR CEVABI] {msg}")
                elif "subscriptionId" in data:
                    print(f"[HESAP GÜNCELLEMESİ] {msg}")
                else:
                    print(f"[GENEL MESAJ] {msg}")
            except websockets.exceptions.ConnectionClosed:
                print("Bağlantı kapandı.")
                break

if __name__ == "__main__":
    asyncio.run(main())
