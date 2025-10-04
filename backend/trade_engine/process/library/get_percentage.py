# get_percentage.py
from decimal import Decimal, InvalidOperation
from sqlalchemy import text
from backend.trade_engine.config import get_engine


def get_percentage(bot_id: int) -> float:
    """
    bots.fullness ve bots.current_usd_value alanlarından
    (fullness / current_usd_value) * 100 hesaplar.
    Hata / veri yoksa 0.0 döndürür.
    """
    try:
        eng = get_engine()
        with eng.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT fullness, current_usd_value
                    FROM bots
                    WHERE id = :id
                    LIMIT 1
                    """
                ),
                {"id": bot_id},
            ).mappings().first()

        if not row:
            return 0.0

        fullness = row.get("fullness")
        current = row.get("current_usd_value")

        try:
            fullness_dec = Decimal(str(fullness)) if fullness is not None else Decimal("0")
        except (InvalidOperation, ValueError, TypeError):
            fullness_dec = Decimal("0")

        try:
            current_dec = Decimal(str(current)) if current is not None else Decimal("0")
        except (InvalidOperation, ValueError, TypeError):
            current_dec = Decimal("0")

        if current_dec <= 0:
            return 0.0

        pct = (fullness_dec / current_dec) * Decimal("100")
        print("Percentage:", pct)
        return float(pct)

    except Exception:
        return 0.0