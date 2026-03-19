from fastapi import APIRouter

from .endpoints import advice, auth, budgets, health, market, savings_goals, transactions, users

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(transactions.router)
api_router.include_router(budgets.router)
api_router.include_router(savings_goals.router)
api_router.include_router(advice.router)
api_router.include_router(market.router)
