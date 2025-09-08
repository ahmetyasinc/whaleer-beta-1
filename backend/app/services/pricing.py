# app/services/pricing.py
import time, requests

_LAST = {"t": 0, "rate": None}  # USD per SOL
TTL = 30  # saniye; prod'da 15–60 sn uygundur

def get_usd_per_sol() -> float:
    now = time.time()
    if _LAST["rate"] and now - _LAST["t"] < TTL:
        return _LAST["rate"]
    # Basit örnek: Coingecko public (rate limit dikkat)
    r = requests.get("https://api.coingecko.com/api/v3/simple/price",
                     params={"ids":"solana","vs_currencies":"usd"}, timeout=5)
    usd = float(r.json()["solana"]["usd"])
    _LAST.update({"t": now, "rate": usd})
    return usd
