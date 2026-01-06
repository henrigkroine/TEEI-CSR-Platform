# Enterprise Demo Runbook: Executive Dashboard

**Version**: 1.1  
**Date**: 2025-01-27  
**Last Updated**: 2025-01-27  
**Purpose**: Reduce demo risk and improve enterprise credibility of the executive dashboard  
**Target Audience**: Demo presenters, sales engineers, customer success teams  
**Status**: ✅ Production-Ready

---

## Overview

This runbook provides step-by-step instructions for preparing and executing a successful enterprise demo of the TEEI Corporate Cockpit executive dashboard, focusing on the Language Learning and Mentorship programme tiles.

**Demo Route**: `/{lang}/cockpit/{companyId}`  
**Critical Components**: Language Tile Widget, Mentorship Tile Widget

---

## Table of Contents

1. [CSV Data Ingestion](#csv-data-ingestion)
2. [Demo Route and Navigation](#demo-route-and-navigation)
3. [Programme Tiles Display](#programme-tiles-display)
4. [Troubleshooting](#troubleshooting)
5. [Smoke Test Checklist](#smoke-test-checklist)

---

## CSV Data Ingestion

### Where CSV Ingestion Happens

**Service**: `services/kintell-connector`  
**Endpoint**: `POST /import/kintell-sessions`  
**Port**: 3002 (default)  
**Base URL**: `http://localhost:3002` (development) or configured production URL

### CSV Format Documentation

Full CSV format specifications are documented in:
- **File**: `docs/kintell/KINTELL_CSV_FORMATS.md`
- **Schema Validation**: `services/kintell-connector/src/validation/csv-schema.ts`

### How to Ingest CSV for Language Learning Programme

**Programme Type**: Language for Ukraine  
**CSV Format**: Language Practice Sessions (v1.1)

#### Step 1: Prepare CSV File

Create a CSV file with the following required columns:

```csv
session_id,participant_email,volunteer_email,scheduled_at,completed_at,duration_minutes,rating,feedback_text,language_level,topics,metadata
LS-2024-001,anna.k@example.com,tutor1@acme.com,2024-11-01T10:00:00Z,2024-11-01T11:00:00Z,60,5,"Excellent grammar practice",B2,"grammar,writing","{""focus"":""past tense""}"
LS-2024-002,olga.m@example.com,tutor2@acme.com,2024-11-08T14:00:00Z,2024-11-08T14:45:00Z,45,4,"Good progress on conversation",B1,"conversation,pronunciation",
```

**Required Columns**:
- `session_id` (string, 1-255 chars) - Unique session identifier
- `participant_email` (email) - Learner email (must exist in `users` table)
- `volunteer_email` (email) - Tutor/volunteer email (must exist in `users` table)
- `scheduled_at` (datetime, ISO 8601) - Session scheduled time

**Optional Columns**:
- `completed_at` (datetime) - Actual completion time
- `duration_minutes` (integer, 1-480) - Session duration
- `rating` (decimal, 0.0-1.0 or 1-5) - Session rating (normalized to 0-1)
- `feedback_text` (text, 0-5000 chars) - Qualitative feedback
- `language_level` (CEFR: A1/A2/B1/B2/C1/C2) - Current CEFR level
- `topics` (string) - Comma-separated topics
- `metadata` (JSON string) - Additional context (v1.1+)

#### Step 2: Verify User Accounts Exist

Before importing, ensure both participant and volunteer emails exist in the `users` table:

```sql
SELECT email, id, company_id FROM users 
WHERE email IN ('anna.k@example.com', 'tutor1@acme.com');
```

If users don't exist, create them first or the import will fail for those rows.

#### Step 3: Import CSV via API

**Using cURL**:
```bash
curl -X POST http://localhost:3002/import/kintell-sessions \
  -F "file=@language_sessions.csv" \
  -H "Content-Type: multipart/form-data"
```

**Using HTTP Client** (e.g., Postman, Insomnia):
- Method: `POST`
- URL: `http://localhost:3002/import/kintell-sessions`
- Body Type: `form-data`
- Key: `file` (type: File)
- Value: Select your CSV file

**Expected Response** (200 OK):
```json
{
  "processed": 2,
  "created": 2,
  "errors": []
}
```

#### Step 4: Verify Import

Check that sessions were created:
```sql
SELECT COUNT(*) FROM kintell_sessions 
WHERE session_type = 'language' 
AND scheduled_at >= '2024-11-01';
```

### How to Ingest CSV for Mentorship Programme

**Programme Type**: Mentors for Ukraine  
**CSV Format**: Mentorship Sessions (v1.0)

#### Step 1: Prepare CSV File

```csv
session_id,participant_email,mentor_email,scheduled_at,completed_at,duration_minutes,rating,feedback_text,focus_area,goals_discussed
MS-2024-001,anna.k@example.com,john.doe@acme.com,2024-11-01T10:00:00Z,2024-11-01T11:00:00Z,60,5,"Excellent session on career planning",career,"CV,interview,networking"
MS-2024-002,olga.m@example.com,jane.smith@acme.com,2024-11-08T14:00:00Z,2024-11-08T14:45:00Z,45,4,"Discussed education opportunities",education,"university,scholarships"
```

**Required Columns**:
- `session_id` (string) - Unique session identifier
- `participant_email` (email) - Mentee email
- `mentor_email` (email) - Mentor email
- `scheduled_at` (datetime) - Session scheduled time

**Optional Columns**:
- `completed_at` (datetime) - Actual completion time
- `duration_minutes` (integer, 1-480) - Session duration
- `rating` (decimal, 0.0-1.0 or 1-5) - Session rating
- `feedback_text` (text) - Qualitative feedback
- `focus_area` (string) - Primary focus: career, education, integration
- `goals_discussed` (string) - Comma-separated list

#### Step 2-4: Same as Language Learning

Follow the same steps as Language Learning (verify users, import via API, verify import).

**Note**: The system automatically sets `session_type = 'mentorship'` based on the CSV format (mentor_email vs volunteer_email).

---

## Demo Route and Navigation

### Primary Demo Route

**URL Pattern**: `/{lang}/cockpit/{companyId}`

**Examples**:
- English: `http://localhost:4321/en/cockpit/acme-corp`
- Ukrainian: `http://localhost:4321/uk/cockpit/acme-corp`
- Norwegian: `http://localhost:4321/no/cockpit/acme-corp`

### Authentication

1. Navigate to login page: `/login`
2. Enter credentials (demo account)
3. Select tenant/company from tenant selector
4. Redirected to: `/{lang}/cockpit/{companyId}`

### Page Structure

The executive dashboard (`/{lang}/cockpit/{companyId}`) contains:

1. **Page Header**:
   - Title: "Executive Overview"
   - Subtitle: "Social impact metrics for your CSR initiatives"
   - Actions: Programme Selector, Refresh button, New Report button

2. **KPI Grid** (4 cards):
   - SROI (Social Return on Investment)
   - VIS Score (Volunteer Impact Score)
   - AI Coverage
   - Compliance

3. **Main Content Grid**:
   - Left: Actionable Items, Campaign Pipeline
   - Right: AI Insights, Compliance Alerts

**Note**: Programme tiles (Language, Mentorship) are displayed via the Programme Selector component or can be accessed via dedicated programme pages.

---

## Programme Tiles Display

### How to Show Language vs Mentorship Tiles

#### Option 1: Via Programme Selector (Header)

1. Click the **Programme Selector** dropdown in the header
2. Select "Language Connect" or "Mentors for Ukraine"
3. Tiles will filter/display based on selection

#### Option 2: Direct Navigation (If Programme Pages Exist)

Navigate to programme-specific routes (if implemented):
- Language: `/{lang}/cockpit/{companyId}/programmes/language`
- Mentorship: `/{lang}/cockpit/{companyId}/programmes/mentorship`

#### Option 3: Impact Tiles Container Component

The tiles are rendered via the `ImpactTilesContainer` component, which can be embedded on any page:

```tsx
<ImpactTilesContainer
  companyId={companyId}
  period={{ start: '2024-11-01', end: '2024-11-30' }}
  tileTypes={['language', 'mentorship']}
/>
```

### Tile Data Requirements

For tiles to display data (not empty states):

**Language Tile** requires:
- At least one `kintell_sessions` record with:
  - `session_type = 'language'`
  - `scheduled_at` within the selected period
  - Associated `participant_id` and `volunteer_id` (from users table)

**Mentorship Tile** requires:
- At least one `kintell_sessions` record with:
  - `session_type = 'mentorship'`
  - `scheduled_at` within the selected period
  - Associated `participant_id` and `volunteer_id` (from users table)

### Empty State Behavior

Both tiles now display enterprise-appropriate empty states when:
- No sessions exist for the period
- All metrics are zero (no enrollments, no sessions, no volunteer hours)

**Empty State Message**:
- Language: "No language learning sessions found for this period. Data will appear once sessions are recorded."
- Mentorship: "No mentorship sessions found for this period. Data will appear once sessions are booked and completed."

---

## Troubleshooting

### Issue: Tiles Show No Data (Empty States)

#### Check 1: Verify Data Exists in Database

```sql
-- Check language sessions
SELECT COUNT(*) FROM kintell_sessions 
WHERE session_type = 'language' 
AND scheduled_at >= '2024-11-01' 
AND scheduled_at <= '2024-11-30';

-- Check mentorship sessions
SELECT COUNT(*) FROM kintell_sessions 
WHERE session_type = 'mentorship' 
AND scheduled_at >= '2024-11-01' 
AND scheduled_at <= '2024-11-30';
```

**If count is 0**: Data hasn't been imported. Follow CSV ingestion steps above.

#### Check 2: Verify Company ID Matches

```sql
-- Check if sessions are associated with the correct company
SELECT ks.id, ks.session_type, u.company_id 
FROM kintell_sessions ks
JOIN users u ON ks.participant_id = u.id
WHERE u.company_id = 'your-company-id';
```

**If no results**: Sessions are associated with a different company. Either:
- Import CSV with users from the correct company, OR
- Update user `company_id` to match demo company

#### Check 3: Verify Period Range

The tiles use a default period (usually current quarter) if not specified. Check:
- What period is being requested in the API call
- Whether sessions fall within that period

**Solution**: Adjust the period in the API request or ensure sessions are within the expected date range.

#### Check 4: Verify API Endpoint is Accessible

```bash
# Test analytics service health
curl http://localhost:3023/v1/analytics/tiles/health

# Test specific tile
curl "http://localhost:3023/v1/analytics/tiles/language?companyId=your-company-id"
```

**If 500 error**: Check analytics service logs for errors.

**If 404 error**: Verify analytics service is running and route is correct.

#### Check 5: Verify Users Exist

```sql
-- Check participant and volunteer users exist
SELECT email, id, company_id FROM users 
WHERE email IN (
  SELECT DISTINCT participant_email FROM your_csv_data
  UNION
  SELECT DISTINCT volunteer_email FROM your_csv_data
);
```

**If users missing**: Create users first, then re-import CSV.

### Issue: Refresh Button Doesn't Work

**Current Implementation**: The Refresh button:
1. Dispatches a `dashboard-refresh` event (widgets can listen for granular refresh)
2. Shows visual feedback (spinning icon, "Refreshing..." text)
3. Triggers a full page reload after a brief delay

**If button doesn't respond**:
1. Check browser console for JavaScript errors
2. Verify the button ID: `refresh-dashboard-btn`
3. Ensure script is loaded (check Network tab)
4. Check if button is disabled (may be in refreshing state)

**Visual Feedback**:
- Button shows spinner and "Refreshing..." text during refresh
- Button is disabled during refresh to prevent double-clicks
- Page reloads automatically after event dispatch

**Alternative**: Manually refresh the page (F5 or Cmd+R).

### Issue: "Real-time" Subtitle is Misleading

**Status**: ✅ Fixed  
**Change**: Subtitle now reads "Social impact metrics" instead of "Real-time social impact metrics"

**Reason**: The main dashboard does not use Server-Sent Events (SSE) for real-time updates. SSE is only used in Boardroom Live mode.

### Issue: CSV Import Fails

#### Error: "User not found"

**Cause**: Participant or volunteer email doesn't exist in `users` table.

**Solution**:
1. Create user accounts first:
   ```sql
   INSERT INTO users (email, name, company_id, role)
   VALUES ('anna.k@example.com', 'Anna K', 'company-id', 'PARTICIPANT');
   ```
2. Re-import CSV

#### Error: "Invalid date format"

**Cause**: Date format doesn't match expected ISO 8601 format.

**Solution**: Ensure dates are in format: `YYYY-MM-DDTHH:mm:ssZ` or `YYYY-MM-DD`

#### Error: "Rating out of range"

**Cause**: Rating is not in 0-1 or 1-5 scale.

**Solution**: Normalize ratings:
- If 1-5 scale: `(rating - 1) / 4`
- If 0-1 scale: use as-is

### Issue: Tiles Show Error State

**Error Display**: Red alert box with error message and "Retry" button.

**Common Causes**:
1. Analytics service is down
2. Network connectivity issues
3. Invalid company ID
4. Database connection errors

**Debug Steps**:
1. Check analytics service logs
2. Verify network connectivity
3. Check browser console for API errors
4. Verify company ID format (UUID)

---

## Smoke Test Checklist

**Time Budget**: < 5 minutes  
**Purpose**: Validate demo readiness before presentation

### Pre-Demo Checklist

- [ ] **Database**: Verify demo company exists and has associated users
  ```sql
  SELECT id, name FROM companies WHERE id = 'demo-company-id';
  SELECT COUNT(*) FROM users WHERE company_id = 'demo-company-id';
  ```

- [ ] **CSV Data**: Verify sample sessions exist for both programmes
  ```sql
  SELECT session_type, COUNT(*) 
  FROM kintell_sessions 
  WHERE scheduled_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY session_type;
  ```
  **Expected**: At least 5-10 sessions per programme type

- [ ] **Services**: Verify all services are running
  - [ ] Analytics service (port 3023)
  - [ ] Kintell Connector (port 3002)
  - [ ] Frontend (port 4321)

- [ ] **Authentication**: Test login flow
  - [ ] Can log in with demo credentials
  - [ ] Tenant selector displays demo company
  - [ ] Can navigate to dashboard route

### Demo Execution Checklist

- [ ] **Route Access**: Navigate to `/{lang}/cockpit/{companyId}`
  - [ ] Page loads without errors
  - [ ] Header displays "Executive Overview"
  - [ ] KPI cards display values (not loading/error)

- [ ] **Programme Tiles**: Access Language and Mentorship tiles
  - [ ] Language tile displays data OR shows appropriate empty state
  - [ ] Mentorship tile displays data OR shows appropriate empty state
  - [ ] Empty states show enterprise-appropriate messaging (not errors)

- [ ] **Refresh Functionality**: Test refresh button
  - [ ] Click Refresh button
  - [ ] Page reloads
  - [ ] Data refreshes (or same data if no new data)

- [ ] **Data Accuracy**: Verify displayed metrics match database
  - [ ] Session counts match database queries
  - [ ] Volunteer hours calculations are correct
  - [ ] Retention rates are reasonable (0-100%)

### Post-Demo Validation

- [ ] **No Console Errors**: Check browser console for JavaScript errors
- [ ] **No Network Errors**: Check Network tab for failed API calls
- [ ] **Performance**: Page load time < 3 seconds
- [ ] **Accessibility**: Screen reader can navigate tiles (if testing a11y)

### Quick Validation Script

```bash
#!/bin/bash
# Quick smoke test script

echo "Testing Analytics Service..."
curl -s http://localhost:3023/v1/analytics/tiles/health | jq .

echo "Testing Kintell Connector..."
curl -s http://localhost:3002/health | jq .

echo "Testing Frontend..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/

echo "Checking database sessions..."
psql $DATABASE_URL -c "SELECT session_type, COUNT(*) FROM kintell_sessions GROUP BY session_type;"
```

---

## Keyboard Shortcuts & Accessibility

### Keyboard Navigation
- **Tab**: Navigate through interactive elements
- **Enter/Space**: Activate buttons and select dropdown options
- **Escape**: Close modals/dropdowns (where applicable)
- **Ctrl/Cmd + R**: Browser refresh (standard)

### Screen Reader Support
- All tiles have proper ARIA labels
- Loading states announce via `aria-live="polite"`
- Error states use `role="alert"`
- Programme selector has descriptive labels

### Focus Management
- Programme selector shows focus ring on keyboard navigation
- Refresh button maintains focus after action
- Empty state buttons are keyboard accessible

## Performance Optimizations

### Caching Strategy
- Tiles are cached by the analytics service (1-hour TTL default)
- Browser caching enabled for API responses
- Parallel tile fetching for faster load times

### Loading States
- Skeleton loaders show immediately (no blank screens)
- Progressive loading (tiles appear as they're ready)
- Graceful degradation (one tile failure doesn't break others)

### Error Recovery
- Automatic retry on server errors (up to 2 attempts)
- Timeout protection (30-second limit)
- Clear error messages with retry actions

## Additional Resources

- **CSV Format Documentation**: `docs/kintell/KINTELL_CSV_FORMATS.md`
- **Tiles API Documentation**: `docs/cockpit/tiles.md`
- **Corporate Cockpit Overview**: `CORPORATE_COCKPIT_OVERVIEW.md`
- **Demo Walkthrough**: `reports/cockpit_demo_walkthrough.md`
- **Accessibility Guide**: See WCAG 2.2 AA compliance in component documentation

---

## Support Contacts

- **Technical Issues**: Check service logs in `logs/` directory
- **Data Issues**: Verify database state using SQL queries above
- **UI Issues**: Check browser console and network tab

---

**Last Updated**: 2025-01-27  
**Maintained By**: Worker 3 (Corporate Cockpit & Metrics Team)

---

## Recent Enhancements (v1.1)

### ✅ Empty State Improvements
- Enhanced empty state detection (more comprehensive metric checks)
- Added actionable "View Import Guide" buttons in empty states
- Improved messaging to guide users to CSV import solution

### ✅ Refresh Functionality
- Added visual feedback (spinner, disabled state)
- Event-based refresh system (widgets can listen for granular refresh)
- Prevents double-clicks with state management

### ✅ Programme Selector Header
- URL synchronization (deep linking support)
- Browser back/forward navigation support
- Enhanced accessibility (ARIA labels, keyboard navigation)
- Visual focus states for better UX

### ✅ Programme Tiles Component
- Dashboard refresh event listener integration
- Improved error handling with retry logic
- Better loading states with skeletons
- Parallel tile fetching for performance

### ✅ Data Source Clarity
- Removed misleading "Real-time" claims from dashboard subtitle
- Accurate data freshness indicators in tiles
- Clear period display in tile subtitles
