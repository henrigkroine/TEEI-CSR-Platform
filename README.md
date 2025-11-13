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

- [Platform Architecture](./docs/Platform_Architecture.md)
- [System Diagram](./docs/System_Diagram.md)
- [Journey Funnel](./docs/Journey_Funnel.md)
- [Glossary](./docs/Glossary.md)

## 🛡️ License

MIT License - see [LICENSE](./LICENSE)

---

**Built with ❤️ for social impact**