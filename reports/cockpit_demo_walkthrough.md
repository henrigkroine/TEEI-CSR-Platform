# Corporate Cockpit Demo Walkthrough Guide

**Report Date**: 2025-11-13
**Version**: 1.0
**Prepared By**: Demo Team
**Target Audience**: Stakeholders, executives, product reviewers

---

## Overview

This guide provides a comprehensive walkthrough of the Corporate Cockpit dashboard, designed to showcase the platform's capabilities to stakeholders. The demo uses pre-seeded data for "Acme Corporation," a fictional company with 6 months of realistic program activity.

**Demo Environment**: `http://localhost:4321`
**Demo Company**: Acme Corporation
**Demo Period**: June 2024 - November 2024 (6 months)
**Login**: `demo@acme.com` / `DemoPass2024!`

---

## Demo Company Profile: Acme Corporation

### Company Overview

- **Name**: Acme Corporation
- **Industry**: Technology / Software Development
- **CSR Program**: "Acme Integration Initiative"
- **Launch Date**: June 1, 2024
- **Program Budget**: $250,000 (6 months)
- **Geographic Focus**: United States (New York, San Francisco, Chicago)

### Program Participants

**Participants**: 50 active learners
- **Demographics**:
  - 60% refugees from Ukraine
  - 30% refugees from Syria
  - 10% refugees from Afghanistan
- **Age Range**: 22-45 years
- **Language Levels**: A1 (20%), A2-B1 (50%), B2+ (30%)
- **Education**: 40% university educated, 60% high school + vocational

**Volunteers**: 20 Acme employees
- **Roles**: Software engineers (8), Product managers (5), Designers (4), HR (3)
- **Average Engagement**: 4.5 hours/month per volunteer
- **Retention Rate**: 95% (19/20 still active)

### Program Activity (6 Months)

- **Buddy Matches**: 48 active pairs
- **Total Sessions**: 342 one-on-one sessions
- **Total Volunteer Hours**: 520 hours
- **Language Sessions**: 180 hours
- **Career Mentorship**: 140 hours
- **Upskilling Workshops**: 24 workshops (200 total attendee-hours)
- **Feedback Items**: 486 entries (feedback, check-ins, surveys)
- **Job Placements**: 12 participants (24% placement rate)

---

## Demo Walkthrough: Page by Page

### 1. At-a-Glance Dashboard (`/`)

**Purpose**: Executive-level overview of program health and impact

#### Page Load

**URL**: `http://localhost:4321/`

**First Impression**:
- Clean, modern interface with dark mode option (toggle in nav)
- TEEI branding with Acme Corporation logo
- Navigation: Dashboard | Trends | Q2Q Feed | SROI | VIS
- Language selector: English | Українська | Norsk (top-right)

#### KPI Cards (8 Cards, 2x4 Grid)

**Card 1: Participants**
- **Value**: `50`
- **Trend**: `↑ +8 vs. last month` (green badge)
- **Icon**: User icon
- **Description**: "Active participants in program"

**Card 2: Volunteers**
- **Value**: `20`
- **Trend**: `→ No change` (gray badge)
- **Icon**: Heart icon
- **Description**: "Employee volunteers engaged"

**Card 3: Matches**
- **Value**: `48`
- **Trend**: `↑ +6 vs. last month` (green badge)
- **Icon**: Users icon
- **Description**: "Active buddy pairs"

**Card 4: Sessions**
- **Value**: `89`
- **Trend**: `↑ +12 vs. last month` (green badge)
- **Icon**: Calendar icon
- **Description**: "Sessions this month"

**Card 5: Avg Integration Score**
- **Value**: `68.5/100`
- **Trend**: `↑ +3.2 vs. last month` (green badge)
- **Icon**: Target icon
- **Description**: "Overall integration progress"
- **Badge**: "High" (green)

**Card 6: Avg Language Level**
- **Value**: `6.8/10`
- **Trend**: `↑ +0.5 vs. last month` (green badge)
- **Icon**: Book icon
- **Description**: "English proficiency (CEFR scale)"
- **Badge**: "B2" (blue)

**Card 7: Avg Job Readiness**
- **Value**: `0.72/1.0`
- **Trend**: `↑ +0.08 vs. last month` (green badge)
- **Icon**: Briefcase icon
- **Description**: "Employment readiness score"
- **Badge**: "High" (green)

**Card 8: Total Volunteer Hours**
- **Value**: `520 hrs`
- **Trend**: `↑ +95 hrs vs. last month` (green badge)
- **Icon**: Clock icon
- **Description**: "Cumulative volunteer time"

#### Recent Activity Feed

**Section Title**: "Recent Activity"
**Location**: Below KPI cards

**Sample Activity Items** (5 most recent):

1. **[2 hours ago]**
   - Icon: 📈 (green)
   - Text: "**Maria K.** showed confidence increase in check-in"
   - Badge: "Confidence ↑" (green)

2. **[5 hours ago]**
   - Icon: 🎯 (blue)
   - Text: "**Ahmed S.** completed upskilling workshop 'React Fundamentals'"
   - Badge: "Skills Gained" (blue)

3. **[1 day ago]**
   - Icon: 💼 (green)
   - Text: "**Olena P.** applied to 3 jobs this week"
   - Badge: "Job Search" (green)

4. **[1 day ago]**
   - Icon: ⚠️ (orange)
   - Text: "**Anonymous** expressed frustration in feedback"
   - Badge: "Risk Cue" (orange)

5. **[2 days ago]**
   - Icon: 🤝 (green)
   - Text: "**Tariq M.** reported increased belonging after group event"
   - Badge: "Belonging ↑" (green)

#### Export Buttons

**Location**: Top-right corner of dashboard

**Buttons**:
- `📄 Export CSV` - Downloads dashboard metrics as CSV
- `📑 Export PDF` - Generates executive summary PDF

**Demo Action**: Click "Export PDF"

**PDF Contents**:
- Acme Corporation branding
- Executive Summary section
- All 8 KPIs with values and trends
- SROI summary: "4.23:1 return on investment"
- VIS summary: "75.5/100 volunteer impact score"
- Period: "November 2024"
- Generated timestamp

#### Screenshot Description

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│ TEEI Platform        [Dashboard|Trends|Q2Q|SROI|VIS]    EN 🌐 │
│ Acme Corporation                                        👤 Demo │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Dashboard Overview - November 2024              [CSV] [PDF] │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 👥 50    │  │ ❤️ 20    │  │ 🤝 48    │  │ 📅 89    │      │
│  │ ↑ +8     │  │ → 0      │  │ ↑ +6     │  │ ↑ +12    │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 🎯 68.5  │  │ 📚 6.8   │  │ 💼 0.72  │  │ ⏰ 520   │      │
│  │ ↑ +3.2   │  │ ↑ +0.5   │  │ ↑ +0.08  │  │ ↑ +95    │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│  📋 Recent Activity                                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 📈 Maria K. showed confidence increase    [2 hrs ago]   │  │
│  │ 🎯 Ahmed S. completed workshop            [5 hrs ago]   │  │
│  │ 💼 Olena P. applied to 3 jobs             [1 day ago]   │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Trends Page (`/trends`)

**Purpose**: Visualize program growth and performance over time

#### Page Load

**URL**: `http://localhost:4321/trends`

**Time Range Selector** (Top-right):
- Last 7 days
- Last 30 days
- Last 3 months
- **Last 6 months** ← (selected by default)
- Last year

**Demo Action**: Ensure "Last 6 months" is selected

#### Chart 1: Participant Growth (Line Chart)

**Title**: "Participant Growth Over Time"
**Chart Type**: Line chart with gradient fill
**X-Axis**: June 2024 → November 2024 (monthly)
**Y-Axis**: Number of participants (0-60)

**Data Points**:
- **June**: 15 participants
- **July**: 25 participants (+67% growth)
- **August**: 35 participants (+40% growth)
- **September**: 42 participants (+20% growth)
- **October**: 48 participants (+14% growth)
- **November**: 50 participants (+4% growth)

**Trend Line**: Steep upward slope initially, leveling off in recent months

**Insight Box** (below chart):
> "Participant enrollment grew 233% over 6 months, with strong early momentum. Growth is stabilizing as program reaches target capacity."

#### Chart 2: Volunteer Engagement (Bar Chart)

**Title**: "Volunteer Engagement: Volunteers & Sessions"
**Chart Type**: Grouped bar chart
**X-Axis**: June 2024 → November 2024
**Y-Axis (Left)**: Number of volunteers (0-25)
**Y-Axis (Right)**: Number of sessions (0-100)

**Data**:
| Month | Volunteers (blue bars) | Sessions (green bars) |
|-------|------------------------|------------------------|
| June | 12 | 35 |
| July | 15 | 52 |
| August | 18 | 68 |
| September | 19 | 75 |
| October | 20 | 82 |
| November | 20 | 89 |

**Insight Box**:
> "Volunteer count stabilized at 20 (target capacity), while session frequency continues to increase. Average sessions per volunteer: 4.45/month."

#### Chart 3: Program Performance (Multi-Line Chart)

**Title**: "Program Performance: Integration, Language, Job Readiness"
**Chart Type**: Multi-line chart (3 lines)
**X-Axis**: June 2024 → November 2024
**Y-Axis**: Score (0-100 scale, normalized)

**Lines**:
1. **Integration Score** (blue line):
   - June: 42, July: 51, Aug: 58, Sept: 63, Oct: 65, Nov: 68.5

2. **Language Level** (green line):
   - June: 45, July: 52, Aug: 58, Sept: 62, Oct: 65, Nov: 68

3. **Job Readiness** (orange line):
   - June: 38, July: 48, Aug: 56, Sept: 62, Oct: 67, Nov: 72

**All lines trending upward** (consistent improvement)

**Insight Box**:
> "All performance metrics show steady improvement. Job readiness grew fastest (+89%), indicating strong employability gains from mentorship and upskilling."

#### Export Button

**Demo Action**: Click "Export CSV"

**CSV Contents**:
- Column headers: Month, Participants, Volunteers, Sessions, Integration Score, Language Level, Job Readiness
- 6 rows of data (June-November)
- Filename: `acme_trends_6months_20241113.csv`

#### Screenshot Description

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│ TEEI Platform - Trends                        [Last 6 months ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📈 Participant Growth Over Time                      [CSV]    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 60 ┤                                          ●──●       │  │
│  │ 50 ┤                                    ●──●            │  │
│  │ 40 ┤                          ●──●                       │  │
│  │ 30 ┤                ●──●                                 │  │
│  │ 20 ┤       ●──●                                          │  │
│  │ 10 ┤  ●                                                  │  │
│  │  0 └───────────────────────────────────────────────────  │  │
│  │    Jun  Jul  Aug  Sep  Oct  Nov                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│  💡 Growth is stabilizing as program reaches capacity          │
│                                                                 │
│  👥 Volunteer Engagement: Volunteers & Sessions               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [Blue/Green bar chart showing increasing engagement]    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  🎯 Program Performance (3 metrics)                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [Three ascending lines: Integration, Language, Job]     │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Q2Q Feed Page (`/q2q`)

**Purpose**: Real-time qualitative-to-quantitative classification feed

#### Page Load

**URL**: `http://localhost:4321/q2q`

**Layout**: Two-column layout
- **Left Column** (70%): Feed items with filtering
- **Right Column** (30%): Summary statistics

#### Filter Panel (Left Column Top)

**Filters Available**:

1. **Dimension Filter** (Dropdown):
   - All Dimensions (default)
   - Confidence
   - Belonging
   - Language Comfort
   - Job Readiness
   - Well-being

2. **Sentiment Filter** (Buttons):
   - `All` (selected) | `Positive` | `Neutral` | `Negative`

3. **Date Range** (Date pickers):
   - From: `2024-06-01`
   - To: `2024-11-13` (today)

**Demo Action**: Select "Confidence" dimension, "Positive" sentiment

#### Q2Q Feed Items (Left Column)

**Sample Feed Items** (showing 5 of 20 per page):

**Item 1**:
```
┌─────────────────────────────────────────────────────────────┐
│ 📈 Confidence Increase                            2 hours ago │
├─────────────────────────────────────────────────────────────┤
│ "I feel much more confident speaking English now. My       │
│  buddy has been so supportive and patient."                 │
│                                                             │
│ 🎯 Confidence: 0.85  💪 Belonging: 0.78                    │
│ 📊 Method: AI Classifier (Claude)                          │
│ 🔍 [View Evidence]                                          │
└─────────────────────────────────────────────────────────────┘
```

**Item 2**:
```
┌─────────────────────────────────────────────────────────────┐
│ 📈 Confidence Increase                            5 hours ago │
├─────────────────────────────────────────────────────────────┤
│ "I completed my first coding project today! I can't         │
│  believe how much I've learned in just 3 months."           │
│                                                             │
│ 🎯 Confidence: 0.92  🎓 Skills Gained: Yes                 │
│ 📊 Method: AI Classifier (Claude)                          │
│ 🔍 [View Evidence]                                          │
└─────────────────────────────────────────────────────────────┘
```

**Item 3**:
```
┌─────────────────────────────────────────────────────────────┐
│ 📈 Confidence Increase                            1 day ago  │
├─────────────────────────────────────────────────────────────┤
│ "My resume looks so much better now. I got two interview    │
│  callbacks this week!"                                      │
│                                                             │
│ 🎯 Confidence: 0.88  💼 Job Search: Yes                    │
│ 📊 Method: AI Classifier (Claude)                          │
│ 🔍 [View Evidence]                                          │
└─────────────────────────────────────────────────────────────┘
```

**Pagination** (Bottom):
`← Previous | Page 1 of 8 | Next →`

#### Summary Statistics (Right Column)

**Section 1: Top Themes**

**Title**: "Top Themes (Last 30 Days)"

```
┌─────────────────────────────────────┐
│ Skills Gained         ████████ 45%  │
│ Confidence Increase   ██████ 32%    │
│ Job Search           █████ 28%      │
│ Belonging Increase    ████ 22%      │
│ Networking           ███ 18%        │
└─────────────────────────────────────┘
```

**Section 2: Sentiment Distribution**

**Title**: "Sentiment Distribution"

```
┌─────────────────────────────────────┐
│ 😊 Positive:  68% (330 items)       │
│   ████████████████████              │
│                                     │
│ 😐 Neutral:   22% (107 items)       │
│   ███████                           │
│                                     │
│ 😟 Negative:  10% (49 items)        │
│   ███                               │
└─────────────────────────────────────┘
```

**Section 3: Classification Stats**

```
┌─────────────────────────────────────┐
│ Total Classified: 486 items         │
│ This Month: 89 items                │
│ Avg Confidence: 0.84                │
│ AI Provider: Claude (95%)           │
└─────────────────────────────────────┘
```

#### Export Button

**Demo Action**: Click "Export CSV" (applies current filters)

**CSV Contents** (with filters applied):
- Columns: Date, Text (redacted), Dimension, Score, Sentiment, Method
- Only "Confidence" dimension, "Positive" sentiment items
- Filename: `acme_q2q_confidence_positive_20241113.csv`

#### Evidence Lineage Demo

**Demo Action**: Click `[View Evidence]` on Item 1

**Evidence Drawer Opens** (Slide-in from right):

```
┌─────────────────────────────────────────────────┐
│ Evidence Lineage                          [×]   │
├─────────────────────────────────────────────────┤
│ Metric: Confidence Score (0.85)                 │
│ Date: 2024-11-13 10:45:00                       │
│                                                 │
│ 📝 Evidence Snippets (3 found)                 │
│                                                 │
│ 1️⃣ "I feel much more confident ***"            │
│    Source: Buddy Feedback                      │
│    Confidence: 0.92                            │
│    Timestamp: 2 hours ago                      │
│                                                 │
│ 2️⃣ "My buddy has been so supportive and ***"   │
│    Source: Buddy Feedback                      │
│    Confidence: 0.88                            │
│    Timestamp: 2 hours ago                      │
│                                                 │
│ 3️⃣ Related: "*** speaking English now"         │
│    Source: Check-in Note                       │
│    Confidence: 0.78                            │
│    Timestamp: 1 week ago                       │
│                                                 │
│ 🔒 All PII redacted for privacy                 │
│ Page 1 of 1                                     │
└─────────────────────────────────────────────────┘
```

**Callout Points**:
- Notice `***` redactions (PII protected)
- Multiple evidence sources support the score
- Provenance information (source type, timestamp)
- Confidence levels per snippet

---

### 4. SROI Page (`/sroi`)

**Purpose**: Social Return on Investment calculation and visualization

#### Page Load

**URL**: `http://localhost:4321/sroi`

**Date Range Selector** (Top):
- From: `2024-06-01`
- To: `2024-11-13`
- Button: `[Recalculate]`

#### KPI Cards (Top Row)

**Card 1: Total Investment**
```
┌─────────────────────┐
│ 💰 Total Investment │
│                     │
│    $250,000         │
│                     │
│ Program cost (6mo)  │
└─────────────────────┘
```

**Card 2: Social Value Created**
```
┌─────────────────────┐
│ 🌟 Social Value     │
│                     │
│    $1,057,500       │
│                     │
│ Economic benefit    │
└─────────────────────┘
```

**Card 3: ROI Ratio**
```
┌─────────────────────┐
│ 📊 SROI Ratio       │
│                     │
│    4.23 : 1         │
│                     │
│ $4.23 per $1 spent  │
└─────────────────────┘
```

#### Chart 1: Value Breakdown (Doughnut Chart)

**Title**: "Economic Value Breakdown"

**Chart Type**: Doughnut chart with 4 segments

**Segments**:
1. **Wage Lift** (45%): $475,875 (green)
   - 12 job placements × avg $15,000 wage increase × 3 years NPV

2. **Employment Multiplier** (30%): $317,250 (blue)
   - Economic ripple effect from 12 placements × 1.5x multiplier

3. **Volunteer Value** (15%): $158,625 (orange)
   - 520 hours × $305/hour (skilled volunteer value)

4. **Training Savings** (10%): $105,750 (purple)
   - Cost savings from reduced onboarding needs

**Legend** (Right side):
- Each segment labeled with value and percentage
- Hover shows detailed calculation

#### Chart 2: Historical SROI Trend (Line Chart)

**Title**: "SROI Ratio Over Time (Monthly)"

**Chart Type**: Line chart
**X-Axis**: June → November 2024
**Y-Axis**: SROI Ratio (0-5)

**Data Points**:
- **June**: 1.2:1 (early stage, low placements)
- **July**: 1.8:1
- **August**: 2.5:1
- **September**: 3.2:1 (first major placements)
- **October**: 3.9:1
- **November**: 4.23:1 (target exceeded)

**Target Line**: Horizontal line at 3.0:1 (company target)

**Insight Box**:
> "SROI ratio exceeds company target of 3:1, demonstrating strong program effectiveness. Continued job placements are driving value creation."

#### Calculation Methodology Section

**Title**: "How SROI is Calculated"

**Expandable Accordion**:

```
┌─────────────────────────────────────────────────────────────┐
│ ▼ SROI Calculation Details                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Economic Benefit (Total Value Created)                  │
│    • Wage lift: 12 placements × $15,000 avg increase       │
│      × 3 years benefit = $540,000                           │
│    • Employment multiplier: $540,000 × 1.5x = $810,000      │
│    • Discounted to NPV (3% rate): $1,057,500               │
│                                                             │
│ 2. Program Cost                                             │
│    • Total investment: $250,000 (6 months)                  │
│                                                             │
│ 3. SROI Ratio                                               │
│    • Formula: (Economic Benefit - Cost) / Cost             │
│    • Calculation: ($1,057,500 - $250,000) / $250,000       │
│    • Result: 4.23:1                                         │
│                                                             │
│ Assumptions:                                                │
│ • 3-year benefit horizon                                    │
│ • 1.5x employment multiplier (industry standard)            │
│ • 3% discount rate (NPV calculation)                        │
│ • $305/hour volunteer value (US skilled volunteer rate)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Export Button

**Demo Action**: Click "Export PDF Report"

**PDF Contents**:
- Executive summary
- SROI ratio prominently displayed
- Value breakdown table
- Historical trend chart
- Calculation methodology
- Comparison to industry benchmarks

---

### 5. VIS Page (`/vis`)

**Purpose**: Volunteer Impact Score visualization and leaderboard

#### Page Load

**URL**: `http://localhost:4321/vis`

#### Overall VIS Score (Hero Section)

**Large Display**:
```
┌─────────────────────────────────────┐
│    Volunteer Impact Score (VIS)     │
│                                     │
│         75.5 / 100                  │
│         ████████████░░░             │
│                                     │
│     ↑ +2.3 vs. last month           │
│     Badge: "Excellent Impact" 🌟    │
└─────────────────────────────────────┘
```

#### Component Breakdown (4 Cards)

**Card 1: Hours Contributed (30% weight)**
```
┌──────────────────────┐
│ ⏰ Hours: 28.5/30    │
│ 520 hours (6 months) │
│ 95% of target        │
└──────────────────────┘
```

**Card 2: Quality Score (30% weight)**
```
┌──────────────────────┐
│ ⭐ Quality: 24/30    │
│ Avg rating: 4.6/5.0  │
│ 80% satisfaction     │
└──────────────────────┘
```

**Card 3: Outcome Lift (25% weight)**
```
┌──────────────────────┐
│ 📈 Outcome: 19/25    │
│ 68% avg improvement  │
│ Strong impact        │
└──────────────────────┘
```

**Card 4: Placement Rate (15% weight)**
```
┌──────────────────────┐
│ 💼 Placement: 11/15  │
│ 24% placement rate   │
│ Above benchmark      │
└──────────────────────┘
```

**Calculation Display**:
```
VIS = (28.5 × 0.30) + (24 × 0.30) + (19 × 0.25) + (11 × 0.15)
    = 8.55 + 7.2 + 4.75 + 1.65
    = 75.5 / 100
```

#### Top Volunteers Leaderboard (Table)

**Title**: "Top 10 Volunteers by Impact"

| Rank | Name | Hours | Quality | Participants | VIS |
|------|------|-------|---------|--------------|-----|
| 🥇 | **Sarah Chen** | 45 hrs | 4.9/5 | 3 | 88.5 |
| 🥈 | **David Park** | 42 hrs | 4.8/5 | 3 | 86.2 |
| 🥉 | **Elena Martinez** | 38 hrs | 4.7/5 | 2 | 82.7 |
| 4 | Michael Johnson | 35 hrs | 4.6/5 | 2 | 78.3 |
| 5 | Priya Patel | 33 hrs | 4.8/5 | 2 | 76.9 |
| 6 | James Wilson | 30 hrs | 4.5/5 | 2 | 73.5 |
| 7 | Anna Kowalski | 28 hrs | 4.7/5 | 2 | 71.2 |
| 8 | Carlos Rodriguez | 26 hrs | 4.4/5 | 2 | 68.8 |
| 9 | Lisa Anderson | 24 hrs | 4.6/5 | 1 | 65.4 |
| 10 | Tom O'Brien | 22 hrs | 4.3/5 | 1 | 62.1 |

**Columns Sortable**: Click column headers to sort

#### Score Distribution (Histogram)

**Title**: "VIS Distribution Across All Volunteers"

**Chart Type**: Histogram (bar chart)
**X-Axis**: VIS score ranges (0-20, 21-40, 41-60, 61-80, 81-100)
**Y-Axis**: Number of volunteers

**Data**:
- 0-20: 0 volunteers (0%)
- 21-40: 1 volunteer (5%)
- 41-60: 3 volunteers (15%)
- 61-80: 12 volunteers (60%)
- 81-100: 4 volunteers (20%)

**Mean Line**: Vertical line at 75.5 (overall average)

**Insight Box**:
> "80% of volunteers score above 60, indicating consistently high impact. Top performers (>80) represent 20% of volunteers but contribute 35% of total impact."

#### Methodology Explanation

**Expandable Section**:

```
┌─────────────────────────────────────────────────────────────┐
│ ▼ VIS Calculation Method                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ VIS = (Hours × 0.30) + (Quality × 0.30) +                  │
│       (Outcome × 0.25) + (Placement × 0.15)                 │
│                                                             │
│ Where:                                                      │
│ • Hours: Normalized to 0-30 scale (1000 hrs = 30 points)   │
│ • Quality: Participant feedback ratings (0-30 scale)        │
│ • Outcome: Avg improvement in integration scores (0-25)     │
│ • Placement: Job placement rate of mentees (0-15)           │
│                                                             │
│ Benchmark Comparisons:                                      │
│ • Industry Average: 62/100                                  │
│ • Acme Score: 75.5/100 (22% above average)                  │
│ • Top Quartile Threshold: 70/100                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Internationalization (i18n) Demo

**Demo Action**: Click language selector (top-right)

#### Switch to Ukrainian (`uk`)

**Navigation Changes**:
- Dashboard → `Панель приладів`
- Trends → `Тенденції`
- Q2Q Feed → `Q2Q Канал`
- SROI → `SROI`
- VIS → `VIS`

**Dashboard KPI Cards** (Ukrainian):
- Participants → `Учасники`
- Volunteers → `Волонтери`
- Matches → `Пари`
- Sessions → `Сесії`
- Avg Integration Score → `Середній бал інтеграції`
- Avg Language Level → `Середній рівень мови`
- Avg Job Readiness → `Готовність до роботи`
- Total Volunteer Hours → `Години волонтерства`

**Recent Activity** (Ukrainian):
- "confidence increase" → `збільшення впевненості`
- "skills gained" → `отримані навички`
- "job search" → `пошук роботи`

**Demo Action**: Switch to Norwegian (`no`)

**Navigation** (Norwegian):
- Dashboard → `Dashbord`
- Trends → `Trender`
- Q2Q Feed → `Q2Q-strøm`
- SROI → `SROI`
- VIS → `VIS`

**KPI Cards** (Norwegian):
- Participants → `Deltakere`
- Volunteers → `Frivillige`
- Matches → `Par`
- Avg Integration Score → `Gjennomsnittlig integreringsscore`

**Callout**: All 100+ strings translated, numbers/dates localized

---

### 7. Admin Features (Feature Flags)

**Demo Action**: Navigate to `/admin` (requires admin role)

**URL**: `http://localhost:4321/admin`

#### Feature Flags Panel

**Title**: "Impact-In Connectors - Feature Flags"

```
┌─────────────────────────────────────────────────────────────┐
│ Platform Connectors                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Benevity Integration                                        │
│ [ ✓ Enabled ]  Last delivery: 2 days ago                    │
│ Status: Active | 12 deliveries this month                   │
│                                                             │
│ Goodera Integration                                         │
│ [ ✗ Disabled ] Enable for Acme Corporation?                 │
│ Status: Inactive | Never used                               │
│                                                             │
│ Workday Integration                                         │
│ [ ✓ Enabled ]  Last delivery: 5 hours ago                   │
│ Status: Active | 8 deliveries this month                    │
│                                                             │
│ [Save Changes]                                              │
└─────────────────────────────────────────────────────────────┘
```

**Demo Action**: Toggle "Goodera Integration" ON → Click "Save Changes"

**Success Message**: "Feature flags updated successfully. Goodera connector is now enabled for Acme Corporation."

---

## Demo Script & Talking Points

### Opening (2 minutes)

**Script**:
> "Welcome to the TEEI Corporate Cockpit demo. Today we'll showcase how Acme Corporation uses our platform to measure and optimize their CSR program impact. Acme launched their Integration Initiative 6 months ago with 50 participants and 20 employee volunteers. Let's see how they're performing."

### Dashboard Walkthrough (3 minutes)

**Script**:
> "On the at-a-glance dashboard, executives see 8 key performance indicators at a glance. Notice the green trend arrows—Acme is growing month-over-month across all metrics. Their integration score of 68.5 is 'High' level, indicating strong participant progress. The recent activity feed shows real-time Q2Q classifications: Maria showed a confidence increase, Ahmed completed an upskilling workshop, and Olena is actively job searching. These qualitative stories are automatically converted to quantitative metrics."

**Key Talking Points**:
- All data updates in real-time (no manual reports!)
- Trend comparisons make it easy to spot growth or issues
- Export to PDF for board meetings in one click

### Trends Analysis (2 minutes)

**Script**:
> "The trends page visualizes 6 months of program growth. Participant enrollment grew 233%, but notice it's leveling off as we reach capacity—that's planned scaling. Volunteer engagement is steady at 20 volunteers, but sessions per volunteer are increasing, showing deepening engagement. All three performance metrics—integration, language, and job readiness—are trending upward consistently."

**Key Talking Points**:
- Visualize long-term trends to prove program effectiveness
- Export time-series data for annual reports
- Identify inflection points (e.g., September placement spike)

### Q2Q Feed Deep Dive (4 minutes)

**Script**:
> "Here's where qualitative feedback becomes quantitative metrics. Our AI classifier (Claude 3.5 Sonnet) analyzes every feedback item, check-in, and survey response. Let's filter to 'Confidence' and 'Positive' sentiment—see these real participant stories about growing confidence. Each item shows the AI-generated score, multiple dimensions, and the classification method. Click 'View Evidence' and we see the full evidence lineage: the original text snippet (PII redacted with asterisks), the source type, confidence level, and provenance. This transparency lets operators investigate any metric back to its source."

**Key Talking Points**:
- 486 feedback items auto-classified (no manual work!)
- Summary stats show 68% positive sentiment—program is working
- Evidence lineage provides audit trail for compliance

### SROI Demonstration (3 minutes)

**Script**:
> "Now for the business case: Social Return on Investment. Acme invested $250,000 over 6 months and generated over $1 million in economic value—a 4.23:1 return. That's $4.23 of social value for every dollar spent. The value breakdown shows 12 job placements driving 45% of the value, with employment multiplier effects and volunteer contributions adding more. The historical trend shows SROI growing from 1.2:1 in June to 4.23:1 today, exceeding the company's 3:1 target. Executives can present this to their board as quantifiable proof of impact."

**Key Talking Points**:
- Exceeds industry benchmark (typically 2-3:1)
- Calculations transparent and auditable
- Export PDF for board reports

### VIS Leaderboard (2 minutes)

**Script**:
> "The Volunteer Impact Score recognizes top performers. Acme's overall VIS is 75.5/100, which is 22% above the industry average. The leaderboard shows Sarah Chen leading with 88.5—she's contributed 45 hours, maintained a 4.9/5 quality rating, and mentored 3 participants. This gamification encourages healthy competition among volunteers. The score distribution shows 80% of volunteers scoring above 60, indicating consistently high quality."

**Key Talking Points**:
- Data-driven volunteer recognition (not subjective)
- Leaderboard can be shared in company newsletters
- Identify top performers for case studies

### i18n Demo (1 minute)

**Script**:
> "Since Acme serves Ukrainian participants, we support Ukrainian language. Watch as I switch languages—the entire interface translates instantly to Ukrainian (Українська). All 100+ strings, including KPI labels, navigation, and activity descriptions, are fully localized. We also support Norwegian for our Nordic clients."

**Key Talking Points**:
- Culturally appropriate for diverse participants
- Easy to add more languages
- Improves accessibility and inclusivity

### Admin Features (2 minutes)

**Script**:
> "Finally, the admin panel lets Acme control which external platforms receive their impact data. Benevity and Workday are currently enabled—Acme's data flows automatically to their CSR platforms. Goodera is disabled. Let's enable it now—click, save, done. Behind the scenes, the Impact-In service will start delivering metrics to Goodera via API. Feature flags give companies granular control without engineering work."

**Key Talking Points**:
- Feature flags = no code deployments for changes
- Audit trail shows all delivery history
- Retry logic handles failed deliveries automatically

### Closing (1 minute)

**Script**:
> "That's the TEEI Corporate Cockpit. In 20 minutes, we've seen how Acme Corporation tracks 50 participants, 20 volunteers, and 6 months of program activity—all converted from qualitative stories to quantitative business outcomes. The dashboard updates in real-time, exports for executive reporting, supports multiple languages, and integrates with external CSR platforms. Questions?"

---

## Technical Requirements for Demo

### Prerequisites

1. **Services Running**:
   - Analytics Service (port 3007)
   - Q2Q AI Service (port 3005)
   - Impact-In Service (port 3008)
   - Corporate Cockpit (port 4321)
   - PostgreSQL database
   - NATS event bus

2. **Demo Data Seeded**:
   - Acme Corporation company record
   - 50 participant profiles
   - 20 volunteer profiles
   - 48 buddy matches
   - 342 sessions
   - 486 feedback items with Q2Q classifications
   - 12 job placement records
   - 6 months of metrics_company_period data

3. **Demo User Account**:
   - Email: `demo@acme.com`
   - Password: `DemoPass2024!`
   - Role: Admin (full access)

### Seed Script

**Location**: `/scripts/seed_demo_data.ts`

**Run Command**:
```bash
pnpm seed:demo
```

**Seed Duration**: ~2 minutes

---

## Troubleshooting

### Issue: Dashboard shows "No data available"

**Cause**: Metrics aggregation not run or seeding incomplete

**Solution**:
```bash
# Re-run seed script
pnpm seed:demo

# Manually trigger aggregation
curl -X POST http://localhost:3007/metrics/aggregate \
  -H "Content-Type: application/json" \
  -d '{"companyId": "acme-corp-uuid"}'
```

### Issue: Charts not rendering

**Cause**: Chart.js not loaded or browser compatibility

**Solution**:
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
- Check browser console for errors
- Ensure localhost:4321 is accessible

### Issue: Language switching doesn't work

**Cause**: i18n JSON files missing or not loaded

**Solution**:
```bash
# Verify i18n files exist
ls apps/corp-cockpit-astro/src/i18n/
# Should see: en.json, uk.json, no.json

# Rebuild app
cd apps/corp-cockpit-astro
pnpm build
pnpm dev
```

---

## Demo Checklist

**Pre-Demo** (5 minutes before):
- [ ] All services running (`docker-compose up -d`)
- [ ] Demo data seeded (`pnpm seed:demo`)
- [ ] Open browser to `http://localhost:4321`
- [ ] Log in with demo@acme.com
- [ ] Verify dashboard loads with data
- [ ] Test one chart interaction
- [ ] Test language switch
- [ ] Close unnecessary browser tabs

**During Demo**:
- [ ] Start with dashboard overview
- [ ] Show trends with time range selector
- [ ] Filter Q2Q feed and show evidence
- [ ] Highlight SROI exceeding target
- [ ] Show VIS leaderboard
- [ ] Switch languages (Ukrainian)
- [ ] Open admin panel and toggle feature flag
- [ ] Export one PDF/CSV

**Post-Demo**:
- [ ] Answer questions
- [ ] Offer hands-on exploration time
- [ ] Collect feedback
- [ ] Schedule follow-up if needed

---

## Appendix: Demo Data Details

### Participant Profiles (Sample 5 of 50)

1. **Maria Kovalenko** - Ukraine, Age 28, B1 English, Software Developer background, 6 months in program, Job placed
2. **Ahmed Said** - Syria, Age 35, A2 English, Civil Engineer background, 5 months in program, In upskilling
3. **Olena Petrov** - Ukraine, Age 24, B2 English, Graphic Designer, 6 months in program, Job placed
4. **Tariq Mahmoud** - Syria, Age 31, A1 English, Teacher background, 4 months in program, Active
5. **Yana Bondar** - Ukraine, Age 27, B1 English, Accountant, 5 months in program, Interview stage

### Volunteer Profiles (Sample 5 of 20)

1. **Sarah Chen** - Senior Software Engineer, 2 years at Acme, Mentoring 3 participants, 45 hours contributed
2. **David Park** - Product Manager, 4 years at Acme, Mentoring 3 participants, 42 hours contributed
3. **Elena Martinez** - UX Designer, 3 years at Acme, Mentoring 2 participants, 38 hours contributed
4. **Michael Johnson** - Engineering Manager, 5 years at Acme, Mentoring 2 participants, 35 hours contributed
5. **Priya Patel** - HR Business Partner, 3 years at Acme, Mentoring 2 participants, 33 hours contributed

---

**Demo Guide Prepared By**: Demo & QA Team
**Reviewed By**: Worker 2 Product Lead
**Date**: 2025-11-13
**Version**: 1.0
**Status**: ✅ Complete
