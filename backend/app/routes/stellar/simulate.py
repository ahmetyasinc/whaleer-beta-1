from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal
import random

from app.database import get_db
from app.core.auth import verify_token
from app.models.profile.bots.bots import Bots

router = APIRouter(prefix="/stellar", tags=["stellar-market"])


@router.post("/simulate-daily-results")
async def simulate_daily_bots(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    """
    Kullanıcının satın alınmış ya da kiralanmış tüm botları için bir günlük
    simülasyon çalıştırır ve sonuçları veri tabanına uygular.

    - Eğer botun `api_id` değeri boş ise 30 değerini girer.
    - Eğer botun `initial_usd_value` değeri boş ise
      `initial_usd_value`, `current_usd_value` ve `maximum_usd_value` için 100 değerini girer.
    - Eğer botun eksik verisi yok ise:
        - -10 ile +10 arasında rastgele bir kar yüzdesi üretir.
        - Bu yüzdelik karı `current_usd_value` üzerinden hesaplar
          ve sonucu tekrar `current_usd_value` alanına yazar.
        - Eğer yeni `current_usd_value`, `maximum_usd_value`'dan büyükse,
          `maximum_usd_value` da güncellenir.
    """

    try:
      uid = int(user_id)
    except (TypeError, ValueError):
      raise HTTPException(status_code=400, detail="Invalid user id")

    # Kullanıcının satın aldığı veya kiraladığı, silinmemiş botlar
    result = await db.execute(
        select(Bots).where(
            Bots.user_id == uid,
            Bots.deleted.is_(False),
            Bots.acquisition_type.in_(["PURCHASED", "RENTED"]),
        )
    )
    bots = result.scalars().all()

    if not bots:
        # İstersen 404 yerine boş liste de dönebilirdin; tercih meselesi.
        raise HTTPException(status_code=404, detail="Simüle edilecek bot bulunamadı.")

    updated_summary = []

    for bot in bots:
        changed = False

        # 1) api_id boşsa 30 yap
        if bot.api_id is None:
            bot.api_id = 30
            changed = True

        # 2) initial_usd_value boşsa hepsini 100 yap
        if bot.initial_usd_value is None:
            base = Decimal("100")
            bot.initial_usd_value = base
            bot.current_usd_value = base
            bot.maximum_usd_value = base
            changed = True
        else:
            # current veya maximum eksikse minimumda toparla
            if bot.current_usd_value is None:
                bot.current_usd_value = bot.initial_usd_value
                changed = True

            if bot.maximum_usd_value is None:
                bot.maximum_usd_value = bot.current_usd_value
                changed = True

            # 3) Eksik veri artık yoksa: random günlük PnL uygula
            # -10 ile +10 arasında random yüzde (2 ondalık)
            pct = Decimal(str(round(random.uniform(-2, 10), 2)))

            base_val = bot.current_usd_value
            delta = (base_val * pct) / Decimal("100")
            new_current = base_val + delta

            bot.current_usd_value = new_current

            changed = True

        if changed:
            updated_summary.append(
                {
                    "id": bot.id,
                    "api_id": bot.api_id,
                    "initial_usd_value": str(bot.initial_usd_value)
                    if bot.initial_usd_value is not None
                    else None,
                    "current_usd_value": str(bot.current_usd_value)
                    if bot.current_usd_value is not None
                    else None,
                    "maximum_usd_value": str(bot.maximum_usd_value)
                    if bot.maximum_usd_value is not None
                    else None,
                }
            )
        
        print(f"Bot ID {bot.id} için simülasyon tamamlandı.")
        print("summary:", updated_summary)

    await db.commit()

    return {
        "message": "Günlük simülasyon tamamlandı.",
        "updated_count": len(updated_summary),
        "bots": updated_summary,
    }
