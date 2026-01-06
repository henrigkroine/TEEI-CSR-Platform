# TEEI CSR Platform - Indexes & Database Guide

**Generated**: 2025-01-27  
**Purpose**: Complete file indexing and organization system

---

## Overview

This repository contains comprehensive indexes and databases for the TEEI CSR Platform codebase:

1. **FILE_INDEX.md** - Complete file index with directory structure
2. **SERVICE_INDEX.md** - Service-by-service breakdown
3. **FEATURE_INDEX.md** - Feature-by-feature organization
4. **FILES_DATABASE_STRUCTURED.json** - Structured JSON database
5. **FILES_DATABASE.json** - Raw file metadata (if generated)

---

## Quick Reference

### Finding Files

#### By Service
→ See **SERVICE_INDEX.md**
- Lists all 26 services with file breakdowns
- Includes port assignments, status, dependencies
- Service-specific file listings

#### By Feature
→ See **FEATURE_INDEX.md**
- 35+ features organized by category
- Feature-to-file mappings
- Feature dependencies

#### By Directory Structure
→ See **FILE_INDEX.md**
- Complete directory tree
- File counts by type
- Quick reference tables

#### By Database Query
→ See **FILES_DATABASE_STRUCTURED.json**
- JSON structure for programmatic access
- File metadata organized by service/package/app
- Feature-to-file mappings

---

## Index Files

### Functionality Indexes (NEW!)

**Location**: `INDEXES/` directory

Individual detailed indexes for each functionality area:

1. **INDEXES/CORE_FEATURES_INDEX.md** - Core platform features (5 features, ~771 files)
2. **INDEXES/AI_ANALYTICS_INDEX.md** - AI and analytics (4 features, ~269 files)
3. **INDEXES/INTEGRATION_INDEX.md** - External integrations (3 features, ~191 files)
4. **INDEXES/REPORTING_COMPLIANCE_INDEX.md** - Reporting & compliance (4 features, ~125 files)
5. **INDEXES/USER_MANAGEMENT_INDEX.md** - User management (4 features, ~189 files)
6. **INDEXES/PLATFORM_FEATURES_INDEX.md** - Platform features (15 features, ~229 files)

See `INDEXES/README.md` for detailed guide to functionality indexes.

---

### 1. FILE_INDEX.md

**Purpose**: Complete file inventory organized by directory structure

**Contents**:
- Root configuration files
- Packages directory (26+ packages)
- Services directory (26+ services)
- Apps directory (2 apps)
- Infrastructure & DevOps
- Documentation (253+ files)
- Scripts (104+ files)
- Tests (97+ files)
- Configuration files

**Use When**:
- Need to understand repository structure
- Looking for files by location
- Understanding file organization patterns
- Getting file counts by type

**Sections**:
- Root Configuration Files
- Packages Directory
- Services Directory
- Apps Directory
- Infrastructure & DevOps
- Documentation
- Scripts
- Tests
- Quick Reference: File Search Index
- Searchable File Paths
- File Naming Conventions
- File Organization Patterns
- File Count Summary

---

### 2. SERVICE_INDEX.md

**Purpose**: Service-by-service breakdown with file listings

**Contents**:
- Service overview and categories
- Detailed breakdown of all 26 services
- Service files database
- Service dependencies
- Service ports & configuration
- Service health status

**Use When**:
- Understanding what a service does
- Finding service-specific files
- Understanding service dependencies
- Checking service status and ports

**Key Information**:
- Service purpose and description
- Port assignments (with conflicts noted)
- Dockerfile status
- Health endpoint paths
- File listings per service
- Dependencies

**Services Covered**:
1. api-gateway
2. analytics
3. reporting
4. impact-in
5. q2q-ai
6. insights-nlq
7. campaigns
8. unified-profile
9. buddy-service
10. buddy-connector
11. kintell-connector
12. upskilling-connector
13. program-service
14. notifications
15. safety-moderation
16. journey-engine
17. forecast
18. impact-calculator
19. billing
20. data-residency
21. ai-budget
22. privacy-orchestrator
23. gdpr-service (broken)
24. builder-runtime
25. synthetics
26. discord-bot

---

### 3. FEATURE_INDEX.md

**Purpose**: Feature-by-feature organization with file mappings

**Contents**:
- Core Features (5 features)
- AI & Analytics Features (4 features)
- Integration Features (3 features)
- Reporting & Compliance Features (4 features)
- User Management Features (4 features)
- Platform Features (15 features)

**Use When**:
- Understanding platform capabilities
- Finding files related to a specific feature
- Understanding feature dependencies
- Planning feature development

**Features Covered**:

**Core Features**:
1. Unified Journey Tracking
2. Q2Q AI Engine
3. SROI Calculation
4. VIS Calculation
5. Corporate Cockpit Dashboard

**AI & Analytics**:
6. Natural Language Query (NLQ)
7. Analytics Engine
8. Forecasting
9. Scenario Planner

**Integration**:
10. External Connectors
11. Discord Integration
12. Webhooks

**Reporting & Compliance**:
13. Report Generation
14. Evidence Lineage
15. GDPR Compliance
16. Audit Logging

**User Management**:
17. Buddy Matching
18. Program Management
19. Campaign Management
20. Unified Profile

**Platform**:
21. API Gateway
22. Notifications
23. Safety Moderation
24. Boardroom Mode
25. PWA Support
26. Dark Mode
27. Accessibility (A11y)
28. Internationalization (i18n)
29. Benchmarks
30. Approvals Workflow
31. Deck Composer
32. Publications
33. Admin Console
34. Identity & SSO
35. Data Trust & Catalog

---

### 4. FILES_DATABASE_STRUCTURED.json

**Purpose**: Structured JSON database for programmatic access

**Contents**:
- Metadata (generation date, version)
- Services structure with file listings
- Packages structure with file listings
- Apps structure with file listings
- Infrastructure structure
- Documentation structure
- Scripts structure
- Tests structure
- File types statistics
- Feature-to-file mappings
- Overall statistics

**Use When**:
- Building tools that need file metadata
- Programmatic file discovery
- Generating reports
- Analyzing codebase structure

**Structure**:
```json
{
  "metadata": {...},
  "structure": {
    "services": {...},
    "packages": {...},
    "apps": {...},
    "infrastructure": {...},
    "documentation": {...},
    "scripts": {...},
    "tests": {...}
  },
  "fileTypes": {...},
  "features": {...},
  "statistics": {...}
}
```

**Key Sections**:
- `structure.services` - All 26 services with file listings
- `structure.packages` - All 26 packages with file listings
- `structure.apps` - Both apps with detailed file structure
- `fileTypes` - File counts by extension
- `features` - Feature-to-file mappings
- `statistics` - Overall counts

---

## Usage Examples

### Example 1: Find all files for a service

**Question**: What files are in the reporting service?

**Answer**: 
1. Open **SERVICE_INDEX.md**
2. Find "Reporting Service" section
3. See complete file listing (254 files)
4. Or query **FILES_DATABASE_STRUCTURED.json**:
   ```json
   structure.services.reporting.files
   ```

---

### Example 2: Find files related to a feature

**Question**: What files implement the Q2Q AI feature?

**Answer**:
1. Open **FEATURE_INDEX.md**
2. Find "Q2Q AI Engine" section
3. See file listings:
   - `services/q2q-ai/` (82 files)
   - `packages/model-registry/`
   - `apps/corp-cockpit-astro/src/components/q2q/`
4. Or query **FILES_DATABASE_STRUCTURED.json**:
   ```json
   features["q2q-ai"].files
   ```

---

### Example 3: Understand repository structure

**Question**: How is the repository organized?

**Answer**:
1. Open **FILE_INDEX.md**
2. See "Table of Contents"
3. Review directory structure sections
4. Check "File Organization Patterns" section

---

### Example 4: Find all TypeScript files

**Question**: How many TypeScript files are there and where are they?

**Answer**:
1. Open **FILE_INDEX.md**
2. See "Quick Reference: File Search Index" → "By File Extension" → "TypeScript Files"
3. See breakdown:
   - Services: 829+ files
   - Packages: 252+ files
   - Apps: 150+ files
   - Total: ~1,300+ TypeScript files
4. Or query **FILES_DATABASE_STRUCTURED.json**:
   ```json
   fileTypes.typescript
   ```

---

### Example 5: Find service dependencies

**Question**: What does the reporting service depend on?

**Answer**:
1. Open **SERVICE_INDEX.md**
2. Find "Reporting Service" section
3. See "Dependencies" subsection
4. Or see "Service Dependencies" section for dependency graph

---

## Statistics Summary

### File Counts

| Category | Count |
|----------|-------|
| **Total Files** | ~2,800+ |
| **Services** | 26 |
| **Packages** | 26 |
| **Apps** | 2 |
| **TypeScript Files** | ~1,300+ |
| **Markdown Files** | ~600+ |
| **YAML Files** | ~359+ |
| **JSON Files** | ~178+ |
| **SQL Files** | ~55+ |
| **Shell Scripts** | ~63+ |
| **Test Files** | 97 |
| **Documentation Files** | 456 |

### Service Status

| Status | Count | Services |
|--------|-------|----------|
| ✅ Production-Ready | 21 | Most services |
| ⚠️ Needs Attention | 4 | insights-nlq, billing, data-residency, etc. |
| 🔴 Broken | 1 | gdpr-service |

### Feature Coverage

| Category | Features |
|----------|----------|
| **Core Features** | 5 |
| **AI & Analytics** | 4 |
| **Integration** | 3 |
| **Reporting & Compliance** | 4 |
| **User Management** | 4 |
| **Platform Features** | 15 |
| **Total** | 35+ |

---

## Maintenance

### Updating Indexes

When new files/services/features are added:

1. **FILE_INDEX.md**: Update directory listings and file counts
2. **SERVICE_INDEX.md**: Add new service entries
3. **FEATURE_INDEX.md**: Add new feature entries
4. **FILES_DATABASE_STRUCTURED.json**: Update JSON structure
5. Update "Last Updated" dates in all files

### Regenerating Database

To regenerate the raw file database:

```bash
# PowerShell (Windows)
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch 'node_modules|dist|\.git|\.turbo' } | Select-Object Path,Size,Extension,LastModified | ConvertTo-Json | Out-File FILES_DATABASE.json

# Bash (Linux/Mac)
find . -type f -not -path "./node_modules/*" -not -path "./dist/*" -not -path "./.git/*" | jq -R '{path: ., size: ., extension: .}' > FILES_DATABASE.json
```

---

## Related Documentation

- **INDEXES/** - Functionality-specific indexes (6 detailed indexes)
- **SERVICES_INVENTORY.md** - Detailed service inventory with health status
- **CLAUDE.md** - Claude Code enablement guide
- **README.md** - Main project README
- **docs/** - Comprehensive documentation (253+ files)

---

## Index Versions

| Index | Version | Last Updated |
|-------|---------|--------------|
| FILE_INDEX.md | 1.1 | 2025-01-27 |
| SERVICE_INDEX.md | 1.0 | 2025-01-27 |
| FEATURE_INDEX.md | 1.0 | 2025-01-27 |
| FILES_DATABASE_STRUCTURED.json | 1.0 | 2025-01-27 |

---

**Last Updated**: 2025-01-27  
**Maintained By**: Claude Code

