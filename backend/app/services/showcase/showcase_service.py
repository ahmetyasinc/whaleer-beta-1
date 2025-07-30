# app/services/showcase_service.py
from sqlalchemy.orm import Session

from app.routes.profile.showcase.repositories.bot_repo import BotRepository
from app.routes.profile.showcase.repositories.user_repo import UserRepository
from app.schemas.showcase.showcase import ShowcaseFilter, ShowcaseBotResponse, BotSummary

class ShowcaseService:
    def __init__(self, db: Session):
        self.bot_repo = BotRepository(db)
        self.user_repo = UserRepository(db)

    async def get_showcase_bots(self, filters: ShowcaseFilter) -> list[ShowcaseBotResponse]:
        bots = await self.bot_repo.get_filtered_bots(filters)
        showcase_results = []
    
        for bot in bots:
            user_summary = await self.user_repo.get_user_by_id(bot.user_id)
            trades = await self.bot_repo.get_recent_trades(bot.id)
            positions = await self.bot_repo.get_current_positions(bot.id)
            chart_data = await self.bot_repo.get_chart_data(bot.id)
            margin_summary = await self.bot_repo.get_margin_summary(bot.id)
            strategy_name = await self.bot_repo.get_strategy_name(bot.strategy_id)
    
            profit_rate = (
                (float(bot.current_usd_value or 0) - float(bot.initial_usd_value or 0)) / float(bot.initial_usd_value)
                if bot.initial_usd_value else 0.0
            )
    
            bot_summary = BotSummary(
                bot_id=bot.id,
                name=bot.name,
                creator=user_summary.display_name,
                profitRate=round(profit_rate, 4),
                startDate=bot.created_at.strftime("%Y-%m-%d %H:%M"),
                runningTime=bot.running_time,
                winRate=0.0,  # Hesaplanabilir istenirse
                totalMargin=margin_summary.total_margin,
                dayMargin=margin_summary.day_margin,
                weekMargin=margin_summary.week_margin,
                monthMargin=margin_summary.month_margin,
                profitFactor=bot.profit_factor,
                riskFactor=bot.risk_factor,
                totalTrades=len(trades),
                dayTrades=0,
                weekTrades=0,
                monthTrades=0,
                strategy=strategy_name,
                soldCount=bot.sold_count or 0,
                rentedCount=bot.rented_count or 0,
                avg_fullness=float(bot.fullness or 0),
                for_rent=bot.for_rent,
                for_sale=bot.for_sale,
                rent_price=float(bot.rent_price or 0),
                sell_price=float(bot.sell_price or 0),
                coins=", ".join(bot.stocks or []),
                trades=trades,
                positions=positions,
            )
    
            showcase_results.append(
                ShowcaseBotResponse(
                    user=user_summary,
                    bot=bot_summary,
                    chartData=chart_data,
                    tradingData=[]  # Şu an boş geliyor
                )
            )
    
        return showcase_results


    async def get_showcase_bot_by_id(self, bot_id: int) -> ShowcaseBotResponse | None:
        bot = await self.bot_repo.get_bot_by_id(bot_id)
        if not bot:
            return None

        user_summary = await self.user_repo.get_user_by_id(bot.user_id)
        trades = await self.bot_repo.get_recent_trades(bot.id)
        positions = await self.bot_repo.get_current_positions(bot.id)
        chart_data = await self.bot_repo.get_chart_data(bot.id)
        margin_summary = await self.bot_repo.get_margin_summary(bot.id)
        strategy_name = await self.bot_repo.get_strategy_name(bot.strategy_id)

        profit_rate = (
            (float(bot.current_usd_value or 0) - float(bot.initial_usd_value or 0)) / float(bot.initial_usd_value)
            if bot.initial_usd_value else 0.0
        )

        bot_summary = BotSummary(
            bot_id=bot.id,
            name=bot.name,
            creator=user_summary.display_name,
            profitRate=round(profit_rate, 4),
            startDate=bot.created_at.strftime("%Y-%m-%d %H:%M"),
            runningTime=bot.running_time,
            winRate=0.0,
            totalMargin=margin_summary.total_margin,
            dayMargin=margin_summary.day_margin,
            weekMargin=margin_summary.week_margin,
            monthMargin=margin_summary.month_margin,
            profitFactor=bot.profit_factor,
            riskFactor=bot.risk_factor,
            totalTrades=len(trades),
            dayTrades=0,
            weekTrades=0,
            monthTrades=0,
            strategy=strategy_name,
            soldCount=bot.sold_count or 0,
            rentedCount=bot.rented_count or 0,
            avg_fullness=float(bot.fullness or 0),
            for_rent=bot.for_rent,
            for_sale=bot.for_sale,
            rent_price=float(bot.rent_price or 0),
            sell_price=float(bot.sell_price or 0),
            coins=", ".join(bot.stocks or []),
            trades=trades,
            positions=positions,
        )

        return ShowcaseBotResponse(
            user=user_summary,
            bot=bot_summary,
            chartData=chart_data,
            tradingData=[]
        )

