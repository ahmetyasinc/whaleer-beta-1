from dataclasses import dataclass

@dataclass
class TradeEvent:
    idx: int
    type: str               # OPEN/SCALE_IN/.../CLOSE/TP/SL/FLIP_...
    side: str               # buy/sell
    order_type: str
    requested_price: float | None
    fill_price: float
    leverage: float
    used_pct_from: float
    used_pct_to: float
    qty: float
    notional: float
    commission: float
    pnl_amount: float
    pnl_pct: float

class PNLEngine:
    @staticmethod
    def commission(fee_model: str, qty: float, price: float, lev: float, commission_rate: float) -> float:
        notional = qty * price
        if fee_model == "notional_based":
            notional *= max(1.0, lev)
        return abs(notional) * commission_rate

    @staticmethod
    def compute_qty(balance: float, used_pct: float, leverage: float, price: float) -> float:
        notional = balance * used_pct * leverage  # futures: kaldıraç dahil
        return notional / price
