# Inventory Manager

A room-based inventory management system with visual layouts, designed for offline/on-prem deployment.

## Features

- **Visual Room Layouts**: SVG-based canvas showing storage unit positions
- **Hierarchical Organization**: Rooms → Storage Units → Compartments → Items
- **Dual Catalog Numbers**: Search items by two different catalog number systems
- **Movement Tracking**: Full audit trail of item relocations
- **Role-Based Access Control**: Viewer, Editor, and Admin roles
- **Offline-Ready**: No external dependencies at runtime

## Quick Start

### Prerequisites

- Docker and Docker Compose
- (Optional) Node.js 18+ and Python 3.9+ for development

### Production Deployment

```bash
# Clone and navigate to project
cd inventory-manager

# First-time setup (Linux/macOS)
./scripts/unix/setup.sh

# First-time setup (Windows)
# scripts\windows\setup.bat

# Start the application
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f
```

Access the application at `http://localhost` (or your server's IP).

### Development Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables (or create .env file)
export DATABASE_URL="postgresql://user:pass@localhost:5432/inventory"
export SECRET_KEY="your-secret-key"

# Run development server
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                    React + TypeScript                        │
│                    Zustand + TailwindCSS                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────────────┐
│                         Backend                              │
│                    FastAPI + SQLAlchemy                      │
│                    JWT Authentication                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                       PostgreSQL                             │
│                    Persistent Storage                        │
└─────────────────────────────────────────────────────────────┘
```

## API Documentation

When running, access interactive API docs at:
- Swagger UI: `http://localhost/api/docs`
- ReDoc: `http://localhost/api/redoc`

### Key Endpoints

| Endpoint | Method | Description | Required Role |
|----------|--------|-------------|---------------|
| `/api/auth/login` | POST | Get JWT token | - |
| `/api/auth/register` | POST | Create user | - |
| `/api/rooms` | GET/POST | List/Create rooms | Viewer/Editor |
| `/api/storage-units` | GET/POST | List/Create units | Viewer/Editor |
| `/api/items/search` | GET | Search items | Viewer |
| `/api/items/{id}/move` | POST | Move item | Editor |

## Data Model

```
Room
├── name, building, dimensions
└── StorageUnit[] (positioned on room canvas)
    ├── label, type, position (x, y, width, height, rotation)
    └── Compartment[] (optional subdivisions)
        └── Item[]
            ├── name, description, quantity
            ├── catalog_number_a, catalog_number_b
            └── ItemMovement[] (audit trail)
```

## User Roles

| Role | Permissions |
|------|-------------|
| **Viewer** | Read all data, search items |
| **Editor** | Create/edit rooms, units, items; move items |
| **Admin** | Full access including user management and deletions |

The first registered user automatically becomes an Admin.

## Configuration

Environment variables (set in `.env` or export):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | Database connection string |
| `SECRET_KEY` | (required) | JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Token expiration (24h) |
| `ALLOWED_HOSTS` | `*` | CORS allowed origins |

## Testing

```bash
# Backend tests
cd backend
pytest -v

# Frontend tests (requires Node.js)
cd frontend
npm test

# Run all tests (Linux/macOS)
./scripts/unix/run-all-tests.sh
```

## Backup & Restore

```bash
# Create backup (database + uploads) - Linux/macOS
./scripts/unix/backup.sh

# Restore from backup - Linux/macOS
./scripts/unix/restore.sh ./backups/backup-YYYYMMDD-HHMMSS.tar.gz

# Windows equivalents
# scripts\windows\backup.bat
# scripts\windows\restore.bat backups\backup-YYYYMMDD-HHMMSS.tar.gz
```

## Project Structure

```
inventory-manager/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routes
│   │   ├── models/        # SQLAlchemy models
│   │   └── schemas/       # Pydantic schemas
│   ├── tests/             # Pytest tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand stores
│   │   └── services/      # API client
│   └── package.json
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile.*
├── scripts/
│   ├── unix/          # Linux/macOS shell scripts
│   │   ├── setup.sh
│   │   ├── backup.sh
│   │   └── ...
│   └── windows/       # Windows batch scripts
│       ├── setup.bat
│       └── ...
└── README.md
```

## Troubleshooting

**Database connection refused:**
- Ensure PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in environment

**Authentication errors:**
- Verify SECRET_KEY is set
- Check token expiration settings

**Frontend can't reach backend:**
- Verify CORS settings (ALLOWED_HOSTS)
- Check nginx proxy configuration

## License

MIT License - see LICENSE file for details.
