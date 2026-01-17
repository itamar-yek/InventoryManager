"""
Item model for inventory items.
"""
import enum
from sqlalchemy import Column, String, Text, Integer, Enum, ForeignKey, DateTime, CheckConstraint, JSON
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, GUID


class ItemStatus(str, enum.Enum):
    """Item status enumeration."""
    ACTIVE = "active"
    DELETED = "deleted"


class Item(BaseModel):
    """Item model for inventory items."""
    __tablename__ = "items"

    # Location - either storage_unit_id OR compartment_id (not both)
    storage_unit_id = Column(
        GUID(),
        ForeignKey("storage_units.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    compartment_id = Column(
        GUID(),
        ForeignKey("compartments.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Item details
    name = Column(String(255), nullable=False, index=True)
    unit_catalog_number = Column(String(100), nullable=True, index=True)
    catalog_number = Column(String(100), nullable=True, index=True)
    serial_number = Column(String(100), nullable=True, index=True)
    owned_by = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    projects = Column(JSON, default=list, nullable=False)  # List of project names
    status = Column(Enum(ItemStatus), default=ItemStatus.ACTIVE, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    storage_unit = relationship(
        "StorageUnit",
        back_populates="items",
        foreign_keys=[storage_unit_id]
    )
    compartment = relationship(
        "Compartment",
        back_populates="items",
        foreign_keys=[compartment_id]
    )
    movements = relationship("ItemMovement", back_populates="item")

    __table_args__ = (
        # Active items must have a location (either storage_unit or compartment)
        # Use deleted_at IS NOT NULL instead of status enum check to avoid PostgreSQL enum issues
        CheckConstraint(
            "(deleted_at IS NOT NULL) OR (storage_unit_id IS NOT NULL OR compartment_id IS NOT NULL)",
            name="check_item_has_location"
        ),
        # Cannot have both storage_unit_id and compartment_id
        CheckConstraint(
            "NOT (storage_unit_id IS NOT NULL AND compartment_id IS NOT NULL)",
            name="check_item_single_location"
        ),
    )
