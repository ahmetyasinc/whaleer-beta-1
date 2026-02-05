import requests
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import verify_token
from app.models.profile.binance_coins import BinanceCoin
from app.models.profile.binance_coins_pinned import BinanceCoinsPinned
from sqlalchemy.future import select
from app.database import get_db
from app.schemas.binance_coins.binance_coins import CoinCreate, PinCoin
from fastapi import HTTPException

protected_router = APIRouter()

@protected_router.post("/fetch-and-add-binance-coins/")
async def fetch_and_add_binance_coins(db: AsyncSession = Depends(get_db)):
    created_coins = []
    skipped_coins = []

    # 1) SPOT
    try:
        response_spot = requests.get("https://api.binance.com/api/v3/exchangeInfo")
        if response_spot.status_code == 200:
            data_spot = response_spot.json()
            symbols_spot = data_spot.get("symbols", [])
            for item in symbols_spot:
                binance_symbol = item.get("symbol")
                base_asset = item.get("baseAsset")
                # quote_asset = item.get("quoteAsset") # Kullanılmıyor

                if not binance_symbol.endswith("USDT"):
                    continue
                
                # Check existing Spot
                result = await db.execute(
                    select(BinanceCoin).where(
                        BinanceCoin.binance_symbol == binance_symbol,
                        BinanceCoin.market_type == 'spot'
                    )
                )
                existing_coin = result.scalars().first()

                if existing_coin:
                    skipped_coins.append(f"{binance_symbol} (Spot)")
                    continue

                new_coin = BinanceCoin(
                    name=base_asset,
                    symbol=base_asset,
                    binance_symbol=binance_symbol,
                    market_type='spot'
                )
                db.add(new_coin)
                created_coins.append(f"{binance_symbol} (Spot)")
    except Exception as e:
        print(f"Spot data fetch error: {e}")

    # 2) FUTURES
    try:
        response_futures = requests.get("https://fapi.binance.com/fapi/v1/exchangeInfo")
        if response_futures.status_code == 200:
            data_futures = response_futures.json()
            symbols_futures = data_futures.get("symbols", [])
            for item in symbols_futures:
                binance_symbol = item.get("symbol")
                base_asset = item.get("baseAsset")
                # qAsset = item.get("quoteAsset") 

                if not binance_symbol.endswith("USDT"):
                    continue

                # Check existing Futures
                result = await db.execute(
                    select(BinanceCoin).where(
                        BinanceCoin.binance_symbol == binance_symbol,
                        BinanceCoin.market_type == 'futures'
                    )
                )
                existing_coin = result.scalars().first()

                if existing_coin:
                    skipped_coins.append(f"{binance_symbol} (Futures)")
                    continue

                new_coin = BinanceCoin(
                    name=base_asset,
                    symbol=base_asset,
                    binance_symbol=binance_symbol,
                    market_type='futures'
                )
                db.add(new_coin)
                created_coins.append(f"{binance_symbol} (Futures)")
    except Exception as e:
        print(f"Futures data fetch error: {e}")

    await db.commit()

    return {
        "message": f"{len(created_coins)} coin eklendi.",
        "eklendi": created_coins,
        "atlananlar_sayisi": len(skipped_coins)
    }

@protected_router.get("/get-coin-list/")
async def get_coin_list(
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Kullanıcının tüm indikatörlerini JSON formatında getirir.
    Eğer bir indikatör favori olarak işaretlenmişse, 'favorite': true olarak döner.
    """

    from app.models.profile.binance_coins_pinned import BinanceCoinsPinned  # Modeli içe aktar

    # Kullanıcı için coinleri çek ve pinned olup olmadığını kontrol et
    result = await db.execute(
        select(
            BinanceCoin.id,
            BinanceCoin.name,
            BinanceCoin.symbol,
            BinanceCoin.tick_size,
            #BinanceCoin.created_at,
            BinanceCoin.binance_symbol,
            BinanceCoin.market_type,
            BinanceCoinsPinned.id.isnot(None).label("pinned")  # Eğer pinned varsa True, yoksa False döner
        )
        .outerjoin(BinanceCoinsPinned,  # LEFT JOIN işlemi
                   (BinanceCoinsPinned.coin_id == BinanceCoin.id) &
                   (BinanceCoinsPinned.user_id == int(user_id)))
    )

    coins = result.mappings().all()

    return {"coins": [dict(row) for row in coins]}

@protected_router.post("/pin-binance_coin/") 
async def pin_binance_coin(
    pin_coin_data: PinCoin,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
    ):
    """Kullanıcının favori göstergesini (indicator) kaydeder. Eğer zaten ekliyse hata döner."""

    # İlgili indikatörü getir
    result = await db.execute(select(BinanceCoin).where(BinanceCoin.id == pin_coin_data.coin_id))
    coin = result.scalars().first()

    # Eğer böyle bir indikatör yoksa hata döndür
    if not coin:
        raise HTTPException(status_code=404, detail="Böyle bir coin bulunamadı!")

    # Zaten favorilere eklenmiş mi kontrol et
    result = await db.execute(
        select(BinanceCoinsPinned)
        .where(
            BinanceCoinsPinned.user_id == int(user_id),
            BinanceCoinsPinned.coin_id == pin_coin_data.coin_id
        )
    )
    existing_favorite = result.scalars().first()

    if existing_favorite:
        raise HTTPException(status_code=400, detail="Bu coin zaten pinlenmiş!")

    # Yeni favori kaydı oluştur
    new_pinned = BinanceCoinsPinned(
        user_id=int(user_id),
        coin_id=pin_coin_data.coin_id
    )

    db.add(new_pinned)
    await db.commit()
    await db.refresh(new_pinned)

    return {"message": "Coin added to pinned successfully"}

@protected_router.delete("/unpin-binance-coin/")
async def unpin_binance_coin(
    pin_coin_data: PinCoin,
    db: AsyncSession = Depends(get_db),
    user_id: dict = Depends(verify_token)
):
    """Kullanıcının pinlediği coini kaldırır."""

    # Kullanıcının bu coini pinleyip pinlemediğini kontrol et
    result = await db.execute(
        select(BinanceCoinsPinned)
        .where(
            BinanceCoinsPinned.user_id == int(user_id),
            BinanceCoinsPinned.coin_id == pin_coin_data.coin_id
        )
    )
    pinned_coin = result.scalars().first()

    # Eğer kayıt yoksa hata döndür
    if not pinned_coin:
        raise HTTPException(status_code=404, detail="Bu coin zaten pinlenmemiş!")

    # Kayıt varsa, sil ve değişiklikleri kaydet
    await db.delete(pinned_coin)
    await db.commit()

    return {"message": "Coin removed from pinned successfully"}
