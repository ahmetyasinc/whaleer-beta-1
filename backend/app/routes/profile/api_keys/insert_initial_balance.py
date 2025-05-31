from binance.client import Client
from app.models.profile.api_keys.api_keys import UserAPIBalance 
from sqlalchemy import insert
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

async def insert_initial_balances_from_binance(api_id: int, user_id: int, api_key: str, api_secret: str, db: AsyncSession):
    client = Client(api_key, api_secret)
    try:
        account_info = client.get_account()
        balances = account_info.get("balances", [])

        values = []
        for coin in balances:
            asset = coin["asset"]
            free = Decimal(coin["free"])
            if free > 0:
                symbol = f"{asset}USDT" if asset != "USDT" else "USDT"
                values.append({
                    "api_id": api_id,
                    "user_id": user_id,
                    "coin_symbol": symbol,
                    "amount": free
                })

        if values:
            stmt = insert(UserAPIBalance).values(values)
            await db.execute(stmt)
            await db.commit()

    except Exception as e:
        print(f"Binance balance fetch error: {e}")
