import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App General
    PROJECT_NAME: str = "AlteraFlux Universal Converter"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./alteraflux.db",
        description="Async database connection string"
    )

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Object Storage (S3 / MinIO / Supabase)
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_PUBLIC_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "altera_admin"
    S3_SECRET_KEY: str = "altera_secret_key"
    STORAGE_BUCKET_NAME: str = "alteraflux-storage"
    S3_REGION_NAME: str = "us-east-1"

    # Local storage fallback directory
    LOCAL_STORAGE_PATH: str = "./storage_data"

    # Security
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    MAX_UPLOAD_SIZE_MB: int = 2048
    RATE_LIMIT_PER_MINUTE: int = 60

    # AI API Keys
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
