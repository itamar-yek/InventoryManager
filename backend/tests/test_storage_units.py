"""
Tests for storage unit endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.room import Room
from app.models.storage_unit import StorageUnit, StorageUnitType
from app.models.item import Item


class TestStorageUnits:
    """Storage unit endpoint tests."""

    @pytest.fixture
    def room(self, db: Session):
        """Create a room for testing."""
        room = Room(name="Test Room", width=20, height=20)
        db.add(room)
        db.commit()
        db.refresh(room)
        return room

    def test_create_storage_unit(self, client: TestClient, editor_headers: dict, room: Room):
        """Editor should be able to create a storage unit."""
        response = client.post(
            "/api/storage-units",
            headers=editor_headers,
            json={
                "room_id": str(room.id),
                "label": "Cabinet A",
                "type": "cabinet",
                "x": 5,
                "y": 3,
                "width": 2,
                "height": 1,
                "notes": "Corner cabinet"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["label"] == "Cabinet A"
        assert data["type"] == "cabinet"
        assert data["x"] == 5
        assert data["y"] == 3

    def test_create_storage_unit_viewer_forbidden(self, client: TestClient, viewer_headers: dict, room: Room):
        """Viewer should not be able to create storage units."""
        response = client.post(
            "/api/storage-units",
            headers=viewer_headers,
            json={
                "room_id": str(room.id),
                "label": "Cabinet",
                "type": "cabinet",
                "x": 0, "y": 0, "width": 1, "height": 1
            }
        )
        assert response.status_code == 403

    def test_list_storage_units_by_room(self, client: TestClient, editor_headers: dict, room: Room, db: Session):
        """Should filter storage units by room."""
        # Create another room
        room2 = Room(name="Other Room", width=10, height=10)
        db.add(room2)
        db.commit()
        db.refresh(room2)

        # Create units in both rooms
        db.add_all([
            StorageUnit(room_id=room.id, label="Unit 1", type=StorageUnitType.CABINET, x=0, y=0, width=1, height=1),
            StorageUnit(room_id=room.id, label="Unit 2", type=StorageUnitType.DESK, x=2, y=0, width=1, height=1),
            StorageUnit(room_id=room2.id, label="Unit 3", type=StorageUnitType.SHELF, x=0, y=0, width=1, height=1),
        ])
        db.commit()

        response = client.get(f"/api/storage-units?room_id={room.id}", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_get_storage_unit_details(self, client: TestClient, editor_headers: dict, room: Room, db: Session):
        """Getting a storage unit should return its details."""
        unit = StorageUnit(room_id=room.id, label="Cabinet", type=StorageUnitType.CABINET, x=0, y=0, width=1, height=1)
        db.add(unit)
        db.commit()
        db.refresh(unit)

        response = client.get(f"/api/storage-units/{unit.id}", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["label"] == "Cabinet"
        assert data["type"] == "cabinet"
        assert data["room_id"] == str(room.id)

    def test_compartments_accessible_via_api(self, client: TestClient, editor_headers: dict, room: Room, db: Session):
        """Compartments of a storage unit should be accessible via compartments API."""
        from app.models.compartment import Compartment

        unit = StorageUnit(room_id=room.id, label="Cabinet", type=StorageUnitType.CABINET, x=0, y=0, width=1, height=1)
        db.add(unit)
        db.commit()
        db.refresh(unit)

        # Add compartments
        db.add_all([
            Compartment(storage_unit_id=unit.id, name="Drawer 1", index_order=0),
            Compartment(storage_unit_id=unit.id, name="Drawer 2", index_order=1),
        ])
        db.commit()

        # Get compartments via the compartments endpoint
        response = client.get(f"/api/compartments?storage_unit_id={unit.id}", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_update_storage_unit(self, client: TestClient, editor_headers: dict, room: Room, db: Session):
        """Editor should be able to update a storage unit."""
        unit = StorageUnit(room_id=room.id, label="Old Label", type=StorageUnitType.CABINET, x=0, y=0, width=1, height=1)
        db.add(unit)
        db.commit()
        db.refresh(unit)

        response = client.put(
            f"/api/storage-units/{unit.id}",
            headers=editor_headers,
            json={"label": "New Label", "x": 10, "y": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["label"] == "New Label"
        assert data["x"] == 10
        assert data["y"] == 5

    def test_delete_storage_unit_editor_can_delete(
        self, client: TestClient, editor_headers: dict, room: Room, db: Session
    ):
        """Editor should be able to delete empty storage units."""
        unit = StorageUnit(room_id=room.id, label="To Delete", type=StorageUnitType.CABINET, x=0, y=0, width=1, height=1)
        db.add(unit)
        db.commit()
        db.refresh(unit)

        # Editor can delete empty unit
        response = client.delete(f"/api/storage-units/{unit.id}", headers=editor_headers)
        assert response.status_code == 204

    def test_delete_storage_unit_with_items_blocked(
        self, client: TestClient, auth_headers: dict, room: Room, db: Session
    ):
        """Should not delete storage unit that contains items."""
        unit = StorageUnit(room_id=room.id, label="Has Items", type=StorageUnitType.CABINET, x=0, y=0, width=1, height=1)
        db.add(unit)
        db.commit()
        db.refresh(unit)

        # Add an item
        item = Item(name="Test Item", storage_unit_id=unit.id)
        db.add(item)
        db.commit()

        response = client.delete(f"/api/storage-units/{unit.id}", headers=auth_headers)
        assert response.status_code == 400
        assert "items" in response.json()["detail"].lower()

    def test_storage_unit_types(self, client: TestClient, editor_headers: dict, room: Room):
        """Should accept all valid storage unit types."""
        types = ["cabinet", "desk", "shelf", "drawer", "box", "other"]

        for i, unit_type in enumerate(types):
            response = client.post(
                "/api/storage-units",
                headers=editor_headers,
                json={
                    "room_id": str(room.id),
                    "label": f"Unit {i}",
                    "type": unit_type,
                    "x": i, "y": 0, "width": 1, "height": 1
                }
            )
            assert response.status_code == 201
            assert response.json()["type"] == unit_type

    def test_storage_unit_not_found(self, client: TestClient, auth_headers: dict):
        """Should return 404 for nonexistent storage unit."""
        response = client.get(
            "/api/storage-units/00000000-0000-0000-0000-000000000000",
            headers=auth_headers
        )
        assert response.status_code == 404
