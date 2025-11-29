# app/routes/phantom/payments.py
from __future__ import annotations
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta, timezone
import json, secrets, math, base64

from app.database import get_db
from app.core.auth import verify_token
from app.models.payments import PaymentIntent
from app.services.pricing import get_usd_per_sol, get_usd_per_xlm

# ---- Solana / Solders ----
from solders.pubkey import Pubkey
from solders.system_program import transfer, TransferParams
from solders.message import MessageV0
from solana.rpc.async_api import AsyncClient
from solders.signature import Signature as SolSignature

from stellar_sdk import Server as StellarServer, TransactionBuilder, Network, Asset
from app.core.cookies import extract_siws_payload_or_401

from app.routes.profile.telegram.telegram_service import notify_user_by_telegram  

STELLAR_PLATFORM_WALLET = "GBLV5VOXKN5SYHOPC7FSOOTNH3YVW33LQZAKZYRFR7EZII7VLST2DTCB"
STELLAR_HORIZON_URL = "https://horizon-testnet.stellar.org"
STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015"

PLATFORM_WALLET = Pubkey.from_string("AkmufZViBgt9mwuLPhFM8qyS1SjWNbMRBK8FySHajvUA")
RPC_URL = "https://api.mainnet-beta.solana.com"

router = APIRouter(prefix="/payments", tags=["payments"])

PLATFORM_FEE_BPS = 1000

# ---------- Schemas ----------
class CreateListingIntentReq(BaseModel):
    bot_id: int
    chain: str = "solana"          # "solana" | "stellar"
    stellar_address: Optional[str] = None  # Stellar için kaynak adres

class CreatePurchaseIntentReq(BaseModel):
    bot_id: int
    seller_wallet: str
    price_usd: float
    chain: str = "solana"

class CreateIntentResp(BaseModel):
    intent_id: int
    reference: str
    chain: str

    # Solana alanları (opsiyonel)
    amount_sol: Optional[float] = None
    amount_lamports: Optional[int] = None

    # Stellar alanları (opsiyonel – şimdilik 1 XLM gibi basit tutabiliriz)
    amount_xlm: Optional[str] = None

    expires_at: str

    # Solana: unsigned v0 Message
    message_b64: Optional[str] = None

    # Stellar: unsigned transaction XDR
    xdr: Optional[str] = None


class ConfirmReq(BaseModel):
    intent_id: int
    signature: str
    chain: str | None = None   # <--- eklendi


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

def _fmt_sol(lamports: int) -> str:
    try:
        return f"{lamports / 1_000_000_000:.6f} SOL".rstrip("0").rstrip(".")
    except Exception:
        return f"{lamports} lamports"

@router.post("/intent/listing", response_model=CreateIntentResp)
async def create_listing_intent(
    body: CreateListingIntentReq,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    print("Creating listing intent for user:", user_id)
    print("Request body:", body)

    amount_usd = 1.00  # ilan ücreti
    reference = "REF-" + secrets.token_hex(8).upper()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    chain = (body.chain or "solana").lower()

    extra_fields = {}
    if hasattr(PaymentIntent, "chain"):
        extra_fields["chain"] = chain

    # ---------- SOLANA ----------
    if chain == "solana":
        usd_per_sol = get_usd_per_sol()
        lamports = lamports_for_usd(amount_usd, usd_per_sol)

        payload = extract_siws_payload_or_401(request)
        payer = Pubkey.from_string(payload["adr"])

        recipients = [{"to": str(PLATFORM_WALLET), "lamports": lamports, "label": "platform"}]

        message_b64 = await _build_v0_message_b64(
            payer, [{"to": PLATFORM_WALLET, "lamports": lamports}]
        )

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
            **extra_fields,
        )
        db.add(pi)
        await db.flush()
        intent_id = int(pi.id)
        await db.commit()

        return {
            "intent_id": intent_id,
            "reference": reference,
            "chain": "solana",
            "amount_sol": lamports / 1_000_000_000,
            "amount_lamports": lamports,
            "expires_at": expires_at.isoformat(),
            "message_b64": message_b64,
            "xdr": None,
            "amount_xlm": None,
        }

    # ---------- STELLAR ----------
    if chain == "stellar":
        if not body.stellar_address:
            raise HTTPException(400, "stellar_address is required for Stellar listing intent")

        server = StellarServer(STELLAR_HORIZON_URL)

        # 🔹 1 USD'yi XLM'e çevir
        # get_usd_per_xlm = 1 XLM kaç USD eder?
        usd_per_xlm = get_usd_per_xlm()  # örn: 0.12 USD / XLM
        if not usd_per_xlm or usd_per_xlm <= 0:
            raise HTTPException(500, "Failed to get XLM price")

        # 1 USD'nin XLM karşılığı
        # amount_usd = 1.00 (dosyanın üst kısmında tanımlı)
        xlm_raw = amount_usd / usd_per_xlm  # örn: 1 / 0.12 ≈ 8.3333 XLM

        # İstersen Solana tarafındaki gibi küçük bir buffer ekleyebilirsin (%1)
        buffer_bps = 100  # 100 = %1
        xlm_raw *= (1 + buffer_bps / 10_000)

        # Stellar SDK string beklediği için normal string'e formatlıyoruz
        amount_xlm = f"{xlm_raw:.7f}".rstrip("0").rstrip(".")  # "8.3333" gibi

        try:
            source_account = server.load_account(body.stellar_address)
            base_fee = server.fetch_base_fee()

            tx = (
                TransactionBuilder(
                    source_account=source_account,
                    network_passphrase=STELLAR_NETWORK_PASSPHRASE,
                    base_fee=base_fee,
                )
                .add_text_memo(reference)
                .append_payment_op(
                    destination=STELLAR_PLATFORM_WALLET,
                    amount=amount_xlm,
                    asset=Asset.native(),  # XLM
                )
                .set_timeout(300)
                .build()
            )

            xdr = tx.to_xdr()
        except Exception as e:
            raise HTTPException(400, f"Failed to build Stellar transaction: {e}")

        # PaymentIntent kaydı – Solana alanlarını 0 geçiyoruz
        recipients = [
            {"to": STELLAR_PLATFORM_WALLET, "amount_xlm": amount_xlm, "label": "platform"}
        ]

        pi = PaymentIntent(
            user_id=int(user_id),
            purpose="listing_fee",
            bot_id=body.bot_id,
            seller_wallet=None,
            platform_fee_usd=0,
            buyer_pays_usd=amount_usd,
            quote_sol=0,
            quote_lamports=0,
            quote_rate_usd_per_sol=0,
            recipient_json=json.dumps(recipients),
            reference=reference,
            status=0,
            expires_at=expires_at,
            **extra_fields,
        )
        db.add(pi)
        await db.flush()
        intent_id = int(pi.id)
        await db.commit()
        print("Here 4")
        return {
            "intent_id": intent_id,
            "reference": reference,
            "chain": "stellar",
            "amount_sol": None,
            "amount_lamports": None,
            "amount_xlm": amount_xlm,
            "expires_at": expires_at.isoformat(),
            "message_b64": None,
            "xdr": xdr,
        }

    # Desteklenmeyen chain
    raise HTTPException(400, "Unsupported chain")

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
        platform_fee_usd=platform_fee_usd,
        buyer_pays_usd=total_usd,         
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

    # Önce body.chain, sonra intent.chain, yoksa varsayılan 'solana'
    chain_raw = body.chain or getattr(intent, "chain", None) or "solana"
    chain = str(chain_raw).lower()

    # Süre kontrolü iki chain için de ortak
    if intent.expires_at < datetime.now(timezone.utc):
        await db.execute(
            update(PaymentIntent)
            .where(PaymentIntent.id == body.intent_id)
            .values(status=-1, tx_sig=body.signature)
        )
        await db.commit()
        raise HTTPException(400, "Intent expired")

    # ---------- STELLAR DOĞRULAMA ----------
    if chain == "stellar":
        server = StellarServer(STELLAR_HORIZON_URL)
        try:
            tx = server.transactions().transaction(body.signature).call()
        except Exception:
            await db.execute(
                update(PaymentIntent)
                .where(PaymentIntent.id == body.intent_id)
                .values(status=-1, tx_sig=body.signature)
            )
            await db.commit()
            raise HTTPException(400, "Stellar transaction not found")

        if not tx.get("successful"):
            await db.execute(
                update(PaymentIntent)
                .where(PaymentIntent.id == body.intent_id)
                .values(status=-1, tx_sig=body.signature)
            )
            await db.commit()
            raise HTTPException(400, "Stellar transaction not successful")

        # (İstersen burada operations ile gelen XLM miktarını da kontrol edebilirsin.)

        await db.execute(
            update(PaymentIntent)
            .where(PaymentIntent.id == body.intent_id)
            .values(status=1, tx_sig=body.signature)
        )
        await db.commit()

    # ---------- SOLANA DOĞRULAMA ----------
    else:
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
            # doğrulama hatalarında da signature kaydediyoruz
            await db.execute(
                update(PaymentIntent)
                .where(PaymentIntent.id == body.intent_id)
                .values(status=-1, tx_sig=body.signature)
            )
            await db.commit()
            raise e

        # Başarılı → status = 1
        await db.execute(
            update(PaymentIntent)
            .where(PaymentIntent.id == body.intent_id)
            .values(status=1, tx_sig=body.signature)
        )
        await db.commit()

    # ====== TELEGRAM BİLDİRİMİ (ortak) ======
    try:
        amount_text = (
            _fmt_sol(int(intent.quote_lamports))
            if getattr(intent, "quote_lamports", None)
            else "Tutar onaylandı"
        )
        sig_short = (
            body.signature[:8] + "…"
            if body.signature and len(body.signature) > 10
            else body.signature or ""
        )

        intent_kind = (
            getattr(intent, "intent_type", None)
            or getattr(intent, "purpose", None)
            or ""
        ).upper()
        if "RENT" in intent_kind:
            title = "Kiralama işleminiz onaylandı"
        elif "PURCHASE" in intent_kind or "BUY" in intent_kind:
            title = "Satın alma işleminiz onaylandı"
        else:
            title = "Ödemeniz onaylandı"

        text = (
            f"🎉 <b>{title}</b>\n\n"
            f"💳 Tutar: <b>{amount_text}</b>\n"
            + (f"🧾 İşlem: <code>{sig_short}</code>\n" if sig_short else "")
            + "\n"
            "🔔 İlgili bot(lar) ile ilgili gelişmeleri Telegram üzerinden anlık olarak bildireceğiz.\n\n"
            "🌐 Daha fazla detay ve takibiniz için <a href=\"https://whaleer.com\">whaleer.com</a> adresini ziyaret edebilirsiniz. 🚀"
        )

        await notify_user_by_telegram(text, int(user_id), db=db)
    except Exception:
        # Bildirim hatasını sessiz yutuyoruz; ödeme akışını etkilemesin
        pass

    return {"ok": True}

