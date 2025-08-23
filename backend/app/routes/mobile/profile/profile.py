from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.auth import verify_token_mobile
from app.models import User
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


@protected_router.get("/mobile/profile")
async def get_profile_all_datas(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(verify_token_mobile)
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
    bots = (await db.scalars(select(Bots).where(Bots.api_id.in_(api_ids)))).all()
    bot_ids = [b.id for b in bots] or [-1]

    # 5) Holdings / Positions / Trades (toplu)
    holding_rows = (await db.scalars(
        select(BotHoldings).where(BotHoldings.bot_id.in_(bot_ids))
    )).all()
    position_rows = (await db.scalars(
        select(BotPositions).where(BotPositions.bot_id.in_(bot_ids))
    )).all()
    trade_rows = (await db.scalars(
        select(BotTrades).where(BotTrades.bot_id.in_(bot_ids)).order_by(BotTrades.created_at)
    )).all()

    # Bot bazında grupla (ham satırlar)
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

    # 7) Cevap
    apis_payload = []
    for api in api_keys:
        # Bu API altındaki botlar
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
                    "status": getattr(b, "status", None),

                    # yeni alanlar:
                    "active": active,
                    "initial_usd_value": _to_float(init),
                    "current_usd_value": _to_float(cur),
                    "profit_usd": _to_float(profit_usd) if profit_usd is not None else None,
                    "profit_percent": _to_float(profit_pct) if profit_pct is not None else None,
                }
            })

        # --- API seviyesinde birleştirilecek ham satırlar ---
        api_hold_rows: List[BotHoldings] = []
        api_pos_rows: List[BotPositions] = []
        api_trade_rows: List[BotTrades] = []
        for b in api_bots:
            api_hold_rows.extend(holdings_by_bot.get(b.id, []))
            api_pos_rows.extend(positions_by_bot.get(b.id, []))
            api_trade_rows.extend(trades_by_bot.get(b.id, []))

        # --- Merge (tek seferde, tüm botların toplamı) ---
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

        # --- Trades (API düzeyi: tüm botların birleşimi) ---
        api_trades = [{
            "id": t.id,
            "bot_id": t.bot_id,   # <--- eklendi
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
            "bots": bots_payload,  # sadece botlar
            "portfolio": {         # tek obje altında iki merge listesi
                "holdings_merged": portfolio_holdings_merged,
                "positions_merged": portfolio_positions_merged,
            },
            "trades": api_trades,  # tüm botların birleşimi
        })

    response = {
        "ok": True,
        "user": user_dict,
        "apis": apis_payload,
        "indicators": [{
            "id": i.id,
            "name": i.name,
            "public": i.public,
            "tecnic": getattr(i, "tecnic", None),
            "created_at": i.created_at,
            "code": i.code,
        } for i in indicators],
        "strategies": [{
            "id": s.id,
            "name": s.name,
            "public": s.public,
            "tecnic": getattr(s, "tecnic", None),
            "indicator_ids": getattr(s, "indicator_ids", None),
            "created_at": s.created_at,
            "code": s.code,
        } for s in strategies],
    }
    return response
