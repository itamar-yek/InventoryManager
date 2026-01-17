"""
Tests for authentication endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User


class TestAuth:
    """Authentication endpoint tests."""

    def test_register_first_user_becomes_admin(self, client: TestClient, db: Session):
        """First registered user should become admin."""
        response = client.post(
            "/api/auth/register",
            json={
                "username": "firstuser",
                "email": "first@test.com",
                "password": "password123"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "firstuser"
        assert data["role"] == "admin"

    def test_register_second_user_is_viewer(self, client: TestClient, admin_user: User):
        """Second registered user should be viewer by default."""
        response = client.post(
            "/api/auth/register",
            json={
                "username": "seconduser",
                "email": "second@test.com",
                "password": "password123"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["role"] == "viewer"

    def test_register_duplicate_username(self, client: TestClient, admin_user: User):
        """Should reject duplicate username."""
        response = client.post(
            "/api/auth/register",
            json={
                "username": "admin",  # Same as admin_user
                "email": "different@test.com",
                "password": "password123"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_duplicate_email(self, client: TestClient, admin_user: User):
        """Should reject duplicate email."""
        response = client.post(
            "/api/auth/register",
            json={
                "username": "differentuser",
                "email": "admin@test.com",  # Same as admin_user
                "password": "password123"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_login_success(self, client: TestClient, admin_user: User):
        """Should return token on successful login."""
        response = client.post(
            "/api/auth/login",
            data={
                "username": "admin",
                "password": "adminpass123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, admin_user: User):
        """Should reject wrong password."""
        response = client.post(
            "/api/auth/login",
            data={
                "username": "admin",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        """Should reject nonexistent user."""
        response = client.post(
            "/api/auth/login",
            data={
                "username": "nonexistent",
                "password": "anypassword"
            }
        )
        assert response.status_code == 401

    def test_get_me(self, client: TestClient, auth_headers: dict, admin_user: User):
        """Should return current user info."""
        response = client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        assert data["role"] == "admin"

    def test_get_me_unauthorized(self, client: TestClient):
        """Should reject unauthenticated request."""
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_list_users_admin_only(self, client: TestClient, auth_headers: dict, viewer_headers: dict):
        """Only admin should be able to list users."""
        # Admin can list
        response = client.get("/api/auth/users", headers=auth_headers)
        assert response.status_code == 200

        # Viewer cannot list
        response = client.get("/api/auth/users", headers=viewer_headers)
        assert response.status_code == 403
