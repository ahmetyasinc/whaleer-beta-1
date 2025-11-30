from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.core.auth import verify_token

router = APIRouter(prefix="/stellar", tags=["stellar-market"])

@router.post("/settle-all-profits")
async def settle_all_profits(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    """
    Kullanıcının tüm botları için kar komisyonu tahsil mekanizmasını tetikler.
    PostgreSQL'e pg_notify mesajı gönderir.
    """
    try:
        print(f"User {user_id} requested to settle all profits.")
        # PostgreSQL pg_notify tetikle
        notify_sql = text("SELECT pg_notify('run_listenkey_refresh', 'settle_all_request');")
        await db.execute(notify_sql)
        await db.commit()

        return {
            "status": "ok",
            "message": "Komisyon tahsil mekanizması tetiklendi.",
            "user_id": user_id,
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"pg_notify error: {str(e)}")
