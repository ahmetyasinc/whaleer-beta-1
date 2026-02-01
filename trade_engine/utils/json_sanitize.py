# backend/trade_engine/utils/json_sanitize.py
from decimal import Decimal
import math

def _clean_val(v):
    # float
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    # Decimal
    if isinstance(v, Decimal):
        # Decimal için NaN/Inf kontrolü
        if v.is_nan() or not v.is_finite():
            return None
        return float(v)  # veya str(v) (grafik/rapor formatınıza göre)
    # dict
    if isinstance(v, dict):
        return {k: _clean_val(x) for k, x in v.items()}
    # list/tuple
    if isinstance(v, (list, tuple)):
        return [_clean_val(x) for x in v]
    return v

def sanitize_json_payload(obj):
    """JSON yazmadan önce NaN/Infinity değerleri None'a çevirir."""
    return _clean_val(obj)
