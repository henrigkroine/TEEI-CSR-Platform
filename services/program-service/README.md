# Program Service

Program template management and instantiation service for TEEI CSR Platform.

**Port**: 3021

## Features

- ✅ Template CRUD operations
- ✅ Program instantiation from templates
- ✅ Configuration validation and merging
- ✅ Template versioning
- ✅ Campaign management (planned)

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in development
pnpm dev

# Build
pnpm build

# Run tests
pnpm test
```

## Environment Variables

```bash
PORT_PROGRAM_SERVICE=3021
HOST=0.0.0.0
LOG_LEVEL=info
CORS_ORIGIN=*
DATABASE_URL=postgresql://user:pass@localhost:5432/teei_platform
```

## API Endpoints

### Templates

- `POST /templates` - Create template
- `GET /templates` - List templates
- `GET /templates/:id` - Get template
- `PUT /templates/:id` - Update template (draft only)
- `POST /templates/:id/publish` - Publish template
- `POST /templates/:id/versions` - Create new version
- `POST /templates/:id/deprecate` - Deprecate template

### Programs

- `POST /programs` - Create program from template
- `GET /programs/:id` - Get program
- `PUT /programs/:id/config` - Update program config
- `PUT /programs/:id/status` - Update program status

### Campaigns

- `POST /campaigns` - Create campaign
- `GET /campaigns/:id` - Get campaign

## Architecture

Implements SWARM 3 Batch 2 (Agents 13-18):
- Agent 13: Template Registry
- Agent 14: Program Instantiator
- Agent 15: Campaign Instantiator
- Agent 16: Config Resolver
- Agent 17: Lifecycle Manager
- Agent 18: Impact Config Binder

## Documentation

See `/docs/PROGRAM_TEMPLATE_SYSTEM_DESIGN.md` for complete architecture.
