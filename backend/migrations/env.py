"""
Alembic environment for Inventory Manager.

- Used automatically at startup by app/schema_manager.py (which passes in a
  live connection), and
- from the command line by developers (`alembic revision --autogenerate`,
  `alembic upgrade head`, ...), in which case DATABASE_URL is used.
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

import app.models  # noqa: F401  (registers every model on Base.metadata)
from app.config import get_settings
from app.models.base import Base

config = context.config

# Only configure logging when run from the CLI; the app has its own logging.
if config.config_file_name is not None and "connection" not in config.attributes:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def _configure(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=False,
        # Batch mode lets ALTER TABLE operations work on SQLite as well.
        render_as_batch=connection.dialect.name == "sqlite",
    )


def run_migrations_offline() -> None:
    """Generate SQL without connecting (`alembic upgrade head --sql`)."""
    context.configure(
        url=get_settings().database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:
        # Called from the app: run inside the caller's transaction.
        _configure(connection)
        with context.begin_transaction():
            context.run_migrations()
        return

    engine = create_engine(get_settings().database_url, poolclass=pool.NullPool)
    with engine.connect() as conn:
        _configure(conn)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
