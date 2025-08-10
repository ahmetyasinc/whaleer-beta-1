from fastapi import HTTPException
from sqlalchemy import select
from app.models.profile.strategy.strategy import Strategy
from app.models.profile.indicator.indicator import Indicator
from app.models.profile.binance_data import BinanceData
from app.routes.profile.backtest.utils import calculate_performance
import pandas as pd

from app.services.allowed_globals.allowed_globals_indicator import allowed_globals_indicator

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

    allowed_globals = allowed_globals_indicator(df, print_outputs=None, indicator_results=None, updated=False, for_strategy=False, for_backtest=True)

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

    #print(df["position"].head())
    #print(df["percentage"].head())

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
