# Changing the Database Safely

This app uses **migrations** (Alembic) to change the database structure. A
migration is a small Python file that says exactly how to change the database
from one version to the next, for example "add a `supplier` column to `items`".
Your existing data stays in place.

## What happens automatically

Every time the backend starts it checks the database:

| Database state | What happens |
|---|---|
| Empty (new install) | All tables are created. |
| Already up to date | Nothing. |
| Older version | **1.** A full backup is written to `backups\pre-migration_<date>_<time>_<from>_to_<to>.dump`. **2.** The new migrations are applied in **one transaction**. If anything fails, PostgreSQL rolls everything back and the data stays exactly as it was. |
| Created by an old version of this app (before migrations existed) | Backed up, missing columns are added (nothing is removed), then it is treated like any other database. |

If the backup cannot be written, the backend **refuses to start** instead of
changing the database without a backup.

## How to make a change (on the development machine)

1. **Change the model** in `backend/app/models/`, for example add to `item.py`:
   ```python
   supplier = Column(String(255), nullable=True)
   ```
2. **Generate the migration** (Docker must be running; uses a temporary
   database, never your real one):
   ```
   scripts\windows\new-migration.bat "add supplier to items"
   ```
   This creates `backend/migrations/versions/<id>_add_supplier_to_items.py`.
3. **Review the generated file.** See the checklist below.
4. **Update the API schema** if the field should be visible/editable
   (`backend/app/schemas/item.py`) and the frontend types if needed.
5. **Run the tests.** `test_models_match_migrations` fails if a model and the
   migrations disagree, i.e. if you forgot step 2:
   ```
   docker run --rm -v "%CD%\backend:/src:ro" python:3.11-slim-bookworm sh -c "cp -r /src /app && cd /app && pip install -q -r requirements.txt && python -m pytest -q"
   ```
6. Commit the model change **and** the migration file together, then build the
   offline package (`scripts\windows\export-images.bat`) and install it with
   `scripts\windows\update-offline.bat`.

## Review checklist (protects your data)

Autogenerate writes a *draft*. Check these before committing:

- **Adding a column**
  - `nullable=True`: safe as-is.
  - `nullable=False`: the table already has rows, so give it a default or the
    upgrade will fail (and roll back):
    ```python
    op.add_column('items', sa.Column('priority', sa.Integer(), nullable=False, server_default='0'))
    ```
- **Renaming a column**: autogenerate cannot detect renames. It writes
  `drop_column` + `add_column`, which **deletes the data in that column**.
  Replace it with:
  ```python
  op.alter_column('items', 'owned_by', new_column_name='owner')
  ```
- **Removing a column or table**: the data in it is gone after the upgrade
  (it still exists in the automatic pre-migration backup). Only do this when
  you are sure. Consider leaving the column in the database and just removing
  it from the model.
- **Changing a type** (e.g. String to Integer): may fail for existing values.
  Add a `postgresql_using=` clause or convert the data in a separate step.
- **New enum value** (e.g. a new `StorageUnitType`): on PostgreSQL add it with
  ```python
  op.execute("ALTER TYPE storageunittype ADD VALUE IF NOT EXISTS 'RACK'")
  ```
  (values are stored by their **name**, in upper case).
- **Changing data** (backfill, cleanup): use `op.execute("UPDATE ...")` inside
  the migration so it runs exactly once, in the same transaction.
- Never edit a migration that has already been installed somewhere. Make a new one.
- Never edit or delete `0001_baseline_schema.py`.

## If something goes wrong

- A failed upgrade changes nothing (it is rolled back). The backend log
  (`scripts\windows\logs.bat backend`) shows the error. Install the previous
  version again, or fix the migration and update again.
- To return to the state before an upgrade, restore the automatic backup:
  ```
  scripts\windows\restore.bat backups\pre-migration_20260101_120000_0001_baseline_to_xxxx.dump
  ```
  Then run the **matching older version** of the app. A newer version would
  just apply the upgrade again.

## Never do this

- `docker compose down -v` or deleting the `inventory-postgres-data` volume:
  this deletes the database. (`reset.bat` does this on purpose, after a backup.)
- Change `POSTGRES_PASSWORD` in `.env` after the first start: the database
  keeps its original password and the app can no longer connect.
- Change the database by hand (psql) without a migration: the next
  migration may conflict with it.
