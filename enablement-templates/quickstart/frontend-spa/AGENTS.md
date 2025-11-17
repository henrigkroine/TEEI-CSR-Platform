# Multi-Agent Orchestration Structure

## [PROJECT_NAME]: Single-Page Application (SPA)

**Tech Stack**: [React/Vue/Svelte/Angular], TypeScript, [Tailwind/CSS-in-JS], Vite/Webpack
**Purpose**: [CUSTOMIZE: Describe the business purpose and key features]
**Repository**: [CUSTOMIZE: Link to GitHub/GitLab]

---

## Build & Test Commands

```bash
# Install dependencies
npm install
# or
pnpm install

# Development server with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting and formatting
npm run lint
npm run format

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run tests
npm run test              # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report

# Code quality
npm run lint:fix        # Auto-fix linting issues
npm run type:check      # TypeScript validation
```

---

## Architecture Overview

### Repository Structure

```
[project]/
├── src/
│   ├── pages/                    # [CUSTOMIZE: Page components or routes]
│   ├── components/               # [CUSTOMIZE: Reusable components]
│   │   ├── common/              # Shared components
│   │   ├── features/            # Feature-specific components
│   │   └── layouts/             # Layout wrappers
│   ├── hooks/                    # [CUSTOMIZE: Custom React hooks]
│   ├── services/                 # API and business logic
│   │   ├── api.ts               # API client
│   │   └── [domain].service.ts  # Domain-specific services
│   ├── store/                    # [CUSTOMIZE: State management (Zustand/Redux/Pinia)]
│   ├── types/                    # TypeScript interfaces
│   ├── utils/                    # Utility functions
│   ├── styles/                   # Global styles
│   ├── App.[tsx/jsx]            # Root component
│   └── main.[tsx/jsx]           # Entry point
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── fixtures/                 # Test data and mocks
├── public/                       # Static assets
├── vite.config.[ts/js]          # [CUSTOMIZE: Bundler config (Vite/Webpack)]
├── tsconfig.json
├── package.json
└── README.md
```

### Key Components

- **Pages/Routes**: [CUSTOMIZE: Main page components and routing strategy]
- **Components**: Reusable UI components with props and type safety
- **Services**: API client, data fetching, business logic
- **State Management**: [CUSTOMIZE: Global state management pattern]
- **Styling**: [CUSTOMIZE: CSS strategy (utility-first, CSS-in-JS, etc.)]

---

## Agent Team Structure

### Team 1: Frontend Development (2 agents)
**Lead**: frontend-lead
- **Agent 1.1**: component-developer (Components, pages, routing)
- **Agent 1.2**: state-management-dev (State management, API integration)

### Team 2: Quality & Optimization (2 agents)
**Lead**: quality-lead
- **Agent 2.1**: testing-specialist (Unit, integration, E2E tests)
- **Agent 2.2**: a11y-performance-dev (Accessibility, performance, optimization)

---

## Safety Constraints

### NEVER (Blocking)
- ❌ NEVER commit secrets or API keys (use environment variables)
- ❌ NEVER skip tests before submitting PR
- ❌ NEVER create untested components or pages
- ❌ NEVER modify build config without testing the build
- ❌ NEVER use `any` types in TypeScript (strict mode)
- ❌ NEVER add dependencies without reviewing bundle impact
- ❌ NEVER skip accessibility checks for interactive components

### ALWAYS (Required)
- ✅ ALWAYS run `npm run build` before submitting PR
- ✅ ALWAYS validate TypeScript (no errors or warnings)
- ✅ ALWAYS test components in isolation (unit tests)
- ✅ ALWAYS test user flows (integration tests)
- ✅ ALWAYS include loading, error, and empty states
- ✅ ALWAYS add ARIA labels for interactive elements
- ✅ ALWAYS test responsive design
- ✅ ALWAYS use environment variables for API endpoints

---

## Quality Gates

- ✅ **Build**: Production build succeeds (`npm run build`)
- ✅ **TypeScript**: Strict mode, no errors or warnings
- ✅ **Linting**: ESLint passes with 0 warnings
- ✅ **Tests**: Unit test coverage ≥80%, all tests passing
- ✅ **Accessibility**: WCAG 2.1 AA minimum
- ✅ **Performance**: No critical performance regressions
- ✅ **Code Review**: At least one approval before merge

---

## Agent Definitions

### Agent 1.1: Component Developer

**When to Invoke**: MUST BE USED when:
- Creating new page components
- Building reusable components
- Implementing routing/navigation
- Refactoring existing components

**Capabilities**:
- [CUSTOMIZE: React/Vue/Svelte/Angular] component development
- Component composition and reusability
- Page routing and navigation
- Props design and type safety
- [CUSTOMIZE: Specific framework features]

**Deliverables**:
- New components in `src/components/` or `src/pages/`
- TypeScript interfaces for props
- Implementation report in `/reports/`

**Blocked By**:
- ❌ Blocks merge if components lack TypeScript types
- ❌ Blocks merge if components lack unit tests

---

### Agent 1.2: State Management Developer

**When to Invoke**: MUST BE USED when:
- Setting up state management (Zustand/Redux/Pinia)
- Creating API client or data fetching logic
- Managing global application state
- Handling loading and error states

**Capabilities**:
- State management setup and patterns
- API client implementation
- Data fetching and caching strategies
- Error handling and loading states
- Type-safe state access

**Deliverables**:
- State management store in `src/store/`
- API client in `src/services/`
- Integration documentation in `/reports/`

**Blocked By**:
- ❌ Blocks merge if API errors not handled
- ❌ Blocks merge if loading states missing

---

### Agent 2.1: Testing Specialist

**When to Invoke**: MUST BE USED when:
- Writing unit tests for components
- Writing integration tests for features
- Implementing E2E tests
- Measuring test coverage

**Capabilities**:
- [CUSTOMIZE: Test framework (Jest/Vitest/Playwright)]
- Component testing
- Mocking APIs and dependencies
- Coverage measurement

**Deliverables**:
- Test files in `tests/`
- Test configuration
- Coverage reports

**Blocked By**:
- ❌ Blocks merge if coverage <80%

---

## Orchestration Workflow

### Phase 1: Foundation (Week 1)
1. **frontend-lead**: Set up project structure, routing, component architecture
2. **state-management-dev**: Implement state management and API client
3. **testing-specialist**: Configure testing framework and mocks

### Phase 2: Feature Development (Week 2-3)
1. **component-developer**: Build page and UI components
2. **state-management-dev**: Integrate API data fetching
3. **testing-specialist**: Write unit and integration tests

### Phase 3: Quality & Polish (Week 4)
1. **a11y-performance-dev**: Run accessibility and performance audits
2. **testing-specialist**: Add E2E tests for critical flows
3. All Leads: Final review, PR preparation

---

## Success Criteria

✅ Development server starts with `npm run dev`
✅ Production build succeeds with `npm run build`
✅ All components render without errors
✅ All tests pass with ≥80% coverage
✅ TypeScript strict mode passes
✅ ESLint and Prettier pass
✅ Pages are responsive (mobile, tablet, desktop)
✅ Interactive components are keyboard accessible
✅ API data loading and error states work
✅ No console errors in development or production
✅ No secrets in repository
✅ PR includes screenshots

---

## Communication Protocol

- **Daily**: 5-min standup on blockers
- **Code Review**: All PRs reviewed before merge
- **Documentation**: Update `/reports/` after each feature
- **Testing**: No merge without passing tests

---

## Customization Checklist

- [ ] Replace [PROJECT_NAME] with actual project name
- [ ] Replace [CUSTOMIZE: ...] sections with project-specific details
- [ ] Update Tech Stack (React/Vue/Svelte/Angular)
- [ ] Update Build & Test Commands for your setup
- [ ] Add project-specific safety constraints
- [ ] Update Repository Structure for your conventions
- [ ] Define specific component categories needed
- [ ] Add project-specific quality gates
- [ ] Create team structure for your project size
