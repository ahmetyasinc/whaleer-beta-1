# get_current_usd.py
from decimal import Decimal, InvalidOperation
from sqlalchemy import text
from trade_engine.config import get_engine

def get_current_usdt(bot_id: int) -> float:
    """
    bots.current_usd_value alanlarından
    Hata / veri yoksa 0.0 döndürür.
    """
    try:
        eng = get_engine()
        with eng.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT current_usd_value
                    FROM bots
                    WHERE id = :id
                    LIMIT 1
                    """
                ),
                {"id": bot_id},
            ).mappings().first()

        if not row:
            return 0.0

        current = row.get("current_usd_value")

        try:
            current = Decimal(str(current)) if current is not None else Decimal("0")
        except (InvalidOperation, ValueError, TypeError):
            current = Decimal("0")

        if current <= 0:
            return 0.0

        print("Current:", current)
        return float(current)

    except Exception:
        return 0.0