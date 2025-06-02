from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import verify_token
from app.database import get_db
from pydantic import BaseModel
from app.routes.profile.backtest.backtest_service import run_backtest_logic


protected_router = APIRouter()

class BacktestRequest(BaseModel):
    strategy: int
    period: str
    crypto: str

@protected_router.post("/api/run-backtest/")
async def run_backtest(
    payload: BacktestRequest,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    return await run_backtest_logic(
        strategy_id=payload.strategy,
        period=payload.period,
        crypto=payload.crypto,
        user_id=int(user_id),
        db=db
    )