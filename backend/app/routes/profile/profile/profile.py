from datetime import datetime, timedelta, timezone

from typing import List, Dict, Any,Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.auth import verify_token
from app.models import User
from pydantic import BaseModel
from typing import Dict, List, Any, DefaultDict, Tuple
from collections import defaultdict
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile.bots.bots import Bots
from app.models.profile.bots.bot_positions import BotPositions
from app.models.profile.bots.bot_holdings import BotHoldings
from app.models.profile.bots.bot_trades import BotTrades

from app.models.profile.api_keys.api_keys import APIKey
from app.models.profile.api_keys.api_snapshots import ApiSnapshot

from app.models.profile.indicator.indicator import Indicator
from app.models.profile.strategy.strategy import Strategy
from app.models.profile.strategy.strategy_releases import StrategyRelease, ReleaseStatus
from app.models.profile.indicator.indicator_releases import IndicatorRelease, IndicatorReleaseStatus


protected_router = APIRouter()

def _to_float(v):
    if isinstance(v, Decimal):
        return float(v)
    return v

def merge_by_symbol(
    rows: List[Any],
    symbol_attr: str = "symbol",
    amount_attr: str = "amount",
    avg_cost_attr: str = "average_cost",
    extra_sum_attrs: Tuple[str, ...] = ("profit_loss",),   # toplama tabi alanlar
    # futures için long/short karışmasın istersek anahtar genişletilebilir:
    side_attr: str | None = None,       # örn. "position_side" (None => dikkate alma)
    leverage_attr: str | None = "leverage"  # ortalama alınır (ağırlıksız)
) -> List[Dict[str, Any]]:
    """
    Aynı sembolleri birleştirir:
      - amount: toplam
      - average_cost: amount'a göre ağırlıklı ortalama
      - extra_sum_attrs: toplam
      - leverage_attr: basit ortalama (ihtiyaca göre güncelleyebilirsiniz)
    """
    buckets: Dict[Tuple[str, str | None], Dict[str, Any]] = {}

    for r in rows:
        key = getattr(r, symbol_attr)
        side = getattr(r, side_attr) if side_attr else None
        bkey = (key, side)
        if bkey not in buckets:
            buckets[bkey] = {
                "symbol": key,
                **({"position_side": side} if side_attr else {}),
                "amount": Decimal("0"),
                "avg_cost_weighted_sum": Decimal("0"),
                "avg_cost": Decimal("0"),
                "_leverage_acc": Decimal("0"),
                "_leverage_cnt": 0,
            }
            for extra in extra_sum_attrs:
                buckets[bkey][extra] = Decimal("0")

        amount = Decimal(str(getattr(r, amount_attr) or 0))
        avg_cost = Decimal(str(getattr(r, avg_cost_attr) or 0))
        buckets[bkey]["amount"] += amount
        buckets[bkey]["avg_cost_weighted_sum"] += amount * avg_cost

        for extra in extra_sum_attrs:
            buckets[bkey][extra] += Decimal(str(getattr(r, extra) or 0))

        if leverage_attr:
            lev = getattr(r, leverage_attr, None)
            if lev is not None:
                buckets[bkey]["_leverage_acc"] += Decimal(str(lev))
                buckets[bkey]["_leverage_cnt"] += 1

    merged = []
    for (_, _), v in buckets.items():
        total_amt = v["amount"]
        avg_cost = (v["avg_cost_weighted_sum"] / total_amt) if total_amt else Decimal("0")
        out = {
            "symbol": v["symbol"],
            **({"position_side": v["position_side"]} if "position_side" in v else {}),
            "amount": _to_float(total_amt),
            "average_cost": _to_float(avg_cost),
        }
        for k, val in list(v.items()):
            if k in ("symbol", "amount", "avg_cost_weighted_sum", "avg_cost",
                     "_leverage_acc", "_leverage_cnt", "position_side"):
                continue
            out[k] = _to_float(val)

        if v["_leverage_cnt"] > 0:
            out["leverage"] = _to_float(v["_leverage_acc"] / v["_leverage_cnt"])

        merged.append(out)
    return merged

def _pct_change(cur, init):
    cur = _to_float(cur)
    init = _to_float(init)
    if init is None or init == 0:
        return None
    return (cur - init) / init * 100.0

# ÜSTTEKİ İMPORTLARA EKLE
from app.models.profile.indicator.indicator import Indicator
from app.models.profile.indicator.indicator_releases import (
    IndicatorRelease,
    IndicatorReleaseStatus as IReleaseStatus,
)

@protected_router.get("/api/profile")
async def get_profile_all_datas(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(verify_token)
):
    # 1) Kullanıcı
    user = await db.scalar(select(User).where(User.id == int(user_id)))
    if not user:
        return {"ok": False, "error": "User not found"}

    user_dict = {
        "id": user.id,
        "name": getattr(user, "name", None),
        "last_name": getattr(user, "last_name", None),
        "username": getattr(user, "username", None),
        "email": getattr(user, "email", None),
        "location": getattr(user, "location", None),
        "is_active": getattr(user, "is_active", None),
        "is_verified": getattr(user, "is_verified", None),
        "created_at": getattr(user, "created_at", None),
        "updated_at": getattr(user, "updated_at", None),
        "total_followers": getattr(user, "total_followers", None),
    }

    # 2) API key'ler
    api_keys = (await db.scalars(
        select(APIKey).where(APIKey.user_id == int(user_id))
    )).all()
    api_ids = [a.id for a in api_keys] or [-1]

    # 3) Snapshot'lar
    snap_rows = (await db.execute(
        select(ApiSnapshot.api_id, ApiSnapshot.timestamp, ApiSnapshot.usd_value)
        .where(ApiSnapshot.api_id.in_(api_ids))
        .order_by(ApiSnapshot.api_id, ApiSnapshot.timestamp)
    )).all()
    snapshots_by_api: DefaultDict[int, List[Dict[str, Any]]] = defaultdict(list)
    for api_id, ts, usd in snap_rows:
        snapshots_by_api[api_id].append({"timestamp": ts, "usd_value": _to_float(usd)})

    # 4) Botlar
    bots = (await db.scalars(
        select(Bots).where(Bots.api_id.in_(api_ids), Bots.deleted.is_(False))
    )).all()
    bot_ids = [b.id for b in bots] or [-1]

    # 5) Holdings / Positions / Trades
    holding_rows = (await db.scalars(
        select(BotHoldings).where(BotHoldings.bot_id.in_(bot_ids))
    )).all()
    position_rows = (await db.scalars(
        select(BotPositions).where(BotPositions.bot_id.in_(bot_ids))
    )).all()
    trade_rows = (await db.scalars(
        select(BotTrades).where(BotTrades.bot_id.in_(bot_ids)).order_by(BotTrades.created_at)
    )).all()

    holdings_by_bot: DefaultDict[int, List[BotHoldings]] = defaultdict(list)
    for r in holding_rows:
        holdings_by_bot[r.bot_id].append(r)

    positions_by_bot: DefaultDict[int, List[BotPositions]] = defaultdict(list)
    for r in position_rows:
        positions_by_bot[r.bot_id].append(r)

    trades_by_bot: DefaultDict[int, List[BotTrades]] = defaultdict(list)
    for r in trade_rows:
        trades_by_bot[r.bot_id].append(r)

    # 6) Indicator & Strategy
    indicators = (await db.scalars(
        select(Indicator).where(Indicator.user_id == int(user_id)).order_by(Indicator.created_at.desc())
    )).all()
    strategies = (await db.scalars(
        select(Strategy).where(Strategy.user_id == int(user_id)).order_by(Strategy.created_at.desc())
    )).all()

    # --- YENİ: İndikatörler için son approved ve son pending release + izinler ---
    indicator_ids = [it.id for it in indicators] or [-1]

    # Son approved indicator release
    rn_i_approved = func.row_number().over(
        partition_by=IndicatorRelease.indicator_id,
        order_by=IndicatorRelease.release_no.desc()
    )
    subq_i_approved = (
        select(
            IndicatorRelease.indicator_id.label("iid"),
            IndicatorRelease.id.label("release_id"),
            IndicatorRelease.release_no,
            IndicatorRelease.views_count,
            IndicatorRelease.allow_code_view,
            IndicatorRelease.allow_chart_view,
            rn_i_approved.label("rn"),
        )
        .where(
            IndicatorRelease.indicator_id.in_(indicator_ids),
            IndicatorRelease.status == IReleaseStatus.approved
        )
        .subquery()
    )
    latest_i_approved_rows = await db.execute(
        select(
            subq_i_approved.c.iid,
            subq_i_approved.c.release_id,
            subq_i_approved.c.release_no,
            subq_i_approved.c.views_count,
            subq_i_approved.c.allow_code_view,
            subq_i_approved.c.allow_chart_view,
        ).where(subq_i_approved.c.rn == 1)
    )
    i_approved_map: Dict[int, Dict[str, Any]] = {}
    for row in latest_i_approved_rows.all():
        iid, rid, rno, vcnt, a_code, a_chart = row
        i_approved_map[int(iid)] = {
            "id": int(rid),
            "no": int(rno),
            "status": "approved",
            "views_count": int(vcnt or 0),
            "permissions": {
                "allow_code_view": bool(a_code),
                "allow_chart_view": bool(a_chart),
            },
        }

    # Son pending indicator release
    rn_i_pending = func.row_number().over(
        partition_by=IndicatorRelease.indicator_id,
        order_by=IndicatorRelease.release_no.desc()
    )
    subq_i_pending = (
        select(
            IndicatorRelease.indicator_id.label("iid"),
            IndicatorRelease.id.label("release_id"),
            IndicatorRelease.release_no,
            IndicatorRelease.allow_code_view,
            IndicatorRelease.allow_chart_view,
            rn_i_pending.label("rn"),
        )
        .where(
            IndicatorRelease.indicator_id.in_(indicator_ids),
            IndicatorRelease.status == IReleaseStatus.pending
        )
        .subquery()
    )
    latest_i_pending_rows = await db.execute(
        select(
            subq_i_pending.c.iid,
            subq_i_pending.c.release_id,
            subq_i_pending.c.release_no,
            subq_i_pending.c.allow_code_view,
            subq_i_pending.c.allow_chart_view,
        ).where(subq_i_pending.c.rn == 1)
    )
    i_pending_map: Dict[int, Dict[str, Any]] = {}
    for row in latest_i_pending_rows.all():
        iid, rid, rno, a_code, a_chart = row
        i_pending_map[int(iid)] = {
            "id": int(rid),
            "no": int(rno),
            "status": "pending",
            "permissions": {
                "allow_code_view": bool(a_code),
                "allow_chart_view": bool(a_chart),
            },
        }

    # --- Stratejiler için son approved ve pending release (MEVCUT KODUN) ---
    strategy_ids = [s.id for s in strategies] or [-1]

    rn_approved = func.row_number().over(
        partition_by=StrategyRelease.strategy_id,
        order_by=StrategyRelease.release_no.desc()
    )
    subq_approved = (
        select(
            StrategyRelease.strategy_id.label("sid"),
            StrategyRelease.id.label("release_id"),
            StrategyRelease.release_no,
            StrategyRelease.views_count,
            StrategyRelease.allow_code_view,
            StrategyRelease.allow_chart_view,
            StrategyRelease.allow_scanning,
            StrategyRelease.allow_backtesting,
            StrategyRelease.allow_bot_execution,
            rn_approved.label("rn"),
        )
        .where(
            StrategyRelease.strategy_id.in_(strategy_ids),
            StrategyRelease.status == ReleaseStatus.approved
        )
        .subquery()
    )
    latest_approved_rows = await db.execute(
        select(
            subq_approved.c.sid,
            subq_approved.c.release_id,
            subq_approved.c.release_no,
            subq_approved.c.views_count,
            subq_approved.c.allow_code_view,
            subq_approved.c.allow_chart_view,
            subq_approved.c.allow_scanning,
            subq_approved.c.allow_backtesting,
            subq_approved.c.allow_bot_execution,
        ).where(subq_approved.c.rn == 1)
    )
    approved_map: Dict[int, Dict[str, Any]] = {}
    for row in latest_approved_rows.all():
        sid, rid, rno, vcnt, a1, a2, a3, a4, a5 = row
        approved_map[int(sid)] = {
            "id": int(rid),
            "no": int(rno),
            "status": "approved",
            "views_count": int(vcnt or 0),
            "permissions": {
                "allow_code_view": bool(a1),
                "allow_chart_view": bool(a2),
                "allow_scanning": bool(a3),
                "allow_backtesting": bool(a4),
                "allow_bot_execution": bool(a5),
            },
        }

    rn_pending = func.row_number().over(
        partition_by=StrategyRelease.strategy_id,
        order_by=StrategyRelease.release_no.desc()
    )
    subq_pending = (
        select(
            StrategyRelease.strategy_id.label("sid"),
            StrategyRelease.id.label("release_id"),
            StrategyRelease.release_no,
            StrategyRelease.allow_code_view,
            StrategyRelease.allow_chart_view,
            StrategyRelease.allow_scanning,
            StrategyRelease.allow_backtesting,
            StrategyRelease.allow_bot_execution,
            rn_pending.label("rn"),
        )
        .where(
            StrategyRelease.strategy_id.in_(strategy_ids),
            StrategyRelease.status == ReleaseStatus.pending
        )
        .subquery()
    )
    latest_pending_rows = await db.execute(
        select(
            subq_pending.c.sid,
            subq_pending.c.release_id,
            subq_pending.c.release_no,
            subq_pending.c.allow_code_view,
            subq_pending.c.allow_chart_view,
            subq_pending.c.allow_scanning,
            subq_pending.c.allow_backtesting,
            subq_pending.c.allow_bot_execution,
        ).where(subq_pending.c.rn == 1)
    )
    pending_map: Dict[int, Dict[str, Any]] = {}
    for row in latest_pending_rows.all():
        sid, rid, rno, a1, a2, a3, a4, a5 = row
        pending_map[int(sid)] = {
            "id": int(rid),
            "no": int(rno),
            "status": "pending",
            "permissions": {
                "allow_code_view": bool(a1),
                "allow_chart_view": bool(a2),
                "allow_scanning": bool(a3),
                "allow_backtesting": bool(a4),
                "allow_bot_execution": bool(a5),
            },
        }

    # 7) API payload
    apis_payload = []
    for api in api_keys:
        api_bots = [b for b in bots if b.api_id == api.id]

        bots_payload = []
        for b in api_bots:
            cur = getattr(b, "current_usd_value", None)
            init = getattr(b, "initial_usd_value", None)
            active = getattr(b, "active", None)
            profit_usd = None
            if cur is not None and init is not None:
                profit_usd = _to_float(cur) - _to_float(init)
            profit_pct = _pct_change(cur, init)

            bots_payload.append({
                "bot": {
                    "id": b.id,
                    "name": getattr(b, "name", None),
                    "api_id": b.api_id,
                    "created_at": getattr(b, "created_at", None),
                    "active": active,
                    "initial_usd_value": _to_float(init),
                    "current_usd_value": _to_float(cur),
                    "profit_usd": _to_float(profit_usd) if profit_usd is not None else None,
                    "profit_percent": _to_float(profit_pct) if profit_pct is not None else None,
                }
            })

        api_hold_rows: List[BotHoldings] = []
        api_pos_rows: List[BotPositions] = []
        api_trade_rows: List[BotTrades] = []
        for b in api_bots:
            api_hold_rows.extend(holdings_by_bot.get(b.id, []))
            api_pos_rows.extend(positions_by_bot.get(b.id, []))
            api_trade_rows.extend(trades_by_bot.get(b.id, []))

        portfolio_holdings_merged = merge_by_symbol(
            api_hold_rows,
            symbol_attr="symbol",
            amount_attr="amount",
            avg_cost_attr="average_cost",
            extra_sum_attrs=("profit_loss", "percentage"),
            side_attr=None,
            leverage_attr=None
        )
        portfolio_positions_merged = merge_by_symbol(
            api_pos_rows,
            symbol_attr="symbol",
            amount_attr="amount",
            avg_cost_attr="average_cost",
            extra_sum_attrs=("profit_loss",),
            side_attr="position_side",
            leverage_attr="leverage"
        )

        api_trades = [{
            "id": t.id,
            "bot_id": t.bot_id,
            "created_at": t.created_at,
            "symbol": t.symbol,
            "side": t.side,
            "position_side": getattr(t, "position_side", None),
            "trade_type": t.trade_type,
            "price": _to_float(t.price),
            "amount": _to_float(t.amount),
            "fee": _to_float(t.fee),
            "leverage": getattr(t, "leverage", None),
            "status": t.status,
            "order_id": getattr(t, "order_id", None),
        } for t in sorted(api_trade_rows, key=lambda x: x.created_at or 0)]

        apis_payload.append({
            "api": {
                "id": api.id,
                "exchange": api.exchange,
                "api_name": api.api_name,
                "is_test_api": api.is_test_api,
                "created_at": api.created_at,
                "default": getattr(api, "default", None),
                "spot_balance": _to_float(getattr(api, "spot_balance", 0)),
                "futures_balance": _to_float(getattr(api, "futures_balance", 0)),
            },
            "snapshots": snapshots_by_api.get(api.id, []),
            "bots": bots_payload,
            "portfolio": {
                "holdings_merged": portfolio_holdings_merged,
                "positions_merged": portfolio_positions_merged,
            },
            "trades": api_trades,
        })

    # 8) STRATEGY & INDICATOR payload’ları (release’lerle zenginleştirilmiş)
    strategies_payload = [{
        "id": s.id,
        "name": getattr(s, "name", None),
        "code": getattr(s, "code", None),
        "version": getattr(s, "version", None),
        "parent_strategy_id": getattr(s, "parent_strategy_id", None),
        "created_at": getattr(s, "created_at", None),
        "description": getattr(s, "description", None),
        "approved_release": approved_map.get(s.id),  # 👈 son onaylı
        "pending_release":  pending_map.get(s.id),   # 👈 son bekleyen
    } for s in strategies]

    indicators_payload = [{
        "id": it.id,
        "name": getattr(it, "name", None),
        "code": getattr(it, "code", None),
        "version": getattr(it, "version", None),
        "parent_indicator_id": getattr(it, "parent_indicator_id", None),
        "created_at": getattr(it, "created_at", None),
        "description": getattr(it, "description", None),
        "approved_release": i_approved_map.get(it.id),  # 👈 son onaylı
        "pending_release":  i_pending_map.get(it.id),   # 👈 son bekleyen
    } for it in indicators]

    # 9) RESPONSE
    return {
        "ok": True,
        "user": user_dict,
        "apis": apis_payload,
        "strategies": strategies_payload,
        "indicators": indicators_payload,
    }

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

class ApiSnapshotsRequest(BaseModel):
    api_id: int

@protected_router.post("/api/api_snapshots")
async def get_user_snapshots(
    payload: ApiSnapshotsRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    api_id = payload.api_id

    result = await db.execute(
        select(ApiSnapshot.timestamp, ApiSnapshot.usd_value)
        .where(ApiSnapshot.api_id == api_id)
        .order_by(ApiSnapshot.timestamp.asc())
    )
    rows = result.mappings().all()

    return [
        {
            "timestamp": r["timestamp"],          
            "usd_value": float(r["usd_value"]),   
        }
        for r in rows
    ]

