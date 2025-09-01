from app.models.profile.strategy.strategy import Strategy
from app.models.profile.strategy.strategy_releases import StrategyRelease, ReleaseStatus
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, update
from app.database import get_db
from fastapi import HTTPException
from app.core.auth import verify_token
import hashlib
from pydantic import BaseModel, Field


protected_router = APIRouter()

class PublishPayload(BaseModel):
    strategy_id: int
    description: str | None = Field(None, max_length=500)

    allow_code_view: bool = False
    allow_chart_view: bool = False
    allow_scanning: bool = False
    allow_backtesting: bool = False
    allow_bot_execution: bool = False


class PublishResponse(BaseModel):
    ok: bool
    release_id: int
    strategy_id: int
    release_no: int
    status: ReleaseStatus
    created_at: str


# ---------- Helper ----------
async def _next_release_no(db: AsyncSession, strategy_id: int) -> int:
    q = select(func.coalesce(func.max(StrategyRelease.release_no), 0)).where(
        StrategyRelease.strategy_id == strategy_id
    )
    last_no = await db.scalar(q)
    return int(last_no or 0) + 1


# ---------- Endpoint: Publish ----------
@protected_router.post("/api/strategies/publish", response_model=PublishResponse)
async def publish_strategy(
    payload: PublishPayload,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(verify_token),
):
    user_id = int(user_id)

    # 1) Strateji doğrulama (kullanıcıya ait olmalı)
    strategy = await db.scalar(
        select(Strategy).where(
            Strategy.id == payload.strategy_id,
            Strategy.user_id == user_id,
        )
    )
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found or unauthorized")

    # 2) Sıradaki release_no
    release_no = await _next_release_no(db, strategy.id)

    # 3) Snapshot + hash (içerik dondurma)
    code_snapshot = strategy.code or ""
    code_hash = hashlib.sha256(code_snapshot.encode("utf-8")).hexdigest()

    # 4) Kayıt oluştur
    release = StrategyRelease(
        strategy_id=strategy.id,
        release_no=release_no,

        allow_code_view=payload.allow_code_view,
        allow_chart_view=payload.allow_chart_view,
        allow_scanning=payload.allow_scanning,
        allow_backtesting=payload.allow_backtesting,
        allow_bot_execution=payload.allow_bot_execution,

        description=payload.description,
        status=ReleaseStatus.pending,        # 👈 başlangıçta inceleme bekliyor

        code_snapshot=code_snapshot,
        code_hash=code_hash,

        created_by=user_id,
    )

    db.add(release)
    await db.commit()
    await db.refresh(release)

    return PublishResponse(
        ok=True,
        release_id=release.id,
        strategy_id=release.strategy_id,
        release_no=release.release_no,
        status=release.status,
        created_at=str(release.created_at),
    )



@protected_router.post("/api/strategy-releases/{release_id}/view")
async def add_view(
    release_id: int,
    db: AsyncSession = Depends(get_db),
    viewer_id: int = Depends(verify_token),   # misafir izni varsa opsiyonel yapabilirsin
):
    viewer_id = int(viewer_id)
    # sahibi öğren
    owner_id = await db.scalar(
        select(Strategy.user_id)
        .join(StrategyRelease, StrategyRelease.strategy_id == Strategy.id)
        .where(StrategyRelease.id == release_id)
    )
    if owner_id is None:
        raise HTTPException(404, "Release not found")
    if viewer_id != owner_id:
        await db.execute(
            update(StrategyRelease)
            .where(StrategyRelease.id == release_id)
            .values(views_count=StrategyRelease.views_count + 1)
        )
        await db.commit()
    return {"ok": True}