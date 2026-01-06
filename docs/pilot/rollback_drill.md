# Rollback Drill Execution Log

Monthly rollback drills to ensure team preparedness and tooling reliability.

## Purpose

Regular rollback drills help us:

- **Practice rollback procedures** - Ensure team knows how to rollback
- **Test automation** - Verify rollback scripts work as expected
- **Measure recovery time** - Track time to complete rollback
- **Identify gaps** - Find missing documentation or broken processes
- **Build confidence** - Reduce stress during real incidents

## Drill Schedule

| Month | Date | Lead | Status | Notes |
|-------|------|------|--------|-------|
| Nov 2025 | 2025-11-20 | Alice Chen | Planned | First drill |
| Dec 2025 | 2025-12-18 | Bob Martinez | Planned | |
| Jan 2026 | 2026-01-15 | Charlie Kim | Planned | |

**Frequency**: Monthly (3rd Wednesday of each month)

**Duration**: 30 minutes

**Time**: 10:00 AM UTC (low traffic period)

## Drill Procedure

### Phase 1: Preparation (5 minutes)

1. **Announce drill** in #engineering:
   ```
   🔄 ROLLBACK DRILL - This is a drill

   Starting rollback drill at 10:00 AM UTC.
   Service: staging api-gateway
   This is a controlled drill on staging environment.
   No production impact expected.
   ```

2. **Verify pre-conditions**:
   - [ ] Staging environment healthy
   - [ ] All team members notified
   - [ ] Rollback scripts tested recently
   - [ ] Timer ready to measure duration

### Phase 2: Simulate Deployment Issue (5 minutes)

**Option A: Deploy bad image**

```bash
# Deploy an intentionally broken image
kubectl set image deployment/api-gateway -n teei-csr api-gateway=nginx:alpine

# This will cause health checks to fail
```

**Option B: Introduce config error**

```bash
# Update ConfigMap with invalid config
kubectl edit configmap api-gateway-config -n teei-csr
# Change DATABASE_URL to invalid value

# Restart deployment
kubectl rollout restart deployment/api-gateway -n teei-csr
```

**Option C: Scale to zero then back**

```bash
# Simulate complete outage
kubectl scale deployment/api-gateway -n teei-csr --replicas=0

# Wait 1 minute to simulate detection time
sleep 60
```

### Phase 3: Detection & Alert (2 minutes)

1. **Trigger synthetic checks** (if not auto-triggered):
   ```bash
   ./scripts/synthetics/uptime-probe.sh
   ```

2. **Verify alerts fire**:
   - [ ] PagerDuty alert received
   - [ ] Discord notification posted
   - [ ] Synthetic monitoring failed

3. **Record detection time**:
   - Time from deployment to alert: `____` minutes

### Phase 4: Execute Rollback (10 minutes)

1. **Start timer**

2. **Run automated rollback**:
   ```bash
   # Using GitHub Actions
   gh workflow run rollback.yml \
     --ref main \
     -f service=api-gateway \
     -f environment=staging \
     -f reason="Rollback drill - testing procedures"

   # OR using script directly
   ./scripts/rollback/rollback-deployment.sh api-gateway
   ```

3. **Monitor rollback progress**:
   ```bash
   kubectl rollout status deployment/api-gateway -n teei-csr --watch
   ```

4. **Record rollback duration**:
   - Time to complete rollback: `____` minutes

### Phase 5: Verification (5 minutes)

1. **Run verification script**:
   ```bash
   ./scripts/rollback/verify-rollback.sh api-gateway
   ```

2. **Run smoke tests**:
   ```bash
   pnpm test:smoke
   ```

3. **Check metrics**:
   - [ ] Error rate <0.5%
   - [ ] Latency P95 <500ms
   - [ ] All health checks passing

4. **Record verification time**:
   - Time to verify rollback: `____` minutes

### Phase 6: Debrief (3 minutes)

1. **Calculate total time**:
   - Detection: `____` minutes
   - Rollback: `____` minutes
   - Verification: `____` minutes
   - **Total**: `____` minutes

2. **What went well**:
   - [ ] Automation worked
   - [ ] Team responded quickly
   - [ ] Clear communication
   - [ ] Documentation was helpful

3. **What needs improvement**:
   - [ ] Gaps in documentation
   - [ ] Automation failures
   - [ ] Communication issues
   - [ ] Missing tools/access

4. **Action items**:
   - [ ] Update runbooks
   - [ ] Fix automation bugs
   - [ ] Add missing monitors
   - [ ] Train team members

## Drill History

### Drill #1: 2025-11-20 (Planned)

**Participants**:
- Alice Chen (Lead)
- Bob Martinez
- Charlie Kim
- Dana Patel

**Scenario**: Deploy broken image to api-gateway

**Timeline**:
- 10:00 - Drill announced
- 10:05 - Bad deployment initiated
- 10:07 - Alert fired (2 min detection)
- 10:08 - Rollback started
- 10:13 - Rollback completed (5 min rollback)
- 10:16 - Verification complete (3 min verification)
- 10:20 - Debrief

**Total time**: TBD minutes

**Results**:
- ✅ Automation worked
- ✅ All checks passed
- ⚠️ Documentation gap: [issue #xxx]
- ❌ Verification script failed: [issue #yyy]

**Action items**:
- [ ] Update rollback runbook with new findings
- [ ] Fix verification script bug
- [ ] Add missing alert for ConfigMap changes

---

### Drill #2: 2025-12-18 (Planned)

**Participants**: TBD

**Scenario**: TBD

**Results**: TBD

---

## Drill Variations

Rotate through different scenarios monthly:

### Month 1: Simple Rollback
- Deploy bad image
- Immediate rollback to previous version
- Tests basic happy path

### Month 2: Config Rollback
- Bad ConfigMap change
- Rollback ConfigMap + restart pods
- Tests config management

### Month 3: Multi-Service Rollback
- Bad deployment affects multiple services
- Rollback all affected services
- Tests coordination

### Month 4: Database Migration Rollback
- Simulate bad database migration
- Rollback both code and database
- Tests database procedures

### Month 5: Partial Rollback
- Rollback to specific revision (not previous)
- Tests revision selection

### Month 6: Manual Rollback
- Automation fails, manual rollback required
- Tests fallback procedures

## Success Criteria

Drill is successful if:

- ✅ Detection time <5 minutes
- ✅ Rollback time <10 minutes
- ✅ Verification time <5 minutes
- ✅ Total time <20 minutes
- ✅ All automation worked
- ✅ No confusion about procedures
- ✅ Clear communication throughout

## Metrics Tracking

Track these metrics over time:

| Drill | Detection (min) | Rollback (min) | Verification (min) | Total (min) | Success |
|-------|----------------|----------------|-------------------|-------------|---------|
| #1    | TBD            | TBD            | TBD               | TBD         | TBD     |
| #2    | -              | -              | -                 | -           | -       |
| #3    | -              | -              | -                 | -           | -       |

**Goal**: Maintain <20 minute total time, improve over time

## Drill Checklist

Before each drill:

- [ ] Schedule drill with team (1 week notice)
- [ ] Verify staging environment is stable
- [ ] Update rollback scripts if needed
- [ ] Prepare drill announcement
- [ ] Set up timer/stopwatch
- [ ] Have incident template ready

During drill:

- [ ] Announce start in #engineering
- [ ] Record all timestamps
- [ ] Follow drill procedure exactly
- [ ] Take notes on issues encountered
- [ ] Ask team for feedback

After drill:

- [ ] Document results in this file
- [ ] File tickets for action items
- [ ] Update runbooks with learnings
- [ ] Share summary with team
- [ ] Schedule next drill

## Drill Template

Use this template for each drill:

```markdown
### Drill #X: YYYY-MM-DD

**Participants**:
- Name (Role)

**Scenario**: [What we simulated]

**Timeline**:
- HH:MM - [Event]
- HH:MM - [Event]

**Total time**: X minutes

**Results**:
- ✅ [What worked]
- ⚠️ [What was concerning]
- ❌ [What failed]

**Action items**:
- [ ] [Task] (#issue)
```

## Related Documentation

- [Deployment Rollback Runbook](./runbooks/deployment_rollback.md)
- [Incident Response Runbook](./runbooks/incident_response.md)
- [On-Call Guide](./oncall.md)
- [Production Deploy Guide](../PROD_DEPLOY_RUNBOOK.md)

## Tips for Success

1. **Treat drills seriously** - Practice like it's real
2. **Rotate drill lead** - Everyone should practice
3. **Vary scenarios** - Don't do the same drill every time
4. **Time everything** - Track and improve speed
5. **Document learnings** - Update runbooks immediately
6. **Fix issues found** - Don't ignore drill failures
7. **Make it safe** - Use staging, never production
8. **Debrief thoroughly** - Discuss what happened
9. **Share results** - Let team learn from drill
10. **Schedule regular drills** - Consistency matters
