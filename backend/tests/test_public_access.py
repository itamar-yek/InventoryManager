"""
Tests for public (anonymous) access and viewer restrictions.

Verifies that:
- Anyone can list rooms without authentication
- Viewers can only see rooms list (not room details, items, storage units, etc.)
- All other endpoints require editor role or higher
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.room import Room
from app.models.storage_unit import StorageUnit, StorageUnitType
from app.models.compartment import Compartment
from app.models.item import Item


class TestPublicAccess:
    """Test public access to read-only endpoints."""

    @pytest.fixture
    def sample_data(self, db: Session):
        """Create sample data for testing."""
        room = Room(name="Public Room", building="Building A", width=10, height=10)
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

        compartment = Compartment(
            storage_unit_id=unit.id,
            name="Drawer 1",
            index_order=0
        )
        db.add(compartment)
        db.commit()
        db.refresh(compartment)

        item = Item(
            name="Public Item",
            storage_unit_id=unit.id,
            unit_catalog_number="PUB-001"
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        return {"room": room, "unit": unit, "compartment": compartment, "item": item}

    def test_list_rooms_without_auth(self, client: TestClient, sample_data: dict):
        """Anyone should be able to list rooms without authentication."""
        response = client.get("/api/rooms")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Public Room"

    def test_get_room_requires_editor(self, client: TestClient, sample_data: dict):
        """Getting room details requires editor role."""
        room = sample_data["room"]
        response = client.get(f"/api/rooms/{room.id}")
        assert response.status_code == 401

    def test_list_storage_units_requires_editor(self, client: TestClient, sample_data: dict):
        """Listing storage units requires editor role."""
        room = sample_data["room"]
        response = client.get(f"/api/storage-units?room_id={room.id}")
        assert response.status_code == 401

    def test_get_storage_unit_requires_editor(self, client: TestClient, sample_data: dict):
        """Getting storage unit details requires editor role."""
        unit = sample_data["unit"]
        response = client.get(f"/api/storage-units/{unit.id}")
        assert response.status_code == 401

    def test_list_compartments_requires_editor(self, client: TestClient, sample_data: dict):
        """Listing compartments requires editor role."""
        unit = sample_data["unit"]
        response = client.get(f"/api/compartments?storage_unit_id={unit.id}")
        assert response.status_code == 401

    def test_get_compartment_requires_editor(self, client: TestClient, sample_data: dict):
        """Getting compartment details requires editor role."""
        compartment = sample_data["compartment"]
        response = client.get(f"/api/compartments/{compartment.id}")
        assert response.status_code == 401

    def test_list_items_requires_editor(self, client: TestClient, sample_data: dict):
        """Listing items requires editor role."""
        response = client.get("/api/items")
        assert response.status_code == 401

    def test_get_item_requires_editor(self, client: TestClient, sample_data: dict):
        """Getting item details requires editor role."""
        item = sample_data["item"]
        response = client.get(f"/api/items/{item.id}")
        assert response.status_code == 401

    def test_search_items_requires_editor(self, client: TestClient, sample_data: dict):
        """Searching items requires editor role."""
        response = client.get("/api/items/search?query=Public")
        assert response.status_code == 401

    def test_create_room_requires_auth(self, client: TestClient):
        """Creating a room should require authentication."""
        response = client.post("/api/rooms", json={"name": "New Room"})
        assert response.status_code == 401

    def test_create_item_requires_auth(self, client: TestClient, sample_data: dict):
        """Creating an item should require authentication."""
        unit = sample_data["unit"]
        response = client.post(
            "/api/items",
            json={"name": "New Item", "storage_unit_id": str(unit.id)}
        )
        assert response.status_code == 401

    def test_update_room_requires_auth(self, client: TestClient, sample_data: dict):
        """Updating a room should require authentication."""
        room = sample_data["room"]
        response = client.put(f"/api/rooms/{room.id}", json={"name": "Updated"})
        assert response.status_code == 401

    def test_delete_room_requires_auth(self, client: TestClient, sample_data: dict):
        """Deleting a room should require authentication."""
        room = sample_data["room"]
        response = client.delete(f"/api/rooms/{room.id}")
        assert response.status_code == 401


class TestViewerRestrictions:
    """Test that viewers can only access the rooms list."""

    @pytest.fixture
    def sample_data(self, db: Session):
        """Create sample data for testing."""
        room = Room(name="Test Room", building="Building A", width=10, height=10)
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

        compartment = Compartment(
            storage_unit_id=unit.id,
            name="Drawer 1",
            index_order=0
        )
        db.add(compartment)
        db.commit()
        db.refresh(compartment)

        item = Item(
            name="Test Item",
            storage_unit_id=unit.id,
            unit_catalog_number="TEST-001"
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        return {"room": room, "unit": unit, "compartment": compartment, "item": item}

    def test_viewer_can_list_rooms(self, client: TestClient, viewer_token: str, sample_data: dict):
        """Viewers should be able to list rooms."""
        response = client.get(
            "/api/rooms",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    def test_viewer_cannot_get_room_details(self, client: TestClient, viewer_token: str, sample_data: dict):
        """Viewers should not be able to get room details."""
        room = sample_data["room"]
        response = client.get(
            f"/api/rooms/{room.id}",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403

    def test_viewer_cannot_list_storage_units(self, client: TestClient, viewer_token: str, sample_data: dict):
        """Viewers should not be able to list storage units."""
        response = client.get(
            "/api/storage-units",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403

    def test_viewer_cannot_get_storage_unit(self, client: TestClient, viewer_token: str, sample_data: dict):
        """Viewers should not be able to get storage unit details."""
        unit = sample_data["unit"]
        response = client.get(
            f"/api/storage-units/{unit.id}",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403

    def test_viewer_cannot_list_compartments(self, client: TestClient, viewer_token: str, sample_data: dict):
        """Viewers should not be able to list compartments."""
        response = client.get(
            "/api/compartments",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403

    def test_viewer_cannot_get_compartment(self, client: TestClient, viewer_token: str, sample_data: dict):
        """Viewers should not be able to get compartment details."""
        compartment = sample_data["compartment"]
        response = client.get(
            f"/api/compartments/{compartment.id}",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403

    def test_viewer_cannot_list_items(self, client: TestClient, viewer_token: str, sample_data: dict):
        """Viewers should not be able to list items."""
        response = client.get(
            "/api/items",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403

    def test_viewer_cannot_get_item(self, client: TestClient, viewer_token: str, sample_data: dict):
        """Viewers should not be able to get item details."""
        item = sample_data["item"]
        response = client.get(
            f"/api/items/{item.id}",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403

    def test_viewer_cannot_search_items(self, client: TestClient, viewer_token: str, sample_data: dict):
        """Viewers should not be able to search items."""
        response = client.get(
            "/api/items/search?query=Test",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403

    def test_viewer_cannot_create_room(self, client: TestClient, viewer_token: str):
        """Viewers should not be able to create rooms."""
        response = client.post(
            "/api/rooms",
            json={"name": "New Room"},
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert response.status_code == 403
