#!/bin/bash

#############################################################################
# Claude Agent Configuration Setup Script
#
# This script initializes Claude/agent configuration in a new repository.
# It creates CLAUDE.md, .claude/agents/ directory, and generates an
# AGENTS.md file based on user inputs.
#
# Usage: ./setup-claude-config.sh [target-repo-path]
#############################################################################

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ENABLEMENT_DIR="$( cd "$( dirname "$SCRIPT_DIR" )" && pwd )"

#############################################################################
# Helper Functions
#############################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_step() {
    echo -e "\n${YELLOW}→ $1${NC}"
}

prompt_input() {
    local prompt="$1"
    local default="$2"
    local input

    if [ -n "$default" ]; then
        echo -n -e "${CYAN}$prompt${NC} [${default}]: " >&2
    else
        echo -n -e "${CYAN}$prompt${NC}: " >&2
    fi

    read -r input

    if [ -z "$input" ] && [ -n "$default" ]; then
        echo "$default"
    else
        echo "$input"
    fi
}

prompt_confirm() {
    local prompt="$1"
    local response

    echo -n -e "${CYAN}$prompt${NC} (y/n): " >&2
    read -r response

    if [[ "$response" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

select_option() {
    local prompt="$1"
    shift
    local options=("$@")
    local choice

    echo -e "\n${CYAN}$prompt${NC}" >&2
    for i in "${!options[@]}"; do
        echo "  $((i+1))) ${options[$i]}" >&2
    done

    echo -n -e "${CYAN}Select option (1-${#options[@]}): ${NC}" >&2
    read -r choice

    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
        echo "${options[$((choice-1))]}"
    else
        print_error "Invalid selection"
        return 1
    fi
}

validate_repo_path() {
    local repo_path="$1"

    if [ ! -d "$repo_path" ]; then
        print_error "Repository path does not exist: $repo_path"
        return 1
    fi

    if [ ! -f "$repo_path/package.json" ] && [ ! -f "$repo_path/pyproject.toml" ] && [ ! -f "$repo_path/go.mod" ]; then
        print_warning "No package.json, pyproject.toml, or go.mod found in repository"
        if ! prompt_confirm "Continue anyway?"; then
            return 1
        fi
    fi

    return 0
}

check_existing_config() {
    local repo_path="$1"

    if [ -f "$repo_path/CLAUDE.md" ] || [ -d "$repo_path/.claude" ]; then
        print_warning "Claude configuration already exists in this repository"
        if ! prompt_confirm "Overwrite existing configuration?"; then
            print_info "Setup cancelled"
            exit 0
        fi
    fi
}

#############################################################################
# Template Generators
#############################################################################

generate_claude_md() {
    cat << 'EOF'
@AGENTS.md
EOF
}

generate_agents_md() {
    local repo_name="$1"
    local tech_stack="$2"
    local purpose="$3"
    local team_count="$4"
    local agent_count="$5"

    local timestamp=$(date -u +"%Y-%m-%d")

    cat << EOF
# Multi-Agent Orchestration Structure: $repo_name

## Repository Overview

**Repository Name**: $repo_name
**Tech Stack**: $tech_stack
**Purpose**: $purpose
**Status**: 🚧 In Progress

---

## Build & Test Commands

\`\`\`bash
# Installation
pnpm install
pnpm install --frozen-lockfile  # CI/production

# Development
pnpm dev                          # Start development server with hot reload
pnpm dev:debug                    # Start with debug logging enabled

# Build & Compilation
pnpm build                        # Production build
pnpm typecheck                    # TypeScript validation (strict mode)

# Testing
pnpm test                         # Run all unit tests
pnpm test:watch                   # Watch mode for unit tests
pnpm test:coverage                # Generate coverage reports

# Code Quality
pnpm lint                         # Run ESLint
pnpm lint:fix                     # Auto-fix lint issues
pnpm format                       # Format code with Prettier
\`\`\`

---

## Architecture Overview

### Repository Structure

\`\`\`
$repo_name/
├── src/
│   ├── components/                 # Reusable UI components
│   ├── services/                   # Business logic services
│   ├── utils/                      # Utility functions
│   ├── types/                      # TypeScript type definitions
│   └── index.ts                    # Entry point
├── tests/
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   └── e2e/                        # End-to-end tests
├── docs/                           # Documentation
├── .claude/                        # Claude AI configuration
│   ├── agents/                     # Agent configurations and guidelines
│   └── commands/                   # Custom Claude slash commands
├── tsconfig.json                   # TypeScript configuration
├── jest.config.js                  # Test configuration
├── package.json
└── README.md
\`\`\`

---

## Safety Constraints

### NEVER (Blocking)
- ❌ **NEVER** commit secrets or credentials
- ❌ **NEVER** skip tests before committing
- ❌ **NEVER** push directly to main/master without PR review
- ❌ **NEVER** commit \`.env\` files or sensitive configuration
- ❌ **NEVER** use hardcoded credentials or API keys

### ALWAYS (Required)
- ✅ **ALWAYS** validate TypeScript compilation (no errors in strict mode)
- ✅ **ALWAYS** run tests before proposing commits
- ✅ **ALWAYS** write clear commit messages
- ✅ **ALWAYS** check for secrets before committing
- ✅ **ALWAYS** document breaking changes

---

## Quality Gates

### Code Quality
- ✅ TypeScript compilation: **0 errors** in strict mode
- ✅ Unit test coverage: **≥80%** for critical paths
- ✅ Linting: **0 errors** with ESLint
- ✅ Code formatting: Consistent with Prettier configuration

### Testing
- ✅ Unit tests: **≥80%** coverage of services and utilities
- ✅ Integration tests: **≥60%** coverage of critical flows
- ✅ E2E tests: Coverage of main user journeys (if applicable)

### CI/CD Gates
- ✅ \`pnpm typecheck\` passes
- ✅ \`pnpm lint\` passes
- ✅ \`pnpm test\` passes with coverage reports
- ✅ \`pnpm build\` succeeds

---

## Agent Team Structure

### Team 1: Core Development (3 agents)
**Lead**: development-lead

- **Agent 1.1**: frontend-specialist
  - **Expertise**: UI/UX, React/Vue/Svelte, component design
  - **MUST BE USED when**: Building UI components, implementing features
  - **Deliverables**: Components, UI implementations, responsive designs

### Team 2: Architecture & Backend (3 agents)
**Lead**: architecture-lead

- **Agent 2.1**: backend-specialist
  - **Expertise**: Server-side logic, APIs, database design
  - **MUST BE USED when**: Designing APIs, implementing business logic
  - **Deliverables**: API implementations, service layer, data models

### Team 3: Testing & QA (3 agents)
**Lead**: qa-lead

- **Agent 3.1**: test-automation-specialist
  - **Expertise**: Testing strategies, test automation, quality assurance
  - **MUST BE USED when**: Writing tests, setting up CI/CD
  - **Deliverables**: Test suites, test fixtures, test documentation

---

## Decision Framework

### Development Process
- **Language**: TypeScript (strict mode required)
- **Code Style**: Prettier for formatting, ESLint for linting
- **Testing**: Jest for unit/integration tests
- **Documentation**: Clear comments and README documentation

### Quality Standards
- **Code Review**: All changes require peer review
- **Testing**: Minimum coverage thresholds enforced
- **Security**: Regular dependency audits, no hardcoded secrets
- **Performance**: Monitor and optimize critical paths

---

## Orchestration Workflow

### Phase 1: Foundation (Week 1)
1. **development-lead**: Set up project structure and tooling
2. **qa-lead**: Initialize testing infrastructure

### Phase 2: Core Development (Week 2-3)
1. **frontend-specialist**: Build core components and UI
2. **backend-specialist**: Implement business logic and APIs

### Phase 3: Testing & Integration (Week 3-4)
1. **test-automation-specialist**: Write comprehensive tests
2. All agents: Integrate components and verify functionality

### Phase 4: Polish & Release (Week 4-5)
1. All agents: Code review and refactoring
2. All agents: Documentation and demo preparation

---

## Success Criteria

✅ **Code Quality**: TypeScript strict mode with 0 errors
✅ **Testing**: Unit tests ≥80%, integration tests ≥60%
✅ **Build**: All compilation and build steps succeed
✅ **Documentation**: Architecture documented, README updated
✅ **CI/CD**: All gates passing in continuous integration
✅ **Linting**: 0 ESLint errors, consistent code formatting
✅ **Security**: No secrets in repository, dependencies audited
✅ **PR Ready**: Clean commit history, PR description included

---

## Allowed Tools by Agent

### development-lead
- **Read, Write**: Source code, configuration files
- **Bash**: \`pnpm dev\`, \`pnpm build\`, \`pnpm test\` only
- **Prohibited**: Direct infrastructure changes, secret modifications

### frontend-specialist
- **Read, Write**: Component files, UI source code
- **Bash**: \`pnpm dev\`, \`pnpm test\` only
- **Prohibited**: Infrastructure access, backend service modifications

### backend-specialist
- **Read, Write**: Service files, API implementations, data models
- **Bash**: \`pnpm dev\`, \`pnpm build\`, \`pnpm test\` only
- **Prohibited**: UI modifications, infrastructure changes

### test-automation-specialist
- **Read, Write**: Test files, test fixtures, test configuration
- **Bash**: \`pnpm test\`, \`pnpm test:watch\`, \`pnpm test:coverage\` only
- **Prohibited**: Modifying source code directly (except test-related)

---

## Communication Protocol

- **Daily**: Lead standup (5 mins) - blockers escalated immediately
- **Commits**: Small, atomic, tested slices - no monolithic PRs
- **PR Process**: Clear commit messages, link to requirements, include examples
- **Documentation**: Update README and architecture docs after major changes
- **Artifacts**: Teams document decisions in /docs/ and update this file after milestones

---

## Agent Coordination Rules

1. **Orchestrator-only planning** - No specialist does tech lead's orchestration
2. **No implementation overlap** - Clear ownership per agent
3. **Dependencies mapped** - Blocked work escalated early
4. **Test coverage required** - No merges without tests (unit ≥80%, E2E ≥60%)
5. **Documentation mandatory** - Every feature and decision documented
6. **Least-privilege tools** - Agents use minimum required tools

---

## Additional Resources

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **ESLint Guide**: https://eslint.org/docs/latest/
- **Prettier Documentation**: https://prettier.io/docs/en/

---

**Last Updated**: $timestamp
**Initialized By**: setup-claude-config.sh
EOF
}

generate_agents_readme() {
    local repo_name="$1"

    cat << 'EOF'
# Claude Agent Configuration

This directory contains configuration and guidelines for Claude AI agents working on this repository.

## Structure

- **agents/** - Agent-specific role descriptions and constraints
- **commands/** - Custom Claude slash commands for this project

## Agent Guidelines

Each agent should:

1. **Read their role file** - Understand their specific responsibilities
2. **Follow coordination rules** - No overlap with other agents
3. **Respect quality gates** - All changes must meet quality thresholds
4. **Document decisions** - Update relevant documentation after changes
5. **Communicate blockers** - Escalate dependencies immediately

## Quick Start for New Agents

1. Check the appropriate team/role file for your assignment
2. Review the AGENTS.md file in the repository root for team structure
3. Follow the "MUST BE USED when" guidelines for your role
4. Use the "Allowed Tools" guidelines to work efficiently
5. Reference the Communication Protocol for coordination

## Adding New Agents

When adding a new agent to the team:

1. Update `/AGENTS.md` with the new agent's role and responsibilities
2. Create a role-specific file in this directory if needed
3. Add the agent to the appropriate team structure
4. Define "MUST BE USED when" conditions for the agent
5. List allowed tools and constraints for the agent
6. Update orchestration workflow if dependencies change

## Enforcing Quality Gates

All agents must ensure:

- ✅ Code compiles/runs without errors
- ✅ Tests pass (minimum 80% unit, 60% integration)
- ✅ Linting passes with 0 errors
- ✅ Documentation is updated
- ✅ No secrets committed to repository
- ✅ Clear, atomic commit messages
- ✅ PR follows team standards

## Blocked Conditions

The following will block merges:

- ❌ Failing tests
- ❌ TypeScript compilation errors
- ❌ ESLint violations
- ❌ Coverage below thresholds
- ❌ Secrets or credentials in code
- ❌ Missing documentation
- ❌ Unclear commit messages

## Communication

- Use the Communication Protocol defined in AGENTS.md
- Escalate blockers immediately to team leads
- Keep commits small and focused
- Reference requirements in commit messages
- Include examples/screenshots in PRs when applicable

---

For detailed agent responsibilities and orchestration workflow, see `/AGENTS.md`.
EOF
}

#############################################################################
# Main Setup Flow
#############################################################################

main() {
    print_header "Claude Agent Configuration Setup"

    print_info "This script will initialize Claude AI agent configuration"
    print_info "in your repository. You'll be prompted for some details."

    # Determine target repository
    local repo_path="${1:-.}"

    if [ "$repo_path" = "." ]; then
        repo_path="$(pwd)"
    fi

    repo_path="$(cd "$repo_path" && pwd)"

    print_step "Validating repository path: $repo_path"

    if ! validate_repo_path "$repo_path"; then
        print_error "Invalid repository path"
        exit 1
    fi

    check_existing_config "$repo_path"

    print_success "Repository validated"

    # Gather user inputs
    print_step "Gathering repository information"

    # Extract repo name from path
    local default_repo_name=$(basename "$repo_path")
    local repo_name=$(prompt_input "Repository name" "$default_repo_name")

    # Tech stack selection
    print_step "Select primary tech stack"
    local tech_stack=$(select_option "Which tech stack best describes this project?" \
        "Node.js / TypeScript" \
        "Python / FastAPI" \
        "Go / gRPC" \
        "Rust" \
        "Java / Spring" \
        "Frontend / React" \
        "Frontend / Vue" \
        "Frontend / Svelte" \
        "Full-stack / Monorepo" \
        "Other (custom)")

    if [ $? -ne 0 ]; then
        print_error "Tech stack selection failed"
        exit 1
    fi

    # Purpose description
    local purpose=$(prompt_input "Brief project purpose/description" "")

    if [ -z "$purpose" ]; then
        purpose="Collaborative development with Claude AI agents"
    fi

    # Team structure
    print_step "Configure team structure"
    local team_count=$(prompt_input "Number of agent teams" "3")
    local agent_count=$(prompt_input "Approximate number of agents" "9")

    # Display summary
    print_step "Configuration Summary"
    echo -e "\n${CYAN}Repository Configuration:${NC}"
    echo "  Repository Name: $repo_name"
    echo "  Tech Stack: $tech_stack"
    echo "  Purpose: $purpose"
    echo "  Teams: $team_count"
    echo "  Agents: $agent_count"
    echo -e "\n${CYAN}Target Directory: ${NC}$repo_path\n"

    if ! prompt_confirm "Proceed with setup?"; then
        print_info "Setup cancelled"
        exit 0
    fi

    # Create directories
    print_step "Creating directories"

    mkdir -p "$repo_path/.claude/agents"
    print_success "Created .claude/agents/ directory"

    # Generate and write files
    print_step "Generating configuration files"

    # Write CLAUDE.md
    generate_claude_md > "$repo_path/CLAUDE.md"
    print_success "Created CLAUDE.md"

    # Write AGENTS.md
    generate_agents_md "$repo_name" "$tech_stack" "$purpose" "$team_count" "$agent_count" > "$repo_path/AGENTS.md"
    print_success "Created AGENTS.md"

    # Write .claude/agents/README.md
    generate_agents_readme "$repo_name" > "$repo_path/.claude/agents/README.md"
    print_success "Created .claude/agents/README.md"

    # Create template agent role file
    cat > "$repo_path/.claude/agents/development-lead.md" << 'EOF'
# Development Lead Agent

## Role

You are the orchestrator for the development team. Your primary responsibility is coordinating specialist agents and ensuring the project moves forward efficiently.

## Key Responsibilities

1. **Team Orchestration** - Coordinate tasks across all specialist agents
2. **Architecture Planning** - Define the overall technical strategy
3. **Dependency Management** - Map and resolve task dependencies
4. **Quality Oversight** - Ensure all quality gates are met
5. **Communication** - Daily standups and blocker escalation

## MUST BE USED When

- Planning the overall project roadmap
- Making architectural decisions
- Resolving conflicts between agents
- Defining team standards and processes
- Coordinating major feature releases

## NEVER Do

- ❌ Do the specialist's work - delegate to the right agent
- ❌ Skip quality gates for speed
- ❌ Make decisions without consulting team leads
- ❌ Commit code directly without specialist review

## Tools Allowed

- **Read/Write**: Project configuration, roadmap documents, team guidelines
- **Bash**: Only `pnpm test`, `pnpm build`, `pnpm typecheck` for validation
- **Prohibited**: Direct code implementation, infrastructure changes

## Communication Pattern

1. Daily standup with all team leads (5 mins)
2. Weekly architecture review with specialists
3. Immediate escalation of blockers
4. Clear documentation of decisions in git commits

## Success Metrics

- All agents have clear ownership (no overlap)
- Dependencies resolved within 24 hours
- Quality gates never bypassed
- Team moving at sustainable pace
- Documentation kept up-to-date

EOF
    print_success "Created development-lead.md template"

    # Create gitignore entry
    if [ -f "$repo_path/.gitignore" ]; then
        if ! grep -q "\.claude/commands/.*\.local" "$repo_path/.gitignore"; then
            echo ".claude/commands/*.local" >> "$repo_path/.gitignore"
            print_success "Updated .gitignore with Claude local commands pattern"
        fi
    fi

    # Final output
    print_header "Setup Complete!"

    print_success "Claude agent configuration initialized"

    echo -e "\n${CYAN}Files Created:${NC}"
    echo "  • CLAUDE.md - Entry point referencing AGENTS.md"
    echo "  • AGENTS.md - Complete team structure and coordination rules"
    echo "  • .claude/agents/README.md - Agent configuration guide"
    echo "  • .claude/agents/development-lead.md - Sample agent role"

    echo -e "\n${CYAN}Next Steps:${NC}"
    echo "  1. Review AGENTS.md and customize team structure"
    echo "  2. Add role files for each specialized agent in .claude/agents/"
    echo "  3. Create custom Claude commands in .claude/commands/"
    echo "  4. Share this configuration with your team"
    echo "  5. Update this file as your team evolves"

    echo -e "\n${CYAN}Useful Commands:${NC}"
    echo "  View team structure:  cat $repo_path/AGENTS.md"
    echo "  Edit team config:     vi $repo_path/AGENTS.md"
    echo "  Add new agent role:   touch $repo_path/.claude/agents/[role-name].md"

    echo -e "\n${CYAN}Documentation:${NC}"
    print_info "See .claude/agents/README.md for agent guidelines"
    print_info "See AGENTS.md for detailed team structure and coordination rules"

    echo -e "\n${GREEN}Ready to start collaborating with Claude agents!${NC}\n"
}

# Handle script errors
handle_error() {
    print_error "An unexpected error occurred"
    exit 1
}

trap handle_error ERR

# Run main function
main "$@"
