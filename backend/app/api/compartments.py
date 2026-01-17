"""
Compartment API routes.
"""
from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.compartment import Compartment
from app.models.storage_unit import StorageUnit
from app.models.user import User, UserRole
from app.schemas.compartment import CompartmentCreate, CompartmentUpdate, CompartmentResponse
from app.api.deps import get_current_user, require_role

router = APIRouter()


@router.get("/", response_model=List[CompartmentResponse])
async def list_compartments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))],
    storage_unit_id: Optional[UUID] = None
):
    """List compartments, optionally filtered by storage unit (requires editor role)."""
    query = db.query(Compartment)
    if storage_unit_id:
        query = query.filter(Compartment.storage_unit_id == storage_unit_id)
    return query.order_by(Compartment.index_order).all()


@router.post("/", response_model=CompartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_compartment(
    compartment_data: CompartmentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Create a new compartment."""
    # Verify storage unit exists
    unit = db.query(StorageUnit).filter(StorageUnit.id == compartment_data.storage_unit_id).first()
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storage unit not found"
        )

    compartment = Compartment(**compartment_data.model_dump())
    db.add(compartment)
    db.commit()
    db.refresh(compartment)
    return compartment


@router.get("/{compartment_id}", response_model=CompartmentResponse)
async def get_compartment(
    compartment_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Get a compartment (requires editor role)."""
    compartment = db.query(Compartment).filter(Compartment.id == compartment_id).first()
    if not compartment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compartment not found"
        )
    return compartment


@router.put("/{compartment_id}", response_model=CompartmentResponse)
async def update_compartment(
    compartment_id: UUID,
    compartment_data: CompartmentUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Update a compartment."""
    compartment = db.query(Compartment).filter(Compartment.id == compartment_id).first()
    if not compartment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compartment not found"
        )

    update_data = compartment_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(compartment, field, value)

    db.commit()
    db.refresh(compartment)
    return compartment


@router.delete("/{compartment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_compartment(
    compartment_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))]
):
    """Delete a compartment (admin only)."""
    compartment = db.query(Compartment).filter(Compartment.id == compartment_id).first()
    if not compartment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compartment not found"
        )

    db.delete(compartment)
    db.commit()
