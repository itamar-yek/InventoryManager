"""
Tests for admin dashboard endpoints.

Verifies admin stats, user management, and activity tracking.
"""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.room import Room
from app.models.storage_unit import StorageUnit, StorageUnitType
from app.models.item import Item


class TestAdminDashboard:
    """Admin dashboard endpoint tests."""

    @pytest.fixture
    def inventory_data(self, db: Session):
        """Create sample inventory data for stats."""
        # Create rooms
        rooms = [
            Room(name="Room 1", width=10, height=10),
            Room(name="Room 2", width=10, height=10),
        ]
        db.add_all(rooms)
        db.commit()
        for r in rooms:
            db.refresh(r)

        # Create storage units
        units = [
            StorageUnit(room_id=rooms[0].id, label="Unit 1", type=StorageUnitType.CABINET, x=0, y=0, width=1, height=1),
            StorageUnit(room_id=rooms[0].id, label="Unit 2", type=StorageUnitType.DESK, x=2, y=0, width=1, height=1),
            StorageUnit(room_id=rooms[1].id, label="Unit 3", type=StorageUnitType.SHELF, x=0, y=0, width=1, height=1),
        ]
        db.add_all(units)
        db.commit()
        for u in units:
            db.refresh(u)

        # Create items
        items = [
            Item(name="Item 1", storage_unit_id=units[0].id),
            Item(name="Item 2", storage_unit_id=units[0].id),
            Item(name="Item 3", storage_unit_id=units[1].id),
            Item(name="Item 4", storage_unit_id=units[2].id),
            Item(name="Item 5", storage_unit_id=units[2].id),
        ]
        db.add_all(items)
        db.commit()

        return {"rooms": rooms, "units": units, "items": items}

    def test_get_stats_admin_only(
        self, client: TestClient, auth_headers: dict, viewer_headers: dict, editor_headers: dict
    ):
        """Only admin should access stats."""
        # Admin can access
        response = client.get("/api/auth/stats", headers=auth_headers)
        assert response.status_code == 200

        # Viewer cannot
        response = client.get("/api/auth/stats", headers=viewer_headers)
        assert response.status_code == 403

        # Editor cannot
        response = client.get("/api/auth/stats", headers=editor_headers)
        assert response.status_code == 403

    def test_stats_content(
        self, client: TestClient, auth_headers: dict, inventory_data: dict, admin_user: User
    ):
        """Stats should return correct counts."""
        response = client.get("/api/auth/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert "total_users" in data
        assert "total_rooms" in data
        assert "total_storage_units" in data
        assert "total_items" in data
        assert "online_users" in data
        assert "top_editors" in data

        assert data["total_rooms"] == 2
        assert data["total_storage_units"] == 3
        assert data["total_items"] == 5

    def test_list_users_returns_stats(
        self, client: TestClient, auth_headers: dict, db: Session, admin_user: User
    ):
        """List users should include activity stats."""
        # Update admin user with activity
        admin_user.last_active = datetime.now(timezone.utc)
        admin_user.edit_count = 10
        db.commit()

        response = client.get("/api/auth/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()

        assert len(data) >= 1
        user_data = next(u for u in data if u["username"] == "admin")
        assert "last_active" in user_data
        assert "edit_count" in user_data
        assert "is_online" in user_data
        assert user_data["edit_count"] == 10

    def test_online_status_recent_activity(
        self, client: TestClient, auth_headers: dict, db: Session, admin_user: User
    ):
        """User with recent activity should be marked online."""
        # Set last_active to now
        admin_user.last_active = datetime.now(timezone.utc)
        db.commit()

        response = client.get("/api/auth/users", headers=auth_headers)
        data = response.json()

        user_data = next(u for u in data if u["username"] == "admin")
        assert user_data["is_online"] is True

    def test_online_status_old_activity(
        self, client: TestClient, auth_headers: dict, db: Session, admin_user: User
    ):
        """User with old activity should be marked offline."""
        # Set last_active to 10 minutes ago
        admin_user.last_active = datetime.now(timezone.utc) - timedelta(minutes=10)
        db.commit()

        response = client.get("/api/auth/users", headers=auth_headers)
        data = response.json()

        user_data = next(u for u in data if u["username"] == "admin")
        assert user_data["is_online"] is False

    def test_update_user_role(
        self, client: TestClient, auth_headers: dict, viewer_user: User
    ):
        """Admin should be able to change user role."""
        response = client.put(
            f"/api/auth/users/{viewer_user.id}",
            headers=auth_headers,
            json={"role": "editor"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "editor"

    def test_update_user_status(
        self, client: TestClient, auth_headers: dict, viewer_user: User
    ):
        """Admin should be able to disable/enable users."""
        # Disable user
        response = client.put(
            f"/api/auth/users/{viewer_user.id}",
            headers=auth_headers,
            json={"is_active": False}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False

        # Enable user
        response = client.put(
            f"/api/auth/users/{viewer_user.id}",
            headers=auth_headers,
            json={"is_active": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is True

    def test_update_user_non_admin_forbidden(
        self, client: TestClient, editor_headers: dict, viewer_user: User
    ):
        """Non-admin should not be able to update users."""
        response = client.put(
            f"/api/auth/users/{viewer_user.id}",
            headers=editor_headers,
            json={"role": "admin"}
        )
        assert response.status_code == 403

    def test_heartbeat_updates_last_active(
        self, client: TestClient, auth_headers: dict, db: Session, admin_user: User
    ):
        """Heartbeat should update last_active timestamp."""
        old_last_active = admin_user.last_active

        response = client.post("/api/auth/heartbeat", headers=auth_headers)
        assert response.status_code == 200

        db.refresh(admin_user)
        assert admin_user.last_active is not None
        if old_last_active:
            assert admin_user.last_active > old_last_active

    def test_heartbeat_requires_auth(self, client: TestClient):
        """Heartbeat should require authentication."""
        response = client.post("/api/auth/heartbeat")
        assert response.status_code == 401

    def test_top_editors_ranking(
        self, client: TestClient, auth_headers: dict, db: Session
    ):
        """Top editors should be ranked by edit count."""
        from app.api.auth import get_password_hash

        # Create users with different edit counts
        users = [
            User(username="top1", email="top1@test.com", password_hash=get_password_hash("password123"), role=UserRole.EDITOR, edit_count=100),
            User(username="top2", email="top2@test.com", password_hash=get_password_hash("password123"), role=UserRole.EDITOR, edit_count=50),
            User(username="top3", email="top3@test.com", password_hash=get_password_hash("password123"), role=UserRole.EDITOR, edit_count=25),
        ]
        db.add_all(users)
        db.commit()

        response = client.get("/api/auth/stats", headers=auth_headers)
        data = response.json()

        top_editors = data["top_editors"]
        assert len(top_editors) >= 3
        # Check they're sorted by edit_count descending
        assert top_editors[0]["edit_count"] >= top_editors[1]["edit_count"]
