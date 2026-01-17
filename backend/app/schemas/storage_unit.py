"""
Storage unit schemas for API validation.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.storage_unit import StorageUnitType


class StorageUnitBase(BaseModel):
    """Base storage unit schema."""
    label: str = Field(..., min_length=1, max_length=100)
    type: StorageUnitType = StorageUnitType.CABINET
    x: float = Field(default=0, ge=0)
    y: float = Field(default=0, ge=0)
    width: float = Field(default=100, gt=0)
    height: float = Field(default=100, gt=0)
    rotation: int = Field(default=0, ge=0, le=270)
    notes: Optional[str] = None


class StorageUnitCreate(StorageUnitBase):
    """Schema for creating a storage unit."""
    room_id: UUID


class StorageUnitUpdate(BaseModel):
    """Schema for updating a storage unit."""
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[StorageUnitType] = None
    x: Optional[float] = Field(None, ge=0)
    y: Optional[float] = Field(None, ge=0)
    width: Optional[float] = Field(None, gt=0)
    height: Optional[float] = Field(None, gt=0)
    rotation: Optional[int] = Field(None, ge=0, le=270)
    notes: Optional[str] = None


class StorageUnitResponse(StorageUnitBase):
    """Schema for storage unit response."""
    id: UUID
    room_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
