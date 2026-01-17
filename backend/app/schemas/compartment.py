"""
Compartment schemas for API validation.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class CompartmentBase(BaseModel):
    """Base compartment schema."""
    name: str = Field(..., min_length=1, max_length=100)
    index_order: int = Field(default=0, ge=0)


class CompartmentCreate(CompartmentBase):
    """Schema for creating a compartment."""
    storage_unit_id: UUID


class CompartmentUpdate(BaseModel):
    """Schema for updating a compartment."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    index_order: Optional[int] = Field(None, ge=0)


class CompartmentResponse(CompartmentBase):
    """Schema for compartment response."""
    id: UUID
    storage_unit_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
