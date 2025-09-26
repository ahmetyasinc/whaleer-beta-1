# backend/trade_engine/data/indicators_loader.py
from typing import List, Dict, Any
from sqlalchemy import text, bindparam, Integer
from sqlalchemy.dialects.postgresql import ARRAY
from backend.trade_engine.config import get_engine

def _parse_pg_array_text(val: str) -> List[int]:
    """
    Postgres array text ('{1,2,3}' veya '1,2,3') -> [1,2,3]
    """
    if not val:
        return []
    s = val.strip()
    if s.startswith("{") and s.endswith("}"):
        s = s[1:-1]
    if not s:
        return []
    return [int(x.strip().strip('"').strip("'")) for x in s.split(",") if x.strip()]

def load_indicators(strategy_id: int) -> List[Dict[str, Any]]:
    try:
        eng = get_engine()
        with eng.connect() as conn:
            # 1) strategy_id'ye göre indicator_ids al
            row = conn.execute(
                text("SELECT indicator_ids FROM public.strategies WHERE id = :sid"),
                {"sid": strategy_id}
            ).fetchone()

            if not row:
                return []

            indicator_ids = row._mapping.get("indicator_ids")

            # 2) indicator_ids normalize: list[int] haline getir
            if indicator_ids is None:
                return []

            if isinstance(indicator_ids, list):
                ids: List[int] = [int(x) for x in indicator_ids if x is not None]
            elif isinstance(indicator_ids, str):
                ids = _parse_pg_array_text(indicator_ids)
            else:
                # Farklı bir tip dönerse ihtiyatlı ol
                try:
                    ids = [int(x) for x in indicator_ids]
                except Exception:
                    ids = []

            if not ids:
                return []

            # 3) indicators tablosundan verileri çek
            stmt = (
                text("""
                    SELECT id, name, code
                    FROM public.indicators
                    WHERE id = ANY(:ids)
                """)
                # ANY(:ids) için Postgres ARRAY(int) tipini belirt
                .bindparams(bindparam("ids", type_=ARRAY(Integer)))
            )

            rows = conn.execute(stmt, {"ids": ids}).fetchall()
            return [dict(r._mapping) for r in rows]

    except Exception as e:
        print(f"Veritabanı hatası: {e}")
        return []
