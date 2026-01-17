"""
Tests for compartment endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.room import Room
from app.models.storage_unit import StorageUnit, StorageUnitType
from app.models.compartment import Compartment
from app.models.item import Item


class TestCompartments:
    """Compartment endpoint tests."""

    @pytest.fixture
    def storage_unit(self, db: Session):
        """Create a room and storage unit for testing."""
        room = Room(name="Test Room", width=10, height=10)
        db.add(room)
        db.commit()
        db.refresh(room)

        unit = StorageUnit(
            room_id=room.id,
            label="Cabinet",
            type=StorageUnitType.CABINET,
            x=0, y=0, width=2, height=1
        )
        db.add(unit)
        db.commit()
        db.refresh(unit)
        return unit

    def test_create_compartment(self, client: TestClient, editor_headers: dict, storage_unit: StorageUnit):
        """Editor should be able to create a compartment."""
        response = client.post(
            "/api/compartments",
            headers=editor_headers,
            json={
                "storage_unit_id": str(storage_unit.id),
                "name": "Top Drawer",
                "index_order": 0
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Top Drawer"
        assert data["index_order"] == 0

    def test_create_compartment_viewer_forbidden(self, client: TestClient, viewer_headers: dict, storage_unit: StorageUnit):
        """Viewer should not be able to create compartments."""
        response = client.post(
            "/api/compartments",
            headers=viewer_headers,
            json={
                "storage_unit_id": str(storage_unit.id),
                "name": "Drawer",
                "index_order": 0
            }
        )
        assert response.status_code == 403

    def test_list_compartments_by_storage_unit(
        self, client: TestClient, editor_headers: dict, storage_unit: StorageUnit, db: Session
    ):
        """Should filter compartments by storage unit."""
        db.add_all([
            Compartment(storage_unit_id=storage_unit.id, name="Drawer 1", index_order=0),
            Compartment(storage_unit_id=storage_unit.id, name="Drawer 2", index_order=1),
            Compartment(storage_unit_id=storage_unit.id, name="Drawer 3", index_order=2),
        ])
        db.commit()

        response = client.get(
            f"/api/compartments?storage_unit_id={storage_unit.id}",
            headers=editor_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    def test_compartments_ordered_by_index(
        self, client: TestClient, editor_headers: dict, storage_unit: StorageUnit, db: Session
    ):
        """Compartments should be ordered by index_order."""
        # Add in random order
        db.add_all([
            Compartment(storage_unit_id=storage_unit.id, name="Third", index_order=2),
            Compartment(storage_unit_id=storage_unit.id, name="First", index_order=0),
            Compartment(storage_unit_id=storage_unit.id, name="Second", index_order=1),
        ])
        db.commit()

        response = client.get(
            f"/api/compartments?storage_unit_id={storage_unit.id}",
            headers=editor_headers
        )
        data = response.json()
        assert data[0]["name"] == "First"
        assert data[1]["name"] == "Second"
        assert data[2]["name"] == "Third"

    def test_get_compartment(self, client: TestClient, editor_headers: dict, storage_unit: StorageUnit, db: Session):
        """Should get a specific compartment."""
        compartment = Compartment(storage_unit_id=storage_unit.id, name="Test Drawer", index_order=0)
        db.add(compartment)
        db.commit()
        db.refresh(compartment)

        response = client.get(f"/api/compartments/{compartment.id}", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Drawer"

    def test_update_compartment(self, client: TestClient, editor_headers: dict, storage_unit: StorageUnit, db: Session):
        """Editor should be able to update a compartment."""
        compartment = Compartment(storage_unit_id=storage_unit.id, name="Old Name", index_order=0)
        db.add(compartment)
        db.commit()
        db.refresh(compartment)

        response = client.put(
            f"/api/compartments/{compartment.id}",
            headers=editor_headers,
            json={"name": "New Name", "index_order": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["index_order"] == 5

    def test_delete_compartment_admin_only(
        self, client: TestClient, auth_headers: dict, editor_headers: dict, storage_unit: StorageUnit, db: Session
    ):
        """Only admin should delete compartments."""
        compartment = Compartment(storage_unit_id=storage_unit.id, name="To Delete", index_order=0)
        db.add(compartment)
        db.commit()
        db.refresh(compartment)

        # Editor cannot delete
        response = client.delete(f"/api/compartments/{compartment.id}", headers=editor_headers)
        assert response.status_code == 403

        # Admin can delete
        response = client.delete(f"/api/compartments/{compartment.id}", headers=auth_headers)
        assert response.status_code == 204

    def test_compartment_not_found(self, client: TestClient, auth_headers: dict):
        """Should return 404 for nonexistent compartment."""
        response = client.get(
            "/api/compartments/00000000-0000-0000-0000-000000000000",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_items_can_be_in_compartment(
        self, client: TestClient, editor_headers: dict, storage_unit: StorageUnit, db: Session
    ):
        """Items should be assignable to compartments (not storage units)."""
        compartment = Compartment(storage_unit_id=storage_unit.id, name="Drawer", index_order=0)
        db.add(compartment)
        db.commit()
        db.refresh(compartment)

        # Item can be in compartment ONLY (not both storage unit and compartment)
        response = client.post(
            "/api/items",
            headers=editor_headers,
            json={
                "name": "Compartment Item",
                "compartment_id": str(compartment.id)
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["compartment_id"] == str(compartment.id)
        assert data["storage_unit_id"] is None
