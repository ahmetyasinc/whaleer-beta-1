from datetime import datetime, timedelta
from sqlalchemy import func, select, and_, or_

from sqlalchemy.orm import Session
from app.models.profile.bots.bots import Bots
from app.models.profile.bots.bot_positions import BotPositions
from app.models.profile.bots.bot_holdings import BotHoldings
from app.models.profile.bots.bot_trades import BotTrades
from app.models.profile.bots.bot_snapshots import BotSnapshots
from app.models.profile.strategy.strategy import Strategy

from app.schemas.showcase.showcase import Trade, Position, ChartDataPoint, OtherBotSummary, MarginSummary


class BotRepository:
    def __init__(self, db: Session):
        self.db = db

    async def get_strategy_name(self, strategy_id: int) -> str:
        result = await self.db.execute(
            select(Strategy.name).where(Strategy.id == strategy_id)
        )
        name = result.scalar_one_or_none()
        return name or "Unknown"

    async def get_bot_by_id(self, bot_id: int):
        result = await self.db.execute(
            select(Bots).where(Bots.id == bot_id,Bots.deleted.is_(False))
        )
        return result.scalar_one_or_none()

    async def get_filtered_bots(self, filters) -> list[Bots]:
        stmt = (
            select(Bots)
            .where(
                and_(
                    or_(Bots.for_sale.is_(True), Bots.for_rent.is_(True)),
                    Bots.deleted.is_(False)
                )
            )
        )

        # For Sale / Sell Price
        if filters.min_sell_price is not None or filters.max_sell_price is not None:
            stmt = stmt.where(Bots.for_sale == True)
            if filters.min_sell_price is not None:
                stmt = stmt.where(Bots.sell_price >= filters.min_sell_price)
            if filters.max_sell_price is not None:
                stmt = stmt.where(Bots.sell_price <= filters.max_sell_price)

        # For Rent / Rent Price
        if filters.min_rent_price is not None or filters.max_rent_price is not None:
            stmt = stmt.where(Bots.for_rent == True)
            if filters.min_rent_price is not None:
                stmt = stmt.where(Bots.rent_price >= filters.min_rent_price)
            if filters.max_rent_price is not None:
                stmt = stmt.where(Bots.rent_price <= filters.max_rent_price)

        # Profit Factor
        if filters.min_profit_factor is not None:
            stmt = stmt.where(Bots.profit_factor >= filters.min_profit_factor)

        # Risk Factor
        if filters.max_risk_factor is not None:
            stmt = stmt.where(Bots.risk_factor <= filters.max_risk_factor)

        # Created Minutes Ago
        if filters.min_created_minutes_ago is not None:
            threshold = datetime.utcnow() - timedelta(minutes=filters.min_created_minutes_ago)
            stmt = stmt.where(Bots.created_at <= threshold)

        # Uptime
        if filters.min_uptime_minutes is not None:
            stmt = stmt.where(Bots.running_time >= filters.min_uptime_minutes)

        # Bot Type
        if filters.bot_type is not None:
            stmt = stmt.where(Bots.bot_type == filters.bot_type)

        # Active Status
        if filters.active is not None:
            stmt = stmt.where(Bots.active == filters.active)

        # Demand (based on sold_count)
        if filters.demand is not None and 1 <= filters.demand <= 5:
            max_sold_count = await self.db.scalar(select(func.max(Bots.sold_count)))
            max_sold_count = max_sold_count or 0
            unit = max(max_sold_count / 5, 1)
            lower = unit * (filters.demand - 1)
            #upper = unit * filters.demand
            #print(f"Demand filter: {filters.demand}, max_sold_count: {max_sold_count}, lower: {lower}, upper: {upper}")
            stmt = stmt.where(Bots.sold_count > lower)#, Bots.sold_count <= upper)

        stmt = stmt.order_by(func.random()).limit(filters.limit or 5)

        # Execute filtered query
        result = await self.db.execute(stmt)
        bots = result.scalars().all()

        bot_96 = next((b for b in bots if b.id == 96), None)
        if bot_96:
            bots = [bot_96] + [b for b in bots if b.id != 96]

        if filters.min_profit_margin is not None:
            filtered_bots = []

            for bot in bots:
                margin_summary = await self.get_margin_summary(bot.id)

                # Unit'e göre doğru alanı seç
                if filters.profit_margin_unit == "day":
                    margin_value = margin_summary.day_margin
                elif filters.profit_margin_unit == "week":
                    margin_value = margin_summary.week_margin
                elif filters.profit_margin_unit == "month":
                    margin_value = margin_summary.month_margin
                else:
                    margin_value = margin_summary.total_margin  # "all" veya None için

                if margin_value >= filters.min_profit_margin:
                    filtered_bots.append(bot)

            bots = filtered_bots

        # Trade Frequency filtresi (manuel hesap)
        if filters.min_trade_frequency is not None:
            bot_ids = [bot.id for bot in bots]
            trade_counts = dict(
                (await self.db.execute(
                    select(BotTrades.bot_id, func.count(BotTrades.id))
                    .where(BotTrades.bot_id.in_(bot_ids))
                    .group_by(BotTrades.bot_id)
                )).all()
            )

            def frequency_ok(bot):
                runtime_days = max(bot.running_time / 1440, 1)
                trades = trade_counts.get(bot.id, 0)
                return (trades / runtime_days) >= filters.min_trade_frequency
            
            print(frequency_ok)
            bots = list(filter(frequency_ok, bots))


        return bots[:filters.limit or 5]

    async def get_recent_trades(self, bot_id: int, limit: int = 10) -> list[Trade]:
        result = await self.db.execute(
            select(
                BotTrades.id,
                BotTrades.symbol,
                BotTrades.trade_type,
                BotTrades.side,
                BotTrades.created_at
            )
            .where(BotTrades.bot_id == bot_id)
            .order_by(BotTrades.created_at.desc())
            .limit(limit)
        )
        rows = result.all()
        trades: list[Trade] = []

        for row in rows:
            trade = Trade(
                id=row.id,
                pair=row.symbol,
                type=row.trade_type,
                action=row.side,
                time=row.created_at.strftime("%Y-%m-%d %H:%M:%S")
            )
            trades.append(trade)
        return trades

    async def get_current_positions(self, bot_id: int) -> list[Position]:
        positions: list[Position] = []

        # 1. bot_positions'dan long/short pozisyonlar
        pos_result = await self.db.execute(
            select(
                BotPositions.id,
                BotPositions.symbol,
                BotPositions.position_side,
                BotPositions.realized_pnl,
                BotPositions.unrealized_pnl
            ).where(
                BotPositions.bot_id == bot_id,
                BotPositions.amount > 0
            )
        )

        for row in pos_result.all():
            pos_type = "long" if row.position_side.lower() == "long" else "short"
            positions.append(Position(
                id=row.id,
                pair=row.symbol,
                type=pos_type,
                profit=float(row.realized_pnl+row.unrealized_pnl)
            ))

        # 2. bot_holdings'den spot pozisyonlar
        hold_result = await self.db.execute(
            select(
                BotHoldings.id,
                BotHoldings.symbol,
                BotHoldings.realized_pnl,
                BotHoldings.unrealized_pnl,
            ).where(
                BotHoldings.bot_id == bot_id,
                BotHoldings.amount > 0
            )
        )

        for row in hold_result.all():
            positions.append(Position(
                id=row.id,
                pair=row.symbol,
                type="spot",
                profit=float(row.realized_pnl + row.unrealized_pnl)
            ))

        return positions

    async def get_chart_data(self, bot_id: int) -> list[ChartDataPoint]:
        result = await self.db.execute(
            select(
                BotSnapshots.timestamp,
                BotSnapshots.pnl_ratio
            )
            .where(BotSnapshots.bot_id == bot_id)
            .order_by(BotSnapshots.timestamp.asc())
        )

        rows = result.all()

        chart_data: list[ChartDataPoint] = []

        for row in rows:
            chart_data.append(ChartDataPoint(
                timestamp=row.timestamp.strftime("%Y-%m-%d %H:%M"),
                value=float(row.pnl_ratio)
            ))

        return chart_data

    async def get_margin_summary(self, bot_id: int) -> MarginSummary:
        now = datetime.utcnow()
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # --- TOTAL MARGIN: Bots tablosundan ---
        bot_vals = await self.db.execute(
            select(
                Bots.current_usd_value.label("cur"),
                Bots.initial_usd_value.label("init")
            ).where(Bots.id == bot_id)
        )
        row = bot_vals.one_or_none()
        cur = float(row.cur) if row and row.cur is not None else 0.0
        init = float(row.init) if row and row.init is not None else 0.0
        total_margin = round(((cur - init)/init)*100, 2)

        # --- Gün/Hafta/Ay marjları: snapshot'tan ---
        result = await self.db.execute(
            select(
                BotSnapshots.timestamp,
                BotSnapshots.balance_usdt
            )
            .where(BotSnapshots.bot_id == bot_id)
            .order_by(BotSnapshots.timestamp.asc())
        )
        snapshots = result.all()

        if len(snapshots) >= 2:
            def find_margin(since_time):
                relevant = [s for s in snapshots if s.timestamp >= since_time]
                if relevant:
                    return float(snapshots[-1].balance_usdt) - float(relevant[0].balance_usdt)
                else:
                    # yeterli snapshot yoksa en eskiye göre
                    return float(snapshots[-1].balance_usdt) - float(snapshots[0].balance_usdt)

            day_margin = round(find_margin(day_ago), 2)
            week_margin = round(find_margin(week_ago), 2)
            month_margin = round(find_margin(month_ago), 2)
        else:
            day_margin = week_margin = month_margin = 0.0

        return MarginSummary(
            day_margin=day_margin,
            week_margin=week_margin,
            month_margin=month_margin,
            total_margin=total_margin
        )

    async def get_user_other_bots(self, user_id: int, exclude_id: int) -> list[OtherBotSummary]:
        # 1. Kullanıcının vitrine dahil edilebilir diğer botlarını al
        result = await self.db.execute(
            select(Bots).where(
                Bots.user_id == user_id,
                Bots.id != exclude_id,
                Bots.deleted.is_(False),
                (Bots.for_sale == True) | (Bots.for_rent == True)
            )
        )
        bots = result.scalars().all()

        other_bots: list[OtherBotSummary] = []

        for bot in bots:
            # Margin hesabı
            margin = 0.0
            if bot.initial_usd_value and bot.initial_usd_value > 0:
                margin = (float(bot.current_usd_value or 0) - float(bot.initial_usd_value)) / float(bot.initial_usd_value)

            # Trade sayısı
            trade_count = await self.db.scalar(
                select(func.count()).select_from(BotTrades).where(BotTrades.bot_id == bot.id)
            )

            # Win rate hesapla
            pos_q = select(
                (func.coalesce(BotPositions.realized_pnl, 0.0) +
                 func.coalesce(BotPositions.unrealized_pnl, 0.0)).label("pnl")
            ).where(BotPositions.bot_id == bot.id)
            pos_result = await self.db.execute(pos_q)
            
            # Spot/holdings
            hold_q = select(
                (func.coalesce(BotHoldings.realized_pnl, 0.0) +
                 func.coalesce(BotHoldings.unrealized_pnl, 0.0)).label("pnl")
            ).where(BotHoldings.bot_id == bot.id)
            hold_result = await self.db.execute(hold_q)
            
            pnls = [float(r.pnl) for r in pos_result.all()] + [float(r.pnl) for r in hold_result.all()]

            profits = sum(pnls)
            total = len(profits)
            wins = len([p for p in profits if p > 0])
            win_rate = wins / total if total > 0 else 0.0

            other_bots.append(OtherBotSummary(
                id=bot.id,
                name=bot.name,
                active=bot.active,
                margin=round(margin, 4),
                total_trades=trade_count,
                win_rate=round(win_rate, 4),
                running_time=bot.running_time
            ))

        return other_bots

    async def get_bots_by_user(self, user_id: int) -> list[Bots]:
        """
        Verilen kullanıcıya ait yalnızca satışa (for_sale) veya kiralamaya (for_rent)
        açık botları en yeni oluşturulandan eskiye doğru döndürür.
        """
        stmt = (
            select(Bots)
            .where(
                Bots.user_id == user_id,
                Bots.deleted.is_(False),
                (Bots.for_sale == True) | (Bots.for_rent == True)
            )
            .order_by(Bots.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    