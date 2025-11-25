# SWARM 3: Program Template System
## Executive Summary & Approval Request

**Status**: 🔍 **AWAITING YOUR APPROVAL**
**Created**: 2025-11-22
**Branch**: `claude/program-template-system-01FDQRZk75bdeHEHrt3ASCm7`
**Mode**: PLAN MODE (No code execution yet)

---

## 🎯 Objective

Build a **Program Template System** that converts existing programs (Mentors for Ukraine, Language for Ukraine, TEEI Buddy) into reusable, parameterized templates that can be instantiated for any beneficiary group, enabling scalable, monetizable CSR campaigns.

---

## 📋 What Has Been Done (Plan Mode)

### ✅ Comprehensive Codebase Analysis
- Explored all 25 microservices
- Analyzed database schemas (Drizzle ORM, PostgreSQL)
- Reviewed event contracts and architecture patterns
- Identified all current uses of `programType` (hardcoded strings)
- Mapped L2I monetization infrastructure
- Understood Swarm 1 & 2 ingestion outputs

### ✅ Architecture Design Completed
**Document**: `/docs/PROGRAM_TEMPLATE_SYSTEM_DESIGN.md` (15,000 words)

**Key Concepts**:
```
TEMPLATE (Reusable Blueprint)
  ↓
PROGRAM (Global Instance)
  ↓
CAMPAIGN (Company-Specific Instance)
  ↓
ENROLLMENT (User Participation)
```

**Three Master Templates Defined**:
1. **Mentorship Template** - Based on Mentors for Ukraine
2. **Language Practice Template** - Based on Language for Ukraine
3. **Buddy Integration Template** - Based on TEEI Buddy Program

**Core Tables**:
- `program_templates` - Reusable blueprints with Zod schemas
- `programs` - Global instances of templates
- `beneficiary_groups` - Target demographics (Ukrainian refugees, Syrians, etc.)
- `program_campaigns` - Company-specific instances
- `program_enrollments` - UPDATED with program/campaign links

### ✅ 30-Agent Orchestration Plan Created
**Document**: `/docs/SWARM_3_AGENT_ORCHESTRATION.md` (25,000 words)

**Agent Breakdown**:
- **Agents 1-6**: Domain & Template Design (Planning Phase)
- **Agents 7-12**: Database Schema Implementation
- **Agents 13-18**: Template Engine & Instantiation Logic
- **Agents 19-22**: Integration with Swarm 1 & 2
- **Agents 23-28**: Testing, Validation & Documentation
- **Agents 29-30**: Migration & Final Review

**Execution Strategy**:
- 6 parallel batches
- Clear dependencies mapped
- Estimated duration: **8.5 hours**

---

## 📊 Key Deliverables

### 1. Database Schema
- 5 new tables + 1 updated table
- 12 migrations (up/down tested)
- Backward compatible (dual-write strategy)

### 2. New Service: `program-service` (Port 3021)
- Template CRUD operations
- Program instantiation logic
- Campaign management
- Config resolution & validation
- Lifecycle state machine

### 3. Event Contracts
- 12 new event types for program lifecycle
- Enrichment of existing events with program context
- Backward compatible (optional fields)

### 4. Integration Updates
- **Kintell Connector**: Link sessions to programs
- **Buddy Connector**: Link matches to programs
- **Analytics Service**: SROI/VIS per program instance
- **Reporting Service**: Program-level dashboards

### 5. Testing Suite
- Unit tests (≥80% coverage)
- Integration tests (≥60% coverage)
- E2E tests (happy path + error cases)
- Golden tests for config resolution

### 6. Documentation
- API Reference (OpenAPI 3.1)
- Operational Runbooks
- Template Authoring Guide
- Migration Guide
- Troubleshooting Guide

### 7. Seed Data
- 3 master templates
- 5 programs
- 3 beneficiary groups
- 2 campaigns
- 50 enrollments

---

## 🔑 Key Features

### ✨ Template System
- **Zod-based schemas** for type-safe configuration
- **Versioning** with deprecation strategy
- **Configuration inheritance** (template → program → campaign)
- **Platform + Custom templates** (multi-tenant)

### 🌍 Beneficiary Group Targeting
- Demographics, location, eligibility criteria
- Reuse templates for any group (Ukrainians, Syrians, Afghans, etc.)

### 💰 Monetization Integration
- Link L2I subscriptions to specific programs
- Campaign-level budget tracking
- Program-based entitlements
- Impact attribution per campaign

### 📈 Impact Attribution
- SROI/VIS calculations per program instance
- Template-specific impact weights
- Evidence lineage tracking
- Multi-level rollups (campaign → program → template → global)

### 🔄 Backward Compatibility
- Dual-write strategy (programType + program_id)
- Existing code continues to work
- No breaking changes
- Gradual migration path

---

## 🏗️ Architecture Highlights

### Data Flow
```
1. Admin creates "Language Practice A1-C2" TEMPLATE
2. Admin instantiates PROGRAM "Language for Ukrainian Refugees"
3. Acme Corp creates CAMPAIGN from program
4. Volunteer enrolls in campaign
5. Kintell session completed → Enriched event with program context
6. Analytics service calculates SROI for program
7. Dashboard shows campaign metrics
8. L2I allocation updated
```

### Configuration Resolution
```typescript
Template: { sessionDuration: 60, autoMatch: false }
Program:  { sessionDuration: 45 } // Override
Campaign: { autoMatch: true }     // Override

Effective Config: { sessionDuration: 45, autoMatch: true }
```

### Event Enrichment
```typescript
// Before
{ type: "kintell.session.completed", participantId, sessionType: "language" }

// After
{
  type: "kintell.session.completed",
  participantId,
  sessionType: "language",
  programId: "uuid",
  campaignId: "uuid",
  templateId: "uuid"
}
```

---

## 🚀 Execution Plan

### Batch 0: Planning (2 hours)
**Agents**: 1-6 (Sequential)
- Domain analysis
- Template design
- Versioning strategy

### Batch 1: Schema (1 hour)
**Agents**: 7-12 (Parallel)
- 5 new tables
- 1 updated table
- Migrations

### Batch 2: Engine (1.5 hours)
**Agents**: 13-18 (Parallel)
- program-service
- Instantiation logic
- Lifecycle management

### Batch 3: Integration (1 hour)
**Agents**: 19-22 (Parallel)
- Connector updates
- Event enrichment

### Batch 4: Testing (1.5 hours)
**Agents**: 23-26 (Parallel)
- Unit tests
- Integration tests
- E2E tests
- Fixtures

### Batch 5: Docs & Migration (1 hour)
**Agents**: 27-29 (Parallel)
- API docs
- Runbooks
- Backfill scripts

### Batch 6: Final Review (30 min)
**Agent**: 30 (Sequential)
- Validation
- PR readiness

**Total Estimated Time**: **8.5 hours**

---

## 🛡️ Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Breaking Changes** | Dual-write strategy, keep programType denormalized |
| **Performance Impact** | Indexes on all FKs, config caching, query optimization |
| **Data Migration Errors** | Dry-run on staging, rollback scripts, validation checks |
| **Complexity** | Sensible defaults, wizard UIs, comprehensive docs |
| **Event Ordering** | Correlation IDs, idempotency keys, event versioning |

---

## ✅ Success Criteria

### Code Quality
- [ ] TypeScript strict mode
- [ ] Unit tests ≥80% coverage
- [ ] Integration tests ≥60% coverage
- [ ] Zero linting errors
- [ ] Zero security vulnerabilities

### Functionality
- [ ] 3 master templates created
- [ ] Template → Program → Campaign workflow works
- [ ] Backward compatibility maintained
- [ ] Event enrichment functional
- [ ] L2I integration works

### Documentation
- [ ] API reference complete
- [ ] Runbooks published
- [ ] Migration guide ready
- [ ] Troubleshooting docs

### Deployment
- [ ] Service deploys successfully
- [ ] Health checks pass
- [ ] Monitoring configured
- [ ] Rollback tested

---

## 📚 Planning Documents Created

1. **PROGRAM_TEMPLATE_SYSTEM_DESIGN.md** (15,000 words)
   - Architecture overview
   - Data model specifications
   - Configuration schema system
   - Event contracts
   - Service architecture
   - Migration strategy
   - Risk analysis

2. **SWARM_3_AGENT_ORCHESTRATION.md** (25,000 words)
   - 30 agent specifications
   - Dependency graph (Mermaid diagram)
   - Execution batches
   - File/module structure
   - Quality gates
   - Communication protocol

3. **SWARM_3_EXECUTIVE_SUMMARY.md** (This document)
   - High-level overview
   - Approval checklist
   - Next steps

---

## 🔍 What Needs Your Approval

### 1. Architecture Design
- [ ] Template vs Program vs Campaign model makes sense
- [ ] Three master templates are correct (Mentorship, Language, Buddy)
- [ ] Beneficiary group model is appropriate
- [ ] Configuration inheritance strategy is clear

### 2. Database Schema
- [ ] New tables structure is sound
- [ ] Backward compatibility approach is acceptable
- [ ] Migration strategy is safe

### 3. Service Architecture
- [ ] New program-service is justified (vs. adding to existing service)
- [ ] API endpoints cover all use cases
- [ ] Integration approach with connectors is correct

### 4. Agent Breakdown
- [ ] 30 agents are appropriately specialized
- [ ] Dependencies are correctly mapped
- [ ] Parallel execution batches make sense
- [ ] Estimated timeline is reasonable (8.5 hours)

### 5. Quality & Testing
- [ ] Test coverage thresholds are appropriate (80% unit, 60% integration)
- [ ] Quality gates are sufficient
- [ ] Documentation deliverables are complete

---

## ❓ Questions for Clarification

Before proceeding, please confirm or provide guidance on:

1. **Scope Confirmation**: Does this cover everything you envisioned for SWARM 3, or are there additional features needed?

2. **Monetization Priority**: Should we integrate with L2I bundles immediately, or is this a future enhancement?

3. **UI Development**: Should SWARM 3 include admin UI pages for template/program/campaign management, or leave that for a future swarm?

4. **Naming Conventions**: Are the proposed table/field names (program_templates, programs, campaigns, beneficiary_groups) acceptable, or would you prefer different naming?

5. **Agent Execution**: Do you want all 30 agents to run automatically once approved, or should we execute batch-by-batch with your review between batches?

---

## 🚦 Next Steps (Upon Your Approval)

### Option A: Full Autonomous Execution
1. Approve this plan
2. I execute all 30 agents across 6 batches
3. You review final PR with complete implementation

### Option B: Batch-by-Batch Approval
1. Approve architecture design
2. I execute Batch 0 (Planning) - Agents 1-6
3. You review planning outputs
4. I execute Batch 1 (Schema) - Agents 7-12
5. You review migrations
6. Continue batch-by-batch...

### Option C: Hybrid Approach
1. Approve architecture design
2. I execute Batches 0-2 (Planning + Schema + Engine)
3. You review core implementation
4. I execute Batches 3-6 (Integration + Testing + Docs)
5. You review final PR

---

## 💬 Recommended Approach

I recommend **Option C (Hybrid)** because:
- You can validate the core architecture early (after Batch 2)
- Reduces risk of building on wrong foundation
- Allows course correction if needed
- Balances autonomy with oversight

---

## 📝 Approval Checklist

Please indicate your decision:

```
[ ] ✅ APPROVED - Proceed with full execution (Option A)
[ ] ✅ APPROVED - Proceed batch-by-batch (Option B)
[ ] ✅ APPROVED - Proceed with hybrid approach (Option C)
[ ] ⚠️ CHANGES REQUESTED - See feedback below
[ ] ❌ REJECTED - Needs major redesign
```

**Feedback / Changes Requested**:
```
[Your feedback here]
```

---

## 📞 Contact

If you have questions about any aspect of this plan:
- Review the detailed design: `/docs/PROGRAM_TEMPLATE_SYSTEM_DESIGN.md`
- Review the orchestration plan: `/docs/SWARM_3_AGENT_ORCHESTRATION.md`
- Ask me to clarify any specific section

---

**Status**: ⏸️ **PAUSED - Awaiting Your Approval**
**Next Action**: Your decision to proceed or request changes

---

**Document Version**: 1.0
**Last Updated**: 2025-11-22
**Prepared By**: Claude (SWARM 3 Orchestrator)
