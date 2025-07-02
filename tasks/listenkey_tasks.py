import asyncio
from crud_01 import get_all_api_keys
from listenkeys_01 import refresh_listenkey, create_listenkey, check_listenkey_status
from db_01 import async_session
from logger_01 import logger

async def manage_all_listenkeys():
    async with async_session() as session:
        all_users = await get_all_api_keys(session)

    tasks = []
    for row in all_users:
        api_id=row["api_id"]
        user_id = row["user_id"]
        api_name = row["api_name"]
        api_key = row["api_key"]
        listen_key = row["listenkey"]

        tasks.append(handle_single_user(api_id, api_key, listen_key, user_id, api_name))

    await asyncio.gather(*tasks, return_exceptions=True)


async def handle_single_user(api_id: str, api_key: str, listen_key: str, user_id: int, api_name: str):
    try:
        if listen_key:
            logger.info("ListenKey geçerli, yenileniyor", extra={
            "api_id": api_id,
            "user_id": user_id,
            "api_name": api_name,
            "listen_key": listen_key,
            "status": "refreshing"
            })

            is_valid = await check_listenkey_status(api_key, listen_key, api_id=api_id, api_name=api_name, user_id=user_id)


            if is_valid:
                logger.info("ListenKey geçerli, yenileniyor", extra={
                    "user_id": user_id,
                    "api_name": api_name,
                    "listen_key": listen_key,
                    "status": "refreshing"
                })
                await refresh_listenkey(api_key, listen_key, user_id, api_id=api_id, api_name=api_name)
                return
            else:
                logger.warning("ListenKey geçersiz, yeniden oluşturulacak", extra={
                    "user_id": user_id,
                    "api_name": api_name,
                    "listen_key": listen_key,
                    "status": "invalid"
                })

        # ListenKey yoksa veya geçersizse oluştur
        async with async_session() as session:
            new_key = await create_listenkey(api_key, user_id, session, api_id=api_id, api_name=api_name)
            logger.info("Yeni ListenKey oluşturuldu", extra={
                "user_id": user_id,
                "api_name": api_name,
                "listen_key": new_key,
                "status": "created"
            })

    except Exception as e:
        logger.exception("ListenKey yönetim hatası", extra={
            "user_id": user_id,
            "api_id": api_id,
            "api_name": api_name,
            "listen_key": listen_key,
            "status": "error"
        })
