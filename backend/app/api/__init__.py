from fastapi import APIRouter
from app.api.dashboard import router as dashboard_router
from app.api.payments import router as payments_router
from app.api.customers import router as customers_router
from app.api.recovery_cases import router as recovery_cases_router
from app.api.demo import router as demo_router
from app.api.auth import router as auth_router
from app.api.notifications import router as notifications_router
from app.api.search import router as search_router
from app.api.analytics import router as analytics_router
from app.api.guardrails import router as guardrails_router
from app.api.audit import router as audit_router
from app.api.system import router as system_router
from app.api.webhooks import router as webhooks_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(analytics_router)
api_router.include_router(guardrails_router)
api_router.include_router(audit_router)
api_router.include_router(payments_router)
api_router.include_router(customers_router)
api_router.include_router(recovery_cases_router)
api_router.include_router(notifications_router)
api_router.include_router(search_router)
api_router.include_router(demo_router)
api_router.include_router(system_router)
api_router.include_router(webhooks_router)
