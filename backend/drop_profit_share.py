import sys
import os

# "app" modülünü bulabilmesi için mevcut dizini path'e ekle
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.database import get_sync_engine

def drop_columns():
    engine = get_sync_engine()
    with engine.connect() as conn:
        print("Dropping profit share columns from 'bots' table...")
        
        # is_profit_share
        try:
            conn.execute(text("ALTER TABLE bots DROP COLUMN IF EXISTS is_profit_share"))
            print("Dropped is_profit_share")
        except Exception as e:
            print(f"Error dropping is_profit_share: {e}")

        # rent_profit_share_rate
        try:
            conn.execute(text("ALTER TABLE bots DROP COLUMN IF EXISTS rent_profit_share_rate"))
            print("Dropped rent_profit_share_rate")
        except Exception as e:
            print(f"Error dropping rent_profit_share_rate: {e}")

        # sold_profit_share_rate
        try:
            conn.execute(text("ALTER TABLE bots DROP COLUMN IF EXISTS sold_profit_share_rate"))
            print("Dropped sold_profit_share_rate")
        except Exception as e:
            print(f"Error dropping sold_profit_share_rate: {e}")

        conn.commit()
        print("Done.")

if __name__ == "__main__":
    drop_columns()
