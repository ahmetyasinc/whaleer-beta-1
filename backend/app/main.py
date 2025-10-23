from fastapi import FastAPI, HTTPException, Depends, APIRouter
from app.routes.user import router as user_router
from app.routes.auth import router as auth_router
from app.routes.phantom.auth import router as phantom_auth_router
from app.routes.phantom.payments import router as phantom_purchase_router
from app.routes.mobile.auth.auth import router as auth_router_mobile
from app.routes.mobile.bots.bots import protected_router as bot_router_mobile
from app.routes.mobile.showcase.showcase import protected_router as showcase_router_mobile
from app.routes.profile.indicator.indicator_data import protected_router as indicator_data_router
from app.routes.profile.indicator.indicator import protected_router as indicator_router
from app.routes.profile.indicator.indicator_release import protected_router as indicator_release
from app.routes.profile.indicator.indicator_run import protected_router as indicator_run_router
from app.routes.profile.indicator.indicator_adjustment import protected_router as indicator_adjustment_router
from app.routes.profile.indicator.websocket_binance import websocket_router as websocket_binance_router
from app.routes.profile.settings.settings import router as settings_router
from app.routes.profile.binance_coins.binance_coins import protected_router as binance_coins_router
from app.routes.profile.strategy.strategy import protected_router as strategy_router
from app.routes.profile.strategy.strategy_release import protected_router as strategy_release
from app.routes.profile.strategy.strategy_adjustment import protected_router as strategy_adjustment_router
from app.routes.profile.strategy.strategy_run import protected_router as strategy_run_router
from app.routes.profile.strategy.strategy_imports import protected_router as strategy_imports_router
from app.routes.profile.backtest.backtest import protected_router as backtest_router
from app.routes.profile.backtest.backtest_service import router as backtest_run_router
from app.routes.profile.api_keys.api_keys import protected_router as api_keys_router
from app.routes.profile.api_keys.binance import router as api_keys_binance_router
from app.routes.profile.bots.bots import protected_router as bots_router
from app.routes.profile.scan.scan import protected_router as scan_router
from app.routes.profile.whaleer_ai.whaleer_ai import protected_router as whaleer_ai_router
from app.routes.profile.showcase.showcase import protected_router as showcase
from app.routes.profile.profile.profile import protected_router as profile
from app.routes.mobile.profile.profile import protected_router as profileMobile
from app.routes.admin.admin import protected_router as admin
from app.routes.profile.support.support import protected_router as support_router
from app.routes import google_auth
from app.routes.profile.plans import router as plans_router
from app.routes.profile.telegram.telegram_bot import protected_router as tg_protected, public_router as tg_public

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

api_router = APIRouter(prefix="/api")

# USER ROUTES
api_router.include_router(tg_protected)
api_router.include_router(plans_router)
api_router.include_router(settings_router)
api_router.include_router(tg_public)
api_router.include_router(google_auth.router)
api_router.include_router(user_router)
api_router.include_router(auth_router)
api_router.include_router(auth_router_mobile)
api_router.include_router(phantom_auth_router)
api_router.include_router(phantom_purchase_router)
# COINS ROUTES
api_router.include_router(binance_coins_router)
# INDICATOR ROUTES
api_router.include_router(websocket_binance_router)
api_router.include_router(indicator_data_router)
api_router.include_router(indicator_router) 
api_router.include_router(indicator_release) 
api_router.include_router(indicator_run_router) 
api_router.include_router(indicator_adjustment_router) 
# STRATEGY ROUTES
api_router.include_router(strategy_router)
api_router.include_router(strategy_release)
api_router.include_router(strategy_adjustment_router)
api_router.include_router(strategy_run_router)
api_router.include_router(strategy_imports_router)
# API KEYS ROUTES
api_router.include_router(api_keys_router)
api_router.include_router(api_keys_binance_router)
# BACKTEST ROUTES
api_router.include_router(backtest_router)
api_router.include_router(backtest_run_router)
# BOT ROUTES
api_router.include_router(bots_router)
api_router.include_router(bot_router_mobile)
# SCAN ROUTES
api_router.include_router(scan_router)
# WHALEER AI ROUTES
api_router.include_router(whaleer_ai_router)
# SHOWCASE ROUTES
api_router.include_router(showcase)
api_router.include_router(showcase_router_mobile)
# PROFİLE ROUTES
api_router.include_router(profile)
api_router.include_router(profileMobile)
api_router.include_router(support_router)
# ADMİN ROUTES
api_router.include_router(admin)

app.include_router(api_router)

# CORS Middleware ekle
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://13.60.185.143:3000",
        "https://whaleer.com",          
        "https://www.whaleer.com"       
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct

from app.database import get_db
from app.models import User
from app.models.profile.strategy.strategy import Strategy
from app.models.profile.bots.bots import Bots

@app.get("/api/api/hero-infos/")
async def get_hero_infos(db: AsyncSession = Depends(get_db)):
    # toplam kullanıcı
    user_count_result = await db.execute(select(func.count()).select_from(User))
    user_count = user_count_result.scalar_one()

    # toplam strateji
    strategy_count_result = await db.execute(select(func.count()).select_from(Strategy))
    strategy_count = strategy_count_result.scalar_one()

    # toplam bot
    bot_count_result = await db.execute(select(func.count()).select_from(Bots))
    bot_count = bot_count_result.scalar_one()

    # toplam trader (botu olan farklı kullanıcı sayısı)
    trader_count_result = await db.execute(select(func.count(distinct(Bots.user_id))))
    trader_count = trader_count_result.scalar_one()

    return {
        "user_count": user_count,
        "trader_count": trader_count,
        "strategy_count": strategy_count,
        "bot_count": bot_count
    }

