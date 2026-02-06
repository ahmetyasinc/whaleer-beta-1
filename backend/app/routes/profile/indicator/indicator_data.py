from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import verify_token
from app.database import get_db


protected_router = APIRouter()

@protected_router.get("/get-binance-data/")
async def get_binance_data(
    symbol: str, 
    interval: str, 
    market_type: str = "spot", 
    db: AsyncSession = Depends(get_db), 
    user_id: dict = Depends(verify_token)
):
    """Veritabanından belirtilen sembol ve zaman aralığındaki son 5000 veriyi JSON olarak getirir."""
    
    # Tablo ismini belirle
    table_name = "public.binance_futures" if market_type == "futures" else "public.binance_data"

    query = text(f"""
        SELECT jsonb_agg(jsonb_build_object(
            'timestamp', timestamp,
            'open', open,
            'high', high,
            'low', low,
            'close', close,
            'volume', volume
        )) AS data
        FROM (
            SELECT * FROM (
                SELECT timestamp, open, high, low, close, volume
                FROM {table_name}
                WHERE coin_id = :symbol 
                  AND interval = :interval
                ORDER BY timestamp DESC
                LIMIT 5000
            ) sub
            ORDER BY timestamp ASC
        ) t;
    """)

    result = await db.execute(query, {"symbol": symbol, "interval": interval})
    json_data = result.fetchone()[0]  # ✅ Fazladan listeyi kaldır

    # Eğer veri None (boş) gelirse, boş bir liste döndür
    if json_data is None:
        json_data = []

    return {"status": "success", "data": json_data}

