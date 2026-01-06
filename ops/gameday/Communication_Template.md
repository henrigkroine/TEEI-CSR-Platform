# Disaster Recovery Gameday Communication Templates

**Version**: 1.0
**Last Updated**: 2025-11-15
**Owner**: dr-gameday-lead

---

## Overview

This document provides pre-written communication templates for disaster recovery gameday drills. Customize these templates for each drill and send at the appropriate times.

---

## Template 1: Initial Announcement (T-7 Days)

### Email Subject
```
[ACTION REQUIRED] DR Gameday Drill Scheduled - [Date]
```

### Email Body
```
Hi Team,

This is to notify you of an upcoming Disaster Recovery (DR) gameday drill:

📅 **Date**: [Day], [Month] [DD], [YYYY]
⏰ **Time**: [HH:MM] - [HH:MM] UTC ([Local Time])
🌍 **Scope**: [Full Regional Failover / Partial / Database Only]
👥 **Participants**: [List of required participants]
📊 **Expected Impact**: [None / Minimal / Moderate]

## What is a DR Gameday Drill?

A DR gameday drill is a simulated disaster scenario where we practice failing over our production systems to a secondary region. This ensures we can meet our RTO (Recovery Time Objective) of < 5 minutes and RPO (Recovery Point Objective) of < 10 seconds in case of a real regional outage.

## Your Action Items

### Required Participants (Engineering Team):
- [ ] Review runbook procedures: [Link to runbooks]
- [ ] Confirm availability on [Date] at [Time]
- [ ] Join pre-drill walkthrough on [Date] at [Time]
- [ ] Review Observer Guide if you're not an active participant

### All Staff:
- [ ] Be aware of scheduled maintenance window
- [ ] Report any unexpected issues immediately to #incident-response

## What to Expect

**For Internal Users**:
- Brief (30-60 second) disruption during DNS cutover
- Some analytics dashboards may show slight delay
- All services will remain available (target: zero downtime)

**For External Customers** (if applicable):
- [We will notify customers separately / No customer notification planned]
- Services remain available throughout drill
- Brief DNS propagation delay may affect some users (< 2 minutes)

## Runbooks and Resources

- **Master Runbook**: /docs/runbooks/Runbook_Region_Failover.md
- **Drill Plan**: /ops/gameday/Gameday_Plan_2025Q1.md
- **Observer Guide**: /ops/gameday/Observer_Guide.md

## Questions?

Please reach out in #sre-ops or email dr-gameday-lead@company.com

Thank you for your cooperation!

**[Your Name]**
DR Gameday Lead
```

### Slack Announcement (T-7 Days)
```
📢 **UPCOMING DR GAMEDAY DRILL**

:calendar: **When**: [Day], [Month] [DD] at [HH:MM UTC]
:earth_americas: **Scope**: [Full/Partial] Regional Failover
:stopwatch: **Duration**: ~[X] hours
:dart: **Goal**: Validate RTO < 5 min, RPO < 10 sec

**Required Participants** (please confirm availability):
• @sre-team
• @database-team
• @platform-team
• [Other teams]

**Observers Welcome**:
• @executives
• @compliance
• Anyone interested in learning!

**Pre-Drill Walkthrough**: [Date] at [Time] - Calendar invite sent

**Resources**:
• Runbook: [Link]
• Drill Plan: [Link]
• Observer Guide: [Link]

**Questions**: Drop them here or DM @gameday-lead

React with :white_check_mark: to confirm you're available!
```

---

## Template 2: 24-Hour Reminder

### Email Subject
```
[REMINDER] DR Gameday Drill Tomorrow - Final Checklist
```

### Email Body
```
Hi Team,

Reminder: Our DR gameday drill is scheduled for **tomorrow**:

📅 **Date**: [Day], [Month] [DD], [YYYY]
⏰ **Time**: [HH:MM] - [HH:MM] UTC ([Local Time])
🎯 **Objective**: Regional failover (US → EU)

## Final Checklist

### For Active Participants:
- [ ] Review your assigned role: [Link to Drill_Checklist.md]
- [ ] Test access to Kubernetes contexts (us-east-1 and eu-central-1)
- [ ] Join #gameday-[month][day] Slack channel (created today)
- [ ] Calendar reminder set for [Date] at [Time]
- [ ] Video call link bookmarked: [Zoom/Meet Link]

### For Observers:
- [ ] Review Observer Guide: [Link]
- [ ] Join #gameday-[month][day] channel
- [ ] Optional: Set up Grafana dashboard access for live metrics

## Pre-Drill Go/No-Go

We'll make a final go/no-go decision **1 hour before** the drill (at [HH:MM UTC]). Drill may be postponed if:
- Active production incident in progress
- AWS region health issues
- Key personnel unavailable

## What We'll Test

1. ✅ PostgreSQL failover (target: < 1 min)
2. ✅ ClickHouse promotion (target: < 30 sec)
3. ✅ NATS JetStream mirror promotion (target: < 30 sec)
4. ✅ Application service scaling (target: < 1 min)
5. ✅ DNS cutover (target: < 1 min)
6. ✅ Full system verification (target: < 1 min)

**Total Target RTO**: < 5 minutes

## Expected Impact

**Internal**: Brief (30-60 sec) connectivity blip during DNS cutover
**External Customers**: [None / Minimal - covered by maintenance window]

We've notified customers via status page: [Link]

## Questions or Concerns?

Reply to this email or post in #gameday-[month][day]

See you tomorrow!

**[Your Name]**
DR Gameday Lead
```

### Slack Reminder (T-24 Hours)
```
:rotating_light: **DR GAMEDAY DRILL TOMORROW**

:clock3: **In 24 hours**: [Day] at [HH:MM UTC]

**Final Checklist**:
:white_check_mark: Test your kubectl access (both regions)
:white_check_mark: Join #gameday-[month][day]
:white_check_mark: Review your role in Drill_Checklist.md
:white_check_mark: Add video call to calendar: [Link]

**Assigned Roles**:
:hammer_and_wrench: **Drill Commander**: @gameday-lead
:file_cabinet: **Database Lead**: @db-lead
:bar_chart: **ClickHouse Lead**: @analytics-lead
:email: **NATS Lead**: @platform-lead
:globe_with_meridians: **Network Lead**: @network-lead
:shield: **Evidence Lead**: @compliance-lead
:eyes: **Executive Observer**: @cto

**Go/No-Go Decision**: Tomorrow at [HH:MM UTC] (1 hour before drill)

**Abort Criteria**:
• Active production incident
• AWS health issues
• Key personnel unavailable

React with :crossed_fingers: if you're ready!
```

---

## Template 3: 1-Hour Pre-Drill (Go/No-Go)

### Slack Message (T-1 Hour)
```
:warning: **DR GAMEDAY DRILL - GO/NO-GO DECISION**

**Drill scheduled in 1 hour** ([HH:MM UTC])

**Pre-Flight Checks**:
:white_check_mark: No active production incidents
:white_check_mark: AWS us-east-1 region healthy
:white_check_mark: AWS eu-central-1 region healthy
:white_check_mark: All participants confirmed present
:white_check_mark: Monitoring systems operational
:white_check_mark: Backup verification passed

**Current Metrics**:
• Postgres replication lag: [X] seconds (target: < 30s)
• ClickHouse replication queue: [X] items (target: < 1000)
• NATS mirror lag: [X] messages (target: < 100)

**Decision**: :green_circle: **GO FOR DRILL**

**Next Steps**:
1. All participants join video call: [Link]
2. Join #gameday-[month][day] for real-time updates
3. Drill Commander will initiate at [HH:MM] sharp

**Abort Code**: If we need to abort mid-drill, Drill Commander will post "🛑 ABORT DRILL" in this channel.

See you in 60 minutes! :rocket:
```

### Alternative: NO-GO Message
```
:octagonal_sign: **DR GAMEDAY DRILL - POSTPONED**

**Original Time**: [HH:MM UTC] today
**New Time**: [TBD / Next Week / Date]

**Reason for Postponement**:
[X] Active production incident in progress
[  ] AWS region health issues
[  ] Key personnel unavailable
[  ] Other: [Explanation]

We'll reschedule once conditions are favorable. Will send new date within 24 hours.

Thank you for your understanding.
```

---

## Template 4: Drill Kickoff (T-0)

### Slack Message (Drill Start)
```
:alarm_clock: **DR GAMEDAY DRILL - STARTING NOW**

**Drill Commander**: @gameday-lead
**Start Time**: [HH:MM:SS UTC]
**Target RTO**: < 5 minutes

**Real-Time Updates**:
I'll post status every 2-5 minutes in this channel.

**For Participants**:
• Mute notifications from other channels
• Focus on runbook steps
• Report any blockers immediately

**For Observers**:
• Watch and learn!
• Hold questions until checkpoints
• Do not interrupt during critical phases

**Evidence Directory**: `/ops/gameday/evidence/failover-[timestamp]/`

Let's do this! :muscle:

---

**[Phase 1/7] Assessment**
:hourglass_flowing_sand: In progress...
```

### Status Update Template (Every Phase)
```
**[Phase X/7] [Phase Name]** :white_check_mark: COMPLETE
**Duration**: [XX] seconds (target: [YY] seconds)
**Status**: [PASS / EXCEEDED TARGET]

**Key Results**:
• [Metric 1]: [Value]
• [Metric 2]: [Value]

**Next**: [Phase X+1/7] [Next Phase Name]
:hourglass_flowing_sand: Starting now...
```

---

## Template 5: Drill Completion

### Slack Message (Drill Complete)
```
:tada: **DR GAMEDAY DRILL - COMPLETE**

**End Time**: [HH:MM:SS UTC]
**Total Duration**: [X] minutes [Y] seconds

**RESULTS**:

:dart: **RTO**: [XXX] seconds (Target: < 300s) - [✅ PASS / ❌ FAIL]
:dart: **RPO**: [XX] seconds (Target: < 10s) - [✅ PASS / ❌ FAIL]

**Phase Breakdown**:
1. Assessment: [X]s (target: 60s) - [✅/❌]
2. Database: [X]s (target: 60s) - [✅/❌]
3. ClickHouse: [X]s (target: 30s) - [✅/❌]
4. NATS: [X]s (target: 30s) - [✅/❌]
5. App Services: [X]s (target: 60s) - [✅/❌]
6. DNS Cutover: [X]s (target: 60s) - [✅/❌]
7. Verification: [X]s (target: 60s) - [✅/❌]

**Health Checks**: [XX/XX] passed

**Overall Status**: [✅ SUCCESS / ⚠️ PARTIAL SUCCESS / ❌ FAILED]

**Next Steps**:
• Quick debrief in 15 minutes (same video call)
• Evidence bundle uploaded to SOC2 repository
• Post-mortem document by tomorrow

**Thank You** to all participants! :clap:

Evidence location: `/ops/gameday/evidence/failover-[timestamp]/`
```

### Email (Post-Drill Summary)
```
Subject: DR Gameday Drill Results - [Date]

Hi Team,

We successfully completed our DR gameday drill today. Here are the results:

## Executive Summary

**Drill Type**: Full Regional Failover (US → EU)
**Duration**: [X] minutes [Y] seconds
**Outcome**: [SUCCESS / PARTIAL SUCCESS / REQUIRES IMPROVEMENT]

## Key Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| RTO | < 5 minutes | [X]:[YY] | [✅ PASS / ❌ FAIL] |
| RPO | < 10 seconds | [X] seconds | [✅ PASS / ❌ FAIL] |
| Error Rate | < 0.5% | [X]% | [✅ PASS / ❌ FAIL] |
| Health Checks | 100% | [XX]% | [✅ PASS / ❌ FAIL] |

## What Went Well

- [Item 1]
- [Item 2]
- [Item 3]

## Areas for Improvement

- [Issue 1]
- [Issue 2]
- [Issue 3]

## Action Items

| Item | Owner | Due Date |
|------|-------|----------|
| Update runbook step X.Y | [Name] | [Date] |
| Improve automation script | [Name] | [Date] |
| Additional training for team | [Name] | [Date] |

## Compliance Status

✅ SOC2 CC9.1 Compliance: [PASS / FAIL]
✅ Evidence Bundle: Complete and signed
✅ RTO/RPO Targets: [Met / Not Met]

**Evidence Location**: `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/failover-[timestamp]/`

## Next Drill

**Date**: [Next Quarterly Drill Date]
**Type**: [Full / Partial / Failback]

## Post-Mortem

Detailed post-mortem document will be shared tomorrow. Post-mortem review meeting scheduled for [Date] at [Time].

Thank you all for your participation and professionalism!

**[Your Name]**
DR Gameday Lead

---

**Attachments**:
- RTO/RPO Calculation Report (PDF)
- Evidence Bundle Summary (JSON)
- Grafana Dashboard Screenshots
```

---

## Template 6: Customer Communication (Optional)

### Status Page Update (T-7 Days)
```
Title: Scheduled Maintenance - DR Testing

Scheduled For: [Date] at [HH:MM UTC]
Duration: Approximately [X] hours
Impact: Minimal

Description:

We will be conducting a scheduled disaster recovery test to ensure business continuity and validate our regional failover procedures.

**What to Expect**:
• Services will remain available throughout the maintenance
• You may experience brief (30-60 second) connectivity delays during DNS updates
• All data will be preserved with no loss

**What We're Testing**:
• Regional failover capabilities
• Data replication integrity
• Recovery time objectives (< 5 minutes)

This testing is part of our ongoing commitment to platform reliability and SOC2 compliance.

**Questions?** Contact support@company.com

We appreciate your understanding!
```

### Status Page Update (During Drill)
```
Title: [IN PROGRESS] Scheduled Maintenance - DR Testing

Started: [HH:MM UTC]
Expected Completion: [HH:MM UTC]
Current Status: On Track

Updates:
[HH:MM] - Maintenance started as scheduled
[HH:MM] - Database failover complete
[HH:MM] - DNS cutover in progress (brief connectivity delay expected)
[HH:MM] - All systems operational, final verification in progress
```

### Status Page Update (Complete)
```
Title: [RESOLVED] Scheduled Maintenance - DR Testing

Completed: [HH:MM UTC]
Outcome: Successful

All systems are fully operational. Our disaster recovery test completed successfully, validating our ability to recover from regional outages in under 5 minutes.

Thank you for your patience!
```

---

## Template 7: Abort Drill Communication

### Slack (Abort Notification)
```
:octagonal_sign: **ABORT DRILL - ROLLBACK IN PROGRESS**

**Abort Time**: [HH:MM:SS UTC]
**Reason**: [Production incident / Critical service failure / Executive decision]

**Current Status**:
• All participants: STOP current actions
• Initiating rollback to pre-drill state
• DO NOT execute any further runbook steps

**Rollback Lead**: @[name]
**Expected Rollback Duration**: [X] minutes

**Next Update**: In 5 minutes

Remain in video call and #gameday channel.
```

### Email (Post-Abort)
```
Subject: DR Gameday Drill Aborted - [Date]

Hi Team,

Our DR gameday drill scheduled for today was **aborted** at [HH:MM UTC] due to [reason].

## What Happened

[Brief explanation of why drill was aborted]

## Current Status

✅ All systems restored to pre-drill state
✅ Normal operations resumed
✅ No customer impact

## Next Steps

- Root cause analysis of abort reason: [Date]
- Reschedule drill: [TBD / Proposed Date]
- Review abort criteria and procedures

## Lessons Learned

[Any immediate learnings from the abort]

We'll share a detailed post-mortem by [Date].

Thank you for your quick response during the abort procedure.

**[Your Name]**
DR Gameday Lead
```

---

## Template 8: Post-Mortem Meeting Invite

### Calendar Invite
```
Subject: DR Gameday Post-Mortem - [Date]

Date: [Date]
Time: [HH:MM - HH:MM UTC]
Duration: 1 hour
Location: [Video Call Link]

Agenda:
1. Drill Summary (10 min)
   - RTO/RPO results
   - Success criteria review

2. What Went Well (15 min)
   - Wins and successes
   - Effective procedures

3. What Didn't Go Well (15 min)
   - Issues and delays
   - Runbook gaps

4. Action Items (15 min)
   - Assign owners
   - Set due dates
   - Prioritize improvements

5. Next Drill Planning (5 min)

Required Attendees:
- Drill Commander
- All technical leads
- Executive observer

Optional Attendees:
- Anyone who participated or observed

Please review the drill evidence before the meeting:
[Link to evidence directory]
```

---

## Quick Reference Checklist

**Communication Timeline**:

- [ ] **T-7 Days**: Initial announcement (Email + Slack)
- [ ] **T-24 Hours**: Reminder and final checklist (Email + Slack)
- [ ] **T-7 Days** (if public): Customer notification (Status page)
- [ ] **T-1 Hour**: Go/No-Go decision (Slack)
- [ ] **T-0**: Drill kickoff (Slack)
- [ ] **During Drill**: Status updates every 2-5 minutes (Slack)
- [ ] **T+0** (completion): Results summary (Slack + Email)
- [ ] **T+2 Hours**: Evidence uploaded, status page updated
- [ ] **T+24 Hours**: Detailed post-mortem (Email)
- [ ] **T+48 Hours**: Post-mortem meeting (Calendar invite)

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | dr-gameday-lead | Initial creation |

**Next Review**: Quarterly
