"""
Tests for room endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.room import Room


class TestRooms:
    """Room endpoint tests."""

    def test_list_rooms_empty(self, client: TestClient, auth_headers: dict):
        """Should return empty list when no rooms exist."""
        response = client.get("/api/rooms", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_create_room(self, client: TestClient, editor_headers: dict):
        """Editor should be able to create a room."""
        response = client.post(
            "/api/rooms",
            headers=editor_headers,
            json={
                "name": "Test Room",
                "building": "Building A",
                "width": 10.5,
                "height": 8.0,
                "notes": "Test notes"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Room"
        assert data["building"] == "Building A"
        assert data["width"] == 10.5
        assert data["height"] == 8.0
        assert "id" in data

    def test_create_room_viewer_forbidden(self, client: TestClient, viewer_headers: dict):
        """Viewer should not be able to create a room."""
        response = client.post(
            "/api/rooms",
            headers=viewer_headers,
            json={"name": "Test Room"}
        )
        assert response.status_code == 403

    def test_create_room_minimal(self, client: TestClient, editor_headers: dict):
        """Should create room with only required fields."""
        response = client.post(
            "/api/rooms",
            headers=editor_headers,
            json={"name": "Minimal Room"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Minimal Room"
        assert data["building"] is None

    def test_get_room(self, client: TestClient, editor_headers: dict, db: Session):
        """Should get a specific room with storage units."""
        # Create room
        room = Room(name="Test Room", width=10, height=10)
        db.add(room)
        db.commit()
        db.refresh(room)

        response = client.get(f"/api/rooms/{room.id}", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Room"
        assert "storage_units" in data

    def test_get_room_not_found(self, client: TestClient, auth_headers: dict):
        """Should return 404 for nonexistent room."""
        response = client.get(
            "/api/rooms/00000000-0000-0000-0000-000000000000",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_update_room(self, client: TestClient, editor_headers: dict, db: Session):
        """Editor should be able to update a room."""
        # Create room
        room = Room(name="Old Name")
        db.add(room)
        db.commit()
        db.refresh(room)

        response = client.put(
            f"/api/rooms/{room.id}",
            headers=editor_headers,
            json={"name": "New Name", "building": "New Building"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["building"] == "New Building"

    def test_delete_room_admin_only(
        self, client: TestClient, auth_headers: dict, editor_headers: dict, db: Session
    ):
        """Only admin should be able to delete a room."""
        # Create room
        room = Room(name="To Delete")
        db.add(room)
        db.commit()
        db.refresh(room)

        # Editor cannot delete
        response = client.delete(f"/api/rooms/{room.id}", headers=editor_headers)
        assert response.status_code == 403

        # Admin can delete
        response = client.delete(f"/api/rooms/{room.id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify deleted
        response = client.get(f"/api/rooms/{room.id}", headers=auth_headers)
        assert response.status_code == 404

    def test_list_rooms_ordered(self, client: TestClient, editor_headers: dict, db: Session):
        """Rooms should be ordered by name."""
        db.add_all([
            Room(name="Zebra Room"),
            Room(name="Alpha Room"),
            Room(name="Middle Room"),
        ])
        db.commit()

        response = client.get("/api/rooms", headers=editor_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert data[0]["name"] == "Alpha Room"
        assert data[1]["name"] == "Middle Room"
        assert data[2]["name"] == "Zebra Room"
