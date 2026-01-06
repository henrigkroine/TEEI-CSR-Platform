# Claude Configuration Setup Scripts

This directory contains automated scripts to initialize Claude AI agent configuration in new repositories.

## Scripts Overview

### setup-claude-config.sh

An interactive bash script that initializes a complete Claude agent configuration system in a new repository.

**Purpose**: Streamline the setup of multi-agent orchestration structure with sensible defaults and user customization.

**Size**: ~21 KB

## Quick Start

```bash
# Navigate to your repository
cd /path/to/your/repo

# Run the setup script
/path/to/enablement-templates/scripts/setup-claude-config.sh .
```

## What It Creates

The script creates a standardized Claude agent configuration:

```
your-repo/
├── CLAUDE.md                          # Entry point that references AGENTS.md
├── AGENTS.md                          # Complete multi-agent team structure (8 KB)
├── .claude/
│   ├── agents/
│   │   ├── README.md                  # Agent configuration guide
│   │   ├── development-lead.md        # Sample agent role template
│   │   └── [other-agents].md          # (To be added by user)
│   └── commands/
│       └── (Custom slash commands - optional)
└── .gitignore                         # Updated with .claude patterns
```

### File Descriptions

#### CLAUDE.md
Minimal entry point containing `@AGENTS.md` reference for Claude context.

#### AGENTS.md
Core 8KB configuration file with:
- Repository overview (name, tech stack, purpose)
- Build & test commands (customizable for your stack)
- Architecture overview & directory structure
- Safety constraints (NEVER/ALWAYS rules)
- Quality gates & standards
- Agent team structure with specialists
- Decision framework & guidelines
- 4-5 phase orchestration workflow
- Success criteria & acceptance tests
- Agent coordination rules
- Communication protocol

#### .claude/agents/README.md
Guide for agents on:
- How to read and follow role files
- Coordination rules & quality gates
- Adding new agents
- Blocked conditions preventing merges
- Communication patterns

#### .claude/agents/development-lead.md
Sample template showing:
- Role description & responsibilities
- "MUST BE USED when" conditions
- Constraints (NEVER/ALWAYS)
- Allowed tools & permissions
- Communication patterns
- Success metrics

## Interactive Setup Flow

The script prompts for:

1. **Repository Name** (default: current directory)
2. **Tech Stack** (Node.js, Python, Go, Rust, Java, Frontend frameworks, etc.)
3. **Purpose/Description**
4. **Number of Teams**
5. **Number of Agents**
6. **Confirmation to proceed**

## Customization After Setup

### 1. Update AGENTS.md
- Customize team structure with your actual teams/agents
- Update build commands for your tooling
- Describe your actual architecture
- Set realistic quality thresholds
- Define your delivery phases

### 2. Create Agent Role Files
For each agent, create `.claude/agents/[role-name].md` with:
- Specific expertise & responsibilities
- "MUST BE USED when" conditions
- Allowed tools & constraints
- Success metrics

### 3. Create Custom Commands
Add instructions in `.claude/commands/` for common tasks like:
- `/build` - Compile and run checks
- `/test` - Run test suite
- `/deploy` - Deployment process

### 4. Update Quality Gates
Customize the quality standards in AGENTS.md:
- Code coverage thresholds
- Test percentages
- Linting & formatting rules
- CI/CD gate criteria

## Integration with Version Control

Updates `.gitignore` to exclude:
```
.claude/commands/*.local      # Local command overrides
```

## For Team Leads

1. Review AGENTS.md structure
2. Define clear agent ownership
3. Map agent dependencies
4. Set escalation SLOs
5. Commit & review with team

## For Individual Agents

1. Read your role file in `.claude/agents/[role-name].md`
2. Understand AGENTS.md team structure
3. Follow "MUST BE USED when" conditions
4. Respect quality gates
5. Escalate blockers immediately

## Quality Gate Enforcement

**Blocking Conditions**:
- ❌ Failing tests (< 80% unit, < 60% integration)
- ❌ TypeScript compilation errors
- ❌ ESLint violations
- ❌ Secrets or credentials in code
- ❌ Missing documentation

**Recommended CI/CD Gates**:
- `pnpm typecheck` passes
- `pnpm lint` passes
- `pnpm test` with coverage reports
- `pnpm build` succeeds

## Troubleshooting

**Script exits with "Repository path does not exist"**
- Ensure you provide a valid directory path
- Run: `setup-claude-config.sh /absolute/path/to/repo`

**"No package.json found" warning**
- Just a warning, script works in any directory
- Update Build & Test Commands in AGENTS.md if using different package manager

**Files not created**
- Check write permissions: `ls -la /path/to/repo/.claude/`
- Verify disk space and permissions

## Related Resources

- **Agent Role Templates**: `/enablement-templates/agents/` - Specialist examples
- **Example Projects**: `/enablement-templates/repos/` - Real project AGENTS.md files
- **Project Instructions**: `/AGENTS.md` - Main multi-agent structure

---

**Last Updated**: 2025-11-17
**Version**: 1.0
**Created By**: setup-claude-config.sh
