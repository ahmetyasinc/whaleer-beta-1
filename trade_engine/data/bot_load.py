# backend/trade_engine/data/bot_features_schedule.py
from psycopg2.extras import RealDictCursor
from trade_engine.config import psycopg2_connection
from datetime import datetime, timezone

DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

def _ensure_rent_expiry_closed_defaults(conn):
    """
    RENTED olup süresi geçmiş ve rent_expiry_closed NULL olan botları FALSE yapar.
    Dönüş: güncellenen id listesi
    """
    sql_update = """
        UPDATE public.bots
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
    # context manager commit etmeyebilir; açıkça commit edelim:
    try:
        conn.commit()
    except Exception:
        pass
    return [r["id"] for r in rows]

def load_active_bots(interval):
    """
    Şunları döndürür:
      - active = TRUE
      - period = interval
      - deleted != TRUE
      - acquisition_type = 'RENTED' ise rent_expires_at > NOW()
      - (YENİ) Şu an UTC'ye göre active_days ve active_hours penceresi içindeyse
    """
    sql = """
        SELECT
            id, user_id, strategy_id, api_id, period, stocks, active, candle_count, enter_on_start, bot_type,
            acquisition_type, rent_expires_at,
            active_days, active_hours
        FROM public.bots
        WHERE active = TRUE
          AND period = %s
          AND NOT COALESCE(deleted, FALSE)
          AND (
                acquisition_type IS DISTINCT FROM 'RENTED'
                OR (rent_expires_at IS NOT NULL AND rent_expires_at > NOW())
              );
    """

    def _parse_stocks(val):
        # PostgreSQL text[] -> psycopg2 list döndürebilir; string gelirse {} içinden ayıkla
        if isinstance(val, list):
            return val
        if isinstance(val, str):
            s = val.strip().strip("{}")
            if not s:
                return []
            parts = [x.strip().strip('"').strip("'") for x in s.split(",")]
            return [p for p in parts if p]
        return []

    def _now_utc_minutes():
        now = datetime.now(timezone.utc)
        return now, now.hour * 60 + now.minute  # 0..1439

    def _parse_time_to_minutes(hhmm):
        # "24:00" desteği -> 1440 dk
        hh, mm = hhmm.split(":")
        h, m = int(hh), int(mm)
        if h == 24 and m == 0:
            return 1440
        return h * 60 + m

    def _parse_hours_ranges(s):
        """
        "09:00-12:00,13:30-18:00" -> [(540,720), (810,1080)]
        Boş/None -> tam gün [(0, 1440)]
        """
        if not s or not str(s).strip():
            return [(0, 1440)]
        ranges = []
        for part in str(s).split(","):
            part = part.strip()
            if not part:
                continue
            if "-" not in part:
                # tek saat verilmişse => 1 dk’lık aralık
                start = _parse_time_to_minutes(part)
                end = min(start + 1, 1440)
            else:
                a, b = part.split("-", 1)
                start = _parse_time_to_minutes(a.strip())
                end = _parse_time_to_minutes(b.strip())
            # normalize
            start = max(0, min(start, 1440))
            end = max(0, min(end, 1440))
            ranges.append((start, end))
        return ranges or [(0, 1440)]

    def _is_within_hours(ranges, minute_of_day):
        """
        Gece aşımı destekli.
        (start <= end): start <= t < end
        (start > end): t >= start veya t < end   (örn. 22:00-02:00)
        """
        for start, end in ranges:
            if start == end:
                continue  # boş aralık
            if start < end:
                if start <= minute_of_day < end:
                    return True
            else:
                # midnight wrap
                if minute_of_day >= start or minute_of_day < end:
                    return True
        return False

    def _is_within_schedule(active_days, active_hours, now_dt_utc, minute_of_day):
        # Gün kontrolü (Mon..Sun). active_days boş/None ise gün kısıtı yok.
        day_ok = True
        if active_days:
            days = active_days if isinstance(active_days, list) else _parse_stocks(active_days)
            today = DAY_NAMES[now_dt_utc.weekday()]  # 0=Mon
            day_ok = today in set(days)

        # Saat kontrolü
        ranges = _parse_hours_ranges(active_hours)
        time_ok = _is_within_hours(ranges, minute_of_day)

        return day_ok and time_ok

    try:
        with psycopg2_connection() as conn:
            # 1) Botları çek
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(sql, (interval,))
                bots = cursor.fetchall() or []

            # 2) Süresi geçmiş RENTED & rent_expiry_closed NULL olanları FALSE yap
            updated_ids = _ensure_rent_expiry_closed_defaults(conn)
            if updated_ids:
                print(f"rent_expiry_closed = FALSE yapılan botlar: {updated_ids}")

        # 3) Zaman penceresine göre filtrele (UTC)
        now_dt_utc, minute_of_day = _now_utc_minutes()
        filtered = []
        for bot in bots:
            bot["stocks"] = _parse_stocks(bot.get("stocks"))
            if _is_within_schedule(
                bot.get("active_days"),
                bot.get("active_hours"),
                now_dt_utc,
                minute_of_day,
            ):
                filtered.append(bot)

        return filtered

    except Exception as e:
        print(f"Veritabanı hatası: {e}")
        return []
