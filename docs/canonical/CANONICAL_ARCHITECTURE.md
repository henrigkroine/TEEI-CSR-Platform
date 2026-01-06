---
status: canonical
last_verified: 2025-01-27
verified_against: "codebase-2025-01-27"
---

# Canonical Architecture

## System Overview

TEEI CSR Platform is a microservices-based system enabling corporations to run volunteer programs supporting refugees.

### High-Level Architecture

```
CORPORATE COCKPIT (Astro 5) - Port 4327
│
▼
API GATEWAY - Port 3017
│
┌────┼────┐
▼    ▼    ▼
CORE   AI   PLATFORM
│
▼
PostgreSQL / ClickHouse / Redis / NATS
```

### Services

| Service | Port | Purpose |
|---------|------|---------|
| API Gateway | 3017 | Auth, routing, rate limiting |
| Unified Profile | 3018 | User identity |
| Buddy Service | 3019 | Buddy matching |
| Q2Q AI | 3021 | Qualitative→Quantitative |
| Safety Moderation | 3022 | Content screening |
| Analytics | 3023 | ClickHouse analytics |
| Journey/NLQ/Notifications | 3024 | Journey tracking, NLQ, notifications |
| Impact-In | 3025 | External connectors |
| Discord Bot | 3026 | Community integration |
| Reporting | 4017 | SROI/VIS, reports |
| Corp Cockpit | 4327 | Dashboard UI |

### Data Stores

| Store | Port | Purpose |
|-------|------|---------|
| PostgreSQL | 5432 | Primary OLTP |
| ClickHouse | 8123 | Analytics OLAP |
| Redis | 6379 | Caching |
| NATS | 4222 | Event streaming |

### Key Metrics

- **SROI** = Total Social Value / Total Investment
- **VIS** = Volunteer Impact Score (0-100)
