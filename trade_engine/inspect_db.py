import asyncio
import asyncpg
import os
from collections import defaultdict

# =========================================================
# AYARLAR (Config dosyanızdan da çekebilirsiniz)
# =========================================================
DB_CONFIG = {
    "user": "postgres",          # Kendi kullanıcı adınız
    "password": "admin",      # Kendi şifreniz
    "database": "balina_db",  # Veritabanı adınız
    "host": "localhost",
    "port": 5432,
}

# Eğer config.py'den çekmek isterseniz üstteki kısmı silip şunu açın:
# from backend.trade_engine.config import DB_USER, DB_PASS, DB_NAME, DB_HOST, DB_PORT
# DB_CONFIG = {"user": DB_USER, "password": DB_PASS, "database": DB_NAME, "host": DB_HOST, "port": DB_PORT}

OUTPUT_FILE = "db_schema_report.txt"

class DatabaseInspector:
    def __init__(self):
        self.conn = None

    async def connect(self):
        try:
            self.conn = await asyncpg.connect(**DB_CONFIG)
            print("✅ Veritabanına bağlanıldı.")
        except Exception as e:
            print(f"❌ Bağlantı Hatası: {e}")
            exit(1)

    async def fetch_tables(self):
        query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
        """
        return [r['table_name'] for r in await self.conn.fetch(query)]

    async def fetch_columns(self, table_name):
        query = """
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
        """
        return await self.conn.fetch(query, table_name)

    async def fetch_constraints(self, table_name):
        # Primary Key ve Unique Constraint'leri çeker
        query = """
        SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public' AND tc.table_name = $1
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
        ORDER BY tc.constraint_type, tc.constraint_name;
        """
        rows = await self.conn.fetch(query, table_name)
        
        # Constraint adına göre grupla (Çoklu sütunlu unique keyler için)
        constraints = defaultdict(list)
        for r in rows:
            constraints[f"{r['constraint_type']} ({r['constraint_name']})"].append(r['column_name'])
        return constraints

    async def fetch_indexes(self, table_name):
        query = """
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = $1
        ORDER BY indexname;
        """
        return await self.conn.fetch(query, table_name)

    async def fetch_triggers(self, table_name):
        query = """
        SELECT trigger_name, action_statement, event_manipulation, action_timing
        FROM information_schema.triggers
        WHERE event_object_schema = 'public' AND event_object_table = $1;
        """
        return await self.conn.fetch(query, table_name)

    async def fetch_functions(self):
        # Sadece public şemasındaki kullanıcı fonksiyonlarını çeker
        query = """
        SELECT p.proname, pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname;
        """
        return await self.conn.fetch(query)

    async def generate_report(self):
        await self.connect()
        
        tables = await self.fetch_tables()
        functions = await self.fetch_functions()
        
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(f"VERITABANI SCHEMA RAPORU\n")
            f.write(f"==================================================\n\n")

            # 1. TABLOLAR VE DETAYLARI
            f.write(f"--- BÖLÜM 1: TABLOLAR ({len(tables)} Adet) ---\n\n")
            
            for table in tables:
                f.write(f"TABLE: {table.upper()}\n")
                f.write("-" * (len(table) + 7) + "\n")
                
                # Sütunlar
                columns = await self.fetch_columns(table)
                f.write("  [Sütunlar]\n")
                for col in columns:
                    nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                    default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                    f.write(f"    - {col['column_name']:<20} {col['data_type']:<15} {nullable}{default}\n")
                
                # Constraintler (PK & Unique)
                constraints = await self.fetch_constraints(table)
                if constraints:
                    f.write("\n  [Kısıtlamalar (PK & Unique)]\n")
                    for name, cols in constraints.items():
                        f.write(f"    - {name}: {', '.join(cols)}\n")

                # Indexler
                indexes = await self.fetch_indexes(table)
                if indexes:
                    f.write("\n  [Indexler]\n")
                    for idx in indexes:
                        # Index tanımını biraz temizleyelim
                        clean_def = idx['indexdef'].replace("CREATE INDEX ", "").replace("CREATE UNIQUE INDEX ", "(UNIQUE) ")
                        f.write(f"    - {clean_def}\n")

                # Triggerlar
                triggers = await self.fetch_triggers(table)
                if triggers:
                    f.write("\n  [Triggerlar]\n")
                    for trg in triggers:
                        f.write(f"    - {trg['trigger_name']} ({trg['action_timing']} {trg['event_manipulation']})\n")
                        f.write(f"      -> Çalıştırır: {trg['action_statement']}\n")
                
                f.write("\n" + "="*50 + "\n\n")

            # 2. FONKSİYONLAR
            f.write(f"--- BÖLÜM 2: FONKSİYONLAR ({len(functions)} Adet) ---\n\n")
            for func in functions:
                f.write(f"FUNCTION: {func['proname']}\n")
                f.write("-" * 30 + "\n")
                f.write(f"{func['definition']}\n")
                f.write("\n" + "*"*50 + "\n\n")

        await self.conn.close()
        print(f"✅ Rapor oluşturuldu: {os.path.abspath(OUTPUT_FILE)}")

if __name__ == "__main__":
    inspector = DatabaseInspector()
    asyncio.run(inspector.generate_report())