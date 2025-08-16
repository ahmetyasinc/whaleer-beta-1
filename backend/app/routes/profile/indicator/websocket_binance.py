from sqlalchemy import select
import asyncpg
import asyncio
import time
import threading
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.database import get_db
from app.models.profile.binance_coins import BinanceCoin
from app.services.binance_data.manage_data import binance_websocket
from app.services.binance_data.save_data import save_binance_data
from app.services.binance_data.get_data import get_binance_data
from sqlalchemy import text
from datetime import datetime,timedelta,timezone
import httpx

websocket_router = APIRouter()

# Veritabanı bağlantısı için global değişken
db_pool = None  
DATABASE_URL = "postgresql://postgres:admin@localhost:5432/balina_db"

# WebSocket ve Startup için kontrol değişkenleri
startup_lock = threading.Lock()
startup_called = False
websocket_task = None  # WebSocket görevini yönetmek için

class DownloadData(BaseModel):
    symbols: List[str]
    intervals: List[str]

interval_map = {
    "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800,
    "1h": 3600, "2h": 7200, "4h": 14400, "6h": 21600, "8h": 28800,
    "12h": 43200, "1d": 86400, "3d": 259200, "1w": 604800, "1M": 2592000
}


# ✅ Binance'den veri indirme ve kaydetme endpoint'i
@websocket_router.get("/api/download-binance-data/")
async def get_trades(data: DownloadData, db: AsyncSession = Depends(get_db)):
    """Binance'den belirtilen interval'lerde veri çekip veritabanına kaydeder."""
    results = []

    for symbol in data.symbols:
        for interval in data.intervals:
            candles = get_binance_data(symbol=symbol, interval=interval)

            if not candles:
                results.append({"interval": interval, "status": "error", "message": "Binance API'den veri alınamadı."})
                continue

            save_result = await save_binance_data(db, symbol, interval, candles)
            results.append({"interval": interval, "status": "success", "details": save_result})
            print(f"✅ {symbol} için {interval} interval'inde veri kaydedildi.")

    return {"symbol": symbol, "results": results}

@websocket_router.post("/api/download-all-binance-data/")
async def get_all_binance_data(intervals: List[str], db: AsyncSession = Depends(get_db)):
    """Binance_coins tablosundaki tüm coinler için belirtilen interval'lerde veri çeker ve kaydeder."""
    results = []
    try:
        # ORM objelerini çektikten sonra dict'e dönüştürüyoruz
        result = await db.execute(select(BinanceCoin))
        coins = result.scalars().all()
        coin_list = [{"symbol": coin.symbol, "binance_symbol": coin.binance_symbol} for coin in coins]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı hatası: {e}")

    if not coin_list:
        raise HTTPException(status_code=404, detail="Veritabanında coin bulunamadı!")

    total_tasks = len(coin_list) * len(intervals)
    current_task = 1  # İşlem sayacını başlat

    for coin_index, coin in enumerate(coin_list, start=1):
        symbol = coin["binance_symbol"]
        for interval_index, interval in enumerate(intervals, start=1):
            try:
                candles = get_binance_data(symbol=symbol, interval=interval)

                if not candles:
                    results.append({
                        "symbol": symbol, 
                        "interval": interval, 
                        "status": "error", 
                        "message": "Binance API'den veri alınamadı."
                    })
                    print(f"[{current_task}/{total_tasks}] ❌ {symbol} {interval}: Veri alınamadı.")
                    current_task += 1
                    continue

                save_result = await save_binance_data(db, symbol, interval, candles)
                results.append({
                    "symbol": symbol, 
                    "interval": interval, 
                    "status": "success", 
                    "details": save_result
                })
                print(f"[{current_task}/{total_tasks}] ✅ {symbol} için {interval} interval'inde veri kaydedildi.")
            except Exception as e:
                results.append({
                    "symbol": symbol, 
                    "interval": interval, 
                    "status": "error", 
                    "message": str(e)
                })
                print(f"[{current_task}/{total_tasks}] ❌ Hata oluştu: {symbol}, Interval: {interval}, Hata: {e}")
            current_task += 1  # Her denemeden sonra artır

    return {"summary": results}

@websocket_router.post("/api/fix-binance-data/")
async def fix_binance_data(data: DownloadData, db: AsyncSession = Depends(get_db)):
    logs = []

    for coin_id in data.symbols:
        for interval in data.intervals:
            step_seconds = interval_map.get(interval)
            if not step_seconds:
                logs.append(f"[SKIP] Unknown interval '{interval}'")
                continue

            # MAX timestamp al
            result = await db.execute(text("""
                SELECT MAX(timestamp) FROM binance_data 
                WHERE coin_id = :coin AND interval = :interval
            """), {"coin": coin_id, "interval": interval})
            max_ts = result.scalar()
            if not max_ts:
                logs.append(f"[WARN] No data found for {coin_id} / {interval}")
                continue

            # 5000 mumluk min_ts hesapla
            if interval == "1M":
                candle_limit = 100
            elif interval == "1w":
                candle_limit = 600
            else:
                candle_limit = 5000
            min_ts = max_ts - timedelta(seconds=step_seconds * candle_limit)

            logs.append(f"[INFO] Start from min_ts: {min_ts} to max_ts: {max_ts}")

            # min_ts’ten eski verileri sil
            result = await db.execute(text("""
                DELETE FROM binance_data 
                WHERE coin_id = :coin 
                  AND interval = :interval 
                  AND timestamp < :min_ts
            """), {"coin": coin_id, "interval": interval, "min_ts": min_ts})
            deleted = result.rowcount
            if deleted:
                logs.append(f"[CLEANUP] Deleted {deleted} old rows for {coin_id} / {interval}")

            current_ts = min_ts
            inserted_total = 0

            while current_ts < max_ts:
                # Bu timestamp var mı?
                result = await db.execute(text("""
                    SELECT 1 FROM binance_data
                    WHERE coin_id = :coin
                    AND interval = :interval
                    AND timestamp = :ts
                """), {"coin": coin_id, "interval": interval, "ts": current_ts})

                exists = result.scalar()
                if exists:
                    current_ts += timedelta(seconds=step_seconds)
                    continue

                # Eksik aralık başladı → bitiş zamanını bul (ilk var olan veri)
                next_ts = current_ts
                while next_ts < max_ts:
                    next_ts += timedelta(seconds=step_seconds)

                    result = await db.execute(text("""
                        SELECT 1 FROM binance_data
                        WHERE coin_id = :coin
                        AND interval = :interval
                        AND timestamp = :ts
                    """), {"coin": coin_id, "interval": interval, "ts": next_ts})
                    
                    if result.scalar():
                        break
                
                next_ts -= timedelta(seconds=step_seconds)

                # Binance'ten bu aralık için veri al
                start_time = int(current_ts.replace(tzinfo=timezone.utc).timestamp() * 1000)
                end_time = int(next_ts.replace(tzinfo=timezone.utc).timestamp() * 1000)
                
                logs.append(f"[DOWNLOAD] Missing range: {current_ts} → {next_ts}, {start_time} → {end_time}")

                params = {
                    "symbol": coin_id,
                    "interval": interval,
                    "startTime": start_time,
                    "endTime": end_time,
                    "limit": 1000
                }

                async with httpx.AsyncClient() as client:
                    response = await client.get("https://api.binance.com/api/v3/klines", params=params)
                    response.raise_for_status()
                    klines = response.json()

                #logs.append(f"klines: {klines}")
                inserted_count = 0
                for kline in klines:
                    ts = datetime.utcfromtimestamp(kline[0] / 1000)
                    #logs.append(f"timestamp: {ts}")
                    await db.execute(text("""
                        INSERT INTO binance_data (
                            coin_id, interval, timestamp,
                            open, high, low, close, volume
                        ) VALUES (
                            :coin_id, :interval, :timestamp,
                            :open, :high, :low, :close, :volume
                        )
                        ON CONFLICT DO NOTHING
                    """), {
                        "coin_id": coin_id,
                        "interval": interval,
                        "timestamp": ts,
                        "open": kline[1],
                        "high": kline[2],
                        "low": kline[3],
                        "close": kline[4],
                        "volume": kline[5]
                    })
                    inserted_count += 1

                await db.commit()
                logs.append(f"[INSERT] Inserted {inserted_count} rows for {coin_id} / {interval}")
                print(f"[INSERT] Inserted {inserted_count} rows for {coin_id} / {interval}")
                inserted_total += inserted_count

                # current_ts'i next_ts'e ayarla (ilk dolu veri)
                next_ts += timedelta(seconds=step_seconds)
                current_ts = next_ts

            logs.append(f"[DONE] Total inserted for {coin_id} / {interval}: {inserted_total}")

    return {"status": "completed", "log": logs}


# ✅ FastAPI başlatıldığında WebSocket'i ve veritabanı bağlantısını başlat
@websocket_router.on_event("startup")
async def startup():
    """Uygulama başladığında veritabanı bağlantı havuzunu oluştur ve WebSocket başlat."""
    global db_pool, startup_called, websocket_task

    with startup_lock:
        if startup_called:  
            print("🚫 Startup zaten çalıştırılmış, tekrar başlatılmıyor.")
            return
        startup_called = True  # Bir daha çalışmasını engelle

    print(f"🌐 WebSocket başlatılıyor... {time.time()}")

    db_pool = await asyncpg.create_pool(DATABASE_URL)

    # WebSocket'i çalıştır ve görevi sakla
    websocket_task = asyncio.create_task(run_websocket_with_reconnect())

# ✅ FastAPI kapandığında temizleme işlemleri
@websocket_router.on_event("shutdown")
async def shutdown():
    """Uygulama kapanırken WebSocket'i ve veritabanı bağlantısını kapat."""
    global db_pool, websocket_task

    if websocket_task:
        websocket_task.cancel()  # WebSocket görevini durdur
        websocket_task = None

    if db_pool:
        await db_pool.close()

# ✅ WebSocket Bağlantısını Yönet (Koparsa Yeniden Bağlan)
async def run_websocket_with_reconnect():
    """ WebSocket bağlantısı koparsa otomatik olarak tekrar bağlan """
    while True:
        try:
            print(f"🌐 * WebSocket başlatılıyor... {time.time()}")
            await binance_websocket(db_pool)
        except Exception as e:
            print(f"❌ WebSocket bağlantısı kesildi: {e}")
            print("⏳ 5 saniye sonra tekrar bağlanıyor...")
            await asyncio.sleep(5)  # 5 saniye bekleyip tekrar bağlan