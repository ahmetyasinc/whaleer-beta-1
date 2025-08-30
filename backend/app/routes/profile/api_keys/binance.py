from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx, hmac, hashlib, base64
from urllib.parse import urlencode, quote
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from .binance_time import now_ms_synced

router = APIRouter(prefix="/binance", tags=["binance"])

BINANCE_SPOT = "https://api.binance.com"
BINANCE_FUTURES = "https://fapi.binance.com"

STABLES = {"USDT", "BUSD", "FDUSD", "USDC", "TUSD", "DAI"}

# ---------- Schemas ----------
class EdVerifyReq(BaseModel):
    edKey: str
    edPrivatePem: str

class HmacVerifyReq(BaseModel):
    apiKey: str
    secretKey: str


# ---------- Helpers ----------
def sign_hmac_sha256(secret: str, msg: str) -> str:
    return hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()

def sign_ed25519_pkcs8_base64(private_pem: str, message_bytes: bytes) -> str:
    key = serialization.load_pem_private_key(private_pem.encode("utf-8"), password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise ValueError("PEM is not Ed25519 private key")
    sig = key.sign(message_bytes)                 # 64 bytes
    return base64.b64encode(sig).decode("utf-8")  # Binance base64 bekler

def estimate_spot_usd(balances: list[dict], price_map: dict[str, float]) -> float:
    total = 0.0
    for b in balances or []:
        qty = float(b.get("free", 0)) + float(b.get("locked", 0))
        if qty <= 0:
            continue
        asset = b.get("asset", "")
        if asset in STABLES:
            # Stable → ~1 USDT, ama USDC/FDUSD/TUSD/BUSD/DAI için USDT paritesi varsa onu kullan
            px = 1.0 if asset == "USDT" else price_map.get(f"{asset}USDT", 1.0)
            total += qty * px
        else:
            px = price_map.get(f"{asset}USDT")
            if px:
                total += qty * px
    return round(total, 2)


# ---------- ED: /api/v3/account ----------
@router.post("/ed/account-usd")
async def ed_account_usd(body: EdVerifyReq):
    ts = await now_ms_synced()
    recv_window = 60_000
    qs = f"recvWindow={recv_window}&timestamp={ts}"

    signature = sign_ed25519_pkcs8_base64(body.edPrivatePem, qs.encode("utf-8"))
    sig_q = quote(signature, safe="")

    url_acc = f"{BINANCE_SPOT}/api/v3/account?{qs}&signature={sig_q}"
    headers = {"X-MBX-APIKEY": body.edKey}

    async with httpx.AsyncClient(timeout=15.0) as client:
        # account
        r_acc = await client.get(url_acc, headers=headers)
        if r_acc.status_code != 200:
            # -1021 senaryosu için tek retry (90s window)
            if r_acc.status_code == 400 and '"code":-1021' in r_acc.text:
                recv_window = 90_000
                ts = await now_ms_synced()
                qs = f"recvWindow={recv_window}&timestamp={ts}"
                signature = sign_ed25519_pkcs8_base64(body.edPrivatePem, qs.encode("utf-8"))
                sig_q = quote(signature, safe="")
                url_acc = f"{BINANCE_SPOT}/api/v3/account?{qs}&signature={sig_q}"
                r_acc = await client.get(url_acc, headers=headers)

        if r_acc.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Binance error {r_acc.status_code}: {r_acc.text}")

        acc = r_acc.json()

        # tickers
        r_tick = await client.get(f"{BINANCE_SPOT}/api/v3/ticker/price")
        if r_tick.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Binance tickers error {r_tick.status_code}: {r_tick.text}")
        tickers = {t["symbol"]: float(t["price"]) for t in r_tick.json()}

        spot_usd = estimate_spot_usd(acc.get("balances", []), tickers)

    return {"usd_estimate": spot_usd}


# ---------- HMAC: spot + futures ----------
@router.post("/hmac/account-usd")
async def hmac_account_usd(body: HmacVerifyReq):
    ts = await now_ms_synced()
    recv_window = 60_000
    qs = urlencode({"recvWindow": recv_window, "timestamp": ts})
    sig = sign_hmac_sha256(body.secretKey, qs)
    headers = {"X-MBX-APIKEY": body.apiKey}

    url_spot = f"{BINANCE_SPOT}/api/v3/account?{qs}&signature={sig}"
    url_fut  = f"{BINANCE_FUTURES}/fapi/v2/balance?{qs}&signature={sig}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        # spot
        r_spot = await client.get(url_spot, headers=headers)
        if r_spot.status_code != 200:
            # -1021 için retry
            if r_spot.status_code == 400 and '"code":-1021' in r_spot.text:
                recv_window = 90_000
                ts = await now_ms_synced()
                qs = urlencode({"recvWindow": recv_window, "timestamp": ts})
                sig = sign_hmac_sha256(body.secretKey, qs)
                url_spot = f"{BINANCE_SPOT}/api/v3/account?{qs}&signature={sig}"
                url_fut  = f"{BINANCE_FUTURES}/fapi/v2/balance?{qs}&signature={sig}"
                r_spot = await client.get(url_spot, headers=headers)

        if r_spot.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Binance spot error {r_spot.status_code}: {r_spot.text}")
        spot_data = r_spot.json()

        # futures
        r_fut = await client.get(url_fut, headers=headers)
        if r_fut.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Binance futures error {r_fut.status_code}: {r_fut.text}")
        fut_data = r_fut.json()

        # tickers (SPOT için USD estimate)
        r_tick = await client.get(f"{BINANCE_SPOT}/api/v3/ticker/price")
        if r_tick.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Binance tickers error {r_tick.status_code}: {r_tick.text}")
        tickers = {t["symbol"]: float(t["price"]) for t in r_tick.json()}

        spot_usd = estimate_spot_usd(spot_data.get("balances", []), tickers)

        # futures USD (sadece stable varlıklar)
        fut_stables = {"USDT", "USDC", "BUSD", "FDUSD", "TUSD"}
        fut_usd = 0.0
        for row in fut_data or []:
            asset = row.get("asset")
            if asset in fut_stables:
                fut_usd += float(row.get("balance", 0) or 0)

        total = round(spot_usd + fut_usd, 2)

    # dikkat: return **async with** bloğundan sonra; ama tüm network çağrıları blok içindeydi.
    return {"spot_usd": round(spot_usd, 2), "futures_usd": round(fut_usd, 2), "total_usd": total}
