# TEEI CSR Platform - Quick Start Guide

## Prerequisites

- **Node.js**: v20.0.0 or higher
- **pnpm**: v8.0.0 or higher
- **Docker**: For running Postgres and NATS locally

## Installation

### 1. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for packages and services.

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **NATS** on port 4222 (monitoring on 8222)
- **pgAdmin** on port 5050 (optional)

### 3. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` if you need to change default values (usually not needed for local dev).

### 4. Run Database Migrations

```bash
pnpm db:migrate
```

This creates all database tables using Drizzle migrations.

### 5. Seed Database

```bash
pnpm db:seed
```

This creates sample users, companies, enrollments, and test data.

### 6. Start All Services

```bash
pnpm dev
```

This starts all 7 services concurrently:
- **API Gateway**: http://localhost:3000
- **Unified Profile**: http://localhost:3001
- **Kintell Connector**: http://localhost:3002
- **Buddy Service**: http://localhost:3003
- **Upskilling Connector**: http://localhost:3004
- **Q2Q AI**: http://localhost:3005
- **Safety Moderation**: http://localhost:3006

## Verify Installation

### Check All Services Health

```bash
curl http://localhost:3000/health/all
```

You should see all services reporting `healthy` status.

### Check Individual Service

```bash
curl http://localhost:3001/health
```

## Test Data Ingestion

### Import Kintell Sessions

```bash
curl -X POST http://localhost:3002/import/kintell-sessions \
  -F "file=@services/kintell-connector/src/sample-data/kintell-sessions.csv"
```

### Import Buddy Matches

```bash
curl -X POST http://localhost:3003/import/matches \
  -F "file=@services/buddy-service/src/sample-data/buddy-matches.csv"
```

### Import Course Completions

```bash
curl -X POST http://localhost:3004/import/course-completions \
  -F "file=@services/upskilling-connector/src/sample-data/course-completions.csv"
```

## Test Q2Q AI Classification

```bash
curl -X POST http://localhost:3005/classify/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I feel much more confident now and really belong in this community.",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "contextType": "feedback"
  }'
```

## Test Safety Moderation

```bash
curl -X POST http://localhost:3006/screen/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test message for safety screening.",
    "contentId": "550e8400-e29b-41d4-a716-446655440000",
    "contentType": "feedback_text"
  }'
```

## Using HTTP Test Files

Each service has a `test.http` file for manual testing with REST Client extensions (VS Code, IntelliJ):

- `services/unified-profile/test.http`
- `services/kintell-connector/test.http`
- `services/buddy-service/test.http`
- `services/upskilling-connector/test.http`
- `services/q2q-ai/test.http`
- `services/safety-moderation/test.http`
- `services/api-gateway/test.http`

## Development Workflow

### Build All Packages

```bash
pnpm build
```

### Run Tests

```bash
pnpm test
```

### Lint Code

```bash
pnpm lint
```

### Format Code

```bash
pnpm format
```

### Reset Database

```bash
pnpm db:reset
pnpm db:migrate
pnpm db:seed
```

### View Database

```bash
pnpm db:studio
```

This opens Drizzle Studio at http://localhost:4983

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway (3000)                      │
│              JWT Auth, RBAC, Rate Limiting                   │
└─────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Unified    │ │   Kintell    │ │    Buddy     │ │  Upskilling  │
│   Profile    │ │  Connector   │ │   Service    │ │  Connector   │
│    (3001)    │ │    (3002)    │ │    (3003)    │ │    (3004)    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   NATS Event Bus │
              │      (4222)      │
              └──────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
┌──────────────┐              ┌──────────────┐
│   Q2Q AI     │              │    Safety    │
│   (3005)     │              │  Moderation  │
│              │              │    (3006)    │
└──────────────┘              └──────────────┘
         │                             │
         └──────────────┬──────────────┘
                        ▼
              ┌──────────────────┐
              │   PostgreSQL     │
              │      (5432)      │
              └──────────────────┘
```

## Event Flow Example

1. **CSV Import** → Kintell Connector receives CSV
2. **Data Normalization** → Mapper normalizes external format
3. **Database Write** → Session stored in `kintell_sessions`
4. **Event Emission** → `kintell.session.completed` published to NATS
5. **Event Consumption** → Unified Profile subscribes and updates user flags
6. **Q2Q Processing** → Q2Q AI analyzes feedback text (if present)
7. **Safety Check** → Safety service screens content

## Troubleshooting

### Services Won't Start

Check that Docker containers are running:
```bash
docker ps
```

You should see `teei-postgres` and `teei-nats`.

### Database Connection Errors

Verify DATABASE_URL in `.env` and ensure Postgres is accessible:
```bash
docker logs teei-postgres
```

### NATS Connection Errors

Check NATS is running:
```bash
curl http://localhost:8222/healthz
```

### Port Conflicts

If ports 3000-3006 are in use, update port numbers in `.env`:
```
PORT_API_GATEWAY=4000
PORT_UNIFIED_PROFILE=4001
# etc.
```

## Next Steps

- **Add Authentication**: Implement JWT token issuer in API Gateway
- **Add Real Q2Q Model**: Replace stub classifier with OpenAI/Claude API
- **Add Safety Rules**: Implement real content moderation policies
- **Add Frontend**: Build Corporate Cockpit dashboard
- **Add Tests**: Write unit and integration tests
- **Add Monitoring**: Set up OpenTelemetry and Grafana

## Resources

- **Architecture Docs**: `docs/Platform_Architecture.md`
- **Multi-Agent Plan**: `MULTI_AGENT_PLAN.md`
- **Team Structure**: `AGENTS.md`
- **Implementation Report**: `reports/worker2_services.md`

## Support

For issues or questions, see the main `README.md` or check the repository issues.
