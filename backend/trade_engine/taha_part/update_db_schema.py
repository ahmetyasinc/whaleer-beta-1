import psycopg2

def fetch_db_schema():
    """
    PostgreSQL veritabanındaki tablo ve sütun bilgilerini alır ve db_schema.txt dosyasına kaydeder.
    """
    connection = psycopg2.connect(
        dbname="balina_db",
        user="postgres",
        password="admin",
        host="localhost",
        port="5432"
    )
    cursor = connection.cursor()

    query = """
    SELECT 
        table_schema,
        table_name, 
        column_name, 
        data_type 
    FROM 
        information_schema.columns 
    WHERE 
        table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY 
        table_schema,
        table_name, 
        ordinal_position;
    """

    cursor.execute(query)
    schema_info = cursor.fetchall()

    with open("db_schema_new.txt", "w", encoding="utf-8") as file:
        current_table = None
        current_schema = None
        for schema, table_name, column_name, data_type in schema_info:
            table_id = f"{schema}.{table_name}"
            if table_id != current_table:
                if current_table is not None:
                    file.write("\n")
                file.write(f"## {table_id}\n")
                current_table = table_id
            file.write(f"- {column_name} ({data_type})\n")

    cursor.close()
    connection.close()

if __name__ == "__main__":
    fetch_db_schema()
    print("✅ Veritabanı şeması başarıyla db_schema.txt dosyasına kaydedildi.")
