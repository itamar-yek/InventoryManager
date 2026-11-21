# Offline Installation (Windows)

The application runs in Docker. You prepare an installation package on a
computer **with** internet, copy it (e.g. on a USB drive), and install it on the
offline computer. Node.js and Python are **not** needed on either computer.

## Part 1: On the computer WITH internet

1. Install and start **Docker Desktop**.
2. Get the code (git clone, or download the ZIP from GitHub and extract it).
   Use a short folder path such as `C:\InventoryManager`.
3. Run:
   ```
   scripts\windows\export-images.bat
   ```
   This creates `docker-images\` with 3 files (about 250 MB in total).
4. Also download, for the offline computer:
   - The **Docker Desktop installer** (`Docker Desktop Installer.exe`).
   - The **WSL** installer: the `.msi` from
     https://github.com/microsoft/WSL/releases (Docker Desktop needs WSL 2, and
     the offline computer cannot download it).
5. Copy to the USB drive: the **whole project folder** (including
   `docker-images\`) and the two installers.

## Part 2: On the OFFLINE computer (first install)

1. Make sure virtualization is enabled in the BIOS (it usually is).
2. Install WSL from the `.msi`, then install Docker Desktop. Restart if asked.
3. Start Docker Desktop. Skip sign-in. In *Settings > General* enable
   **"Start Docker Desktop when you sign in to your computer"**, so the
   application comes back after a reboot.
4. Copy the project folder to e.g. `C:\InventoryManager`.
5. Open *Command Prompt* in that folder and run:
   ```
   scripts\windows\import-images.bat
   scripts\windows\setup-offline.bat
   ```
   `setup-offline.bat` creates `.env` with a random database password and
   secret key, starts everything, and waits until the app is ready.
6. Open http://localhost and log in as **admin** / **admin** (or the
   `ADMIN_PASSWORD` you set in `.env` *before* step 5).
   Other computers on the network use `http://<this computer's IP address>`.
   If they cannot connect, allow inbound TCP port 80 in Windows Firewall.

> **Keep a copy of `.env`** (on the USB drive or with your backups). It holds
> the database password. Without it a backup can still be restored, but the
> installation folder cannot simply be replaced.

## Part 3: Checking that everything works

```
scripts\windows\health-check.bat
```

To test every feature end to end (creates test data and removes it again;
needs Python on the computer, or run it from any PC with Python on the network):

```
python scripts\smoke_test.py --url http://localhost --admin-pass <admin password>
```

## Daily operation

| Task | Command |
|---|---|
| Start / stop | `scripts\windows\start.bat` / `stop.bat` (data is kept) |
| Status | `scripts\windows\status.bat` |
| Logs | `scripts\windows\logs.bat backend` |
| Backup | `scripts\windows\backup.bat`: writes `backups\inventory_<date>.dump` |
| Restore | `scripts\windows\restore.bat backups\inventory_<date>.dump` |

**Back up regularly** and copy the `backups` folder to another disk. To run a
backup every night, create a Windows Task Scheduler task that runs
`C:\InventoryManager\scripts\windows\backup.bat` daily.

## Installing a new version later (keeps all data)

1. On the internet computer: get the new code, run `export-images.bat`.
2. On the offline computer: copy the new project folder next to the old one
   (e.g. `C:\InventoryManager-v2`), then copy the **`.env` file and the
   `backups` folder** from the old folder into the new one.
3. In the new folder run:
   ```
   scripts\windows\update-offline.bat
   ```
   It backs up the database (and stops if that fails), loads the new images,
   and restarts. If the new version changes the database structure, the
   backend writes another backup and upgrades the database in one
   all-or-nothing step. See [DATABASE_CHANGES.md](DATABASE_CHANGES.md).

The data itself is stored in the Docker volume `inventory-postgres-data`, not in
the project folder, so replacing the folder does not affect it.

## Danger zone

- `scripts\windows\reset.bat` **deletes all data** (after making a backup; it
  refuses if the backup fails).
- Never run `docker compose down -v` and never delete the
  `inventory-postgres-data` volume in Docker Desktop.
- Do not change `POSTGRES_PASSWORD` in `.env` after the first start.
