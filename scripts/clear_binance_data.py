import psycopg2
import os
from dotenv import load_dotenv

# Load .env from project root
# Assuming script is in c:\dev\whaleer\scripts, and .env is in c:\dev\whaleer\.env
# Adapting path as needed.
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Fallback values if load_dotenv fails or env vars missing (just to be safe based on what I saw)
DB_HOST = os.getenv("PGHOST", "db.ndouquvsbcmdodujsvlb.supabase.co")
DB_NAME = os.getenv("PGDATABASE", "postgres")
DB_USER = os.getenv("PGUSER", "postgres")
DB_PASS = os.getenv("PGPASSWORD", "F8LLW3RcHhIh7e3L")
DB_PORT = os.getenv("PGPORT", "5432")

def clear_table():
    try:
        print(f"Connecting to database {DB_HOST}...")
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT
        )
        conn.autocommit = True
        cur = conn.cursor()

        print("Checking row count before deletion...")
        cur.execute("SELECT count(*) FROM binance_data;")
        count_before = cur.fetchone()[0]
        print(f"Current row count: {count_before}")

        print("Truncating table 'binance_data'...")
        cur.execute("TRUNCATE TABLE binance_data;")
        
        print("Checking row count after deletion...")
        cur.execute("SELECT count(*) FROM binance_data;")
        count_after = cur.fetchone()[0]
        print(f"New row count: {count_after}")

        cur.close()
        conn.close()
        print("Successfully cleared binance_data table.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clear_table()
