from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import verify_token
from app.models.profile.api_keys.api_keys import APIKey
from sqlalchemy.future import select
from app.database import get_db
from app.schemas.api_keys.api_keys import APIKeyBase, APIKeyCreate, APIKeyOut
from fastapi import HTTPException
import aiohttp
import hmac
import hashlib
import time
from urllib.parse import urlencode
from app.database import get_db
from pydantic import BaseModel

class UpdateApiRequest(BaseModel):
    id: int
    name: str

class BalanceRequest(BaseModel):
    key: str
    secretkey: str

protected_router = APIRouter()

@protected_router.get("/api/get-apis/")
async def get_user_apis(db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    result = await db.execute(select(APIKey).where(APIKey.user_id == int(user_id)))
    api_keys = result.scalars().all()
    return api_keys

@protected_router.post("/api/create-api/")
async def create_api_key(api_key: APIKeyCreate, db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    db_api_key = APIKey(**api_key.dict(), user_id=int(user_id))
    db.add(db_api_key)
    await db.commit()
    await db.refresh(db_api_key)
    return db_api_key


@protected_router.post("/api/delete-api/")
async def delete_api_key(data: dict, db: AsyncSession = Depends(get_db), user_id: dict = Depends(verify_token)):
    api_id = data.get("id")
    if not api_id:
        raise HTTPException(status_code=400, detail="API seçilemedi.")

    # Kullanıcının bu isimde API'si var mı?
    result = await db.execute(select(APIKey).where(APIKey.user_id == int(user_id), APIKey.id == api_id))
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=404, detail="API anahtarı bulunamadı.")

    await db.delete(api_key)
    await db.commit()
    return {"detail": "API anahtarı başarıyla silindi."}

@protected_router.post("/api/update-api/")
async def update_api_key(
    data: UpdateApiRequest,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    api_id = data.id
    new_name = data.name

    if not api_id or not new_name:
        raise HTTPException(status_code=400, detail="API ID veya yeni isim belirtilmedi.")

    # Kullanıcının bu ID'ye sahip bir API key'i var mı?
    result = await db.execute(
        select(APIKey).where(APIKey.user_id == int(user_id), APIKey.id == api_id)
    )
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=404, detail="API anahtarı bulunamadı.")

    # Yeni ismi ata
    api_key.api_name = new_name

    # Veritabanına kaydet
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