## SWARM 6 Seed Data
**Beneficiary Groups, Campaigns & Monetization**

**Created**: 2025-11-22
**Agent**: 2.3 (seed-data-engineer)
**Status**: ✅ COMPLETE

---

## 📋 Overview

This directory contains comprehensive seed data for SWARM 6, demonstrating the complete Beneficiary Groups, Campaigns & Monetization system. The seed data creates a realistic CSR platform ecosystem with diverse beneficiary populations, sellable campaign products, and time-series metrics.

### What's Included

- **12 Beneficiary Groups**: Diverse populations across Germany & Norway
- **16 Campaigns**: All pricing models, statuses, and capacity scenarios
- **26 Program Instances**: Runtime execution with realistic metrics
- **55+ Metrics Snapshots**: Time-series data showing growth trends

---

## 🗂️ File Structure

```
scripts/seed/swarm6/
├── README.md                              # This file
├── beneficiary-groups.sql                 # 12 beneficiary group definitions
├── campaigns.sql                          # 16 campaigns (all pricing models)
├── program-instances.sql                  # 26 program instances
├── campaign-metrics-snapshots.sql         # 55+ time-series snapshots
└── (program templates in ../templates/)   # 16 templates (created by Agent 1.3)
```

---

## 📊 Data Summary

### Beneficiary Groups (12 groups)

| ID | Name | Type | Country | Age Range | Languages | Eligible Programs |
|---|---|---|---|---|---|---|
| bg-syrian-refugees-berlin-001 | Syrian Refugees - Berlin | refugees | DE | 18-55 | ar, en, de | mentorship, language, buddy, upskilling |
| bg-afghan-women-oslo-002 | Afghan Women - Oslo | refugees | NO | 20-45 | ps, fa, en, no | mentorship, language, buddy, upskilling, weei |
| bg-migrants-germany-employment-003 | Migrants Seeking Employment - Germany | migrants | DE | 22-50 | en, de, tr, ar | mentorship, upskilling, weei |
| bg-women-in-tech-norway-004 | Women in Tech - Norway | women_in_tech | NO | 18-40 | en, no | mentorship, upskilling, buddy |
| bg-youth-integration-multi-005 | Youth Integration Seekers | youth | DE | 18-25 | en, de, ar, fa, so | mentorship, language, buddy, upskilling |
| bg-ukrainian-displaced-germany-006 | Ukrainian Displaced Persons - Germany | displaced_persons | DE | 20-60 | uk, ru, en, de | language, buddy, upskilling, weei |
| bg-seniors-digital-inclusion-007 | Seniors Digital Inclusion | seniors | NO | 55-75 | no, en | buddy, upskilling |
| bg-asylum-seekers-norway-008 | Asylum Seekers - Norway | asylum_seekers | NO | 18-50 | ar, so, ti, en, no | language, buddy |
| bg-professional-newcomers-berlin-009 | Professional Newcomers - Berlin Tech | newcomers | DE | 25-45 | en, de | mentorship, buddy, upskilling |
| bg-job-seekers-germany-multi-010 | Job Seekers - Germany Multi-sector | job_seekers | DE | 20-55 | de, en, tr, ar, fa | mentorship, upskilling, weei |
| bg-family-caregivers-norway-011 | Family Caregivers - Norway | caregivers | NO | 25-55 | ar, so, ti, no, en | buddy, language |
| bg-students-higher-ed-multi-012 | International Students - Higher Education | students | DE | 18-30 | en, de, no | mentorship, buddy, upskilling, weei |

### Campaigns (16 campaigns)

| ID | Company | Name | Template | Group | Status | Pricing Model | Capacity % |
|---|---|---|---|---|---|---|---|
| camp-acme-syrian-mentors-q1-001 | Acme | Syrian Refugees Mentors Q1 | Mentorship 1-on-1 | Syrian Refugees - Berlin | active | seats | 86% |
| camp-globalcare-afghan-lang-q1-002 | GlobalCare | Afghan Women Language Q1 | Norwegian B1-B2 | Afghan Women - Oslo | active | iaas | 95% |
| camp-techco-migrants-upskill-q1-003 | TechCo | Migrants Tech Upskilling Q1 | Tech Bootcamp | Migrants - Employment | active | bundle | 70% |
| camp-acme-youth-buddy-q2-004 | Acme | Youth Buddy Q2 | Buddy 1-on-1 | Youth Integration | recruiting | credits | 15% |
| camp-globalcare-women-tech-q1-005 | GlobalCare | Women in Tech Q1 | Professional Networking | Women in Tech - NO | active | seats | **110%** ⚠️ |
| camp-techco-seniors-digital-q1-006 | TechCo | Seniors Digital Q1 | Digital Literacy | Seniors Digital | active | custom | 56% |
| camp-acme-asylum-english-q1-007 | Acme | Asylum Seekers English Q1 | English A1-A2 | Asylum Seekers - NO | active | iaas | 80% |
| camp-globalcare-family-buddy-q2-008 | GlobalCare | Family Buddy Q2 | Family Integration | Family Caregivers | planned | seats | 0% |
| camp-techco-jobseekers-cert-q1-009 | TechCo | Job Seekers Certifications Q1 | Professional Cert | Job Seekers | active | bundle | 65% |
| camp-acme-ukrainian-prof-q1-010 | Acme | Ukrainian Professionals Q1 | Professional Networking | Ukrainian Displaced | active | seats | 90% |
| camp-globalcare-cloud-migrants-q2-011 | GlobalCare | Cloud Computing Q2 | Cloud Certification | Migrants - Employment | recruiting | credits | 20% |
| camp-techco-students-career-q1-012 | TechCo | Student Career Prep Q1 | Mentorship 1-on-1 | International Students | active | iaas | 76% |
| camp-acme-berlin-tech-network-q1-013 | Acme | Berlin Tech Newcomers Q1 | Professional Networking | Professional Newcomers | active | bundle | **100%** ⚠️ |
| camp-globalcare-german-youth-q1-014 | GlobalCare | German Intensive Youth Q1 | German Intensive | Youth Integration | **paused** | seats | 40% |
| camp-techco-hosp-langprof-q4-015 | TechCo | Hospitality Lang+Prof Q4 2024 | Language+Professional | Job Seekers | **completed** | custom | 92% |
| camp-acme-women-tech-group-q1-016 | Acme | Women Tech Group Q1 | Mentorship Group | Women in Tech - NO | active | seats | 62.5% |

**Key Insights**:
- ✅ **5 pricing models**: Seats (7), IAAS (3), Bundle (3), Credits (2), Custom (2)
- ✅ **6 statuses**: Active (11), Recruiting (2), Planned (1), Paused (1), Completed (1)
- ⚠️ **2 over/at capacity**: Upsell opportunities (Campaign 5 @ 110%, Campaign 13 @ 100%)
- 📈 **High performers**: Campaign 2 (SROI 5.8), Campaign 5 (SROI 6.2), Campaign 15 (SROI 6.5)

### Program Instances (26 instances)

**Distribution**:
- Active: 24 instances
- Paused: 1 instance (German Youth)
- Completed: 2 instances (Hospitality Lang+Prof cohorts)

**Aggregate Metrics**:
- Total Volunteers: 300+
- Total Beneficiaries: 450+
- Total Sessions: 1,600+
- Total Hours: 5,200+
- Average SROI: 4.2
- Average VIS: 75.8

### Campaign Metrics Snapshots (55+ snapshots)

**Coverage**:
- 10 campaigns tracked over time
- Weekly snapshots for last 3 months
- Shows growth from 15% → 110% capacity
- Demonstrates budget spend progression
- Tracks SROI/VIS improvements

---

## 🔗 Data Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    BENEFICIARY GROUPS (12)                   │
│  Syrian Refugees, Afghan Women, Migrants, Women in Tech...  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   PROGRAM TEMPLATES (16)                     │
│  Mentorship, Language, Buddy, Upskilling templates          │
│  (Created by Agent 1.3 in ../templates/)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        CAMPAIGNS (16)                        │
│  Template + Group + Company + Period + Commercial Terms     │
│  - Acme Corp: 6 campaigns                                   │
│  - TechCo: 5 campaigns                                      │
│  - GlobalCare: 5 campaigns                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   PROGRAM INSTANCES (26)                     │
│  Runtime execution (1-3 instances per campaign)             │
│  - Cohorts, groups, tracks                                  │
│  - Participant counts, sessions, hours                      │
│  - SROI/VIS scores, outcome metrics                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│             CAMPAIGN METRICS SNAPSHOTS (55+)                 │
│  Time-series tracking (weekly snapshots)                    │
│  - Capacity utilization trends                              │
│  - Budget spend progression                                 │
│  - Impact metric improvements                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Execution Instructions

### Prerequisites

1. **Migrations Applied**: Ensure SWARM 6 migrations (0044-0048) are applied:
   ```bash
   # Check if migrations exist
   ls -la packages/shared-schema/migrations/004[4-8]*.sql
   ```

2. **Program Templates Loaded**: Templates seed data must be loaded first:
   ```bash
   # Check if templates exist
   psql -d teei_platform -c "SELECT COUNT(*) FROM program_templates;"
   # Should return 16
   ```

3. **Existing Companies**: Seed data links to existing pilot companies:
   - Acme Corp: `acme0001-0001-0001-0001-000000000001`
   - TechCo: `techc001-0001-0001-0001-000000000001`
   - GlobalCare: `globa001-0001-0001-0001-000000000001`

### Option 1: Automated Script (Recommended)

```bash
# Make script executable
chmod +x scripts/seed-swarm6.sh

# Run seed script
./scripts/seed-swarm6.sh
```

### Option 2: Manual Execution

```bash
# Set database connection (adjust as needed)
export PGDATABASE=teei_platform
export PGUSER=postgres
export PGHOST=localhost

# Execute in order
psql -f scripts/seed/swarm6/beneficiary-groups.sql
psql -f scripts/seed/swarm6/campaigns.sql
psql -f scripts/seed/swarm6/program-instances.sql
psql -f scripts/seed/swarm6/campaign-metrics-snapshots.sql
```

### Verification

After loading, verify data:

```sql
-- Count records
SELECT
  (SELECT COUNT(*) FROM beneficiary_groups WHERE id LIKE 'bg-%') as groups,
  (SELECT COUNT(*) FROM campaigns WHERE id LIKE 'camp-%') as campaigns,
  (SELECT COUNT(*) FROM program_instances WHERE id LIKE 'inst-%') as instances,
  (SELECT COUNT(*) FROM campaign_metrics_snapshots) as snapshots;

-- Expected output:
-- groups: 12
-- campaigns: 16
-- instances: 26
-- snapshots: 55+
```

---

## 🔍 Example Queries

### 1. Campaign Overview

```sql
SELECT
  c.name,
  c.status,
  c.pricing_model,
  bg.name as beneficiary_group,
  pt.name as template,
  c.capacity_utilization,
  c.cumulative_sroi,
  c.is_near_capacity,
  c.is_high_value
FROM campaigns c
JOIN beneficiary_groups bg ON c.beneficiary_group_id = bg.id
JOIN program_templates pt ON c.program_template_id = pt.id
WHERE c.id LIKE 'camp-%'
ORDER BY c.capacity_utilization DESC;
```

### 2. Upsell Opportunities

```sql
SELECT
  c.name,
  c.company_id,
  c.capacity_utilization,
  c.cumulative_sroi,
  c.average_vis,
  c.is_near_capacity,
  c.is_over_capacity,
  c.upsell_opportunity_score
FROM campaigns c
WHERE c.id LIKE 'camp-%'
  AND (c.is_near_capacity = true OR c.is_over_capacity = true)
ORDER BY c.upsell_opportunity_score DESC;

-- Returns: Campaign 5 (110% capacity), Campaign 13 (100% capacity)
```

### 3. Campaign-Level SROI by Pricing Model

```sql
SELECT
  c.pricing_model,
  COUNT(*) as campaign_count,
  ROUND(AVG(c.cumulative_sroi)::numeric, 2) as avg_sroi,
  ROUND(AVG(c.average_vis)::numeric, 2) as avg_vis,
  ROUND(AVG(c.capacity_utilization)::numeric, 2) as avg_capacity_util
FROM campaigns c
WHERE c.id LIKE 'camp-%'
  AND c.cumulative_sroi IS NOT NULL
GROUP BY c.pricing_model
ORDER BY avg_sroi DESC;
```

### 4. Time-Series: Campaign Growth

```sql
SELECT
  snapshot_date::date,
  volunteers_current,
  volunteers_utilization,
  beneficiaries_current,
  budget_spent,
  sroi_score,
  average_vis_score
FROM campaign_metrics_snapshots
WHERE campaign_id = 'camp-acme-syrian-mentors-q1-001'
ORDER BY snapshot_date;

-- Shows weekly growth from 60% → 86% capacity
```

### 5. Beneficiary Group Reach

```sql
SELECT
  bg.name,
  bg.group_type,
  COUNT(DISTINCT c.id) as campaigns_count,
  COUNT(DISTINCT pi.id) as instances_count,
  SUM(pi.learners_served) as total_beneficiaries_served
FROM beneficiary_groups bg
LEFT JOIN campaigns c ON bg.id = c.beneficiary_group_id AND c.id LIKE 'camp-%'
LEFT JOIN program_instances pi ON c.id = pi.campaign_id AND pi.id LIKE 'inst-%'
WHERE bg.id LIKE 'bg-%'
GROUP BY bg.id, bg.name, bg.group_type
ORDER BY total_beneficiaries_served DESC NULLS LAST;
```

### 6. Company Campaign Performance

```sql
SELECT
  CASE
    WHEN c.company_id = 'acme0001-0001-0001-0001-000000000001' THEN 'Acme Corp'
    WHEN c.company_id = 'techc001-0001-0001-0001-000000000001' THEN 'TechCo'
    WHEN c.company_id = 'globa001-0001-0001-0001-000000000001' THEN 'GlobalCare'
  END as company,
  COUNT(*) as campaigns,
  SUM(c.budget_allocated) as total_budget,
  SUM(c.budget_spent) as total_spent,
  ROUND(AVG(c.cumulative_sroi)::numeric, 2) as avg_sroi,
  COUNT(*) FILTER (WHERE c.is_high_value = true) as high_value_campaigns
FROM campaigns c
WHERE c.id LIKE 'camp-%'
GROUP BY c.company_id
ORDER BY avg_sroi DESC;
```

### 7. Program Instance Outcomes

```sql
SELECT
  pi.name,
  pi.status,
  pi.enrolled_volunteers,
  pi.enrolled_beneficiaries,
  pi.total_sessions_held,
  pi.sroi_score,
  pi.average_vis_score,
  pi.outcome_scores
FROM program_instances pi
WHERE pi.id LIKE 'inst-%'
  AND pi.status = 'active'
  AND pi.sroi_score IS NOT NULL
ORDER BY pi.sroi_score DESC
LIMIT 10;
```

### 8. Budget Utilization Alerts

```sql
SELECT
  c.name,
  c.budget_allocated,
  c.budget_spent,
  ROUND((c.budget_spent / c.budget_allocated * 100)::numeric, 1) as budget_pct_used,
  c.capacity_utilization,
  CASE
    WHEN c.budget_spent / c.budget_allocated > 0.9 THEN 'Budget near exhaustion'
    WHEN c.budget_spent / c.budget_allocated > 0.8 THEN 'Budget monitoring needed'
    ELSE 'Budget healthy'
  END as budget_status
FROM campaigns c
WHERE c.id LIKE 'camp-%'
  AND c.status = 'active'
ORDER BY budget_pct_used DESC;
```

---

## 📈 Key Features Demonstrated

### Pricing Models (All 5)

- ✅ **Seats**: Fixed volunteer slots with monthly pricing (7 campaigns)
- ✅ **Credits**: Consumption-based impact credits (2 campaigns)
- ✅ **Bundle**: Part of L2I subscription bundles (3 campaigns)
- ✅ **IAAS** (Impact-as-a-Service): Outcome-based with learner commitments (3 campaigns)
- ✅ **Custom**: Negotiated/special pricing (2 campaigns)

### Campaign Statuses (All 6)

- ✅ **Draft**: Template created, not launched (0 in seed - not needed)
- ✅ **Planned**: Future campaign, not started (1 campaign)
- ✅ **Recruiting**: Active recruitment, low capacity (2 campaigns)
- ✅ **Active**: Running with participants (11 campaigns)
- ✅ **Paused**: Temporarily halted (1 campaign)
- ✅ **Completed**: Successfully finished (1 campaign)

### Capacity Scenarios

- ✅ **Low (<50%)**: Recruiting campaigns, early stage
- ✅ **Medium (50-80%)**: Growing campaigns
- ✅ **High (80-100%)**: Near capacity, upsell triggers
- ✅ **Over (>100%)**: Over-capacity, expansion needed

### Geographic Diversity

- ✅ **Germany**: 7 beneficiary groups, 10 campaigns
- ✅ **Norway**: 5 beneficiary groups, 6 campaigns
- ✅ **Multi-country**: International students, cross-border programs

### Demographics Coverage

- ✅ **Age**: Youth (18-25), Adults (20-55), Seniors (55-75)
- ✅ **Gender**: All, Women-focused, Mixed
- ✅ **Status**: Refugees, Asylum seekers, Migrants, Citizens, Students
- ✅ **Focus**: Employment, Integration, Education, Tech, Family

---

## 🧪 Testing Scenarios

### Scenario 1: Upsell Flow

1. **Identify over-capacity campaign**:
   ```sql
   SELECT * FROM campaigns WHERE is_over_capacity = true;
   -- Returns: Campaign 5 (Women in Tech @ 110%)
   ```

2. **View growth trend**:
   ```sql
   SELECT snapshot_date, volunteers_utilization, alerts
   FROM campaign_metrics_snapshots
   WHERE campaign_id = 'camp-globalcare-women-tech-q1-005'
   ORDER BY snapshot_date;
   -- Shows: 80% → 93% → 100% → 110%
   ```

3. **Propose expansion**:
   - Current: 30 seats @ €50/month
   - Proposed: 50 seats @ €50/month
   - Additional revenue: €1,000/month

### Scenario 2: IAAS Outcome Tracking

1. **Check IAAS campaign SLA**:
   ```sql
   SELECT
     name,
     iaas_metrics->>'learnersCommitted' as committed,
     current_beneficiaries as served,
     iaas_metrics->'outcomesGuaranteed' as guarantees,
     cumulative_sroi,
     average_vis
   FROM campaigns
   WHERE pricing_model = 'iaas'
     AND id LIKE 'camp-%';
   ```

2. **Verify outcome thresholds**:
   - Campaign 2: B1 language proficiency > 0.7 ✅ (actual: 0.78)
   - Campaign 7: Basic English > 0.6 ✅ (actual: 0.72)

### Scenario 3: Campaign Lifecycle Management

1. **Track campaign from planned → active → completed**:
   - Campaign 8: PLANNED (not started)
   - Campaign 1-13: ACTIVE (running)
   - Campaign 14: PAUSED (volunteer shortage)
   - Campaign 15: COMPLETED (successful finish)

2. **Monitor pause → resume flow**:
   ```sql
   -- Campaign 14 paused due to volunteer shortage
   SELECT status, internal_notes FROM campaigns
   WHERE id = 'camp-globalcare-german-youth-q1-014';
   -- Shows: "PAUSED: Volunteer shortage. Resume in Q2."
   ```

---

## 🔒 Privacy & Compliance

### Privacy-First Design

- ❌ **NO individual PII**: No names, emails, addresses, phone numbers
- ✅ **Aggregated demographics**: Age ranges (not birthdates), broad categories
- ✅ **Group-level data**: Legal status categories (not visa details)
- ✅ **GDPR-compliant**: Suitable for EU/EEA deployment

### Data Categorization

All beneficiary groups use:
- Age ranges (e.g., 18-55) not specific ages
- Language codes (ISO 639-1) not personal language proficiency
- Broad legal status (refugee, migrant, citizen) not permit details
- Geographic regions (city/region) not precise addresses

---

## 🛠️ Maintenance & Updates

### Adding New Campaigns

1. Choose beneficiary group (or create new)
2. Select program template (or create new)
3. Define commercial terms (pricing model, capacity, budget)
4. Set campaign period and status
5. Insert campaign record
6. Monitor metrics via snapshots

### Updating Metrics

Campaign metrics are updated via:
- Program instance aggregation (hourly/daily jobs)
- Snapshot creation (weekly/monthly)
- Manual updates (rare, for corrections)

### Data Retention

- **Campaigns**: Retained indefinitely (historical record)
- **Instances**: Retained for completed campaigns
- **Snapshots**: Retained for 2 years (configurable)
- **Beneficiary Groups**: Retained while active campaigns exist

---

## 📚 Related Documentation

- [SWARM_6_PLAN.md](/SWARM_6_PLAN.md) - Full SWARM 6 orchestration plan
- [PROGRAM_TEMPLATES_GUIDE.md](/docs/PROGRAM_TEMPLATES_GUIDE.md) - Template design guide
- [SWARM6_MIGRATIONS_README.md](/packages/shared-schema/migrations/SWARM6_MIGRATIONS_README.md) - Migration guide
- [../templates/README.md](../templates/README.md) - Program templates overview

---

## ✅ Quality Checklist

- [x] All foreign keys reference valid IDs
- [x] Data is realistic and diverse
- [x] All features demonstrated (pricing models, statuses, capacities)
- [x] Date ranges are logical (start < end, snapshots within campaign period)
- [x] Capacity/budget numbers are consistent
- [x] Privacy compliant (no individual PII in beneficiary groups)
- [x] Seed script is idempotent (ON CONFLICT DO NOTHING)
- [x] Verification queries included
- [x] Example queries documented
- [x] Testing scenarios provided

---

## 📞 Support

**Questions?**

- Technical: Review schema migrations (`packages/shared-schema/migrations/004[4-8]*.sql`)
- Business: Refer to SWARM 6 plan for feature requirements
- Data: Check verification queries in this README

**Encountered Issues?**

1. Check prerequisites (migrations, templates, companies)
2. Review error messages from seed scripts
3. Verify foreign key references
4. Check database permissions

---

**Seed Data Version**: 1.0.0
**Created By**: Agent 2.3 (seed-data-engineer)
**Last Updated**: 2025-11-22
**Status**: ✅ PRODUCTION READY
