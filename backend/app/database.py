"""
Database connection and session management.

Provides SQLAlchemy engine, session factory, and dependency for FastAPI.
Supports both PostgreSQL (production) and SQLite (testing) via DATABASE_URL env.

Schema changes are NOT made here. They are handled by Alembic migrations
(see app/schema_manager.py and backend/migrations/).
"""
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool


# Engine and session - initialized lazily or overridden in tests
_engine = None
_SessionLocal = None


def get_engine():
    """Get or create the database engine."""
    global _engine
    if _engine is None:
        from app.config import get_settings
        settings = get_settings()
        database_url = settings.database_url

        # Check if using SQLite (for testing)
        if database_url.startswith("sqlite"):
            _engine = create_engine(
                database_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        else:
            _engine = create_engine(
                database_url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10
            )
    return _engine


def get_session_local():
    """Get or create the session factory."""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides a database session."""
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
