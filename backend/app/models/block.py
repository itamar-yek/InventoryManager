"""
Block model for obstacles/furniture that are not storage units.
Blocks are visual elements that can be placed and moved in rooms,
but they cannot hold items and are excluded from inventory exports.
"""
from sqlalchemy import Column, String, Float, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.models.base import BaseModel, GUID


class Block(BaseModel):
    """Block model - visual obstacle that is not a storage unit."""
    __tablename__ = "blocks"

    room_id = Column(GUID(), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(100), nullable=False)

    # Position on room layout (same coordinate system as storage units)
    x = Column(Float, default=0, nullable=False)
    y = Column(Float, default=0, nullable=False)
    width = Column(Float, default=1, nullable=False)
    height = Column(Float, default=1, nullable=False)
    rotation = Column(Integer, default=0, nullable=False)  # 0, 90, 180, 270

    notes = Column(Text, nullable=True)

    # Relationships
    room = relationship("Room", back_populates="blocks")
