"""
Database connection and session management.

Provides SQLAlchemy engine, session factory, and dependency for FastAPI.
Supports both PostgreSQL (production) and SQLite (testing) via DATABASE_URL env.
"""
import os
from typing import Generator, Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.models.base import Base


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


def create_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=get_engine())


def run_migrations():
    """Run manual migrations for SQLite (adding new columns).

    Only runs on existing databases - skips if users table doesn't exist yet.
    """
    from sqlalchemy import text, inspect

    engine = get_engine()

    # Check if users table exists first
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return  # Fresh database, tables will be created by create_tables()

    with engine.connect() as conn:
        # Check and add last_active column to users
        try:
            conn.execute(text("SELECT last_active FROM users LIMIT 1"))
        except Exception:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_active DATETIME"))
            conn.commit()

        # Check and add edit_count column to users
        try:
            conn.execute(text("SELECT edit_count FROM users LIMIT 1"))
        except Exception:
            conn.execute(text("ALTER TABLE users ADD COLUMN edit_count INTEGER DEFAULT 0"))
            conn.commit()

        # Check if rooms table exists before adding room columns
        if "rooms" in inspector.get_table_names():
            # Add room shape columns
            try:
                conn.execute(text("SELECT shape FROM rooms LIMIT 1"))
            except Exception:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN shape VARCHAR(20) DEFAULT 'rectangle'"))
                conn.commit()

            try:
                conn.execute(text("SELECT shape_cutout_width FROM rooms LIMIT 1"))
            except Exception:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN shape_cutout_width FLOAT"))
                conn.commit()

            try:
                conn.execute(text("SELECT shape_cutout_height FROM rooms LIMIT 1"))
            except Exception:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN shape_cutout_height FLOAT"))
                conn.commit()

            try:
                conn.execute(text("SELECT shape_cutout_corner FROM rooms LIMIT 1"))
            except Exception:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN shape_cutout_corner VARCHAR(20)"))
                conn.commit()

            # Add door columns
            try:
                conn.execute(text("SELECT door_wall FROM rooms LIMIT 1"))
            except Exception:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN door_wall VARCHAR(10)"))
                conn.commit()

            try:
                conn.execute(text("SELECT door_position FROM rooms LIMIT 1"))
            except Exception:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN door_position FLOAT"))
                conn.commit()

            try:
                conn.execute(text("SELECT door_width FROM rooms LIMIT 1"))
            except Exception:
                conn.execute(text("ALTER TABLE rooms ADD COLUMN door_width FLOAT DEFAULT 1.0"))
                conn.commit()

            # Normalize shape values to lowercase (fix for enum migration)
            conn.execute(text("UPDATE rooms SET shape = LOWER(shape) WHERE shape IS NOT NULL"))
            conn.commit()

            # Normalize door_wall values to lowercase
            conn.execute(text("UPDATE rooms SET door_wall = LOWER(door_wall) WHERE door_wall IS NOT NULL"))
            conn.commit()

        # Check if items table exists before adding item columns
        if "items" in inspector.get_table_names():
            # Add projects column (JSON array)
            try:
                conn.execute(text("SELECT projects FROM items LIMIT 1"))
            except Exception:
                conn.execute(text("ALTER TABLE items ADD COLUMN projects JSON DEFAULT '[]'"))
                conn.commit()
