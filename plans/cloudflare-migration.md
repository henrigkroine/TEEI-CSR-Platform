# CSR Platform → Cloudflare Migration

## Context

You are migrating the TEEI CSR Platform from a Kubernetes/Node.js architecture to Cloudflare Pages with D1 database.

**Project location:** `/home/ovehe/projects/VS Projects/TEEI/TEEI_CSR_Platform`

**Current state:**
- Astro app with `@astrojs/node` adapter
- 26 microservices (PostgreSQL, ClickHouse, Redis, NATS)
- Only runs locally on port 4327
- Never deployed to production

**Target state:**
- Astro app with `@astrojs/cloudflare` adapter
- D1 database (SQLite on Cloudflare)
- Deployed to `cockpit.theeducationalequalityinstitute.org`
- Core features working: login, dashboard, SROI calculator, reports

---

## Phase 1: Discovery & Assessment

First, understand the current codebase:

```bash
cd "/home/ovehe/projects/VS Projects/TEEI/TEEI_CSR_Platform"

# Find the main Astro app
find . -name "astro.config.*" | head -10

# Check current adapter
cat apps/corp-cockpit-astro/astro.config.mjs

# Check package.json dependencies
cat apps/corp-cockpit-astro/package.json | head -80

# Find all database calls
grep -rn "postgres\|pg\|drizzle\|prisma\|sql" apps/corp-cockpit-astro/src --include="*.ts" --include="*.astro" | head -50

# Find environment variables used
grep -rn "import.meta.env\|process.env" apps/corp-cockpit-astro/src --include="*.ts" --include="*.astro" | head -50

# Check for microservice API calls
grep -rn "localhost:30\|localhost:40\|fetch.*api" apps/corp-cockpit-astro/src --include="*.ts" --include="*.astro" | head -50
```

Document what you find before proceeding.

---

## Phase 2: Create Cloudflare Configuration

### 2.1 Update astro.config.mjs

Replace the Node adapter with Cloudflare:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [react(), tailwind()],
  vite: {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  },
});
```

### 2.2 Create wrangler.toml

```toml
name = "csr-cockpit"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "csr-cockpit"
database_id = "" # Will be filled after creating D1

[site]
bucket = "./dist"
```

### 2.3 Update package.json

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "wrangler pages dev ./dist",
    "deploy:staging": "wrangler pages deploy ./dist --project-name=csr-cockpit-staging",
    "deploy:prod": "wrangler pages deploy ./dist --project-name=csr-cockpit",
    "db:create": "wrangler d1 create csr-cockpit",
    "db:migrate": "wrangler d1 execute csr-cockpit --file=./migrations/schema.sql",
    "db:migrate:local": "wrangler d1 execute csr-cockpit --local --file=./migrations/schema.sql"
  }
}
```

---

## Phase 3: Database Migration (PostgreSQL → D1)

### 3.1 Create D1 Database

```bash
# Create the D1 database
wrangler d1 create csr-cockpit

# Note the database_id and add it to wrangler.toml
```

### 3.2 Create Core Schema

Create `migrations/001_core_schema.sql`:

```sql
-- Companies (tenants)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings TEXT DEFAULT '{}', -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company_id TEXT REFERENCES companies(id),
  role TEXT DEFAULT 'viewer', -- admin, manager, viewer
  avatar_url TEXT,
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Sessions (for auth)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Volunteers (employees who volunteer)
CREATE TABLE IF NOT EXISTS volunteers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT,
  total_hours REAL DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  vis_score REAL DEFAULT 0, -- Volunteer Impact Score
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, email)
);

-- Programs
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- 'mfu', 'lc', 'wbp', 'skills'
  display_name TEXT NOT NULL,
  description TEXT,
  hourly_value REAL DEFAULT 220, -- Taproot standard for skilled volunteering
  created_at TEXT DEFAULT (datetime('now'))
);

-- Sessions (volunteer activities)
CREATE TABLE IF NOT EXISTS volunteer_sessions (
  id TEXT PRIMARY KEY,
  volunteer_id TEXT NOT NULL REFERENCES volunteers(id),
  program_id TEXT NOT NULL REFERENCES programs(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  duration_minutes INTEGER NOT NULL,
  session_date TEXT NOT NULL,
  feedback TEXT,
  outcome_score REAL, -- 0-100
  evidence_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- SROI Snapshots (calculated metrics)
CREATE TABLE IF NOT EXISTS sroi_snapshots (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  period TEXT NOT NULL, -- '2024-Q1', '2024-01', etc.
  total_hours REAL NOT NULL,
  total_value REAL NOT NULL,
  total_volunteers INTEGER NOT NULL,
  total_beneficiaries INTEGER NOT NULL,
  sroi_ratio REAL NOT NULL,
  avg_vis_score REAL,
  calculated_at TEXT DEFAULT (datetime('now'))
);

-- Reports (generated)
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'quarterly', 'annual', 'csrd', 'custom'
  period_start TEXT,
  period_end TEXT,
  content TEXT, -- JSON or markdown
  pdf_url TEXT,
  status TEXT DEFAULT 'draft', -- draft, published
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed default programs
INSERT OR IGNORE INTO programs (id, name, display_name, description, hourly_value) VALUES
  ('prog_mfu', 'mfu', 'Mentors for Ukraine', 'Professional career mentorship', 220),
  ('prog_lc', 'lc', 'Language Connect', 'Language conversation practice', 220),
  ('prog_wbp', 'wbp', 'Women Buddy Program', 'Peer support for refugee women', 150),
  ('prog_skills', 'skills', 'Skills Academy', 'Technical skills training', 220);
```

### 3.3 Create Database Helper

Create `src/lib/db.ts`:

```typescript
import { drizzle } from 'drizzle-orm/d1';

export function getDb(env: { DB: D1Database }) {
  return drizzle(env.DB);
}

// Or without Drizzle, use raw D1:
export async function query(db: D1Database, sql: string, params: any[] = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    return stmt.bind(...params).all();
  }
  return stmt.all();
}
```

---

## Phase 4: Simplify Architecture

### 4.1 Remove Microservice Dependencies

The current app calls localhost:3017, 3018, etc. We need to inline these or remove them.

```bash
# Find all microservice calls
grep -rn "localhost:3" apps/corp-cockpit-astro/src --include="*.ts" --include="*.astro"
grep -rn "localhost:4" apps/corp-cockpit-astro/src --include="*.ts" --include="*.astro"
```

For each microservice call, decide:
1. **Inline it** - Move the logic directly into Astro API routes
2. **Remove it** - Not needed for v1
3. **Mock it** - Return placeholder data for now

### 4.2 Create Astro API Routes

Replace microservice calls with local API routes:

**`src/pages/api/sroi/calculate.ts`** (replaces analytics service):
```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals, params }) => {
  const db = locals.runtime.env.DB;
  const companyId = params.companyId;
  
  // Calculate SROI from D1
  const result = await db.prepare(`
    SELECT 
      SUM(duration_minutes) / 60.0 as total_hours,
      COUNT(DISTINCT volunteer_id) as volunteer_count,
      SUM(duration_minutes / 60.0 * p.hourly_value) as total_value
    FROM volunteer_sessions vs
    JOIN programs p ON vs.program_id = p.id
    WHERE vs.company_id = ?
  `).bind(companyId).first();
  
  const sroi = result.total_value / (result.volunteer_count * 1000); // Simplified
  
  return new Response(JSON.stringify({
    totalHours: result.total_hours,
    volunteerCount: result.volunteer_count,
    totalValue: result.total_value,
    sroiRatio: sroi.toFixed(2)
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

**`src/pages/api/auth/login.ts`**:
```typescript
import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const db = locals.runtime.env.DB;
  const { email, password } = await request.json();
  
  // Find user
  const user = await db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Create session
  const sessionId = nanoid();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  await db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, user.id, expiresAt).run();
  
  cookies.set('session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60
  });
  
  return new Response(JSON.stringify({ 
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### 4.3 Create Auth Middleware

**`src/middleware.ts`**:
```typescript
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, locals, url } = context;
  
  // Skip auth for public routes
  const publicPaths = ['/login', '/forgot-password', '/api/auth'];
  if (publicPaths.some(p => url.pathname.startsWith(p))) {
    return next();
  }
  
  // Check session
  const sessionId = cookies.get('session')?.value;
  if (!sessionId) {
    return context.redirect('/login');
  }
  
  const db = locals.runtime.env.DB;
  const session = await db.prepare(`
    SELECT s.*, u.* FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).bind(sessionId).first();
  
  if (!session) {
    cookies.delete('session');
    return context.redirect('/login');
  }
  
  // Add user to locals
  locals.user = {
    id: session.user_id,
    email: session.email,
    name: session.name,
    role: session.role,
    companyId: session.company_id
  };
  
  return next();
});
```

---

## Phase 5: Core Pages for V1

Focus on getting these working first:

### 5.1 Login Page
- `/login` - Email/password login
- Session-based auth with cookies
- Redirect to `/[lang]/cockpit/[companyId]/`

### 5.2 Dashboard
- `/[lang]/cockpit/[companyId]/` - Main dashboard
- Key metrics: volunteer hours, SROI, active volunteers
- Charts: Monthly trends, program breakdown

### 5.3 SROI Calculator
- `/[lang]/cockpit/[companyId]/sroi` - SROI details
- Breakdown by program
- Evidence trails

### 5.4 Reports
- `/[lang]/cockpit/[companyId]/reports` - Report list
- `/[lang]/cockpit/[companyId]/reports/new` - Generate new report
- Basic PDF export (can use browser print or simple library)

---

## Phase 6: Deploy to Cloudflare

### 6.1 Create Cloudflare Pages Project

```bash
# Login to Cloudflare
wrangler login

# Create Pages project
wrangler pages project create csr-cockpit

# Create D1 database
wrangler d1 create csr-cockpit
# Copy the database_id to wrangler.toml

# Run migrations
wrangler d1 execute csr-cockpit --file=./migrations/001_core_schema.sql
```

### 6.2 Configure Custom Domain

In Cloudflare Dashboard:
1. Go to Pages → csr-cockpit → Custom domains
2. Add `cockpit.theeducationalequalityinstitute.org`
3. DNS will auto-configure

### 6.3 Set Environment Variables

In Cloudflare Dashboard → Pages → Settings → Environment variables:
```
ENVIRONMENT=production
# Add any API keys needed (OpenAI for reports, etc.)
```

### 6.4 Deploy

```bash
# Build
npm run build

# Deploy to staging first
wrangler pages deploy ./dist --project-name=csr-cockpit --branch=staging

# Test at: https://staging.csr-cockpit.pages.dev

# Deploy to production
wrangler pages deploy ./dist --project-name=csr-cockpit --branch=main
```

---

## Phase 7: Verification Checklist

After deployment, verify:

- [ ] Login page loads at `https://cockpit.theeducationalequalityinstitute.org/login`
- [ ] Can create a test user in D1
- [ ] Login works, session created
- [ ] Dashboard loads with mock/empty data
- [ ] SROI calculator returns results
- [ ] Reports page loads
- [ ] No console errors
- [ ] Mobile responsive

---

## Summary of Changes

| Before | After |
|--------|-------|
| `@astrojs/node` | `@astrojs/cloudflare` |
| PostgreSQL | D1 (SQLite) |
| ClickHouse | Removed (use D1 for analytics) |
| Redis | Cloudflare KV or removed |
| NATS | Removed |
| 26 microservices | Inline Astro API routes |
| Kubernetes | Cloudflare Pages |
| $1000+/month | ~$30/month |

---

## Files to Create/Modify

1. `astro.config.mjs` - Switch adapter
2. `wrangler.toml` - Cloudflare config
3. `package.json` - Update scripts
4. `migrations/001_core_schema.sql` - D1 schema
5. `src/lib/db.ts` - Database helper
6. `src/middleware.ts` - Auth middleware
7. `src/pages/api/auth/login.ts` - Login endpoint
8. `src/pages/api/sroi/calculate.ts` - SROI endpoint
9. `src/env.d.ts` - TypeScript types for Cloudflare

---

## Start Here

Run this command first to understand the current structure:

```bash
cd "/home/ovehe/projects/VS Projects/TEEI/TEEI_CSR_Platform"
ls -la
ls -la apps/
cat apps/corp-cockpit-astro/astro.config.mjs
cat apps/corp-cockpit-astro/package.json | head -50
```

Then report back what you find before making changes.
