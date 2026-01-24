"""
Room model for physical locations.
"""
from sqlalchemy import Column, String, Float, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Room(BaseModel):
    """Room model representing a physical location."""
    __tablename__ = "rooms"

    name = Column(String(100), nullable=False, index=True)
    building = Column(String(100), nullable=True)
    width = Column(Float, nullable=True)  # Room dimensions in meters
    height = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    # Room shape configuration
    # Stored as string: "rectangle" or "l_shape"
    shape = Column(String(20), default="rectangle", nullable=False)
    # For L-shape: dimensions of the cutout section
    shape_cutout_width = Column(Float, nullable=True)
    shape_cutout_height = Column(Float, nullable=True)
    # Corner where cutout is located: "top_left", "top_right", "bottom_left", "bottom_right"
    shape_cutout_corner = Column(String(20), nullable=True)

    # Door configuration
    # Stored as string: "north", "south", "east", "west", "cutout_horizontal", "cutout_vertical"
    door_wall = Column(String(20), nullable=True)
    door_position = Column(Float, nullable=True)  # Position along wall (0.0 to 1.0)
    door_width = Column(Float, default=1.0, nullable=True)  # Door width in meters

    # Relationships
    storage_units = relationship(
        "StorageUnit",
        back_populates="room",
        cascade="all, delete-orphan"
    )
    blocks = relationship(
        "Block",
        back_populates="room",
        cascade="all, delete-orphan"
    )
