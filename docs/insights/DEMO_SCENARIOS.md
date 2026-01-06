# NLQ Demo Scenarios

This document outlines 5 realistic demo scenarios for showcasing the Natural Language Query (NLQ) capabilities of the TEEI CSR Platform. Each scenario is designed for a specific user persona and highlights different features of the NLQ system.

---

## Scenario 1: Executive Dashboard Review

**Persona**: Sarah Chen, Chief Impact Officer at TechForGood Inc
**Context**: Quarterly board meeting preparation
**Goal**: Understand overall program performance for board presentation
**Duration**: 3-5 minutes

### User Journey

1. **Initial Question**
   - Sarah asks: _"What is our SROI for last quarter?"_
   - System responds with: **SROI of 6.23:1** for Q4 2025
   - Visualization: Single stat card with trend indicator (↑5.2% vs Q3)
   - Confidence: 95% (high)

2. **Follow-up Deep Dive**
   - Sarah follows up: _"Show me SROI trend for the past year"_
   - System displays: Line chart with 12 monthly data points
   - Insight: 10.3% improvement from 5.82 to 6.42
   - Lineage: Shows data sourced from `metrics_company_period` table

3. **Comparative Analysis**
   - Sarah asks: _"Compare SROI across quarters"_
   - System shows: Grouped bar chart with 4 quarters
   - Key finding: Steady quarter-over-quarter growth
   - Export: Sarah downloads chart as PNG for board deck

### Key Features Demonstrated

- **High-confidence simple queries** (95% confidence)
- **Trend analysis** with time series visualization
- **Period-over-period comparisons**
- **Evidence lineage** showing data provenance
- **Export capabilities** for executive presentations
- **Conversation continuity** (follow-up questions in context)

### Expected Outcome

Sarah has quantifiable metrics for the board: SROI growth trajectory, participant/volunteer counts, and visual evidence of program effectiveness. She exports 3 charts and the underlying data for her presentation.

### Demo Tips

- Emphasize the **speed** (queries return in < 2.5 seconds)
- Highlight **confidence scores** (95%+ for simple metrics)
- Show **lineage visualization** to build trust in data quality
- Demonstrate **natural language** (no SQL knowledge required)

---

## Scenario 2: Program Analyst Investigation

**Persona**: Marcus Johnson, CSR Analytics Manager at Global Finance Corp
**Context**: Monthly program review and optimization
**Goal**: Identify trends in outcome dimensions to optimize program interventions
**Duration**: 5-7 minutes

### User Journey

1. **Outcome Analysis**
   - Marcus asks: _"What are our outcome scores by dimension?"_
   - System returns: Bar chart showing 5 dimensions
   - Top performers: Confidence (0.82), Belonging (0.82)
   - Growth opportunity: Language proficiency (0.75)
   - Confidence: 89% (medium-high)

2. **Trend Identification**
   - Marcus follows up: _"How have outcomes changed month-over-month?"_
   - System displays: Multi-line chart showing 3 months × 5 dimensions
   - Insight: All dimensions trending upward (2-3% monthly growth)
   - Confidence: 87% (medium-high due to data variance)

3. **Segment Deep Dive**
   - Marcus asks: _"Show monthly outcome trends for last year"_
   - System shows: 12 months × 5 dimensions = 60 data points
   - Pattern identified: Seasonal dip in summer, recovery in fall
   - Lineage: Shows Q2Q pipeline → outcome_scores table → user filtering

4. **Data Quality Check**
   - Marcus hovers over data points to see sample sizes
   - Notices: Confidence dimension has 342 samples (high quality)
   - Sees: Language dimension has 329 samples (also robust)
   - Trusts: All dimensions have n > 250 for statistical validity

### Key Features Demonstrated

- **Multi-dimensional outcome analysis**
- **Complex trend queries** (12 months × 5 dimensions)
- **Confidence scoring** with explainability
- **Lineage tracing** through Q2Q AI pipeline
- **Sample size transparency** for statistical rigor
- **Interactive exploration** (hover for details)

### Expected Outcome

Marcus identifies that language proficiency scores, while improving, lag other dimensions. He recommends allocating more resources to language programs and tracking progress monthly.

### Demo Tips

- Show **Q2Q lineage** (feedback → AI classification → outcome scores)
- Emphasize **data quality indicators** (sample sizes, confidence levels)
- Demonstrate **multi-series visualizations** (up to 5 dimensions)
- Highlight **seasonality detection** (summer dip pattern)

---

## Scenario 3: Volunteer Program Manager

**Persona**: Elena Rodriguez, Volunteer Engagement Lead at Nordic Energy Solutions
**Context**: Planning volunteer recruitment campaign
**Goal**: Understand volunteer activity trends and capacity needs
**Duration**: 3-4 minutes

### User Journey

1. **Current State**
   - Elena asks: _"How many volunteers were active last month?"_
   - System responds: **412 active volunteers** in October 2025
   - Trend: ↑3.8% from September
   - Confidence: 92% (high)

2. **Impact Assessment**
   - Elena follows up: _"What is our average VIS score and how has it changed?"_
   - System shows: VIS improved from 81.2 to 83.8 over 3 months
   - Average: 82.5 (strong performance)
   - Insight: Volunteers are becoming more effective over time

3. **Capacity Planning**
   - Elena asks: _"Show volunteer activity trend for last 6 months"_
   - System displays: Line chart showing volunteer counts
   - Pattern: Steady 2% monthly growth (385 → 445)
   - Projection: At current growth, will hit 500 volunteers by Q1 2026

4. **Session Analysis**
   - Elena asks: _"Show participant engagement over time for last 6 months"_
   - System shows: Combo chart (participants + sessions per participant)
   - Finding: Sessions per participant improved 2.69 → 2.81
   - Conclusion: Volunteers are delivering more consistent support

### Key Features Demonstrated

- **Volunteer-specific metrics** (counts, VIS, activity trends)
- **Growth projections** based on historical trends
- **Engagement depth** (sessions per participant ratio)
- **Time series analysis** (6-12 month trends)
- **Actionable insights** for planning (recruitment targets)

### Expected Outcome

Elena confirms volunteer capacity is growing steadily but should accelerate recruitment to meet increasing participant demand. She sets a target of 500 volunteers by Q1 2026 and plans a campaign.

### Demo Tips

- Focus on **volunteer effectiveness** (VIS scores)
- Show **growth trends** (2% monthly increase)
- Demonstrate **ratio calculations** (sessions per volunteer)
- Highlight **planning utility** (data-driven targets)

---

## Scenario 4: Compliance Officer Review

**Persona**: David Park, Data Governance Manager at Healthcare Innovations Ltd
**Context**: Quarterly compliance audit
**Goal**: Verify data lineage and ensure GDPR compliance in reporting
**Duration**: 4-5 minutes

### User Journey

1. **Query Submission**
   - David asks: _"What are our outcome scores by dimension?"_
   - System classifies intent and performs 12-point safety check
   - Safety checks pass: ✓ Tenant isolation, ✓ PII exclusion, ✓ Row limits

2. **Lineage Verification**
   - David clicks "Show Lineage" button
   - System displays: Directed acyclic graph (DAG)
   - Nodes visible:
     - `outcome_scores` table (source)
     - `users` table (tenant filter via EXISTS join)
     - Aggregation calculation (AVG, COUNT)
     - Final result (5 dimensions, n=1616)

3. **Safety Audit**
   - David reviews safety check results:
     - ✓ SQL injection prevention (no malicious patterns)
     - ✓ Table whitelist enforcement (only approved tables)
     - ✓ Column blacklist (no email, phone, address fields)
     - ✓ Time window limits (≤365 days enforced)
     - ✓ Tenant isolation (companyId filter always present)
     - ✓ Row limit enforcement (≤1000 rows)

4. **Evidence Inspection**
   - David asks: _"Show evidence for confidence dimension"_
   - System displays: 3 sample evidence snippets
   - Snippets are: Redacted (no PII), Hashed (for integrity)
   - Source refs: Feedback IDs (auditable trail)

5. **Export Audit Log**
   - David exports query log for the quarter
   - CSV includes: Query text, safety checks, lineage, timestamps
   - Confirms: All queries passed safety validation
   - Notes: 2 queries were rejected (time window > 365 days)

### Key Features Demonstrated

- **12-point safety guardrails** (SQL injection, PII, tenant isolation)
- **Evidence lineage** (source data → aggregation → result)
- **Audit trail completeness** (every query logged with metadata)
- **PII redaction** (feedback snippets never expose identifiable data)
- **Tenant isolation** (companyId filter enforced on all queries)
- **Fail-fast validation** (rejected queries don't execute)

### Expected Outcome

David confirms NLQ system meets GDPR Article 30 (records of processing) and Article 25 (data protection by design). He approves NLQ for production use with quarterly audits.

### Demo Tips

- Show **safety check panel** (12-point validation)
- Display **lineage DAG** (visual proof of data flow)
- Demonstrate **PII redaction** (no raw feedback text)
- Export **audit log CSV** (compliance documentation)
- Emphasize **fail-fast** (bad queries rejected before execution)

---

## Scenario 5: Finance Team Cost Analysis

**Persona**: Jennifer Lee, CFO at Consulting Partners LLC
**Context**: Annual budget planning for CSR programs
**Goal**: Quantify social ROI to justify budget allocation
**Duration**: 5-6 minutes

### User Journey

1. **Annual Performance**
   - Jennifer asks: _"Show me SROI trend for the past year"_
   - System displays: Line chart with 12 monthly data points
   - Key metric: SROI improved from 5.82 to 6.42 (10.3% growth)
   - Investment efficiency: Every $1 invested now generates $6.42 in social value

2. **Quarterly Breakdown**
   - Jennifer follows up: _"Compare SROI across quarters"_
   - System shows: Grouped bar chart with quarterly SROI and participant counts
   - Insight: SROI grew 7.1% year-over-year (5.89 → 6.31)
   - Volume: Participants increased 13.9% (4,235 → 4,823)

3. **Cost Efficiency**
   - Jennifer asks: _"How does this quarter compare to last quarter?"_
   - System responds: Q4 SROI is 6.42 (↑1.7% from Q3's 6.31)
   - Participants: 1,612 (on track to exceed 4,800 for full quarter)
   - Interpretation: Improving efficiency with scale

4. **Volunteer ROI**
   - Jennifer asks: _"What is our average VIS score and how has it changed?"_
   - System shows: VIS improved 3.2% over 3 months (81.2 → 83.8)
   - Insight: Volunteer effectiveness is increasing (more impact per volunteer hour)
   - Cost implication: Can achieve same impact with fewer total hours

5. **Budget Justification**
   - Jennifer asks: _"Show integration score trends for the past year"_
   - System displays: Dual-line chart (language + integration scores)
   - Language proficiency: ↑11.7% year-over-year
   - Overall integration: ↑10.9% year-over-year
   - Economic value: Faster integration → faster workforce entry → higher SROI

6. **Export for Board**
   - Jennifer exports:
     - Annual SROI trend chart (for investment case)
     - Quarterly comparison table (for budget allocation)
     - Integration score trends (for outcome validation)
   - Downloads: All charts as PNG + underlying data as CSV

### Key Features Demonstrated

- **Financial metrics focus** (SROI, cost efficiency)
- **Multi-period comparisons** (annual, quarterly, monthly)
- **Scale effects** (growing participants + improving efficiency)
- **Volunteer ROI** (VIS as proxy for volunteer effectiveness)
- **Outcome validation** (integration scores justify SROI gains)
- **Export for executives** (charts + data for board materials)

### Expected Outcome

Jennifer has quantifiable evidence that the CSR program delivers strong ROI:
- SROI of 6.42:1 (every dollar returns $6.42 in social value)
- 10.3% year-over-year improvement (program getting more efficient)
- 11.7% improvement in language proficiency (measurable outcomes)

She approves a 15% budget increase for 2026, citing data-driven evidence of program effectiveness and improving efficiency at scale.

### Demo Tips

- Lead with **SROI as headline metric** ($6.42 return per $1 invested)
- Show **trend over time** (10.3% annual improvement)
- Emphasize **scale + efficiency** (more participants, better outcomes)
- Connect **outcomes to economics** (faster integration → workforce entry)
- Export **executive-ready charts** (board presentation materials)

---

## Cross-Scenario Insights

### Common Success Patterns

1. **Start simple, go deep**: All scenarios begin with a simple question and progressively layer in complexity
2. **Visual + numerical**: Every answer includes both chart visualization and numeric summary
3. **Confidence transparency**: Users always see confidence scores and can drill into lineage
4. **Actionable insights**: System provides interpretation, not just raw data
5. **Export-ready**: All results can be exported for documentation/presentations

### Feature Coverage Matrix

| Feature | S1 | S2 | S3 | S4 | S5 |
|---------|----|----|----|----|----|
| Simple queries | ✓ | ✓ | ✓ | ✓ | ✓ |
| Trend analysis | ✓ | ✓ | ✓ | | ✓ |
| Comparisons | ✓ | | | | ✓ |
| Outcome dimensions | | ✓ | | ✓ | |
| Volunteer metrics | | | ✓ | | ✓ |
| Safety guardrails | | | | ✓ | |
| Lineage visualization | ✓ | ✓ | | ✓ | |
| Evidence snippets | | ✓ | | ✓ | |
| Export capabilities | ✓ | | | ✓ | ✓ |
| Confidence scoring | ✓ | ✓ | ✓ | | ✓ |

### Recommended Demo Flow

**For C-level executives**: Scenario 1 → Scenario 5 (focus on ROI and strategic metrics)

**For program managers**: Scenario 2 → Scenario 3 (deep dive into operations and trends)

**For compliance/audit**: Scenario 4 (comprehensive safety and lineage demonstration)

**For full platform demo**: Scenario 1 → 4 → 2 (executive overview → safety proof → operational depth)

---

## Demo Data Requirements

Each scenario assumes the **nlq-demo-data.ts** seed script has been run with:
- 20+ companies across diverse industries
- 24 months of metric data (monthly granularity)
- Varied data quality (high/medium/low confidence scenarios)
- Q2Q outcome scores with evidence snippets

### Recommended Demo Company

**TechForGood Inc** (from seed data):
- Industry: Technology
- SROI: 6.5 (high performer)
- VIS: 85 (strong volunteer effectiveness)
- Participants: 1,200 scale
- Volunteers: 350 scale
- 24 months of clean, trending data

---

## Success Metrics

After running these demo scenarios, stakeholders should be able to:

1. Ask natural language questions and receive accurate answers (95%+ confidence)
2. Understand data lineage and trust the results (full provenance)
3. Identify trends and patterns in program performance (actionable insights)
4. Export data for executive presentations (board-ready materials)
5. Verify compliance with data governance policies (GDPR, audit trails)

**Demo complete when**: Stakeholder can independently ask 3+ questions and interpret results without assistance.
