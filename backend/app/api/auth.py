"""
Authentication API routes.
"""
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.config import get_settings
from app.models.user import User, UserRole
from app.models.item import Item
from app.models.room import Room
from app.models.storage_unit import StorageUnit
from app.schemas.user import UserCreate, UserResponse, UserWithStats, UserUpdate, Token
from app.api.deps import get_current_user, require_role

router = APIRouter()
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Consider user online if active within last 5 minutes
ONLINE_THRESHOLD_MINUTES = 5


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)]
):
    """Login and get access token."""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    # Update last active time
    user.last_active = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Annotated[Session, Depends(get_db)]
):
    """Register a new user (first user becomes admin)."""
    # Check if username or email already exists
    existing = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )

    # First user becomes admin
    user_count = db.query(User).count()
    role = UserRole.ADMIN if user_count == 0 else user_data.role

    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get current user info."""
    return current_user


@router.get("/users", response_model=List[UserWithStats])
async def list_users(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))]
):
    """List all users with activity stats (admin only)."""
    users = db.query(User).all()
    now = datetime.now(timezone.utc)
    threshold = now - timedelta(minutes=ONLINE_THRESHOLD_MINUTES)

    result = []
    for user in users:
        # Handle timezone-naive datetimes from SQLite
        is_online = False
        if user.last_active:
            last_active = user.last_active
            if last_active.tzinfo is None:
                last_active = last_active.replace(tzinfo=timezone.utc)
            is_online = last_active > threshold

        result.append(UserWithStats(
            id=user.id,
            username=user.username,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_active=user.last_active,
            edit_count=user.edit_count or 0,
            is_online=is_online
        ))
    return result


@router.get("/stats")
async def get_admin_stats(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))]
):
    """Get admin dashboard statistics."""
    now = datetime.now(timezone.utc)
    threshold = now - timedelta(minutes=ONLINE_THRESHOLD_MINUTES)

    # Count users online (handle timezone-naive datetimes)
    all_users = db.query(User).filter(User.is_active == True).all()
    online_count = 0
    for user in all_users:
        if user.last_active:
            last_active = user.last_active
            if last_active.tzinfo is None:
                last_active = last_active.replace(tzinfo=timezone.utc)
            if last_active > threshold:
                online_count += 1

    # Total counts
    total_users = db.query(User).count()
    total_rooms = db.query(Room).count()
    total_storage_units = db.query(StorageUnit).count()
    total_items = db.query(Item).filter(Item.status == 'active').count()

    # Recent activity - users by edit count
    top_editors = db.query(User).filter(
        User.edit_count > 0
    ).order_by(User.edit_count.desc()).limit(5).all()

    return {
        "online_users": online_count,
        "total_users": total_users,
        "total_rooms": total_rooms,
        "total_storage_units": total_storage_units,
        "total_items": total_items,
        "top_editors": [
            {"username": u.username, "edit_count": u.edit_count}
            for u in top_editors
        ]
    }


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))]
):
    """Update a user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.post("/heartbeat")
async def heartbeat(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Update user's last active timestamp (for online status tracking)."""
    current_user.last_active = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}
