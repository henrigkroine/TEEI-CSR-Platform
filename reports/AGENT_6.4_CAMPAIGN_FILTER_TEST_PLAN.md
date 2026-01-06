# Agent 6.4: Campaign Filter - Test Plan

**Component**: Evidence Explorer Campaign Filter Enhancement
**Date**: 2025-11-22
**Agent**: campaign-filters-evidence (6.4)

---

## Test Scenarios

### 1. Campaign Filter Dropdown

**Test**: Campaign dropdown loads and displays campaigns
- Navigate to `/en/cockpit/{companyId}/evidence`
- Verify campaign dropdown shows "Loading campaigns..." initially
- Verify dropdown populates with company's campaigns after load
- Verify each option shows format: "Campaign Name (status)"
- Verify "All Campaigns" option is available as default

**Expected**: Dropdown functional with all campaigns listed

---

### 2. Campaign Filtering

**Test**: Selecting campaign filters evidence correctly
- Select a campaign from dropdown
- Verify evidence list updates to show only campaign-specific evidence
- Verify evidence count updates to show "X evidence snippets for [Campaign Name]"
- Verify campaign badge appears above evidence list
- Verify existing filters (date, program type, dimension) still work additively

**Expected**: Only evidence for selected campaign is shown

---

### 3. Deep Link Support

**Test**: URL query parameter pre-filters evidence
- Navigate to `/en/cockpit/{companyId}/evidence?campaignId={validCampaignId}`
- Verify campaign dropdown pre-selects the campaign
- Verify evidence list is filtered to that campaign on page load
- Verify campaign badge displays with correct campaign name

**Expected**: Evidence is pre-filtered based on URL parameter

---

### 4. Campaign Badge Display

**Test**: Campaign filter badge shows when active
- Select a campaign from dropdown
- Verify blue badge appears with text "Filtered by campaign: {Campaign Name}"
- Verify secondary text shows "Showing evidence specific to this campaign"
- Verify "Clear Filter" button is visible in badge

**Expected**: Badge displays with campaign name and clear button

---

### 5. Clear Campaign Filter

**Test**: Clear Filter button removes campaign filter
- Select a campaign
- Click "Clear Filter" button in badge
- Verify dropdown resets to "All Campaigns"
- Verify campaign badge disappears
- Verify evidence list shows all evidence (no campaign filter)
- Verify URL parameter `campaignId` is removed from URL

**Expected**: Filter cleared, all evidence shown, URL updated

---

### 6. Empty State - No Evidence for Campaign

**Test**: Empty state displays when campaign has no evidence
- Select a campaign with no evidence (or use test campaign with zero evidence)
- Verify empty state appears with document icon
- Verify message: "No evidence yet for this campaign"
- Verify explanation text mentions volunteers and activities
- Verify "View All Evidence" button is present
- Click "View All Evidence" button
- Verify it clears the campaign filter and shows all evidence

**Expected**: User-friendly empty state with clear action

---

### 7. Mobile Responsiveness

**Test**: Campaign filter works on mobile viewports
- Resize browser to mobile width (375px)
- Verify campaign dropdown is full-width and accessible
- Verify campaign badge wraps properly on mobile
- Verify "Clear Filter" button remains visible and clickable
- Verify empty state is readable on mobile

**Expected**: Fully functional on mobile devices

---

### 8. Filter Persistence During Navigation

**Test**: Filter state behavior
- Select a campaign filter
- Verify filter persists when changing other filters (date, program type)
- Note: Filter should NOT persist when navigating away and back (by design)

**Expected**: Campaign filter works additively with other filters

---

### 9. Error Handling - Campaigns API Failure

**Test**: Graceful degradation when campaigns API fails
- Simulate campaigns service unavailable (network error)
- Verify dropdown shows "All Campaigns" option
- Verify no crashes or console errors
- Verify evidence list still loads (without campaign filter)

**Expected**: Evidence Explorer remains functional without campaigns service

---

### 10. Accessibility

**Test**: Campaign filter is accessible
- Tab through filter controls
- Verify campaign dropdown is keyboard navigable
- Verify "Clear Filter" button has proper `aria-label`
- Verify screen reader announces campaign selection changes
- Test with keyboard only (no mouse)

**Expected**: All interactions work with keyboard, proper ARIA labels

---

## Pass Criteria

✅ All 10 test scenarios pass
✅ No console errors or warnings
✅ Responsive on mobile (≥375px width)
✅ Accessible with keyboard and screen readers
✅ Campaign filter works additively with existing filters

---

## Manual Testing Notes

### Prerequisites
- Campaigns service running at `http://localhost:3002`
- Evidence service running with campaign-linked evidence
- At least 2-3 test campaigns with varying evidence counts
- At least 1 campaign with zero evidence (for empty state test)

### Test Data Requirements
- Company with ID: `{test-company-id}`
- Campaigns:
  - Campaign A: 10+ evidence snippets
  - Campaign B: 5+ evidence snippets
  - Campaign C: 0 evidence snippets (empty state test)

---

## Automated E2E Test Suggestions

```typescript
// Playwright test outline
test('campaign filter deep link', async ({ page }) => {
  await page.goto('/en/cockpit/test-company/evidence?campaignId=test-campaign-1');
  await expect(page.locator('#campaign')).toHaveValue('test-campaign-1');
  await expect(page.locator('text=Filtered by campaign')).toBeVisible();
});

test('campaign filter clears correctly', async ({ page }) => {
  await page.goto('/en/cockpit/test-company/evidence');
  await page.selectOption('#campaign', 'test-campaign-1');
  await page.click('button:has-text("Clear Filter")');
  await expect(page.locator('#campaign')).toHaveValue('');
  await expect(page).not.toHaveURL(/campaignId/);
});

test('empty state for campaign with no evidence', async ({ page }) => {
  await page.goto('/en/cockpit/test-company/evidence');
  await page.selectOption('#campaign', 'empty-campaign-id');
  await expect(page.locator('text=No evidence yet for this campaign')).toBeVisible();
  await page.click('button:has-text("View All Evidence")');
  await expect(page.locator('#campaign')).toHaveValue('');
});
```

---

## Completion Checklist

- [x] Campaign dropdown implemented
- [x] Campaign filter integrated with evidence API
- [x] Deep link support via `?campaignId={id}`
- [x] Campaign name badge when filter active
- [x] Evidence count shows campaign name
- [x] "Clear Filter" button functional
- [x] Empty state message for campaigns with no evidence
- [x] Mobile responsive design
- [x] API proxy endpoint created (`/api/campaigns`)
- [x] Environment variable added (`CAMPAIGNS_SERVICE_URL`)
- [ ] Manual testing completed (blocked: campaigns service not running)
- [ ] E2E tests written (future work)
- [ ] Visual regression tests updated (future work)
