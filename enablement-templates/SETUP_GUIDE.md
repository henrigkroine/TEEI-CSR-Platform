# Claude Agent Configuration Setup Guide

## Overview

This guide explains the new setup-claude-config.sh script that initializes Claude/agent configuration in repositories.

## What Was Created

### Script Location
**File**: /home/user/TEEI-CSR-Platform/enablement-templates/scripts/setup-claude-config.sh

**Size**: 21 KB (fully documented)

**Type**: Interactive bash script

## How It Works

The script automates the creation of a complete multi-agent orchestration structure with 4 main steps:

1. **Validate Repository** - Checks if directory exists and looks for package files
2. **Gather User Input** - Prompts for repo name, tech stack, purpose, teams, agents
3. **Create Directory Structure** - Creates .claude/agents/ and updates .gitignore
4. **Generate Configuration Files** - Creates CLAUDE.md, AGENTS.md, and templates

## Quick Start

```bash
cd /path/to/your/repo
/home/user/TEEI-CSR-Platform/enablement-templates/scripts/setup-claude-config.sh .
```

Follow the interactive prompts and your configuration will be ready in seconds.

## Files Created

```
your-repo/
├── CLAUDE.md                     # Entry point (11 bytes)
├── AGENTS.md                     # Main configuration (8 KB)
├── .claude/
│   └── agents/
│       ├── README.md             # Agent guide (2.3 KB)
│       └── development-lead.md   # Template (1.6 KB)
└── .gitignore                    # Updated
```

Total: ~13 KB of ready-to-use configuration

## Key Features

**User-Friendly**: Color-coded prompts, clear validation, helpful errors
**Sensible Defaults**: Repo name from directory, 10 tech stack options, default team sizes
**Production-Ready**: Based on real AGENTS.md files from the ecosystem
**Extensible**: Templates for agents, custom commands, README guides

## Customization

After setup, customize:

1. **Update Team Structure** - Replace generic teams with your specialists
2. **Create Agent Roles** - Copy and customize agent role files
3. **Custom Commands** - Add task-specific slash commands
4. **Quality Gates** - Set realistic standards for your project

## Tech Stacks Supported

- Node.js / TypeScript (default)
- Python / FastAPI
- Go / gRPC
- Rust
- Java / Spring
- Frontend / React, Vue, Svelte
- Full-stack / Monorepo
- Custom (other)

## Quality Gates

The generated AGENTS.md includes quality standards:

Required to pass:
- pnpm typecheck (0 errors)
- pnpm lint (0 errors)
- pnpm test (80% unit, 60% integration)
- pnpm build (succeeds)

Blocked conditions:
- Failing tests
- TypeScript errors
- Secrets in code
- Missing documentation

## Troubleshooting

**Script doesn't run**: chmod +x setup-claude-config.sh

**"Repository path does not exist"**: Use absolute path or cd to repo first

**Files incorrect**: Delete and re-run the script

## Related Resources

- **Script**: /home/user/TEEI-CSR-Platform/enablement-templates/scripts/setup-claude-config.sh
- **README**: /home/user/TEEI-CSR-Platform/enablement-templates/scripts/README.md
- **Templates**: /home/user/TEEI-CSR-Platform/enablement-templates/agents/
- **Examples**: /home/user/TEEI-CSR-Platform/enablement-templates/repos/

---

Created: 2025-11-17
Version: 1.0
Status: Ready for Production Use
