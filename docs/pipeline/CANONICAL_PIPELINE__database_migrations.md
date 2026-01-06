---
status: canonical
last_verified: 2025-01-27
---

# CANONICAL PIPELINE: Database Migrations

> This is the ONLY authoritative document for database migration procedures.

## Overview

Database migrations are managed using Drizzle ORM. Migrations are defined in `packages/shared-schema/src/schema/` and generated/applied via Drizzle commands.

## Migration Workflow

### 1. Make Schema Changes

Edit schema files in `packages/shared-schema/src/schema/`:

```typescript
// Example: Add new table
export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
});
```

### 2. Generate Migration

```bash
cd packages/shared-schema
pnpm db:generate
```

This creates a new migration file in `src/migrations/` with timestamp.

**Review the generated migration:**
- Check SQL statements
- Verify column types
- Ensure indexes are created
- Check foreign key constraints

### 3. Test Migration Locally

```bash
# Apply migration to local database
pnpm db:migrate
```

**Verify:**
```bash
# Open Drizzle Studio
pnpm db:studio

# Check table structure
# Verify data integrity
```

### 4. Commit Migration

```bash
git add packages/shared-schema/src/migrations/
git commit -m "feat(schema): add new_table"
```

**Important:** Always commit migration files with schema changes.

## Migration Commands

### Generate Migration

```bash
# From root
pnpm --filter @teei/shared-schema db:generate

# From shared-schema package
cd packages/shared-schema
pnpm db:generate
```

### Apply Migrations

```bash
# From root (recommended)
pnpm db:migrate

# From shared-schema package
cd packages/shared-schema
pnpm db:migrate
```

### Dry Run (Preview)

```bash
# Check what migrations would be applied
pnpm --filter @teei/shared-schema db:generate --dry-run
```

### View Migration Status

```bash
# Open Drizzle Studio
pnpm db:studio

# Or query directly
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC;"
```

## Rollback Procedures

### Development (Destructive)

```bash
# Reset entire database (DESTRUCTIVE - dev only)
pnpm db:reset

# This drops all tables and re-runs all migrations
```

### Production (Manual Rollback)

If a migration fails in production:

1. **Stop the deployment immediately**

2. **Restore from backup**
   ```bash
   psql $PROD_DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql
   ```

3. **Create rollback migration** (if needed)
   ```typescript
   // Create rollback SQL in packages/shared-schema/migrations/rollback/
   // Example: rollback_YYYYMMDD_HHMMSS_new_table.sql
   ```

4. **Apply rollback**
   ```bash
   psql $PROD_DATABASE_URL < packages/shared-schema/migrations/rollback/rollback_*.sql
   ```

## Migration Best Practices

### 1. Always Test Locally First

- Generate migration
- Apply to local database
- Verify schema changes
- Test application code

### 2. Keep Migrations Small

- One logical change per migration
- Avoid breaking changes in single migration
- Split large changes into multiple migrations

### 3. Never Edit Applied Migrations

- Once applied to production, never modify
- Create new migration to fix issues
- Document any manual fixes

### 4. Include Rollback Scripts

- For complex migrations, include rollback SQL
- Store in `packages/shared-schema/migrations/rollback/`
- Test rollback procedures

### 5. Backup Before Production

- Always backup database before applying migrations
- Verify backup integrity
- Document backup location

## Migration Checklist

Before applying to production:

- [ ] Migration tested locally
- [ ] Migration tested in staging
- [ ] Rollback plan documented
- [ ] Database backup created
- [ ] Migration reviewed by team
- [ ] Application code updated
- [ ] Deployment window scheduled
- [ ] Rollback tested (if complex)

## Common Migration Patterns

### Add New Table

```typescript
export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ... columns
});
```

### Add Column

```typescript
// Add to existing table definition
newColumn: varchar('new_column', { length: 255 }),
```

### Add Index

```typescript
// In table definition
export const table = pgTable('table', {
  // ... columns
}, (table) => ({
  idxColumn: index('idx_column').on(table.column),
}));
```

### Add Foreign Key

```typescript
// In table definition
foreignKey: uuid('foreign_key').references(() => otherTable.id),
```

## Troubleshooting

### Migration Fails

1. Check error message
2. Verify database connection
3. Check for conflicting migrations
4. Review migration SQL
5. Check database permissions

### Migration Already Applied

If migration shows as already applied:
```bash
# Check migration history
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations;"

# If needed, manually mark as applied (CAUTION)
```

### Schema Drift

If schema doesn't match migrations:
1. Compare current schema with migrations
2. Create migration to sync
3. Or reset and re-apply (dev only)
