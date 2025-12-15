from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal
from sqlalchemy import text
from app.database import get_db
from app.core.auth import verify_token
from app.models.profile.bots.bots import Bots

router = APIRouter(prefix="/stellar", tags=["stellar-market"])


@router.post("/settle-all-profits")
async def settle_all_profits(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token),
):
    """
    Kullanıcının kardan komisyonlu botları için OLASI kar dağıtımını hesaplar
    ve fiş formatında JSON döner.

    - Sadece PURCHASED / RENTED ve is_profit_share = true olan botlar değerlendirilir.
    - Eğer maximum_usd_value < current_usd_value ise:
        profit_usd = current_usd_value - maximum_usd_value
        rate = acquisition_type == PURCHASED  -> sold_profit_share_rate
                acquisition_type == RENTED    -> rent_profit_share_rate
        commission_usd = profit_usd * rate / 100
        developer_share_usd = commission_usd * 0.9
        platform_share_usd  = commission_usd * 0.1
    - Değilse bu bot için kardan komisyon dağıtımı yapılmaz.
    """

    notify_sql = text("SELECT pg_notify('run_listenkey_refresh', 'settle_all_request');")
    await db.execute(notify_sql)
    await db.commit()

    # user_id parse
    try:
        uid = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid user id")

    try:
        # Kullanıcının kardan komisyonlu PURCHASED / RENTED botları
        result = await db.execute(
            select(Bots).where(
                Bots.user_id == uid,
                Bots.deleted.is_(False),
                Bots.is_profit_share.is_(True),
                Bots.acquisition_type.in_(["PURCHASED", "RENTED"]),
            )
        )
        bots = result.scalars().all()

        items = []
        total_commission_usd = Decimal("0")
        total_developer_usd = Decimal("0")
        total_platform_usd = Decimal("0")

        for bot in bots:
            acq_type = bot.acquisition_type  # "PURCHASED" ya da "RENTED"
            curr = bot.current_usd_value
            maxv = bot.maximum_usd_value

            # Basis info
            item = {
                "bot_id": bot.id,
                "bot_name": bot.name,
                "acquisition_type": acq_type,
                "is_profit_share": bool(bot.is_profit_share),
                "current_usd_value": str(curr) if curr is not None else None,
                "maximum_usd_value": str(maxv) if maxv is not None else None,
                "will_distribute": False,   # default
                "reason": "",
            }

            # Eğer değerler eksikse, dağıtım yok
            if curr is None or maxv is None:
                item["reason"] = "MISSING_VALUES"
                items.append(item)
                continue

            # High-water-mark kontrolü: sadece current > maximum ise dağıtım
            if curr <= maxv:
                item["reason"] = "NO_NEW_PROFIT_HWM_NOT_BROKEN"
                item["profit_usd"] = "0"
                item["commission_rate_pct"] = "0"
                item["commission_usd"] = "0"
                item["developer_share_usd"] = "0"
                item["platform_share_usd"] = "0"
                items.append(item)
                continue

            # Kâr: current - maximum
            profit_usd = Decimal(curr) - Decimal(maxv)

            # Oran: PURCHASED -> sold_profit_share_rate, RENTED -> rent_profit_share_rate
            if acq_type == "PURCHASED":
                rate = bot.sold_profit_share_rate or Decimal("0")
            elif acq_type == "RENTED":
                rate = bot.rent_profit_share_rate or Decimal("0")
            else:
                rate = Decimal("0")

            # Komisyon = kâr * rate / 100
            commission_usd = (profit_usd * Decimal(rate)) / Decimal("100")

            # Developer & platform payları
            developer_share_usd = (commission_usd * Decimal("0.9"))
            platform_share_usd = (commission_usd * Decimal("0.1"))

            # Toplamlar
            total_commission_usd += commission_usd
            total_developer_usd += developer_share_usd
            total_platform_usd += platform_share_usd

            item.update(
                {
                    "will_distribute": True,
                    "reason": "OK",
                    "profit_usd": str(profit_usd),
                    "commission_rate_pct": str(rate),        # örn: "15.0"
                    "commission_usd": str(commission_usd),
                    "developer_share_usd": str(developer_share_usd),
                    "platform_share_usd": str(platform_share_usd),
                }
            )

            items.append(item)

        # DB'de değişiklik yok; commit gerekmez.
        print(f"User ID {uid} için settle_all_profits simülasyonu tamamlandı.")
        print("summary:", {
            "total_bots_checked": len(bots),
            "total_commission_usd": str(total_commission_usd),
            "total_developer_share_usd": str(total_developer_usd),
            "total_platform_share_usd": str(total_platform_usd),
        }   )


        return {
            "status": "ok",
            "message": "Olası kardan komisyon dağıtımı simüle edildi.",
            "user_id": uid,
            "summary": {
                "total_bots_checked": len(bots),
                "total_commission_usd": str(total_commission_usd),
                "total_developer_share_usd": str(total_developer_usd),
                "total_platform_share_usd": str(total_platform_usd),
            },
            "items": items,
        }

    except Exception as e:
        # sadece okuma yaptık ama yine de rollback güvenli
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"settle_all_profits error: {str(e)}")
