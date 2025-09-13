# app/routes/profile/strategy/strategy_library/get_percentage.py
import numpy as np
import pandas as pd
from typing import Optional, Union

def get_percentage(series: Optional[Union[pd.Series, list]] = None, default: float = 0.0) -> float:
    """
    'percentage' sütunundaki SON anlamlı (NaN/inf değil) değeri döndürür.
    - series: pd.Series veya list (örn. df['percentage'])
    - default: geçerli değer bulunamazsa döndürülecek sayı
    """
    if series is None:
        return float(default)

    # Series'e çevir ve numerik hale getir (geçersizleri NaN yap)
    s = pd.Series(series)
    s = pd.to_numeric(s, errors="coerce")

    # inf/-inf -> NaN, sonra NaN'ları at
    s = s.replace([np.inf, -np.inf], np.nan).dropna()

    if s.empty:
        return float(default)

    # Son elemanı al
    try:
        return float(s.iloc[-1])
    except Exception:
        return float(default)
