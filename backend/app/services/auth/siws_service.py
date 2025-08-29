# app/services/auth/siws_service.py
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.wallets import Wallet, WalletSignin, SiwsNonce

class AddressTakenError(Exception):
    pass

async def upsert_wallet_and_log_link(
    db: AsyncSession,
    *,
    user_id: int,
    chain: str,
    address: str,
    nonce_id: int,
    signature_b58: str,
    remote_ip: str | None,
    user_agent: str | None,
):
    now = datetime.now(timezone.utc)

    # 1) adres var mı?
    res = await db.execute(select(Wallet).where(Wallet.chain == chain, Wallet.address == address))
    wallet = res.scalar_one_or_none()
    if wallet is None:
        # Yeni cüzdan; doğrudan bu kullanıcıya bağla
        wallet = Wallet(
            user_id=user_id,
            chain=chain,
            address=address,
            is_verified=True,
            verified_at=now,
            last_sign_in_at=now,  # istersen last_linked_at adında ayrı bir sütun da ekleyebilirsin
        )
        db.add(wallet)
        await db.flush()
    else:
        print("Burası daha sonra düzeltilmeli...")
        print(wallet.user_id, user_id)
        # Adres başka kullanıcıya mı bağlı?
        if wallet.user_id != user_id:
            raise AddressTakenError("This wallet address is already linked to another account.")
        # Aynı kullanıcıya aitse idempotent olarak güncelle
        wallet.is_verified = True
        wallet.verified_at = wallet.verified_at or now
        wallet.last_sign_in_at = now
        await db.flush()

    # 2) log
    signin = WalletSignin(
        wallet_id=wallet.id,
        nonce_id=nonce_id,
        signature=signature_b58,
        verified=True,
        remote_ip=remote_ip,
        user_agent=user_agent,
    )
    db.add(signin)
    # 3) nonce consume
    resn = await db.execute(select(SiwsNonce).where(SiwsNonce.id == nonce_id))
    nonce_row = resn.scalar_one_or_none()
    if nonce_row:
        nonce_row.status = 1
        nonce_row.consumed_at = now
        await db.flush()

    await db.commit()
    return wallet
