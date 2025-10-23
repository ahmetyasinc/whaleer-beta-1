from typing import List, Optional
from dataclasses import dataclass
import pandas as pd

@dataclass
class FillResult:
    idx: int
    filled: bool
    fill_price: Optional[float]

class FillEngine:
    @staticmethod
    def _market_fill_idx_and_price(df: pd.DataFrame, i: int, execution_mode: str) -> tuple[int, Optional[float]]:
        if execution_mode == "next_open":
            if i + 1 < len(df):
                return i + 1, float(df.loc[i+1, "open"])  # bir sonraki barın open'ı
            else:
                return i + 1, None  # sonraki bar yok → dolmaz
        else:  # same_bar_close
            if i < len(df):
                return i, float(df.loc[i, "close"])
            else:
                return i, None

    @staticmethod
    def _limit_filled(df: pd.DataFrame, i: int, side: str, limit_price: float) -> bool:
        bar_low = float(df.loc[i, "low"])
        bar_high = float(df.loc[i, "high"])
        if side == "buy":
            return bar_low <= limit_price
        else:
            return bar_high >= limit_price

    @staticmethod
    def fill(df: pd.DataFrame, planned_orders, execution_mode: str, tif: str):
        fills: List[FillResult] = []
        gtc_queue = []  # ileri geliştirme için

        for po in planned_orders:
            if po.order_type == "market":
                fill_idx, fp = FillEngine._market_fill_idx_and_price(df, po.idx, execution_mode)
                fills.append(FillResult(fill_idx, fp is not None, fp))

            else:  # limit
                price = float(po.requested_price) if po.requested_price is not None else None
                if price is None:
                    fills.append(FillResult(po.idx, False, None))
                    continue

                if FillEngine._limit_filled(df, po.idx, po.side, price):
                    fills.append(FillResult(po.idx, True, price))
                else:
                    if tif == "IOC":
                        fills.append(FillResult(po.idx, False, None))
                    else:
                        # minimal GTC: bir sonraki barda bir kez daha dene
                        if po.idx + 1 < len(df) and FillEngine._limit_filled(df, po.idx+1, po.side, price):
                            fills.append(FillResult(po.idx+1, True, price))
                        else:
                            fills.append(FillResult(po.idx, False, None))

        return fills
