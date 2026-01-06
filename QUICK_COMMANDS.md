# ⚡ Quick Command Reference

**Copy-paste commands to run the TEEI CSR Platform**

---

## 🚀 First Time Setup

```powershell
# 1. Install dependencies
pnpm install

# 2. Start infrastructure (optimized for your workstation)
docker compose -f docker-compose.dev.yml up -d

# 3. Run migrations
pnpm db:migrate

# 4. Seed database
pnpm db:seed

# 5. Start all services (pick one)
pnpm dev                                                # foreground
pnpm dlx pm2 start ecosystem.config.cjs --env development  # background supervisor
```

**Access**:
- Frontend (Corp Cockpit): http://localhost:6509
- API Gateway: http://localhost:6501
- pgAdmin: http://localhost:5050

---

## 🔄 Daily Development

```powershell
# Start everything
docker compose -f docker-compose.dev.yml up -d
pnpm dev                                     # or pnpm dlx pm2 start ecosystem.config.cjs --env development

# Stop everything
# Press Ctrl+C in terminal running pnpm dev
# or
pnpm dlx pm2 stop teei-csr-platform
docker compose -f docker-compose.dev.yml down
```

> PM2 logs → `./logs/pm2-out.log` / `./logs/pm2-error.log`. PM2 state persists in `C:\Users\ovehe\.pm2_clean\dump.pm2`.

---

## 🗄️ Database Commands

```powershell
# Run migrations
pnpm db:migrate

# Seed data
pnpm db:seed

# Open database GUI
pnpm db:studio

# Reset database (WARNING: deletes data)
pnpm db:reset && pnpm db:migrate && pnpm db:seed
```

---

## 🧪 Testing

```powershell
# Run all tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run tests in watch mode
pnpm test -- --watch

# Run specific test file
pnpm --filter @teei/reporting test -- tests/calculator.test.ts
```

---

## 🏗️ Building

```powershell
# Build everything
pnpm build

# Build specific service
pnpm --filter @teei/reporting build

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format code
pnpm format
```

---

## 🐳 Docker Commands

```powershell
# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Stop infrastructure
docker compose -f docker-compose.dev.yml down

# View logs
docker logs teei-postgres
docker logs teei-clickhouse
docker logs teei-redis
docker logs teei-nats

# Restart a service
docker restart teei-postgres

# View resource usage
docker stats

# Check containers
docker ps
```

---

## ⚙️ PM2 Supervisor

```powershell
# Start background stack
pnpm dlx pm2 start ecosystem.config.cjs --env development

# Inspect processes / logs
pnpm dlx pm2 status
pnpm dlx pm2 logs teei-csr-platform --lines 200

# Restart / stop
pnpm dlx pm2 restart teei-csr-platform
pnpm dlx pm2 stop teei-csr-platform
pnpm dlx pm2 delete teei-csr-platform
```

Logs stream to `./logs/pm2-out.log` and `./logs/pm2-error.log` (timestamps enabled). PM2 state is backed up to `C:\Users\ovehe\.pm2_clean\dump.pm2`.

---

## 🔍 Verification

```powershell
# Check health
curl http://localhost:6501/health

# Check PostgreSQL
docker exec -it teei-postgres psql -U teei -d teei_platform -c "SELECT version();"

# Check ClickHouse
curl http://localhost:8123/ping

# Check Redis
docker exec -it teei-redis redis-cli ping
```

---

## 🛠️ Troubleshooting

```powershell
# Check what's using a port
netstat -ano | findstr ":6501"
netstat -ano | findstr ":6509"

# Kill a process by PID
taskkill /PID <PID> /F

# View Docker logs
docker logs -f teei-postgres

# Restart all containers
docker compose -f docker-compose.dev.yml restart

# Inspect PM2-managed stack
pnpm dlx pm2 status
pnpm dlx pm2 logs teei-csr-platform --lines 200
```

> **Port conflict?** If ports 6501-6509 are in use, stop the conflicting processes or override ports in the PM2 ecosystem config before restarting PM2; otherwise it will keep retrying.

---

## 📊 Service Ports

### TEEI CSR Platform Services (65xx Range)

| Service | PM2 Name | Port | URL |
|---------|----------|------|-----|
| API Gateway | `csr-api-gateway` | **6501** | http://localhost:6501 |
| Unified Profile | `csr-unified-profile` | **6502** | http://localhost:6502 |
| Kintell Connector | `csr-kintell-connector` | **6503** | http://localhost:6503 |
| Buddy Service | `csr-buddy-service` | **6504** | http://localhost:6504 |
| Buddy Connector | `csr-buddy-connector` | **6505** | http://localhost:6505 |
| Upskilling Connector | `csr-upskilling-connector` | **6506** | http://localhost:6506 |
| Q2Q AI | `csr-q2q-ai` | **6507** | http://localhost:6507 |
| Safety Moderation | `csr-safety-moderation` | **6508** | http://localhost:6508 |
| Corp Cockpit (Frontend) | `csr-corp-cockpit` | **6509** | http://localhost:6509 |

### Infrastructure Services

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| ClickHouse | 8123 | http://localhost:8123 |
| Redis | 6379 | redis://localhost:6379 |
| NATS | 4222 | nats://localhost:4222 |
| pgAdmin | 5050 | http://localhost:5050 |
| Drizzle Studio | 4983 | http://localhost:4983 |

> **Note**: CSR Platform services are managed by the global PM2 ecosystem config at `D:\Dev\docker\ecosystem.config.cjs`. Use `pm2 list | findstr csr` to view all CSR services.

---

**For detailed instructions, see `RUN_PROJECT.md`**


