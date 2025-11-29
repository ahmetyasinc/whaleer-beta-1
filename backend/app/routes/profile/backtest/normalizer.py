import pandas as pd

class SignalNormalizer:
    """
    Spot:
      0 < position <= 1  -> direction=+1, leverage=1, used_pct = percentage * position / 100
    Futures:
      |position| >= 1    -> direction=sign(position), leverage=abs(position), used_pct = percentage / 100
    Flat:
      position == 0      -> used_pct = 0, leverage=1, direction=0
    """
    @staticmethod
    def normalize(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        pos = df["position"].astype(float)
        pct = df["percentage"].astype(float)

        direction = pos.apply(lambda x: 0 if x == 0 else (1 if x > 0 else -1))
        leverage = pos.apply(lambda x: 1.0 if 0 < x <= 1 else (abs(x) if abs(x) >= 1 else 1.0))

        used_pct = pct / 100.0
        spot_mask = (pos.gt(0) & pos.le(1))
        used_pct = used_pct.where(~spot_mask, used_pct * pos)

        df["direction"] = direction
        df["leverage"] = leverage
        df["used_pct"] = used_pct.clip(lower=0.0, upper=1.0)
        return df
