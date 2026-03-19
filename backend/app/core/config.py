from functools import lru_cache
import json
from pathlib import Path
from typing import Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the backend directory (where .env is located)
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Application configuration loaded from environment variables/.env file."""

    PROJECT_NAME: str = "AI-Powered Personal Finance Advisor"
    API_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]
    CORS_ALLOW_CREDENTIALS: bool = False

    SECRET_KEY: str = "change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"
    UNVERIFIED_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    AUTH_MAX_FAILED_ATTEMPTS: int = 5
    AUTH_LOCKOUT_MINUTES: int = 15

    OPENAI_API_KEY: str | None = None
    GOOGLE_GEMINI_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None
    AI_ASSISTANT_NAME: str = "Finson"
    AI_MAX_TOKENS_PER_DAY_PER_USER: int = 20000
    AI_MAX_INPUT_CHARS: int = 6000

    MARKET_HTTP_TIMEOUT_SECONDS: float = 8.0
    MARKET_CACHE_TTL_SECONDS: int = 60

    # Email settings
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Finson"
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    FRONTEND_URL: str = "http://localhost:5173"

    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "finance_app"
    MYSQL_PASSWORD: str = "change-me"
    MYSQL_DB: str = "finance_app"

    SQLALCHEMY_DATABASE_URI: str | None = "sqlite:///./finance_app.db"

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"), env_file_encoding="utf-8", extra="ignore")

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: Any) -> list[str]:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(origin).strip() for origin in parsed if str(origin).strip()]
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        raise ValueError(
            "BACKEND_CORS_ORIGINS must be a list or a comma-separated string")

    @model_validator(mode="after")
    def _validate_cors_config(self) -> "Settings":
        if self.CORS_ALLOW_CREDENTIALS and ("*" in self.BACKEND_CORS_ORIGINS):
            raise ValueError(
                "Wildcard CORS origins are not allowed when CORS_ALLOW_CREDENTIALS=true"
            )
        if self.APP_ENV.lower() in {"prod", "production"} and self.CORS_ALLOW_CREDENTIALS:
            for origin in self.BACKEND_CORS_ORIGINS:
                if "localhost" in origin or "127.0.0.1" in origin:
                    raise ValueError(
                        "Localhost CORS origins are not allowed in production when CORS_ALLOW_CREDENTIALS=true"
                    )
        return self

    def db_uri(self) -> str:
        if self.SQLALCHEMY_DATABASE_URI:
            return self.SQLALCHEMY_DATABASE_URI
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
