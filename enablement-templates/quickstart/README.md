# Quickstart CLAUDE.md & AGENTS.md Templates

This directory contains minimal but complete starting point templates for common repository types. Each template is designed to be customized for your specific project.

## Overview

Each template includes:
- **CLAUDE.md** - References the AGENTS.md file (single line format)
- **AGENTS.md** - Complete multi-agent orchestration structure with:
  - Tech stack and purpose description
  - Build & test commands
  - Architecture overview with repository structure
  - Agent team structure (2-3 teams, typically 3-6 agents per team)
  - Safety constraints (NEVER/ALWAYS rules)
  - Quality gates and blocking conditions
  - Agent definitions (2-4 key agents with detailed specs)
  - Orchestration workflow (4-phase approach)
  - Success criteria
  - Communication protocol
  - Customization checklist

## Templates Included

### 1. Frontend SPA (`frontend-spa/`)

**Best for**: Single-page application frontends (React, Vue, Svelte, Angular)

**Key sections**:
- Component-based architecture
- State management setup
- Routing and navigation
- Accessibility and responsive design
- Testing strategy

**Team structure**:
- Team 1: Frontend Development (2 agents)
- Team 2: Quality & Optimization (2 agents)

**Use this if**:
- Building a web application frontend
- Need component library or design system
- Require modern build tooling (Vite, Webpack)

---

### 2. Backend API (`backend-api/`)

**Best for**: RESTful API services (Node.js, Python, Go, Rust)

**Key sections**:
- Route handlers and controllers
- Database models and migrations
- Business logic services
- Authentication and validation
- Error handling patterns

**Team structure**:
- Team 1: API Development (2 agents)
- Team 2: Quality & Security (2 agents)

**Use this if**:
- Building a backend API service
- Need database integration
- Require authentication/authorization
- Managing data models and migrations

---

### 3. Full-Stack Monorepo (`fullstack-monorepo/`)

**Best for**: Monorepo projects with frontend and backend together

**Key sections**:
- Workspace structure (pnpm/Yarn/Turborepo)
- Shared types and utilities
- Frontend-backend coordination
- Integration testing
- API contract management

**Team structure**:
- Team 1: Frontend Development (2 agents)
- Team 2: Backend Development (2 agents)
- Team 3: Quality & Integration (2 agents)

**Use this if**:
- Managing frontend and backend in single repo
- Need tight frontend-backend coordination
- Sharing types between frontend and backend
- Using monorepo tooling (pnpm workspaces)

---

### 4. Serverless (`serverless/`)

**Best for**: Event-driven serverless functions (AWS Lambda, Google Cloud Functions)

**Key sections**:
- Function entry points and handlers
- Service layer business logic
- Event-based architecture
- Cold start optimization
- Cloud service integration
- IaC and deployment

**Team structure**:
- Team 1: Serverless Development (2 agents)
- Team 2: Quality & Testing (2 agents)

**Use this if**:
- Building serverless functions/Lambda
- Managing event-driven workloads
- Using managed cloud services
- Deploying with Serverless Framework or SAM

---

### 5. Documentation (`documentation/`)

**Best for**: Documentation sites and guides (Astro, Docusaurus, MkDocs)

**Key sections**:
- Markdown-based content
- Navigation and site structure
- API reference generation
- Code examples and runnable snippets
- Search and indexing
- Multi-version support (optional)

**Team structure**:
- Team 1: Content & Documentation (2 agents)
- Team 2: Site & QA (2 agents)

**Use this if**:
- Building a documentation site
- Creating API reference
- Managing guides and tutorials
- Maintaining a knowledge base

---

## How to Use

### 1. Choose Your Template

Select the template that best matches your project type:

```bash
# Option A: Copy the entire template directory
cp -r enablement-templates/quickstart/frontend-spa my-project
cd my-project

# Option B: Copy just CLAUDE.md and AGENTS.md
cp enablement-templates/quickstart/frontend-spa/CLAUDE.md my-project/
cp enablement-templates/quickstart/frontend-spa/AGENTS.md my-project/
```

### 2. Customize for Your Project

Open the AGENTS.md file and replace all `[CUSTOMIZE: ...]` placeholders:

```bash
# View all customization points
grep -n "CUSTOMIZE:" AGENTS.md
```

Key customization areas:
- `[PROJECT_NAME]` - Your project name
- Tech stack details (framework, language, database)
- Build & test commands (specific to your setup)
- Repository structure (your conventions)
- Agent team structure (project size and needs)
- Safety constraints (project-specific rules)
- Quality gates (your standards)
- Success criteria (project goals)

### 3. Create Your Project

Update both CLAUDE.md and AGENTS.md:
- CLAUDE.md: Keep as `@AGENTS.md` (single line reference)
- AGENTS.md: Replace all `[CUSTOMIZE: ...]` with your values

Example customization (extract):

```markdown
## [PROJECT_NAME]: Single-Page Application (SPA)
↓
## MyApp: Single-Page Application (SPA)

**Tech Stack**: [React/Vue/Svelte/Angular], TypeScript, [Tailwind/CSS-in-JS], Vite/Webpack
↓
**Tech Stack**: React, TypeScript, TailwindCSS, Vite

**Purpose**: [CUSTOMIZE: Describe the business purpose and key features]
↓
**Purpose**: Dashboard for real-time data visualization and employee engagement tracking
```

### 4. Verify Your Customization

Use the customization checklist at the end of AGENTS.md:

```markdown
## Customization Checklist

- [x] Replace [PROJECT_NAME] with actual project name
- [x] Replace [CUSTOMIZE: ...] sections with project-specific details
- [ ] Update Tech Stack...
- [ ] Update Build & Test Commands...
- [ ] Add project-specific safety constraints...
```

### 5. Commit to Your Repository

```bash
git add CLAUDE.md AGENTS.md
git commit -m "Add CLAUDE and AGENTS orchestration templates"
```

---

## Template Structure Overview

Each AGENTS.md follows this consistent structure:

```
1. Header with tech stack and purpose
2. Build & Test Commands (copy-paste ready)
3. Architecture Overview
   - Repository structure
   - Key components
4. Agent Team Structure
   - Team breakdown with leads and agents
5. Safety Constraints
   - NEVER (blocking) rules
   - ALWAYS (required) practices
6. Quality Gates
   - Build, testing, security, performance criteria
7. Agent Definitions
   - When to invoke each agent
   - Capabilities and deliverables
   - Blocking conditions
8. Orchestration Workflow
   - 4-phase approach (Foundation, Development, Testing, Handoff)
9. Success Criteria
   - Measurable goals for project completion
10. Communication Protocol
11. Customization Checklist
```

---

## Customization Examples

### Example 1: Frontend SPA

Original:
```markdown
**Tech Stack**: [React/Vue/Svelte/Angular], TypeScript, [Tailwind/CSS-in-JS], Vite/Webpack
```

Customized:
```markdown
**Tech Stack**: React, TypeScript, TailwindCSS, Vite
```

---

### Example 2: Backend API

Original:
```markdown
**Tech Stack**: [Node.js/Python/Go/Rust], [Express/FastAPI/Gin], [PostgreSQL/MongoDB], TypeScript/[Language]
```

Customized:
```markdown
**Tech Stack**: Node.js, Express, PostgreSQL, TypeScript
```

---

### Example 3: Full-Stack Monorepo

Original:
```markdown
Replace [@[org]] with actual organization/namespace
```

Customized:
```markdown
# All workspaces use: @acme namespace
# Example: @acme/web, @acme/api, @acme/shared

pnpm -F @acme/web dev     # Frontend
pnpm -F @acme/api dev     # Backend
```

---

## When to Update Templates

Update the AGENTS.md as your project evolves:

1. **New features**: Add new agents or teams
2. **Changed processes**: Update orchestration workflow
3. **New constraints**: Add to NEVER/ALWAYS sections
4. **Adjusted criteria**: Update quality gates
5. **Scale changes**: Modify team structure

---

## Tips for Success

1. **Don't skip customization** - Each `[CUSTOMIZE: ...]` is intentional
2. **Keep it up-to-date** - Treat AGENTS.md as living documentation
3. **Share with team** - All team members should understand their agent role
4. **Reference in PRs** - Link to AGENTS.md when discussing architecture
5. **Use the checklists** - Quality gates are your CI/CD gates
6. **Review in onboarding** - New team members should read AGENTS.md first

---

## Related Documents

- Parent: `/enablement-templates/README.md`
- Agent templates: `/enablement-templates/agents/`
- Repo-specific examples: `/enablement-templates/repos/`

---

## Questions?

Refer to the example repos in `/enablement-templates/repos/` for fully customized templates:
- `/enablement-templates/repos/ypai-sheetswriter/AGENTS.md` - Serverless example
- `/enablement-templates/repos/teei-website-astro/AGENTS.md` - Documentation (Astro) example

---

**Last updated**: 2025-11-17
