# TEEI CSR Platform - Agent Context

> **Context file for Claude AI agents working on this monorepo**
> Referenced via `@AGENTS.md` in Claude Code

## 🎯 Mission

Build a unified CSR (Corporate Social Responsibility) platform that connects corporate employees seeking mentorship/language practice with refugees/asylum seekers, while providing impact tracking, AI-powered Q&A, and comprehensive reporting.

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- Astro + React + TypeScript (Corp Cockpit)
- TailwindCSS for styling
- Zustand for state management
- React Query for data fetching

**Backend:**
- Node.js + TypeScript
- tRPC for type-safe APIs
- NATS for event-driven messaging
- Drizzle ORM + PostgreSQL
- ClickHouse for analytics

**Infrastructure:**
- Docker + Docker Compose (local)
- MinIO (S3-compatible storage)
- NATS (event bus)
- PostgreSQL (primary DB)
- ClickHouse (analytics)

### Monorepo Structure

```
teei-csr-platform/
├── apps/
│   └── corp-cockpit-astro/        # Admin dashboard for corporate teams
├── services/
│   ├── buddy-service/              # Buddy matching & lifecycle management
│   ├── kintell-connector/          # Integration with Kintell (Language/Mentorship)
│   ├── upskilling-connector/       # Integration with upskilling platforms
│   ├── unified-profile/            # Aggregated stakeholder profiles
│   ├── q2q-ai/                     # Question-to-Question AI service
│   ├── reporting/                  # Impact & analytics reporting
│   ├── safety-moderation/          # Content moderation & safety
│   ├── discord-bot/                # Community engagement bot
│   ├── notifications/              # Multi-channel notifications
│   └── api-gateway/                # Unified API gateway
├── packages/
│   ├── shared-schema/              # Drizzle schemas & migrations
│   ├── event-contracts/            # Event definitions & validators
│   ├── shared-types/               # Shared TypeScript types
│   └── shared-utils/               # Common utilities
└── reports/                        # Agent deliverable reports
```

## 🔧 Build & Development Commands

### Root Commands (run from monorepo root)

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                 # Start all services in dev mode
pnpm dev --filter=<pkg>  # Start specific package

# Build
pnpm build               # Build all packages
pnpm -w typecheck        # Type check all packages
pnpm -w lint             # Lint all packages
pnpm -w lint:fix         # Fix linting issues
pnpm -w format           # Format code with Prettier
pnpm -w test             # Run all tests

# Database
pnpm db:generate         # Generate migrations
pnpm db:migrate          # Run migrations
pnpm db:studio           # Open Drizzle Studio

# Git
pnpm commit              # Commitizen guided commit

# Infrastructure
docker compose up        # Start local infrastructure
docker compose down      # Stop infrastructure
```

### Package Commands

Each service/app has consistent scripts:

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm typecheck    # Type check
pnpm lint         # Lint code
pnpm lint:fix     # Fix linting
pnpm test         # Run tests
pnpm test:watch   # Watch mode tests
```

## 📐 Coding Standards

### TypeScript

```typescript
// ✅ GOOD: Strict types, explicit returns, no any
export async function createBuddy(data: CreateBuddyInput): Promise<Buddy> {
  const validated = createBuddySchema.parse(data);
  return await db.insert(buddies).values(validated).returning();
}

// ❌ BAD: any types, implicit returns
export async function createBuddy(data: any) {
  return db.insert(buddies).values(data);
}

// Always use:
// - Strict TypeScript mode
// - Zod for runtime validation
// - Explicit return types for public functions
// - Named exports (no default exports except React components)
```

### File Naming Conventions

```
// Services & packages
kebab-case for files:     user-service.ts, create-buddy.handler.ts
PascalCase for classes:   UserService.ts, BuddyRepository.ts
camelCase for functions:  createBuddy.ts, validateProfile.ts

// React components
PascalCase:               BuddyCard.tsx, ProfileHeader.tsx
```

### Code Organization

```
service/
├── src/
│   ├── handlers/        # tRPC route handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Data access
│   ├── types/           # Service-specific types
│   ├── utils/           # Utilities
│   ├── events/          # Event publishers/subscribers
│   ├── index.ts         # Entry point
│   └── router.ts        # tRPC router
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── drizzle.config.ts    # If service owns tables
└── README.md
```

## 🔐 Security Standards

### Privacy by Design

```typescript
// ✅ Encrypt PII at rest
import { encryptField } from '@teei/shared-utils/crypto';

const user = {
  email: await encryptField(data.email),
  phone: await encryptField(data.phone),
  name: data.name, // Non-sensitive
};

// ✅ Field-level access control
export const buddySelectPublic = {
  id: true,
  displayName: true,
  // email: false (excluded)
};
```

### Input Validation

```typescript
// ✅ ALWAYS validate inputs with Zod
import { z } from 'zod';

const createBuddySchema = z.object({
  email: z.string().email(),
  role: z.enum(['mentor', 'mentee']),
  metadata: z.record(z.unknown()).optional(),
});

export async function createBuddy(input: unknown) {
  const data = createBuddySchema.parse(input); // Throws if invalid
  // ... safe to use data
}
```

### Secrets Management

```typescript
// ✅ Use environment variables
const apiKey = process.env.KINTELL_API_KEY;
if (!apiKey) throw new Error('KINTELL_API_KEY required');

// ❌ NEVER hardcode secrets
const apiKey = "sk_live_abc123"; // FORBIDDEN
```

## 📡 Event-Driven Architecture

### Event Naming Convention

```
<domain>.<entity>.<action>
Examples:
- buddy.profile.created
- buddy.match.proposed
- buddy.match.accepted
- buddy.session.completed
- safety.content.flagged
- reporting.metric.recorded
```

### Event Contract Pattern

```typescript
// packages/event-contracts/src/buddy-events.ts
import { z } from 'zod';

export const BuddyProfileCreatedEvent = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('buddy.profile.created'),
  timestamp: z.string().datetime(),
  data: z.object({
    buddyId: z.string().uuid(),
    role: z.enum(['mentor', 'mentee']),
    corporateId: z.string().uuid().optional(),
  }),
});

export type BuddyProfileCreatedEvent = z.infer<typeof BuddyProfileCreatedEvent>;
```

### Publishing Events

```typescript
import { natsService } from '@teei/shared-utils/nats';
import { BuddyProfileCreatedEvent } from '@teei/event-contracts';

async function publishBuddyCreated(buddy: Buddy) {
  await natsService.publish('buddy.profile.created', {
    eventId: crypto.randomUUID(),
    eventType: 'buddy.profile.created',
    timestamp: new Date().toISOString(),
    data: {
      buddyId: buddy.id,
      role: buddy.role,
      corporateId: buddy.corporateId,
    },
  });
}
```

### Subscribing to Events

```typescript
import { natsService } from '@teei/shared-utils/nats';
import { BuddyProfileCreatedEvent } from '@teei/event-contracts';

natsService.subscribe('buddy.profile.created', async (event) => {
  const validated = BuddyProfileCreatedEvent.parse(event);
  // Handle event
  await createUnifiedProfile(validated.data.buddyId);
});
```

## 🗄️ Database Patterns

### Schema Definition (Drizzle)

```typescript
// packages/shared-schema/src/tables/buddies.ts
import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const buddies = pgTable('buddies', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['mentor', 'mentee'] }).notNull(),
  profileData: jsonb('profile_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Buddy = typeof buddies.$inferSelect;
export type InsertBuddy = typeof buddies.$inferInsert;
```

### Repository Pattern

```typescript
// services/buddy-service/src/repositories/buddy.repository.ts
import { db } from '@teei/shared-schema/db';
import { buddies, type Buddy } from '@teei/shared-schema/tables';
import { eq } from 'drizzle-orm';

export class BuddyRepository {
  async create(data: InsertBuddy): Promise<Buddy> {
    const [buddy] = await db.insert(buddies).values(data).returning();
    return buddy;
  }

  async findById(id: string): Promise<Buddy | null> {
    const [buddy] = await db.select().from(buddies).where(eq(buddies.id, id));
    return buddy ?? null;
  }
}
```

## 🧪 Testing Standards

### Test Coverage Requirements

- **Shared packages:** 80% minimum
- **Services:** 70% minimum
- **Frontend:** 60% minimum

### Test Structure

```typescript
// tests/unit/services/buddy.service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { BuddyService } from '../../../src/services/buddy.service';

describe('BuddyService', () => {
  let service: BuddyService;

  beforeEach(() => {
    service = new BuddyService();
  });

  describe('createBuddy', () => {
    it('should create a buddy with valid data', async () => {
      const input = { email: 'test@example.com', role: 'mentor' };
      const buddy = await service.createBuddy(input);
      expect(buddy.email).toBe(input.email);
    });

    it('should throw on invalid email', async () => {
      const input = { email: 'invalid', role: 'mentor' };
      await expect(service.createBuddy(input)).rejects.toThrow();
    });
  });
});
```

## 🌿 Branching Strategy

### Branch Naming

```
worker<N>/<feature-name>
claude/<feature-name>-<session-id>

Examples:
- worker1/foundation-initial
- worker2/unified-profile-api
- worker3/corp-cockpit-ui
- claude/bootstrap-monorepo-governance-011CV5pUpY9oJLAZEYYh3EvN
```

### Commit Convention

Use Conventional Commits via Commitizen:

```bash
pnpm commit

# Prompts for:
# type: feat, fix, chore, docs, style, refactor, perf, test
# scope: buddy-service, shared-schema, corp-cockpit, etc.
# subject: Short description
# body: Detailed description (optional)
```

### PR Requirements

- ✅ All CI checks pass (lint, typecheck, test, build)
- ✅ Code review approved
- ✅ Branch up to date with main
- ✅ Conventional commit messages
- ✅ No secrets in code

## 📚 Documentation Standards

### Service README Template

````markdown
# <Service Name>

## Purpose
Brief description of what this service does.

## Responsibilities
- Responsibility 1
- Responsibility 2

## API
Key endpoints/procedures.

## Events
### Publishes
- `event.name` - Description

### Subscribes
- `event.name` - Description

## Environment Variables
```env
VAR_NAME=description
```

## Development
```bash
pnpm dev
pnpm test
```
````

## 🎯 Service Ownership

| Service | Owner Lead | Purpose |
|---------|------------|---------|
| buddy-service | Backend Lead | Buddy lifecycle & matching |
| kintell-connector | Backend Lead | Kintell API integration |
| upskilling-connector | Backend Lead | Training platform integration |
| unified-profile | Data Lead | Aggregated stakeholder data |
| q2q-ai | AI Lead | Question-to-Question AI |
| reporting | Data Lead | Impact analytics & reporting |
| safety-moderation | AI Lead | Content moderation |
| discord-bot | Backend Lead | Discord community engagement |
| notifications | Backend Lead | Multi-channel notifications |
| api-gateway | Backend Lead | Unified API gateway |
| corp-cockpit-astro | Frontend Lead | Corporate admin dashboard |
| shared-schema | Data Lead | Database schemas & migrations |
| event-contracts | Backend Lead | Event definitions |
| shared-types | Backend Lead | Shared TypeScript types |
| shared-utils | Backend Lead | Common utilities |

## 🚫 Constraints

1. **No matching implementation** - Kintell remains the booking system for Language/Mentorship programs
2. **Privacy by design** - All PII encrypted at rest
3. **Event-driven** - Services communicate via NATS events
4. **Type-safe** - Strict TypeScript, Zod validation
5. **Test coverage** - Minimum coverage enforced
6. **No secrets** - Use .env, never commit credentials

## 🔗 Key Resources

- **Architecture:** `docs/Platform_Architecture.md`
- **Multi-Agent Plan:** `MULTI_AGENT_PLAN.md`
- **Agent Definitions:** `.claude/agents/`
- **API Docs:** (TBD - will be in `docs/api/`)
- **Event Catalog:** (TBD - will be in `docs/events/`)

## 🆘 Getting Help

1. Check this file (`@AGENTS.md`)
2. Check `MULTI_AGENT_PLAN.md` for task coordination
3. Check service README files
4. Check existing code patterns in similar services

---

**Last Updated:** 2025-11-13
**Maintainer:** Worker 1 (Tech Lead Orchestrator)
