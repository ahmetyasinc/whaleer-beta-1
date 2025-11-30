from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.core.auth import verify_token

router = APIRouter(prefix="/api/stellar", tags=["stellar-market"])

@router.post("/settle-all-profits")
async def notify_db(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):