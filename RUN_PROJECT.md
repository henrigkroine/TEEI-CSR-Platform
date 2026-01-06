# 🚀 How to Run TEEI CSR Platform on Your Computer

**Complete step-by-step guide for your high-end workstation**

---

## ✅ Prerequisites Check

Before starting, verify you have:

- ✅ **Node.js**: v20.0.0 or higher
  ```powershell
  node --version  # Should show v20.x.x or higher
  ```

- ✅ **PNPM**: v8.0.0 or higher
  ```powershell
  pnpm --version  # Should show 8.x.x or higher
  ```
  If not installed: `npm install -g pnpm`

- ✅ **Docker Desktop**: Running and accessible
  ```powershell
  docker --version  # Should show Docker version
  docker ps         # Should not error
  ```

- ✅ **Git**: For cloning (if needed)
  ```powershell
  git --version
  ```

---

## 📦 Step 1: Install Dependencies

Open PowerShell in your project directory:

```powershell
# Navigate to project root
cd "D:\Dev\VS Projects\TEEI\TEEI_CSR_Platform"

# Install all dependencies (this may take 5-10 minutes)
pnpm install
```

**Expected output**: Installs dependencies for all packages, services, and apps.

---

## 🐳 Step 2: Start Infrastructure (Docker)

### Option A: Use Optimized Configuration (Recommended)

For your powerful workstation (128GB RAM, 16 cores):

```powershell
# Start all infrastructure with optimized settings
docker compose -f docker-compose.dev.yml up -d
```

This starts:
- **PostgreSQL 16**: Port 5432 (64GB RAM, 16 cores)
- **ClickHouse**: Ports 8123, 9000 (32GB RAM, 8 cores)
- **Redis**: Port 6379 (8GB RAM)
- **NATS**: Ports 4222, 8222 (8GB RAM)
- **pgAdmin**: Port 5050 (database management UI)

### Option B: Use Standard Configuration

If you prefer the standard setup:

```powershell
docker compose up -d
```

### Verify Infrastructure is Running

```powershell
# Check all containers are running
docker ps

# You should see:
# - teei-postgres
# - teei-clickhouse
# - teei-redis
# - teei-nats
# - teei-pgadmin

# Check PostgreSQL is ready
docker logs teei-postgres | Select-String "ready to accept connections"
```

---

## ⚙️ Step 3: Environment Configuration

### Create Environment File

```powershell
# Copy example environment file (if it exists)
if (Test-Path .env.example) {
    Copy-Item .env.example .env
}

# Or create a basic .env file
@"
# Database
DATABASE_URL=postgresql://teei:teei_dev_password@localhost:5432/teei_platform

# Redis
REDIS_URL=redis://localhost:6379

# NATS
NATS_URL=nats://localhost:4222

# ClickHouse
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_USER=teei
CLICKHOUSE_PASSWORD=teei_dev_password
CLICKHOUSE_DB=teei_analytics

# Node Environment
NODE_ENV=development
"@ | Out-File -FilePath .env -Encoding utf8
```

**Note**: Most services work with defaults, but you may need to add API keys for:
- OpenAI/Anthropic (for Q2Q AI service)
- Other external services

---

## 🗄️ Step 4: Run Database Migrations

```powershell
# Run all database migrations
pnpm db:migrate
```

**Expected output**: Creates all tables in PostgreSQL.

**Verify**:
```powershell
# Connect to PostgreSQL and check tables
docker exec -it teei-postgres psql -U teei -d teei_platform -c "\dt"
```

---

## 🌱 Step 5: Seed Database (Optional but Recommended)

```powershell
# Add sample data for testing
pnpm db:seed
```

This creates:
- Sample users and companies
- Test programs and enrollments
- Sample data for testing

---

## 🚀 Step 6: Start All Services

### Option A: Foreground (classic)

```powershell
# Start all services in development mode (blocks current terminal)
pnpm dev
```

### Option B: Background via PM2 (recommended on this workstation)

```powershell
# Launch the PM2 supervisor defined in ecosystem.config.cjs
pnpm dlx pm2 start ecosystem.config.cjs --env development

# Monitor & tail logs
pnpm dlx pm2 status
pnpm dlx pm2 logs teei-csr-platform
```

**PM2 Highlights**
- Process name: `teei-csr-platform`
- Command: `cmd /c pnpm dev` (runs all 9 services via `concurrently`)
- Crash-loop protection: 3 restart attempts, 3-minute min uptime, 20-second delay, exponential backoff, 30-second kill timeout
- Memory guard: 4 GB limit to detect runaway dev stacks
- Logs: `./logs/pm2-out.log` & `./logs/pm2-error.log` with timestamps
- State file: `C:\Users\ovehe\.pm2_clean\dump.pm2` (auto-restore after reboot)

> ⚠️ **Port conflict warning**: If ports 6501-6509 are already in use, stop the conflicting processes or override ports in `.env` before starting PM2. Otherwise PM2 will keep restarting until services can bind to their ports.

**What starts either way**:
- API Gateway: http://localhost:6501
- Unified Profile: http://localhost:6502
- Kintell Connector: http://localhost:6503
- Buddy Service: http://localhost:6504
- Buddy Connector: http://localhost:6505
- Upskilling Connector: http://localhost:6506
- Q2Q AI: http://localhost:6507
- Safety Moderation: http://localhost:6508
- **Corporate Cockpit (Frontend)**: http://localhost:6509

**Note**: With your powerful hardware, all services can run simultaneously without issues!

### Start Individual Services (Optional)

If you only need specific services:

```powershell
# Start just the frontend
pnpm --filter @teei/corp-cockpit-astro dev

# Start just API Gateway
pnpm --filter @teei/api-gateway dev

# Start just Reporting service
pnpm --filter @teei/reporting dev
```

---

## ✅ Step 7: Verify Everything is Running

### Check Service Health

```powershell
# Check API Gateway health
curl http://localhost:6501/health

# Check all services health (if endpoint exists)
curl http://localhost:6501/health/all

# Check frontend is running
curl http://localhost:6509
```

### Check PM2 Supervisor (if you used Option B)

```powershell
pnpm dlx pm2 status
pnpm dlx pm2 logs teei-csr-platform --lines 100

# Restart or stop background stack if needed
pnpm dlx pm2 restart teei-csr-platform
pnpm dlx pm2 stop teei-csr-platform
```

### Check Docker Containers

```powershell
# View resource usage
docker stats

# Check logs if something isn't working
docker logs teei-postgres
docker logs teei-clickhouse
docker logs teei-redis
docker logs teei-nats
```

### Check Database Connection

```powershell
# Test PostgreSQL connection
docker exec -it teei-postgres psql -U teei -d teei_platform -c "SELECT version();"

# Test ClickHouse connection
curl http://localhost:8123/ping
```

---

## 🌐 Step 8: Access the Application

### Corporate Cockpit (Main Dashboard)

Open your browser and navigate to:

```
http://localhost:6509
```

**Expected**: You should see the Corporate Cockpit dashboard.

> 🔁 If port `6509` is already occupied, stop the conflicting process or override the port in the PM2 ecosystem config.

### Database Management (pgAdmin)

```
http://localhost:5050
```

**Login**:
- Email: `admin@teei.local`
- Password: `admin`

**Connect to PostgreSQL**:
- Host: `teei-postgres` (or `localhost`)
- Port: `5432`
- Database: `teei_platform`
- Username: `teei`
- Password: `teei_dev_password`

### Drizzle Studio (Database GUI)

```powershell
# Start Drizzle Studio
pnpm db:studio
```

Opens at: http://localhost:4983

---

## 🧪 Step 9: Test the Platform

### Test API Endpoints

```powershell
# Test health endpoint
curl http://localhost:6501/health

# Test unified profile
curl http://localhost:6502/health

# Test Q2Q AI (if configured)
curl -X POST http://localhost:6507/classify/text `
  -H "Content-Type: application/json" `
  -d '{\"text\": \"I feel confident and belong here.\", \"userId\": \"test-123\"}'
```

### Test Frontend

1. Open http://localhost:6509
2. Navigate through the dashboard
3. Check that data loads correctly
4. Test different features

---

## 🛠️ Common Commands

### Development

```powershell
# Start all services
pnpm dev

# Build everything
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint code
pnpm lint

# Format code
pnpm format
```

### PM2 (Process Manager)

```powershell
# Launch background supervisor
pnpm dlx pm2 start ecosystem.config.cjs --env development

# Inspect status / logs
pnpm dlx pm2 status
pnpm dlx pm2 logs teei-csr-platform

# Restart or stop the stack
pnpm dlx pm2 restart teei-csr-platform
pnpm dlx pm2 stop teei-csr-platform
pnpm dlx pm2 delete teei-csr-platform
```

Logs stream to `./logs/pm2-out.log` and `./logs/pm2-error.log` with timestamps. PM2’s dump is stored under `C:\Users\ovehe\.pm2_clean\dump.pm2`.

### Database

```powershell
# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Reset database (WARNING: deletes all data)
pnpm db:reset

# Open Drizzle Studio
pnpm db:studio
```

### Docker

```powershell
# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Stop infrastructure
docker compose -f docker-compose.dev.yml down

# View logs
docker logs teei-postgres
docker logs teei-clickhouse

# Restart a service
docker restart teei-postgres
```

---

## 🐛 Troubleshooting

### Services Won't Start

**Problem**: `pnpm dev` fails or services don't start

**Solutions**:
```powershell
# 1. Check Docker is running
docker ps

# 2. Check ports aren't in use
netstat -ano | findstr ":6501"
netstat -ano | findstr ":6509"

# 3. Check logs
docker logs teei-postgres
docker logs teei-clickhouse

# 4. Restart Docker containers
docker compose -f docker-compose.dev.yml restart

# 5. If using PM2, inspect process list/logs
pnpm dlx pm2 status
pnpm dlx pm2 logs teei-csr-platform --lines 200

# 6. Free API Gateway port or override it
taskkill /PID <PID_FROM_NETSTAT> /F   # or stop the conflicting Docker container
# then restart pnpm dev / PM2 after editing .env (API gateway port)
```

### Database Connection Errors

**Problem**: Can't connect to PostgreSQL

**Solutions**:
```powershell
# 1. Check PostgreSQL is running
docker ps | Select-String postgres

# 2. Check PostgreSQL logs
docker logs teei-postgres

# 3. Test connection manually
docker exec -it teei-postgres psql -U teei -d teei_platform

# 4. Verify DATABASE_URL in .env
Get-Content .env | Select-String DATABASE_URL
```

### Port Already in Use

**Problem**: Ports 6501-6509 or other ports are already in use

**Solutions**:
```powershell
# Find what's using the port
netstat -ano | findstr ":6501"
netstat -ano | findstr ":6509"

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change ports in PM2 ecosystem config or .env file
# Update ecosystem.config.cjs or set PORT environment variable
```

### Out of Memory Errors

**Problem**: Docker containers running out of memory

**Solutions**:
```powershell
# Check Docker Desktop settings
# Settings > Resources > Memory
# Increase to at least 64GB (you have 128GB RAM)

# Or reduce resource limits in docker-compose.dev.yml
# (But with 128GB RAM, this shouldn't be necessary)
```

### Migration Errors

**Problem**: `pnpm db:migrate` fails

**Solutions**:
```powershell
# 1. Check database is running
docker ps | Select-String postgres

# 2. Check migrations folder exists
Test-Path packages/shared-schema/migrations

# 3. Reset database and try again
pnpm db:reset
pnpm db:migrate
```

---

## 📊 Monitoring Performance

### Check Resource Usage

```powershell
# Docker resource usage
docker stats

# Expected with optimized config:
# - PostgreSQL: ~32GB RAM, ~8 CPU cores
# - ClickHouse: ~16GB RAM, ~4 CPU cores
# - Redis: ~2GB RAM
# - NATS: ~2GB RAM
```

### Check Service Logs

```powershell
# Follow PostgreSQL logs
docker logs -f teei-postgres

# Follow a specific service (if running in separate terminal)
# Check the terminal where you ran `pnpm dev`
```

---

## 🎯 Next Steps

Once everything is running:

1. **Explore the Dashboard**: http://localhost:4321
2. **Read Documentation**: Check `docs/` folder
3. **Run Tests**: `pnpm test`
4. **Check Database**: Use pgAdmin or Drizzle Studio
5. **Review Code**: Start with `apps/corp-cockpit-astro/`

---

## 📚 Additional Resources

- **Architecture**: `docs/Platform_Architecture.md`
- **Database Schema**: `docs/Database_Schema.md`
- **API Documentation**: `packages/openapi/`
- **Local Dev Optimization**: `docs/LOCAL_DEV_OPTIMIZATION.md`
- **Hardware Optimization**: `HARDWARE_OPTIMIZATION_SUMMARY.md`

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Logs**: `docker logs <container-name>`
2. **Check Documentation**: `docs/` folder
3. **Verify Prerequisites**: Node.js, PNPM, Docker versions
4. **Check GitHub Issues**: If using GitHub

---

## ✅ Success Checklist

- [ ] Dependencies installed (`pnpm install`)
- [ ] Docker containers running (`docker ps`)
- [ ] Database migrations run (`pnpm db:migrate`)
- [ ] Database seeded (`pnpm db:seed`)
- [ ] Services started (`pnpm dev`)
- [ ] Frontend accessible (http://localhost:6509)
- [ ] Health checks passing (`curl http://localhost:6501/health`)

**Once all checked, you're ready to develop!** 🎉

---

**Your powerful workstation (128GB RAM, 16 cores) can handle everything simultaneously. Enjoy the performance!** 🚀


