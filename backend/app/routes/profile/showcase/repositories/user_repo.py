from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.profile.bots.bots import Bots
from app.models.profile.bots.bot_positions import BotPositions
from app.models.profile.bots.bot_trades import BotTrades
from app.models.profile.bots.bot_holdings import BotHoldings
from app.models.profile.bots.bot_follow import BotFollow
from app.schemas.showcase.showcase import UserSummary, OtherBotSummary


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_id(self, user_id: int) -> UserSummary:
        user_result = await self.db.execute(
            select(
                User.id,
                User.username,
                User.name,
                User.created_at,
                User.location,
                User.email,
                User.phone,
                User.instagram,
                User.linkedin,
                User.github,
                User.total_followers,
                User.total_sold,
                User.total_rented
            ).where(User.id == user_id)
        )
        user = user_result.one_or_none()
        if not user:
            return None

        # Kullanıcının botlarını getir
        bots_result = await self.db.execute(
            select(Bots).where(
                Bots.user_id == user.id,
                (Bots.for_sale == True) | (Bots.for_rent == True)
            )
        )
        bots = bots_result.scalars().all()

        other_bots = []
        total_current_value, total_initial_value = 0.0, 0.0
        wins = 0

        for bot in bots:
            trade_count = await self.db.scalar(
                select(func.count()).select_from(BotTrades).where(BotTrades.bot_id == bot.id)
            )
            # Win rate
            pos_result = await self.db.execute(
                select(BotPositions.profit_loss).where(BotPositions.bot_id == bot.id)
            )
            hold_result = await self.db.execute(
                select(BotHoldings.profit_loss).where(BotHoldings.bot_id == bot.id)
            )
            profits = [float(r[0]) for r in pos_result.all()] + [float(r[0]) for r in hold_result.all()]
            win_rate = len([p for p in profits if p > 0]) / len(profits) if profits else 0.0

            if bot.initial_usd_value:
                profit_rate = ((float(bot.current_usd_value or 0) - float(bot.initial_usd_value)) / float(bot.initial_usd_value))*100
                total_current_value += float(bot.current_usd_value or 0)
                total_initial_value += float(bot.initial_usd_value)
            else:
                profit_rate = 0.0

            if profit_rate > 0:
                wins += 1

            other_bots.append(OtherBotSummary(
                id=bot.id,
                name=bot.name,
                isActive=bot.active,
                profitRate=round(profit_rate, 4),
                runningTime=bot.running_time,
                totalTrades=trade_count,
                winRate=round(win_rate, 4)
            ))

        avg_profit = (total_current_value - total_initial_value) / total_initial_value if total_initial_value > 0 else 0.0
        win_rate = wins / len(bots) if bots else 0.0

        return UserSummary(
            id=user.id,
            username=user.username,
            display_name=user.name,
            description=None,
            join_date=user.created_at.strftime("%Y-%m-%d"),
            location=user.location,
            email=user.email,
            gsm=user.phone,
            instagram=user.instagram,
            linkedin=user.linkedin,
            github=user.github,
            totalFollowers=user.total_followers,
            totalSold=user.total_sold,
            totalRented=user.total_rented,
            avg_bots_profit_lifetime=round(avg_profit, 4),
            bots_winRate_LifeTime=round(win_rate, 4),
            allbots=len(bots),
            bots=other_bots
        )
