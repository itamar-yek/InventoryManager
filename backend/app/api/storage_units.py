"""
Storage Unit API routes.
"""
from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.storage_unit import StorageUnit
from app.models.room import Room
from app.models.item import Item
from app.models.user import User, UserRole
from app.schemas.storage_unit import StorageUnitCreate, StorageUnitUpdate, StorageUnitResponse
from app.api.deps import get_current_user, require_role

router = APIRouter()


@router.get("/", response_model=List[StorageUnitResponse])
async def list_storage_units(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))],
    room_id: Optional[UUID] = None
):
    """List storage units, optionally filtered by room (requires editor role)."""
    query = db.query(StorageUnit)
    if room_id:
        query = query.filter(StorageUnit.room_id == room_id)
    return query.order_by(StorageUnit.label).all()


@router.post("/", response_model=StorageUnitResponse, status_code=status.HTTP_201_CREATED)
async def create_storage_unit(
    unit_data: StorageUnitCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Create a new storage unit."""
    # Verify room exists
    room = db.query(Room).filter(Room.id == unit_data.room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    unit = StorageUnit(**unit_data.model_dump())
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/{unit_id}", response_model=StorageUnitResponse)
async def get_storage_unit(
    unit_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Get a storage unit (requires editor role)."""
    unit = db.query(StorageUnit).filter(StorageUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storage unit not found"
        )
    return unit


@router.put("/{unit_id}", response_model=StorageUnitResponse)
async def update_storage_unit(
    unit_id: UUID,
    unit_data: StorageUnitUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Update a storage unit."""
    unit = db.query(StorageUnit).filter(StorageUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storage unit not found"
        )

    update_data = unit_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(unit, field, value)

    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_unit(
    unit_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Delete a storage unit (editor or admin)."""
    unit = db.query(StorageUnit).filter(StorageUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storage unit not found"
        )

    # Check if there are items in this unit
    item_count = db.query(Item).filter(Item.storage_unit_id == unit_id).count()
    if item_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete storage unit with {item_count} item(s). Move or delete items first."
        )

    db.delete(unit)
    db.commit()
