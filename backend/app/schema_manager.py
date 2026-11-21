"""
Database schema management (runs automatically at backend startup).

The database schema is owned by Alembic migrations in backend/migrations/versions.
On every startup this module brings the database up to the latest migration:

1. Empty database          -> all migrations are applied (tables are created).
2. Up-to-date database     -> nothing happens.
3. Older database          -> a full backup (pg_dump) is written to BACKUP_DIR,
                              then the pending migrations are applied inside a
                              single transaction (PostgreSQL rolls everything back
                              if any step fails, so the data is never left
                              half-migrated).
4. Legacy database         -> a database created by older versions of this app
   (tables exist but no       (before Alembic was introduced). It is backed up,
   alembic_version table)     any missing columns are added, it is marked as being
                              at the baseline revision, and then step 3 applies.

If the backup cannot be written, startup is aborted and the schema is NOT changed.

See DATABASE_CHANGES.md for how to add a new migration.
"""
import logging
import os
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine, make_url

log = logging.getLogger("inventory.schema")

BACKEND_DIR = Path(__file__).resolve().parent.parent
BASELINE_REVISION = "0001_baseline"


class SchemaUpgradeError(RuntimeError):
    """Raised when the database schema cannot be safely upgraded."""


# -----------------------------------------------------------------------------
# Alembic helpers
# -----------------------------------------------------------------------------

def get_alembic_config(connection=None) -> Config:
    """Build an Alembic config that works regardless of the current directory."""
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    if connection is not None:
        cfg.attributes["connection"] = connection
    return cfg


def get_head_revision() -> str:
    return ScriptDirectory.from_config(get_alembic_config()).get_current_head()


def get_current_revision(engine: Engine) -> Optional[str]:
    with engine.connect() as conn:
        return MigrationContext.configure(conn).get_current_revision()


def _alembic(engine: Engine, action: str, revision: str) -> None:
    """Run an Alembic command on the given engine inside one transaction."""
    with engine.begin() as conn:
        cfg = get_alembic_config(conn)
        if action == "upgrade":
            command.upgrade(cfg, revision)
        elif action == "stamp":
            command.stamp(cfg, revision)
        else:  # pragma: no cover
            raise ValueError(action)


# -----------------------------------------------------------------------------
# Backups
# -----------------------------------------------------------------------------

def backup_database(engine: Engine, label: str) -> Optional[Path]:
    """
    Write a full pg_dump (custom format) before a schema change.

    Returns the backup path, or None when backups do not apply (SQLite) or were
    explicitly disabled. Raises SchemaUpgradeError if the backup fails.
    """
    from app.config import get_settings
    settings = get_settings()

    if engine.dialect.name != "postgresql":
        return None
    if settings.skip_pre_migration_backup:
        log.warning("SKIP_PRE_MIGRATION_BACKUP is set - changing schema WITHOUT a backup")
        return None

    backup_dir = Path(settings.backup_dir)
    if not backup_dir.is_absolute():
        backup_dir = BACKEND_DIR / backup_dir
    backup_dir.mkdir(parents=True, exist_ok=True)

    # If the container restarts in a loop (e.g. a migration keeps failing and is
    # rolled back each time) the data has not changed, so a backup of the same
    # step made in the last 30 minutes is reused instead of filling the disk.
    now = datetime.now()
    for existing in sorted(backup_dir.glob(f"pre-migration_*_{label}.dump"), reverse=True):
        age_minutes = (now.timestamp() - existing.stat().st_mtime) / 60
        if existing.stat().st_size > 0 and age_minutes < 30:
            log.info("Recent pre-migration backup reused: %s", existing)
            return existing
    target = backup_dir / f"pre-migration_{now.strftime('%Y%m%d_%H%M%S')}_{label}.dump"

    pg_dump = shutil.which("pg_dump")
    if not pg_dump:
        raise SchemaUpgradeError(
            "pg_dump is not installed, so a backup cannot be made before upgrading "
            "the database schema. Refusing to continue."
        )

    # pg_dump does not understand SQLAlchemy driver suffixes (postgresql+psycopg2)
    url = make_url(settings.database_url).set(drivername="postgresql")
    tmp = target.with_suffix(".partial")
    log.info("Backing up database before schema upgrade -> %s", target)
    result = subprocess.run(
        [pg_dump, "--format=custom", f"--file={tmp}",
         f"--dbname={url.render_as_string(hide_password=False)}"],
        capture_output=True, text=True,
    )
    if result.returncode != 0 or not tmp.exists() or tmp.stat().st_size == 0:
        tmp.unlink(missing_ok=True)
        raise SchemaUpgradeError(
            "Database backup failed - schema was NOT changed.\n" + result.stderr
        )
    os.replace(tmp, target)
    log.info("Backup complete (%d bytes)", target.stat().st_size)
    return target


# -----------------------------------------------------------------------------
# Legacy databases (created before Alembic was introduced)
# -----------------------------------------------------------------------------

def _literal_default(column, dialect_name: str) -> Optional[str]:
    """SQL literal for a column's Python-side default, used to fill new columns."""
    default = column.default
    if default is None:
        return None
    if getattr(default, "is_callable", False):
        # e.g. default=list for JSON columns (SQLAlchemy keeps the original name)
        if getattr(default.arg, "__name__", "") == "list":
            return "'[]'"
        return None
    value = default.arg
    if isinstance(value, bool):
        return ("true" if value else "false") if dialect_name == "postgresql" else str(int(value))
    if isinstance(value, (int, float)):
        return str(value)
    if hasattr(value, "name"):  # Python enum stored by name
        value = value.name
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    return None


def upgrade_legacy_schema(engine: Engine) -> None:
    """
    Bring a pre-Alembic database up to the baseline schema without touching data.

    Only ADDS things (missing tables, missing columns, missing enum values).
    Never drops or renames anything.
    """
    import app.models  # noqa: F401  (register all models)
    from app.models.base import Base

    dialect = engine.dialect.name

    if dialect == "postgresql":
        # Enum values must be added outside a transaction block.
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            exists = conn.execute(text("SELECT 1 FROM pg_type WHERE typname = 'itemstatus'")).first()
            if exists:
                conn.execute(text("ALTER TYPE itemstatus ADD VALUE IF NOT EXISTS 'DELETED'"))

    # Create any tables that do not exist yet (existing tables are left alone).
    Base.metadata.create_all(bind=engine, checkfirst=True)

    inspector = inspect(engine)
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            existing = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing:
                    continue
                col_type = column.type.compile(dialect=engine.dialect)
                log.info("Legacy upgrade: adding column %s.%s (%s)", table.name, column.name, col_type)
                conn.execute(text(f'ALTER TABLE {table.name} ADD COLUMN {column.name} {col_type}'))
                default = _literal_default(column, dialect)
                if default is not None:
                    conn.execute(text(
                        f"UPDATE {table.name} SET {column.name} = {default} WHERE {column.name} IS NULL"
                    ))
                    if not column.nullable and dialect == "postgresql":
                        conn.execute(text(f"ALTER TABLE {table.name} ALTER COLUMN {column.name} SET NOT NULL"))

        # Older versions stored some values in upper case.
        conn.execute(text("UPDATE rooms SET shape = LOWER(shape) WHERE shape IS NOT NULL"))
        conn.execute(text("UPDATE rooms SET door_wall = LOWER(door_wall) WHERE door_wall IS NOT NULL"))


# -----------------------------------------------------------------------------
# Entry point
# -----------------------------------------------------------------------------

def prepare_database(engine: Optional[Engine] = None) -> None:
    """Make sure the database schema is at the latest migration (see module docstring)."""
    if engine is None:
        from app.database import get_engine
        engine = get_engine()

    head = get_head_revision()
    tables = set(inspect(engine).get_table_names())

    if "alembic_version" not in tables and tables:
        log.warning("Existing database without migration history found - upgrading it to the baseline")
        backup_database(engine, f"legacy_to_{head}")
        upgrade_legacy_schema(engine)
        _alembic(engine, "stamp", BASELINE_REVISION)

    current = get_current_revision(engine)
    if current == head:
        log.info("Database schema is up to date (revision %s)", head)
        return

    if current is not None:
        backup_database(engine, f"{current}_to_{head}")
        log.info("Upgrading database schema %s -> %s", current, head)
    else:
        log.info("Creating database schema (revision %s)", head)

    _alembic(engine, "upgrade", "head")
    log.info("Database schema is now at revision %s", get_current_revision(engine))
