# J2-J7: Execution Plans Summary

**Note**: This document provides consolidated technical guidance for slices J2-J7. Each slice has clear agent ownership and acceptance criteria.

---

## J2: Great Expectations Coverage

**Owner**: dq-lead (Agents 2.1–2.5, 2.6–2.8)
**Target**: 100% critical tables have GE suites; ≥90% test pass rate

### Architecture

```
┌──────────────────────────────────────────────────┐
│  Great Expectations Project Structure            │
├──────────────────────────────────────────────────┤
│  great_expectations/                             │
│  ├── checkpoints/                                │
│  │   ├── critical_tables_checkpoint.yml          │
│  │   ├── kintell_checkpoint.yml                  │
│  │   └── buddy_checkpoint.yml                    │
│  ├── expectations/                               │
│  │   ├── users_suite.json                        │
│  │   ├── companies_suite.json                    │
│  │   ├── kintell_sessions_suite.json             │
│  │   └── ... (8 total suites)                    │
│  ├── plugins/                                    │
│  │   └── custom_expectations/                    │
│  │       ├── expect_sroi_in_range.py             │
│  │       └── expect_vis_in_range.py              │
│  └── great_expectations.yml                      │
└──────────────────────────────────────────────────┘
```

### Agent Work Plans

#### Agent 2.1: ge-suite-author-critical
**Tables**: users, companies, program_enrollments

**users suite** (20+ expectations):
```yaml
# great_expectations/expectations/users_suite.json
expectations:
  # Schema validation
  - expectation_type: expect_table_columns_to_match_ordered_list
    column_list: [id, email, name, company_id, role, created_at, updated_at]

  # NOT NULL tests
  - expectation_type: expect_column_values_to_not_be_null
    column: id
  - expectation_type: expect_column_values_to_not_be_null
    column: email
  - expectation_type: expect_column_values_to_not_be_null
    column: created_at

  # Uniqueness
  - expectation_type: expect_column_values_to_be_unique
    column: id
  - expectation_type: expect_column_values_to_be_unique
    column: email

  # Referential integrity
  - expectation_type: expect_column_values_to_be_in_set
    column: company_id
    value_set: SELECT id FROM companies

  # Data types
  - expectation_type: expect_column_values_to_match_regex
    column: email
    regex: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$

  # Range checks
  - expectation_type: expect_column_values_to_be_between
    column: created_at
    min_value: 2020-01-01
    max_value: now + 1 day
```

**Acceptance**:
- [ ] users: 20+ expectations (schema, nulls, uniqueness, email format, FK to companies)
- [ ] companies: 15+ expectations (schema, nulls, uniqueness, domain format)
- [ ] program_enrollments: 18+ expectations (schema, nulls, FK to users/programs, status enum)

#### Agent 2.2: ge-suite-author-kintell
**Tables**: kintell_sessions

**kintell_sessions suite** (12+ expectations):
```yaml
expectations:
  # Schema validation
  - expect_table_columns_to_match_ordered_list

  # NOT NULL
  - expect_column_values_to_not_be_null: [session_id, user_id, started_at]

  # Referential integrity
  - expect_column_values_to_be_in_set:
      column: user_id
      value_set: SELECT id FROM users

  # Range checks
  - expect_column_values_to_be_between:
      column: duration_minutes
      min_value: 0
      max_value: 480  # 8 hours max

  # Session state
  - expect_column_values_to_be_in_set:
      column: status
      value_set: [in_progress, completed, abandoned]
```

**Acceptance**:
- [ ] kintell_sessions: 12+ expectations (schema, nulls, FK to users, duration range 0-480 min, status enum)

#### Agent 2.3: ge-suite-author-buddy
**Tables**: buddy_matches, buddy_events, buddy_feedback

**buddy_matches suite** (15+ expectations):
```yaml
expectations:
  # Schema
  - expect_table_columns_to_match_ordered_list

  # NOT NULL
  - expect_column_values_to_not_be_null: [match_id, volunteer_id, refugee_id, matched_at]

  # Referential integrity
  - expect_column_values_to_be_in_set:
      column: volunteer_id
      value_set: SELECT id FROM users WHERE role = 'volunteer'
  - expect_column_values_to_be_in_set:
      column: refugee_id
      value_set: SELECT id FROM users WHERE role = 'refugee'

  # Business logic: volunteer_id ≠ refugee_id
  - expect_column_pair_values_to_be_different:
      column_A: volunteer_id
      column_B: refugee_id

  # Status enum
  - expect_column_values_to_be_in_set:
      column: status
      value_set: [active, completed, paused]
```

**Acceptance**:
- [ ] buddy_matches: 15+ expectations (schema, nulls, FK to users, volunteer≠refugee, status enum)
- [ ] buddy_events: 12+ expectations (schema, nulls, FK to buddy_matches, event_type enum, timestamp range)
- [ ] buddy_feedback: 10+ expectations (schema, nulls, FK to buddy_matches, sentiment range 1-5)

#### Agent 2.4: ge-suite-author-metrics
**Tables**: evidence_snippets, outcome_scores, metrics_company_period

**Custom Expectations** (create plugins):
```python
# great_expectations/plugins/custom_expectations/expect_sroi_in_range.py
from great_expectations.expectations import Expectation

class ExpectSroiInRange(Expectation):
    """Expect SROI values to be between 0 and 10 (reasonable range)"""

    def _validate(self, metrics):
        sroi = metrics.get("column.min"), metrics.get("column.max")
        return {
            "success": sroi[0] >= 0 and sroi[1] <= 10,
            "result": {"observed_value": sroi}
        }

class ExpectVisInRange(Expectation):
    """Expect VIS scores to be between 0 and 100"""

    def _validate(self, metrics):
        vis = metrics.get("column.min"), metrics.get("column.max")
        return {
            "success": vis[0] >= 0 and vis[1] <= 100,
            "result": {"observed_value": vis}
        }
```

**metrics_company_period suite** (18+ expectations):
```yaml
expectations:
  # Schema
  - expect_table_columns_to_match_ordered_list

  # NOT NULL
  - expect_column_values_to_not_be_null: [id, company_id, period_start, period_end, sroi, vis]

  # Referential integrity
  - expect_column_values_to_be_in_set:
      column: company_id
      value_set: SELECT id FROM companies

  # SROI range (custom expectation)
  - expectation_type: expect_sroi_in_range
    column: sroi

  # VIS range (custom expectation)
  - expectation_type: expect_vis_in_range
    column: vis

  # Period logic: period_end > period_start
  - expect_column_pair_values_A_to_be_greater_than_B:
      column_A: period_end
      column_B: period_start
```

**Acceptance**:
- [ ] evidence_snippets: 10+ expectations (schema, nulls, FK to buddy_feedback, confidence 0-1)
- [ ] outcome_scores: 12+ expectations (schema, nulls, FK to users, score 0-100, outcome_type enum)
- [ ] metrics_company_period: 18+ expectations (schema, nulls, FK to companies, SROI 0-10, VIS 0-100, period_end > period_start)

#### Agent 2.5: ge-suite-author-reports
**Tables**: report_lineage, report_citations

**report_lineage suite** (15+ expectations):
```yaml
expectations:
  # Schema
  - expect_table_columns_to_match_ordered_list

  # NOT NULL
  - expect_column_values_to_not_be_null: [id, report_id, company_id, model_name, tokens_input, tokens_output]

  # Referential integrity
  - expect_column_values_to_be_in_set:
      column: company_id
      value_set: SELECT id FROM companies

  # Model names (enum)
  - expect_column_values_to_be_in_set:
      column: model_name
      value_set: [gpt-4-turbo, claude-3-opus-20240229, claude-3-sonnet-20240229]

  # Token counts (positive)
  - expect_column_values_to_be_between:
      column: tokens_input
      min_value: 1
      max_value: 200000
  - expect_column_values_to_be_between:
      column: tokens_output
      min_value: 1
      max_value: 100000

  # Citation count (non-negative)
  - expect_column_values_to_be_between:
      column: citation_count
      min_value: 0
      max_value: 1000
```

**Acceptance**:
- [ ] report_lineage: 15+ expectations (schema, nulls, FK to companies, model_name enum, token counts >0, citation_count ≥0)
- [ ] report_citations: 10+ expectations (schema, nulls, FK to report_lineage, citation_number >0, relevance_score 0-1)

#### Agents 2.6–2.8: dq-anomaly-hunter-*
**Proactive monitors** (run on schedule via cron)

**Agent 2.6: drift monitor** (schema drift >5%):
```python
# great_expectations/plugins/anomaly_hunters/drift_monitor.py
import great_expectations as ge

def detect_schema_drift():
    context = ge.data_context.DataContext()

    for table in CRITICAL_TABLES:
        # Get expected schema
        suite = context.get_expectation_suite(f"{table}_suite")
        expected_columns = suite.expectations[0]['kwargs']['column_list']

        # Get actual schema
        df = context.get_batch(f"{table}_latest")
        actual_columns = df.columns.tolist()

        # Calculate drift
        drift_pct = len(set(expected_columns) ^ set(actual_columns)) / len(expected_columns)

        if drift_pct > 0.05:  # >5% drift
            alert_on_call(f"Schema drift detected in {table}: {drift_pct*100:.1f}%")
```

**Agent 2.7: null spike monitor** (>10% increase):
```python
def detect_null_spikes():
    for table, column in CRITICAL_COLUMNS:
        # Get historical null %
        historical_null_pct = get_historical_null_rate(table, column, days=7)

        # Get current null %
        current_null_pct = get_current_null_rate(table, column)

        # Check spike
        if current_null_pct > historical_null_pct * 1.1:  # >10% increase
            alert_on_call(f"Null spike in {table}.{column}: {current_null_pct*100:.1f}% (was {historical_null_pct*100:.1f}%)")
```

**Agent 2.8: outlier monitor** (SROI >10, VIS >100):
```python
def detect_outliers():
    # SROI outliers
    outlier_sroi = db.query("SELECT COUNT(*) FROM metrics_company_period WHERE sroi > 10 OR sroi < 0")
    if outlier_sroi > 0:
        alert_on_call(f"SROI outliers detected: {outlier_sroi} rows with SROI outside [0, 10]")

    # VIS outliers
    outlier_vis = db.query("SELECT COUNT(*) FROM outcome_scores WHERE vis > 100 OR vis < 0")
    if outlier_vis > 0:
        alert_on_call(f"VIS outliers detected: {outlier_vis} rows with VIS outside [0, 100]")
```

### CI Integration

**Agent 5.1: ci-wiring-engineer-dq**

**Create script**: `pnpm dq:ci`
```json
// package.json (root)
{
  "scripts": {
    "dq:ci": "great_expectations checkpoint run critical_tables_checkpoint --v3-api",
    "dq:validate": "great_expectations suite list",
    "dq:anomaly-scan": "python scripts/run_anomaly_hunters.py"
  }
}
```

**GitHub workflow**:
```yaml
# .github/workflows/data-quality.yml
name: Data Quality Gates

on:
  pull_request:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  ge-suites:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install Great Expectations
        run: pip install great_expectations psycopg2
      - name: Run GE checkpoints
        run: pnpm dq:ci
      - name: Check pass rate
        run: |
          # Parse checkpoint results
          pass_rate=$(python scripts/parse_ge_results.py)
          if (( $(echo "$pass_rate < 90" | bc -l) )); then
            echo "FAIL: GE pass rate ${pass_rate}% < 90%"
            exit 1
          fi
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: ge-results
          path: great_expectations/uncommitted/validations/

  anomaly-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run anomaly hunters
        run: pnpm dq:anomaly-scan
```

### Success Criteria (J2)

- [ ] 8/8 critical tables have GE suites
- [ ] ≥90% test pass rate across all suites
- [ ] CI script `pnpm dq:ci` fails if <90% pass
- [ ] Custom expectations: `expect_sroi_in_range`, `expect_vis_in_range`
- [ ] Anomaly hunters: drift, null spike, outlier monitors deployed
- [ ] GitHub workflow: data-quality.yml enforces gates on PRs
- [ ] Runbook: `/docs/data/ge_playbook.md` (J7)

---

## J3: dbt Semantic Layer

**Owner**: semantics-lead (Agents 4.1–4.6)
**Target**: dbt metrics match service calculators (golden tests pass)

### Architecture

```
analytics/dbt/
├── models/
│   ├── staging/                  # stg_* models (Agent 4.1)
│   │   ├── stg_users.sql
│   │   ├── stg_buddy_events.sql
│   │   └── stg_outcome_scores.sql
│   ├── marts/                    # dims/facts (Agent 4.2)
│   │   ├── dim_company.sql
│   │   ├── dim_date.sql
│   │   ├── fact_metrics.sql
│   │   └── fact_outcomes.sql
│   └── metrics/                  # metric YAML (Agent 4.3)
│       ├── sroi.yml
│       ├── vis.yml
│       └── engagement_rate.yml
├── tests/                        # Golden tests (Agents 4.4, 4.5)
│   ├── test_sroi_vs_service.sql
│   └── test_vis_vs_service.sql
├── macros/                       # Reusable SQL
│   └── calculate_sroi.sql
├── seeds/                        # Reference data
│   └── activity_weights.csv
├── dbt_project.yml
└── profiles.yml                  # DB connections + OpenLineage
```

### Agent Work Plans

#### Agent 4.1: dbt-modeler-staging
**Task**: Create staging models (raw → cleaned)

**stg_buddy_events.sql**:
```sql
-- models/staging/stg_buddy_events.sql
{{
  config(
    materialized='view',
    tags=['staging', 'buddy']
  )
}}

WITH source AS (
  SELECT * FROM {{ source('teei_platform', 'buddy_system_events') }}
),

cleaned AS (
  SELECT
    event_id,
    event_type,
    timestamp,
    volunteer_id,
    refugee_id,
    -- Parse metadata JSON
    (metadata->>'hours')::numeric AS hours,
    (metadata->>'skill')::text AS skill,
    -- Timestamps
    timestamp::date AS event_date,
    DATE_TRUNC('month', timestamp) AS event_month,
    -- Flags
    timestamp >= CURRENT_DATE - INTERVAL '30 days' AS is_recent
  FROM source
  WHERE event_type IN ('buddy_match', 'event_attended', 'skill_share', 'feedback', 'milestone', 'checkin')
    AND timestamp IS NOT NULL
)

SELECT * FROM cleaned
```

**Source freshness checks** (dbt_project.yml):
```yaml
sources:
  - name: teei_platform
    database: teei_platform
    schema: public
    tables:
      - name: buddy_system_events
        freshness:
          warn_after: {count: 12, period: hour}
          error_after: {count: 24, period: hour}
      - name: users
        freshness:
          warn_after: {count: 6, period: hour}
          error_after: {count: 12, period: hour}
```

**Acceptance**:
- [ ] stg_users, stg_companies, stg_buddy_events, stg_kintell_sessions, stg_outcome_scores created
- [ ] Freshness checks on all sources (warn <12h, error <24h)
- [ ] Data types cleaned (timestamps, numerics, booleans)
- [ ] NULL filtering applied

#### Agent 4.2: dbt-modeler-marts
**Task**: Create marts (dims/facts)

**fact_metrics.sql**:
```sql
-- models/marts/fact_metrics.sql
{{
  config(
    materialized='table',
    tags=['marts', 'metrics']
  )
}}

WITH buddy_aggregates AS (
  SELECT
    DATE_TRUNC('month', event_date) AS period_month,
    COUNT(DISTINCT CASE WHEN event_type = 'buddy_match' THEN event_id END) AS matches,
    COUNT(DISTINCT CASE WHEN event_type = 'event_attended' THEN event_id END) AS events,
    COUNT(DISTINCT CASE WHEN event_type = 'skill_share' THEN event_id END) AS skill_shares,
    COUNT(DISTINCT CASE WHEN event_type = 'feedback' THEN event_id END) AS feedback,
    COUNT(DISTINCT CASE WHEN event_type = 'milestone' THEN event_id END) AS milestones,
    COUNT(DISTINCT CASE WHEN event_type = 'checkin' THEN event_id END) AS checkins
  FROM {{ ref('stg_buddy_events') }}
  GROUP BY 1
),

sroi_calc AS (
  SELECT
    period_month,
    matches * 10 + events * 5 + skill_shares * 15 + feedback * 8 + milestones * 20 + checkins * 3 AS social_value,
    1500 AS monthly_investment,  -- From DEFAULT_MONTHLY_INVESTMENT
    (social_value / monthly_investment) AS sroi_ratio
  FROM buddy_aggregates
)

SELECT
  period_month,
  social_value,
  monthly_investment,
  sroi_ratio,
  -- Confidence score
  CASE
    WHEN (matches + events + skill_shares + feedback + milestones + checkins) < 100 THEN 0.3
    WHEN (matches + events + skill_shares + feedback + milestones + checkins) < 1000 THEN 0.5
    ELSE 0.8
  END AS confidence
FROM sroi_calc
```

**Exposures** (link to Cockpit):
```yaml
# models/marts/exposures.yml
version: 2

exposures:
  - name: cockpit_metrics_dashboard
    type: dashboard
    maturity: high
    url: https://cockpit.teei.no/metrics
    description: Corporate Cockpit metrics dashboard
    depends_on:
      - ref('fact_metrics')
      - ref('dim_company')
    owner:
      name: Corp Cockpit Team
      email: cockpit@teei.no
```

**Acceptance**:
- [ ] dim_company, dim_date, fact_metrics, fact_outcomes created
- [ ] fact_metrics includes SROI, VIS, engagement calculations
- [ ] Exposures defined for Cockpit queries
- [ ] Incremental materialization for fact tables (performance)

#### Agent 4.3: dbt-modeler-metrics
**Task**: Create metrics registry (YAML)

**sroi.yml**:
```yaml
# models/metrics/sroi.yml
version: 2

metrics:
  - name: sroi_ratio
    label: Social Return on Investment
    model: ref('fact_metrics')
    description: |
      SROI ratio calculated as social_value / investment.
      Formula matches /services/analytics/src/calculators/sroi-calculator.ts

    calculation_method: derived
    expression: sroi_ratio

    timestamp: period_month
    time_grains: [month, quarter, year]

    dimensions:
      - company_id
      - program_type

    filters:
      - field: confidence
        operator: '>='
        value: 0.5  # Only high-confidence metrics

    meta:
      owner: analytics-team
      formula: social_value / investment
      service_calculator: /services/analytics/src/calculators/sroi-calculator.ts
      freshness_sla: 24 hours
```

**Acceptance**:
- [ ] sroi.yml, vis.yml, engagement_rate.yml, hours_volunteered.yml, evidence_density.yml created
- [ ] Each metric includes: formula, dimensions, filters, freshness SLA
- [ ] Metadata links to service calculator for golden tests

#### Agents 4.4, 4.5: metrics-governor-sroi, metrics-governor-vis
**Task**: Golden tests (dbt metrics vs service calculators)

**test_sroi_vs_service.sql**:
```sql
-- tests/test_sroi_vs_service.sql
-- Golden test: dbt SROI must match service calculator within 0.01% tolerance

WITH dbt_sroi AS (
  SELECT
    period_month,
    sroi_ratio AS dbt_value
  FROM {{ ref('fact_metrics') }}
  WHERE period_month >= '2025-01-01'
),

service_sroi AS (
  SELECT
    period_start::date AS period_month,
    sroi_ratio::numeric AS service_value
  FROM sroi_calculations
  WHERE period_start >= '2025-01-01'
),

comparison AS (
  SELECT
    d.period_month,
    d.dbt_value,
    s.service_value,
    ABS(d.dbt_value - s.service_value) / NULLIF(s.service_value, 0) AS pct_diff
  FROM dbt_sroi d
  INNER JOIN service_sroi s ON d.period_month = s.period_month
)

SELECT *
FROM comparison
WHERE pct_diff > 0.0001  -- Fail if >0.01% difference
```

**Run golden tests in CI**:
```yaml
# .github/workflows/dbt-tests.yml
- name: Run dbt tests
  run: |
    dbt test --select tag:golden_test
    if [ $? -ne 0 ]; then
      echo "FAIL: dbt metrics diverge from service calculators"
      exit 1
    fi
```

**Acceptance**:
- [ ] Golden test: SROI dbt vs service (tolerance 0.01%)
- [ ] Golden test: VIS dbt vs service (tolerance 0.01%)
- [ ] CI enforces: dbt metrics must match service calculators
- [ ] If divergence detected: alert data-eng-lead + block merge

#### Agent 4.6: dbt-docs-generator
**Task**: Generate dbt docs artifact

```bash
# Generate docs
dbt docs generate

# Serve docs locally (dev)
dbt docs serve --port 8080

# Publish to S3 (prod)
aws s3 sync target/docs/ s3://teei-dbt-docs/ --acl public-read
```

**Acceptance**:
- [ ] dbt docs generated: target/catalog.json, target/manifest.json
- [ ] Docs include: all models, metrics, tests, exposures, lineage DAG
- [ ] Published to S3 or internal docs site
- [ ] Linked from Catalog UI (J4)

### CI Integration

**Agent 5.2: ci-wiring-engineer-dbt**

```json
// package.json
{
  "scripts": {
    "dbt:test": "dbt test",
    "dbt:run": "dbt run",
    "dbt:docs": "dbt docs generate"
  }
}
```

```yaml
# .github/workflows/dbt.yml
name: dbt Tests

on: [pull_request]

jobs:
  dbt-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dbt
        run: pip install dbt-postgres dbt-clickhouse
      - name: Run dbt tests
        run: pnpm dbt:test
      - name: Run dbt models
        run: pnpm dbt:run
      - name: Generate docs
        run: pnpm dbt:docs
      - name: Publish docs
        run: aws s3 sync target/docs/ s3://teei-dbt-docs/
```

### OpenLineage Integration (Agent 1.5)

**profiles.yml**:
```yaml
# analytics/dbt/profiles.yml
teei_analytics:
  target: prod
  outputs:
    prod:
      type: postgres
      host: postgres.teei.internal
      port: 5432
      user: dbt_user
      pass: "{{ env_var('DBT_PASSWORD') }}"
      dbname: teei_platform
      schema: analytics

      # OpenLineage integration
      openlineage:
        namespace: teei.dbt
        transport:
          type: http
          url: http://openlineage-collector:5000/api/v1/lineage
          # OR use NATS:
          # type: nats
          # url: nats://nats.teei.internal:4222
          # subject: openlineage.events
```

With this config, dbt automatically emits OpenLineage events on every `dbt run` and `dbt test`.

### Success Criteria (J3)

- [ ] dbt project bootstrapped at `analytics/dbt/`
- [ ] Staging models created with freshness checks
- [ ] Marts created (dims/facts) with exposures
- [ ] Metrics registry: SROI, VIS, engagement, hours, evidence density
- [ ] Golden tests: dbt metrics match service calculators (100% within 0.01%)
- [ ] dbt docs artifact published
- [ ] CI jobs: dbt:test, dbt:run enforce quality gates
- [ ] OpenLineage integration via profiles.yml

---

## J4: Catalog UI in Cockpit

**Owner**: lineage-lead (Agents 3.7–3.8, 1.4)
**Target**: ≥12 governed datasets listed; freshness + quality badges live

### Architecture

```
apps/corp-cockpit-astro/src/
├── pages/
│   └── cockpit/[companyId]/catalog/
│       ├── index.astro              # Catalog list page (Agent 3.7)
│       └── [datasetName].astro      # Dataset detail page (Agent 3.8)
├── components/catalog/
│   ├── DatasetCard.tsx              # Card component
│   ├── FreshnessBadge.tsx           # 🟢/🟡/🔴 badge
│   ├── QualityBadge.tsx             # ✅/⚠️/❌ badge
│   ├── LineageSparkline.tsx         # Mini lineage graph (Agent 3.8)
│   └── DatasetDetailView.tsx        # Full detail view
├── api/catalog/
│   ├── datasets.ts                  # GET /api/catalog/datasets
│   └── lineage.ts                   # GET /api/catalog/lineage/:dataset
└── types/catalog.ts
```

### Agent Work Plans

#### Agent 3.7: catalog-ui-integrator-cockpit
**Task**: Create catalog list page

**index.astro** (catalog list):
```astro
---
// apps/corp-cockpit-astro/src/pages/cockpit/[companyId]/catalog/index.astro
import Layout from '@layouts/CockpitLayout.astro';
import DatasetCard from '@components/catalog/DatasetCard.tsx';
import { getDatasets } from '@api/catalog/datasets';

const { companyId } = Astro.params;
const datasets = await getDatasets(companyId);
---

<Layout title="Data Catalog">
  <div class="catalog-container">
    <header>
      <h1>Data Catalog</h1>
      <input type="search" placeholder="Search datasets..." aria-label="Search datasets" />
    </header>

    <div class="dataset-grid" role="list">
      {datasets.map(dataset => (
        <DatasetCard
          namespace={dataset.namespace}
          name={dataset.name}
          lastLoadTime={dataset.lastLoadTime}
          testPassRate={dataset.testPassRate}
          rowCount={dataset.rowCount}
          client:load
        />
      ))}
    </div>
  </div>
</Layout>

<style>
  .dataset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
</style>
```

**DatasetCard.tsx**:
```tsx
// apps/corp-cockpit-astro/src/components/catalog/DatasetCard.tsx
import { FreshnessBadge } from './FreshnessBadge';
import { QualityBadge } from './QualityBadge';

export function DatasetCard({ namespace, name, lastLoadTime, testPassRate, rowCount }) {
  const freshnessHours = (Date.now() - new Date(lastLoadTime).getTime()) / (1000 * 60 * 60);

  return (
    <div className="dataset-card" role="listitem">
      <header>
        <h3>{name}</h3>
        <p className="namespace">{namespace}</p>
      </header>

      <div className="badges">
        <FreshnessBadge hours={freshnessHours} />
        <QualityBadge passRate={testPassRate} />
      </div>

      <dl className="stats">
        <dt>Rows</dt>
        <dd>{rowCount?.toLocaleString() || 'N/A'}</dd>

        <dt>Last Load</dt>
        <dd>{new Date(lastLoadTime).toLocaleString()}</dd>
      </dl>

      <a href={`/cockpit/catalog/${name}`} className="view-details">
        View Details →
      </a>
    </div>
  );
}
```

**FreshnessBadge.tsx**:
```tsx
export function FreshnessBadge({ hours }) {
  let status, label, emoji;

  if (hours < 24) {
    status = 'fresh';
    label = `Fresh (${Math.round(hours)}h ago)`;
    emoji = '🟢';
  } else if (hours < 48) {
    status = 'stale';
    label = `Stale (${Math.round(hours)}h ago)`;
    emoji = '🟡';
  } else {
    status = 'very-stale';
    label = `Very Stale (${Math.round(hours / 24)}d ago)`;
    emoji = '🔴';
  }

  return (
    <span className={`badge badge-freshness badge-${status}`} aria-label={`Freshness: ${label}`}>
      <span aria-hidden="true">{emoji}</span> {label}
    </span>
  );
}
```

**API endpoint**: `/api/catalog/datasets.ts`
```typescript
// apps/corp-cockpit-astro/src/api/catalog/datasets.ts
import { db } from '@teei/shared-schema/db';
import { datasetProfiles } from '@teei/shared-schema';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get('companyId');

  const datasets = await db
    .select()
    .from(datasetProfiles)
    .orderBy(datasetProfiles.lastLoadTime, 'desc')
    .limit(50);

  return new Response(JSON.stringify(datasets), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**Acceptance**:
- [ ] Catalog list page at `/cockpit/[companyId]/catalog`
- [ ] Dataset cards with freshness badges (🟢 <24h, 🟡 24-48h, 🔴 >48h)
- [ ] Quality badges (✅ ≥90%, ⚠️ 80-89%, ❌ <80%)
- [ ] Search/filter datasets
- [ ] Responsive grid layout
- [ ] A11y: WCAG 2.2 AAA (keyboard nav, ARIA labels, screen reader support)

#### Agent 3.8: catalog-ui-integrator-lineage
**Task**: Add lineage sparkline + drill-through to Evidence Explorer

**[datasetName].astro** (dataset detail):
```astro
---
// apps/corp-cockpit-astro/src/pages/cockpit/[companyId]/catalog/[datasetName].astro
import Layout from '@layouts/CockpitLayout.astro';
import LineageSparkline from '@components/catalog/LineageSparkline.tsx';
import { getDatasetDetail, getLineageGraph } from '@api/catalog';

const { companyId, datasetName } = Astro.params;
const dataset = await getDatasetDetail(datasetName);
const lineage = await getLineageGraph(datasetName);
---

<Layout title={`Dataset: ${datasetName}`}>
  <div class="dataset-detail">
    <header>
      <h1>{datasetName}</h1>
      <FreshnessBadge hours={dataset.freshnessHours} />
      <QualityBadge passRate={dataset.testPassRate} />
    </header>

    <!-- Schema -->
    <section aria-labelledby="schema-heading">
      <h2 id="schema-heading">Schema ({dataset.schemaFields?.length} columns)</h2>
      <table class="schema-table">
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Nullable</th>
          </tr>
        </thead>
        <tbody>
          {dataset.schemaFields?.map(field => (
            <tr>
              <td><code>{field.name}</code></td>
              <td>{field.type}</td>
              <td>{field.nullable ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>

    <!-- Data Quality Tests -->
    <section aria-labelledby="tests-heading">
      <h2 id="tests-heading">Data Quality Tests</h2>
      <DataQualityTests datasetName={datasetName} />
    </section>

    <!-- Lineage Graph -->
    <section aria-labelledby="lineage-heading">
      <h2 id="lineage-heading">Lineage Graph</h2>
      <LineageSparkline data={lineage} client:load />

      {lineage.hasEvidenceLink && (
        <a href="/cockpit/evidence-explorer?dataset={datasetName}" class="drill-through">
          Drill-through to Evidence Explorer →
        </a>
      )}
    </section>
  </div>
</Layout>
```

**LineageSparkline.tsx** (mini DAG):
```tsx
// apps/corp-cockpit-astro/src/components/catalog/LineageSparkline.tsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export function LineageSparkline({ data }) {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = 600, height = 200;

    // Simple DAG layout: [source] → [transform] → [target]
    const nodes = data.nodes; // [{ id: 'buddy_events' }, { id: 'stg_buddy_events' }, { id: 'fact_metrics' }]
    const links = data.links; // [{ source: 'buddy_events', target: 'stg_buddy_events' }, ...]

    // D3 force simulation (simplified for sparkline)
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Render links
    svg.selectAll('.link')
      .data(links)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-width', 2);

    // Render nodes
    svg.selectAll('.node')
      .data(nodes)
      .enter().append('circle')
      .attr('class', 'node')
      .attr('r', 8)
      .attr('fill', d => d.id === data.currentDataset ? '#0066cc' : '#ccc');

    // Update positions on tick
    simulation.on('tick', () => {
      svg.selectAll('.link')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      svg.selectAll('.node')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    });
  }, [data]);

  return <svg ref={svgRef} width={600} height={200} aria-label="Lineage graph" />;
}
```

**Drill-through to Evidence Explorer**:
- Link: `/cockpit/evidence-explorer?dataset=buddy_events&metric=sroi`
- Filters Evidence Explorer to show only evidence snippets contributing to the selected metric
- Leverages existing lineage tracking from J1 (metric_lineage table)

**Acceptance**:
- [ ] Dataset detail page with schema, tests, lineage
- [ ] Lineage sparkline (mini DAG showing upstream/downstream datasets)
- [ ] Drill-through link to Evidence Explorer for datasets with metric lineage
- [ ] A11y: SVG has aria-label, keyboard navigable

### Success Criteria (J4)

- [ ] Catalog list page at `/cockpit/[companyId]/catalog`
- [ ] Dataset detail pages for ≥12 governed datasets
- [ ] Freshness badges (🟢/🟡/🔴) based on last_load_time
- [ ] Quality badges (✅/⚠️/❌) based on GE test_pass_rate (from J2)
- [ ] Lineage sparkline showing dataset→metric flow
- [ ] Drill-through to Evidence Explorer functional
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] A11y: WCAG 2.2 AAA compliance

---

## J5: Retention & Residency Policies

**Owner**: platform-lead (Agent 5.3, Team 1 Lead)
**Target**: All critical tables tagged with GDPR category + residency; TTL policies enforced

### Agent Work Plans

#### Agent 5.3: residency-policy-engineer

**Task 1: Tag datasets with GDPR categories**

Update `dataset_profiles` table (already created in J1):
```sql
-- Tagging script: scripts/tag_datasets_gdpr.sql
UPDATE dataset_profiles SET gdpr_category = 'PII', residency = 'EU,US,UK'
WHERE name IN ('users', 'program_enrollments', 'buddy_matches');

UPDATE dataset_profiles SET gdpr_category = 'Sensitive', residency = 'EU'
WHERE name IN ('kintell_sessions', 'buddy_events', 'buddy_feedback', 'evidence_snippets', 'outcome_scores');

UPDATE dataset_profiles SET gdpr_category = 'Public', residency = 'Global'
WHERE name IN ('companies', 'metrics_company_period', 'report_lineage', 'report_citations');
```

**Task 2: Define TTL policies**

Create `data_retention_policies` table:
```sql
-- packages/shared-schema/src/migrations/005_retention_policies.sql
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_namespace VARCHAR(255) NOT NULL,
  dataset_name VARCHAR(255) NOT NULL,
  gdpr_category VARCHAR(50) NOT NULL,  -- PII, Sensitive, Public
  ttl_days INTEGER NOT NULL,
  enforcement_method VARCHAR(50) NOT NULL,  -- soft_delete, hard_delete, archive
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(dataset_namespace, dataset_name)
);

-- Seed retention policies
INSERT INTO data_retention_policies (dataset_namespace, dataset_name, gdpr_category, ttl_days, enforcement_method)
VALUES
  ('teei.postgres.public', 'users', 'PII', 2555, 'soft_delete'),  -- 7 years
  ('teei.postgres.public', 'program_enrollments', 'PII', 2555, 'soft_delete'),
  ('teei.postgres.public', 'buddy_matches', 'PII', 2555, 'soft_delete'),
  ('teei.postgres.public', 'kintell_sessions', 'Sensitive', 1095, 'archive'),  -- 3 years
  ('teei.postgres.public', 'buddy_events', 'Sensitive', 1095, 'archive'),
  ('teei.postgres.public', 'buddy_feedback', 'Sensitive', 1095, 'archive'),
  ('teei.postgres.public', 'evidence_snippets', 'Sensitive', 1825, 'archive'),  -- 5 years
  ('teei.postgres.public', 'outcome_scores', 'Sensitive', 1825, 'archive'),
  ('teei.postgres.public', 'report_lineage', 'Public', 1095, 'hard_delete');  -- 3 years
```

**Task 3: DSAR hooks for selective deletion**

Integrate with existing `services/gdpr-service`:
```typescript
// services/gdpr-service/src/handlers/dsar-deletion.ts
import { db } from '@teei/shared-schema/db';
import { dataRetentionPolicies, datasetProfiles } from '@teei/shared-schema';

export async function handleDSARDeletion(userId: string): Promise<void> {
  // Get all PII/Sensitive tables
  const piiTables = await db
    .select()
    .from(datasetProfiles)
    .where(sql`gdpr_category IN ('PII', 'Sensitive')`);

  for (const table of piiTables) {
    const policy = await db
      .select()
      .from(dataRetentionPolicies)
      .where(sql`dataset_name = ${table.name}`)
      .limit(1);

    if (!policy.length) {
      logger.warn({ table: table.name }, 'No retention policy defined for PII table');
      continue;
    }

    const method = policy[0].enforcementMethod;

    if (method === 'soft_delete') {
      // Soft delete: set deleted_at flag
      await db.execute(sql`
        UPDATE ${table.name}
        SET deleted_at = NOW(), deleted_reason = 'DSAR'
        WHERE user_id = ${userId}
      `);
    } else if (method === 'hard_delete') {
      // Hard delete: permanently remove
      await db.execute(sql`
        DELETE FROM ${table.name}
        WHERE user_id = ${userId}
      `);
    } else if (method === 'archive') {
      // Archive: move to cold storage
      await archiveToS3(table.name, userId);
      await db.execute(sql`
        DELETE FROM ${table.name}
        WHERE user_id = ${userId}
      `);
    }
  }
}
```

**Task 4: Residency enforcement (row-level checks)**

For Phase 1, residency is **informational only** (tagging). Enforcement deferred to Phase 2.

Future (Phase 2):
```sql
-- Example: Enforce EU residency for kintell_sessions
ALTER TABLE kintell_sessions ADD COLUMN residency_region VARCHAR(10) DEFAULT 'EU';

-- Row-level security policy (PostgreSQL 15+)
CREATE POLICY kintell_sessions_residency_policy
  ON kintell_sessions
  FOR ALL
  USING (
    CASE
      WHEN current_setting('app.region', true) = 'EU' THEN residency_region = 'EU'
      WHEN current_setting('app.region', true) = 'US' THEN residency_region = 'US'
      ELSE true  -- Global access
    END
  );
```

**Acceptance**:
- [ ] All 12 critical tables tagged with GDPR category + residency in `dataset_profiles`
- [ ] `data_retention_policies` table created with TTL per category
- [ ] TTL policies: PII 7y, Sensitive 3-5y, Public configurable
- [ ] DSAR hooks integrated with `services/gdpr-service`
- [ ] Residency matrix documented in `/docs/data/residency_matrix.md` (J7)
- [ ] CI test: Synthetic DSAR request deletes data correctly

### Success Criteria (J5)

- [ ] 12/12 critical tables tagged (GDPR category + residency)
- [ ] TTL policies defined and seeded
- [ ] DSAR hooks functional (tested with synthetic data)
- [ ] Residency tagging complete (enforcement deferred to Phase 2)
- [ ] Runbook: `/docs/data/residency_matrix.md` (J7)

---

## J6: Data SLOs & Dashboards

**Owner**: data-eng-lead (Agent 1.4, Team 5 Lead)
**Target**: Grafana dashboard live; SLOs tracked; alerts functional

### Agent Work Plans

#### Agent 1.4: ingestion-monitor

**Task**: Create "Data Trust" Grafana dashboard

**Prometheus metrics** (export from services):
```typescript
// packages/observability/src/metrics/data-quality.ts
import { register, Counter, Gauge, Histogram } from 'prom-client';

export const datasetFreshnessGauge = new Gauge({
  name: 'teei_dataset_freshness_hours',
  help: 'Hours since dataset was last loaded',
  labelNames: ['namespace', 'dataset'],
  registers: [register],
});

export const geTestPassRateGauge = new Gauge({
  name: 'teei_ge_test_pass_rate',
  help: 'Great Expectations test pass rate (0-1)',
  labelNames: ['dataset', 'suite'],
  registers: [register],
});

export const lineageCoverageGauge = new Gauge({
  name: 'teei_lineage_coverage',
  help: 'Percentage of critical pipelines with OpenLineage events (0-1)',
  registers: [register],
});

// Update metrics periodically
setInterval(async () => {
  const datasets = await db.select().from(datasetProfiles);
  for (const dataset of datasets) {
    const freshnessHours = (Date.now() - new Date(dataset.lastLoadTime).getTime()) / (1000 * 60 * 60);
    datasetFreshnessGauge.set({ namespace: dataset.namespace, dataset: dataset.name }, freshnessHours);

    const passRate = parseFloat(dataset.testPassRate || '0') / 100;
    geTestPassRateGauge.set({ dataset: dataset.name, suite: 'all' }, passRate);
  }

  // Lineage coverage
  const totalPipelines = 4;  // impact-in, reporting, q2q-ai, analytics
  const pipelinesWithLineage = await db.execute(sql`
    SELECT COUNT(DISTINCT job_name) FROM lineage_events WHERE event_time >= NOW() - INTERVAL '24 hours'
  `);
  lineageCoverageGauge.set(pipelinesWithLineage.rows[0].count / totalPipelines);
}, 60000);  // Every 1 minute
```

**Grafana dashboard JSON**:
```json
{
  "dashboard": {
    "title": "Data Trust",
    "panels": [
      {
        "title": "Freshness SLO (≥95% datasets <24h)",
        "type": "stat",
        "targets": [{
          "expr": "sum(teei_dataset_freshness_hours < 24) / count(teei_dataset_freshness_hours)"
        }],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 0.85, "color": "yellow" },
                { "value": 0.95, "color": "green" }
              ]
            },
            "unit": "percentunit"
          }
        }
      },
      {
        "title": "Test Pass Rate SLO (≥90%)",
        "type": "stat",
        "targets": [{
          "expr": "avg(teei_ge_test_pass_rate)"
        }],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 0.85, "color": "yellow" },
                { "value": 0.90, "color": "green" }
              ]
            },
            "unit": "percentunit"
          }
        }
      },
      {
        "title": "Lineage Coverage SLO (≥90%)",
        "type": "stat",
        "targets": [{
          "expr": "teei_lineage_coverage"
        }],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 0.85, "color": "yellow" },
                { "value": 0.90, "color": "green" }
              ]
            },
            "unit": "percentunit"
          }
        }
      },
      {
        "title": "Anomaly Alerts (7d)",
        "type": "timeseries",
        "targets": [{
          "expr": "sum(rate(teei_dq_anomaly_alerts_total[1h]))"
        }]
      },
      {
        "title": "DSAR Queue",
        "type": "stat",
        "targets": [{
          "expr": "teei_dsar_pending_requests"
        }]
      }
    ]
  }
}
```

**Alertmanager rules**:
```yaml
# observability/prometheus/rules/data_trust.yml
groups:
  - name: data_trust_slos
    interval: 5m
    rules:
      # Freshness SLO burn rate
      - alert: FreshnessSLOBurnRate
        expr: sum(teei_dataset_freshness_hours < 24) / count(teei_dataset_freshness_hours) < 0.95
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Freshness SLO burn rate high ({{ $value }})"
          description: "Less than 95% of datasets are fresh (<24h old)"

      # Test pass rate SLO
      - alert: GETestPassRateLow
        expr: avg(teei_ge_test_pass_rate) < 0.90
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "GE test pass rate below SLO ({{ $value }})"
          description: "Great Expectations test pass rate is below 90% target"

      # Lineage coverage SLO
      - alert: LineageCoverageLow
        expr: teei_lineage_coverage < 0.90
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Lineage coverage below SLO ({{ $value }})"
          description: "OpenLineage coverage is below 90% target"
```

**Acceptance**:
- [ ] Grafana dashboard: "Data Trust" at `/observability/grafana/dashboards/data_trust.json`
- [ ] Panels: Freshness SLO, Test Pass Rate SLO, Lineage Coverage SLO, Anomaly Alerts, DSAR Queue
- [ ] Prometheus metrics: `teei_dataset_freshness_hours`, `teei_ge_test_pass_rate`, `teei_lineage_coverage`
- [ ] Alertmanager rules: Burn-rate alerts for all 3 SLOs
- [ ] Alerts routed to on-call (PagerDuty/OpsGenie)
- [ ] SLO badges in Catalog UI (link to Grafana)

### Success Criteria (J6)

- [ ] Grafana dashboard live and accessible
- [ ] SLOs tracked: freshness <24h (≥95%), test pass ≥90%, lineage coverage ≥90%
- [ ] Alerts functional (tested with synthetic SLO violations)
- [ ] SLO badges displayed in Catalog UI

---

## J7: Docs & Runbooks

**Owner**: All Leads, Team 5
**Target**: 4 runbooks + readout published

### Documentation Structure

```
/docs/data/
├── ge_playbook.md             # Great Expectations usage (Team 2)
├── openlineage_guide.md       # OpenLineage instrumentation (Team 3)
├── dbt_standards.md           # dbt conventions (Team 4)
└── residency_matrix.md        # GDPR/residency policies (Team 5)

/reports/
└── worker5_data_trust_readout.md  # Progress tracking (All Leads)
```

### Runbook Outlines

#### ge_playbook.md (Team 2: dq-lead + Agents 2.1–2.5)
**Sections**:
1. **Introduction**: What is Great Expectations, why we use it
2. **Project Structure**: Checkpoints, expectations, plugins
3. **Adding a New Suite**:
   - Step 1: Create expectation suite JSON
   - Step 2: Add to checkpoint YAML
   - Step 3: Run `pnpm dq:ci` locally
   - Step 4: Commit and push (CI enforces)
4. **Custom Expectations**: How to write plugins (e.g., `expect_sroi_in_range`)
5. **CI Integration**: How `pnpm dq:ci` works, interpreting results
6. **Troubleshooting**: Common failures and fixes
7. **FAQs**

#### openlineage_guide.md (Team 3: lineage-lead + Agents 3.1–3.6)
**Sections**:
1. **Introduction**: What is OpenLineage, benefits for lineage tracking
2. **Event Types**: START, RUNNING, COMPLETE, FAIL, DATASET
3. **Adding OL Emitters to a Service**:
   - Step 1: Install `@teei/openlineage` package
   - Step 2: Initialize emitter in service index.ts
   - Step 3: Emit START/COMPLETE events around pipeline logic
   - Step 4: Test locally (check NATS subject)
4. **Column-Level Lineage**: How to add `columnLineage` facets
5. **Sinks**: ClickHouse, PostgreSQL, retention policies
6. **Monitoring**: Grafana dashboard for OL event rate, sink lag
7. **Troubleshooting**: Event not showing up, sink backlog
8. **FAQs**

#### dbt_standards.md (Team 4: semantics-lead + Agents 4.1–4.6)
**Sections**:
1. **Introduction**: dbt as semantic layer
2. **Project Structure**: staging, marts, metrics, tests
3. **Naming Conventions**:
   - Staging: `stg_<source>_<table>`
   - Marts: `dim_<entity>`, `fact_<entity>`
   - Metrics: `<metric_name>.yml`
4. **Freshness Checks**: How to configure `warn_after`, `error_after`
5. **Golden Tests**: Writing tests to compare dbt metrics vs service calculators
6. **Metrics Registry**: YAML format, dimensions, filters, SLAs
7. **dbt Docs**: Generating and publishing docs
8. **OpenLineage Integration**: How dbt auto-emits OL events
9. **FAQs**

#### residency_matrix.md (Team 5: platform-lead + Agent 5.3)
**Sections**:
1. **Introduction**: GDPR compliance, data residency requirements
2. **GDPR Categories**:
   - **PII**: Personally Identifiable Information (users, program_enrollments, buddy_matches)
   - **Sensitive**: Special category data (kintell_sessions, buddy_feedback, evidence_snippets)
   - **Public**: Non-sensitive data (companies, metrics, reports)
3. **Residency Zones**: EU, US, UK, Global
4. **TTL Policies**:
   - PII: 7 years (2555 days)
   - Sensitive: 3-5 years (1095-1825 days)
   - Public: Configurable (default 3 years)
5. **Enforcement Methods**: soft_delete, hard_delete, archive
6. **DSAR Hooks**: How to trigger selective deletion
7. **Table Reference**: Matrix showing all 12 critical tables with their GDPR category, residency, TTL
8. **FAQs**

#### worker5_data_trust_readout.md (All Leads)
**Updates**:
- Progress tracking (update after each milestone)
- Coverage tables (GE suites, OL coverage, dbt metrics)
- Screenshots (Catalog UI, Grafana dashboards, lineage graphs)
- Before/after comparisons
- Lessons learned
- Next steps (Phase 2 roadmap)

### Success Criteria (J7)

- [ ] 4 runbooks published: ge_playbook.md, openlineage_guide.md, dbt_standards.md, residency_matrix.md
- [ ] Each runbook includes: intro, step-by-step guides, examples, troubleshooting, FAQs
- [ ] worker5_data_trust_readout.md updated with ≥90% coverage evidence
- [ ] Screenshots included: Catalog UI, lineage graphs, Grafana dashboards
- [ ] All runbooks linked from main `/docs/README.md`

---

## Overall Success Criteria (J2-J7)

- [ ] **J2**: 8/8 GE suites, ≥90% pass rate, `pnpm dq:ci` enforced
- [ ] **J3**: dbt semantic layer, golden tests pass, docs published
- [ ] **J4**: Catalog UI live, ≥12 datasets, lineage sparkline, drill-through functional
- [ ] **J5**: GDPR tagging complete, TTL policies enforced, DSAR hooks tested
- [ ] **J6**: Data Trust Grafana dashboard, SLO alerts functional
- [ ] **J7**: 4 runbooks + readout published, screenshots included

---

**Next**: Execute Phase 1 (Foundation) for all slices in parallel.
