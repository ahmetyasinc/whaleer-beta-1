import asyncio
import websockets
import json
import logging

listen_keys = [
    "79hIapuuEc3qaHVOBlAJ5kJJFrtJeE93WWMrIVbtMxSk5Ds0B6PTJFi7LR9BOVlR",
    "HyqSt6ryHrs5HZnL4SgLWZ7CNG71KI112vMOcOXpBJcaT8l6MEIoOfO19HIbdwlf",
]
"""
async def test_single(lk):
    url = f"wss://fstream.binance.com/ws/{lk}"
    print(f"\n=== TEST SINGLE: {url}")
    try:
        async with websockets.connect(url) as ws:
            msg = await ws.recv()
            print("Received:", msg)
    except Exception as e:
        print("Error:", e)

async def test_combined(keys):
    streams = "/".join([f"{lk}@userData" for lk in keys])
    url = f"wss://fstream.binance.com/stream?streams={streams}"
    print(f"\n=== TEST COMBINED: {url}")
    try:
        async with websockets.connect(url) as ws:
            for _ in range(3):
                msg = await ws.recv()
                data = json.loads(msg)
                stream_name = data.get("stream")
                payload = data.get("data")
                print(f"[{stream_name}] {payload}")
    except Exception as e:
        print("Error:", e)

async def main():
    #await test_single(LISTEN_KEYS[0])
    await test_combined(LISTEN_KEYS)

if __name__ == "__main__":
    asyncio.run(main())
"""
logging.basicConfig(level=logging.DEBUG)

async def test_combined():
    streams = "/".join(listen_keys)
    url = f"wss://fstream.binance.com/stream?streams={streams}"
    print("Connecting to:", url)

    async with websockets.connect(url, ping_interval=20, ping_timeout=10) as ws:
        for _ in range(5):
            msg = await ws.recv()
            print("Received:", msg)

asyncio.run(test_combined())