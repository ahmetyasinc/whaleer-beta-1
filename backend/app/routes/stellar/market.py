# app/routes/stellar/market.py
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone, timedelta
import json
import secrets
from app.services.contract.init_vault import init_vault_on_chain

from app.core.stellar import wait_for_tx_success  # 👈 biraz önce yazdığımız helper

from stellar_sdk import SorobanServer, soroban_rpc

from app.database import get_db
from app.core.auth import verify_token
from app.models.payments import PaymentIntent 
from app.services.bot_service import replicate_bot_for_user
from stellar_sdk import Server

from app.models.wallets import Wallet # Cüzdan modeli
from app.models.profile.bots.bots import Bots      # Bot modeli

# .env'den ID'leri çekmek için
import os

router = APIRouter(prefix="/stellar/market", tags=["stellar-market"])

HORIZON_URL = "https://horizon-testnet.stellar.org"
PAYMENT_CONTRACT_ID = os.getenv("WHALEER_PAYMENT_CONTRACT_ID")
NATIVE_TOKEN_ID = os.getenv("NATIVE_TOKEN_CONTRACT_ID")

soroban = SorobanServer("https://soroban-testnet.stellar.org")

server = Server(HORIZON_URL)

# --- Request Modelleri ---
class CreateOrderReq(BaseModel):
    bot_id: int
    purchase_type: str # "BUY" | "RENT"
    rent_days: int = 0
    price_amount: float # XLM Miktarı (Örn: 10.5)
    seller_address: str

class ConfirmOrderReq(BaseModel):
    order_id: int
    tx_hash: str

@router.post("/create-order")
async def create_order(
    body: CreateOrderReq,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    """
    Sipariş kaydı (PaymentIntent) oluşturur.
    Frontend bu 'order_id' ile kontratı çağıracak.
    """
    
    # XLM Miktarını 'stroop' (10^7) cinsine çevir (Kontrat i128 bekler)
    # Örn: 1 XLM = 10,000,000 stroop
    amount_stroop = int(body.price_amount * 10_000_000)
    
    pi = PaymentIntent(
        user_id=int(user_id),
        bot_id=body.bot_id,
        purpose=f"{body.purchase_type}_stellar",
        seller_wallet=body.seller_address,
        buyer_pays_usd=0, 
        
        quote_lamports=amount_stroop, 
        
        # --- EKSİK ALANLAR DOLDURULDU ---
        quote_sol=0, # Stellar için anlamsız, 0 veriyoruz
        quote_rate_usd_per_sol=0, # Stellar için anlamsız
        reference=secrets.token_hex(16), # Rastgele benzersiz referans
        chain="stellar", # Modelde artık bu alan var!
        # -------------------------------

        recipient_json=json.dumps({
            "rent_days": body.rent_days,
            "purchase_type": body.purchase_type
        }),
        
        status=0,
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15)
    )
    
    db.add(pi)
    await db.commit()
    await db.refresh(pi)

    return {
        "order_id": pi.id,
        "contract_id": PAYMENT_CONTRACT_ID,
        "token_id": NATIVE_TOKEN_ID,
        "amount_stroop": amount_stroop # Frontend bunu kullanacak
    }

@router.post("/confirm-order")
async def confirm_order(
    body: ConfirmOrderReq,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    """
    1. Transaction Hash'i Soroban RPC üzerinden doğrular.
    2. İşlem SUCCESS ise Botu kopyalar ve kullanıcıya atar.
    """
    print(f"Confirming order {body.order_id} for user {user_id} with tx {body.tx_hash}")

    # 1. Siparişi Bul
    q = select(PaymentIntent).where(PaymentIntent.id == body.order_id)
    res = await db.execute(q)
    intent = res.scalar_one_or_none()
    #print(f"Found intent: {intent}")

    if not intent:
        raise HTTPException(404, "Order not found")

    if intent.status == 1:
        # Zaten onaylıysa tekrar işlem yapma
        return {"status": "already_confirmed", "bot_id": intent.bot_id}

    #print(f"Intent status: {intent.status}")

    # 2. Soroban RPC'den transaction durumunu doğrula
    try:
        tx_resp = await wait_for_tx_success(body.tx_hash)
    except RuntimeError as e:
        # Burada FAILED veya NOT_FOUND (poll sonrası) gibi durumlar gelir
        raise HTTPException(status_code=400, detail=str(e))

    # Buraya gelmişsek status == SUCCESS
    # İstersen tx_resp'i loglayabilirsin:
    #print(f"Soroban tx success: ledger={tx_resp.ledger}, created_at={tx_resp.create_at}")

    # 3. İleri Seviye Doğrulama (opsiyonel)
    # - tx_resp.result_meta_xdr'dan kontrat eventlerini parse edip
    #   gerçekten pay_split çağrısı mı yapılmış, contract_id seninki mi vs. bakabilirsin.
    # Şimdilik SUCCESS olması yeterli kabul ediyoruz.

    # 4. BOT KOPYALAMA İŞLEMİ
    meta_data = json.loads(intent.recipient_json)
    purchase_type = meta_data.get("purchase_type", "BUY")
    rent_days = meta_data.get("rent_days", 0)

    q_wallet = select(Wallet).where(
        Wallet.user_id == int(user_id),
        Wallet.chain == "stellar"
    )
    res_wallet = await db.execute(q_wallet)
    user_wallet = res_wallet.scalar_one_or_none()
    #print(f"User wallet: {user_wallet}")
    #print(f"User ID: {user_id}")
    #print(f"Intent seller wallet: {intent.seller_wallet}")
    if not user_wallet:
        # Eğer cüzdan bulunamazsa (çok düşük ihtimal ama mümkün)
        # Frontend'den adres gelmediyse hata fırlatabiliriz veya
        # İşlemi yapan TX'in 'sourceAccount'una bakabiliriz (ileri seviye)
        raise HTTPException(400, "User stellar wallet not found in Platform")
    
    user_address = user_wallet.address
    q_bot = select(Bots).where(Bots.id == intent.bot_id)
    res_bot = await db.execute(q_bot)
    original_bot = res_bot.scalar_one_or_none()
    meta_data = json.loads(intent.recipient_json)
    purchase_type = meta_data.get("purchase_type", "BUY")
    rent_days = meta_data.get("rent_days", 0)
    profit_share_rate = 0
    if purchase_type == "BUY" and getattr(original_bot, "sold_profit_share_rate", False):
        profit_share_rate = getattr(original_bot, "sold_profit_share_rate", 0)
    elif purchase_type == "RENT" and getattr(original_bot, "rent_profit_share_rate", False):
        profit_share_rate = getattr(original_bot, "rent_profit_share_rate", 0)
    platform_cut_rate = 10

    try:
        new_bot_id = await replicate_bot_for_user(
            db=db,
            original_bot_id=intent.bot_id,
            new_owner_id=int(user_id),
            purchase_type=purchase_type,   # "BUY" | "RENT" gibi
            rent_days=rent_days,
            price_paid=float(intent.price_amount) if getattr(intent, "price_amount", None) else None,
            tx_hash=body.tx_hash,
            profit_share_rate=profit_share_rate
        )
        if profit_share_rate > 0:
            vault_tx_hash = init_vault_on_chain(
                bot_id=new_bot_id,
                user_id=int(user_id),
                user_address=user_address,
                developer_address=intent.seller_wallet,
                profit_share_rate=profit_share_rate,
                platform_cut_rate=platform_cut_rate
            )
    except Exception as e:
        raise HTTPException(
            500,
            "Payment successful but bot delivery failed. Contact support.",
        )

    # 5. Veritabanını Güncelle (Siparişi Tamamla)
    intent.status = 1  # Confirmed
    intent.tx_sig = body.tx_hash
    intent.updated_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "status": "confirmed",
        "new_bot_id": new_bot_id,
        "message": "Bot successfully added to your inventory.",
    }