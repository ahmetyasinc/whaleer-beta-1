# app/routes/auth.py
import base64
from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert, select, update
import secrets, base58, nacl.signing, nacl.exceptions

from app.database import get_db
from app.core.auth import verify_token                 # senin mevcut auth
from app.models.wallets import Wallet, WalletSignin, SiwsNonce
from app.services.auth.siws_service import upsert_wallet_and_log_link, AddressTakenError

from app.core.siws_jwt import make_siws_jwt
from app.core.cookies import set_siws_cookie, clear_siws_cookie, extract_siws_payload_or_401

router = APIRouter(prefix="/auth", tags=["auth"])

class VerifyReq(BaseModel):
    publicKey: str
    signature: str  # base58
    nonce: str

class NonceReq(BaseModel):
    public_key: str
    chain: str = "solana" # Varsayılan solana olsun, frontend stellar gönderebilir

@router.post("/siws/nonce")
async def siws_nonce(
    body: NonceReq,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    nonce = "NONCE-" + secrets.token_hex(8).upper()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    ins = insert(SiwsNonce).values(
        user_id=int(user_id),
        chain=body.chain, # Burası artık dinamik (solana veya stellar)
        address=body.public_key,
        nonce=nonce,
        status=0,
        expires_at=expires_at,
        request_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        purpose="link_wallet",
    ).returning(SiwsNonce.id)
    res = await db.execute(ins)
    nonce_id = res.scalar_one()
    await db.commit()

    return {"nonce": nonce, "nonce_id": nonce_id}

@router.post("/siws/verify")
async def siws_verify(
    body: VerifyReq,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    # 1) Nonce kontrolü
    q = select(SiwsNonce).where(SiwsNonce.nonce == body.nonce)
    res = await db.execute(q)
    nonce_row = res.scalar_one_or_none()
    if not nonce_row or nonce_row.status != 0:
        raise HTTPException(status_code=400, detail="Invalid nonce")
    if nonce_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Expired nonce")
    if nonce_row.user_id != int(user_id):
        raise HTTPException(status_code=403, detail="Nonce does not belong to this user")
    if nonce_row.address and nonce_row.address != body.publicKey:
        raise HTTPException(status_code=400, detail="Nonce bound to different address")

    # 2) İmza doğrulama
    message = f"Whaleer wants you to sign in.\nNonce: {body.nonce}".encode("utf-8")
    try:
        pk = base58.b58decode(body.publicKey)
        sig = base58.b58decode(body.signature)
        verify_key = nacl.signing.VerifyKey(pk)
        verify_key.verify(message, sig)
    except (ValueError, nacl.exceptions.BadSignatureError):
        raise HTTPException(status_code=400, detail="Bad signature")

    # 3) Cüzdanı bağla (idempotent)
    try:
        wallet = await upsert_wallet_and_log_link(
            db,
            user_id=int(user_id),
            chain="solana",
            address=body.publicKey,
            nonce_id=nonce_row.id,
            signature_b58=body.signature,
            remote_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except AddressTakenError as e:
        raise HTTPException(status_code=409, detail=str(e))

    # 4) Nonce consume
    await db.execute(
        update(SiwsNonce)
        .where(SiwsNonce.id == nonce_row.id)
        .values(status=1, consumed_at=datetime.now(timezone.utc))
    )
    await db.commit()

    # 5) SIWS JWT üret + cookie'ye yaz
    token = make_siws_jwt(user_id=int(user_id), wallet_id=wallet.id, address=wallet.address, chain=wallet.chain)
    set_siws_cookie(response, token)

    # 6) FE için sade response (kullanıcı zaten girişli)
    return {
        "wallet": {
            "id": wallet.id,
            "chain": wallet.chain,
            "address": wallet.address,
            "is_verified": wallet.is_verified,
            "verified_at": wallet.verified_at,
            "is_primary": wallet.is_primary,
        },
        "linked": True
    }

@router.get("/siws/session")
async def siws_session(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(verify_token),  # Showcase'e zaten login kullanıcı giriyor dedin
):
    """
    HttpOnly siws_session cookie'yi doğrular, DB ile tutarlılığı kontrol eder.
    """
    payload = extract_siws_payload_or_401(request)
    user_id = int(payload["sub"])
    wallet_id = int(payload["wid"])
    if not user_id == int(_user_id):
        raise HTTPException(status_code=401, detail="SIWS wallet belongs to another user")

    q = select(Wallet).where(Wallet.id == wallet_id, Wallet.user_id == user_id)
    res = await db.execute(q)
    wallet = res.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=401, detail="SIWS wallet not found")
    

    return {
        "wallet": {
            "id": wallet.id,
            "chain": wallet.chain,
            "address": wallet.address,
            "is_verified": wallet.is_verified,
            "verified_at": wallet.verified_at,
            "is_primary": wallet.is_primary,
        },
        "linked": True
    }

@router.post("/siws/logout")
async def siws_logout(response: Response):
    clear_siws_cookie(response)
    return {"ok": True}

# (Opsiyonel) Rotasyon – cookie süresini yenilemek için
@router.post("/siws/refresh")
async def siws_refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(verify_token),
):
    payload = extract_siws_payload_or_401(request)
    user_id = int(payload["sub"])
    wallet_id = int(payload["wid"])

    q = select(Wallet).where(Wallet.id == wallet_id, Wallet.user_id == user_id)
    res = await db.execute(q)
    wallet = res.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=401, detail="SIWS wallet not found")
    new_token = make_siws_jwt(user_id=user_id, wallet_id=wallet.id, address=wallet.address, chain=wallet.chain)
    set_siws_cookie(response, new_token)
    return {"ok": True}

import base64
import hashlib
from stellar_sdk import Keypair
from stellar_sdk.exceptions import BadSignatureError

SIGN_MESSAGE_PREFIX = "Stellar Signed Message:\n"

def verify_freighter_message(public_key: str, signature_b64: str, message: str) -> bool:
    """
    public_key   -> G... şeklinde Stellar adresi
    signature_b64-> Freighter / kit.signMessage'ten gelen base64 imza
    message      -> wallet'a imzalattığın HAM string (nonce dahil)
    """
    kp = Keypair.from_public_key(public_key)

    # 1) Freighter’ın imzaladığı payload’ı üret
    payload = (SIGN_MESSAGE_PREFIX + message).encode("utf-8")

    # 2) SHA256 hash (32 byte)
    digest = hashlib.sha256(payload).digest()

    # 3) Base64 imzayı raw byte'a çevir
    sig_bytes = base64.b64decode(signature_b64)

    # 4) Verify
    try:
        kp.verify(digest, sig_bytes)  # BadSignatureError atarsa invalid
        return True
    except BadSignatureError:
        return False
    

class VerifyStellarReq(BaseModel):
    publicKey: str
    signature: str   # base64
    nonce: str
    message: str     # "Whaleer wants you to sign in. Nonce: NONCE-123"


from fastapi import HTTPException
from sqlalchemy import select
from datetime import datetime, timezone

@router.post("/siws/verify-stellar")
async def siws_verify_stellar(
    body: VerifyStellarReq,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    # 1) Nonce bul
    res = await db.execute(select(SiwsNonce).where(SiwsNonce.nonce == body.nonce))
    nonce_row = res.scalar_one_or_none()

    if not nonce_row or nonce_row.status != 0:
        raise HTTPException(status_code=400, detail="Invalid nonce")
    if nonce_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Expired nonce")

    # Mesaj nonce içeriyor mu (isteğe bağlı ama güvenli)
    if body.nonce not in body.message:
        raise HTTPException(status_code=400, detail="Nonce mismatch in message")

    # 2) Stellar imzasını doğrula
    is_valid = verify_freighter_message(
        public_key=body.publicKey,
        signature_b64=body.signature,
        message=body.message,
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Bad signature")

    # 3) Cüzdanı upsert et + link log'u yaz
    # upsert_wallet_and_log_link imzası:
    # (db, *, user_id, chain, address, nonce_id, signature_b58, remote_ip, user_agent)
    # signature_b58 alanına base64 -> raw -> base58 çevirip yazıyoruz
    sig_raw = base64.b64decode(body.signature)
    signature_b58 = base58.b58encode(sig_raw).decode("ascii")

    try:
        wallet = await upsert_wallet_and_log_link(
            db=db,
            user_id=int(user_id),
            chain="stellar",
            address=body.publicKey,
            nonce_id=nonce_row.id,
            signature_b58=signature_b58,
            remote_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except AddressTakenError as e:
        raise HTTPException(status_code=409, detail=str(e))

    # DİKKAT:
    # upsert_wallet_and_log_link zaten nonce.status=1 ve consumed_at set edip commit ediyor.
    # Bu yüzden burada tekrar update(SiwsNonce)... yapmana gerek yok.
    # Eğer fonksiyonunun içine baktığında bunu görürsen, o kısmı burada SİL.

    # 4) SIWS JWT üret + cookie'ye yaz
    token = make_siws_jwt(
        user_id=int(user_id),
        wallet_id=wallet.id,
        address=wallet.address,
        chain=wallet.chain,
    )
    set_siws_cookie(response, token)

    return {
        "wallet": {
            "id": wallet.id,
            "chain": "stellar",
            "address": wallet.address,
        },
        "linked": True,
    }