# Database Migration Jobs

This directory contains Kubernetes Job manifests for database schema migrations and rollback operations.

## Overview

The migration system uses Drizzle ORM to apply database schema changes before service deployments. This ensures that the database schema is always in sync with the application code.

## Files

- `db-migration.yaml` - Main migration Job that runs before deployments
- `db-rollback.yaml` - Emergency rollback Job for reverting failed migrations
- `README.md` - This file

## Architecture

### Migration Job (db-migration.yaml)

The migration Job follows this workflow:

1. **Init Container (Pre-flight Check)**
   - Tests database connectivity
   - Checks if migration tracking table exists
   - Shows current applied migrations
   - Validates environment before proceeding

2. **Main Container (Migration Execution)**
   - Runs `pnpm db:migrate` from the shared-schema package
   - Uses Drizzle ORM to apply pending migrations
   - Tracks migration history in `__drizzle_migrations` table
   - Reports success/failure with detailed logs

3. **Security Features**
   - Non-root user (UID 1000)
   - Read-only root filesystem
   - No privilege escalation
   - Drops all capabilities
   - Service account with minimal RBAC permissions

### Rollback Job (db-rollback.yaml)

The rollback Job provides emergency schema reversion:

1. **Pre-rollback Safety Check**
   - Verifies database connectivity
   - Shows current migration status
   - Warns about data loss implications
   - Waits 10 seconds before proceeding

2. **Rollback Execution**
   - Executes specific SQL rollback script
   - Uses scripts from `packages/shared-schema/migrations/rollback/`
   - Reports success/failure
   - Shows updated migration status

## Usage

### Running Migrations (Automated)

Migrations run automatically during the staging deployment workflow:

```bash
# Triggered by deploy-staging.yml workflow
# Runs before service deployments
# Blocks deployment if migrations fail
```

### Running Migrations (Manual)

To manually trigger a migration:

```bash
# Apply the migration job
kubectl apply -f k8s/jobs/db-migration.yaml -n teei-staging

# Watch the logs
kubectl logs -f job/db-migration -n teei-staging --all-containers=true

# Check status
kubectl describe job db-migration -n teei-staging

# Clean up after success
kubectl delete job db-migration -n teei-staging
```

### Running Rollbacks (Emergency Only)

⚠️ **WARNING**: Rollbacks may cause data loss. Only use in emergencies after consulting with the team.

```bash
# Step 1: Stop all services to prevent data corruption
kubectl scale deployment --all --replicas=0 -n teei-staging

# Step 2: Update the rollback script in db-rollback.yaml
# Edit the ROLLBACK_SCRIPT env var to specify which migration to rollback

# Step 3: Apply the rollback job
kubectl apply -f k8s/jobs/db-rollback.yaml -n teei-staging

# Step 4: Watch the rollback logs
kubectl logs -f job/db-rollback -n teei-staging --all-containers=true

# Step 5: Verify the rollback
kubectl describe job db-rollback -n teei-staging

# Step 6: Clean up
kubectl delete job db-rollback -n teei-staging

# Step 7: Redeploy services with compatible code
# kubectl scale deployment --all --replicas=2 -n teei-staging
```

## Required Secrets

Both jobs require the following secret to be present in the namespace:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-shared-db-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@host:5432/database"
  # Or individual connection parameters:
  PGHOST: "postgres.example.com"
  PGPORT: "5432"
  PGDATABASE: "teei_platform"
  PGUSER: "teei_app"
  PGPASSWORD: "secure_password"
```

### Creating the Secret

Choose one of these methods:

#### Option 1: Sealed Secrets (Recommended)

```bash
# Create a sealed secret
kubectl create secret generic teei-shared-db-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --dry-run=client -o yaml | \
  kubeseal --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  --format yaml > k8s/overlays/staging/sealed-secrets/db-secrets.yaml

# Apply the sealed secret
kubectl apply -f k8s/overlays/staging/sealed-secrets/db-secrets.yaml -n teei-staging
```

#### Option 2: SOPS Encryption

```bash
# Create encrypted secret using SOPS
cat <<EOF > k8s/overlays/staging/secrets/db-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-shared-db-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
EOF

# Encrypt with SOPS
sops -e -i k8s/overlays/staging/secrets/db-secrets.yaml

# Decrypt and apply during deployment
sops -d k8s/overlays/staging/secrets/db-secrets.yaml | kubectl apply -f - -n teei-staging
```

#### Option 3: Vault Integration

```bash
# Configure Vault integration (see k8s/base/secrets/VAULT_INTEGRATION.md)
# Secrets will be automatically injected at runtime
```

## Migration Workflow in CI/CD

The GitHub Actions workflow (`deploy-staging.yml`) integrates migrations:

```yaml
- name: Run database migrations (gate)
  run: |
    # Delete any existing migration job
    kubectl delete job db-migration -n ${KUBE_NAMESPACE} --ignore-not-found=true

    # Apply the migration job
    kubectl apply -f k8s/jobs/db-migration.yaml -n ${KUBE_NAMESPACE}

    # Wait for completion (max 10 minutes)
    kubectl wait --for=condition=Complete job/db-migration -n ${KUBE_NAMESPACE} --timeout=600s

    # If migration fails, abort deployment
    # Services are NOT deployed unless migrations succeed
```

## Monitoring & Debugging

### Check Migration Status

```bash
# List all migration jobs
kubectl get jobs -n teei-staging -l app=db-migration

# Check job status
kubectl describe job db-migration -n teei-staging

# View logs
kubectl logs job/db-migration -n teei-staging --all-containers=true

# View migration history in database
kubectl run -it --rm psql --image=postgres:16-alpine --restart=Never -n teei-staging -- \
  psql "$DATABASE_URL" -c "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC;"
```

### Common Issues

#### Issue: "Cannot connect to database"

**Solution**: Verify the database secret exists and contains valid credentials:

```bash
kubectl get secret teei-shared-db-secrets -n teei-staging
kubectl describe secret teei-shared-db-secrets -n teei-staging
```

#### Issue: "Migration tracking table does not exist"

**Solution**: This is normal for first-time setup. Drizzle will create the table automatically.

#### Issue: "Migration failed with SQL error"

**Solution**: Check the migration logs for SQL errors, then either:
1. Fix the migration SQL and re-apply
2. Rollback and fix the migration
3. Manually fix the database state

```bash
# View detailed error logs
kubectl logs job/db-migration -n teei-staging --all-containers=true --tail=100
```

#### Issue: "Job timeout after 10 minutes"

**Solution**: Increase `activeDeadlineSeconds` in the Job spec if migrations take longer:

```yaml
spec:
  activeDeadlineSeconds: 1200  # 20 minutes
```

## Migration Best Practices

### Writing Migrations

1. **Keep migrations small and focused** - One logical change per migration
2. **Make migrations idempotent** - Use `IF NOT EXISTS`, `IF EXISTS` clauses
3. **Test migrations locally first** - Run migrations on a test database before staging
4. **Provide rollback scripts** - Every migration should have a corresponding rollback
5. **Document breaking changes** - Add comments explaining what changed and why

### Testing Migrations

```bash
# Test locally with Docker
docker run -d --name postgres-test -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:16
export DATABASE_URL="postgresql://postgres:test@localhost:5432/postgres"

# Run migrations
cd packages/shared-schema
pnpm db:migrate

# Verify schema
psql "$DATABASE_URL" -c "\dt"

# Test rollback
psql "$DATABASE_URL" -f migrations/rollback/0013_rollback.sql

# Cleanup
docker rm -f postgres-test
```

### Deployment Safety

1. **Always backup before migrations** - Take a database snapshot before deploying
2. **Scale down services during migrations** - Prevent concurrent access during schema changes
3. **Monitor migration progress** - Watch logs in real-time during deployment
4. **Have a rollback plan** - Know how to revert if something goes wrong
5. **Test in staging first** - Never run untested migrations in production

## Troubleshooting

### View Migration Job Logs

```bash
# Get all pods for the migration job
kubectl get pods -n teei-staging -l app=db-migration

# View logs from specific pod
kubectl logs <pod-name> -n teei-staging -c pre-flight-check
kubectl logs <pod-name> -n teei-staging -c migrate

# View events
kubectl get events -n teei-staging --sort-by='.lastTimestamp' | grep db-migration
```

### Force Job Cleanup

```bash
# Delete failed job
kubectl delete job db-migration -n teei-staging --force --grace-period=0

# Delete all migration-related pods
kubectl delete pods -n teei-staging -l app=db-migration
```

### Manual Migration

If the automated migration fails, you can run migrations manually:

```bash
# Connect to database
kubectl run -it --rm psql --image=postgres:16-alpine --restart=Never -n teei-staging -- \
  psql "$DATABASE_URL"

# Or from a pod with the shared-schema package
kubectl run -it --rm migrate --image=ghcr.io/henrigkroine/teei-shared-schema:latest --restart=Never -n teei-staging -- sh

# Inside the pod:
cd /app/packages/shared-schema
pnpm db:migrate
```

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/migrations)
- [Kubernetes Jobs Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Migration Scripts](../../packages/shared-schema/migrations/)
- [Rollback Scripts](../../packages/shared-schema/migrations/rollback/)

## Support

For issues or questions:
1. Check the logs: `kubectl logs job/db-migration -n teei-staging --all-containers=true`
2. Review this README
3. Consult the team's deployment runbook
4. Escalate to the DevOps team if needed
