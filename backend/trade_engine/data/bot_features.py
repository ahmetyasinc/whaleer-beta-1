import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_CONFIG

def calculate_fullness_percentage(fullness_usdt, current_usd_value):
    try:
        if not current_usd_value or current_usd_value == 0:
            return 100.0  # USD değeri yoksa %100 kabul edebilirsin
        return round((float(fullness_usdt) / float(current_usd_value)), 2)
    except Exception as e:
        print(f"Hesaplama hatası: {e}")
        return 0.0


def get_bot_percentage(bot_id):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT fullness, current_usd_value
            FROM bots
            WHERE id = %s;
        """, (bot_id,))
        
        bot = cursor.fetchone()
        cursor.close()
        conn.close()

        if not bot:
            return 0.0
        
        return calculate_fullness_percentage(bot['fullness'], bot['current_usd_value'])

    except Exception as e:
        print(f"Veritabanı hatası: {e}")
        return 0.0

def load_bot_holding(bot_id):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT bot_id, symbol, percentage
            FROM bot_holdings
            WHERE bot_id = %s;
        """, (bot_id,))

        holdings = cursor.fetchall()

        cursor.close()
        conn.close()

        return holdings

    except Exception as e:
        print(f"Veritabanı hatası (bot_holdings): {e}")
        return []

def load_bot_positions(bot_id):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Yeni tablo yapısına göre sorgu güncellendi
        cursor.execute("""
            SELECT symbol, position_side, amount, percentage
            FROM bot_positions
            WHERE bot_id = %s AND status = 'open';
        """, (bot_id,))

        positions = cursor.fetchall()
        cursor.close()
        conn.close()

        return positions

    except Exception as e:
        print(f"Veritabanı hatası (bot_positions): {e}")
        return []
    
def load_bot_value(bot_id):
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT current_usd_value
            FROM bots
            WHERE id = %s;
        """, (bot_id,))

        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result:
            return float(result['current_usd_value'])
        else:
            return 0.0  # veya None

    except Exception as e:
        print(f"Veritabanı hatası (bots): {e}")
        return 0.0
