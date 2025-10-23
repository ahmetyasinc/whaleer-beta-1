from typing import Optional
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Mevcut modellerini kullanıyoruz
from app.models.profile.binance_data import BinanceData
from app.models.profile.strategy.strategy import Strategy

# ----------------------------------------------------------
# MUM VERİSİ
# ----------------------------------------------------------
async def fetch_candles(
    db: AsyncSession,
    symbol: str,
    period: str,
    limit: int = 5000,
) -> pd.DataFrame:
    """
    BinanceData tablosundan OHLCV çeker.
    - symbol: senin eski akışında crypto["binance_symbol"] idi; artık doğrudan string.
    - period: "1m", "15m", "1h" vb. (BinanceData.interval)
    - limit: en yeni N adet, sonra zaman artan şekilde sıralanır.

    Dönüş: DataFrame(timestamp, open, high, low, close, volume)
    """
    stmt = (
        select(
            BinanceData.timestamp,
            BinanceData.open,
            BinanceData.high,
            BinanceData.low,
            BinanceData.close,
            BinanceData.volume,
        )
        .where(BinanceData.interval == period, BinanceData.coin_id == symbol)
        .order_by(BinanceData.timestamp.desc())
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        # Boş DF döndür; endpoint anlaşılır bir 400 üretsin
        return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])

    df = pd.DataFrame(
        rows,
        columns=["timestamp", "open", "high", "low", "close", "volume"],
    )
    # Eski düzende olduğu gibi artan sıraya çevir
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df


# ----------------------------------------------------------
# STRATEJİ VERİSİ
# ----------------------------------------------------------
async def fetch_strategy_by_id(
    db: AsyncSession,
    strategy_id: int,
) -> Optional[dict]:
    """
    Strategy tablosundan stratejiyi çeker ve motorun beklediği minimal sözlüğe çevirir.
    - Eski yapında Strategy.code içinde kullanıcı kodu vardı; onu user_code olarak döndürüyoruz.
    - İsteğe bağlı: commission / execution_mode vb. ayarları DB’de tutuyorsan buraya ekleyebilirsin.

    Dönüş:
      {
        "id": int,
        "name": str,
        "user_code": str,
        # opsiyonel ayarlar (yoksa None bırakılabilir)
        "commission": float | None,
        "execution_mode": str | None,
        "time_in_force": str | None,
        "fee_model": str | None,
        "scaleout_policy": str | None,
        "bar_path": str | None,
        "conflict_rule": str | None,
        "slippage_bps": float | None,
        "allow_short_spot": bool | None,
        "funding_rate_per_bar": float | None,
      }
    """
    stmt = select(Strategy).where(Strategy.id == strategy_id).limit(1)
    result = await db.execute(stmt)
    strategy: Strategy | None = result.scalar_one_or_none()

    if not strategy:
        return None

    # Strategy modelinde hangi alanlar varsa onlardan besle.
    # commission vb. alanlar DB’de yoksa None döndür; endpoint varsayılanları kullanır.
    out = {
        "id": strategy.id,
        "name": getattr(strategy, "name", f"strategy_{strategy_id}"),
        "user_code": getattr(strategy, "code", None),  # kullanıcı pandas kodu
        # Opsiyonel strateji ayarları (sende varsa otomatik çeker)
        "commission": getattr(strategy, "commission", None),
        "execution_mode": getattr(strategy, "execution_mode", None),
        "time_in_force": getattr(strategy, "time_in_force", None),
        "fee_model": getattr(strategy, "fee_model", None),
        "scaleout_policy": getattr(strategy, "scaleout_policy", None),
        "bar_path": getattr(strategy, "bar_path", None),
        "conflict_rule": getattr(strategy, "conflict_rule", None),
        "slippage_bps": getattr(strategy, "slippage_bps", None),
        "allow_short_spot": getattr(strategy, "allow_short_spot", None),
        "funding_rate_per_bar": getattr(strategy, "funding_rate_per_bar", None),
    }

    # Güvenlik: user_code boş ise None kabul et
    if not out["user_code"]:
        return None

    return out
