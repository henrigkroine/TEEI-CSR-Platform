# Local Development Optimization Guide

**Hardware**: AMD Ryzen 9 9950X (16c/32t), 128GB DDR5 RAM, NVMe SSD  
**Purpose**: Leverage powerful workstation for maximum development performance

---

## Quick Start

### 1. Use Optimized Docker Compose

```bash
# Use the optimized docker-compose.dev.yml instead of default
docker compose -f docker-compose.dev.yml up -d
```

**Key Differences**:
- PostgreSQL: 64GB RAM, 16 CPU cores, optimized settings
- ClickHouse: 32GB RAM, 8 CPU cores
- Redis: 8GB RAM, 2 CPU cores
- NATS: 8GB RAM, 4 CPU cores

### 2. Verify Resource Allocation

```bash
# Check Docker resource usage
docker stats

# Expected output:
# teei-postgres:     ~32GB RAM, ~8 CPU cores active
# teei-clickhouse:   ~16GB RAM, ~4 CPU cores active
# teei-redis:        ~2GB RAM,  ~0.5 CPU cores active
# teei-nats:         ~2GB RAM,  ~1 CPU core active
```

---

## PostgreSQL Optimizations

### Memory Allocation

Your PostgreSQL container is configured with:
- **32GB shared_buffers** (25% of allocated RAM)
- **96GB effective_cache_size** (tells planner about available cache)
- **256MB work_mem** (for complex sorts/hash joins)
- **4GB maintenance_work_mem** (for VACUUM, CREATE INDEX)

### Parallel Query Execution

PostgreSQL will use up to **8 parallel workers per query**, leveraging your 16 cores:
- Complex aggregations run in parallel
- Large JOINs benefit from parallel hash joins
- Time-series queries use parallel scans

### Connection Pool

Increase your application connection pool to match:

```typescript
// packages/shared-schema/src/db.ts
export const sql = postgres(connectionString, {
  max: 100,  // Increased from 10 to leverage 500 max_connections
  min: 10,   // Keep warm connections
  idle_timeout: 20,
  connect_timeout: 10,
});
```

---

## Performance Monitoring

### Check PostgreSQL Settings

```sql
-- Verify memory settings
SELECT name, setting, unit 
FROM pg_settings 
WHERE name IN (
  'shared_buffers', 
  'effective_cache_size', 
  'work_mem', 
  'max_parallel_workers_per_gather',
  'max_parallel_workers'
);

-- Check active parallel queries
SELECT pid, query, parallel_workers 
FROM pg_stat_activity 
WHERE parallel_workers > 0;
```

### Monitor Query Performance

```sql
-- Enable pg_stat_statements (already enabled in config)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries
SELECT 
  query,
  calls,
  total_exec_time / 1000 as total_sec,
  mean_exec_time / 1000 as mean_ms,
  max_exec_time / 1000 as max_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Development Workflow Optimizations

### 1. Run Multiple Services Locally

With 128GB RAM, you can run **all services** simultaneously:

```bash
# Start all services
pnpm dev

# This will run:
# - PostgreSQL (64GB RAM)
# - ClickHouse (32GB RAM)
# - Redis (8GB RAM)
# - NATS (8GB RAM)
# - All 26+ microservices
# - Frontend apps
# Total: ~120GB RAM (leaves 8GB for OS/IDE)
```

### 2. Parallel Test Execution

```bash
# Run tests in parallel (leverage 32 threads)
pnpm test -- --threads 32

# Or use Turbo for parallel builds
pnpm build --parallel
```

### 3. Database Seeding

With fast NVMe SSD, seeding is much faster:

```bash
# Seed large datasets
pnpm db:seed --size=large  # Can handle millions of rows quickly
```

### 4. Supervise `pnpm dev` with PM2

`ecosystem.config.cjs` runs the entire monorepo via PM2 so the stack restarts automatically if one of the nine dev services crashes.

- **Process name**: `teei-csr-platform`
- **Command**: `cmd /c pnpm dev` (same as the manual workflow)
- **Crash-loop protection**: 3 restart attempts, 3‑minute minimum uptime, 20‑second restart delay, exponential backoff, 30‑second kill timeout
- **Memory guard**: 4 GB (`max_memory_restart`) for the combined dev processes
- **Logs**: `./logs/pm2-out.log` & `./logs/pm2-error.log` with timestamped entries
- **State**: Saved automatically to `C:\Users\ovehe\.pm2_clean\dump.pm2` for auto-restore

```powershell
# Start background supervisor
pnpm dlx pm2 start ecosystem.config.cjs --env development

# Inspect & tail logs
pnpm dlx pm2 status
pnpm dlx pm2 logs teei-csr-platform

# Restart / stop
pnpm dlx pm2 restart teei-csr-platform
pnpm dlx pm2 stop teei-csr-platform
```

> ⚠️ API Gateway still binds to `localhost:3000`. If Open WebUI Docker is using that port, stop the container or change the gateway port in `.env` **before** launching PM2, otherwise PM2 will keep retrying until the port frees up.

---

## Storage Optimization

### Use Fastest NVMe for Database Volumes

Your Docker volumes are configured to use:
- `D:\Dev\VS Projects\TEEI\TEEI_CSR_Platform\.docker\postgres_data`
- `D:\Dev\VS Projects\TEEI\TEEI_CSR_Platform\.docker\clickhouse_data`

**Recommendation**: Ensure these are on your **Samsung 990 PRO 2TB** (fastest drive).

### Check Disk Performance

```powershell
# Windows: Check disk performance
Get-PhysicalDisk | Select-Object DeviceID, MediaType, HealthStatus, Size

# Verify Docker volumes are on fastest drive
docker volume inspect teei-postgres_data
```

---

## CPU Optimization

### PostgreSQL Parallel Workers

Your PostgreSQL is configured to use:
- **8 parallel workers per query** (max_parallel_workers_per_gather)
- **16 total parallel workers** (max_parallel_workers)

This means:
- Complex aggregations use 8 cores simultaneously
- Multiple queries can run in parallel (up to 16 workers total)
- Large table scans benefit from parallel sequential scans

### ClickHouse Threads

ClickHouse is configured with:
- **16 threads** (max_threads)
- **100 concurrent queries** (max_concurrent_queries)

This allows:
- Parallel query execution
- Concurrent analytics workloads
- Fast aggregations on large datasets

---

## Memory Optimization

### PostgreSQL Shared Buffers

With **32GB shared_buffers**, PostgreSQL can cache:
- Entire frequently-used tables in memory
- Index pages for instant access
- Query result sets

**Impact**: Queries hitting cached data run **10-100x faster**.

### Redis Cache

With **8GB Redis**, you can cache:
- Dashboard KPI results
- SROI/VIS calculations
- Evidence snippets
- User sessions

**Impact**: Reduces database load by **60-80%**.

---

## Benchmarking

### Before Optimization

```bash
# Baseline performance
time pnpm test
# Expected: ~5-10 minutes for full test suite
```

### After Optimization

```bash
# With optimized settings
time pnpm test -- --threads 32
# Expected: ~2-3 minutes (2-3x faster)
```

### Database Query Performance

```sql
-- Test parallel query performance
EXPLAIN ANALYZE
SELECT 
  company_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_scores,
  AVG(score) as avg_score
FROM outcome_scores
WHERE created_at >= '2024-01-01'
GROUP BY company_id, DATE_TRUNC('month', created_at);

-- Look for "Parallel" in the plan:
-- -> Parallel Seq Scan on outcome_scores
--    Workers Planned: 8
--    Workers Launched: 8
```

---

## Troubleshooting

### Docker Resource Limits

If containers are hitting limits:

```bash
# Check current usage
docker stats

# Increase limits in docker-compose.dev.yml if needed
# (You have plenty of headroom with 128GB RAM)
```

### PostgreSQL Not Using Parallel Workers

```sql
-- Check if parallel workers are enabled
SHOW max_parallel_workers_per_gather;  -- Should be 8
SHOW max_parallel_workers;              -- Should be 16

-- Check if query is eligible for parallel execution
EXPLAIN (ANALYZE, BUFFERS) 
SELECT ... FROM large_table WHERE ...;
```

### High Memory Usage

```bash
# Check PostgreSQL memory usage
docker exec teei-postgres psql -U teei -c "
  SELECT 
    name, 
    setting, 
    unit 
  FROM pg_settings 
  WHERE name LIKE '%memory%' 
    OR name LIKE '%buffer%';
"
```

---

## Recommended Development Practices

### 1. Keep All Services Running

With your hardware, there's no need to stop/start services:
- Keep PostgreSQL, ClickHouse, Redis, NATS running 24/7
- Start/stop only the services you're actively developing

### 2. Use Connection Pooling

Always use connection pooling (already configured):
- Prevents connection exhaustion
- Reuses connections efficiently
- Reduces connection overhead

### 3. Monitor Performance

Regularly check:
- `docker stats` for resource usage
- PostgreSQL slow query log
- ClickHouse query logs
- Redis memory usage

### 4. Optimize Queries

With powerful hardware, focus on:
- Query optimization (not hardware scaling)
- Proper indexing
- Efficient JOINs
- Parallel query execution

---

## Next Steps

1. **Start using optimized Docker Compose**:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. **Verify settings are applied**:
   ```sql
   SELECT name, setting FROM pg_settings 
   WHERE name IN ('shared_buffers', 'max_parallel_workers');
   ```

3. **Run benchmarks**:
   ```bash
   pnpm test -- --threads 32
   ```

4. **Monitor performance**:
   ```bash
   docker stats
   ```

---

**Your workstation is a beast - use it!** 🚀

With these optimizations, you should see:
- **2-3x faster** test execution
- **10-100x faster** cached queries
- **8x parallel** query execution
- **No resource constraints** for local development


