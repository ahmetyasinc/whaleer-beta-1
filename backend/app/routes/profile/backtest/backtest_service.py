from ast import Await
from fastapi import HTTPException
from sqlalchemy import select
from app.models.profile.strategy.strategy import Strategy
from app.models.profile.indicator.indicator import Indicator
from app.models.profile.binance_data import BinanceData
from app.routes.profile.backtest.utils import safe_import, EmptyClass, empty, calculate_performance
import numpy as np
import pandas as pd
import ta
import math
import asyncio
import time
from decimal import Decimal

async def run_backtest_logic(strategy_id: int, period: str, crypto: dict, user_id: int, db):
    # Strategy'yi çek
    strategy_obj = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            (Strategy.user_id == user_id) | (Strategy.public == True) | (Strategy.tecnic == True)
        )
    )
    strategy = strategy_obj.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found.")

    strategy_code = strategy.code
    indicator_ids = strategy.indicator_ids or []

    # Indicator kodlarını çek
    indicators = await db.execute(
        select(Indicator).where(Indicator.id.in_(indicator_ids))
    )
    indicator_codes = [ind.code for ind in indicators.scalars().all()]

    # Binance verisini çek
    result = await db.execute(
        select(
            BinanceData.timestamp,
            BinanceData.open,
            BinanceData.high,
            BinanceData.low,
            BinanceData.close,
            BinanceData.volume,
        )
        .where(BinanceData.interval == period, BinanceData.coin_id == crypto["binance_symbol"])
        .order_by(BinanceData.timestamp.desc())
        .limit(5000)
    )

    rows = result.all()
    if not rows:
        raise HTTPException(status_code=404, detail="No market data found.")

    # DataFrame oluştur (dict olarak değil, doğrudan kolon isimleriyle)
    df = pd.DataFrame(rows, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    df_data = df.copy()

    # Sadece gerekli sütunlar
    df_data_json = df_data[["timestamp", "open", "high", "low", "close"]].copy()

    # Zamanı UNIX timestamp (int, saniye) formatına çevir
    df_data_json["time"] = df_data_json["timestamp"].apply(
        lambda x: int(x.timestamp()) if hasattr(x, "timestamp") else int(pd.to_datetime(x).timestamp())
    )

    # Sıralamayı garanti altına al (çok önemli!)
    df_data_json = df_data_json.sort_values("time").reset_index(drop=True)

    # JSON'a dönüştür
    candlestick_data = df_data_json[["time", "open", "high", "low", "close"]].to_dict(orient="records")

    # allowed_globals hazırla
    allowed_globals = {
        "__builtins__": {
            "__import__": safe_import,
            "await": Await,
            "range": range,
            "len": len,
            "min": min,
            "max": max,
            "sum": sum,
            "abs": abs,
            "round": round,
            "sorted": sorted,
            "zip": zip,
            "enumerate": enumerate,
            "map": map,
            "filter": filter,
            "all": all,
            "any": any,
            "list": list,
            "dict": dict,
            "tuple": tuple,
            "set": set,
            "float": float,
            "str": str,
            "Decimal": Decimal,
            "pow": pow,
            "divmod": divmod,
            "math": {
                "ceil": math.ceil, "floor": math.floor, "fabs": math.fabs, "factorial": math.factorial,
                "exp": math.exp, "log": math.log, "log10": math.log10, "sqrt": math.sqrt,
                "sin": math.sin, "cos": math.cos, "tan": math.tan, "atan": math.atan,
                "pi": math.pi, "e": math.e
            },
            "print": lambda *args, **kwargs: empty(*args, **kwargs)
        },
        "np": np,
        "pd": pd,
        "asyncio": asyncio,
        "math": math,
        "df": df,
        "time": time,
        "ta": ta,
        "mark": lambda *args, **kwargs: empty(*args, **kwargs),
        "plot": lambda *args, **kwargs: empty(*args, **kwargs),
        "input": EmptyClass(),
    }

    # Kodları çalıştır
    for indicator_code in indicator_codes:
        try:
            exec(indicator_code, allowed_globals)
        except Exception as e:
            print(f"Indicator kodu çalıştırılırken hata oluştu: {e}")
    
    try:
        exec(strategy_code, allowed_globals)
    except Exception as e:
        print(f"Strateji kodu çalıştırılırken hata oluştu: {e}")


    # Veriyi kontrol et
    if "position" not in df.columns or "percentage" not in df.columns:
        raise HTTPException(status_code=400, detail="Strategy must output 'position' and 'percentage'.")

    # Performans hesapla
    result = calculate_performance(df, allowed_globals.get("commission", 0.0))

    return {
        "chartData": result["chartData"],
        "performance": result["performance"],
        "trades": result["trades"],
        "returns": result["returns"],
        "candles": candlestick_data,  # ✅ Mum verisi
        "commission": allowed_globals.get("commission", 0.0),
        "period": period,
        "strategy_name": strategy.name,
        "strategy_id": strategy.id,
        "code": strategy.code,
        "crypto": crypto,
    }
