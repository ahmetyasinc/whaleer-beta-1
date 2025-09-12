from typing import Optional, List
from asyncpg.pool import Pool


# Bu fonksiyonları stream_key_db.py dosyanıza ekleyin/güncelleyin

from asyncpg.pool import Pool # Gerekliyse import edin

async def update_key_sub_id_and_status(pool: Pool, api_id: int, sub_id: int, new_status: str):
    """
    Bir anahtarın sub_id'sini ve durumunu, connection_type'a bakmadan günceller.
    """
    query = """
        UPDATE public.stream_keys
        SET sub_id = $2, status = $3
        WHERE api_id = $1;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, api_id, sub_id, new_status)

async def update_status_by_api_id(pool: Pool, api_id: int, new_status: str):
    """
    Belirtilen api_id için bir anahtarın durumunu, connection_type'a bakmadan günceller.
    """
    query = """
        UPDATE public.stream_keys
        SET status = $2
        WHERE api_id = $1;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, api_id, new_status)

async def set_key_as_closed(pool: Pool, api_id: int):
    """
    Bir anahtarın durumunu 'closed' olarak ayarlar ve sub_id'sini NULL yapar.
    Abonelikten çıkıldıktan sonra kullanılır, connection_type'a bakmaz.
    """
    query = """
        UPDATE public.stream_keys
        SET status = 'closed', sub_id = NULL
        WHERE api_id = $1;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, api_id)

        
async def get_all_keys(pool):
    """
    Veritabanından 'connection_type' filtresi olmadan tüm stream anahtarlarını çeker.
    """
    async with pool.acquire() as connection:
        # connection_type'a göre filtreleme yapmadan tüm kayıtları seç
        query = "SELECT api_id, user_id, status  FROM stream_keys"
        records = await connection.fetch(query)
        return [dict(record) for record in records]
    
async def get_api_credentials(pool, api_id: int):
    """
    Verilen bir api_id için kimlik bilgileri olan api_key, api_secret ve
    user_id'yi veritabanından çeker. Bu işlem için stream_keys ve api_keys
    tablolarını birleştirir.
    """
    async with pool.acquire() as connection:
        # Hata: api_key ve api_secret, stream_keys'de değil, api_keys tablosundadır.
        # Düzeltme: İki tabloyu JOIN ile birleştirerek doğru veriyi al.
        query = """
            SELECT
                ak.api_key,
                ak.api_secret,
                sk.user_id
            FROM
                public.stream_keys sk
            JOIN
                public.api_keys ak ON sk.api_id = ak.id
            WHERE
                sk.api_id = $1
        """
        
        record = await connection.fetchrow(query, api_id)
        
        return dict(record) if record else None
    
async def attach_listenkeys_to_ws(pool, ws_id: int, listenkeys: list):
    """
    Verilen listenKey'leri ws_id'ye bağla ve status='active' yap.
    """
    if not listenkeys:
        return

    query = """
        UPDATE public.stream_keys
        SET ws_id = $1,
            status = 'active'
        WHERE stream_key = ANY($2::text[]);
    """
    async with pool.acquire() as conn:
        await conn.execute(query, ws_id, listenkeys)

        
async def get_active_and_new_listenkeys(pool: Pool, connection_type: str = "futures") -> List[str]:
    """
    DB'den active veya new durumundaki listenKey'leri döner.
    """
    query = """
        SELECT stream_key
        FROM public.stream_keys
        WHERE connection_type = $1
          AND status IN ('active', 'new');
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, connection_type)
    return [r["stream_key"] for r in rows]


# 1. Aktif stream_key ve ilgili api_key’i getir
async def get_stream_key_and_api_key(
    pool: Pool,
    api_id: int,
    connection_type: str
) -> Optional[dict]:
    query = """
        SELECT sk.stream_key, ak.api_key
        FROM public.stream_keys sk
        JOIN public.api_keys ak ON ak.id = sk.api_id
        WHERE sk.api_id = $1
          AND sk.connection_type = $2
          AND sk.status = 'active'
        LIMIT 1;
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, api_id, connection_type)
        return dict(row) if row else None


# 2. Var olan stream_key'i güncelle / ekle
async def upsert_stream_key(
    pool: Pool,
    user_id: int,
    api_id: int,
    connection_type: str,
    stream_key: str,
    status: str = "new"
) -> None:
    query = """
        INSERT INTO public.stream_keys (
            user_id,
            api_id,
            connection_type,
            stream_key,
            stream_key_expires_at,
            status
        )
        VALUES (
            $1, $2, $3, $4,
            NOW() + INTERVAL '60 minutes',
            $5
        )
        ON CONFLICT (api_id, connection_type)
        DO UPDATE SET
            stream_key = EXCLUDED.stream_key,
            stream_key_expires_at = EXCLUDED.stream_key_expires_at,
            status = EXCLUDED.status;
    """
    async with pool.acquire() as conn:
        await conn.execute(
            query,
            user_id,
            api_id,
            connection_type,
            stream_key,
            status
        )


# 3. Expiration süresini yenile (tekli)
async def refresh_stream_key_expiration(
    pool: Pool,
    api_id: int,
    connection_type: str
) -> None:
    query = """
        UPDATE public.stream_keys
        SET stream_key_expires_at = NOW() + INTERVAL '60 minutes'
        WHERE api_id = $1
          AND connection_type = $2
          AND status IN ('active', 'new');
    """
    async with pool.acquire() as conn:
        await conn.execute(query, api_id, connection_type)



# 4. Tek stream_key’in status’unu güncelle
async def update_streamkey_status(pool: Pool, streamkey_id: int, new_status: str) -> None:
    query = """
        UPDATE public.stream_keys
        SET status = $2
        WHERE id = $1;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, streamkey_id, new_status)

# 5. Toplu expiration yenileme
async def bulk_refresh_stream_keys(
    pool: Pool,
    api_ids: List[int],
    connection_type: str
) -> None:
    query = """
        UPDATE public.stream_keys
        SET stream_key_expires_at = NOW() + INTERVAL '60 minutes'
        WHERE connection_type = $1
          AND api_id = ANY($2::int[])
          AND status IN ('active', 'new');
    """
    async with pool.acquire() as conn:
        await conn.execute(query, connection_type, api_ids)

# 6. Toplu upsert (birden fazla listenKey’i tek seferde ekle/güncelle)
async def bulk_upsert_stream_keys(
    pool: Pool,
    records: List[dict]
) -> None:
    """
    records örneği:
    [
      {"user_id": 1, "api_id": 10, "connection_type": "futures", "stream_key": "abc", "status": "active"},
      {"user_id": 2, "api_id": 11, "connection_type": "futures", "stream_key": "def", "status": "new"}
    ]
    """
    if not records:
        return

    query = f"""
        INSERT INTO public.stream_keys (
            user_id,
            api_id,
            connection_type,
            stream_key,
            stream_key_expires_at,
            status
        )
        VALUES
            {",".join(
                f"({r['user_id']}, {r['api_id']}, '{r['connection_type']}', '{r['stream_key']}', NOW() + INTERVAL '60 minutes', '{r.get('status', 'new')}')"
                for r in records
            )}
        ON CONFLICT (api_id, connection_type)
        DO UPDATE SET
            stream_key = EXCLUDED.stream_key,
            stream_key_expires_at = EXCLUDED.stream_key_expires_at,
            status = EXCLUDED.status;
    """

    async with pool.acquire() as conn:
        await conn.execute(query)

# stream_key_db.py

async def get_active_and_new_listenkeys(pool: Pool, connection_type: str = "futures") -> List[str]:
    """
    DB'den active veya new durumundaki listenKey'leri döner.
    """
    query = """
        SELECT stream_key
        FROM public.stream_keys
        WHERE connection_type = $1
          AND status IN ('active', 'new');
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, connection_type)
    return [r["stream_key"] for r in rows]

# stream_key_db.py dosyanıza eklenecek

async def get_keys_by_type(pool: Pool, connection_type: str) -> List[dict]:
    """
    Belirtilen connection_type'a ve 'active' veya 'new' durumuna sahip
    tüm anahtar bilgilerini getirir.
    Servisin başlangıçta durumunu yüklemesi için kullanılır.
    """
    query = """
        SELECT
            sk.api_id,
            sk.user_id,
            sk.sub_id
        FROM
            public.stream_keys sk
        WHERE
            sk.connection_type = $1 AND sk.status IN ('active', 'new');
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, connection_type)
        return [dict(r) for r in rows]
    
# stream_key_db.py dosyanıza eklenecek

async def set_key_as_closed(pool: Pool, api_id: int, connection_type: str):
    """
    Bir anahtarın durumunu 'closed' olarak ayarlar ve sub_id'sini NULL yapar.
    Abonelikten başarıyla çıkıldıktan sonra kullanılır.
    """
    query = """
        UPDATE public.stream_keys
        SET status = 'closed', sub_id = NULL
        WHERE api_id = $1 AND connection_type = $2;
    """
    async with pool.acquire() as conn:
        await conn.execute(query, api_id, connection_type)