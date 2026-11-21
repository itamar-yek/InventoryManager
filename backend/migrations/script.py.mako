"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

SAFETY CHECKLIST (see DATABASE_CHANGES.md):
  - Review every operation below; autogenerate is a draft, not the final word.
  - Never drop a column/table that still holds data you need.
  - New NOT NULL columns on existing tables need a server_default (or a data
    backfill step) or the upgrade will fail on databases that already have rows.
  - Renames are detected as drop + add (DATA LOSS) - rewrite them as
    op.alter_column(..., new_column_name=...).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import app.models.base
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
