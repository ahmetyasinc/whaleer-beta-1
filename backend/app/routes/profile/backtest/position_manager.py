from dataclasses import dataclass
from typing import List, Optional, Literal

@dataclass
class Tranche:
    side: Literal["long", "short"]
    quantity: float
    entry_price: float
    leverage: float
    tp: float | None = None
    sl: float | None = None

class PositionManager:
    def __init__(self, scaleout_policy: str):
        self.tranches: List[Tranche] = []
        self.side: Optional[str] = None  # long/short
        self.scaleout_policy = scaleout_policy

    def total_qty(self) -> float:
        return sum(t.quantity for t in self.tranches)

    def vwap(self) -> float:
        q = self.total_qty()
        if q == 0:
            return 0.0
        return sum(t.quantity * t.entry_price for t in self.tranches) / q

    def open_or_scale(self, side: str, qty: float, price: float, lev: float, tp: float | None, sl: float | None):
        if self.side and self.side != side:
            raise ValueError("Use flip/close before opening opposite side")
        self.side = side
        self.tranches.append(Tranche(side, qty, price, lev, tp, sl))

    def scale_out(self, qty: float):
        remaining = qty
        iterable = (self.tranches if self.scaleout_policy=="FIFO" else list(reversed(self.tranches)))
        new_list: List[Tranche] = []
        for t in iterable:
            if remaining <= 0:
                new_list.append(t)
                continue
            if t.quantity > remaining:
                t.quantity -= remaining
                new_list.append(t)
                remaining = 0
            else:
                remaining -= t.quantity
                # tranche düşer
        self.tranches = (new_list if self.scaleout_policy=="FIFO" else list(reversed(new_list)))
        if self.total_qty() <= 0:
            self.side = None
    
    # Mevcut scale_out metodunun altına ekleyebilirsin
    def close_specific_tranche(self, tranche_obj: Tranche):
        """
        TP/SL durumunda FIFO/LIFO sırasına bakmaksızın
        spesifik olarak o tranche'ı listeden siler.
        """
        if tranche_obj in self.tranches:
            self.tranches.remove(tranche_obj)
            
            # Eğer hiç tranche kalmadıysa yönü (side) sıfırla
            if self.total_qty() <= 0:
                self.side = None

    def close_all(self):
        self.tranches.clear()
        self.side = None
