"""
Application configuration using pydantic-settings.

All paths are relative and environment-configurable for portability.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    # Default uses localhost for local development
    # In Docker, this is overridden by DATABASE_URL env var to use 'db' service
    database_url: str = "postgresql://postgres:postgres@localhost:5432/inventory"

    # Security
    secret_key: str = "change-this-in-production-use-a-real-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Application
    app_name: str = "Inventory Manager"
    debug: bool = False
    allowed_hosts: str = "*"

    # File uploads - relative path from app root or absolute if specified
    upload_dir: str = "./uploads"
    max_upload_size: int = 10 * 1024 * 1024  # 10MB

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra env vars not defined in this class

    def get_upload_path(self) -> str:
        """Get absolute upload path, creating directory if needed."""
        if os.path.isabs(self.upload_dir):
            path = self.upload_dir
        else:
            # Relative to the app directory
            app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            path = os.path.join(app_dir, self.upload_dir)
        os.makedirs(path, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
