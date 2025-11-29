from dataclasses import dataclass
from typing import List, Optional, Literal
import pandas as pd

OrderSide = Literal["buy", "sell"]

@dataclass
class PlannedOrder:
    idx: int
    side: OrderSide
    order_type: Literal["market", "limit"]
    requested_price: Optional[float]
    target_used_pct: float  # 0..1
    leverage: float
    reason: str  # OPEN/SCALE_IN/SCALE_OUT/CLOSE/FLIP_*

class OrderPlanner:
    @staticmethod
    def plan(df: pd.DataFrame, scaleout_policy: str) -> List[PlannedOrder]:
        orders: List[PlannedOrder] = []
        cur_used = 0.0
        cur_dir = 0
        for i, row in df.iterrows():
            target_used = float(row["used_pct"]) if row["direction"] != 0 else 0.0
            target_dir = int(row["direction"])  # -1,0,1
            order_type = row["order_type"]
            req_price = float(row["price"]) if ("price" in row and pd.notna(row["price"])) else None
            lev = float(row["leverage"]) if pd.notna(row["leverage"]) else 1.0

            if (cur_dir != 0) and (target_dir != 0) and (cur_dir != target_dir):
                orders.append(PlannedOrder(i, "sell" if cur_dir==1 else "buy", order_type, req_price, 0.0, lev, "FLIP_CLOSE"))
                orders.append(PlannedOrder(i, "buy" if target_dir==1 else "sell", order_type, req_price, target_used, lev, "FLIP_OPEN"))
                cur_used = target_used
                cur_dir = target_dir
                continue

            if target_dir == 0 and cur_dir != 0:
                orders.append(PlannedOrder(i, "sell" if cur_dir==1 else "buy", order_type, req_price, 0.0, lev, "CLOSE"))
                cur_used = 0.0
                cur_dir = 0
                continue

            if target_dir == cur_dir:
                if target_used > cur_used + 1e-12:
                    orders.append(PlannedOrder(i, "buy" if target_dir==1 else "sell", order_type, req_price, target_used, lev, "SCALE_IN"))
                elif target_used < cur_used - 1e-12:
                    orders.append(PlannedOrder(i, "sell" if target_dir==1 else "buy", order_type, req_price, target_used, lev, "SCALE_OUT"))
            else:
                if target_dir != 0 and cur_dir == 0 and target_used > 0:
                    orders.append(PlannedOrder(i, "buy" if target_dir==1 else "sell", order_type, req_price, target_used, lev, "OPEN"))
                    cur_dir = target_dir

            cur_used = target_used
        return orders
