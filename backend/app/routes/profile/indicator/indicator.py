from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import verify_token
from app.models.profile.indicator.indicator import Indicator
from app.models.profile.indicator.indicators_favorite import IndicatorsFavorite
from sqlalchemy.future import select
from app.database import get_db
from app.routes.profile.indicator.input.input import extract_user_inputs
from app.schemas.indicator.indicator import IndicatorCreate, IndicatorUpdate
from fastapi import HTTPException
from sqlalchemy import select, or_, func

protected_router = APIRouter()

@protected_router.get("/api/all-indicators/")
async def get_all_indicators(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Tüm türdeki indikatörleri (kişisel, teknik, topluluk) tek API ile döner."""
    user_id = int(user_id)

    # 1) Kullanıcının kişisel indikatörleri
    user_result = await db.execute(
        select(
            Indicator.id,
            Indicator.name,
            Indicator.code,
            Indicator.created_at,
            Indicator.public,
            Indicator.tecnic,
            Indicator.version,
            Indicator.parent_indicator_id,
            IndicatorsFavorite.id.isnot(None).label("favorite"),
        )
        .outerjoin(
            IndicatorsFavorite,
            (IndicatorsFavorite.indicator_id == Indicator.id) &
            (IndicatorsFavorite.user_id == user_id)
        )
        .where(Indicator.user_id == user_id)
    )
    personal = user_result.mappings().all()

    # 2) Teknik (tecnic) indikatörler
    tecnic_result = await db.execute(
        select(
            Indicator.id,
            Indicator.name,
            Indicator.code,
            Indicator.created_at,
            Indicator.public,
            Indicator.tecnic,
            Indicator.version,
            Indicator.parent_indicator_id,
            IndicatorsFavorite.id.isnot(None).label("favorite"),
        )
        .outerjoin(
            IndicatorsFavorite,
            (IndicatorsFavorite.indicator_id == Indicator.id) &
            (IndicatorsFavorite.user_id == user_id)
        )
        .where(Indicator.tecnic == True)
    )
    tecnic = tecnic_result.mappings().all()

    # 3) Topluluk (public) indikatörler
    public_result = await db.execute(
        select(
            Indicator.id,
            Indicator.name,
            Indicator.code,
            Indicator.created_at,
            Indicator.public,
            Indicator.tecnic,
            Indicator.version,
            Indicator.parent_indicator_id,
            IndicatorsFavorite.id.isnot(None).label("favorite"),
        )
        .outerjoin(
            IndicatorsFavorite,
            (IndicatorsFavorite.indicator_id == Indicator.id) &
            (IndicatorsFavorite.user_id == user_id)
        )
        .where(Indicator.public == True)
    )
    public = public_result.mappings().all()

    return {
        "personal_indicators": [dict(row) for row in personal],
        "tecnic_indicators": [dict(row) for row in tecnic],
        "public_indicators": [dict(row) for row in public],
    }

@protected_router.get("/api/public-indicators/")
async def get_public_indicators(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
    ):
    """Public olan tüm indikatörleri getirir."""
    
    result = await db.execute(
        select(Indicator.id,
                Indicator.name,
                Indicator.code,
                #Indicator.created_at,
                Indicator.public,
                Indicator.tecnic,
               IndicatorsFavorite.id.isnot(None).label("favorite")  # Eğer favori varsa True, yoksa False döner
               )
               .outerjoin(IndicatorsFavorite,  # LEFT JOIN işlemi
                   (IndicatorsFavorite.indicator_id == Indicator.id) &
                   (IndicatorsFavorite.user_id == int(user_id)))
               .where(Indicator.public == True)
    )
    public_indicators = result.mappings().all()

    return {"public_indicators": public_indicators}

@protected_router.get("/api/tecnic-indicators/")
async def get_tecnic_indicators(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
    ):
    """Public olan tüm indikatörleri getirir."""
    
    result = await db.execute(
        select(Indicator.id,
                Indicator.name,
                Indicator.code,
                #Indicator.created_at,
                Indicator.public,
                Indicator.tecnic,
               IndicatorsFavorite.id.isnot(None).label("favorite")  # Eğer favori varsa True, yoksa False döner
               )
               .outerjoin(IndicatorsFavorite,  # LEFT JOIN işlemi
                   (IndicatorsFavorite.indicator_id == Indicator.id) &
                   (IndicatorsFavorite.user_id == int(user_id)))
               .where(Indicator.tecnic == True)
    )
    public_indicators = result.mappings().all()

    return {
        "tecnic_indicators": public_indicators
    }

@protected_router.get("/api/get-indicators/")
async def get_indicators(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Kullanıcının tüm indikatörlerini JSON formatında getirir.
    Eğer bir indikatör favori olarak işaretlenmişse, 'favorite': true olarak döner.
    """
    # Kullanıcının tüm indikatörlerini çek ve favori olup olmadığını kontrol et
    result = await db.execute(
        select(
            Indicator.id,
            Indicator.name,
            Indicator.code,
            Indicator.created_at,
            Indicator.public,
            IndicatorsFavorite.id.isnot(None).label("favorite")  # Eğer favori varsa True, yoksa False döner
        )
        .outerjoin(IndicatorsFavorite,  # LEFT JOIN işlemi
                   (IndicatorsFavorite.indicator_id == Indicator.id) &
                   (IndicatorsFavorite.user_id == int(user_id)))
        .where(Indicator.user_id == int(user_id))
    )

    indicators = result.mappings().all()

    return {"indicators": [dict(row) for row in indicators]}

@protected_router.post("/api/add-indicator/")
async def create_indicator(
    indicator_data: IndicatorCreate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Yeni indikatör veya bir indikatörün yeni versiyonunu oluşturur.
    - parent_indicator_id yoksa: yeni indikatör (version=1)
    - parent_indicator_id varsa: aynı grupta max(version)+1 ile yeni versiyon
    """
    user_id_int = int(user_id)

    # --- YENİ İNDİKATÖR (parent yok) ---
    if not indicator_data.parent_indicator_id:
        # Aynı isimden zaten var mı? (kullanıcı bazında)
        result = await db.execute(
            select(Indicator)
            .where(
                Indicator.user_id == user_id_int,
                Indicator.name == indicator_data.name,
                Indicator.parent_indicator_id.is_(None)  # sadece kök kayıtlar için
            )
            .limit(1)
        )
        existing_indicator = result.scalars().first()
        if existing_indicator:
            raise HTTPException(status_code=400, detail="Bu isimde bir indikatör zaten mevcut!")

        new_indicator = Indicator(
            user_id=user_id_int,
            name=indicator_data.name,
            code=indicator_data.code,
            version=1,
            parent_indicator_id=None,
        )
        db.add(new_indicator)
        await db.commit()
        await db.refresh(new_indicator)

        return {
            "id": new_indicator.id,
            "name": new_indicator.name,
            "code": new_indicator.code,
            "version": new_indicator.version,
            "parent_indicator_id": new_indicator.parent_indicator_id,
            "tecnic": new_indicator.tecnic,
            "public": new_indicator.public,
            "favorite": False,
        }

    # --- YENİ VERSİYON (parent var) ---
    parent_id = int(indicator_data.parent_indicator_id)

    # Parent doğrulama: var mı ve aynı kullanıcıya mı ait?
    parent_q = await db.execute(
        select(Indicator).where(
            Indicator.id == parent_id,
            Indicator.user_id == user_id_int,
        )
    )
    parent = parent_q.scalars().first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent indicator bulunamadı veya yetkisiz.")

    # Aynı GRUPTA (parent satırı + child'lar) max(version) hesapla
    # Grup tanımı: parent.id = parent_id olan satır + parent_indicator_id = parent_id olan çocuklar
    max_ver_q = await db.execute(
        select(func.max(Indicator.version)).where(
            or_(
                Indicator.id == parent_id,
                Indicator.parent_indicator_id == parent_id,
            ),
            Indicator.user_id == user_id_int,
        )
    )
    max_ver = max_ver_q.scalar() or 1
    next_version = int(max_ver) + 1

    new_version = Indicator(
        user_id=user_id_int,
        name=indicator_data.name,  # versiyon ismini aynı/different kullanmak serbest
        code=indicator_data.code,
        version=next_version,
        parent_indicator_id=parent_id,
    )
    db.add(new_version)
    await db.commit()
    await db.refresh(new_version)

    return {
        "id": new_version.id,
        "name": new_version.name,
        "code": new_version.code,
        "version": new_version.version,
        "parent_indicator_id": new_version.parent_indicator_id,
        "tecnic": new_version.tecnic,
        "public": new_version.public,
        "favorite": False,
    }

@protected_router.put("/api/edit-indicator/")
async def update_indicator(
    indicator_data: IndicatorUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Belirtilen indikatörün bilgilerini günceller. Eğer indikatör bulunamazsa hata döner."""
    
    result = await db.execute(select(Indicator).where(Indicator.id == indicator_data.id, Indicator.user_id == int(user_id)))
    indicator = result.scalars().first()

    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found!")

    # Güncellenmesi gereken alanları değiştir
    indicator.name = indicator_data.name
    indicator.code = indicator_data.code

    await db.commit()
    await db.refresh(indicator)

    return {"message": "Indicator updated successfully", "indicator": indicator}

@protected_router.delete("/api/delete-indicator/{indicator_id}/")
async def delete_indicator(
    indicator_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Belirtilen indikatörü siler. Eğer indikatör bulunamazsa hata döner."""
    
    result = await db.execute(select(Indicator).where(Indicator.id == indicator_id, Indicator.user_id == int(user_id)))
    indicator = result.scalars().first()

    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found!")

    await db.delete(indicator)
    await db.commit()

    return {"message": "Indicator deleted successfully"}
