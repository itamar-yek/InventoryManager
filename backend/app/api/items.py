"""
Item API routes with search and movement tracking.
"""
from typing import Annotated, List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, text, cast, String

from app.database import get_db
from app.config import get_settings
from app.models.item import Item, ItemStatus
from app.models.item_movement import ItemMovement
from app.models.storage_unit import StorageUnit
from app.models.compartment import Compartment
from app.models.room import Room
from app.models.user import User, UserRole
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse, ItemMove, ItemSearch
from app.api.deps import get_current_user, require_role

router = APIRouter()


@router.get("/search")
async def search_items(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))],
    query: Optional[str] = None,
    room_id: Optional[UUID] = None,
    storage_unit_id: Optional[UUID] = None,
    status: ItemStatus = ItemStatus.ACTIVE,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0)
):
    """
    Search items by name, catalog numbers, description, projects, and storage unit label.
    Returns items with location information.
    """
    q = db.query(Item).filter(Item.status == status)

    # Track if we need to do Python-side project filtering
    search_query_lower = query.lower() if query else None

    # Text search - join with StorageUnit to search on unit label
    if query:
        search_term = f"%{query}%"
        q = q.outerjoin(StorageUnit, Item.storage_unit_id == StorageUnit.id)

        # Build filter conditions for standard text fields
        filters = [
            Item.name.ilike(search_term),
            Item.unit_catalog_number.ilike(search_term),
            Item.catalog_number.ilike(search_term),
            Item.serial_number.ilike(search_term),
            Item.description.ilike(search_term),
            Item.owned_by.ilike(search_term),
            StorageUnit.label.ilike(search_term)
        ]

        # Add projects search - use PostgreSQL-specific jsonb function for proper Unicode support
        settings = get_settings()
        if settings.database_url.startswith("postgresql"):
            # PostgreSQL: use jsonb_array_elements_text for proper Unicode/Hebrew support
            filters.append(
                text("EXISTS (SELECT 1 FROM jsonb_array_elements_text(items.projects::jsonb) AS proj WHERE proj ILIKE :search_term)").bindparams(search_term=search_term)
            )

        q = q.filter(or_(*filters))

    # Filter by storage unit
    if storage_unit_id:
        q = q.filter(
            or_(
                Item.storage_unit_id == storage_unit_id,
                Item.compartment.has(Compartment.storage_unit_id == storage_unit_id)
            )
        )

    # Filter by room (requires joining if not already joined)
    if room_id:
        if not query:  # Only join if not already joined above
            q = q.join(StorageUnit, Item.storage_unit_id == StorageUnit.id, isouter=True)
        q = q.filter(StorageUnit.room_id == room_id)

    # For SQLite, we need to also search projects in Python since SQLite can't handle Unicode in JSON well
    settings = get_settings()
    is_sqlite = not settings.database_url.startswith("postgresql")

    if is_sqlite and search_query_lower:
        # Get IDs of items matching the SQL query
        sql_matched_ids = set(item.id for item in q.all())

        # Also search for items where any project matches the query (Python-side)
        all_items_with_projects = db.query(Item).filter(
            Item.status == status,
            Item.projects != None
        ).all()

        project_matched_ids = set()
        for item in all_items_with_projects:
            if item.projects:
                for project in item.projects:
                    if search_query_lower in project.lower():
                        project_matched_ids.add(item.id)
                        break

        # Combine both sets
        all_matched_ids = sql_matched_ids | project_matched_ids

        # Re-query with combined IDs
        if all_matched_ids:
            q = db.query(Item).filter(Item.id.in_(all_matched_ids))
        else:
            q = db.query(Item).filter(Item.id == None)  # Empty result

    total = q.count()
    items = q.order_by(Item.name).offset(offset).limit(limit).all()

    # Enrich with location info
    results = []
    for item in items:
        result = {
            **item.to_dict(),
            "room_id": None,
            "room_name": None,
            "room_building": None,
            "storage_unit_id": None,
            "storage_unit_label": None,
            "storage_unit_type": None,
            "compartment_name": None,
            "location_path": None  # Human-readable full path
        }

        # Build location information
        location_parts = []

        if item.storage_unit:
            result["storage_unit_id"] = str(item.storage_unit.id)
            result["storage_unit_label"] = item.storage_unit.label
            result["storage_unit_type"] = item.storage_unit.type
            location_parts.append(item.storage_unit.label)
            if item.storage_unit.room:
                result["room_id"] = str(item.storage_unit.room.id)
                result["room_name"] = item.storage_unit.room.name
                result["room_building"] = item.storage_unit.room.building
                room_name = item.storage_unit.room.name
                if item.storage_unit.room.building:
                    room_name = f"{item.storage_unit.room.building} - {room_name}"
                location_parts.insert(0, room_name)
        elif item.compartment:
            result["compartment_name"] = item.compartment.name
            location_parts.append(item.compartment.name)
            if item.compartment.storage_unit:
                result["storage_unit_id"] = str(item.compartment.storage_unit.id)
                result["storage_unit_label"] = item.compartment.storage_unit.label
                result["storage_unit_type"] = item.compartment.storage_unit.type
                location_parts.insert(0, item.compartment.storage_unit.label)
                if item.compartment.storage_unit.room:
                    result["room_id"] = str(item.compartment.storage_unit.room.id)
                    result["room_name"] = item.compartment.storage_unit.room.name
                    result["room_building"] = item.compartment.storage_unit.room.building
                    room_name = item.compartment.storage_unit.room.name
                    if item.compartment.storage_unit.room.building:
                        room_name = f"{item.compartment.storage_unit.room.building} - {room_name}"
                    location_parts.insert(0, room_name)

        result["location_path"] = " > ".join(location_parts) if location_parts else None

        results.append(result)

    return {"items": results, "total": total, "limit": limit, "offset": offset}


@router.get("/", response_model=List[ItemResponse])
async def list_items(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))],
    storage_unit_id: Optional[UUID] = None,
    compartment_id: Optional[UUID] = None,
    status: ItemStatus = ItemStatus.ACTIVE
):
    """List items, optionally filtered by location (requires editor role)."""
    query = db.query(Item).filter(Item.status == status)

    if storage_unit_id:
        query = query.filter(Item.storage_unit_id == storage_unit_id)
    if compartment_id:
        query = query.filter(Item.compartment_id == compartment_id)

    return query.order_by(Item.name).all()


@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    item_data: ItemCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Create a new item."""
    # Validate location
    if item_data.storage_unit_id and item_data.compartment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item cannot be in both a storage unit and a compartment"
        )
    if not item_data.storage_unit_id and not item_data.compartment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item must have a location (storage unit or compartment)"
        )

    # Verify location exists
    if item_data.storage_unit_id:
        unit = db.query(StorageUnit).filter(StorageUnit.id == item_data.storage_unit_id).first()
        if not unit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Storage unit not found")
    if item_data.compartment_id:
        comp = db.query(Compartment).filter(Compartment.id == item_data.compartment_id).first()
        if not comp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compartment not found")

    item = Item(**item_data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Get an item (requires editor role)."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@router.put("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: UUID,
    item_data: ItemUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Update an item (not location - use /move endpoint)."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.post("/{item_id}/move", response_model=ItemResponse)
async def move_item(
    item_id: UUID,
    move_data: ItemMove,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Move an item to a new location and record the movement."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Validate new location
    if move_data.to_storage_unit_id and move_data.to_compartment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot move to both storage unit and compartment"
        )
    if not move_data.to_storage_unit_id and not move_data.to_compartment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must specify destination (storage unit or compartment)"
        )

    # Verify destination exists
    if move_data.to_storage_unit_id:
        unit = db.query(StorageUnit).filter(StorageUnit.id == move_data.to_storage_unit_id).first()
        if not unit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination storage unit not found")
    if move_data.to_compartment_id:
        comp = db.query(Compartment).filter(Compartment.id == move_data.to_compartment_id).first()
        if not comp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination compartment not found")

    # Record movement
    movement = ItemMovement(
        item_id=item.id,
        user_id=current_user.id,
        from_storage_unit_id=item.storage_unit_id,
        from_compartment_id=item.compartment_id,
        to_storage_unit_id=move_data.to_storage_unit_id,
        to_compartment_id=move_data.to_compartment_id,
        reason=move_data.reason
    )
    db.add(movement)

    # Update item location
    item.storage_unit_id = move_data.to_storage_unit_id
    item.compartment_id = move_data.to_compartment_id

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Soft delete an item."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    item.status = ItemStatus.DELETED
    item.deleted_at = datetime.utcnow()
    db.commit()


@router.get("/{item_id}/history")
async def get_item_history(
    item_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Get movement history for an item (requires editor role)."""
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    movements = db.query(ItemMovement).filter(
        ItemMovement.item_id == item_id
    ).order_by(ItemMovement.created_at.desc()).all()

    return [m.to_dict() for m in movements]
