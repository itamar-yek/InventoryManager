"""
Block API routes.
Blocks are visual obstacles that cannot hold items.
"""
from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.block import Block
from app.models.room import Room
from app.models.user import User, UserRole
from app.schemas.block import BlockCreate, BlockUpdate, BlockResponse
from app.api.deps import require_role

router = APIRouter()


@router.get("/", response_model=List[BlockResponse])
async def list_blocks(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))],
    room_id: Optional[UUID] = None
):
    """List blocks, optionally filtered by room (requires editor role)."""
    query = db.query(Block)
    if room_id:
        query = query.filter(Block.room_id == room_id)
    return query.order_by(Block.label).all()


@router.post("/", response_model=BlockResponse, status_code=status.HTTP_201_CREATED)
async def create_block(
    block_data: BlockCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Create a new block."""
    # Verify room exists
    room = db.query(Room).filter(Room.id == block_data.room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )

    block = Block(**block_data.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


@router.get("/{block_id}", response_model=BlockResponse)
async def get_block(
    block_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Get a block (requires editor role)."""
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )
    return block


@router.put("/{block_id}", response_model=BlockResponse)
async def update_block(
    block_id: UUID,
    block_data: BlockUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Update a block."""
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )

    update_data = block_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(block, field, value)

    db.commit()
    db.refresh(block)
    return block


@router.delete("/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_block(
    block_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role(UserRole.EDITOR))]
):
    """Delete a block."""
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )

    db.delete(block)
    db.commit()
