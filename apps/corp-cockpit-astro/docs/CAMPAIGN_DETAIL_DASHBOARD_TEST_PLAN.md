# Campaign Detail Dashboard - Test Plan

**SWARM 6: Agent 6.2 - campaign-detail-dashboard**

## Overview

Test plan for the Campaign Detail Dashboard feature, covering functionality, performance, accessibility, and edge cases.

---

## 1. Functional Tests

### Page Rendering
- [ ] Page loads at `/[lang]/cockpit/[companyId]/campaigns/[campaignId]`
- [ ] All 6 dashboard sections render correctly
- [ ] Breadcrumb navigation shows correct path
- [ ] Campaign name and status badge display

### Section 1: Campaign Header
- [ ] Campaign name displays correctly
- [ ] Status badge shows correct status (active/paused/completed/draft) with appropriate color
- [ ] Last updated date formats correctly
- [ ] Quick action buttons render (Pause/Resume, Edit Settings, View Evidence)
- [ ] Pause/Resume button disabled when campaign status is "completed"
- [ ] View Evidence link routes to correct evidence page with campaign filter

### Section 2: Key Metrics Cards
- [ ] 4 metric cards render: Participants, Hours, SROI, VIS
- [ ] Participants card shows sum of volunteers + beneficiaries
- [ ] Hours card displays total hours with locale formatting
- [ ] SROI card shows ratio (X:1) or "N/A" if unavailable
- [ ] VIS card shows average score with 1 decimal place or "N/A"
- [ ] Trend indicators show correct direction (↑/↓/→)
- [ ] Trend percentages calculate correctly
- [ ] Lineage integration works for SROI and VIS cards

### Section 3: Capacity Gauges
- [ ] 3 gauges render: Volunteers, Beneficiaries, Budget
- [ ] Each gauge shows current, target, utilization percentage
- [ ] Circular progress animates on load
- [ ] Color coding matches status:
  - Green (<80%): healthy
  - Yellow (80-95%): warning
  - Red (95-100%): critical
  - Dark Red (>100%): over capacity
- [ ] Remaining capacity calculates correctly
- [ ] Alert banner shows when any gauge ≥80% utilization

### Section 4: Time-Series Chart
- [ ] Chart renders with 3 datasets: Hours, SROI, Sessions
- [ ] X-axis labels format based on granularity
- [ ] Y-axes show correct scales (left: Hours/Sessions, right: SROI)
- [ ] Granularity toggle works (Weekly/Monthly/Quarterly)
- [ ] Changing granularity refetches data with correct period parameter
- [ ] Chart legend allows toggling individual series
- [ ] Tooltips show formatted values on hover
- [ ] Chart is responsive on mobile

### Section 5: Financials & Pricing
- [ ] Budget Overview card shows allocated, spent, remaining
- [ ] Burn Rate card shows current vs projected daily burn
- [ ] Burn rate status displays correctly (on_track/over_budget/under_budget)
- [ ] Forecast card shows days until depletion (if applicable)
- [ ] Projected end date calculates and displays correctly
- [ ] Currency symbols display correctly (EUR by default)
- [ ] Negative remaining budget shows in red

### Section 6: Top Volunteers & Evidence
- [ ] Top Volunteers list shows up to 5 volunteers
- [ ] Each volunteer entry shows rank, name, VIS score, hours logged
- [ ] Summary shows total volunteers, avg VIS, avg hours
- [ ] Top Evidence list shows up to 5 evidence snippets
- [ ] Each evidence entry shows rank, text preview, impact score
- [ ] "View All Evidence" link routes correctly with campaign filter
- [ ] Empty state displays when no data available

---

## 2. Data Fetching & Performance

### API Integration
- [ ] Dashboard endpoint `/api/campaigns/:id/dashboard` called on load
- [ ] Time-series endpoint called with correct period parameter
- [ ] Financials, Volunteers, Impact endpoints called independently
- [ ] React Query caches responses for 5 minutes
- [ ] Cache headers (X-Cache: HIT/MISS) respected
- [ ] All endpoints use correct campaignId from route params

### Performance Targets
- [ ] Initial page load <300ms (with cached data)
- [ ] Initial page load <2s (cold start, no cache)
- [ ] Time-series refetch <200ms when changing granularity
- [ ] No layout shift during data loading
- [ ] Loading spinners show for each section independently

### Error Handling
- [ ] 404 error displays user-friendly message when campaign not found
- [ ] Network errors show retry button
- [ ] Individual section errors don't crash entire dashboard
- [ ] Failed API calls log to console for debugging
- [ ] Partial data renders correctly (e.g., dashboard loads even if volunteers fails)

---

## 3. Accessibility (WCAG 2.2 AA)

### Keyboard Navigation
- [ ] All interactive elements (buttons, links, toggles) keyboard accessible
- [ ] Tab order is logical (header → metrics → capacity → chart → financials → leaderboards)
- [ ] Focus indicators visible on all interactive elements
- [ ] Granularity toggle navigable with arrow keys

### Screen Reader Support
- [ ] Section headings have proper aria-labels
- [ ] Capacity gauges announce utilization percentage and status
- [ ] Chart has accessible description
- [ ] Status badges have aria-labels
- [ ] Loading states announced to screen readers
- [ ] Error messages announced to screen readers

### Visual Accessibility
- [ ] Color contrast ≥4.5:1 for text
- [ ] Color not the only indicator (status badges have text + color)
- [ ] Focus indicators visible (2px solid ring)
- [ ] Text scalable to 200% without loss of functionality
- [ ] Touch targets ≥44x44px (WCAG 2.2 AAA)

---

## 4. Responsive Design

### Desktop (≥1024px)
- [ ] All sections display in optimal multi-column layout
- [ ] Capacity gauges in 3-column grid
- [ ] Metrics in 4-column grid
- [ ] Chart height = 400px

### Tablet (768px - 1023px)
- [ ] Sections stack to 2-column layout where appropriate
- [ ] Capacity gauges in 2-column grid
- [ ] Metrics in 2-column grid

### Mobile (<768px)
- [ ] All sections stack vertically
- [ ] Header actions stack and expand to full width
- [ ] Granularity toggle buttons expand to fill width
- [ ] Chart remains readable at reduced height
- [ ] Gauges display in single column
- [ ] Touch targets remain ≥44px

---

## 5. Edge Cases & Error Scenarios

### Missing Data
- [ ] Handles null SROI gracefully (displays "N/A")
- [ ] Handles null VIS gracefully (displays "N/A")
- [ ] Handles empty topVolunteers array (shows empty state)
- [ ] Handles empty topEvidence array (shows empty state)
- [ ] Handles missing forecast data (hides forecast card)

### Extreme Values
- [ ] Budget utilization >100% displays correctly (over capacity)
- [ ] Very large numbers format with locale separators
- [ ] Very small SROI (<0.1) displays with 2 decimal places
- [ ] Negative budget remaining shows in red

### Network Issues
- [ ] Slow API responses show loading spinner
- [ ] Failed API calls show error message + retry option
- [ ] Partial failures allow rest of dashboard to render
- [ ] Stale data displays while refetching (no blank state flicker)

### Permissions
- [ ] Users without VIEW_CAMPAIGNS permission redirected to 401
- [ ] Edit Settings button only shows for users with EDIT_CAMPAIGNS permission
- [ ] Quick actions respect user role

---

## 6. Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS 15+)
- [ ] Chrome Mobile (Android 11+)

---

## 7. Manual Testing Checklist

**Before Production:**
1. Test with real campaign data (active, paused, completed)
2. Test with campaigns at various capacity levels (<50%, 80%, 95%, >100%)
3. Test with campaigns missing SROI/VIS data
4. Test with campaigns with 0 volunteers/evidence
5. Test navigation from Campaigns list to detail page and back
6. Test all quick action buttons
7. Test evidence linking (drill-through from Top Evidence)
8. Verify currency display matches campaign settings
9. Test with different date ranges (7d, 30d, 90d, all)
10. Test granularity switching (weekly → monthly → quarterly)

---

## 8. Automated Test Scenarios (E2E)

```typescript
// Playwright test example
test('Campaign Dashboard loads with all sections', async ({ page }) => {
  await page.goto('/en/cockpit/test-company/campaigns/test-campaign-id');

  // Check header
  await expect(page.locator('h1')).toContainText('Test Campaign');
  await expect(page.locator('.status-badge')).toBeVisible();

  // Check metrics
  await expect(page.locator('.metrics-grid')).toBeVisible();
  await expect(page.locator('.metrics-grid > div')).toHaveCount(4);

  // Check capacity gauges
  await expect(page.locator('.capacity-grid')).toBeVisible();
  await expect(page.locator('.capacity-gauge')).toHaveCount(3);

  // Check chart
  await expect(page.locator('.time-series-chart')).toBeVisible();

  // Check financials
  await expect(page.locator('.financials-grid')).toBeVisible();

  // Check leaderboards
  await expect(page.locator('.leaderboards-grid')).toBeVisible();
});

test('Granularity toggle updates chart', async ({ page }) => {
  await page.goto('/en/cockpit/test-company/campaigns/test-campaign-id');

  await page.click('button:has-text("Weekly")');
  // Verify API call includes period=7d

  await page.click('button:has-text("Monthly")');
  // Verify API call includes period=30d
});

test('Capacity alert shows when utilization ≥80%', async ({ page }) => {
  // Mock API to return 85% budget utilization
  await page.goto('/en/cockpit/test-company/campaigns/high-capacity-campaign');

  await expect(page.locator('.capacity-alert')).toBeVisible();
  await expect(page.locator('.capacity-alert')).toContainText('Capacity Alert');
});
```

---

## 9. Acceptance Criteria Validation

- [x] Page renders at `/cockpit/[companyId]/campaigns/[campaignId]`
- [x] All 6 sections display with real data from API
- [x] Capacity gauges color-coded correctly
- [x] Time-series chart renders with 3 granularity options
- [x] Top volunteers and evidence lists display
- [x] Quick actions route correctly
- [x] Mobile responsive
- [x] Loading states for each section
- [x] Error states handled gracefully

---

## 10. Performance Benchmarks

Target performance metrics:
- **Time to Interactive (TTI):** <2s
- **Largest Contentful Paint (LCP):** <1.5s
- **Cumulative Layout Shift (CLS):** <0.1
- **First Input Delay (FID):** <100ms
- **API Response Time:** <300ms (cached), <500ms (uncached)

---

## Notes for QA Team

1. **Test Data Setup:** Ensure test campaigns have complete data (SROI, VIS, volunteers, evidence) for comprehensive testing.
2. **API Mocking:** Use MSW (Mock Service Worker) for consistent E2E test data.
3. **Visual Regression:** Capture baseline screenshots for all 6 sections across 3 breakpoints.
4. **Accessibility Audit:** Run automated tools (axe, Lighthouse) + manual screen reader testing.
5. **Performance Profiling:** Use Chrome DevTools to verify no memory leaks during granularity switching.

---

**Last Updated:** 2025-11-22
**Author:** Agent 6.2 - campaign-detail-dashboard
