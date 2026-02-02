# backend/trade_engine/data/strategy_code.py (örnek konum)
from sqlalchemy import text
from app.database import get_sync_engine as get_engine

def load_strategy_code(strategy_id: int) -> str | None:
    try:
        eng = get_engine()
        with eng.connect() as conn:
            row = conn.execute(
                text("SELECT code FROM strategies WHERE id = :strategy_id"),
                {"strategy_id": strategy_id}
            ).fetchone()

            return row[0] if row else None

    except Exception as e:
        print(f"Veri çekme hatası: {e}")
        return None
