import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

# Load .env explicitly
backend_dir = Path(__file__).resolve().parent.parent
env_file_path = backend_dir / ".env"
if env_file_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=env_file_path, override=True)
    except ImportError:
        pass

class Settings(BaseSettings):
    PROJECT_NAME: str = "RevenueAI"
    API_V1_PREFIX: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "revenueai-fintech-jwt-secret-key-2026-production-ready")
    
    # Auth & Demo User
    DEMO_USER_EMAIL: str = os.getenv("DEMO_ADMIN_EMAIL", os.getenv("DEMO_USER_EMAIL", "demo@revenueai.app"))
    DEMO_USER_PASSWORD: str = os.getenv("DEMO_ADMIN_PASSWORD", os.getenv("DEMO_USER_PASSWORD", "RevenueAI@2026"))
    DEMO_USER_NAME: str = os.getenv("DEMO_USER_NAME", "Alex Morgan")
    
    # Database Settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/recoverai"
    )
    SQLITE_FALLBACK_URL: str = f"sqlite:///{str((backend_dir / 'recoverai.db').resolve()).replace('\\', '/')}"

    
    # Recovery & Guardrail Config
    MAX_RECOVERY_RETRIES: int = int(os.getenv("MAX_RECOVERY_RETRIES", "3"))
    ALLOW_REAL_MONEY_MOVEMENT: bool = False  # Strictly False in simulation/prototype
    
    # Provider Settings
    PAYMENT_PROVIDER: str = os.getenv("PAYMENT_PROVIDER", "mock")  # "mock" or "razorpay_test"
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    
    # Deployment & Server Config
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    AUTO_SEED_ON_EMPTY: bool = os.getenv("AUTO_SEED_ON_EMPTY", "false").lower() in ("true", "1", "t")
    
    # AI Engine Settings
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "generic_llm")  # "heuristic", "gemini", "openai", "generic_llm"
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "openai/gpt-oss-120b")
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://api.groq.com/openai/v1")
    
    # CORS
    CORS_ORIGINS_STR: str = os.getenv("CORS_ORIGINS", "")

    @property
    def cors_origins(self) -> List[str]:
        if self.CORS_ORIGINS_STR.strip():
            return [origin.strip() for origin in self.CORS_ORIGINS_STR.split(",") if origin.strip()]
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "https://localhost:3000",
            "https://localhost:5173"
        ]

    @property
    def CORS_ORIGINS(self) -> List[str]:
        return self.cors_origins

    class Config:
        env_file = str(env_file_path)
        extra = "allow"

settings = Settings()
