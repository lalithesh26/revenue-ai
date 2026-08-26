import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db, SessionLocal
from app.models.customer import Customer
from app.models.user import User
from app.seed import seed_synthetic_data
from app.api import api_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing RevenueAI Database schema...")
    init_db()
    db = SessionLocal()
    try:
        cust_count = db.query(Customer).count()
        user_count = db.query(User).count()
        
        # 1. Guarantee default admin user exists if zero users exist
        if user_count == 0:
            logger.info("No user accounts found. Initializing primary admin user...")
            from app.services.auth import hash_password
            admin_user = User(
                email=settings.DEMO_USER_EMAIL.strip().lower(),
                name=settings.DEMO_USER_NAME.strip(),
                password_hash=hash_password(settings.DEMO_USER_PASSWORD),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            logger.info(f"Default admin user created: {settings.DEMO_USER_EMAIL}")
            user_count = 1

        # 2. Only auto-seed customers if AUTO_SEED_ON_EMPTY is enabled AND database is empty
        if settings.AUTO_SEED_ON_EMPTY and cust_count == 0:
            logger.info("AUTO_SEED_ON_EMPTY enabled and database empty. Generating initial dataset...")
            seed_synthetic_data(db, num_customers=100, num_payments=300, reset_existing=False)
            logger.info("Auto-seeding complete.")
        else:
            logger.info(f"Database operational with {cust_count} customers and {user_count} users (persistence active).")
    finally:
        db.close()
    yield
    logger.info("RevenueAI application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="RevenueAI - AI-Powered Revenue Recovery & Autonomous Decision Engine for Modern Fintech Platforms",
    version="2.2.0",
    lifespan=lifespan
)

# CORS - Production-safe origin matching
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https:\/\/.*(\.vercel\.app|\.onrender\.com|\.railway\.app|\.pages\.dev|\.fly\.dev)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "payment_provider": settings.PAYMENT_PROVIDER,
        "ai_provider": settings.AI_PROVIDER,
        "real_money_disabled": not settings.ALLOW_REAL_MONEY_MOVEMENT
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to RevenueAI API - AI-Powered Revenue Recovery System",
        "docs_url": "/docs",
        "api_prefix": settings.API_V1_PREFIX
    }
