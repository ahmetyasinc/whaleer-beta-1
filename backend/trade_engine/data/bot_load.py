import psycopg2
from psycopg2.extras import RealDictCursor
from backend.trade_engine.config import DB_CONFIG

def _ensure_rent_expiry_closed_defaults(conn):
    """
    RENTED olup süresi geçmiş ve rent_expiry_closed NULL olan botları FALSE yapar.
    Dönüş: güncellenen id listesi
    """
    sql_update = """
        UPDATE bots
        SET rent_expiry_closed = FALSE
        WHERE acquisition_type = 'RENTED'
          AND rent_expires_at IS NOT NULL
          AND rent_expires_at <= NOW()
          AND rent_expiry_closed IS NULL
        RETURNING id;
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql_update)
        rows = cur.fetchall() or []
    # 'with psycopg2.connect(...) as conn' çıkışında commit olur; yine de açıkça commit edebiliriz:
    conn.commit()
    return [r["id"] for r in rows]

def load_active_bots(interval):
    """
    Şunları döndürür:
      - active = TRUE
      - period = interval
      - deleted != TRUE
      - acquisition_type = 'RENTED' ise rent_expires_at > NOW() olmalı (aksi halde hariç)

    NOT: rent_expires_at timestamptz ise NOW() ile kıyas doğru çalışır.
    """
    sql = """
        SELECT
            id, user_id, strategy_id, api_id, period, stocks, active, candle_count, enter_on_start,
            acquisition_type, rent_expires_at
        FROM bots
        WHERE active = TRUE
          AND period = %s
          AND NOT COALESCE(deleted, FALSE)
          AND (
                acquisition_type IS DISTINCT FROM 'RENTED'
                OR (rent_expires_at IS NOT NULL AND rent_expires_at > NOW())
              );
    """

    def _parse_stocks(val):
        # PostgreSQL text[] ise zaten list olarak gelebilir; string ise {} biçiminden ayıkla
        if isinstance(val, list):
            return val
        if isinstance(val, str):
            s = val.strip().strip("{}")
            if not s:
                return []
            parts = [x.strip().strip('"').strip("'") for x in s.split(",")]
            return [p for p in parts if p]
        return []

    try:
        with psycopg2.connect(**DB_CONFIG) as conn:
            # 1) Aktif botları çek
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(sql, (interval,))
                bots = cursor.fetchall() or []

            # 2) Süresi geçmiş RENTED & rent_expiry_closed NULL olanları FALSE yap
            updated_ids = _ensure_rent_expiry_closed_defaults(conn)
            if updated_ids:
                print(f"rent_expiry_closed = FALSE yapılan botlar: {updated_ids}")

        # 3) stocks alanını normalize et
        for bot in bots:
            bot["stocks"] = _parse_stocks(bot.get("stocks"))

        return bots

    except Exception as e:
        print(f"Veritabanı hatası: {e}")
        return []
