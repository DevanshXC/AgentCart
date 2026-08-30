# AgentCart Backend

FastAPI + PostgreSQL backend for the AgentCart AI Commerce Gateway.

## Prerequisites

- Python 3.11+
- Docker Desktop (for PostgreSQL)

## Quick Start

### 1. Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

### 2. Set up Python environment

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Seed the database

```bash
python seed.py
```

### 4. Run the server

```bash
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/products` | List all active products |
| GET | `/api/products/search` | Search products with filters |
| GET | `/api/products/{id}` | Get a product by ID |
| GET | `/api/products/{id}/inventory` | Get inventory for a product |
| GET | `/api/merchant` | Get the demo merchant |
| GET | `/api/policy` | Get the active commerce policy |

### Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Keyword search across name, description, category, attributes |
| `category` | string | Filter by category (e.g., `laptop`, `accessory`) |
| `min_price` | int | Minimum price in rupees |
| `max_price` | int | Maximum price in rupees |
| `in_stock` | bool | Filter by availability |

Example:
```
GET /api/products/search?query=laptop&max_price=70000
```

## Running Tests

```bash
python -m pytest tests/ -v
```

Tests use an in-memory SQLite database — no running PostgreSQL required.

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/agentcart` | PostgreSQL connection string |

## Architecture

```
Frontend price → display only
Database price → authoritative
```

The backend is the single source of truth for product prices, inventory, and commerce policies. The frontend never sends price data to the backend for order processing.
