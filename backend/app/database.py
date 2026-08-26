import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

def create_db_engine():
    """Attempts PostgreSQL first; falls back gracefully to SQLite if unavailable."""
    url = settings.DATABASE_URL.strip() if settings.DATABASE_URL else ""
    
    # Normalize postgres:// to postgresql:// for SQLAlchemy 2.0+ compatibility (Render/Heroku/Neon/Supabase)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    try:
        if url.startswith("postgresql"):
            test_engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_recycle=300,
                connect_args={"connect_timeout": 5}
            )
            with test_engine.connect() as conn:
                logger.info(f"Connected to PostgreSQL database at {url.split('@')[-1]}")
            return test_engine
    except Exception as e:
        logger.warning(f"PostgreSQL connection failed ({e}). Falling back to local SQLite at {settings.SQLITE_FALLBACK_URL}")
    
    # SQLite fallback
    sqlite_url = settings.SQLITE_FALLBACK_URL
    return create_engine(sqlite_url, connect_args={"check_same_thread": False})

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models import customer, payment, subscription, recovery_case, agent_decision, recovery_action, audit_log, recovery_fatigue, recovery_pressure, user, notification
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")

