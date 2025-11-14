# Database Migration Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Actions Workflow                      │
│                   (deploy-staging.yml)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  Apply DB Migration Job   │
              │  kubectl apply -f         │
              │  db-migration.yaml        │
              └──────────────┬────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Job: db-migration                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │         Init Container: pre-flight-check               │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  1. Test database connectivity                    │ │   │
│  │  │  2. Check migration tracking table exists         │ │   │
│  │  │  3. Show current applied migrations               │ │   │
│  │  │  4. Validate environment                          │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
│                             │                                   │
│                             ▼                                   │
│  ┌────────────────────────────────────────────────────────┐   │
│  │         Main Container: migrate                        │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  1. cd packages/shared-schema                     │ │   │
│  │  │  2. pnpm db:migrate                               │ │   │
│  │  │  3. Drizzle ORM applies pending migrations        │ │   │
│  │  │  4. Update __drizzle_migrations table             │ │   │
│  │  │  5. Report success/failure                        │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
│                             │                                   │
│                    ┌────────┴────────┐                          │
│                    │                 │                          │
│                ▼                     ▼                          │
│          ┌─────────┐           ┌─────────┐                     │
│          │ SUCCESS │           │ FAILURE │                     │
│          └────┬────┘           └────┬────┘                     │
└───────────────┼─────────────────────┼──────────────────────────┘
                │                     │
                ▼                     ▼
    ┌───────────────────┐   ┌────────────────────────┐
    │ Continue with     │   │ Abort Deployment       │
    │ Service Deployment│   │ Show Error Logs        │
    │ (Deploy Services) │   │ Notify Team            │
    └───────────────────┘   └────────────────────────┘
                │
                ▼
    ┌───────────────────────┐
    │  Services Running     │
    │  with New Schema      │
    └───────────────────────┘
```

## Rollback Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                Emergency Rollback Trigger                        │
│           (Manual: ./k8s/jobs/migrate.sh rollback)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │  Apply DB Rollback Job   │
              │  kubectl apply -f        │
              │  db-rollback.yaml        │
              └──────────────┬────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Job: db-rollback                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │      Init Container: pre-rollback-check                │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  1. Test database connectivity                    │ │   │
│  │  │  2. Show current migration status                 │ │   │
│  │  │  3. Display WARNING about data loss               │ │   │
│  │  │  4. Wait 10 seconds (safety delay)                │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
│                             │                                   │
│                             ▼                                   │
│  ┌────────────────────────────────────────────────────────┐   │
│  │         Main Container: rollback                       │   │
│  │  ┌──────────────────────────────────────────────────┐ │   │
│  │  │  1. Execute rollback SQL script                   │ │   │
│  │  │     (e.g., 0013_rollback.sql)                     │ │   │
│  │  │  2. DROP tables, functions, views                 │ │   │
│  │  │  3. Report completion                             │ │   │
│  │  │  4. Show updated migration status                 │ │   │
│  │  └──────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │  Schema Reverted      │
                  │  Redeploy Old Code    │
                  │  Scale Services Up    │
                  └───────────────────────┘
```

## Data Flow

```
┌──────────────────┐
│  Migration Files │ (packages/shared-schema/migrations/*.sql)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Drizzle ORM     │ (src/migrate.ts)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  PostgreSQL DB   │ (RDS, CloudSQL, etc.)
│  - Apply DDL     │
│  - Track in      │
│    __drizzle_    │
│    migrations    │
└──────────────────┘
```

## Secret Management Flow

```
┌─────────────────────────────────────────────────────┐
│              Secret Creation (One-time)              │
│                                                      │
│  Option 1: Sealed Secrets                           │
│  ┌─────────────────────────────────────────────┐  │
│  │ kubectl create secret ... |                  │  │
│  │ kubeseal > sealed-secrets/db-secrets.yaml    │  │
│  └─────────────────────────────────────────────┘  │
│                                                      │
│  Option 2: SOPS                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ sops -e secrets/db-secrets.yaml              │  │
│  │ sops -d | kubectl apply -f -                 │  │
│  └─────────────────────────────────────────────┘  │
│                                                      │
│  Option 3: Vault                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │ Vault Agent Injector                         │  │
│  │ (Automatic injection at runtime)             │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ K8s Secret:          │
        │ teei-shared-db-      │
        │ secrets              │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Migration Job Pod    │
        │ (env vars from       │
        │  secret)             │
        └──────────────────────┘
```

## RBAC Model

```
┌──────────────────────────────────────────────────────┐
│                 ServiceAccount                       │
│              teei-db-migration                       │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │       Role            │
         │  teei-db-migration    │
         ├───────────────────────┤
         │  Resources:           │
         │  - secrets (get)      │
         │    - teei-shared-     │
         │      db-secrets       │
         │  - configmaps (get)   │
         │    - teei-migration-  │
         │      scripts          │
         └───────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │    RoleBinding        │
         │  teei-db-migration    │
         └───────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Pod Security                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  securityContext:                                    │   │
│  │    runAsNonRoot: true                                │   │
│  │    runAsUser: 1000                                   │   │
│  │    runAsGroup: 1000                                  │   │
│  │    fsGroup: 1000                                     │   │
│  │    seccompProfile:                                   │   │
│  │      type: RuntimeDefault                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                Container Security                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  securityContext:                                    │   │
│  │    allowPrivilegeEscalation: false                   │   │
│  │    readOnlyRootFilesystem: true                      │   │
│  │    capabilities:                                     │   │
│  │      drop: [ALL]                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Network Security                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  NetworkPolicy:                                      │   │
│  │    - Allow egress to DB only                         │   │
│  │    - Deny all other traffic                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Migration Lifecycle

```
┌────────────┐
│   Write    │ Developer writes new migration
│ Migration  │ in packages/shared-schema/migrations/
└─────┬──────┘
      │
      ▼
┌────────────┐
│   Test     │ Test locally with Docker
│  Locally   │ docker run postgres:16
└─────┬──────┘
      │
      ▼
┌────────────┐
│   Commit   │ Commit migration to Git
│  & Push    │ git commit -m "migration"
└─────┬──────┘
      │
      ▼
┌────────────┐
│   Build    │ GitHub Actions builds
│   Image    │ shared-schema image
└─────┬──────┘
      │
      ▼
┌────────────┐
│   Deploy   │ Workflow triggers on
│  Workflow  │ push to develop
└─────┬──────┘
      │
      ▼
┌────────────┐
│ Migration  │ Job runs migrations
│    Job     │ in cluster
└─────┬──────┘
      │
      ├─── SUCCESS ──────┐
      │                  ▼
      │            ┌────────────┐
      │            │  Deploy    │ Services deployed
      │            │ Services   │ with new schema
      │            └────────────┘
      │
      └─── FAILURE ──────┐
                         ▼
                   ┌────────────┐
                   │   Abort    │ Deployment stopped
                   │  Notify    │ Team alerted
                   └────────────┘
```

## Monitoring Stack

```
┌────────────────────────────────────────────────────────┐
│                 Migration Job                          │
└────────────────────┬───────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
  ┌─────────┐  ┌─────────┐  ┌─────────┐
  │ Logs    │  │ Metrics │  │ Events  │
  │ (stdout)│  │ (Job    │  │ (K8s    │
  │         │  │  Status)│  │  Events)│
  └────┬────┘  └────┬────┘  └────┬────┘
       │            │            │
       └────────────┼────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │  Observability Stack   │
       │  - CloudWatch          │
       │  - Datadog             │
       │  - Prometheus          │
       │  - Grafana             │
       └────────────────────────┘
```

## Error Handling Flow

```
┌────────────────────┐
│ Migration Fails    │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Job Status:        │
│ - backoffLimit: 3  │
│ - Retry with       │
│   exponential      │
│   backoff          │
└────────┬───────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌────────┐
│Retry 1│ │All     │
│Retry 2│ │Retries │
│Retry 3│ │Failed  │
└───┬───┘ └───┬────┘
    │         │
    └────┬────┘
         │
         ▼
┌────────────────────┐
│ Job Status: Failed │
│ - Log detailed     │
│   error            │
│ - Abort workflow   │
│ - Notify team      │
└────────────────────┘
         │
         ▼
┌────────────────────┐
│ Team Investigates  │
│ - View logs        │
│ - Fix migration    │
│ - Re-deploy        │
└────────────────────┘
```

## Key Design Decisions

1. **Init Container Pattern**
   - Pre-flight checks before main migration
   - Fails fast if database unreachable
   - Provides early feedback

2. **Deployment Gate**
   - Migrations MUST succeed before services deploy
   - Prevents schema/code mismatch
   - Protects data integrity

3. **Drizzle ORM**
   - Provides migration tracking
   - Handles migration order
   - Supports TypeScript types

4. **Job vs Deployment**
   - Jobs run once to completion
   - Better for one-time tasks
   - Automatic cleanup with TTL

5. **Separate Rollback Job**
   - Manual trigger only
   - Requires explicit confirmation
   - Prevents accidental rollbacks

6. **Security Hardening**
   - Non-root user
   - Read-only filesystem
   - Minimal RBAC permissions
   - No privilege escalation

## References

- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
