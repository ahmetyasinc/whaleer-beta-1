from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from sqlalchemy.future import select
from typing import Any, List
from app.core.auth import verify_token
from app.database import get_db
from pydantic import BaseModel
from app.routes.profile.backtest.backtest_service import run_backtest_logic
from app.models.profile.backtest.backtest import BacktestArchive  # modeli import et


protected_router = APIRouter()

class BacktestRequest(BaseModel):
    strategy: int
    period: str
    crypto: dict

# 🧩 1. Arşiv Kaydetme
class SaveBacktestRequest(BaseModel):
    commission: float
    data: dict

@protected_router.post("/api/run-backtest/")
async def run_backtest(
    payload: BacktestRequest,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    print(payload.crypto)
    return await run_backtest_logic(
        strategy_id=payload.strategy,
        period=payload.period,
        crypto=payload.crypto,
        user_id=int(user_id),
        db=db
    )

@protected_router.post("/api/archive-backtest/")
async def save_backtest(
    payload: SaveBacktestRequest,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    new_backtest = BacktestArchive(
        user_id=int(user_id),
        commission=payload.commission,
        data=payload.data
    )
    db.add(new_backtest)
    await db.commit()
    await db.refresh(new_backtest)
    return {"message": "Backtest saved", "id": str(new_backtest.id)}


# 🧩 2. Arşiv Silme
@protected_router.delete("/api/delete-backtest/{backtest_id}")
async def delete_backtest(
    backtest_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    stmt = delete(BacktestArchive).where(
        BacktestArchive.id == backtest_id,
        BacktestArchive.user_id == int(user_id)
    )
    result = await db.execute(stmt)
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Backtest not found or unauthorized")

    return {"message": "Backtest deleted"}


# 🧩 3. Kullanıcının Tüm Arşivleri
@protected_router.get("/api/archived-backtests/", response_model=List[dict])
async def list_backtests(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    stmt = select(BacktestArchive).where(BacktestArchive.user_id == int(user_id)).order_by(BacktestArchive.created_at.desc())
    result = await db.execute(stmt)
    records = result.scalars().all()

    return [
        {
            "id": str(record.id),
            "commission": float(record.commission),
            "created_at": record.created_at.isoformat(),
            "data": record.data
        }
        for record in records
    ]

