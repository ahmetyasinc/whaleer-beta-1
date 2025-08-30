from app.core.auth import verify_token
from app.models.profile.api_keys.api_keys import APIKey
from app.models.profile.bots.bots import Bots
from app.models.profile.api_keys.ed25519_stock import Ed25519Stock
from sqlalchemy.future import select
from app.database import get_db
from app.schemas.api_keys.api_keys import APIKeyCreate, APIKeyOut, BotMiniOut, DeleteApiIn, DeleteApiOut
from fastapi import HTTPException, status
from app.database import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from pydantic import BaseModel, Field
import aiohttp
import hmac
import hashlib
import time

from app.core.auth import verify_token
from app.database import get_db

class UpdateApiRequest(BaseModel):
    id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1)

class BalanceRequest(BaseModel):
    key: str
    secretkey: str

class ChangeDefaultReq(BaseModel):
    id: int

class Ed25519PairOut(BaseModel):
    public_key: str
    private_key: str


protected_router = APIRouter()

@protected_router.get("/api/get-apis/")
async def get_user_apis(db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(
        select(APIKey).where(APIKey.user_id == int(user_id)).order_by(APIKey.id)
    )
    api_keys = result.scalars().all()
    return api_keys

@protected_router.post("/api/change-default-api")
async def change_default_api(
    payload: ChangeDefaultReq,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    uid = int(user_id)

    # 1) Kayıt var mı ve bu kullanıcıya mı ait?
    res = await db.execute(
        select(APIKey).where(APIKey.id == payload.id, APIKey.user_id == uid)
    )
    record = res.scalar_one_or_none()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found for this user.",
        )

    # 2) Aynı kullanıcıdaki diğer tüm anahtarları default=false yap
    await db.execute(
        update(APIKey)
        .where(APIKey.user_id == uid, APIKey.id != payload.id)
        .values(default=False)
    )

    # 3) Seçili anahtarı default=true yap
    await db.execute(
        update(APIKey)
        .where(APIKey.id == payload.id, APIKey.user_id == uid)
        .values(default=True)
    )

    await db.commit()

    return {"ok": True, "id": payload.id, "message": "Default API updated."}

@protected_router.post("/api/ed25519/claim-one", response_model=Ed25519PairOut)
async def claim_ed25519_pair(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Ed25519Stock'tan is_used = false olan bir kaydı kilitleyerek al,
    is_used = true yap ve anahtarları döndür.
    """
    # 1) Kilitleyerek (skip locked) tek bir kullanılmamış kayıt seç
    res = await db.execute(
        select(Ed25519Stock)
        .where(Ed25519Stock.is_used.is_(False))
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    row = res.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stokta kullanılmamış Ed25519 anahtarı kalmadı."
        )

    # 2) Seçtiğimiz kaydı used=true yap
    row.is_used = True
    await db.commit()  # flush + commit

    # 3) Anahtarları döndür
    return Ed25519PairOut(public_key=row.public_key, private_key=row.private_key)

@protected_router.get("/api/get-user-apis/")
async def get_user_apis(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    result = await db.execute(
        select(APIKey.id, APIKey.api_name, APIKey.default)
        .where(APIKey.user_id == int(user_id))
        .order_by(APIKey.id)
    )
    api_keys = result.all()
    return [dict(row._mapping) for row in api_keys]

@protected_router.post("/api/create-api/", response_model=APIKeyOut, status_code=201)
async def create_api_key(
    api_key: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(verify_token),
):
    # 1) Aynı kullanıcıda aynı HMAC api_key varsa engelle
    if api_key.api_key:
        q = select(APIKey).where(
            APIKey.user_id == int(user_id),
            APIKey.api_key == api_key.api_key
        )
        existing = (await db.execute(q)).scalars().first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu API anahtarı zaten mevcut."
            )

    # 2) Normalizasyon
    exchange_norm = (api_key.exchange or "").strip()
    name_norm = (api_key.api_name or "").strip()

    # 3) Kayıt nesnesi
    record = APIKey(
        exchange=exchange_norm,
        api_name=name_norm,
        api_key=api_key.api_key,
        api_secret=api_key.api_secret,
        ed_public=api_key.ed_public,
        ed_public_pem=api_key.ed_public_pem,
        ed_private_pem=api_key.ed_private_pem,
        spot_balance=api_key.spot_balance or 0,
        futures_balance=api_key.futures_balance or 0,
        user_id=int(user_id),
        # default, is_test_api → default değerlerinden gelir
    )

    # 4) Persist
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return APIKeyOut(id=record.id)

@protected_router.get("/api/api-bots/{api_id}", response_model=list[BotMiniOut])
async def get_api_bots(
    api_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(verify_token),
):
    api = await db.scalar(select(APIKey).where(APIKey.id == api_id, APIKey.user_id == int(user_id)))
    if not api:
        raise HTTPException(status_code=404, detail="API bulunamadı.")

    bots = (
        await db.execute(
            select(Bots).where(
                Bots.user_id == int(user_id),
                Bots.api_id == api_id,
                Bots.deleted == False,
            )
        )
    ).scalars().all()

    return [
        BotMiniOut(id=b.id, name=b.name, active=b.active, strategy_id=b.strategy_id)
        for b in bots
    ]

@protected_router.post("/api/delete-api/", response_model=DeleteApiOut)
async def delete_api_key(
    payload: DeleteApiIn,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(verify_token),
):
    api_id = payload.id
    cascade = bool(payload.cascade)

    # Tek transaction içinde tut (otomatik commit/rollback)
    async with db.begin():
        # 1) API kaydını kilitleyerek al
        api = await db.scalar(
            select(APIKey)
            .where(APIKey.id == api_id, APIKey.user_id == int(user_id))
            .with_for_update()
        )
        if not api:
            raise HTTPException(status_code=404, detail="API anahtarı bulunamadı.")

        # 2) Bu API’ye bağlı, silinmemiş botları kilitleyerek çek
        bots_result = await db.execute(
            select(Bots)
            .where(
                Bots.user_id == int(user_id),
                Bots.api_id == api_id,
                Bots.deleted.is_(False),
            )
            .with_for_update()
        )
        bots = list(bots_result.scalars().all())

        # 3) Bot varsa ve cascade=false ise — önce frontend’e liste göstermek için 409
        if bots and not cascade:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "BOTS_ATTACHED",
                    "bots": [{"id": b.id, "name": b.name, "active": bool(b.active)} for b in bots],
                },
            )

        # 4) Botları soft delete et
        deleted_bot_ids = []
        if bots:
            for b in bots:
                b.active = False
                b.deleted = True
                b.for_sale = False
                b.for_rent = False
                b.api_id = None
                deleted_bot_ids.append(b.id)

        # 5) API default ise silmeden önce devretmeyi hazırla
        default_reassigned_to = None
        was_default = bool(api.default)

        # 6) API’yi sil
        await db.delete(api)

        # 7) Default devri (kullanıcıya ait başka API varsa son oluşturulana ver)
        if was_default:
            replacement = await db.scalar(
                select(APIKey)
                .where(APIKey.user_id == int(user_id), APIKey.id != api_id)
                .order_by(APIKey.created_at.desc())
                .with_for_update()
            )
            if replacement:
                replacement.default = True
                default_reassigned_to = replacement.id

    # async with db.begin() commit’i yaptıktan sonra cevapla
    return DeleteApiOut(
        deleted_bots=deleted_bot_ids,
        default_reassigned_to=default_reassigned_to,
    )

@protected_router.post("/api/update-api/")
async def update_api_key(
    data: UpdateApiRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(verify_token),
):
    new_name = data.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Yeni isim boş olamaz.")

    api_key = await db.scalar(
        select(APIKey).where(APIKey.user_id == int(user_id), APIKey.id == data.id)
    )
    if not api_key:
        raise HTTPException(status_code=404, detail="API anahtarı bulunamadı.")

    api_key.api_name = new_name
    await db.commit()
    await db.refresh(api_key)

    return {"detail": "API anahtarı başarıyla güncellendi.", "updated_api": {"id": api_key.id, "name": api_key.api_name}}


@protected_router.post("/api/get-balance/")
async def get_binance_balance(data: BalanceRequest):
    base_url = "https://api.binance.com"
    endpoint = "/api/v3/account"

    timestamp = int(time.time() * 1000)
    query_string = f"timestamp={timestamp}"
    
    # imza oluştur
    signature = hmac.new(
        data.secretkey.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    full_url = f"{base_url}{endpoint}?{query_string}&signature={signature}"
    headers = {
        "X-MBX-APIKEY": data.key
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(full_url, headers=headers) as resp:
                if resp.status != 200:
                    detail = await resp.text()
                    raise HTTPException(status_code=resp.status, detail=f"Binance API hatası: {detail}")

                result = await resp.json()

        # Balanceları işleyip toplam USD'yi bul
        usd_assets = ["USDT", "BUSD", "FDUSD", "TUSD"]
        total_balance = sum(
            float(asset["free"]) + float(asset["locked"])
            for asset in result["balances"]
            if asset["asset"] in usd_assets
        )

        return {"balance": round(total_balance, 2)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sunucu hatası: {str(e)}")