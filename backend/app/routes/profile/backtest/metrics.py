import pandas as pd

def basic_metrics(equity: pd.Series) -> dict:
    eq = equity
    ret = eq.pct_change().fillna(0.0)
    out = {
        "final_balance": float(eq.iloc[-1]),
        "return_pct": float((eq.iloc[-1] / eq.iloc[0] - 1.0) * 100.0),
        "max_drawdown_pct": float((eq / eq.cummax() - 1.0).min() * 100.0),
        "sharpe": float((ret.mean() / (ret.std() + 1e-12)) * (len(ret) ** 0.5)),
        "volatility_pct": float(ret.std() * (len(ret) ** 0.5) * 100.0),
    }
    return out
