import base64
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import asyncpg
import hmac
import hashlib
import asyncio
import logging

# Logger ayarları
logger = logging.getLogger(__name__)

async def convert_ed25519_pem_to_base64url(pem_str: str) -> str:
    """PEM formatındaki Ed25519 anahtarı Binance uyumlu base64url string'e çevirir."""
    try:
        # PEM string'i yükle
        private_key = serialization.load_pem_private_key(
            pem_str.encode(),
            password=None,
            backend=default_backend()
        )

        # Raw private key bytes (sadece private kısmı)
        raw_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )

        # Base64 URL-safe encode
        base64url_key = base64.urlsafe_b64encode(raw_bytes).decode().rstrip("=")
        return base64url_key
    except Exception as e:
        logger.error(f"PEM formatını dönüştürme hatası: {e}")
        return None

async def update_ed_secret_converted(api_id: int, pem_str: str):
    """Veritabanındaki ed_private ve ed_private_pem sütunlarını güncelle"""
    try:
        # PEM formatını dönüştür
        converted_key = await convert_ed25519_pem_to_base64url(pem_str)
        if not converted_key:
            logger.error("Dönüştürülmüş anahtar oluşturulamadı")
            return

        # Veritabanı bağlantısı
        conn = await asyncpg.connect(
            user='postgres',
            password='admin',
            database='balina_db',
            host='localhost',
            port=5432
        )

        # Güncelleme sorgusu
        await conn.execute(
            """UPDATE public.api_keys SET ed_private = $1, ed_private_pem = $2 WHERE id = $3;""",
            converted_key,
            pem_str,
            api_id
        )
        print("ed_private ve ed_private_pem sütunları başarıyla güncellendi")

        # Bağlantıyı kapat
        await conn.close()
    except Exception as e:
        logger.error(f"Veritabanı güncelleme hatası: {e}")

# Örnek kullanımlar kaldırıldı çünkü `sign_payload` fonksiyonu artık `order_utils.py` dosyasına taşındı.
