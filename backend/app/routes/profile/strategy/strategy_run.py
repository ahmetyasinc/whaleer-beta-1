from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import verify_token
from app.models.profile.binance_data import BinanceData
from app.models.profile.strategy.strategy import Strategy
from app.models.profile.indicator.indicator import Indicator
from sqlalchemy.future import select
from app.database import get_db
from app.routes.profile.strategy.run_user_strategy import run_updated_user_strategy, run_user_strategy
from app.schemas.strategy.strategy import StrategyRun
from app.schemas.strategy.strategy import UpdatedStrategyRun
from sqlalchemy import text
import time
from sqlalchemy.future import select
import asyncio
from sqlalchemy import select, and_, or_


protected_router = APIRouter()

@protected_router.post("/api/run-strategy/")
async def run_strategy(
    strategy_data: StrategyRun,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Gönderilen strategy_id, coin_id, interval ve end değerlerine göre binance_data tablosundan veri çeker, stratejiyi doğrular ve çalıştırır."""

    start_time = time.time()
    current_user_id = int(user_id)

    # 🎯 1. Stratejiyi çek
    strategy_result = await db.execute(select(Strategy).where(Strategy.id == strategy_data.strategy_id))
    strategy = strategy_result.scalars().first()

    if not strategy:
        raise HTTPException(status_code=404, detail="Strateji bulunamadı.")

    # 🎯 4. Kullanıcının erişebileceği indikatörleri çek
    stmt = select(Indicator.id, Indicator.code).where(
    and_(
        Indicator.id.in_(strategy.indicator_ids or []),
        or_(
            Indicator.user_id == current_user_id,
            Indicator.public.is_(True),
            Indicator.tecnic.is_(True)
            )
        )
    )

    result = await db.execute(stmt)
    indicators = result.all()

    # İzin verilen indikatörlerin kodlarını liste olarak al
    indicator_codes = [row[1] for row in indicators]

    query = text("""
        SELECT * FROM (
            SELECT * FROM public.binance_data
            WHERE coin_id = :coin_id
            AND "interval" = :interval
            AND timestamp <= :end_time
            ORDER BY timestamp DESC
            LIMIT 5000
        ) AS subquery
        ORDER BY timestamp ASC;
    """)

    result = await db.execute(query, {
        "coin_id": strategy_data.binance_symbol,
        "interval": strategy_data.interval,
        "end_time": strategy_data.end
    })
    rows = result.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No data found for the given parameters.")

    # **4️⃣ Çekilen veriyi JSON formatına çevir**
    historical_data = [
        {
            "timestamp": row.timestamp,
            "open": row.open,
            "high": row.high,
            "low": row.low,
            "close": row.close,
            "volume": row.volume,
        }
        for row in rows
    ]

    # **5️⃣ Kullanıcının strateji kodunu çalıştır**
    strategy_result, strategy_graph, print_outputs, inputs = await run_user_strategy(strategy.name, strategy.code, historical_data, indicator_codes)

    end_time = time.time()  # Fonksiyon bitişindeki zaman damgası
    execution_time = end_time - start_time  # Çalışma süresi hesaplanıyor

    return {"strategy_id": strategy.id, "execution_time": execution_time, "strategy_name": strategy.name , "strategy_result": strategy_result, "strategy_graph": strategy_graph, "prints": print_outputs, "inputs": inputs}



@protected_router.post("/api/run-updated-strategy/")
async def run_updated_strategy(
    strategy_data: UpdatedStrategyRun,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Gönderilen strategy_id, coin_id, interval ve end değerlerine göre binance_data tablosundan veri çeker, stratejiyi doğrular ve çalıştırır."""

    start_time = time.time()
    current_user_id = int(user_id)

    # 🎯 1. Stratejiyi çek
    strategy_result = await db.execute(select(Strategy).where(Strategy.id == strategy_data.strategy_id))
    strategy = strategy_result.scalars().first()

    if not strategy:
        raise HTTPException(status_code=404, detail="Strateji bulunamadı.")


    # 🎯 4. Kullanıcının erişebileceği indikatörleri çek
    stmt = select(Indicator.id, Indicator.code).where(
        and_(
            Indicator.id.in_(strategy.indicator_ids or []),
            or_(
                Indicator.user_id == current_user_id,
                Indicator.public.is_(True),
                Indicator.tecnic.is_(True)
            )
        )
    )

    result = await db.execute(stmt)
    indicators = result.all()

    # İzin verilen indikatörlerin kodlarını liste olarak al
    indicator_codes = [row[1] for row in indicators]


    query = text("""
        SELECT * FROM (
            SELECT * FROM public.binance_data
            WHERE coin_id = :coin_id
            AND "interval" = :interval
            AND timestamp <= :end_time
            ORDER BY timestamp DESC
            LIMIT 5000
        ) AS subquery
        ORDER BY timestamp ASC;
    """)

    result = await db.execute(query, {
        "coin_id": strategy_data.binance_symbol,
        "interval": strategy_data.interval,
        "end_time": strategy_data.end
    })
    rows = result.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No data found for the given parameters.")

    # **4️⃣ Çekilen veriyi JSON formatına çevir**
    historical_data = [
        {
            "timestamp": row.timestamp,
            "open": row.open,
            "high": row.high,
            "low": row.low,
            "close": row.close,
            "volume": row.volume,
        }
        for row in rows
    ]

    # **5️⃣ Kullanıcının strateji kodunu çalıştır**
    strategy_result, strategy_graph, print_outputs = await run_updated_user_strategy(strategy.name, strategy.code, historical_data, indicator_codes, strategy_data.inputs)

    end_time = time.time()  # Fonksiyon bitişindeki zaman damgası
    execution_time = end_time - start_time  # Çalışma süresi hesaplanıyor

    return {"strategy_id": strategy.id, "execution_time": execution_time, "strategy_name": strategy.name, "strategy_result": strategy_result, "strategy_graph": strategy_graph, "prints": print_outputs}