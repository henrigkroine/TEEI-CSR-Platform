# Dashboard Navigation Guide

**Target Audience**: All Users
**Estimated Reading Time**: 15 minutes
**Last Updated**: 2025-11-15

---

## Dashboard Overview

The TEEI dashboard is your command center for monitoring CSR program performance. This guide explains every widget, filter, and interaction.

---

## Page Layout

The dashboard is organized into four main sections:

```
┌─────────────────────────────────────────────────────────┐
│  1. HEADER & NAVIGATION                                 │
├─────────────────────────────────────────────────────────┤
│  2. FILTERS & CONTROLS                                  │
├─────────────────────────────────────────────────────────┤
│  3. KPI CARDS (Metrics at a glance)                     │
├─────────────────────────────────────────────────────────┤
│  4. CHARTS & VISUALIZATIONS                             │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Header & Navigation

### Top Bar Elements

**Left Side**:
- **Company Logo**: Click to return to dashboard home
- **Tenant Name**: Displays your organization name
- **Environment Indicator**: Shows "Production" or "Sandbox"

**Center**:
- **Main Navigation Tabs**:
  - Dashboard (home icon)
  - Reports (document icon)
  - Evidence (search icon)
  - Benchmarks (chart icon, enterprise only)
  - Settings (gear icon, admin only)

**Right Side**:
- **Refresh Button**: Force data refresh
- **Export Button**: Quick export current view
- **Notifications**: Bell icon with badge count
- **Help Icon**: Access help center
- **User Menu**: Profile, settings, logout

### User Menu Options

Click your avatar or name (top right):

| Option | Description |
|--------|-------------|
| **Profile** | View and edit your profile |
| **Preferences** | Customize your experience |
| **Notifications** | Manage notification settings |
| **Keyboard Shortcuts** | View all shortcuts |
| **Help Center** | Access documentation |
| **Logout** | Sign out securely |

---

## 2. Filters & Controls

Located just below the header, filters control what data is displayed across the entire dashboard.

### Period Selector

**Purpose**: Choose the time period for all metrics and charts.

**Options**:
- **Month View**: Select specific month (e.g., "November 2024")
- **Quarter View**: Q1, Q2, Q3, Q4
- **Year View**: Calendar year (2024, 2023, etc.)
- **Custom Range**: Pick start and end dates
- **Quick Filters**:
  - Last 7 Days
  - Last 30 Days
  - Last 90 Days
  - Year to Date
  - Last 12 Months

**How to Use**:
1. Click the period dropdown
2. Select view type (Month, Quarter, Year, Custom)
3. Choose specific period or range
4. Dashboard updates automatically

**Pro Tips**:
- Use arrow keys to navigate months/quarters
- Press `T` for "Today" (current month)
- Press `Y` for "Year to Date"
- Custom range supports date picker or manual entry

### Program Filter

**Purpose**: Filter by specific CSR programs.

**Available Programs** (varies by tenant):
- Buddy Program
- Language Connect
- Job Readiness
- Digital Skills
- Mentorship
- Community Integration

**How to Use**:
- **Single Program**: Click program name
- **Multiple Programs**: Hold `Ctrl/Cmd` and click
- **All Programs**: Click "All" or clear selection
- **Compare**: Select 2-3 programs to see side-by-side comparison

**Visual Indicator**: Selected programs are highlighted with colored badges.

### Cohort Filter

**Purpose**: View data for specific participant groups.

**Common Cohorts**:
- 2024-Q1, 2024-Q2, 2024-Q3, 2024-Q4
- New Arrivals (< 6 months in country)
- Established (6+ months)
- High Engagement (80%+ participation)
- By Geography (if applicable)

**How to Use**:
1. Click "Cohort" dropdown
2. Select one or more cohorts
3. Click "Apply"
4. Dashboard shows filtered data

**Use Cases**:
- Track a specific cohort over time
- Compare cohorts (e.g., Q1 vs Q2 performance)
- Isolate high-performing groups
- Identify trends by arrival period

### Advanced Filters (Collapsed by default)

Click **"Advanced Filters"** to expand:

**Additional Options**:
- **Location**: Filter by city/region
- **Volunteer Type**: Individual, Corporate, Student
- **Participant Status**: Active, Completed, Dropped Out
- **Feedback Source**: Buddy, Language Teacher, Check-in
- **Confidence Threshold**: Minimum Q2Q confidence (0.70, 0.80, 0.90)

**Reset Filters**: Click "Reset All" to return to default view.

---

## 3. KPI Cards

KPI cards provide at-a-glance metrics with interactive features.

### Common Elements on All Cards

Every KPI card includes:

1. **Icon**: Visual identifier (unique per metric)
2. **Title**: Metric name
3. **Value**: Current metric value (large, bold)
4. **Trend Indicator**:
   - ▲ Green: Increasing (good)
   - ▼ Red: Decreasing (needs attention)
   - ─ Gray: No significant change
5. **Percentage Change**: vs. previous period
6. **Sparkline**: Mini trend chart (last 6 periods)
7. **Actions**:
   - "View Evidence" button
   - "More Details" link
   - "Export" icon

### SROI Card (Social Return on Investment)

**What It Shows**: The social value created for every dollar invested.

**How to Read**:
- **3.2x**: For every $1 invested, $3.20 of social value created
- **Higher is better**
- Industry benchmark: 2.5x - 4.0x

**Example Display**:
```
┌──────────────────────────┐
│ 💰 SROI                  │
│                          │
│     3.2x  ▲ +8%          │
│     ━━━━━━━━━━━━━━━━━━   │ ← Sparkline
│                          │
│ [View Evidence]          │
└──────────────────────────┘
```

**Drill-Down**: Click card to see:
- Program-specific SROI
- Cost breakdown
- Value attribution
- Historical trends

### VIS Card (Volunteer Impact Score)

**What It Shows**: Aggregated volunteer effectiveness (0-100 scale).

**How to Read**:
- **0-50**: Low impact, needs improvement
- **51-70**: Moderate impact
- **71-85**: High impact
- **86-100**: Excellent impact

**Factors Contributing to VIS**:
- Engagement frequency
- Outcome scores from participants
- Consistency over time
- Feedback quality

**Example Display**:
```
┌──────────────────────────┐
│ 🤝 VIS                   │
│                          │
│     82  ▲ +5%            │
│     ━━━━━━━━━━━━━━━━━━   │
│                          │
│ [View Evidence]          │
└──────────────────────────┘
```

**Drill-Down**: Click card to see:
- Top-performing volunteers
- Distribution by program
- Individual volunteer scores
- Recognition candidates

### Integration Score Card

**What It Shows**: Participant integration into community/workplace (0-1 scale).

**How to Read**:
- **0.00-0.49**: Low integration
- **0.50-0.69**: Moderate integration
- **0.70-0.84**: Good integration
- **0.85-1.00**: Excellent integration

**Dimensions**:
- Confidence (self-efficacy)
- Belonging (social connections)
- Language Level Proxy
- Job Readiness
- Well-being

**Example Display**:
```
┌──────────────────────────┐
│ 📊 Integration Score     │
│                          │
│     0.78  ─ +0%          │
│     ━━━━━━━━━━━━━━━━━━   │
│                          │
│ [View Evidence]          │
└──────────────────────────┘
```

**Drill-Down**: Click card to see:
- Dimension breakdown (radar chart)
- Individual vs. aggregate scores
- Cohort comparisons
- Trend analysis

### Participation Metrics Card

**What It Shows**: Participant counts, completion rates, active programs.

**Key Metrics**:
- **Total Participants**: Active in current period
- **Completion Rate**: % who completed programs
- **Active Programs**: Number of running programs
- **Average Duration**: Average participation time

**Example Display**:
```
┌──────────────────────────┐
│ 👥 Participants          │
│                          │
│     1,234  ▲ +12%        │
│     Completion: 89%      │
│                          │
│ [View Evidence]          │
└──────────────────────────┘
```

**Drill-Down**: Click card to see:
- Participant demographics
- Program enrollment breakdown
- Dropout analysis
- Engagement trends

### Interacting with KPI Cards

**Hover Effects**:
- Sparkline expands to show exact values
- Tooltip displays previous period value
- "View Evidence" button highlights

**Click Actions**:
- **Card Body**: Open detailed metric page
- **View Evidence**: Open evidence drawer
- **Export Icon**: Quick export to CSV

**Keyboard Navigation**:
- `Tab`: Move between cards
- `Enter`: Open selected card
- `E`: View evidence for focused card

---

## 4. Charts & Visualizations

Below the KPI cards, you'll find interactive charts.

### Trend Analysis Chart

**Chart Type**: Multi-line chart

**Purpose**: Show metric trends over time.

**Features**:
- **Multiple Metrics**: Display up to 5 metrics simultaneously
- **Time Range**: Last 12 months or custom
- **Hover Tooltips**: Exact values and dates
- **Legend**: Click to toggle metrics on/off
- **Zoom**: Click and drag to zoom into a period
- **Export**: PNG, SVG, CSV options

**How to Use**:
1. Select metrics from dropdown (top right of chart)
2. Hover over data points for details
3. Click legend items to hide/show metrics
4. Click and drag to zoom
5. Double-click to reset zoom

**Example Insights**:
- "SROI increased 15% over the last 6 months"
- "VIS dropped in Q2 but recovered in Q3"
- "Participation peaked in September"

### Program Breakdown Chart

**Chart Type**: Bar or Pie chart (toggle in settings)

**Purpose**: Compare metrics across programs.

**Features**:
- **Side-by-Side Comparison**: See all programs at once
- **Percentage Mode**: Show as % of total
- **Absolute Mode**: Show raw values
- **Hover Details**: Program name, value, percentage
- **Click**: Drill into program details

**How to Use**:
1. Toggle between bar/pie view (icon top right)
2. Hover for details
3. Click segment/bar to filter dashboard to that program
4. Click again to clear filter

**Example Display** (Bar Chart):
```
Buddy Program    ████████████████████ 45%
Language Connect █████████████ 30%
Job Readiness    ████████ 25%
```

**Example Insights**:
- "Buddy Program contributes 45% of total impact"
- "Language Connect has highest completion rate"

### Outcome Distribution (Radar Chart)

**Chart Type**: Radar/Spider chart

**Purpose**: Visualize Q2Q outcome dimensions.

**Dimensions**:
1. Confidence
2. Belonging
3. Language Level Proxy
4. Job Readiness
5. Well-being

**How to Read**:
- Each axis represents a dimension (0 at center, 1 at edge)
- Larger area = better outcomes
- Balanced shape = well-rounded program
- Skewed shape = strength in specific areas

**Features**:
- **Compare Periods**: Overlay previous period
- **Compare Programs**: Overlay different programs
- **Hover**: See exact dimension scores
- **Click Dimension**: Filter evidence to that dimension

**Example Display**:
```
        Confidence
            🔵
            ╱ ╲
           ╱   ╲
Well-being      Belonging
    🔵─────────🔵
      ╲       ╱
       ╲     ╱
        ╲   ╱
         ╲ ╱
Job Ready───Lang Level
  🔵         🔵
```

**Example Insights**:
- "Strong confidence and belonging, but language needs support"
- "Well-rounded outcomes across all dimensions"

### Time Series Heatmap (Advanced)

**Chart Type**: Calendar heatmap

**Purpose**: Visualize activity patterns and seasonality.

**Features**:
- **Day-by-Day**: See daily participation levels
- **Color Intensity**: Darker = higher activity
- **Hover**: Exact count and date
- **Click**: Filter to that day

**Use Cases**:
- Identify busy periods
- Spot seasonal trends
- Plan resource allocation

### Chart Interactions

**Common Actions on All Charts**:

| Action | Result |
|--------|--------|
| **Hover** | Show tooltip with details |
| **Click** | Filter dashboard or drill down |
| **Export Icon** | Download chart (PNG, SVG, CSV) |
| **Fullscreen Icon** | Expand chart to full screen |
| **Settings Icon** | Chart-specific options |
| **Refresh Icon** | Reload chart data |

**Keyboard Shortcuts**:
- `F`: Fullscreen active chart
- `X`: Export active chart
- `R`: Refresh active chart
- `Arrow Keys`: Navigate between charts

---

## 5. Widget Interactions

### Evidence Drawer

Click "View Evidence" on any KPI card to open the evidence drawer.

**What It Shows**:
- Redacted evidence snippets
- Q2Q scores (dimension, score, confidence)
- Provenance (source, date, method)
- Pagination (10 per page)

**How to Use**:
1. Click "View Evidence" on KPI card
2. Drawer slides in from right
3. Scroll through evidence
4. Use filters to narrow down
5. Click "Export" to save evidence
6. Click X or press `Esc` to close

**See Also**: [Evidence Explorer Guide](./evidence_explorer.md)

### Quick Export

Click the export icon (top right) for instant data export.

**Export Options**:
- **Current View**: All visible data
- **Metrics Only**: KPI values as CSV
- **Charts**: All charts as PNG
- **Evidence**: Full evidence lineage

**Format Options**: CSV, JSON, PDF

**See Also**: [Exports & Scheduling Guide](./exports_scheduling.md)

### Notifications Panel

Click the bell icon to view notifications.

**Notification Types**:
- **Metric Alerts**: KPI exceeded threshold
- **Report Ready**: Scheduled report completed
- **System**: Maintenance, updates
- **Feedback**: New participant feedback

**Actions**:
- Click notification to view details
- Mark as read
- Clear all
- Configure alert thresholds in Settings

---

## 6. Responsive Design & Mobile

The dashboard is fully responsive and works on all devices.

### Mobile View (< 768px)

**Layout Changes**:
- Navigation collapses to hamburger menu
- KPI cards stack vertically
- Charts resize to fit screen
- Filters move to slide-out panel

**Touch Interactions**:
- Swipe left/right to navigate
- Tap and hold for context menu
- Pinch to zoom charts
- Pull down to refresh

**Mobile-Specific Features**:
- Bottom navigation bar
- Simplified charts (reduced complexity)
- Lazy loading for performance

### Tablet View (768px - 1024px)

**Layout**:
- 2-column KPI cards
- Side-by-side charts
- Drawer opens as modal

### Desktop View (> 1024px)

**Layout**:
- 4-column KPI cards
- Multi-column charts
- Drawer slides from side

---

## 7. Customization Options

### Dashboard Settings

Access via Settings > Dashboard:

**Layout Options**:
- **KPI Order**: Drag and drop to reorder
- **Chart Visibility**: Hide/show specific charts
- **Default Period**: Set your preferred default
- **Default Filters**: Save frequently-used filters

**Display Preferences**:
- **Theme**: Light, Dark, Auto
- **Density**: Compact, Comfortable, Spacious
- **Number Format**: 1,234 vs 1234 vs 1.234
- **Date Format**: MM/DD/YYYY vs DD/MM/YYYY

**Performance**:
- **Auto-Refresh**: Enable/disable (default: every 15 min)
- **Animation**: Enable/disable chart animations
- **Data Points**: Limit chart data points for performance

---

## 8. Performance Tips

### Optimizing Dashboard Load Time

**Best Practices**:
1. Use specific date ranges (avoid "All Time")
2. Filter to relevant programs only
3. Limit concurrent visualizations
4. Enable auto-refresh only if needed
5. Use monthly view instead of daily for large ranges

**Browser Caching**:
- Dashboard caches data for 15 minutes
- Force refresh with `Ctrl/Cmd + Shift + R`
- Clear cache in Settings if data seems stale

### Handling Large Data Sets

If your dashboard is slow:

1. **Narrow Date Range**: Use last 3 months instead of year
2. **Filter Programs**: Select 1-2 programs instead of all
3. **Reduce Chart Complexity**: Hide unused charts
4. **Use Pagination**: Load data in chunks
5. **Contact Support**: We can optimize your tenant settings

---

## 9. Troubleshooting

### "No Data Available"

**Possible Causes**:
- Filters too restrictive
- No data for selected period
- Data sync issue

**Solutions**:
1. Click "Reset Filters"
2. Try a different date range
3. Check with admin about data connections
4. Force refresh (↻ icon)

### "Charts Not Loading"

**Possible Causes**:
- Network issue
- Browser compatibility
- Ad blocker interference

**Solutions**:
1. Check internet connection
2. Try a different browser (Chrome, Firefox recommended)
3. Disable ad blockers for TEEI domain
4. Clear browser cache

### "KPI Values Seem Wrong"

**Possible Causes**:
- Incorrect filters applied
- Cached data
- Period misalignment

**Solutions**:
1. Verify filters (check period, program, cohort)
2. Force refresh
3. Compare with previous reports
4. Contact support with specifics

---

## 10. Keyboard Shortcuts

Master the dashboard with these shortcuts:

### Navigation

| Shortcut | Action |
|----------|--------|
| `G` then `D` | Go to Dashboard |
| `G` then `R` | Go to Reports |
| `G` then `E` | Go to Evidence |
| `G` then `S` | Go to Settings |

### Filters

| Shortcut | Action |
|----------|--------|
| `F` | Open filter menu |
| `P` | Open period selector |
| `T` | Today/This Month |
| `Y` | Year to Date |
| `Q` | This Quarter |

### Actions

| Shortcut | Action |
|----------|--------|
| `R` | Refresh dashboard |
| `X` | Export current view |
| `N` | Open notifications |
| `?` | Show all shortcuts |
| `Esc` | Close modal/drawer |

### Chart Interactions

| Shortcut | Action |
|----------|--------|
| `Arrow Keys` | Navigate between charts |
| `Enter` | Expand focused chart |
| `F` | Fullscreen active chart |
| `X` | Export active chart |

---

## 11. Best Practices

### Daily Check (2 minutes)

- [ ] Log in and review top 4 KPIs
- [ ] Check for trend changes (sparklines)
- [ ] Review any alerts/notifications
- [ ] Note any anomalies for investigation

### Weekly Review (10 minutes)

- [ ] Switch to "Last 7 Days" view
- [ ] Review trend analysis chart
- [ ] Check program breakdown changes
- [ ] Export weekly snapshot for team
- [ ] Investigate any significant changes

### Monthly Deep Dive (30 minutes)

- [ ] Generate monthly report
- [ ] Review all KPIs in detail
- [ ] Drill into evidence for outliers
- [ ] Compare month-over-month trends
- [ ] Share insights with stakeholders

---

## 12. Next Steps

Now that you understand dashboard navigation:

1. ✅ Read [Report Generation Guide](./report_generation.md)
2. ✅ Explore [Evidence Explorer](./evidence_explorer.md)
3. ✅ Learn about [Exports & Scheduling](./exports_scheduling.md)
4. ✅ Watch the Dashboard Deep Dive video (15 min)

---

## FAQ

**Q: Can I customize which KPIs are shown?**
A: Yes! Admins can configure KPI visibility in Settings > Dashboard. Contact your admin to request changes.

**Q: How far back does historical data go?**
A: Depends on your tenant setup. Most tenants have 12-24 months of history. Contact support for specifics.

**Q: Can I export the entire dashboard?**
A: Yes! Click Export > "Current View" > PDF to get a full dashboard snapshot.

**Q: Why do some charts show "Insufficient Data"?**
A: This means there's not enough data for the selected filters. Try expanding the date range or removing filters.

**Q: Can I share my dashboard view with others?**
A: Yes! Use the "Share" icon to copy a URL with your current filters. Others with access can see the same view.

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Feedback**: docs-feedback@teei.io
