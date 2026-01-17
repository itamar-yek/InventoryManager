"""
API routes for Inventory Manager.
"""
from fastapi import APIRouter
from app.api import auth, rooms, storage_units, compartments, items, blocks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
api_router.include_router(storage_units.router, prefix="/storage-units", tags=["Storage Units"])
api_router.include_router(compartments.router, prefix="/compartments", tags=["Compartments"])
api_router.include_router(items.router, prefix="/items", tags=["Items"])
api_router.include_router(blocks.router, prefix="/blocks", tags=["Blocks"])
