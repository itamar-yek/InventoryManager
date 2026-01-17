"""
Tests for item endpoints including search and movement.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.room import Room
from app.models.storage_unit import StorageUnit, StorageUnitType
from app.models.item import Item, ItemStatus
from app.models.item_movement import ItemMovement


class TestItems:
    """Item endpoint tests."""

    @pytest.fixture
    def room_with_unit(self, db: Session):
        """Create a room with a storage unit for testing."""
        room = Room(name="Test Room", width=10, height=10)
        db.add(room)
        db.commit()
        db.refresh(room)

        unit = StorageUnit(
            room_id=room.id,
            label="Cabinet A",
            type=StorageUnitType.CABINET,
            x=1, y=1, width=2, height=1
        )
        db.add(unit)
        db.commit()
        db.refresh(unit)

        return {"room": room, "unit": unit}

    def test_create_item(self, client: TestClient, editor_headers: dict, room_with_unit: dict):
        """Editor should be able to create an item."""
        unit = room_with_unit["unit"]
        response = client.post(
            "/api/items",
            headers=editor_headers,
            json={
                "name": "Test Item",
                "storage_unit_id": str(unit.id),
                "unit_catalog_number": "CAT-001",
                "catalog_number": "ALT-001",
                "description": "A test item",
                "quantity": 5
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Item"
        assert data["unit_catalog_number"] == "CAT-001"
        assert data["quantity"] == 5

    def test_create_item_requires_location(self, client: TestClient, editor_headers: dict):
        """Item must have a location."""
        response = client.post(
            "/api/items",
            headers=editor_headers,
            json={"name": "No Location Item"}
        )
        assert response.status_code == 400

    def test_create_item_viewer_forbidden(self, client: TestClient, viewer_headers: dict, room_with_unit: dict):
        """Viewer should not be able to create items."""
        unit = room_with_unit["unit"]
        response = client.post(
            "/api/items",
            headers=viewer_headers,
            json={
                "name": "Test Item",
                "storage_unit_id": str(unit.id)
            }
        )
        assert response.status_code == 403

    def test_search_items_by_name(self, client: TestClient, editor_headers: dict, room_with_unit: dict, db: Session):
        """Should find items by name."""
        unit = room_with_unit["unit"]
        db.add_all([
            Item(name="Red Widget", storage_unit_id=unit.id),
            Item(name="Blue Widget", storage_unit_id=unit.id),
            Item(name="Green Gadget", storage_unit_id=unit.id),
        ])
        db.commit()

        response = client.get("/api/items/search?query=widget", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

    def test_search_items_by_catalog_number(self, client: TestClient, editor_headers: dict, room_with_unit: dict, db: Session):
        """Should find items by catalog number."""
        unit = room_with_unit["unit"]
        db.add_all([
            Item(name="Item 1", unit_catalog_number="ABC-123", storage_unit_id=unit.id),
            Item(name="Item 2", unit_catalog_number="XYZ-456", storage_unit_id=unit.id),
            Item(name="Item 3", catalog_number="ABC-789", storage_unit_id=unit.id),
        ])
        db.commit()

        response = client.get("/api/items/search?query=ABC", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2  # ABC-123 and ABC-789

    def test_search_items_case_insensitive(self, client: TestClient, editor_headers: dict, room_with_unit: dict, db: Session):
        """Search should be case-insensitive."""
        unit = room_with_unit["unit"]
        db.add(Item(name="UPPERCASE ITEM", storage_unit_id=unit.id))
        db.commit()

        response = client.get("/api/items/search?query=uppercase", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    def test_move_item(self, client: TestClient, editor_headers: dict, room_with_unit: dict, db: Session):
        """Editor should be able to move an item."""
        unit1 = room_with_unit["unit"]

        # Create second unit
        unit2 = StorageUnit(
            room_id=room_with_unit["room"].id,
            label="Cabinet B",
            type=StorageUnitType.CABINET,
            x=5, y=1, width=2, height=1
        )
        db.add(unit2)
        db.commit()
        db.refresh(unit2)

        # Create item in first unit
        item = Item(name="Movable Item", storage_unit_id=unit1.id)
        db.add(item)
        db.commit()
        db.refresh(item)

        # Move item to second unit
        response = client.post(
            f"/api/items/{item.id}/move",
            headers=editor_headers,
            json={
                "to_storage_unit_id": str(unit2.id),
                "reason": "Reorganizing"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["storage_unit_id"] == str(unit2.id)

        # Verify movement was recorded
        movement = db.query(ItemMovement).filter(ItemMovement.item_id == item.id).first()
        assert movement is not None
        assert movement.from_storage_unit_id == unit1.id
        assert movement.to_storage_unit_id == unit2.id
        assert movement.reason == "Reorganizing"

    def test_get_item_history(self, client: TestClient, editor_headers: dict, room_with_unit: dict, db: Session):
        """Should return movement history for an item."""
        unit = room_with_unit["unit"]

        # Create item
        item = Item(name="History Item", storage_unit_id=unit.id)
        db.add(item)
        db.commit()
        db.refresh(item)

        # Add some movement history
        db.add_all([
            ItemMovement(item_id=item.id, to_storage_unit_id=unit.id, reason="Initial placement"),
            ItemMovement(item_id=item.id, from_storage_unit_id=unit.id, reason="Moved"),
        ])
        db.commit()

        response = client.get(f"/api/items/{item.id}/history", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_soft_delete_item(self, client: TestClient, editor_headers: dict, room_with_unit: dict, db: Session):
        """Deleting an item should soft delete it."""
        unit = room_with_unit["unit"]
        item = Item(name="To Delete", storage_unit_id=unit.id)
        db.add(item)
        db.commit()
        db.refresh(item)

        response = client.delete(f"/api/items/{item.id}", headers=editor_headers)
        assert response.status_code == 204

        # Item should still exist but be marked as deleted
        db.refresh(item)
        assert item.status == ItemStatus.DELETED
        assert item.deleted_at is not None

    def test_search_excludes_deleted(self, client: TestClient, editor_headers: dict, room_with_unit: dict, db: Session):
        """Search should exclude deleted items by default."""
        unit = room_with_unit["unit"]
        db.add_all([
            Item(name="Active Item", storage_unit_id=unit.id, status=ItemStatus.ACTIVE),
            Item(name="Deleted Item", storage_unit_id=unit.id, status=ItemStatus.DELETED),
        ])
        db.commit()

        response = client.get("/api/items/search?query=Item", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Active Item"

    def test_search_with_location_info(self, client: TestClient, editor_headers: dict, room_with_unit: dict, db: Session):
        """Search results should include location information."""
        room = room_with_unit["room"]
        unit = room_with_unit["unit"]

        item = Item(name="Located Item", storage_unit_id=unit.id)
        db.add(item)
        db.commit()

        response = client.get("/api/items/search?query=Located", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1

        result = data["items"][0]
        assert result["room_name"] == room.name
        assert result["storage_unit_label"] == unit.label
