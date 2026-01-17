"""
Pytest configuration and fixtures for backend tests.

Provides test database setup, client fixtures, and test data helpers.
"""
import os
import pytest
from typing import Generator

# IMPORTANT: Set DATABASE_URL before importing any app modules
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.models.user import User, UserRole


# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db() -> Generator[Session, None, None]:
    """Override database dependency for testing."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Import app after setting DATABASE_URL
from app.main import app
from app.database import get_db
from app.api.auth import get_password_hash, create_access_token

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """Create a test client."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def admin_user(db: Session) -> User:
    """Create an admin user for testing."""
    user = User(
        username="admin",
        email="admin@test.com",
        password_hash=get_password_hash("adminpass123"),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def editor_user(db: Session) -> User:
    """Create an editor user for testing."""
    user = User(
        username="editor",
        email="editor@test.com",
        password_hash=get_password_hash("editorpass123"),
        role=UserRole.EDITOR,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def viewer_user(db: Session) -> User:
    """Create a viewer user for testing."""
    user = User(
        username="viewer",
        email="viewer@test.com",
        password_hash=get_password_hash("viewerpass123"),
        role=UserRole.VIEWER,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user: User) -> str:
    """Create JWT token for admin user."""
    return create_access_token(data={"sub": str(admin_user.id)})


@pytest.fixture
def editor_token(editor_user: User) -> str:
    """Create JWT token for editor user."""
    return create_access_token(data={"sub": str(editor_user.id)})


@pytest.fixture
def viewer_token(viewer_user: User) -> str:
    """Create JWT token for viewer user."""
    return create_access_token(data={"sub": str(viewer_user.id)})


@pytest.fixture
def auth_headers(admin_token: str) -> dict:
    """Create authorization headers with admin token."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def editor_headers(editor_token: str) -> dict:
    """Create authorization headers with editor token."""
    return {"Authorization": f"Bearer {editor_token}"}


@pytest.fixture
def viewer_headers(viewer_token: str) -> dict:
    """Create authorization headers with viewer token."""
    return {"Authorization": f"Bearer {viewer_token}"}
