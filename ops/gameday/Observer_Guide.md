# Disaster Recovery Gameday Observer Guide

**Version**: 1.0
**Last Updated**: 2025-11-15
**Audience**: Executives, Stakeholders, Auditors

---

## Overview

This guide is for **observers** participating in disaster recovery gameday drills. Observers witness the drill execution without actively performing technical tasks, ensuring independent verification and compliance attestation.

**Observer Roles**:
- **Executive Observers**: CTO, VP Engineering (business continuity oversight)
- **Compliance Officers**: Auditors, Security team (SOC2/ISO27001 attestation)
- **Customer Success**: Witness impact on customer-facing services
- **Learning Participants**: New engineers, cross-functional teams

---

## What to Expect

### Drill Duration
- **Partial Drills**: 1-1.5 hours
- **Full Regional Failover**: 1.5-2 hours
- **Failback Drills**: 2-3 hours

### Your Role as Observer
✅ **DO**:
- Observe and take notes
- Ask questions during checkpoints (not during active execution)
- Verify timing and evidence capture
- Provide feedback in post-drill debrief
- Sign attestation forms (if applicable)

❌ **DO NOT**:
- Interrupt during critical phases
- Execute commands or touch production systems
- Share drill details publicly before completion
- Leave before drill conclusion (if attestation required)

---

## Pre-Drill Orientation (15 Minutes Before Start)

### Join Communication Channels
- **Video Call**: [Zoom/Google Meet link provided in calendar invite]
- **Slack Channel**: #gameday-[date] (e.g., #gameday-mar19)
- **Grafana Dashboard**: http://localhost:3000/d/dr-metrics/disaster-recovery-metrics (optional)

### What You'll See
1. **Slack Updates**: Real-time status updates every 2-5 minutes
2. **Shared Screen**: Terminal output, runbook execution
3. **Grafana Dashboards**: Live metrics (replication lag, error rates, RTO/RPO)
4. **Evidence Capture**: Screenshots, timing logs

### Key Metrics to Watch
| Metric | Target | Meaning |
|--------|--------|---------|
| **RTO** | < 5 minutes | Time from outage to full recovery |
| **RPO** | < 10 seconds | Maximum data loss window |
| **Error Rate** | < 0.5% | Application errors during failover |
| **Replication Lag** | < 10 seconds | Database sync delay before failover |

---

## Drill Phases Overview

### Phase 1: Assessment (1 minute)
**What's Happening**:
- Team assesses source region health
- Checks replication status
- Captures pre-failover metrics

**What You'll See**:
- Database queries showing replication lag
- Health check commands
- Evidence directory creation

**Key Question to Ask**: "What is the current replication lag?" (Should be < 10 seconds)

---

### Phase 2: Database Promotion (1 minute)
**What's Happening**:
- PostgreSQL standby promoted to primary
- Database becomes writable in target region

**What You'll See**:
- `pg_ctl promote` command execution
- Verification query: `SELECT pg_is_in_recovery();` → Returns `f` (false = success)
- Test write operation

**Key Question to Ask**: "How do you verify the database is now primary?" (Look for `pg_is_in_recovery() = false`)

---

### Phase 3: ClickHouse Promotion (30 seconds)
**What's Happening**:
- Analytics database stops replicating from source
- ClickHouse becomes writable in target region

**What You'll See**:
- `SYSTEM STOP FETCHES` command
- Query to verify recent data exists
- Test insert operation

**Key Question to Ask**: "What happens to analytics queries during this phase?" (Brief spike in latency, then normal)

---

### Phase 4: NATS Promotion (30 seconds)
**What's Happening**:
- Message queue stream promoted to source
- Event publishing resumes in target region

**What You'll See**:
- NATS stream configuration update
- Test message publish
- Consumer reconfiguration

**Key Question to Ask**: "How do you ensure no messages are lost?" (Stream mirroring + sequence numbers)

---

### Phase 5: Application Services (1 minute)
**What's Happening**:
- Application pods scaled up in target region
- Health checks verify services are ready

**What You'll See**:
- Kubernetes `scale` commands
- Pod status checking (Running/Ready)
- Smoke test execution

**Key Question to Ask**: "How many application pods are running?" (Should match or exceed source region)

---

### Phase 6: DNS Cutover (1-2 minutes)
**What's Happening**:
- DNS records updated to point to target region
- Global traffic begins routing to new region

**What You'll See**:
- Route53 DNS update commands
- DNS propagation check script
- Cloudflare configuration update

**Key Question to Ask**: "How long does DNS propagation take?" (60-120 seconds with TTL=60)

**NOTE**: This is when customer impact may occur (brief connection errors during DNS propagation).

---

### Phase 7: Verification (1-2 minutes)
**What's Happening**:
- End-to-end health checks
- RTO/RPO calculation
- Evidence capture

**What You'll See**:
- Automated verification script running
- RTO/RPO results displayed
- Final health check report

**Key Question to Ask**: "Did we meet our RTO and RPO targets?" (Look for ✓ PASS indicators)

---

## What Success Looks Like

### Success Criteria
✅ **Technical Success**:
- RTO < 5 minutes (total time to recovery)
- RPO < 10 seconds (minimal data loss)
- All health checks passing
- No critical errors in logs

✅ **Operational Success**:
- Team followed runbook accurately
- Communication was clear and timely
- Evidence properly captured
- No confusion about next steps

✅ **Compliance Success**:
- All artifacts saved to evidence directory
- RTO/RPO calculations signed
- Attestation forms completed
- Audit trail intact

### Red Flags to Watch For
🚩 **Signs of Trouble**:
- RTO exceeding 10 minutes (> 2x target)
- Replication lag > 1 minute before failover
- Team uncertainty about next steps
- Multiple rollback/retry attempts
- Critical services not responding after 5 minutes

**If You Notice a Red Flag**: Quietly note it, don't interrupt. Bring it up in post-drill debrief.

---

## Questions to Ask During Checkpoints

Drills have **checkpoints** between phases where observers can ask questions. Here are good questions:

### Assessment Phase
- "What was the replication lag before failover started?"
- "How do you know the target region is healthy?"
- "What would cause you to abort the drill?"

### Database Phase
- "How do you prevent split-brain scenarios?" (Two databases thinking they're both primary)
- "What happens to in-flight transactions during promotion?"

### DNS Phase
- "What happens to users whose DNS hasn't updated yet?" (They hit old region, may see errors)
- "Can you demonstrate DNS propagation in different geographic regions?"

### Verification Phase
- "How do you validate data consistency?" (Row count comparisons)
- "What would you do if a health check failed?"

---

## Post-Drill Debrief Participation

### Debrief Format (30 minutes)
1. **Drill Commander Summary** (5 min): Overview, RTO/RPO results
2. **Team Feedback** (10 min): What worked, what didn't
3. **Observer Questions** (10 min): Your questions and observations
4. **Action Items** (5 min): Follow-up tasks assigned

### Good Observer Feedback
- "I noticed the team hesitated during step 3. Was the runbook unclear?"
- "The DNS propagation took 3 minutes. Is that normal?"
- "I didn't understand what 'replication lag' meant. Can we add definitions to the runbook?"

### What to Look For
- **Runbook Accuracy**: Did the team follow documented procedures?
- **Timing**: Were phases completed within target times?
- **Communication**: Was status communicated clearly?
- **Automation**: How much was manual vs automated?
- **Confidence**: Did the team seem confident or uncertain?

---

## Attestation Requirements (For Compliance Observers)

### SOC2 CC9.1 Attestation
If you're an auditor or compliance officer, you may need to sign an attestation form.

**What You're Attesting**:
- [ ] You witnessed the drill from start to finish
- [ ] RTO was measured and met/missed (specify)
- [ ] RPO was measured and met/missed (specify)
- [ ] Evidence was captured and is available for audit
- [ ] No evidence of data tampering or fabricated results
- [ ] Drill was conducted in good faith

**Attestation Form Location**: `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/[drill-date]/attestation-form.pdf`

**Signature Required**: Physical or digital (DocuSign)

---

## Understanding RTO/RPO

### RTO (Recovery Time Objective)
**Definition**: Maximum acceptable time to restore service after an outage.

**Our Target**: < 5 minutes (300 seconds)

**How It's Measured**:
1. **Start Time**: When outage simulation begins (or real outage detected)
2. **End Time**: When all health checks pass and service is fully restored
3. **RTO = End Time - Start Time**

**Example**:
- Outage simulated at 14:00:00
- Service restored at 14:04:32
- **RTO = 4 minutes 32 seconds** ✅ (< 5 minute target)

---

### RPO (Recovery Point Objective)
**Definition**: Maximum acceptable data loss (measured in time).

**Our Target**: < 10 seconds

**How It's Measured**:
1. **Primary Last Transaction**: Last committed transaction in source region
2. **Replica Last Transaction**: Last replayed transaction in target region
3. **RPO = Time difference between these transactions**

**Example**:
- Primary last transaction: 14:00:00.500
- Replica last transaction: 14:00:00.495
- **RPO = 5 milliseconds** ✅ (< 10 second target)

**Real-World Impact**:
- RPO = 5 seconds → ~5 seconds of customer activity lost
- For e-commerce: Could be 0-10 transactions lost
- For analytics: Negligible impact

---

## Common Questions from Observers

### Q: Is this a real outage or a drill?
**A**: It's a drill (simulated outage). However, the procedures are identical to a real outage.

### Q: Will customers be impacted?
**A**: Minimal impact. During DNS cutover (Phase 6), some customers may experience 30-60 seconds of degraded service as DNS propagates. We notify customers in advance for full drills.

### Q: What happens if the drill fails?
**A**: We have a rollback procedure to restore the original region. The drill is not considered "pass/fail" – it's a learning exercise. However, we do track RTO/RPO compliance.

### Q: How often do you run these drills?
**A**: Quarterly (4x per year). We also run component-level drills (database-only) monthly.

### Q: What's the most common failure mode?
**A**: DNS propagation delays and application connection pool issues. We've addressed most of these through automation.

### Q: Do you test failback (returning to primary)?
**A**: Yes, typically the day after a full failover drill. Failback is more complex due to data divergence.

### Q: How do you prevent accidental production outages during drills?
**A**: All automation scripts require `GAMEDAY_DRILL=true` environment variable. Without it, scripts refuse to run. We also use `-dry-run` mode for testing.

---

## Evidence You Can Review Post-Drill

**Available Immediately After Drill**:
- `/home/user/TEEI-CSR-Platform/ops/gameday/evidence/[drill-date]/`
  - `failover-summary.json` (RTO/RPO results)
  - `failover-timing.json` (each phase duration)
  - `verification-report.json` (health check results)
  - `postgres-metrics-pre-failover.json` (database state before)
  - `postgres-metrics-post-failover.json` (database state after)

**Screenshots**:
- Grafana dashboard snapshots
- Database replication status
- DNS propagation verification

**Logs**:
- Complete terminal output
- Application error logs (should be minimal)

---

## Glossary

**Failover**: Switching from primary to secondary region.
**Failback**: Returning to primary region after failover.
**Standby**: Read-only replica database that receives changes from primary.
**Promotion**: Converting a standby database to primary (writable).
**Replication Lag**: Time delay between primary and standby databases.
**Split-Brain**: Dangerous scenario where two databases both think they're primary.
**DNS Propagation**: Time for DNS changes to reach all internet servers globally.
**Health Check**: Automated test to verify a service is working correctly.

---

## Contact Information

**During Drill**:
- Drill Commander: @gameday-lead (Slack)
- Questions: Post in #gameday-[date] Slack channel

**Post-Drill**:
- Drill Lead: dr-gameday-lead@company.com
- Compliance Questions: compliance-team@company.com
- Technical Questions: sre-team@company.com

---

## Thank You!

Thank you for participating as an observer. Your independent verification is critical for:
- SOC2/ISO27001 compliance
- Business continuity assurance
- Team accountability
- Continuous improvement

Your feedback helps us refine our DR procedures and ensure we can handle real outages with confidence.

**Next Steps**:
- [ ] Complete observer feedback survey (link sent post-drill)
- [ ] Sign attestation form (if applicable)
- [ ] Review post-mortem document when available

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | dr-gameday-lead | Initial creation |

**Next Review**: Quarterly
