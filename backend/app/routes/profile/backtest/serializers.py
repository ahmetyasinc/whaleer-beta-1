from typing import Dict, Any
from .pnl_engine import TradeEvent

def serialize_trade(te: TradeEvent) -> Dict[str, Any]:
    return {
        "index": te.idx,
        "type": te.type,
        "side": te.side,
        "order_type": te.order_type,
        "requested_price": te.requested_price,
        "fill_price": te.fill_price,
        "leverage": te.leverage,
        "used_pct_from": te.used_pct_from,
        "used_pct_to": te.used_pct_to,
        "qty": te.qty,
        "notional": te.notional,
        "commission": te.commission,
        "pnl_amount": te.pnl_amount,
        "pnl_pct": te.pnl_pct,
    }
