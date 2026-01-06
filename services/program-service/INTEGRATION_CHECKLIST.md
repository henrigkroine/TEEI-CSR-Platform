# Program Template System Integration Checklist

**Agent 30: final-integration-validator**

This checklist ensures all components of the Program Template System are properly integrated and tested before production deployment.

## Pre-Deployment Validation

### 1. Database Schema ✓

- [ ] **Batch 1 Complete**: All 5 tables + 1 updated table deployed
  - [ ] `program_templates` table exists
  - [ ] `programs` table exists
  - [ ] `program_campaigns` table exists
  - [ ] `beneficiary_groups` table exists
  - [ ] `l2i_program_allocations` table exists
  - [ ] `program_enrollments` updated with 6 new columns
- [ ] All foreign key constraints are valid
- [ ] Indexes created on performance-critical columns
- [ ] Migration script executed successfully (no rollback needed)

**Validation Command**:
```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'program_templates',
    'programs',
    'program_campaigns',
    'beneficiary_groups',
    'l2i_program_allocations'
  );

-- Check program_enrollments has new columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'program_enrollments'
  AND column_name IN (
    'program_id',
    'campaign_id',
    'beneficiary_group_id',
    'source_system',
    'source_id',
    'enrollment_metadata'
  );
```

### 2. Service Deployment ✓

**program-service (Port 3021)**:
- [ ] Service starts without errors
- [ ] Health check returns 200: `GET /health`
- [ ] OpenAPI spec accessible
- [ ] All routes respond (templates, programs, campaigns)
- [ ] Environment variables configured:
  - [ ] `DATABASE_URL`
  - [ ] `PORT=3021`
  - [ ] `LOG_LEVEL`

**unified-profile (Updated)**:
- [ ] Service restarts successfully with new subscriber logic
- [ ] Program lookup function operational
- [ ] Event subscribers processing correctly
- [ ] No crashes or memory leaks

**Validation Command**:
```bash
# Check program-service
curl http://localhost:3021/health

# Check templates endpoint
curl http://localhost:3021/templates

# Check unified-profile logs
journalctl -u unified-profile -n 100 | grep "Event subscribers initialized"
```

### 3. Template & Program Creation ✓

- [ ] **Batch 2 Complete**: Core engine operational
  - [ ] Templates can be created via API
  - [ ] Templates can be published (draft → active)
  - [ ] Programs can be instantiated from templates
  - [ ] Config overrides validated against template schema
  - [ ] Program status can be updated
- [ ] Template versioning works (create new version)
- [ ] Template deprecation workflow functional

**Validation Command**:
```bash
# Create template
TEMPLATE_ID=$(curl -X POST http://localhost:3021/templates \
  -H "Content-Type: application/json" \
  -d '{
    "templateKey": "test-template",
    "name": "Test Template",
    "category": "mentorship",
    "defaultConfig": {},
    "configSchema": {}
  }' | jq -r '.id')

# Publish template
curl -X POST http://localhost:3021/templates/$TEMPLATE_ID/publish \
  -H "Content-Type: application/json" \
  -d '{"deprecatePrevious": false}'

# Create program
curl -X POST http://localhost:3021/programs \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "'$TEMPLATE_ID'",
    "name": "Test Program"
  }'
```

### 4. Integration & Connectors ✓

- [ ] **Batch 3 Complete**: Connectors updated with program context
  - [ ] Kintell sessions create enrollments with programId
  - [ ] Buddy matches create enrollments with programId
  - [ ] Upskilling courses create enrollments with programId
- [ ] Program lookup function works correctly
- [ ] Dual-write pattern validated (programType + programId)
- [ ] Source tracking populated (sourceSystem, sourceId)
- [ ] Event contracts include program context fields

**Validation Command**:
```sql
-- Trigger Kintell session event and check enrollment
-- (Run after event is published)
SELECT
  pe.program_type,
  pe.program_id,
  pe.campaign_id,
  pe.source_system,
  pe.source_id
FROM program_enrollments pe
WHERE pe.user_id = 'test-user-id'
  AND pe.created_at > NOW() - INTERVAL '5 minutes';

-- Should see:
-- program_type: 'language' or 'mentorship'
-- program_id: NOT NULL
-- source_system: 'kintell'
-- source_id: external session ID
```

### 5. Testing & Validation ✓

- [ ] **Batch 4 Complete**: All test suites passing
  - [ ] Unit tests pass: `pnpm test services/program-service`
  - [ ] Integration tests pass
  - [ ] E2E enrollment flow tests pass
  - [ ] Config resolver tests pass
- [ ] Test coverage ≥ 80% for new code
- [ ] No failing tests in CI/CD pipeline

**Validation Command**:
```bash
# Run unit tests
pnpm test services/program-service/src/__tests__/instantiator.test.ts
pnpm test services/program-service/src/__tests__/config-resolver.test.ts

# Run integration tests
pnpm test services/program-service/src/__tests__/program-service.integration.test.ts

# Run E2E tests
pnpm test services/unified-profile/src/__tests__/enrollment-flow.e2e.test.ts

# Check coverage
pnpm test:coverage
```

### 6. Documentation & Migration ✓

- [ ] **Batch 5 Complete**: Documentation and runbooks ready
  - [ ] OpenAPI spec generated: `services/program-service/openapi.yaml`
  - [ ] Migration script tested: `migrations/001_backfill_programs.ts`
  - [ ] Operational runbook published: `docs/runbooks/PROGRAM_TEMPLATE_SYSTEM.md`
  - [ ] Integration checklist completed (this file)
- [ ] API documentation accessible
- [ ] Runbook reviewed by ops team
- [ ] Migration script tested in staging

**Validation Command**:
```bash
# Validate OpenAPI spec
npx swagger-cli validate services/program-service/openapi.yaml

# Test migration script (dry-run)
DRY_RUN=true pnpm tsx services/program-service/migrations/001_backfill_programs.ts

# Check documentation exists
ls -l docs/runbooks/PROGRAM_TEMPLATE_SYSTEM.md
```

## Production Deployment Steps

### Phase 1: Database Migration (0% traffic impact)

1. [ ] Back up production database
2. [ ] Run migration script in dry-run mode
3. [ ] Review migration output
4. [ ] Execute migration: `DRY_RUN=false pnpm tsx migrations/001_backfill_programs.ts`
5. [ ] Validate data integrity
6. [ ] Monitor for errors

**Rollback Plan**: Restore from backup if migration fails

### Phase 2: Service Deployment (0% traffic impact)

1. [ ] Deploy program-service to production
2. [ ] Verify health check: `curl https://api.teei.io/program-service/health`
3. [ ] Create initial templates via API
4. [ ] Publish templates
5. [ ] Create programs for existing beneficiary groups
6. [ ] Monitor logs and metrics

**Rollback Plan**: Stop program-service if issues detected (does not affect enrollments)

### Phase 3: Connector Update (Gradual rollout)

1. [ ] Deploy unified-profile with new subscriber logic
2. [ ] Monitor enrollment creation rate
3. [ ] Validate dual-write pattern working
4. [ ] Check for program lookup errors
5. [ ] Monitor for 1 hour before full rollout

**Rollback Plan**: Redeploy previous version of unified-profile

### Phase 4: Validation & Monitoring (7 days)

1. [ ] Monitor key metrics:
   - [ ] Enrollment creation rate stable
   - [ ] Program lookup success rate > 95%
   - [ ] No increase in errors
   - [ ] Dual-write consistency 100%
2. [ ] Review logs daily for anomalies
3. [ ] Run data integrity checks weekly

## Post-Deployment Validation

### Week 1 Checks

**Day 1**:
- [ ] All services healthy
- [ ] No critical errors in logs
- [ ] Enrollment creation working

**Day 3**:
- [ ] Run data integrity check
- [ ] Verify dual-write consistency
- [ ] Check program lookup success rate

**Day 7**:
- [ ] Performance metrics within acceptable range
- [ ] No user-reported issues
- [ ] Test template versioning workflow

### Month 1 Checks

- [ ] Review program enrollment distribution
- [ ] Validate SROI/VIS rollups by program
- [ ] Test campaign creation flow
- [ ] Performance optimization if needed

## Success Criteria

All of the following must be true:

1. ✓ **Schema**: All tables and columns exist, constraints valid
2. ✓ **Services**: program-service and unified-profile running without errors
3. ✓ **Templates**: At least 3 active templates (mentorship, language, buddy)
4. ✓ **Programs**: At least 3 active programs linked to beneficiary groups
5. ✓ **Enrollments**: New enrollments have programId populated
6. ✓ **Dual-Write**: programType matches programs.program_type (100% consistency)
7. ✓ **Tests**: All unit, integration, and E2E tests passing
8. ✓ **Documentation**: OpenAPI spec, runbooks, and migration docs complete
9. ✓ **Monitoring**: Key metrics tracked, alerts configured
10. ✓ **Backward Compatibility**: Existing queries using programType still work

## Known Limitations & Future Work

### Current Limitations

1. **Campaign API**: Placeholder implementation (full CRUD in future release)
2. **Program Lookup**: Simple algorithm (company→campaign lookup only)
3. **Config Validation**: Basic Zod validation (no UI for schema builder)
4. **Event Enrichment**: Program context added to events, but not all consumers updated

### Future Enhancements (Not in Scope)

- Advanced matching algorithms (demographic-based program selection)
- UI for template builder with visual config editor
- Real-time program recommendation engine
- Multi-campaign enrollment support
- Program analytics dashboard

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | | | |
| Product Owner | | | |
| DevOps Lead | | | |
| QA Lead | | | |

## Appendix: Quick Reference

### Service URLs (Production)

- program-service: `https://api.teei.io/program-service`
- unified-profile: `https://api.teei.io/unified-profile`

### Database Connection

```bash
# Production (read-only)
psql $DATABASE_URL_READONLY

# Check program template system tables
\dt program*
\dt beneficiary*
```

### Emergency Contacts

- On-Call Engineer: #eng-oncall (Slack)
- DevOps Team: #eng-devops (Slack)
- Product Team: #product (Slack)

---

**Document Version**: 1.0
**Last Updated**: 2024-11-22
**Next Review**: 2024-12-22
