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


# Basit cache (çok sık API çağırmamak için)
_last_xlm_price = None
_last_xlm_price_ts = 0
_XLM_CACHE_SECONDS = 60  # 1 dk cache

def get_usd_per_xlm() -> float:
    """
    1 XLM kaç USD eder? Örn: 0.12 dönerse 1 XLM = 0.12 USD demektir.
    """
    global _last_xlm_price, _last_xlm_price_ts

    now = time.time()
    if _last_xlm_price is not None and now - _last_xlm_price_ts < _XLM_CACHE_SECONDS:
        return _last_xlm_price

    # ÖRNEK: CoinGecko kullanımı (istersen başka provider kullan)
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {"ids": "stellar", "vs_currencies": "usd"}

    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        price = float(data["stellar"]["usd"])
    except Exception as e:
        # Burada fallback kullanabilirsin (eski fiyat / sabit bir değer vs.)
        # Şimdilik hata fırlatalım:
        raise RuntimeError(f"Failed to fetch XLM price: {e}")

    _last_xlm_price = price
    _last_xlm_price_ts = now
    return price
