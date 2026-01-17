# Windows Scripts - Inventory Manager

Windows batch file equivalents for the Linux/macOS shell scripts.

## Requirements

### For Docker Deployment (Recommended)
- **Docker Desktop for Windows** (with Docker Compose)
- **curl** (included in Windows 10+)
- **PowerShell** (for backup/restore archive operations)

### For Local Development (Without Docker)
- **Python 3.9+** (with pip)
- **Node.js 18+** (with npm)

## Quick Start

### First-Time Setup (Docker)

```batch
REM Navigate to project directory
cd C:\path\to\inventory-manager

REM Run setup (creates .env, builds images, starts services)
scripts\windows\setup.bat
```

### First-Time Setup (Local Development)

```batch
REM Install Python and Node.js dependencies
scripts\windows\install-deps.bat

REM Start development servers
scripts\windows\dev-start.bat
```

## Available Scripts

### Setup & Installation

| Script | Description |
|--------|-------------|
| `setup.bat` | **First-time setup** - creates dirs, builds Docker images, starts services |
| `install-deps.bat` | Install local Python/Node.js dependencies (without Docker) |
| `dev-start.bat` | Start development servers locally (without Docker) |

### Service Management (Docker)

| Script | Description |
|--------|-------------|
| `start.bat` | Start all services |
| `stop.bat` | Stop all services |
| `restart.bat [service]` | Restart all or specific service |
| `status.bat` | Show service status |
| `logs.bat [service]` | View service logs |
| `rebuild.bat [service]` | Rebuild and restart services |
| `update.bat` | Pull changes and rebuild |

### Database

| Script | Description |
|--------|-------------|
| `db-shell.bat` | Open PostgreSQL interactive shell |
| `db-export.bat [file]` | Export database to SQL file |
| `wait-for-db.bat [timeout]` | Wait for database to be ready |

### Backup & Restore

| Script | Description |
|--------|-------------|
| `backup.bat` | Create backup (database + uploads) |
| `restore.bat <file>` | Restore from backup file |

### Maintenance

| Script | Description |
|--------|-------------|
| `health-check.bat` | Check health of all services |
| `cleanup.bat [--backups] [--all]` | Clean Docker resources and old files |
| `reset.bat` | **WARNING:** Delete all data and reset |

## Usage Examples

### Docker Deployment

```batch
REM First-time setup
scripts\windows\setup.bat

REM Check if everything is running
scripts\windows\health-check.bat

REM View backend logs
scripts\windows\logs.bat backend

REM Create a backup
scripts\windows\backup.bat

REM Restart just the backend
scripts\windows\restart.bat backend

REM Open database shell
scripts\windows\db-shell.bat
```

### Local Development

```batch
REM Install dependencies (one-time)
scripts\windows\install-deps.bat

REM Start both backend and frontend
scripts\windows\dev-start.bat

REM Or start individually:
scripts\windows\dev-start.bat backend
scripts\windows\dev-start.bat frontend
```

## Notes

- All scripts should be run from Command Prompt or PowerShell
- Scripts automatically change to the project root directory
- For Docker scripts: Make sure Docker Desktop is running
- For local dev: Python venv is created in `backend\venv`
