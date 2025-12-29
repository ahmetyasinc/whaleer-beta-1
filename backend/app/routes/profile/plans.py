# app/routes/plans.py
from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta

from app.database import get_db
from app.core.auth import verify_token
from app.models.profile.user_plan import UserPlan, PlanCode, PlanStatus
from app.models import User  # sadece doğrulama için

router = APIRouter()

@router.post("/plans/purchase")
async def purchase_plan(
    plan_code: str = Form(...),
    months: int = Form(0),
    auto_renew: bool = Form(True),
    notes: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    uid = int(user_id)

    # Kullanıcı var mı?
    user = (await db.execute(select(User).where(User.id == uid))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    # Plan doğrulama
    try:
        code = PlanCode(plan_code)
    except ValueError:
        raise HTTPException(status_code=400, detail="Geçersiz plan_code. (clam|octopus|whale)")

    # Süre doğrulama (clam ücretsiz; months 0 olabilir)
    if code in (PlanCode.octopus, PlanCode.whale) and (months is None or months <= 0):
        raise HTTPException(status_code=400, detail="Ücretli planlar için months > 0 olmalıdır.")

    now = datetime.now(timezone.utc)

    # Eğer ücretli bir plan alınıyorsa, mevcut aktif (süresi geçmemiş) planı iptal et
    if code in (PlanCode.octopus, PlanCode.whale):
        q_active = await db.execute(
            select(UserPlan).where(
                and_(
                    UserPlan.user_id == uid,
                    UserPlan.status == PlanStatus.active,
                    # expires_at NULL ise (ör. clam) aktif sayılır; ücretli plan alırken onu da sonlandırmak isteyebilirsin.
                    # Burada: SÜRESİ GEÇMEMİŞ olanları iptal ediyoruz (NULL veya gelecekte).
                    (UserPlan.expires_at.is_(None)) | (UserPlan.expires_at > now),
                )
            )
        )
        current_active = q_active.scalars().all()
        for row in current_active:
            row.status = PlanStatus.canceled
            row.canceled_at = now
            row.updated_at = now

    # Yeni planın tarihleri
    started_at = now
    expires_at = None
    if code in (PlanCode.octopus, PlanCode.whale):
        expires_at = now + relativedelta(months=months)

    new_plan = UserPlan(
        user_id=uid,
        plan_code=code,
        status=PlanStatus.active,
        started_at=started_at,
        expires_at=expires_at,
        auto_renew=auto_renew,
        notes=notes,
    )

    db.add(new_plan)
    await db.commit()
    await db.refresh(new_plan)

    return {
        "message": "Plan satın alma kaydı oluşturuldu.",
        "plan": {
            "id": new_plan.id,
            "user_id": new_plan.user_id,
            "plan_code": new_plan.plan_code.value,
            "status": new_plan.status.value,
            "started_at": new_plan.started_at,
            "expires_at": new_plan.expires_at,
            "auto_renew": new_plan.auto_renew,
            "notes": new_plan.notes,
        },
    }


@router.get("/plans/me")
async def my_plan(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token),
):
    uid = int(user_id)
    now = datetime.now(timezone.utc)

    # En güncel/aktif plan (süresi geçmemiş veya expires_at NULL)
    result = await db.execute(
        select(UserPlan)
        .where(
            and_(
                UserPlan.user_id == uid,
                UserPlan.status == PlanStatus.active,
                (UserPlan.expires_at.is_(None)) | (UserPlan.expires_at > now),
            )
        )
        .order_by(UserPlan.started_at.desc())
        .limit(1)
    )
    plan = result.scalars().first()

    if not plan:
        # Hiç plan yoksa otomatik olarak ücretsiz plan varsayıyoruz (opsiyonel)
        return {
            "has_plan": False,
            "plan_code": "clam",
            "status": "active",
            "started_at": None,
            "expires_at": None,
            "days_left": None,
            "auto_renew": False,
        }

    # kalan gün hesabı
    days_left = None
    if plan.expires_at:
        delta = plan.expires_at - now
        days_left = max(0, round(delta.total_seconds() / 86400))

    return {
        "has_plan": True,
        "plan_code": plan.plan_code.value,
        "status": plan.status.value,
        "started_at": plan.started_at,
        "expires_at": plan.expires_at,
        "days_left": days_left,
        "auto_renew": plan.auto_renew,
        "notes": plan.notes,
    }
