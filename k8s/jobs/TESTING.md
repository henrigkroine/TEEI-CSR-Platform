# Database Migration Testing Guide

This guide provides comprehensive testing procedures for the database migration system.

## Table of Contents

1. [Local Testing](#local-testing)
2. [Staging Testing](#staging-testing)
3. [Production Readiness](#production-readiness)
4. [Rollback Testing](#rollback-testing)
5. [Integration Testing](#integration-testing)

## Local Testing

### Prerequisites

- Docker or local PostgreSQL instance
- kubectl configured for staging cluster
- Database credentials
- Shared-schema package built

### 1. Test Migrations Locally

```bash
# Start a test PostgreSQL database
docker run -d \
  --name postgres-test \
  -e POSTGRES_USER=teei \
  -e POSTGRES_PASSWORD=teei_test_password \
  -e POSTGRES_DB=teei_platform \
  -p 5432:5432 \
  postgres:16

# Set database connection
export DATABASE_URL="postgresql://teei:teei_test_password@localhost:5432/teei_platform"

# Run migrations
cd packages/shared-schema
pnpm install
pnpm db:migrate

# Verify schema
docker exec -it postgres-test psql -U teei -d teei_platform -c "\dt"

# Check migration tracking
docker exec -it postgres-test psql -U teei -d teei_platform -c "SELECT * FROM __drizzle_migrations;"

# Cleanup
docker rm -f postgres-test
```

### 2. Test Rollback Locally

```bash
# Start fresh database
docker run -d \
  --name postgres-test \
  -e POSTGRES_USER=teei \
  -e POSTGRES_PASSWORD=teei_test_password \
  -e POSTGRES_DB=teei_platform \
  -p 5432:5432 \
  postgres:16

export DATABASE_URL="postgresql://teei:teei_test_password@localhost:5432/teei_platform"

# Apply migrations
cd packages/shared-schema
pnpm db:migrate

# Test a rollback
docker exec -it postgres-test psql -U teei -d teei_platform \
  -f /path/to/migrations/rollback/0013_rollback.sql

# Verify tables were removed
docker exec -it postgres-test psql -U teei -d teei_platform -c "\dt"

# Cleanup
docker rm -f postgres-test
```

### 3. Test Migration Job Manifest

```bash
# Validate YAML syntax
kubectl apply --dry-run=client -f k8s/jobs/db-migration.yaml

# Validate against server
kubectl apply --dry-run=server -f k8s/jobs/db-migration.yaml -n teei-staging

# Check for RBAC issues
kubectl auth can-i get secrets --as=system:serviceaccount:teei-staging:teei-db-migration -n teei-staging
```

## Staging Testing

### 1. Verify Prerequisites

```bash
# Check if database secret exists
kubectl get secret teei-shared-db-secrets -n teei-staging

# Verify secret contains required keys
kubectl get secret teei-shared-db-secrets -n teei-staging -o jsonpath='{.data}' | jq 'keys'

# Expected keys: DATABASE_URL or PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD

# Test database connectivity from cluster
kubectl run -it --rm psql-test \
  --image=postgres:16-alpine \
  --restart=Never \
  -n teei-staging \
  --env="DATABASE_URL=$(kubectl get secret teei-shared-db-secrets -n teei-staging -o jsonpath='{.data.DATABASE_URL}' | base64 -d)" \
  -- psql "$DATABASE_URL" -c "SELECT version();"
```

### 2. Test Migration Job in Staging

```bash
# Method 1: Using the helper script
./k8s/jobs/migrate.sh migrate --namespace teei-staging

# Method 2: Manual steps
kubectl delete job db-migration -n teei-staging --ignore-not-found=true
kubectl apply -f k8s/jobs/db-migration.yaml -n teei-staging
kubectl logs -f job/db-migration -n teei-staging --all-containers=true

# Wait for completion
kubectl wait --for=condition=Complete job/db-migration -n teei-staging --timeout=600s

# Verify success
kubectl get job db-migration -n teei-staging
kubectl describe job db-migration -n teei-staging
```

### 3. Test Pre-flight Checks

```bash
# Check init container logs
POD=$(kubectl get pods -n teei-staging -l app=db-migration -o jsonpath='{.items[0].metadata.name}')
kubectl logs $POD -n teei-staging -c pre-flight-check

# Expected output:
# ✓ Database connection successful
# ✓ Migration tracking table exists
# Current applied migrations: [list]
```

### 4. Test Migration Failure Handling

```bash
# Simulate a failed migration (modify secret to invalid credentials)
kubectl create secret generic teei-shared-db-secrets-backup \
  --from-literal=DATABASE_URL=$(kubectl get secret teei-shared-db-secrets -n teei-staging -o jsonpath='{.data.DATABASE_URL}' | base64 -d) \
  -n teei-staging

kubectl patch secret teei-shared-db-secrets -n teei-staging \
  -p '{"stringData":{"DATABASE_URL":"postgresql://invalid:invalid@invalid:5432/invalid"}}'

# Run migration (should fail)
kubectl delete job db-migration -n teei-staging --ignore-not-found=true
kubectl apply -f k8s/jobs/db-migration.yaml -n teei-staging

# Check that it fails gracefully
kubectl logs job/db-migration -n teei-staging --all-containers=true

# Restore secret
kubectl delete secret teei-shared-db-secrets -n teei-staging
kubectl create secret generic teei-shared-db-secrets \
  --from-literal=DATABASE_URL=$(kubectl get secret teei-shared-db-secrets-backup -n teei-staging -o jsonpath='{.data.DATABASE_URL}' | base64 -d) \
  -n teei-staging

# Cleanup
kubectl delete secret teei-shared-db-secrets-backup -n teei-staging
kubectl delete job db-migration -n teei-staging
```

### 5. Test Rollback Job

```bash
# Using helper script
./k8s/jobs/migrate.sh rollback --namespace teei-staging

# Manual rollback
kubectl apply -f k8s/jobs/db-rollback.yaml -n teei-staging
kubectl logs -f job/db-rollback -n teei-staging --all-containers=true

# Verify rollback completed
kubectl get job db-rollback -n teei-staging
kubectl describe job db-rollback -n teei-staging
```

## Integration Testing

### 1. Test Full Deployment Pipeline

```bash
# Trigger the staging deployment workflow
gh workflow run deploy-staging.yml

# Or push to develop branch
git push origin develop

# Monitor workflow
gh run watch

# Check migration step in workflow
gh run view --log | grep -A 50 "Run database migrations"
```

### 2. Test Migration Gate (Failure Blocks Deployment)

```bash
# Create a failing migration
# (temporarily modify migration to have invalid SQL)

# Push changes
git push origin develop

# Verify workflow fails at migration step
gh run view --log | grep "Migration job failed"

# Verify services were NOT deployed
kubectl get deployments -n teei-staging

# Revert changes and redeploy
git revert HEAD
git push origin develop
```

### 3. Test Service Compatibility

```bash
# After migration completes, verify services start successfully
kubectl get pods -n teei-staging

# Check service logs for database connection errors
kubectl logs -l part-of=teei-csr-platform -n teei-staging --tail=100 | grep -i "database\|migration\|error"

# Test API endpoints
GATEWAY_URL=$(kubectl get svc -n teei-staging staging-teei-api-gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -f http://${GATEWAY_URL}/health

# Run smoke tests
./scripts/smoke-tests.sh
```

## Production Readiness

### Pre-production Checklist

- [ ] All migrations tested in local environment
- [ ] Migrations successfully applied in staging
- [ ] Rollback scripts tested and verified
- [ ] Services verified to work with new schema
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
- [ ] Monitoring alerts configured

### Performance Testing

```bash
# Measure migration duration
time kubectl wait --for=condition=Complete job/db-migration -n teei-staging --timeout=600s

# Check resource usage
kubectl top pod -n teei-staging -l app=db-migration

# Monitor database load during migration
# (Use your database monitoring tool - e.g., CloudWatch, Datadog, etc.)
```

### Load Testing

```bash
# Apply load to staging environment
# Run load tests before and after migration to compare performance

# Example using k6
k6 run --vus 100 --duration 60s scripts/load-test.js

# Compare database query performance
# Check slow query logs before/after migration
```

## Rollback Testing

### 1. Test Complete Rollback Procedure

```bash
# Full rollback simulation

# Step 1: Baseline
./k8s/jobs/migrate.sh status --namespace teei-staging

# Step 2: Scale down services
kubectl scale deployment --all --replicas=0 -n teei-staging

# Step 3: Run rollback
./k8s/jobs/migrate.sh rollback --namespace teei-staging

# Step 4: Verify schema reverted
kubectl run -it --rm psql --image=postgres:16-alpine --restart=Never -n teei-staging -- \
  psql "$DATABASE_URL" -c "\dt"

# Step 5: Redeploy with old code
git checkout <previous-commit>
git push origin develop --force

# Step 6: Scale up services
kubectl scale deployment --all --replicas=2 -n teei-staging

# Step 7: Verify functionality
./scripts/smoke-tests.sh
```

### 2. Test Partial Rollback

```bash
# Test rolling back specific tables while keeping others

# Run custom rollback SQL
kubectl run -it --rm psql --image=postgres:16-alpine --restart=Never -n teei-staging -- \
  psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS specific_table CASCADE;"

# Verify application still works
./scripts/smoke-tests.sh
```

## Automated Testing

### CI/CD Integration Tests

Add these to your CI/CD pipeline:

```yaml
# .github/workflows/test-migrations.yml
name: Test Database Migrations

on: [pull_request]

jobs:
  test-migrations:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: teei
          POSTGRES_PASSWORD: teei_test
          POSTGRES_DB: teei_platform
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd packages/shared-schema
          pnpm install

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://teei:teei_test@localhost:5432/teei_platform
        run: |
          cd packages/shared-schema
          pnpm db:migrate

      - name: Verify schema
        env:
          DATABASE_URL: postgresql://teei:teei_test@localhost:5432/teei_platform
        run: |
          psql "$DATABASE_URL" -c "\dt" | grep -q "company_users"

      - name: Test rollback
        env:
          DATABASE_URL: postgresql://teei:teei_test@localhost:5432/teei_platform
        run: |
          psql "$DATABASE_URL" -f packages/shared-schema/migrations/rollback/0013_rollback.sql
          psql "$DATABASE_URL" -c "\dt" | grep -v "company_users"
```

## Monitoring & Observability

### Key Metrics to Monitor

1. **Migration Duration**: Track how long migrations take
2. **Job Success Rate**: Monitor migration job success/failure ratio
3. **Database Connections**: Watch for connection pool exhaustion
4. **Query Performance**: Compare query times before/after migration
5. **Error Rates**: Monitor application error rates post-migration

### Setting Up Alerts

```yaml
# Example Prometheus alert rules
groups:
  - name: database-migrations
    rules:
      - alert: MigrationJobFailed
        expr: kube_job_status_failed{job="db-migration"} > 0
        for: 1m
        annotations:
          summary: "Database migration job failed"
          description: "Migration job {{ $labels.job }} failed in namespace {{ $labels.namespace }}"

      - alert: MigrationJobTakingTooLong
        expr: time() - kube_job_status_start_time{job="db-migration"} > 600
        for: 1m
        annotations:
          summary: "Database migration taking too long"
          description: "Migration job {{ $labels.job }} has been running for more than 10 minutes"
```

## Troubleshooting Common Issues

### Issue: Job Pod Crashes Immediately

**Diagnosis:**
```bash
kubectl get pods -n teei-staging -l app=db-migration
kubectl describe pod <pod-name> -n teei-staging
kubectl logs <pod-name> -n teei-staging --previous
```

**Common Causes:**
- Invalid database credentials
- Database not accessible from cluster
- Image pull errors
- Resource limits too low

### Issue: Migration Hangs Indefinitely

**Diagnosis:**
```bash
kubectl logs -f job/db-migration -n teei-staging -c migrate
```

**Common Causes:**
- Deadlocks in database
- Long-running table locks
- Network connectivity issues
- Insufficient database resources

**Resolution:**
```bash
# Kill the job
kubectl delete job db-migration -n teei-staging --force --grace-period=0

# Check database locks
kubectl run -it --rm psql --image=postgres:16-alpine --restart=Never -n teei-staging -- \
  psql "$DATABASE_URL" -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Retry migration
./k8s/jobs/migrate.sh migrate --namespace teei-staging
```

## Best Practices

1. **Always test locally first** - Catch issues before they reach staging
2. **Use transactions** - Ensure migrations are atomic
3. **Test rollbacks** - Every migration should have a tested rollback
4. **Monitor resource usage** - Set appropriate limits and requests
5. **Keep migrations small** - Smaller migrations = easier rollbacks
6. **Version your migrations** - Use sequential numbering
7. **Document breaking changes** - Communicate with the team
8. **Backup before production** - Always have a recovery plan

## Resources

- [Kubernetes Jobs Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Drizzle ORM Migration Docs](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Database Migration Patterns](https://martinfowler.com/articles/evodb.html)
