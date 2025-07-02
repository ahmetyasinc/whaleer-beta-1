import httpx
from logger_01 import logger
from crud_01 import update_listenkey, update_listenkey_with_key
from sqlalchemy.ext.asyncio import AsyncSession
from db_01 import async_session

BINANCE_BASE_URL = "https://api.binance.com"

async def create_listenkey(api_key: str, user_id: int, session: AsyncSession, api_id: int = None, api_name: str = None) -> str:
    headers = {
        "X-MBX-APIKEY": api_key
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{BINANCE_BASE_URL}/api/v3/userDataStream", headers=headers)

        if response.status_code == 200:
            listen_key = response.json()["listenKey"]
            # DÜZELTME: Doğru fonksiyonu kullan
            await update_listenkey_with_key(api_key, user_id, listen_key, session)

            logger.info("ListenKey oluşturuldu ve DB'ye kaydedildi", extra={
                "api_id": api_id,
                "api_name": api_name,
                "user_id": user_id,
                "status_code": response.status_code,
                "listen_key": listen_key
            })
            return listen_key
        else:
            logger.error("ListenKey alınamadı", extra={
                "api_id": api_id,
                "api_name": api_name,
                "user_id": user_id,
                "status_code": response.status_code,
                "error": response.text
            })
            raise Exception(f"ListenKey alınamadı: {response.status_code} - {response.text}")
    except Exception as e:
        logger.exception("Beklenmeyen hata oluştu", extra={
            "api_id": api_id,
            "api_name": api_name,
            "user_id": user_id
        })
        raise e

async def refresh_listenkey(api_key: str, listen_key: str, user_id: int, api_id: int = None, api_name: str = None):
    headers = {
        "X-MBX-APIKEY": api_key
    }
    params = {
        "listenKey": listen_key
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(f"{BINANCE_BASE_URL}/api/v3/userDataStream", headers=headers, params=params)

        if response.status_code == 200:
            # DÜZELTME: Veritabanı güncelleme eklendi
            async with async_session() as session:
                updated = await update_listenkey(session, user_id)
                if updated:
                    logger.info("Veritabanı expire zamanı güncellendi", extra={
                        "user_id": user_id,
                        "api_id": api_id
                    })
            
            logger.info("ListenKey başarıyla yenilendi", extra={
                "api_id": api_id,
                "api_name": api_name,
                "user_id": user_id,
                "status_code": response.status_code,
                "listen_key": listen_key
            })
        else:
            logger.error("ListenKey yenileme başarısız", extra={
                "api_id": api_id,
                "api_name": api_name,
                "user_id": user_id,
                "status_code": response.status_code,
                "listen_key": listen_key,
                "error": response.text
            })
            raise Exception(f"ListenKey yenileme başarısız: {response.status_code} - {response.text}")
    except Exception as e:
        logger.exception("ListenKey yenileme sırasında hata oluştu", extra={
            "api_id": api_id,
            "api_name": api_name,
            "user_id": user_id,
            "listen_key": listen_key
        })
        raise e

async def check_listenkey_status(api_key: str, listen_key: str, api_id: int = None, api_name: str = None, user_id: int = None) -> bool:
    headers = {
        "X-MBX-APIKEY": api_key
    }
    params = {
        "listenKey": listen_key
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(f"{BINANCE_BASE_URL}/api/v3/userDataStream", headers=headers, params=params)

        is_valid = response.status_code == 200
        logger.info("ListenKey kontrol sonucu", extra={
            "api_id": api_id,
            "api_name": api_name,
            "user_id": user_id,
            "listen_key": listen_key,
            "status": "valid" if is_valid else "invalid"
        })
        return is_valid
    except Exception as e:
        logger.exception("ListenKey kontrol hatası", extra={
            "api_id": api_id,
            "api_name": api_name,
            "user_id": user_id,
            "listen_key": listen_key
        })
        return False

