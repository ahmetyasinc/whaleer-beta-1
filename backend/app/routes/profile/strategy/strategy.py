from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import verify_token
from app.models.profile.strategy.strategy import Strategy
from app.models.profile.strategy.strategies_favorite import StrategiesFavorite
from sqlalchemy.future import select
from app.database import get_db
from app.schemas.strategy.strategy import StrategyCreate, StrategyUpdate
from fastapi import HTTPException

protected_router = APIRouter()

from sqlalchemy import select, or_, and_, func
from app.models.profile.bots.bots import Bots

from sqlalchemy import select, and_, or_
from app.models.profile.bots.bots import Bots

@protected_router.get("/api/all-strategies/")
async def get_all_strategies(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Tüm türdeki indikatörleri (kişisel, teknik, topluluk) tek API ile döner."""

    user_id = int(user_id)

    acq_col = getattr(Bots, "acquisition_type", None)

    # 🔒 locked kuralı:
    # - PURCHASED/RENTED → deleted=false ise her durumda kilit
    # - ORIGINAL → deleted=false ve active=true ise kilit
    purchased_or_rented = and_(
        Bots.strategy_id == Strategy.id,
        Bots.deleted.is_(False),
        acq_col.in_(("PURCHASED", "RENTED")),
    )
    original_and_active = and_(
        Bots.strategy_id == Strategy.id,
        Bots.deleted.is_(False),
        acq_col == "ORIGINAL",
        Bots.active.is_(True),
    )

    locked_expr = (
        select(1)
        .select_from(Bots)
        .where(or_(purchased_or_rented, original_and_active))
        .exists()
        .label("locked")
    )

    # 1) Kişisel
    user_result = await db.execute(
        select(
            Strategy.id,
            Strategy.name,
            Strategy.code,
            Strategy.created_at,
            Strategy.public,
            Strategy.parent_strategy_id,   # ✅ eklendi
            Strategy.version,              # ✅ eklendi
            StrategiesFavorite.id.isnot(None).label("favorite"),
            locked_expr,
        )
        .outerjoin(
            StrategiesFavorite,
            (StrategiesFavorite.strategy_id == Strategy.id) &
            (StrategiesFavorite.user_id == user_id),
        )
        .where(Strategy.user_id == user_id)
    )
    personal = user_result.mappings().all()

    # 2) Teknik
    tecnic_result = await db.execute(
        select(
            Strategy.id,
            Strategy.name,
            Strategy.code,
            Strategy.public,
            Strategy.tecnic,
            Strategy.parent_strategy_id,   # ✅ eklendi
            Strategy.version,              # ✅ eklendi
            StrategiesFavorite.id.isnot(None).label("favorite"),
            locked_expr,
        )
        .outerjoin(
            StrategiesFavorite,
            (StrategiesFavorite.strategy_id == Strategy.id) &
            (StrategiesFavorite.user_id == user_id),
        )
        .where(Strategy.tecnic.is_(True))
    )
    tecnic = tecnic_result.mappings().all()

    # 3) Topluluk
    public_result = await db.execute(
        select(
            Strategy.id,
            Strategy.name,
            Strategy.code,
            Strategy.public,
            Strategy.tecnic,
            Strategy.parent_strategy_id,   # ✅ eklendi
            Strategy.version,              # ✅ eklendi
            StrategiesFavorite.id.isnot(None).label("favorite"),
            locked_expr,
        )
        .outerjoin(
            StrategiesFavorite,
            (StrategiesFavorite.strategy_id == Strategy.id) &
            (StrategiesFavorite.user_id == user_id),
        )
        .where(Strategy.public.is_(True))
    )
    public = public_result.mappings().all()

    return {
        "personal_strategies": [dict(row) for row in personal],
        "tecnic_strategies": [dict(row) for row in tecnic],
        "public_strategies": [dict(row) for row in public],
    }

@protected_router.get("/api/public-strategies/")
async def get_public_strategies(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
    ):
    """Public olan tüm strateji getirir."""
    
    result = await db.execute(
        select(Strategy.id,
                Strategy.name,
                Strategy.code,
                #Strategy.created_at,
                Strategy.public,
                Strategy.tecnic,
               StrategiesFavorite.id.isnot(None).label("favorite")  # Eğer favori varsa True, yoksa False döner
               )
               .outerjoin(StrategiesFavorite,  # LEFT JOIN işlemi
                   (StrategiesFavorite.strategy_id == Strategy.id) &
                   (StrategiesFavorite.user_id == int(user_id)))
               .where(Strategy.public == True)
    )
    public_strategies = result.mappings().all()

    return {"public_strategies": public_strategies}

@protected_router.get("/api/tecnic-strategies/")
async def get_tecnic_strategies(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
    ):
    """Public olan tüm indikatörleri getirir."""
    
    result = await db.execute(
        select(Strategy.id,
                Strategy.name,
                Strategy.code,
                #Strategy.created_at,
                Strategy.public,
                Strategy.tecnic,
               StrategiesFavorite.id.isnot(None).label("favorite")  # Eğer favori varsa True, yoksa False döner
               )
               .outerjoin(StrategiesFavorite,  # LEFT JOIN işlemi
                   (StrategiesFavorite.strategy_id == Strategy.id) &
                   (StrategiesFavorite.user_id == int(user_id)))
               .where(Strategy.tecnic == True)
    )
    public_strategies = result.mappings().all()

    return {"tecnic_strategies": public_strategies}

@protected_router.get("/api/get-strategies/")
async def get_strategies(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Kullanıcının tüm strateji JSON formatında getirir.
    Eğer bir strateji favori olarak işaretlenmişse, 'favorite': true olarak döner.
    """
    # Kullanıcının tüm strateji çek ve favori olup olmadığını kontrol et
    result = await db.execute(
        select(
            Strategy.id,
            Strategy.name,
            Strategy.code,
            Strategy.created_at,
            Strategy.public,
            StrategiesFavorite.id.isnot(None).label("favorite")  # Eğer favori varsa True, yoksa False döner
        )
        .outerjoin(StrategiesFavorite,  # LEFT JOIN işlemi
                   (StrategiesFavorite.strategy_id == Strategy.id) &
                   (StrategiesFavorite.user_id == int(user_id)))
        .where(Strategy.user_id == int(user_id))
    )

    strategies = result.mappings().all()

    return {"strategies": [dict(row) for row in strategies]}

@protected_router.post("/api/add-strategy/")
async def create_strategy(
    strategy_data: StrategyCreate,  # name, code, optional parent_strategy_id
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """
    Yeni strateji veya bir stratejinin yeni versiyonunu oluşturur.
    - parent_strategy_id yoksa: yeni kök strateji (version=1)
    - parent_strategy_id varsa: aynı grupta max(version)+1 ile yeni versiyon
    """
    user_id_int = int(user_id)

    # --- YENİ KÖK STRATEJİ (parent yok) ---
    if not getattr(strategy_data, "parent_strategy_id", None):
        # Kullanıcı bazında, SADECE kök kayıtlar için aynı isim var mı?
        dup_q = await db.execute(
            select(Strategy).where(
                Strategy.user_id == user_id_int,
                Strategy.name == strategy_data.name,
                Strategy.parent_strategy_id.is_(None),
            ).limit(1)
        )
        existing = dup_q.scalars().first()
        if existing:
            raise HTTPException(status_code=400, detail="Bu isimde bir strateji zaten mevcut!")

        new_strategy = Strategy(
            user_id=user_id_int,
            name=strategy_data.name,
            code=strategy_data.code,
            version=1,
            parent_strategy_id=None,
        )
        db.add(new_strategy)
        await db.commit()
        await db.refresh(new_strategy)

        return {
            "id": new_strategy.id,
            "name": new_strategy.name,
            "code": new_strategy.code,
            "version": new_strategy.version,
            "parent_strategy_id": new_strategy.parent_strategy_id,
            "tecnic": new_strategy.tecnic,
            "public": new_strategy.public,
            "favorite": False,
        }

    # --- YENİ VERSİYON (parent var) ---
    parent_id = int(strategy_data.parent_strategy_id)

    # Parent mevcut mu ve aynı kullanıcıya mı ait?
    parent_res = await db.execute(
        select(Strategy).where(
            Strategy.id == parent_id,
            Strategy.user_id == user_id_int,
        )
    )
    parent = parent_res.scalars().first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent strategy bulunamadı veya yetkisiz.")

    # Grup kökünü normalize et (parent bir child ise köke çık)
    group_root_id = parent.parent_strategy_id or parent.id

    # Aynı GRUPTA (kök + tüm çocuklar) max(version) bul
    max_ver_res = await db.execute(
        select(func.max(Strategy.version)).where(
            or_(
                Strategy.id == group_root_id,
                Strategy.parent_strategy_id == group_root_id,
            ),
            Strategy.user_id == user_id_int,
        )
    )
    max_ver = max_ver_res.scalar() or 1
    next_version = int(max_ver) + 1

    new_version = Strategy(
        user_id=user_id_int,
        name=strategy_data.name,   # İstersen aynı ismi kullan, istersen versiyon adına özel isim
        code=strategy_data.code,
        version=next_version,
        parent_strategy_id=group_root_id,
    )
    db.add(new_version)
    await db.commit()
    await db.refresh(new_version)

    return {
        "id": new_version.id,
        "name": new_version.name,
        "code": new_version.code,
        "version": new_version.version,
        "parent_strategy_id": new_version.parent_strategy_id,
        "tecnic": new_version.tecnic,
        "public": new_version.public,
        "favorite": False,
    }

@protected_router.put("/api/edit-strategy/")
async def update_strategy(
    strategy_data: StrategyUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    """
    Belirtilen strateji bilgilerini günceller.
    Locked kuralı:
      - acquisition_type ∈ {PURCHASED, RENTED} ve deleted=false → her durumda kilit
      - acquisition_type = ORIGINAL ve deleted=false ve active=true → kilit
    Kolon yoksa: ORIGINAL + active=true kuralıyla geriye uyumlu kilit.
    """
    user_id = int(user_id)

    # 1) Strateji kullanıcının mı?
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_data.id,
            Strategy.user_id == user_id,
        )
    )
    strategy = result.scalars().first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found!")

    acq_col = getattr(Bots, "acquisition_type", None)

    if acq_col is not None:
        purchased_or_rented = and_(
            Bots.strategy_id == strategy.id,
            Bots.deleted.is_(False),
            acq_col.in_(("PURCHASED", "RENTED")),
        )
        original_and_active = and_(
            Bots.strategy_id == strategy.id,
            Bots.deleted.is_(False),
            acq_col == "ORIGINAL",
            Bots.active.is_(True),
        )
        locked_clause = or_(purchased_or_rented, original_and_active)
    else:
        # Kolon yoksa: eski davranış (ORIGINAL kabulü) — active=true ve deleted=false ise kilit
        locked_clause = and_(
            Bots.strategy_id == strategy.id,
            Bots.deleted.is_(False),
            Bots.active.is_(True),
        )

    in_use_res = await db.execute(
        select(Bots.id).where(locked_clause).limit(1)
    )
    if in_use_res.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "This strategy is locked because it is used by an active or acquired bot. "
                "Please deactivate/detach bots or create a new version."
            ),
        )

    # 3) Güncelle ve kaydet
    strategy.name = strategy_data.name
    strategy.code = strategy_data.code

    await db.commit()
    await db.refresh(strategy)

    return {"message": "Strategy updated successfully", "strategy": strategy}

@protected_router.delete("/api/delete-strategy/{strategy_id}/")
async def delete_strategy(
    strategy_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """
    Stratejiyi siler. Eğer strateji 'locked' ise silmez; Whaleer (user_id=8) hesabına devreder.
    Locked kuralı:
      - acquisition_type ∈ {PURCHASED, RENTED} ve deleted=false → her durumda kilit
      - acquisition_type = ORIGINAL ve deleted=false ve active=true → kilit
    Kolon yoksa: active=true ve deleted=false → kilit (geriye uyumlu).
    """

    user_id_int = int(user_id)

    # 1) Strateji kullanıcının mı?
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == user_id_int
        )
    )
    strategy = result.scalars().first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found!")

    # 2) Locked kontrolü (diğer yerle aynı semantik)
    acq_col = getattr(Bots, "acquisition_type", None)

    if acq_col is not None:
        purchased_or_rented = and_(
            Bots.strategy_id == strategy.id,
            Bots.deleted.is_(False),
            acq_col.in_(("PURCHASED", "RENTED")),
        )
        original_and_active = and_(
            Bots.strategy_id == strategy.id,
            Bots.deleted.is_(False),
            acq_col == "ORIGINAL",
            Bots.active.is_(True),
        )
        locked_clause = or_(purchased_or_rented, original_and_active)
    else:
        # Kolon yoksa: aktif & silinmemiş bot varsa kilit
        locked_clause = and_(
            Bots.strategy_id == strategy.id,
            Bots.deleted.is_(False),
            Bots.active.is_(True),
        )

    in_use_res = await db.execute(
        select(Bots.id).where(locked_clause).limit(1)
    )
    is_locked = in_use_res.scalar_one_or_none() is not None

    # 3) Locked ise → silme, Whaleer'a devret
    if is_locked:
        strategy.user_id = 8  # Whaleer
        await db.commit()
        return {
            "message": "Strategy is locked; transferred to Whaleer (user_id=8) instead of deleting."
        }

    # 4) Locked değilse → sil
    await db.delete(strategy)
    await db.commit()

    return {"message": "Strategy deleted successfully"}
