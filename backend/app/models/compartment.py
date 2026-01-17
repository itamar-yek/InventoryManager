"""
Compartment model for subdivisions within storage units.
"""
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, GUID


class Compartment(BaseModel):
    """Compartment model for drawers, shelves, sections within a storage unit."""
    __tablename__ = "compartments"

    storage_unit_id = Column(
        GUID(),
        ForeignKey("storage_units.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name = Column(String(100), nullable=False)
    index_order = Column(Integer, default=0, nullable=False)  # For ordering

    # Relationships
    storage_unit = relationship("StorageUnit", back_populates="compartments")
    items = relationship(
        "Item",
        back_populates="compartment",
        foreign_keys="Item.compartment_id"
    )
