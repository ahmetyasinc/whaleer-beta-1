from datetime import datetime, timedelta, timezone

from typing import List, Dict, Any,Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.auth import verify_token
from app.models import User

from app.models.profile.bots.bots import Bots
from app.models.profile.bots.bot_positions import BotPositions
from app.models.profile.bots.bot_holdings import BotHoldings
from app.models.profile.bots.bot_trades import BotTrades

from app.models.profile.profile.user_snapshots import UserSnapshot

protected_router = APIRouter()

@protected_router.get("/api/profile")
async def get_profile_all_datas(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    try:
        user_id = int(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid user id")


@protected_router.get("/api/profile_analysis")
async def get_profile_analysis(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token)  # verify_token string döndürüyor varsayımı
):
    # 1) user_id'yi int'e çevir
    try:
        user_id = int(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid user id")

    # 2) Kullanıcının bot id'lerini çek
    q_bots = await db.execute(
        select(Bots.id).where(Bots.user_id == user_id)
    )
    bot_ids = [row[0] for row in q_bots.all()]
    if not bot_ids:
        return {"portfolio": [], "transactions": []}

    # 3) bot_positions ve bot_holdings verilerini çek
    q_pos = await db.execute(
        select(
            BotPositions.symbol,
            BotPositions.amount,
            BotPositions.profit_loss,
            BotPositions.average_cost
        ).where(BotPositions.bot_id.in_(bot_ids))
    )
    q_hold = await db.execute(
        select(
            BotHoldings.symbol,
            BotHoldings.amount,
            BotHoldings.profit_loss,
            BotHoldings.average_cost
        ).where(BotHoldings.bot_id.in_(bot_ids))
    )

    # 4) Aynı symbol'leri birleştir (weighted avg cost)
    merged: Dict[str, Dict[str, float]] = {}
    for row in [*q_pos.all(), *q_hold.all()]:
        sym, amt, pl, avg_cost = row
        amt = float(amt or 0)
        pl = float(pl or 0)
        avg_cost = float(avg_cost or 0)

        entry = merged.setdefault(sym, {"amount": 0.0, "profit_loss": 0.0, "cost_weighted_sum": 0.0})
        entry["amount"] += amt
        entry["profit_loss"] += pl
        entry["cost_weighted_sum"] += avg_cost * amt

    portfolio: List[Dict[str, Any]] = []
    for sym, vals in merged.items():
        total_amt = vals["amount"]
        portfolio.append({
            "symbol": sym,
            "amount": total_amt,
            "profit_loss": vals["profit_loss"],
            "average_cost": (vals["cost_weighted_sum"] / total_amt) if total_amt > 0 else 0.0,
        })

    # 5) bot_trades'den işlemleri çek (position_side dahil)
    q_trades = await db.execute(
        select(
            BotTrades.symbol,
            BotTrades.trade_type,
            BotTrades.position_side,   # <-- eklendi
            BotTrades.side,
            BotTrades.created_at,
            BotTrades.price,
            BotTrades.amount
        )
        .where(BotTrades.bot_id.in_(bot_ids))
        .order_by(BotTrades.created_at.desc())
    )

    transactions: List[Dict[str, Any]] = []
    for sym, trade_type, position_side, side, created, price, amt in q_trades.all():
        # Futures ise type= long/short; değilse spot
        if trade_type.lower() == "futures":
            t = position_side.lower()
            type_val = t if t in ("long", "short") else "futures"
        else:
            type_val = "spot"

        transactions.append({
            "symbol": sym,
            "type": type_val,
            "direction": side,  # buy/sell (istersen açma/kapama map edebiliriz)
            "date": created.isoformat() if hasattr(created, "isoformat") else str(created),
            "price": float(price or 0),
            "amount": float(amt or 0),
        })

    # 6) JSON olarak döndür
    return {
        "portfolio": portfolio,
        "transactions": transactions
    }

@protected_router.get("/api/profile_snapshots")
async def get_user_snapshots(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    user_id = int(user_id)

    result = await db.execute(
        select(UserSnapshot.timestamp, UserSnapshot.user_usd_value)
        .where(UserSnapshot.user_id == user_id)
        .order_by(UserSnapshot.timestamp.asc())
    )

    rows = result.mappings().all()  # dict-like rows

    return [
        {
            "timestamp": r["timestamp"],              # FastAPI handles datetime
            "user_usd_value": float(r["user_usd_value"])  # cast Decimal -> float
        }
        for r in rows
    ]

