# backend/trade_engine/data/indicators.py (örnek konum)
from sqlalchemy import text, bindparam, Integer
from sqlalchemy.dialects.postgresql import ARRAY
from app.database import get_sync_engine as get_engine

def load_indicators(strategy_id):
    try:
        eng = get_engine()
        with eng.connect() as conn:
            # strategy_id'ye göre indicator_ids çek
            row = conn.execute(
                text("SELECT indicator_ids FROM strategies WHERE id = :strategy_id"),
                {"strategy_id": strategy_id}
            ).fetchone()

            if not row:
                return []

            indicator_ids = row._mapping.get("indicator_ids")

            if not indicator_ids:
                return []

            # ARRAY ise direkt kullan, değilse string'i listeye çevir
            if isinstance(indicator_ids, str):
                indicator_ids = [int(x.strip()) for x in indicator_ids.split(",") if x.strip()]

            # Güvenlik: boş listeyi erken döndür
            if not indicator_ids:
                return []

            # PostgreSQL ANY(:indicator_ids) için parametreyi ARRAY(Integer) tipinde bağla
            query = text("""
                SELECT id, name, code
                FROM indicators
                WHERE id = ANY(:indicator_ids)
            """).bindparams(
                bindparam("indicator_ids", value=indicator_ids, type_=ARRAY(Integer))
            )

            result = conn.execute(query).fetchall()

            # SQLAlchemy Row -> dict
            indicators = [dict(r._mapping) for r in result]
            return indicators

    except Exception as e:
        print(f"Veritabanı hatası: {e}")
        return []
