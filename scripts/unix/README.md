# Unix Scripts - Inventory Manager

Shell scripts for Linux and macOS systems.

## Requirements

### For Docker Deployment (Recommended)
- **Docker** (with Docker Compose v2)
- **curl**
- **tar** (for backup/restore operations)

### For Local Development (Without Docker)
- **Python 3.9+** (with pip)
- **Node.js 18+** (with npm)

## Quick Start

### First-Time Setup (Docker)

```bash
# Navigate to project directory
cd /path/to/inventory-manager

# Make scripts executable (one-time)
chmod +x scripts/unix/*.sh

# Run setup (creates .env, builds images, starts services)
./scripts/unix/setup.sh
```

### First-Time Setup (Local Development)

```bash
# Install Python and Node.js dependencies
./scripts/unix/install-deps.sh

# Start development servers
./scripts/unix/dev-start.sh
```

## Available Scripts

### Setup & Installation

| Script | Description |
|--------|-------------|
| `setup.sh` | **First-time setup** - creates dirs, builds Docker images, starts services |
| `install-deps.sh` | Install local Python/Node.js dependencies (without Docker) |
| `dev-start.sh` | Start development servers locally (without Docker) |

### Offline Deployment

| Script | Description |
|--------|-------------|
| `export-images.sh` | Export Docker images for offline deployment (requires internet) |
| `import-images.sh` | Import pre-exported Docker images on offline machine |
| `setup-offline.sh` | Setup and start application on offline machine |

### Service Management (Docker)

| Script | Description |
|--------|-------------|
| `start.sh` | Start all services |
| `stop.sh` | Stop all services |
| `restart.sh [service]` | Restart all or specific service |
| `status.sh` | Show service status |
| `logs.sh [service]` | View service logs |
| `rebuild.sh [service]` | Rebuild and restart services |
| `update.sh` | Pull changes and rebuild |

### Database

| Script | Description |
|--------|-------------|
| `db-shell.sh` | Open PostgreSQL interactive shell |
| `db-export.sh [file]` | Export database to SQL file |
| `wait-for-db.sh [timeout]` | Wait for database to be ready |

### Backup & Restore

| Script | Description |
|--------|-------------|
| `backup.sh` | Create backup (database + uploads) |
| `restore.sh <file>` | Restore from backup file |

### Testing & Monitoring

| Script | Description |
|--------|-------------|
| `run-all-tests.sh` | Run all backend and frontend tests |
| `monitor-agents.sh` | Monitor agent processes |
| `health-check.sh` | Check health of all services |

### Maintenance

| Script | Description |
|--------|-------------|
| `cleanup.sh [--backups] [--all]` | Clean Docker resources and old files |
| `reset.sh` | **WARNING:** Delete all data and reset |

## Usage Examples

### Docker Deployment

```bash
# First-time setup
./scripts/unix/setup.sh

# Check if everything is running
./scripts/unix/health-check.sh

# View backend logs
./scripts/unix/logs.sh backend

# Create a backup
./scripts/unix/backup.sh

# Restart just the backend
./scripts/unix/restart.sh backend

# Open database shell
./scripts/unix/db-shell.sh
```

### Local Development

```bash
# Install dependencies (one-time)
./scripts/unix/install-deps.sh

# Start both backend and frontend
./scripts/unix/dev-start.sh

# Or start individually:
./scripts/unix/dev-start.sh backend
./scripts/unix/dev-start.sh frontend

# Run all tests
./scripts/unix/run-all-tests.sh
```

### Offline Deployment Example

```bash
# ON MACHINE WITH INTERNET:
# Export images (run once)
./scripts/unix/export-images.sh

# COPY ENTIRE PROJECT FOLDER TO OFFLINE MACHINE

# ON OFFLINE MACHINE:
# Import the pre-exported images
./scripts/unix/import-images.sh

# Start the application
./scripts/unix/setup-offline.sh
```

## Notes

- All scripts should be run from the project root directory
- Scripts automatically change to the project root directory when needed
- For Docker scripts: Make sure Docker daemon is running
- For local dev: Python venv is created in `backend/venv`
- On macOS, you may need to use `brew install` for dependencies
- On Linux, use your package manager (apt, yum, etc.)
