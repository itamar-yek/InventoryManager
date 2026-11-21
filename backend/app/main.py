"""
Inventory Manager - FastAPI Application

A room-based inventory management system with visual room layouts and storage units.
Designed for offline/on-prem deployment with no external dependencies.

Features:
- Room management with visual layout canvas
- Storage units (cabinets, desks, shelves) with position tracking
- Items with dual catalog numbers for search
- Movement audit trail
- Role-based access control (Viewer, Editor, Admin)

API Documentation:
- Swagger UI: /docs
- ReDoc: /redoc
- OpenAPI JSON: /openapi.json
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import get_session_local
from app.schema_manager import prepare_database
from app.api import api_router

settings = get_settings()

logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(name)s - %(message)s")


def create_default_admin():
    """Create a default admin user if no users exist."""
    from app.models.user import User, UserRole
    from app.api.auth import get_password_hash

    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            admin = User(
                username=settings.admin_username,
                email="admin@example.com",
                password_hash=get_password_hash(settings.admin_password),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print(f"Default admin user created (username: {settings.admin_username})")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: bring the database schema up to date (Alembic migrations,
    # with an automatic backup before any change to an existing database).
    prepare_database()
    # Create default admin user
    create_default_admin()
    yield
    # Shutdown: cleanup if needed
    pass


app = FastAPI(
    title="Inventory Manager API",
    description="""
## Inventory Manager - Room-Based Inventory System

This API provides endpoints for managing a physical inventory organized by:
- **Rooms** - Physical locations with visual layouts
- **Storage Units** - Cabinets, desks, shelves positioned on room layouts
- **Compartments** - Subdivisions within storage units (drawers, shelves)
- **Items** - Inventory items with dual catalog numbers

### Authentication
All endpoints require JWT authentication. Use `/api/auth/login` to obtain a token.

### Roles
- **Viewer**: Read-only access to all data, search functionality
- **Editor**: Can create/edit rooms, units, items; can move items
- **Admin**: Full access including user management and deletions

### Offline-First Design
This system is designed to run on a private network with no internet access.
All dependencies are bundled locally.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_hosts.split(",") if settings.allowed_hosts != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint for monitoring.

    Returns:
        dict: Status information including database connectivity
    """
    return {
        "status": "healthy",
        "service": "inventory-manager-api",
        "version": "1.0.0"
    }
