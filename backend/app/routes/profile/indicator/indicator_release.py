# app/api/indicator_releases.py

from app.models.profile.indicator.indicator import Indicator
from app.models.profile.indicator.indicator_releases import IndicatorRelease, IndicatorReleaseStatus
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, update
from app.database import get_db
from app.core.auth import verify_token
import hashlib
from pydantic import BaseModel, Field

protected_router = APIRouter()


# ---------- Schemas ----------
class PublishIndicatorPayload(BaseModel):
    indicator_id: int
    description: str | None = Field(None, max_length=500)

    allow_code_view: bool = False
    allow_chart_view: bool = False


class PublishIndicatorResponse(BaseModel):
    ok: bool
    release_id: int
    indicator_id: int
    release_no: int
    status: IndicatorReleaseStatus
    created_at: str


# ---------- Helper ----------
async def _next_release_no(db: AsyncSession, indicator_id: int) -> int:
    q = select(func.coalesce(func.max(IndicatorRelease.release_no), 0)).where(
        IndicatorRelease.indicator_id == indicator_id
    )
    last_no = await db.scalar(q)
    return int(last_no or 0) + 1


# ---------- Endpoint: Publish ----------
@protected_router.post("/indicators/publish", response_model=PublishIndicatorResponse)
async def publish_indicator(
    payload: PublishIndicatorPayload,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(verify_token),
):
    user_id = int(user_id)

    # 1) İndikatör doğrulama (kullanıcıya ait olmalı)
    indicator = await db.scalar(
        select(Indicator).where(
            Indicator.id == payload.indicator_id,
            Indicator.user_id == user_id,
        )
    )
    if not indicator:
        raise HTTPException(status_code=404, detail="Indicator not found or unauthorized")

    # 2) Sıradaki release_no
    release_no = await _next_release_no(db, indicator.id)

    # 3) Snapshot + hash
    code_snapshot = indicator.code or ""
    code_hash = hashlib.sha256(code_snapshot.encode("utf-8")).hexdigest()

    # 4) Kayıt oluştur
    release = IndicatorRelease(
        indicator_id=indicator.id,
        release_no=release_no,

        allow_code_view=payload.allow_code_view,
        allow_chart_view=payload.allow_chart_view,

        description=payload.description,
        status=IndicatorReleaseStatus.pending,

        code_snapshot=code_snapshot,
        code_hash=code_hash,

        created_by=user_id,
    )

    db.add(release)
    await db.commit()
    await db.refresh(release)

    return PublishIndicatorResponse(
        ok=True,
        release_id=release.id,
        indicator_id=release.indicator_id,
        release_no=release.release_no,
        status=release.status,
        created_at=str(release.created_at),
    )


# ---------- Endpoint: View Counter ----------
@protected_router.post("/indicator-releases/{release_id}/view")
async def add_indicator_view(
    release_id: int,
    db: AsyncSession = Depends(get_db),
    viewer_id: int = Depends(verify_token),
):
    viewer_id = int(viewer_id)
    # sahibi öğren
    owner_id = await db.scalar(
        select(Indicator.user_id)
        .join(IndicatorRelease, IndicatorRelease.indicator_id == Indicator.id)
        .where(IndicatorRelease.id == release_id)
    )
    if owner_id is None:
        raise HTTPException(404, "Indicator Release not found")

    if viewer_id != owner_id:
        await db.execute(
            update(IndicatorRelease)
            .where(IndicatorRelease.id == release_id)
            .values(views_count=IndicatorRelease.views_count + 1)
        )
        await db.commit()

    return {"ok": True}
