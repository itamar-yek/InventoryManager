"""
Room API routes.
"""
import csv
import io
from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.room import Room
from app.models.item import Item, ItemStatus
from app.models.user import User, UserRole
from app.schemas.room import RoomCreate, RoomUpdate, RoomResponse, RoomWithUnits
from app.api.deps import get_current_user, get_optional_user, require_role

router = APIRouter()


@router.get("/", response_model=List[RoomResponse])
async def list_rooms(
    db: Annotated[Session, Depends(get_db)]
):
    """List all rooms (public access)."""
    return db.query(Room).order_by(Room.name).all()


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Create a new room."""
    room = Room(**room_data.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


@router.get("/{room_id}", response_model=RoomWithUnits)
async def get_room(
    room_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Get a room with its storage units (requires editor role)."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    return room


@router.put("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: UUID,
    room_data: RoomUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Update a room."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    update_data = room_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(room, field, value)

    db.commit()
    db.refresh(room)
    return room


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.ADMIN))]
):
    """Delete a room (admin only)."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    db.delete(room)
    db.commit()


@router.get("/{room_id}/export")
async def export_room_csv(
    room_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Export room contents to CSV file (requires editor role)."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        'Storage Unit',
        'Unit Type',
        'Item Name',
        'Unit Catalog Number',
        'Catalog Number',
        'Serial Number',
        'Owned By',
        'Quantity',
        'Description'
    ])

    # Write data for each storage unit and its items
    for unit in room.storage_units:
        items = db.query(Item).filter(
            Item.storage_unit_id == unit.id,
            Item.status == ItemStatus.ACTIVE
        ).order_by(Item.name).all()

        if items:
            for item in items:
                writer.writerow([
                    unit.label,
                    unit.type.value if hasattr(unit.type, 'value') else unit.type,
                    item.name,
                    item.unit_catalog_number or '',
                    item.catalog_number or '',
                    item.serial_number or '',
                    item.owned_by or '',
                    item.quantity,
                    item.description or ''
                ])
        else:
            # Write unit even if empty
            writer.writerow([
                unit.label,
                unit.type.value if hasattr(unit.type, 'value') else unit.type,
                '(empty)',
                '',
                '',
                '',
                '',
                '',
                ''
            ])

    # Prepare response
    output.seek(0)
    filename = f"{room.name.replace(' ', '_')}_inventory.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
