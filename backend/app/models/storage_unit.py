"""
Storage Unit model for cabinets, desks, shelves, etc.
"""
import enum
from sqlalchemy import Column, String, Float, Text, Enum, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, GUID


class StorageUnitType(str, enum.Enum):
    """Types of storage units."""
    CABINET = "cabinet"
    DESK = "desk"
    SHELF = "shelf"
    DRAWER = "drawer"
    BOX = "box"
    OTHER = "other"


class StorageUnit(BaseModel):
    """Storage unit model (cabinet, desk, shelf, etc.)."""
    __tablename__ = "storage_units"

    room_id = Column(GUID(), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(StorageUnitType), default=StorageUnitType.CABINET, nullable=False)
    label = Column(String(100), nullable=False)

    # Position on room layout (SVG coordinates)
    x = Column(Float, default=0, nullable=False)
    y = Column(Float, default=0, nullable=False)
    width = Column(Float, default=100, nullable=False)
    height = Column(Float, default=100, nullable=False)
    rotation = Column(Integer, default=0, nullable=False)  # 0, 90, 180, 270

    notes = Column(Text, nullable=True)

    # Relationships
    room = relationship("Room", back_populates="storage_units")
    compartments = relationship(
        "Compartment",
        back_populates="storage_unit",
        cascade="all, delete-orphan"
    )
    items = relationship(
        "Item",
        back_populates="storage_unit",
        foreign_keys="Item.storage_unit_id"
    )
