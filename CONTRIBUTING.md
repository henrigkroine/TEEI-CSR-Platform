# Contributing to TEEI CSR Platform

Thank you for your interest in contributing! This document provides guidelines and best practices for contributing to the platform.

## Getting Started

### Prerequisites

- Node.js 18+
- PNPM 8+
- Docker & Docker Compose
- Git

### Initial Setup

1. Clone the repository
```bash
git clone https://github.com/teei-platform/teei-csr-platform.git
cd teei-csr-platform
```

2. Install dependencies
```bash
pnpm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your local values
```

4. Start local infrastructure
```bash
docker compose up -d
```

5. Run database migrations
```bash
pnpm db:migrate
```

6. Start development servers
```bash
pnpm dev
```

## Development Workflow

### Branch Naming

Use the following patterns:
- `worker<N>/<feature-name>` - For worker-specific features
- `feat/<feature-name>` - For new features
- `fix/<bug-name>` - For bug fixes
- `chore/<task-name>` - For maintenance tasks

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Testing
- `chore`: Maintenance

**Scopes:**
- Service names (e.g., `buddy-service`, `unified-profile`)
- Package names (e.g., `shared-schema`, `event-contracts`)
- `ci`, `docs`, `root`

**Example:**
```bash
pnpm commit
```

This will guide you through creating a conventional commit.

### Code Standards

#### TypeScript

- Use strict mode
- No `any` types (use `unknown` if truly dynamic)
- Explicit return types for public functions
- Named exports (except React components)

#### Linting & Formatting

```bash
# Run before committing
pnpm lint:fix
pnpm format
```

Pre-commit hooks will automatically run these checks.

#### Testing

- Write tests for new features
- Maintain coverage targets:
  - Shared packages: 80%
  - Services: 70%
  - Frontend: 60%

```bash
pnpm test
pnpm test:watch
```

### Pull Request Process

1. **Create a feature branch** from `develop`
2. **Make your changes** following code standards
3. **Write tests** for new functionality
4. **Update documentation** if needed
5. **Run checks locally**
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```
6. **Push to your fork** and create a pull request
7. **Fill out PR template** with description and test plan
8. **Request review** from relevant CODEOWNERS
9. **Address feedback** and resolve merge conflicts
10. **Wait for CI** to pass before merging

### PR Requirements

- [ ] All CI checks pass
- [ ] Code review approved
- [ ] Branch is up to date with base
- [ ] Tests added for new features
- [ ] Documentation updated
- [ ] No console.log left in code
- [ ] No commented-out code

## Architecture Guidelines

### Service Structure

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
├── package.json
└── README.md
```

### Event-Driven Communication

- Use NATS for async service communication
- Define events in `packages/event-contracts`
- Follow naming: `<domain>.<entity>.<action>`
- Validate with Zod schemas

### Database Patterns

- Define schemas in `packages/shared-schema`
- Use Drizzle ORM for type-safe queries
- Create migrations with `pnpm db:generate`
- Repository pattern for data access

## Code Review Guidelines

### For Authors

- Keep PRs focused and reasonably sized
- Provide context in PR description
- Respond to feedback promptly
- Test your changes thoroughly

### For Reviewers

- Be constructive and respectful
- Focus on code quality, not style (tools handle that)
- Suggest improvements, don't demand
- Approve when ready, don't block unnecessarily

## Questions or Help?

- Read `@AGENTS.md` for architecture context
- Check service README files
- Review existing code patterns
- Ask in pull request comments
- Contact maintainers

---

**Happy Contributing!** 🚀
