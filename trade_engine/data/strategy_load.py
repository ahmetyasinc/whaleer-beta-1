# backend/trade_engine/data/strategy_loader.py
from sqlalchemy import text
from trade_engine.config import get_engine  # lazy & fork-safe engine

def load_strategy(strategy_id: int):
    """
    Belirtilen strategy_id için strategies.code alanını döndürür.
    Bulunamazsa None döner.
    """
    try:
        eng = get_engine()
        with eng.connect() as conn:
            result = conn.execute(
                text("SELECT code FROM public.strategies WHERE id = :id"),
                {"id": strategy_id}
            ).scalar()

            return result  # str veya None

    except Exception as e:
        print(f"Veritabanı hatası: {e}")
        return None
