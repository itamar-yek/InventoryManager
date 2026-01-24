"""
Room schemas for API validation.
"""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import List, Optional, Literal


# Type definitions using Literal for validation
RoomShapeType = Literal["rectangle", "l_shape"]
DoorWallType = Literal["north", "south", "east", "west", "cutout_horizontal", "cutout_vertical"]
CutoutCornerType = Literal["top_left", "top_right", "bottom_left", "bottom_right"]


class DoorConfig(BaseModel):
    """Door configuration schema."""
    wall: DoorWallType
    position: float = Field(default=0.5, ge=0.0, le=1.0, description="Position along wall (0.0 to 1.0)")
    width: float = Field(default=1.0, gt=0, description="Door width in meters")


class LShapeConfig(BaseModel):
    """L-shape room configuration."""
    cutout_width: float = Field(..., gt=0, description="Width of the cutout section")
    cutout_height: float = Field(..., gt=0, description="Height of the cutout section")
    cutout_corner: CutoutCornerType = Field(
        default="top_right",
        description="Corner where the cutout is located"
    )


class RoomBase(BaseModel):
    """Base room schema."""
    name: str = Field(..., min_length=1, max_length=100)
    building: Optional[str] = Field(None, max_length=100)
    width: Optional[float] = Field(None, gt=0)
    height: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = None
    # Shape configuration
    shape: RoomShapeType = Field(default="rectangle")
    shape_cutout_width: Optional[float] = Field(None, gt=0)
    shape_cutout_height: Optional[float] = Field(None, gt=0)
    shape_cutout_corner: Optional[CutoutCornerType] = None
    # Door configuration
    door_wall: Optional[DoorWallType] = None
    door_position: Optional[float] = Field(None, ge=0.0, le=1.0)
    door_width: Optional[float] = Field(None, gt=0)


class RoomCreate(RoomBase):
    """Schema for creating a room."""
    pass


class RoomUpdate(BaseModel):
    """Schema for updating a room."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    building: Optional[str] = None
    width: Optional[float] = Field(None, gt=0)
    height: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = None
    # Shape configuration
    shape: Optional[RoomShapeType] = None
    shape_cutout_width: Optional[float] = Field(None, gt=0)
    shape_cutout_height: Optional[float] = Field(None, gt=0)
    shape_cutout_corner: Optional[CutoutCornerType] = None
    # Door configuration
    door_wall: Optional[DoorWallType] = None
    door_position: Optional[float] = Field(None, ge=0.0, le=1.0)
    door_width: Optional[float] = Field(None, gt=0)


class RoomResponse(RoomBase):
    """Schema for room response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StorageUnitBrief(BaseModel):
    """Brief storage unit info for room response."""
    id: UUID
    label: str
    type: str
    x: float
    y: float
    width: float
    height: float
    rotation: int

    class Config:
        from_attributes = True


class BlockBrief(BaseModel):
    """Brief block info for room response."""
    id: UUID
    label: str
    x: float
    y: float
    width: float
    height: float
    rotation: int

    class Config:
        from_attributes = True


class RoomWithUnits(RoomResponse):
    """Room response with storage units and blocks."""
    storage_units: List[StorageUnitBrief] = []
    blocks: List[BlockBrief] = []
