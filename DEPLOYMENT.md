# Inventory Manager - Deployment Guide

This guide covers first-time deployment and ongoing maintenance of the Inventory Manager application on a private network.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [First-Time Deployment](#first-time-deployment)
3. [Configuration](#configuration)
4. [Starting the Application](#starting-the-application)
5. [Verifying Deployment](#verifying-deployment)
6. [Common Operations](#common-operations)
7. [Troubleshooting](#troubleshooting)
8. [Backup and Restore](#backup-and-restore)

---

## Prerequisites

Before deploying, ensure the target machine has:

- **Docker** (version 20.10 or later) - or **Docker Desktop** on Windows
- **Docker Compose** (version 2.0 or later)
- **Bash shell** (Linux/macOS) or **Command Prompt/PowerShell** (Windows)
- **curl** (for health checks)

### Platform-Specific Notes

| Platform | Scripts Location | Notes |
|----------|-----------------|-------|
| Linux/macOS | `scripts/unix/*.sh` | Make executable with `chmod +x scripts/unix/*.sh` |
| Windows | `scripts/windows/*.bat` | Run from Command Prompt or PowerShell |

### Verify Prerequisites

```bash
# Check Docker
docker --version

# Check Docker Compose
docker-compose --version

# Check available disk space (recommend at least 10GB free)
df -h
```

---

## First-Time Deployment

### Step 1: Copy Project Files

Copy the entire project directory to the target machine. The directory structure should look like:

```
inventory-manager/
├── backend/
├── frontend/
├── docker/
├── scripts/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
└── DEPLOYMENT.md
```

### Step 2: Create Environment Configuration

```bash
# Navigate to project directory
cd /path/to/inventory-manager

# Copy environment template
cp .env.example .env

# Edit configuration (see Configuration section below)
nano .env   # or use your preferred editor
```

### Step 3: Generate Secure Secret Key

**IMPORTANT**: Generate a new secret key for production!

```bash
# Generate a secure random key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Or if Python is not available:
openssl rand -base64 32
```

Copy the generated key and update `SECRET_KEY` in your `.env` file.

### Step 4: Run Setup Script

```bash
# Make scripts executable (Linux/macOS)
chmod +x scripts/unix/*.sh

# Run the setup script (Linux/macOS)
./scripts/unix/setup.sh

# Windows: Run from Command Prompt
# scripts\windows\setup.bat
```

This will:
- Create necessary directories (uploads, backups, logs)
- Build Docker images
- Start all services
- Wait for the database to be ready

### Step 5: Create Admin User

The first user to register will automatically become an administrator. Open your browser and:

1. Navigate to `http://<server-ip>` (or configured port)
2. Click "Register"
3. Create your admin account

---

## Configuration

### Environment Variables (.env)

| Variable | Description | Default | Required for Production |
|----------|-------------|---------|------------------------|
| `POSTGRES_USER` | Database username | postgres | Optional |
| `POSTGRES_PASSWORD` | Database password | postgres | **Yes - Change this!** |
| `POSTGRES_DB` | Database name | inventory | Optional |
| `DATABASE_URL` | Full connection string | (auto-generated) | No |
| `SECRET_KEY` | JWT signing key | (insecure default) | **Yes - Change this!** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session duration | 30 | Optional |
| `DEBUG` | Enable debug mode | false | No (keep false) |
| `ALLOWED_HOSTS` | CORS allowed origins | * | Optional |
| `FRONTEND_PORT` | External port for web UI | 80 | Optional |

### Changing the Port

To run on a different port (e.g., 8080):

```bash
# Edit .env
FRONTEND_PORT=8080
```

Then restart the frontend service:
```bash
./scripts/unix/restart.sh frontend
```

---

## Starting the Application

### Start All Services

**Linux/macOS:**
```bash
# Using the script (recommended)
./scripts/unix/start.sh

# Or manually
docker-compose up -d
```

**Windows:**
```batch
REM Using the script (recommended)
scripts\windows\start.bat

REM Or manually
docker-compose up -d
```

### Start Individual Services

```bash
./scripts/unix/start.sh db        # Database only
./scripts/unix/start.sh backend   # Backend only
./scripts/unix/start.sh frontend  # Frontend only
```

### Stop All Services

```bash
# Using the script
./scripts/unix/stop.sh

# Or manually
docker-compose down
```

### View Logs

```bash
# All services
./scripts/unix/logs.sh

# Specific service
./scripts/unix/logs.sh backend
./scripts/unix/logs.sh frontend
./scripts/unix/logs.sh db
```

---

## Verifying Deployment

### Check Service Status

```bash
./scripts/unix/status.sh
```

### Health Check Endpoints

| Service | Health Check URL |
|---------|-----------------|
| Frontend | `http://<server>:<port>/health` |
| Backend API | `http://<server>:<port>/api/health` |
| API Documentation | `http://<server>:<port>/api/docs` |

### Test Commands

```bash
# Check if frontend is responding
curl -f http://localhost/health

# Check if backend API is responding
curl -f http://localhost/api/health

# Check database connection (from backend)
docker-compose exec backend python -c "from app.database import get_engine; print('DB OK')"
```

---

## Common Operations

### Restart Services

```bash
# Restart everything
./scripts/unix/restart.sh

# Restart specific service
./scripts/unix/restart.sh backend
./scripts/unix/restart.sh frontend
./scripts/unix/restart.sh db
```

### View Logs

```bash
# Follow logs in real-time
./scripts/unix/logs.sh -f

# Last 100 lines of backend logs
./scripts/unix/logs.sh backend 100

# Search logs for errors
./scripts/unix/logs.sh backend | grep -i error
```

### Update Application

After pulling new code:

```bash
./scripts/unix/update.sh
```

This will rebuild images and restart services with zero downtime.

### Database Operations

```bash
# Access database shell
./scripts/unix/db-shell.sh

# Run a SQL query
./scripts/unix/db-shell.sh -c "SELECT COUNT(*) FROM users;"

# Export database to SQL file
./scripts/unix/db-export.sh > backup.sql
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check what's wrong
./scripts/unix/status.sh

# View detailed logs
./scripts/unix/logs.sh <service-name>

# Try rebuilding
./scripts/unix/rebuild.sh <service-name>
```

### Database Connection Issues

```bash
# Restart database
./scripts/unix/restart.sh db

# Wait for it to be ready
./scripts/unix/wait-for-db.sh

# Check database logs
./scripts/unix/logs.sh db
```

### Frontend Not Loading

```bash
# Check nginx configuration
docker-compose exec frontend nginx -t

# Restart frontend
./scripts/unix/restart.sh frontend

# Check if backend is reachable from frontend
docker-compose exec frontend wget -q -O- http://backend:8000/api/health
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker resources
./scripts/unix/cleanup.sh

# Remove old backups (keeps last 7)
./scripts/unix/cleanup.sh --backups
```

### Reset Everything (Nuclear Option)

**WARNING**: This will delete all data!

```bash
./scripts/unix/reset.sh
```

---

## Backup and Restore

### Create Backup

```bash
# Create a backup
./scripts/unix/backup.sh

# Create backup and clean old ones
./scripts/unix/backup.sh --cleanup
```

Backups are stored in `./backups/` directory.

### Restore from Backup

```bash
# List available backups
ls -la backups/

# Restore specific backup
./scripts/unix/restore.sh inventory_backup_20240115_120000.tar.gz
```

### Automated Backups

Add to crontab for daily backups at 2 AM:

```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * * /path/to/inventory-manager/scripts/unix/backup.sh --cleanup >> /var/log/inventory-backup.log 2>&1
```

---

## Network Configuration

### Firewall Rules

If running a firewall, allow the frontend port:

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

### Reverse Proxy (Optional)

If placing behind a reverse proxy (nginx, Apache, etc.), ensure:

1. Proxy passes `/api` requests to the backend
2. WebSocket connections are properly forwarded
3. `X-Forwarded-For` headers are set

Example nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name inventory.example.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

---

## Windows Deployment

For Windows servers, use the batch scripts in `scripts/windows/`:

### Quick Start (Windows)

```batch
REM Navigate to project directory
cd C:\path\to\inventory-manager

REM Copy environment template
copy .env.example .env

REM Edit .env file with notepad
notepad .env

REM Start services
scripts\windows\start.bat

REM Check status
scripts\windows\health-check.bat
```

### Available Windows Scripts

| Script | Description |
|--------|-------------|
| `start.bat` | Start all services |
| `stop.bat` | Stop all services |
| `restart.bat` | Restart services |
| `status.bat` | Show service status |
| `logs.bat` | View service logs |
| `rebuild.bat` | Rebuild services |
| `health-check.bat` | Check all services health |
| `db-shell.bat` | Open database shell |
| `db-export.bat` | Export database |
| `backup.bat` | Create backup |
| `restore.bat` | Restore from backup |
| `cleanup.bat` | Clean Docker resources |
| `reset.bat` | Reset application (deletes data!) |
| `update.bat` | Pull updates and rebuild |

See `scripts/windows/README.md` for detailed usage.

---

## Support

For issues or questions:

1. Check the logs: `./scripts/unix/logs.sh` (Linux/macOS) or `scripts\windows\logs.bat` (Windows)
2. Check service status: `./scripts/unix/status.sh` or `scripts\windows\status.bat`
3. Review this guide's troubleshooting section
4. Check the application's GitHub issues page
