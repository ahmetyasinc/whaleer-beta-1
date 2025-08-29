# app/routes/payments.py
from __future__ import annotations
import asyncio

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta, timezone
import json, secrets, math, base64

from app.database import get_db
from app.core.auth import verify_token
from app.services.pricing import get_usd_per_sol
from app.models.payments import PaymentIntent

# ---- Solana / Solders ----
from solders.pubkey import Pubkey
from solders.system_program import transfer, TransferParams
from solders.message import MessageV0
from solana.rpc.async_api import AsyncClient
from solders.signature import Signature as SolSignature

PLATFORM_WALLET = Pubkey.from_string("AkmufZViBgt9mwuLPhFM8qyS1SjWNbMRBK8FySHajvUA")
RPC_URL = "https://api.mainnet-beta.solana.com"

router = APIRouter(prefix="/payments", tags=["payments"])

PLATFORM_FEE_BPS = 1000


# ---------- Schemas ----------
class CreateListingIntentReq(BaseModel):
    bot_id: int


class CreatePurchaseIntentReq(BaseModel):
    bot_id: int
    seller_wallet: str
    price_usd: float


class CreateIntentResp(BaseModel):
    intent_id: int
    reference: str
    amount_sol: float
    amount_lamports: int
    expires_at: str
    message_b64: str  # unsigned v0 Message (Transaction değil)


class ConfirmReq(BaseModel):
    intent_id: int
    signature: str


# ---------- Helpers ----------
def lamports_for_usd(usd: float, usd_per_sol: float, buffer_bps: int = 100) -> int:
    """
    buffer_bps: ör. 100 → %1
    """
    sol = usd / usd_per_sol
    sol *= (1 + buffer_bps / 10_000)
    return math.ceil(sol * 1_000_000_000)  # 1 SOL = 1e9 lamports


async def _build_v0_message_b64(payer: Pubkey, transfers: list[dict]) -> str:
    """
    transfers: [{"to": Pubkey, "lamports": int}, ...]
    DÖNÜŞ: base64-encoded **unsigned** v0 Message
    """
    ix_list = [
        transfer(TransferParams(from_pubkey=payer, to_pubkey=t["to"], lamports=t["lamports"]))
        for t in transfers
    ]
    async with AsyncClient(RPC_URL) as client:
        bh = await client.get_latest_blockhash()
    blockhash = bh.value.blockhash

    # try_compile(payer, instructions, address_lookup_table_accounts, recent_blockhash)
    msg = MessageV0.try_compile(payer, ix_list, [], blockhash)

    return base64.b64encode(bytes(msg)).decode("utf-8")


# ---------- Endpoints ----------
@router.post("/intent/listing", response_model=CreateIntentResp)
async def create_listing_intent(
    body: CreateListingIntentReq,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    usd_per_sol = get_usd_per_sol()
    amount_usd = 1.00  # ilan ücreti
    lamports = lamports_for_usd(amount_usd, usd_per_sol)

    reference = "REF-" + secrets.token_hex(8).upper()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    # payer cüzdanını cookie'den al
    from app.core.cookies import extract_siws_payload_or_401
    payload = extract_siws_payload_or_401(request)
    payer = Pubkey.from_string(payload["adr"])

    recipients = [{"to": str(PLATFORM_WALLET), "lamports": lamports, "label": "platform"}]

    message_b64 = await _build_v0_message_b64(
        payer, [{"to": PLATFORM_WALLET, "lamports": lamports}]
    )

    # ORM ile ekle (recipient_json TEXT olduğundan JSON string sakla)
    pi = PaymentIntent(
        user_id=int(user_id),
        purpose="listing_fee",
        bot_id=body.bot_id,
        seller_wallet=None,
        platform_fee_usd=0,
        buyer_pays_usd=amount_usd,
        quote_sol=lamports / 1_000_000_000,
        quote_lamports=lamports,
        quote_rate_usd_per_sol=usd_per_sol,
        recipient_json=json.dumps(recipients),
        reference=reference,
        status=0,
        expires_at=expires_at,
        # tx_sig=None  # default
    )
    db.add(pi)
    await db.flush()               # id burada oluşur
    intent_id = int(pi.id)
    await db.commit()

    return {
        "intent_id": intent_id,
        "reference": reference,
        "amount_sol": lamports / 1_000_000_000,
        "amount_lamports": lamports,
        "expires_at": expires_at.isoformat(),
        "message_b64": message_b64,
    }


@router.post("/intent/purchase", response_model=CreateIntentResp)
async def create_purchase_intent(
    body: CreatePurchaseIntentReq,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    """
    Buyer total payment = price_usd
    Platform fee = price_usd * (PLATFORM_FEE_BPS/10_000)
    Seller gets the remainder.
    """
    usd_per_sol = get_usd_per_sol()

    # 1) Ücretleri USD bazında hesapla
    total_usd = float(body.price_usd)
    platform_fee_usd = round(total_usd * (PLATFORM_FEE_BPS / 10_000), 6)
    seller_usd = max(total_usd - platform_fee_usd, 0.0)

    # 2) Lamports’a çeviri (yuvarlama farklarını engellemek için)
    total_lamports = lamports_for_usd(total_usd, usd_per_sol)
    seller_lamports = lamports_for_usd(seller_usd, usd_per_sol)
    platform_lamports = max(total_lamports - seller_lamports, 0)

    reference = "REF-" + secrets.token_hex(8).upper()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    from app.core.cookies import extract_siws_payload_or_401
    payload = extract_siws_payload_or_401(request)
    payer = Pubkey.from_string(payload["adr"])

    seller_pk = Pubkey.from_string(body.seller_wallet)
    recipients = [
        {"to": str(seller_pk), "lamports": seller_lamports, "label": "seller"},
        {"to": str(PLATFORM_WALLET), "lamports": platform_lamports, "label": "platform_fee"},
    ]

    message_b64 = await _build_v0_message_b64(
        payer,
        [
            {"to": seller_pk, "lamports": seller_lamports},
            {"to": PLATFORM_WALLET, "lamports": platform_lamports},
        ],
    )

    # 3) Intent kaydı
    pi = PaymentIntent(
        user_id=int(user_id),
        purpose="purchase",
        bot_id=body.bot_id,
        seller_wallet=body.seller_wallet,
        platform_fee_usd=platform_fee_usd,   # Backend hesaplıyor
        buyer_pays_usd=total_usd,           # Kullanıcının ödediği toplam
        quote_sol=total_lamports / 1_000_000_000,
        quote_lamports=total_lamports,
        quote_rate_usd_per_sol=usd_per_sol,
        recipient_json=json.dumps(recipients),
        reference=reference,
        status=0,
        expires_at=expires_at,
    )
    db.add(pi)
    await db.flush()
    intent_id = int(pi.id)
    await db.commit()

    return {
        "intent_id": intent_id,
        "reference": reference,
        "amount_sol": total_lamports / 1_000_000_000,
        "amount_lamports": total_lamports,
        "expires_at": expires_at.isoformat(),
        "message_b64": message_b64,
    }


@router.post("/confirm")
async def confirm_payment(
    body: ConfirmReq,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    q = select(PaymentIntent).where(PaymentIntent.id == body.intent_id)
    res = await db.execute(q)
    intent: PaymentIntent | None = res.scalar_one_or_none()
    if not intent or int(intent.status) != 0:
        raise HTTPException(400, "Invalid or already processed intent")

    if intent.expires_at < datetime.now(timezone.utc):
        # ❗ intent expired olsa bile signature’ı kaydediyoruz
        await db.execute(
            update(PaymentIntent)
            .where(PaymentIntent.id == body.intent_id)
            .values(status=-1, tx_sig=body.signature)
        )
        await db.commit()
        raise HTTPException(400, "Intent expired")

    async with AsyncClient(RPC_URL) as client:
        sig = SolSignature.from_string(body.signature)

        txres = None
        for attempt in range(5):
            txres = await client.get_transaction(
                sig,
                encoding="jsonParsed",
                max_supported_transaction_version=0,
                commitment="confirmed",
            )
            if txres.value:
                break
            await asyncio.sleep(2)

        if not txres or not txres.value:
            await db.execute(
                update(PaymentIntent)
                .where(PaymentIntent.id == body.intent_id)
                .values(status=-1, tx_sig=body.signature)
            )
            await db.commit()
            raise HTTPException(400, "Transaction not found after retries")

    # ---- Doğrulamalar
    try:
        msg = txres.value.transaction.transaction.message
        payer = str(msg.account_keys[0])

        parsed_ixs = msg.instructions
        total_paid = 0
        paid_map: dict[str, int] = {}

        for ix in parsed_ixs:
            if getattr(ix, "program", None) == "system" and getattr(ix, "parsed", None):
                if ix.parsed.get("type") == "transfer":
                    info = ix.parsed["info"]
                    dest = info["destination"]
                    lam = int(info["lamports"])
                    total_paid += lam
                    paid_map[dest] = paid_map.get(dest, 0) + lam

        intended = json.loads(intent.recipient_json)
        for r in intended:
            dest = r["to"]
            expected = int(r["lamports"])
            if paid_map.get(dest, 0) < expected:
                raise HTTPException(400, f"Insufficient amount to {dest}")

        if total_paid < int(intent.quote_lamports):
            raise HTTPException(400, "Total amount insufficient")

    except HTTPException as e:
        # ❗ doğrulama hatalarında da signature kaydediyoruz
        await db.execute(
            update(PaymentIntent)
            .where(PaymentIntent.id == body.intent_id)
            .values(status=-1, tx_sig=body.signature)
        )
        await db.commit()
        raise e

    # 4) Başarılı → status = 1
    await db.execute(
        update(PaymentIntent)
        .where(PaymentIntent.id == body.intent_id)
        .values(status=1, tx_sig=body.signature)
    )
    await db.commit()
    return {"ok": True}

