# Scripts - Inventory Manager

This directory contains automation scripts for managing the Inventory Manager application.

## Directory Structure

```
scripts/
├── unix/       # Shell scripts for Linux and macOS
│   └── README.md
├── windows/    # Batch scripts for Windows
│   └── README.md
└── README.md   # This file
```

## Platform-Specific Scripts

### Unix (Linux / macOS)

See [unix/README.md](unix/README.md) for detailed documentation.

```bash
# Quick start (Docker)
./scripts/unix/setup.sh

# Quick start (Local development)
./scripts/unix/install-deps.sh
./scripts/unix/dev-start.sh
```

### Windows

See [windows/README.md](windows/README.md) for detailed documentation.

```batch
REM Quick start (Docker)
scripts\windows\setup.bat

REM Quick start (Local development)
scripts\windows\install-deps.bat
scripts\windows\dev-start.bat
```

## Script Categories

Both platforms include equivalent scripts for:

| Category | Scripts |
|----------|---------|
| **Setup** | `setup`, `install-deps`, `dev-start` |
| **Services** | `start`, `stop`, `restart`, `status`, `logs`, `rebuild`, `update` |
| **Database** | `db-shell`, `db-export`, `wait-for-db` |
| **Backup** | `backup`, `restore` |
| **Maintenance** | `health-check`, `cleanup`, `reset` |
| **Testing** | `run-all-tests` (Unix only), `monitor-agents` (Unix only) |
