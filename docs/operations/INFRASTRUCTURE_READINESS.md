# Infrastructure & Operations Readiness (Checklist Item 1)

This document captures the concrete steps and decisions to harden the developer-focused orchestration into a production-ready deployment. The scope aligns with checklist item **1. Infrastructure & Operations** from `docs/PRODUCTION_LAUNCH_PLAN.md`.

---

## 1. PM2 Process Model (Dev/Pre-Prod)

`ecosystem.config.cjs` now defines **one PM2 app per service** instead of a single `pnpm dev` process. Each entry sets its own memory ceiling, ports, and log files.

| PM2 Name              | Package Filter                 | Default Port | Memory Ceiling | Notes |
|-----------------------|--------------------------------|--------------|----------------|-------|
| `teei-api-gateway`    | `@teei/api-gateway`            | 3000         | 750 MB         | Gateway/GraphQL |
| `teei-unified-profile`| `@teei/unified-profile`        | 3001         | 750 MB         | Profile service |
| `teei-kintell-connector` | `@teei/kintell-connector`  | 3002         | 512 MB         | Kintell ingest |
| `teei-buddy-service`  | `@teei/buddy-service`          | 3003         | 512 MB         | Buddy core |
| `teei-buddy-connector`| `@teei/buddy-connector`        | 3004         | 512 MB         | Buddy ingest |
| `teei-upskilling-connector` | `@teei/upskilling-connector` | 3005 | 512 MB | Upskilling ingest |
| `teei-q2q-ai`         | `@teei/q2q-ai`                 | 3006         | 1 GB           | AI pipeline |
| `teei-safety-moderation` | `@teei/safety-moderation`   | 3007         | 750 MB         | Content safety |
| `teei-corp-cockpit`   | `@teei/corp-cockpit-astro`     | 4321 (override via `ASTRO_PORT`) | 2 GB | Astro frontend (`--host 127.0.0.1 --port …`) |

**Operational notes**
1. Create the `logs` directory once (`mkdir logs`) so PM2 can emit per-service logs (e.g., `logs/teei-api-gateway-out.log`).
2. `PORT` is exported per service; override via `.env` or PM2 `ecosystem.config.cjs` if conflicts arise.
3. Astro dev server port can be changed globally by exporting `ASTRO_PORT` before `pm2 start`.

---

## 2. Production Deployment Topology

While PM2 covers dev/staging, production will run on Kubernetes (or VM scale set) with one container per service. Key decisions:

- **Ingress:** Azure Front Door / AWS ALB terminating TLS, routing to API Gateway and Astro.
- **Service mesh (optional):** Linkerd/Istio for mTLS and traffic policies.
- **Containers:** Build via Turborepo pipelines → push to container registry → deployed via Helm/ArgoCD.
- **Scaling:** HPA per service (CPU and queue length). Example: API Gateway min 3 pods, peak 10.
- **Stateful services:** Managed Postgres (Azure Flexible Server/AWS RDS), Managed Redis (Redis Enterprise/Azure Cache), Managed ClickHouse (Altinity.Cloud) or Kubernetes StatefulSets with replicas + backups.
- **Messaging:** NATS JetStream cluster with 3 nodes, persistent storage on SSD.

Deployment stages:
1. **Build**: `pnpm build` → Docker image per service.
2. **Publish**: Tag with `git sha`, push to registry.
3. **Deploy**: Helm release per environment (dev/staging/prod) with config maps for ports/env vars.
4. **Observe**: Prometheus scraping + Grafana dashboards; Loki or Elastic for logs.

---

## 3. Logging & Monitoring Plan

- **Structured Logging:** Configure each service to emit JSON logs (Pino/Winston) with correlation IDs. PM2 dev logs remain plain text for readability.
- **Aggregation:** Use Grafana Loki (or Azure Monitor / CloudWatch Logs). Shipping via Promtail/Fluent Bit; include service name and environment labels.
- **Metrics:**
  - OpenTelemetry SDK in Node services exporting to OTLP collector → Prometheus/Tempo.
  - Custom dashboards for API latency, queue depth, SSE reconnect rates.
- **Alerting:** Grafana alert rules for API error rate >1 %, fresh data SLA breach, PM2 restarts >3/hour (dev).
- **Tracing:** Instrument API Gateway, Q2Q AI, and Reporting service with OTEL spans to identify upstream/downstream latency.

Action items:
1. Add logging configurables to each service (`LOG_LEVEL`, `LOG_FORMAT=json`).
2. Commit `infrastructure/otel/collector-config.yaml` (future task) referencing OTLP endpoint.
3. Extend `docs/PRODUCTION_LAUNCH_PLAN.md` with links once collectors go live.

---

## 4. Port & Environment Override Matrix

| Service | Default Port | Override Mechanism | Notes |
|---------|--------------|--------------------|-------|
| API Gateway | 3017 | `PORT_API_GATEWAY` (env or `.env`) | Change when Open WebUI conflicts |
| Unified Profile | 3018 | `PORT_UNIFIED_PROFILE` env | — |
| Kintell Connector | 3027 | `PORT_KINTELL_CONNECTOR` env | — |
| Buddy Service | 3019 | `PORT_BUDDY_SERVICE` env | — |
| Buddy Connector | 3029 | `PORT_BUDDY_CONNECTOR` env | — |
| Upskilling Connector | 3028 | `PORT_UPSKILLING_CONNECTOR` env | — |
| Q2Q AI | 3021 | `PORT_Q2Q_AI` env | Also requires AI keys |
| Safety Moderation | 3022 | `PORT_SAFETY_MODERATION` env | — |
| Analytics | 3023 | `PORT_ANALYTICS` env | — |
| Journey Engine | 3024 | `PORT_JOURNEY_ENGINE` env | — |
| Notifications | 3024 | `PORT_NOTIFICATIONS` env | — |
| Impact-In | 3025 | `PORT_IMPACT_IN` env | — |
| Reporting | 4017 | `PORT_REPORTING` env | — |
| Discord Bot | 3026 | N/A (Discord.js client) | — |
| Astro Cockpit | 4327 | `ASTRO_PORT` env → PM2 injects into args | Use 5000 when 4327 busy |

To change a port globally:
1. Update `.env` (or PM2 `env`) with new `PORT`.
2. Restart the PM2 app: `pnpm dlx pm2 restart <name>`.
3. Update docs/tests referencing the old URL.

---

## 5. Backup & Restore Strategy (Baseline)

| System | Backup Approach | Restore Drill |
|--------|-----------------|---------------|
| PostgreSQL | Managed backups + WAL shipping; nightly logical dump via `pg_dump` stored in blob storage. | Quarterly restore into staging, run migration verification + integrity checks. |
| ClickHouse | S3/Blob storage snapshots + `clickhouse-backup`; incremental every 6 h. | Monthly restore to analytics sandbox, validate query latency + data completeness. |
| Redis | Daily RDB snapshot + AOF; stored encrypted. | Warm standby redis instance; failover script documented. |
| NATS JetStream | Mirror streams to secondary cluster via JetStream mirror; weekly snapshot. | Test replay using secondary cluster in staging. |
| File storage/logs | Store PM2/ service logs in blob storage with 30-day retention. | Random restoration test to ensure observability compliance. |

**Operational tasks**
1. Automate backup verification (hash checks, sample queries).
2. Document manual runbooks under `docs/operations/runbooks/*.md`.
3. Ensure credentials/secrets consumed from Vault/Key Vault (no plaintext in repo).

---

## 6. Next Steps (to close Item 1)

- [x] Split PM2 config into per-service apps with memory caps and port/env overrides.
- [x] Capture deployment topology and logging/monitoring strategy in this document.
- [x] Provide port override matrix and backup/restore baseline.
- [ ] Implement OTEL collector config + service instrumentation (tracked under Workstream 5).
- [ ] Containerize services and commit Helm manifests (tracked in future tasks).

This satisfies the documentation and configuration changes for checklist item 1. Remaining sub-bullets that require code/deployment artifacts are tracked as follow-up issues.



