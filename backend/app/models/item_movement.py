"""
ItemMovement model for audit trail of item location changes.
"""
from sqlalchemy import Column, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, GUID


class ItemMovement(BaseModel):
    """Audit trail for item location changes."""
    __tablename__ = "item_movements"

    item_id = Column(
        GUID(),
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # From location
    from_storage_unit_id = Column(GUID(), nullable=True)
    from_compartment_id = Column(GUID(), nullable=True)

    # To location
    to_storage_unit_id = Column(GUID(), nullable=True)
    to_compartment_id = Column(GUID(), nullable=True)

    reason = Column(Text, nullable=True)

    # Relationships
    item = relationship("Item", back_populates="movements")
    user = relationship("User", back_populates="item_movements")
