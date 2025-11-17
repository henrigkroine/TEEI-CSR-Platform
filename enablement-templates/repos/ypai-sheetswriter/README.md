# YPAI.SheetsWriter - Claude Agent Configuration Template

This directory contains a complete AGENTS.md template for the YPAI.SheetsWriter repository, designed for serverless data pipeline projects that integrate with Google Sheets API.

## Files

- **AGENTS.md** - Complete agent configuration including:
  - Project overview and tech stack
  - Build, test, and deployment commands
  - Architecture summary (serverless + Google Sheets API)
  - Safety constraints and quality gates
  - 5 specialized agent roles (Serverless Specialist, Google Sheets API Specialist, Data Transformation Specialist, Testing Specialist, Auth & Security Specialist)
  - Decision framework for serverless architecture
  - Multi-phase orchestration workflow
  - Monitoring and observability guidance

- **CLAUDE.md** - Thin wrapper that references AGENTS.md (follows best practices pattern)

## Quick Start

### Copying to Your Repository

If you're setting up a serverless/Google Sheets project, copy this template:

```bash
# Copy the template
cp -r /home/user/TEEI-CSR-Platform/enablement-templates/repos/ypai-sheetswriter/{CLAUDE.md,AGENTS.md} <your-repo>/

# Customize AGENTS.md for your repo:
# - Update project name and description
# - Adjust tech stack as needed
# - Add/remove agents based on team size
# - Customize commands if using different build tools
```

### Using the Template

1. Place `CLAUDE.md` and `AGENTS.md` in your repository root
2. Claude will automatically load AGENTS.md when you run Claude Code in that repo
3. Agents can be invoked based on "When to Invoke" triggers

## Template Design

This template follows the [Claude Agent Setup - Best Practices & Templates](../../CLAUDE_ENABLEMENT_BEST_PRACTICES.md) guide and includes:

### Serverless-Specific Features
- Serverless framework configuration patterns
- AWS Lambda / Google Cloud Functions guidance
- Local development with serverless-offline
- Deployment pipeline (dev → staging → prod)
- CloudWatch / Stackdriver monitoring setup

### Google Sheets Integration
- OAuth2 token management
- API quota enforcement
- Rate limiting per workspace
- Batch write optimization
- Error handling (transient failures, quota exceeded)

### Multi-Tenant Safety
- Workspace isolation enforcement
- Cross-workspace access prevention
- Audit logging for compliance
- Multi-tenant testing strategies

### Data Pipeline Quality
- Golden test patterns (sample input → expected output)
- Metric calculation validation
- Data deduplication and idempotency
- Input validation with schemas

### Team Coordination
- Single-lead orchestration model (recommended for small teams)
- 5 specialized agent roles with clear responsibilities
- Phased workflow (Foundation → Implementation → Testing → Handoff)
- Clear blocking conditions and quality gates

## Agent Roles Included

1. **Serverless Specialist** - Lambda/Cloud Functions, deployment, local development
2. **Google Sheets API Specialist** - API integration, OAuth2, quota management
3. **Data Transformation Specialist** - Transformation pipelines, metric calculation
4. **Serverless Testing Specialist** - Unit/integration tests, mocking, coverage
5. **Auth & Security Specialist** - OAuth2, API keys, workspace isolation, audit logging

## Customization Guide

### For Different Cloud Providers
- AWS Lambda → No changes needed (primary example)
- Google Cloud Functions → Update `serverless.yml` → GCP provider
- Azure Functions → Update to azure-functions framework

### For Different Data Destinations
- Google Sheets → Keep as-is
- Snowflake → Replace Google Sheets specialist with Snowflake specialist
- BigQuery → Similar structure, update quota management agent
- DynamoDB/S3 → Replace Google Sheets specialist with AWS specialist

### For Different Team Sizes
- **Solo developer**: Keep all agents, use all 5 roles
- **2-3 people**: Combine Testing + Security into one agent
- **5+ people**: Expand with additional agents (monitoring specialist, performance specialist)

## Integration with Larger Projects

If using within a multi-agent orchestration:

1. Include this AGENTS.md as part of larger MULTI_AGENT_PLAN.md
2. Reference the serverless-data-lead as a specialist within the larger Tech Lead role
3. Coordinate with other teams (frontend, backend, data) via MULTI_AGENT_PLAN.md

Example:
```markdown
## Worker X: Data Pipeline Team

### Team 3: Serverless Data Integration
**Lead**: serverless-data-lead
- Agent 3.1: Serverless Specialist
- Agent 3.2: Google Sheets API Specialist
- Agent 3.3: Data Transformation Specialist
- Agent 3.4: Serverless Testing Specialist
- Agent 3.5: Auth & Security Specialist
```

## References

- [Claude Code Agent Setup - Best Practices & Templates](../../CLAUDE_ENABLEMENT_BEST_PRACTICES.md)
- [Claude Code Enablement Orientation](../../CLAUDE_ENABLEMENT_ORIENTATION.md)
- Serverless Framework: https://www.serverless.com/framework/docs
- Google Sheets API: https://developers.google.com/sheets/api
- AWS Lambda: https://docs.aws.amazon.com/lambda/

## Version

- **Created**: 2025-11-17
- **Based on**: CLAUDE_ENABLEMENT_BEST_PRACTICES.md
- **Status**: Production-ready template
