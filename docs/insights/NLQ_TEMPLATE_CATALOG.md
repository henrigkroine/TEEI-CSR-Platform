# NLQ Template Catalog

**Complete reference for all available metric templates, example questions, and custom template creation**

---

## Table of Contents

- [Overview](#overview)
- [Template Categories](#template-categories)
- [Impact Metrics](#impact-metrics)
- [Financial Metrics](#financial-metrics)
- [Engagement Metrics](#engagement-metrics)
- [Outcome Metrics](#outcome-metrics)
- [Volunteer Metrics](#volunteer-metrics)
- [Trend Analysis Templates](#trend-analysis-templates)
- [Benchmarking Templates](#benchmarking-templates)
- [Creating Custom Templates](#creating-custom-templates)
- [Template Performance Characteristics](#template-performance-characteristics)

---

## Overview

The NLQ service uses **template-based query generation** for security and performance. Only questions that match approved templates can be executed.

### Template Structure

Each template includes:

- **SQL Template**: Parameterized SQL with placeholders (`{{companyId}}`, `{{startDate}}`, etc.)
- **Allowed Parameters**: Time ranges, groupings, filters
- **Security Constraints**: Table whitelist, PII exclusion, tenant isolation
- **Performance Hints**: Complexity, result limits, cache TTL
- **Example Questions**: Sample natural language questions

### Current Template Count

**Total**: 10 templates across 5 categories

| Category | Templates | Description |
|----------|-----------|-------------|
| **Impact** | 3 | SROI, VIS, cohort benchmarking |
| **Financial** | 1 | Quarterly SROI comparison |
| **Engagement** | 1 | Participant sessions and engagement |
| **Outcomes** | 4 | Outcome scores, trends, integration, job readiness |
| **Volunteers** | 1 | Volunteer activity metrics |

---

## Template Categories

### 1. Impact Metrics

Measure social and environmental impact.

- SROI (Social Return on Investment)
- VIS (Volunteer Impact Score)
- Cohort SROI Benchmark

### 2. Financial Metrics

Financial performance and cost-effectiveness.

- Quarterly SROI Comparison

### 3. Engagement Metrics

Participant and stakeholder engagement.

- Participant Engagement Metrics

### 4. Outcome Metrics

Qualitative-to-quantitative (Q2Q) outcome measurement.

- Outcome Scores by Dimension
- Monthly Outcome Trends
- Integration Scores
- Job Readiness Scores

### 5. Volunteer Metrics

Volunteer activity and contributions.

- Volunteer Activity Metrics

---

## Impact Metrics

### 1. SROI Ratio

**Template ID**: `sroi_ratio`

**Category**: Impact

**Description**: Calculate Social Return on Investment ratio for a given time period.

#### Allowed Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `timeRange` | `last_30d`, `last_90d`, `last_quarter`, `ytd`, `last_year`, `custom` | `last_quarter` |
| `groupBy` | None | N/A |
| `limit` | 1-100 | 10 |

#### Security

- **Tenant Filter**: Required (enforces `company_id`)
- **Allowed Tables**: `metrics_company_period`
- **Denied Columns**: None
- **Max Time Window**: 365 days

#### Performance

- **Complexity**: Low
- **Max Result Rows**: 100
- **Cache TTL**: 3600s (1 hour)

#### Example Questions

```
What is our SROI for last quarter?
Show me SROI trend for the past year
Calculate SROI for Q1 2025
What was our social return on investment in 2024?
```

#### SQL Template

```sql
SELECT
  company_id,
  period_start,
  period_end,
  sroi_ratio,
  participants_count,
  volunteers_count
FROM metrics_company_period
WHERE company_id = {{companyId}}
  AND period_start >= {{startDate}}
  AND period_end <= {{endDate}}
ORDER BY period_start DESC
LIMIT {{limit}}
```

#### Sample Response

```json
{
  "data": [
    {
      "company_id": "550e8400-e29b-41d4-a716-446655440000",
      "period_start": "2024-10-01T00:00:00.000Z",
      "period_end": "2024-12-31T23:59:59.999Z",
      "sroi_ratio": 3.42,
      "participants_count": 250,
      "volunteers_count": 45
    }
  ]
}
```

---

### 2. VIS Score

**Template ID**: `vis_score`

**Category**: Impact

**Description**: Aggregate Volunteer Impact Score (VIS) for volunteers.

#### Allowed Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `timeRange` | `last_30d`, `last_90d`, `last_quarter`, `ytd`, `custom` | `last_30d` |
| `limit` | 1-100 | 10 |

#### Security

- **Tenant Filter**: Required
- **Allowed Tables**: `metrics_company_period`
- **Denied Columns**: None
- **Max Time Window**: 365 days

#### Performance

- **Complexity**: Low
- **Max Result Rows**: 100
- **Cache TTL**: 3600s (1 hour)

#### Example Questions

```
What is our average VIS score?
Show VIS trend for last 3 months
How has VIS changed this quarter?
What is our volunteer impact score?
```

#### SQL Template

```sql
SELECT
  company_id,
  period_start,
  period_end,
  vis_score,
  volunteers_count
FROM metrics_company_period
WHERE company_id = {{companyId}}
  AND period_start >= {{startDate}}
  AND period_end <= {{endDate}}
ORDER BY period_start DESC
LIMIT {{limit}}
```

---

### 3. Cohort SROI Benchmark

**Template ID**: `cohort_sroi_benchmark`

**Category**: Impact

**Description**: Compare SROI against industry/region/size cohorts with k-anonymity (k≥7).

#### Allowed Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `timeRange` | `last_quarter`, `ytd`, `last_year` | `last_quarter` |
| `cohortType` | `industry`, `region`, `company_size` | `industry` |
| `limit` | 1-20 | 5 |

#### Security

- **Tenant Filter**: NOT required (aggregate benchmark data)
- **Allowed Tables**: `benchmarks_cohort_aggregates`
- **Denied Columns**: `company_id`, `company_name` (anonymized)
- **Max Time Window**: 365 days
- **K-Anonymity**: Enforced (k≥7)

#### Performance

- **Complexity**: Medium
- **Max Result Rows**: 20
- **Cache TTL**: 14400s (4 hours)

#### Example Questions

```
How does our SROI compare to industry peers?
Show benchmark data for similar companies
What is the median SROI for our region?
Compare our SROI to companies our size
```

#### SQL Template

```sql
-- NOTE: K-anonymity validation (k≥7) enforced before execution
SELECT
  cohort_type,
  cohort_name,
  percentile_25,
  percentile_50,
  percentile_75,
  sample_size
FROM benchmarks_cohort_aggregates
WHERE metric_name = 'sroi_ratio'
  AND cohort_type = {{cohortType}}
  AND period_start >= {{startDate}}
  AND period_end <= {{endDate}}
  AND sample_size >= 7  -- K-anonymity threshold
LIMIT {{limit}}
```

---

## Financial Metrics

### 1. Quarterly SROI Comparison

**Template ID**: `sroi_quarterly_comparison`

**Category**: Financial

**Description**: Quarter-over-quarter SROI comparison.

#### Allowed Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `timeRange` | `ytd`, `last_year`, `custom` | `ytd` |
| `limit` | 1-8 | 4 |

#### Security

- **Tenant Filter**: Required
- **Allowed Tables**: `metrics_company_period`
- **Max Time Window**: 730 days (2 years)

#### Performance

- **Complexity**: Low
- **Max Result Rows**: 8
- **Cache TTL**: 7200s (2 hours)

#### Example Questions

```
Compare SROI across quarters
Show quarterly SROI trends
How does this quarter compare to last quarter?
What is our quarterly SROI breakdown?
```

#### SQL Template

```sql
SELECT
  DATE_TRUNC('quarter', period_start) as quarter,
  AVG(sroi_ratio) as avg_sroi,
  SUM(participants_count) as total_participants,
  SUM(volunteers_count) as total_volunteers
FROM metrics_company_period
WHERE company_id = {{companyId}}
  AND period_start >= {{startDate}}
  AND period_end <= {{endDate}}
GROUP BY DATE_TRUNC('quarter', period_start)
ORDER BY quarter DESC
LIMIT {{limit}}
```

---

## Engagement Metrics

### 1. Participant Engagement

**Template ID**: `participant_engagement`

**Category**: Engagement

**Description**: Active participants, sessions, and engagement rates.

#### Allowed Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `timeRange` | `last_30d`, `last_90d`, `ytd`, `custom` | `last_30d` |
| `limit` | 1-100 | 10 |

#### Security

- **Tenant Filter**: Required
- **Allowed Tables**: `metrics_company_period`
- **Max Time Window**: 365 days

#### Performance

- **Complexity**: Low
- **Max Result Rows**: 100
- **Cache TTL**: 3600s (1 hour)

#### Example Questions

```
How many active participants do we have?
Show participant engagement over time
What is our session count for last quarter?
Show me participant activity trends
```

#### SQL Template

```sql
SELECT
  period_start,
  period_end,
  participants_count,
  sessions_count,
  ROUND(sessions_count::decimal / NULLIF(participants_count, 0), 2) as sessions_per_participant
FROM metrics_company_period
WHERE company_id = {{companyId}}
  AND period_start >= {{startDate}}
  AND period_end <= {{endDate}}
ORDER BY period_start DESC
LIMIT {{limit}}
```

---

## Outcome Metrics

### 1. Outcome Scores by Dimension

**Template ID**: `outcome_scores_by_dimension`

**Category**: Outcomes

**Description**: Average outcome scores across dimensions (confidence, belonging, etc.).

#### Allowed Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `timeRange` | `last_7d`, `last_30d`, `last_90d`, `custom` | `last_30d` |
| `groupBy` | `outcome_dimension` | N/A |
| `limit` | 1-10 | 10 |

#### Security

- **Tenant Filter**: Required (via JOIN with users)
- **Allowed Tables**: `outcome_scores`, `users`
- **Denied Columns**: `email`, `phone`, `address`
- **Max Time Window**: 180 days

#### Performance

- **Complexity**: Medium
- **Max Result Rows**: 10
- **Cache TTL**: 1800s (30 minutes)

#### Example Questions

```
What are our outcome scores by dimension?
Show me confidence and belonging scores for last month
How do our outcome dimensions compare?
What are the average outcome scores?
```

#### SQL Template

```sql
SELECT
  dimension,
  AVG(score) as avg_score,
  COUNT(*) as sample_size,
  STDDEV(score) as std_dev
FROM outcome_scores
WHERE text_type = 'feedback'
  AND created_at >= {{startDate}}
  AND created_at <= {{endDate}}
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = outcome_scores.user_id
      AND users.company_id = {{companyId}}
  )
GROUP BY dimension
ORDER BY avg_score DESC
LIMIT {{limit}}
```

#### Sample Response

```json
{
  "data": [
    {
      "dimension": "confidence",
      "avg_score": 7.8,
      "sample_size": 245,
      "std_dev": 1.2
    },
    {
      "dimension": "belonging",
      "avg_score": 7.5,
      "sample_size": 238,
      "std_dev": 1.4
    }
  ]
}
```

---

### 2. Monthly Outcome Trends

**Template ID**: `outcome_trends_monthly`

**Category**: Outcomes

**Description**: Month-over-month outcome dimension trends.

#### Allowed Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `timeRange` | `last_90d`, `last_quarter`, `ytd`, `last_year`, `custom` | `last_90d` |
| `groupBy` | `outcome_dimension` | N/A |
| `limit` | 1-60 | 30 |

#### Security

- **Tenant Filter**: Required
- **Allowed Tables**: `outcome_scores`, `users`
- **Max Time Window**: 365 days

#### Performance

- **Complexity**: Medium
- **Max Result Rows**: 60
- **Cache TTL**: 7200s (2 hours)

#### Example Questions

```
Show monthly outcome trends for last year
How have outcomes changed month-over-month?
What are the trends in confidence scores?
Show outcome dimension trends by month
```

#### SQL Template

```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  dimension,
  AVG(score) as avg_score,
  COUNT(*) as sample_size
FROM outcome_scores
WHERE text_type = 'feedback'
  AND created_at >= {{startDate}}
  AND created_at <= {{endDate}}
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = outcome_scores.user_id
      AND users.company_id = {{companyId}}
  )
GROUP BY DATE_TRUNC('month', created_at), dimension
ORDER BY month DESC, dimension
LIMIT {{limit}}
```

---

### 3. Integration Scores

**Template ID**: `integration_scores`

**Category**: Outcomes

**Description**: Average language level and integration scores.

#### Allowed Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `timeRange` | `last_30d`, `last_90d`, `ytd`, `custom` | `last_30d` |
| `limit` | 1-100 | 10 |

#### Example Questions

```
What is our average language level?
Show integration score trends
How has language proficiency improved?
What are our integration metrics?
```

#### SQL Template

```sql
SELECT
  period_start,
  period_end,
  avg_language_level,
  avg_integration_score
FROM metrics_company_period
WHERE company_id = {{companyId}}
  AND period_start >= {{startDate}}
  AND period_end <= {{endDate}}
ORDER BY period_start DESC
LIMIT {{limit}}
```

---

### 4. Job Readiness Scores

**Template ID**: `job_readiness_scores`

**Category**: Outcomes

**Description**: Average job readiness scores over time.

#### Allowed Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `timeRange` | `last_30d`, `last_90d`, `ytd`, `custom` | `last_30d` |
| `limit` | 1-100 | 10 |

#### Example Questions

```
What is our job readiness score?
Show job readiness trend for last quarter
How has job readiness improved?
What are our employment readiness metrics?
```

#### SQL Template

```sql
SELECT
  period_start,
  period_end,
  avg_job_readiness
FROM metrics_company_period
WHERE company_id = {{companyId}}
  AND period_start >= {{startDate}}
  AND period_end <= {{endDate}}
ORDER BY period_start DESC
LIMIT {{limit}}
```

---

## Volunteer Metrics

### 1. Volunteer Activity

**Template ID**: `volunteer_activity`

**Category**: Volunteers

**Description**: Volunteer counts, hours, and activity breakdown.

#### Allowed Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `timeRange` | `last_30d`, `last_90d`, `ytd`, `custom` | `last_30d` |
| `limit` | 1-100 | 10 |

#### Security

- **Tenant Filter**: Required
- **Allowed Tables**: `metrics_company_period`
- **Max Time Window**: 365 days

#### Performance

- **Complexity**: Low
- **Max Result Rows**: 100
- **Cache TTL**: 3600s (1 hour)

#### Example Questions

```
How many volunteers were active last month?
Show volunteer activity trend
What is our volunteer count for Q1?
Show me volunteer engagement metrics
```

#### SQL Template

```sql
SELECT
  period_start,
  period_end,
  volunteers_count
FROM metrics_company_period
WHERE company_id = {{companyId}}
  AND period_start >= {{startDate}}
  AND period_end <= {{endDate}}
ORDER BY period_start DESC
LIMIT {{limit}}
```

---

## Creating Custom Templates

### Template Development Process

1. **Define Use Case**: Identify metric and business requirement
2. **Write SQL**: Create parameterized SQL template
3. **Add Security Constraints**: Define allowed tables, columns, joins
4. **Set Performance Hints**: Complexity, row limits, cache TTL
5. **Test Safety**: Run through 12-point validation
6. **Add Examples**: Provide 3-5 example questions
7. **Submit for Approval**: Review and approval by security team

### Template Schema

```typescript
interface MetricTemplate {
  // Identification
  id: string;
  displayName: string;
  description: string;
  category: 'impact' | 'financial' | 'engagement' | 'outcomes' | 'volunteers';

  // Query templates
  sqlTemplate: string;
  chqlTemplate?: string;  // Optional ClickHouse version

  // Allowed parameters
  allowedTimeRanges: Array<'last_7d' | 'last_30d' | 'last_90d' | 'last_quarter' | 'ytd' | 'last_year' | 'custom'>;
  allowedGroupBy?: Array<'program' | 'location' | 'demographic' | 'volunteer' | 'outcome_dimension'>;
  allowedFilters?: Record<string, string[]>;
  maxTimeWindowDays: number;

  // Security constraints
  requiresTenantFilter: boolean;
  allowedJoins: string[];
  deniedColumns: string[];

  // Performance hints
  estimatedComplexity: 'low' | 'medium' | 'high';
  maxResultRows: number;
  cacheTtlSeconds: number;

  // Metadata
  exampleQuestions: string[];
  tags: string[];
}
```

### Example: Creating a Custom Template

```typescript
// File: services/insights-nlq/src/templates/custom-metrics.ts

export const customTemplate: MetricTemplate = {
  id: 'program_effectiveness',
  displayName: 'Program Effectiveness Score',
  description: 'Calculate effectiveness score for programs based on outcomes',
  category: 'outcomes',

  sqlTemplate: `
    SELECT
      program_name,
      AVG(outcome_score) as avg_effectiveness,
      COUNT(*) as participant_count,
      SUM(hours) as total_hours
    FROM program_metrics
    WHERE company_id = {{companyId}}
      AND program_start >= {{startDate}}
      AND program_end <= {{endDate}}
      {{#if programFilter}}
      AND program_name = {{programFilter}}
      {{/if}}
    GROUP BY program_name
    ORDER BY avg_effectiveness DESC
    LIMIT {{limit}}
  `,

  allowedTimeRanges: ['last_90d', 'last_quarter', 'ytd', 'custom'],
  allowedGroupBy: ['program'],
  allowedFilters: {
    program: ['education', 'health', 'employment'],
  },
  maxTimeWindowDays: 365,

  requiresTenantFilter: true,
  allowedJoins: [],
  deniedColumns: ['participant_name', 'email'],

  estimatedComplexity: 'medium',
  maxResultRows: 50,
  cacheTtlSeconds: 7200,

  exampleQuestions: [
    'What is the effectiveness of our programs?',
    'Show program effectiveness for last quarter',
    'Which programs have the highest outcome scores?',
  ],

  tags: ['programs', 'effectiveness', 'outcomes'],
};
```

### Adding Template to Catalog

```typescript
// File: services/insights-nlq/src/templates/metric-catalog.ts

import { customTemplate } from './custom-metrics.js';

export const METRIC_CATALOG: MetricTemplate[] = [
  // ... existing templates
  customTemplate,
];
```

### Testing Custom Template

```bash
# Test template SQL
psql $DATABASE_URL -c "
SELECT
  program_name,
  AVG(outcome_score) as avg_effectiveness,
  COUNT(*) as participant_count
FROM program_metrics
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
  AND program_start >= '2024-10-01'
  AND program_end <= '2024-12-31'
GROUP BY program_name
ORDER BY avg_effectiveness DESC
LIMIT 10;
"

# Test via NLQ API
curl -X POST http://localhost:3009/v1/nlq/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the effectiveness of our programs?",
    "companyId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## Template Performance Characteristics

### Query Complexity Matrix

| Complexity | Characteristics | Example Templates | Typical Latency |
|------------|----------------|-------------------|-----------------|
| **Low** | Single table, simple aggregation | SROI, VIS, Volunteer Activity | < 500ms |
| **Medium** | JOIN, date grouping, multi-dimension | Outcome Scores, Engagement | 500-1500ms |
| **High** | Multiple JOINs, complex aggregation | Cohort Benchmarking | 1500-3000ms |

### Cache TTL Recommendations

| Data Volatility | Recommended TTL | Example Metrics |
|-----------------|----------------|-----------------|
| **Real-time** | 300s (5 min) | Active session counts |
| **Hourly** | 1800s (30 min) | Hourly engagement |
| **Daily** | 3600s (1 hour) | Daily metrics, SROI |
| **Weekly** | 7200s (2 hours) | Weekly trends |
| **Monthly** | 14400s (4 hours) | Monthly reports, benchmarks |
| **Quarterly** | 86400s (24 hours) | Quarterly comparisons |

### Performance Optimization Tips

1. **Add indexes**: Create indexes on frequently filtered columns
2. **Limit result rows**: Use appropriate `LIMIT` values
3. **Use ClickHouse**: Enable for large dataset analytics
4. **Pre-aggregate**: Create materialized views for complex calculations
5. **Cache aggressively**: Use longer TTL for stable metrics

---

## Template Metadata

### Template Tags

Tags help with discovery and filtering:

- `sroi` - Social Return on Investment
- `vis` - Volunteer Impact Score
- `outcomes` - Outcome measurement
- `volunteers` - Volunteer metrics
- `engagement` - Participant engagement
- `trends` - Time-series analysis
- `benchmark` - Cohort comparisons
- `k-anonymity` - K-anonymity enforced

### Template Versioning

Templates support versioning for safe updates:

```sql
UPDATE nlq_templates
SET version = version + 1,
    updated_at = NOW()
WHERE template_name = 'sroi_ratio';
```

---

## Support & Contribution

### Request New Template

To request a new metric template:

1. Open GitHub issue with label `template-request`
2. Provide:
   - Business use case
   - Example questions (3-5)
   - Expected data sources (tables)
   - Desired filters/groupings
   - Performance requirements

### Contribute Template

1. Fork repository
2. Create template following schema
3. Add tests for safety validation
4. Submit pull request with:
   - Template code
   - Example questions
   - Test cases
   - Documentation

---

**End of Template Catalog** | [Back to Quick Start](./NLQ_QUICK_START.md)
