import asyncio
from decimal import Decimal

# Burada step_qty_control fonksiyonunu import et
from backend.trade_engine.taha_part.utils.order_final import step_qty_control  

filters = {
    "ETHUSDT": [
        {
            "trade_type": "futures",
            "step_size": 0.001,
            "min_qty": 0.001,
            "tick_size": 0.01
        }
    ]
}





filters = {
    "BTCUSDT": [
        {"trade_type": "futures", "step_size": 0.001, "min_qty": 0.001, "tick_size": 0.1}
    ],
    "ETHUSDT": [
        {"trade_type": "futures", "step_size": 0.001, "min_qty": 0.001, "tick_size": 0.01}
    ],
    "ADAUSDT": [
        {"trade_type": "futures", "step_size": 1.0, "min_qty": 1.0, "tick_size": 0.0001}
    ]
}

async def test_all():
    current_prices = {
        "BTCUSDT": 118000.5,
        "ETHUSDT": 3500.12,
        "ADAUSDT": 0.5
    }
    values = {
        "BTCUSDT": 200.0,
        "ETHUSDT": 300.0,
        "ADAUSDT": 150.0
    }
    
    for symbol in ["BTCUSDT", "ETHUSDT", "ADAUSDT"]:
        print(f"\n=== {symbol} ===")
        result = await step_qty_control(filters, symbol, "test_futures", values[symbol], current_prices[symbol])
        print("🔍 Test Sonucu:", result)

if __name__ == "__main__":
    asyncio.run(test_all())

async def test_step_qty():
    value = 300.0      # dolar bazlı emir
    current_price = 3500.124566
    result = await step_qty_control(filters, "ETHUSDT", "test_futures", value, current_price)
    print("🔍 Test Sonucu:", result)

if __name__ == "__main__":
    asyncio.run(test_all())
