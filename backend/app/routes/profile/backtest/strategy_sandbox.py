from typing import Dict, Any, List
import pandas as pd

REQUIRED_COLS = [
    "timestamp", "open", "high", "low", "close", "volume",
    "position", "percentage", "order_type"
]
OPTIONAL_COLS = ["price", "take_profit", "stop_loss"]

class StrategySandbox:
    @staticmethod
    def run_user_code(base_df, user_code, globals_whitelist, indicator_codes=None):
        ns = dict(globals_whitelist)     # build_allowed_globals çıktısını bozma
        ns["df"] = base_df.copy()

        # 1) indikatör kodları
        for code in (indicator_codes or []):
            exec(code, ns, ns)

        # 2) strateji kodu
        exec(user_code, ns, ns)

        df_out = ns.get("df")
        if df_out is None:
            raise ValueError("User code must assign a pandas DataFrame to `df`")
        return df_out.reset_index(drop=True)


    @staticmethod
    def validate_signals(df: pd.DataFrame, allow_short_spot: bool = False) -> pd.DataFrame:
        for c in REQUIRED_COLS:
            if c not in df.columns:
                raise ValueError(f"Missing required column: {c}")

        if (df["percentage"].isna().any()) or (df["percentage"].lt(0).any()) or (df["percentage"].gt(100).any()):
            raise ValueError("percentage must be in [0,100]")

        if df["order_type"].isna().any():
            raise ValueError("order_type contains NaN")

        bad_orders = ~df["order_type"].isin(["market", "limit"])
        if bad_orders.any():
            raise ValueError("order_type must be 'market' or 'limit'")

        # limit -> price zorunlu
        if "price" not in df.columns:
            df["price"] = None
        needs_price = df["order_type"].eq("limit") & ~df["price"].notna()
        if needs_price.any():
            i = needs_price[needs_price].index[0]
            raise ValueError(f"limit order at index {i} requires 'price'")

        # spot/futures kısıtları
        pos = df["position"].astype(float)
        spot_mask = (pos.gt(0) & pos.le(1))
        fut_mask = pos.abs().ge(1)
        zero_mask = pos.eq(0)
        invalid_mask = ~(spot_mask | fut_mask | zero_mask)
        if invalid_mask.any():
            i = invalid_mask[invalid_mask].index[0]
            raise ValueError(f"Invalid position value at index {i}; allowed: 0, (0,1] or |x|>=1")

        if not allow_short_spot:
            # negatif spot kabul edilmez
            if (pos.lt(0) & pos.gt(-1)).any():
                i = (pos.lt(0) & pos.gt(-1)).idxmax()
                raise ValueError(f"negative spot-like position not allowed at index {i}")

        # opsiyonel kolonları yoksa ekle
        for c in OPTIONAL_COLS:
            if c not in df.columns:
                df[c] = None

        return df
