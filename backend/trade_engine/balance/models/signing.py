import base64,hmac,hashlib
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

async def ed25519_sign_binance(private_key_pem: str, payload: str) -> str:
    """
    Binance için Ed25519 imzalama — base64url + padding'siz.
    """
    private_key = serialization.load_pem_private_key(private_key_pem.encode(), password=None)
    if not isinstance(private_key, Ed25519PrivateKey):
        raise ValueError("Geçersiz Ed25519 özel anahtarı")

    signature = private_key.sign(payload.encode())
    return base64.urlsafe_b64encode(signature).decode().rstrip("=")


async def hmac_sha256_sign_binance(secret_key: str, payload: str) -> str:
    """
    Binance için HMAC-SHA256 imzalama — hexadecimal çıktı.
    """
    return hmac.new(secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()