"""
Block schemas for API validation.
Blocks are visual obstacles that cannot hold items.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class BlockBase(BaseModel):
    """Base block schema."""
    label: str = Field(..., min_length=1, max_length=100)
    x: float = Field(default=0, ge=0)
    y: float = Field(default=0, ge=0)
    width: float = Field(default=1, gt=0)
    height: float = Field(default=1, gt=0)
    rotation: int = Field(default=0, ge=0, le=270)
    notes: Optional[str] = None


class BlockCreate(BlockBase):
    """Schema for creating a block."""
    room_id: UUID


class BlockUpdate(BaseModel):
    """Schema for updating a block."""
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    x: Optional[float] = Field(None, ge=0)
    y: Optional[float] = Field(None, ge=0)
    width: Optional[float] = Field(None, gt=0)
    height: Optional[float] = Field(None, gt=0)
    rotation: Optional[int] = Field(None, ge=0, le=270)
    notes: Optional[str] = None


class BlockResponse(BlockBase):
    """Schema for block response."""
    id: UUID
    room_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
