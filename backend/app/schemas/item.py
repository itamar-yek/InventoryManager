"""
Item schemas for API validation.
"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, List
from app.models.item import ItemStatus


class ItemBase(BaseModel):
    """Base item schema."""
    name: str = Field(..., min_length=1, max_length=255)
    unit_catalog_number: Optional[str] = Field(None, max_length=100)
    catalog_number: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    owned_by: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    quantity: int = Field(default=1, ge=0)
    projects: List[str] = Field(default_factory=list)


class ItemCreate(ItemBase):
    """Schema for creating an item."""
    storage_unit_id: Optional[UUID] = None
    compartment_id: Optional[UUID] = None


class ItemUpdate(BaseModel):
    """Schema for updating an item."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    unit_catalog_number: Optional[str] = None
    catalog_number: Optional[str] = None
    serial_number: Optional[str] = None
    owned_by: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    projects: Optional[List[str]] = None


class ItemResponse(ItemBase):
    """Schema for item response."""
    id: UUID
    storage_unit_id: Optional[UUID]
    compartment_id: Optional[UUID]
    status: ItemStatus
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

    class Config:
        from_attributes = True


class ItemMove(BaseModel):
    """Schema for moving an item to a new location."""
    to_storage_unit_id: Optional[UUID] = None
    to_compartment_id: Optional[UUID] = None
    reason: Optional[str] = None


class ItemSearch(BaseModel):
    """Schema for item search parameters."""
    query: Optional[str] = None
    room_id: Optional[UUID] = None
    storage_unit_id: Optional[UUID] = None
    status: Optional[ItemStatus] = ItemStatus.ACTIVE
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class ItemSearchResult(ItemResponse):
    """Schema for item search result with location info."""
    room_id: Optional[UUID] = None
    room_name: Optional[str] = None
    storage_unit_label: Optional[str] = None
    compartment_name: Optional[str] = None


# =============================================================================
# Batch Operation Schemas
# =============================================================================

class BatchItemDelete(BaseModel):
    """Schema for batch delete operation."""
    item_ids: List[UUID] = Field(..., min_length=1, max_length=100)


class BatchItemMove(BaseModel):
    """Schema for batch move operation."""
    item_ids: List[UUID] = Field(..., min_length=1, max_length=100)
    to_storage_unit_id: UUID
    reason: Optional[str] = None


class MoveAllItemsRequest(BaseModel):
    """Schema for moving all items from a storage unit."""
    to_storage_unit_id: UUID
    reason: Optional[str] = None


class BatchOperationResult(BaseModel):
    """Schema for batch operation results."""
    success_count: int
    moved_count: Optional[int] = None  # For move operations
