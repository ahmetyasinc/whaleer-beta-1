# get_initial_usd.py
from decimal import Decimal, InvalidOperation
from sqlalchemy import text
from backend.trade_engine.config import get_engine

def get_initial_usdt(bot_id: int) -> float:
    """
    bots.initial_usd_value alanlarından
    Hata / veri yoksa 0.0 döndürür.
    """
    try:
        eng = get_engine()
        with eng.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT initial_usd_value
                    FROM bots
                    WHERE id = :id
                    LIMIT 1
                    """
                ),
                {"id": bot_id},
            ).mappings().first()

        if not row:
            return 0.0

        initial = row.get("initial_usd_value")

        try:
            initial = Decimal(str(initial)) if initial is not None else Decimal("0")
        except (InvalidOperation, ValueError, TypeError):
            initial = Decimal("0")

        if initial <= 0:
            return 0.0

        print("Initial:", initial)
        return float(initial)

    except Exception:
        return 0.0