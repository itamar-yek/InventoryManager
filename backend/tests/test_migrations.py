"""
Tests for database schema management (Alembic migrations + legacy upgrade).

The most important test here is test_models_match_migrations: if you change a
model (add/rename a column, new table...) without adding a migration, it fails.
See DATABASE_CHANGES.md.
"""
import uuid

import pytest
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, inspect, text

import app.models  # noqa: F401
from app.models.base import Base
from app.schema_manager import (
    BASELINE_REVISION,
    get_current_revision,
    get_head_revision,
    prepare_database,
)


@pytest.fixture
def engine(tmp_path):
    eng = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    yield eng
    eng.dispose()


def _schema_diff(engine):
    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn, opts={"compare_type": True})
        return compare_metadata(ctx, Base.metadata)


def test_fresh_database_is_created_by_migrations(engine):
    prepare_database(engine)
    tables = set(inspect(engine).get_table_names())
    assert {"users", "rooms", "storage_units", "compartments", "items",
            "item_movements", "blocks", "alembic_version"} <= tables
    assert get_current_revision(engine) == get_head_revision()


def test_models_match_migrations(engine):
    """Fails if a model was changed without a matching migration."""
    prepare_database(engine)
    diff = _schema_diff(engine)
    assert diff == [], (
        "The models and the migrations are out of sync. Create a migration "
        "(see DATABASE_CHANGES.md). Differences:\n" + "\n".join(map(str, diff))
    )


def test_prepare_database_is_idempotent(engine):
    prepare_database(engine)
    prepare_database(engine)
    assert get_current_revision(engine) == get_head_revision()


def test_baseline_downgrade_is_refused(engine):
    from alembic import command
    from app.schema_manager import get_alembic_config

    prepare_database(engine)
    with engine.begin() as conn:
        with pytest.raises(RuntimeError, match="Refusing"):
            command.downgrade(get_alembic_config(conn), "base")


def test_legacy_database_is_upgraded_without_data_loss(engine):
    """
    Simulate a database created by an old version of the app: no
    alembic_version table and several columns missing. All rows must survive.
    """
    user_id, room_id, unit_id, item_id = (str(uuid.uuid4()) for _ in range(4))
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(6) NOT NULL, is_active BOOLEAN NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL)"""))
        conn.execute(text("""
            CREATE TABLE rooms (
                id VARCHAR(36) PRIMARY KEY, name VARCHAR(100) NOT NULL, building VARCHAR(100),
                width FLOAT, height FLOAT, notes TEXT, shape VARCHAR(20),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL)"""))
        conn.execute(text("""
            CREATE TABLE storage_units (
                id VARCHAR(36) PRIMARY KEY, room_id VARCHAR(36) NOT NULL REFERENCES rooms(id),
                type VARCHAR(7) NOT NULL, label VARCHAR(100) NOT NULL,
                x FLOAT NOT NULL, y FLOAT NOT NULL, width FLOAT NOT NULL, height FLOAT NOT NULL,
                rotation INTEGER NOT NULL, notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL)"""))
        conn.execute(text("""
            CREATE TABLE items (
                id VARCHAR(36) PRIMARY KEY, storage_unit_id VARCHAR(36), compartment_id VARCHAR(36),
                name VARCHAR(255) NOT NULL, unit_catalog_number VARCHAR(100), catalog_number VARCHAR(100),
                serial_number VARCHAR(100), owned_by VARCHAR(255), description TEXT,
                quantity INTEGER NOT NULL, status VARCHAR(7) NOT NULL, deleted_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL)"""))
        conn.execute(text(
            "INSERT INTO users (id, username, email, password_hash, role, is_active) "
            "VALUES (:id, 'olduser', 'old@example.com', 'x', 'ADMIN', 1)"), {"id": user_id})
        conn.execute(text(
            "INSERT INTO rooms (id, name, shape) VALUES (:id, 'Old room', 'RECTANGLE')"), {"id": room_id})
        conn.execute(text(
            "INSERT INTO storage_units (id, room_id, type, label, x, y, width, height, rotation) "
            "VALUES (:id, :room, 'CABINET', 'Old cabinet', 0, 0, 1, 1, 0)"), {"id": unit_id, "room": room_id})
        conn.execute(text(
            "INSERT INTO items (id, storage_unit_id, name, quantity, status) "
            "VALUES (:id, :unit, 'Old item', 4, 'ACTIVE')"), {"id": item_id, "unit": unit_id})

    prepare_database(engine)

    assert get_current_revision(engine) == get_head_revision()
    insp = inspect(engine)
    user_cols = {c["name"] for c in insp.get_columns("users")}
    room_cols = {c["name"] for c in insp.get_columns("rooms")}
    item_cols = {c["name"] for c in insp.get_columns("items")}
    assert {"last_active", "edit_count"} <= user_cols
    assert {"door_wall", "door_position", "door_width", "shape_cutout_corner"} <= room_cols
    assert "projects" in item_cols
    assert {"blocks", "compartments", "item_movements"} <= set(insp.get_table_names())

    with engine.connect() as conn:
        assert conn.execute(text("SELECT username, edit_count FROM users")).one() == ("olduser", 0)
        assert conn.execute(text("SELECT name, shape FROM rooms")).one() == ("Old room", "rectangle")
        assert conn.execute(text("SELECT label FROM storage_units")).scalar_one() == "Old cabinet"
        row = conn.execute(text("SELECT name, quantity, projects FROM items")).one()
        assert row[0] == "Old item" and row[1] == 4 and row[2] == "[]"

    # The upgraded legacy database can be used through the ORM.
    from sqlalchemy.orm import Session
    from app.models import Item, Room
    with Session(engine) as s:
        assert s.query(Room).one().name == "Old room"
        item = s.query(Item).one()
        assert item.projects == [] and item.storage_unit.label == "Old cabinet"


def test_legacy_stamp_uses_baseline(engine):
    """A database created by create_all (newest pre-Alembic version) is just stamped."""
    Base.metadata.create_all(engine)
    prepare_database(engine)
    with engine.connect() as conn:
        assert conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == get_head_revision()
    assert BASELINE_REVISION
    assert _schema_diff(engine) == []
