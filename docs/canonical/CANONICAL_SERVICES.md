---
status: canonical
last_verified: 2025-01-27
verified_against: "codebase-2025-01-27"
---

# CANONICAL SERVICES

> This is the ONLY authoritative document for service architecture and APIs.

## Service Overview

The TEEI CSR Platform consists of 26+ microservices organized into API services, connectors, infrastructure, compliance, and bots.

## Core Services

### API Gateway
- **Port**: 3017
- **Purpose**: GraphQL/REST gateway, authentication, rate limiting
- **Health**: `/health`, `/health/all`
- **Features**: JWT auth, RBAC, rate limiting, request routing, CORS
- **Dependencies**: Fastify, JWT, NATS, Redis

### Unified Profile
- **Port**: 3018
- **Purpose**: User identity and profile management
- **Health**: `/health`
- **Features**: Profile merging, completeness scoring, external ID mapping
- **Dependencies**: PostgreSQL, NATS

### Buddy Service
- **Port**: 3019
- **Purpose**: Buddy matching and relationship management
- **Health**: `/health`
- **Features**: Match algorithm, conflict resolution, quality scoring
- **Dependencies**: PostgreSQL, NATS

### Q2Q AI
- **Port**: 3021
- **Purpose**: Qualitative-to-Quantitative AI pipeline
- **Health**: `/health`
- **Features**: Text classification, evidence extraction, outcome scoring
- **Dependencies**: Model registry, NATS

### Safety Moderation
- **Port**: 3022
- **Purpose**: Content screening and safety checks
- **Health**: `/health`
- **Features**: Content filtering, flagging, manual review queue
- **Dependencies**: PostgreSQL, NATS

### Analytics
- **Port**: 3023
- **Purpose**: ClickHouse analytics engine, time-series processing
- **Health**: `/health`
- **Features**: Metrics aggregation, cohort analysis, benchmarks
- **Dependencies**: ClickHouse, PostgreSQL

### Journey/NLQ/Notifications
- **Port**: 3024
- **Purpose**: Journey tracking, natural language queries, notifications
- **Health**: `/health`
- **Features**: Journey rules, NLQ engine, multi-channel notifications
- **Dependencies**: PostgreSQL, NATS

### Impact-In
- **Port**: 3025
- **Purpose**: External data ingestion connectors
- **Health**: `/health`
- **Features**: Benevity, Goodera, Workday connectors
- **Dependencies**: External APIs, NATS

### Discord Bot
- **Port**: 3026
- **Purpose**: Discord community integration
- **Health**: N/A (non-HTTP)
- **Features**: Feedback collection, event publishing
- **Dependencies**: Discord.js, NATS

### Reporting
- **Port**: 4017
- **Purpose**: SROI/VIS calculations, report generation
- **Health**: `/health`
- **Features**: Metric calculations, PDF/PPTX export, Gen-AI narratives
- **Dependencies**: PostgreSQL, ClickHouse, Q2Q AI

### Corp Cockpit
- **Port**: 4327
- **Purpose**: Executive dashboard UI (Astro 5 + React)
- **Health**: N/A (frontend)
- **Features**: Dashboard widgets, real-time updates, boardroom mode
- **Dependencies**: API Gateway, Reporting, Analytics

## Service Communication

- **HTTP/REST**: Service-to-service API calls
- **NATS JetStream**: Event-driven messaging
- **GraphQL**: API Gateway exposes GraphQL endpoint
- **SSE**: Real-time updates to dashboard

## Service Health

All services implement `/health` endpoints returning:
- Service status (UP/DOWN)
- Database connectivity
- External dependency status
- Version information
