# @teei/shared-schema

Shared database schemas and migrations for the TEEI CSR Platform using Drizzle ORM.

## Purpose

Centralized database schema definitions for PostgreSQL that are shared across all services in the monorepo.

## Usage

```typescript
import { db, buddies } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

// Query example
const buddy = await db.select().from(buddies).where(eq(buddies.id, buddyId));
```

## Scripts

```bash
# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio

# Build package
pnpm build

# Type check
pnpm typecheck
```

## Tables

- `buddies` - Buddy profiles (mentors and mentees)

## Adding New Tables

1. Create table definition in `src/tables/<table-name>.ts`
2. Export from `src/tables/index.ts`
3. Generate migration: `pnpm db:generate`
4. Run migration: `pnpm db:migrate`
