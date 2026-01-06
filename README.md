# TEEI CSR Platform

A unified platform for managing Corporate Social Responsibility (CSR) initiatives, connecting corporate employees with refugees and asylum seekers through mentorship, language exchange, and upskilling programs.

**Mission**: Transform qualitative social impact into quantifiable business outcomes that corporates can measure, report, and optimize.

## 🎯 Key Features

- **Unified Journey Tracking**: Buddy → Language Connect → Upskilling → Mentorship → Employment
- **Q2Q AI Engine**: Converts qualitative feedback into quantitative outcomes
- **Live SROI Dashboard**: Real-time Social Return on Investment calculations
- **Corporate Cockpit**: Executive dashboards with impact metrics
- **Privacy-First Design**: GDPR-compliant with data segmentation
- **Integration Ready**: APIs for Benevity, Goodera, and Workday

## 🏗️ Architecture

- **Monorepo**: PNPM workspaces with Turbo for efficient builds
- **Frontend**: Astro + React + TypeScript (Corp Cockpit dashboard)
- **Backend**: Node.js + tRPC for type-safe APIs
- **Database**: PostgreSQL with Drizzle ORM
- **Analytics**: ClickHouse for time-series data
- **Messaging**: NATS for event-driven communication
- **Storage**: MinIO (S3-compatible)
- **AI**: OpenAI for Q2Q AI and embeddings

## 📂 Project Structure

```
teei-csr-platform/
├── apps/
│   └── corp-cockpit-astro/        # Corporate admin dashboard
├── services/
│   ├── buddy-service/              # Buddy matching & lifecycle
│   ├── kintell-connector/          # Kintell integration
│   ├── upskilling-connector/       # Training platform integration
│   ├── unified-profile/            # Aggregated stakeholder data
│   ├── q2q-ai/                     # Question-to-Question AI
│   ├── reporting/                  # Impact analytics
│   ├── safety-moderation/          # Content moderation
│   ├── discord-bot/                # Community engagement
│   ├── notifications/              # Multi-channel notifications
│   └── api-gateway/                # Unified API gateway
├── packages/
│   ├── shared-schema/              # Drizzle schemas & migrations
│   ├── event-contracts/            # Event definitions
│   ├── shared-types/               # TypeScript types
│   └── shared-utils/               # Common utilities
└── docs/                           # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PNPM 8+
- Docker & Docker Compose

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start infrastructure
docker compose up -d

# Run migrations
pnpm db:migrate

# Start all services
pnpm dev
```

### Verify Setup

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## 🌐 Service Ports

**TEEI CSR Platform Services** (65xx Range - Managed by PM2 ecosystem):

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
| Corp Cockpit (Dashboard) | `csr-corp-cockpit` | **6509** | http://localhost:6509 |

> **Note**: Services are managed by the global PM2 ecosystem config at `D:\Dev\docker\ecosystem.config.cjs`.  
> Use `pm2 list | findstr csr` to view all CSR services.  
> See [CLAUDE.md](./CLAUDE.md) for detailed port information and PM2 commands.

## Development

### Scripts

```bash
pnpm dev              # Start all services in dev mode
pnpm build            # Build all packages
pnpm typecheck        # Type check all packages
pnpm lint             # Lint all packages
pnpm lint:fix         # Fix linting issues
pnpm test             # Run all tests
pnpm format           # Format code with Prettier
pnpm commit           # Guided conventional commit
pnpm db:generate      # Generate database migrations
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Drizzle Studio
```

### Agent System

This project uses a 30-agent swarm architecture for development. See:
- `@AGENTS.md` - Architecture & standards (reference with `@AGENTS.md` in Claude)
- `MULTI_AGENT_PLAN.md` - Task coordination
- `.claude/agents/` - Agent definitions

## 📊 Impact Metrics

- **Integration Score**: 0-1 scale measuring social integration
- **Language Level**: CEFR-based proficiency tracking
- **Job Readiness**: Composite score from multiple signals
- **VIS**: Volunteer Impact Score
- **SROI**: Social Return on Investment ratio

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:
- Development workflow
- Branch naming
- Commit conventions
- Pull request process
- Code standards

## 🔐 Security

See [SECURITY.md](./SECURITY.md) for:
- Reporting vulnerabilities
- Security best practices
- Implemented security features

## 📚 Documentation

> **📖 Start Here:** [TEEI Platform Overview](./docs/TEEI_PLATFORM_OVERVIEW.md) - Complete guide to TEEI, its programs, and what the CSR Platform does. Essential reading for all developers and stakeholders.

- [Platform Architecture](./docs/Platform_Architecture.md)
- [System Diagram](./docs/System_Diagram.md)
- [Journey Funnel](./docs/Journey_Funnel.md)
- [Glossary](./docs/Glossary.md)

## 🛡️ License

MIT License - see [LICENSE](./LICENSE)

---

**Built with ❤️ for social impact**