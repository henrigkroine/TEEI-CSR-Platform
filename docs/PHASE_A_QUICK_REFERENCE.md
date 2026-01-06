# Phase A Infrastructure - Quick Reference Guide

## Quick Facts

| Aspect | Details |
|--------|---------|
| **Services** | 7 backend services + 1 API Gateway |
| **Framework** | Fastify (Node.js) + TypeScript |
| **Database** | PostgreSQL 15 + Drizzle ORM |
| **Message Bus** | NATS with JetStream |
| **Authentication** | JWT (HS256) + RBAC (4 roles) |
| **Test Framework** | Vitest (installed, no tests yet) |
| **Logging** | Pino (dev-pretty, prod-JSON) |
| **Container** | Docker Compose (Postgres, NATS, PgAdmin) |
| **CI/CD** | GitHub Actions (Lint, Type, Build) |

---

## Service Quick Start

### All Services at Once
```bash
docker compose up -d        # Start infrastructure
pnpm install               # Install dependencies
cp .env.example .env       # Configure
pnpm db:migrate            # Run migrations
pnpm dev                   # Start all 7 services
```

### Individual Service Development
```bash
# In separate terminals:
pnpm --filter @teei/api-gateway dev          # Port 3000
pnpm --filter @teei/unified-profile dev      # Port 3001
pnpm --filter @teei/kintell-connector dev    # Port 3002
pnpm --filter @teei/buddy-service dev        # Port 3003
pnpm --filter @teei/upskilling-connector dev # Port 3004
pnpm --filter @teei/q2q-ai dev              # Port 3005
pnpm --filter @teei/safety-moderation dev    # Port 3006
```

### Database Operations
```bash
pnpm db:migrate            # Run pending migrations
pnpm db:seed              # Load seed data
pnpm db:reset             # Full reset (careful!)
pnpm db:studio            # Visual editor (http://localhost:3000)
pnpm db:generate          # Create new migration
```

### Code Quality
```bash
pnpm lint                 # ESLint check all
pnpm lint:fix            # Fix linting issues
pnpm format              # Prettier format
pnpm typecheck           # TypeScript check
pnpm test                # Run tests (currently skipped)
pnpm build               # Build all packages/services
```

---

## Services Overview Table

| Service | Port | Purpose | Key Routes |
|---------|------|---------|-----------|
| **API Gateway** | 3000 | Entry point, auth, routing | `GET /`, `/health/all`, proxy to others |
| **Unified Profile** | 3001 | User aggregation | `GET/PUT /profile/users/me` |
| **Kintell Connector** | 3002 | Session ingestion | `POST /import/csv`, `/webhooks` |
| **Buddy Service** | 3003 | Buddy matching | `POST/GET /matches`, `/connections` |
| **Upskilling Connector** | 3004 | Learning tracking | `POST /import/csv`, `GET /progress/:id` |
| **Q2Q AI** | 3005 | Outcome classification | `POST /classify/text` |
| **Safety Moderation** | 3006 | Content screening | `POST /screen`, `GET /moderation/queue` |

---

## Architecture Highlights

### Strengths
- Event-driven design (loosely coupled services)
- Type-safe Zod validation at boundaries
- Database migrations with Drizzle
- JWT + RBAC security framework
- Comprehensive health checks
- Structured logging

### Critical Gaps for Phase B
1. **No Automated Tests** - 0 test files (vitest ready)
2. **No Service-to-Service Auth** - Services trust each other
3. **No Database Encryption** - PII stored plaintext
4. **No Distributed Rate Limiting** - In-memory only
5. **No Observability** - Logging yes, metrics/tracing no
6. **No API Documentation** - OpenAPI/Swagger missing

---

## Key File Locations

### Core Services
```
services/
├── api-gateway/src/index.ts                # JWT, rate limit, proxying
├── unified-profile/src/routes/profile.ts   # Profile endpoints
├── kintell-connector/src/mappers/          # CSV parsing, normalization
├── buddy-service/src/routes/import.ts      # Buddy data import
├── upskilling-connector/src/routes/        # Course tracking
├── q2q-ai/src/classifier.ts               # Outcome classification
└── safety-moderation/src/routes/screen.ts # Content screening
```

### Shared Infrastructure
```
packages/
├── shared-utils/
│   ├── event-bus.ts       # NATS client wrapper
│   ├── logger.ts          # Pino configuration
│   └── errors.ts          # Error classes
├── event-contracts/src/   # 14+ event type definitions
└── shared-schema/
    ├── src/schema/*.ts    # 20 database tables
    ├── db.ts              # Drizzle connection
    └── migrate.ts         # Migration runner
```

### Configuration
```
Root:
├── docker-compose.yml     # Postgres, NATS, PgAdmin
├── .env.example          # All variables needed
├── .github/workflows/    # CI/CD pipeline
└── pnpm-workspace.yaml   # Monorepo setup
```

---

## Testing Entry Points

### Manual Testing (Ready to Use)
```bash
# Install REST Client extension in VSCode
# Open any *.http file:
services/api-gateway/test.http        # Comprehensive API tests
services/unified-profile/test.http
services/kintell-connector/test.http
# etc...
```

### Unit Tests (Need Implementation)
```bash
# Vitest is configured, create:
services/api-gateway/src/routes/__tests__/proxy.test.ts
services/api-gateway/src/middleware/__tests__/auth.test.ts
packages/shared-schema/src/__tests__/db.test.ts
# etc...
```

### Integration Tests (Need Implementation)
```bash
# Example pattern:
services/kintell-connector/src/__tests__/session-mapper.integration.test.ts
  - CSV parsing
  - Event publishing
  - Database persistence
```

---

## Environment Variables Quick Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | localhost:5432 | PostgreSQL connection |
| `NATS_URL` | localhost:4222 | Event bus address |
| `JWT_SECRET` | change_me_* | Auth signing key |
| `JWT_EXPIRES_IN` | 24h | Token expiration |
| `LOG_LEVEL` | info | Logging verbosity |
| `NODE_ENV` | development | dev/prod mode |
| `PORT_*` | 3000-3006 | Service ports |
| `SAFETY_ENABLED` | true | Enable content screening |

---

## Known Issues & Workarounds

### Issue: Migrations folder empty
- **Status**: Infrastructure ready, not yet generated
- **Workaround**: `pnpm db:generate` when schema changes

### Issue: No tests configured
- **Status**: Vitest ready, zero test files
- **Workaround**: Use .http files for manual testing
- **Priority**: Create test suite in Phase B

### Issue: Rate limiting in-memory
- **Status**: OK for development
- **Workaround**: Use Redis in production
- **Priority**: Implement distributed rate limiting in Phase B

### Issue: PII not encrypted
- **Status**: Mentioned as "planned" in SECURITY.md
- **Workaround**: Use TLS + network isolation
- **Priority**: Implement field encryption in Phase B

---

## Monitoring & Debugging

### Check Service Health
```bash
curl http://localhost:3000/health/all
# Returns status of all services
```

### View Database
```bash
# Option 1: Drizzle Studio (visual)
pnpm db:studio

# Option 2: PgAdmin (web)
# http://localhost:5050
# Email: admin@teei.local / Password: admin

# Option 3: psql (CLI)
psql -U teei -h localhost -d teei_platform
```

### Check Event Bus
```bash
# NATS Monitoring
http://localhost:8222/healthz          # Health check
http://localhost:8222/varz             # Stats/variables
http://localhost:8222/subsz             # Subscriptions
```

### View Logs
```bash
# All services log to stdout when using pnpm dev
# Service logs show: [service-name] method: GET url: /path

# For JSON logs in production:
LOG_FORMAT=json NODE_ENV=production pnpm dev
```

---

## Glossary of Key Concepts

| Term | Meaning |
|------|---------|
| **Event Bus** | NATS JetStream - async pub/sub for service communication |
| **Surrogate Key** | Internal UUID for users across external systems |
| **Event Contract** | Zod-validated type definition for events |
| **NATS Subject** | Topic/channel for event subscription (e.g., `buddy.match.created`) |
| **RBAC** | Role-Based Access Control - 4 roles (admin, company_user, participant, volunteer) |
| **Drizzle ORM** | Type-safe database query builder |
| **Pino** | Fast JSON logger with dev-friendly pretty printer |
| **Correlation ID** | UUID tracking requests through the system |

---

## Phase B Priorities (Recommended Order)

1. **Testing** (40% effort) - Unit + integration tests
2. **Security** (35% effort) - PII encryption, inter-service auth
3. **Observability** (20% effort) - Metrics, distributed tracing
4. **Infrastructure** (5% effort) - Backups, service discovery

---

**Last Updated**: 2025-11-13
**Docs Location**: `/home/user/TEEI-CSR-Platform/docs/`
**Related Files**:
- `Phase_A_Infrastructure_Assessment.md` - Detailed analysis
- `Architecture_Visual_Overview.md` - Diagrams and visual reference
- `Platform_Architecture.md` - Original architecture docs

