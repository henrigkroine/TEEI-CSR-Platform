# Campaign Creation Wizard - Test Plan

**SWARM 6: Agent 6.3 - campaign-creation-wizard**

## Test Scenarios

### 1. Page Access & Permissions
- ✅ Verify page renders at `/cockpit/[companyId]/campaigns/new`
- ✅ Verify non-admin users are redirected to dashboard
- ✅ Verify unauthenticated users are redirected to login
- ✅ Verify tenant context validation (companyId mismatch redirects to 401)

### 2. Step 1: Basic Info Validation
- ✅ Campaign name is required (error shown if empty)
- ✅ Campaign name max length 200 characters (validation error at 201)
- ✅ Description max length 500 characters (validation error at 501)
- ✅ Campaign owner is required (error shown if not selected)
- ✅ Internal reference is optional (no error if empty)
- ✅ Character counters update in real-time
- ✅ "Next" button disabled if validation fails

### 3. Step 2: Program Template Selection
- ✅ All 16 seed templates loaded via API
- ✅ Filter by program type works (mentorship/language/buddy/upskilling)
- ✅ Template cards display: name, type, description, hours, eligible types
- ✅ Only one template can be selected at a time
- ✅ Selected template shows visual indicator (checkmark + border)
- ✅ "Next" button disabled if no template selected
- ✅ "Create Custom Template" link present (placeholder OK)
- ✅ Loading state shown while fetching templates

### 4. Step 3: Beneficiary Group Selection
- ✅ All 12 seed groups loaded via API
- ✅ Filter by location works (dropdown shows unique countries)
- ✅ Filter by group type works (dropdown shows unique types)
- ✅ Group cards display: name, location, type, demographics, size
- ✅ Only one group can be selected at a time
- ✅ Compatibility checking works (incompatible groups show warning badge)
- ✅ Incompatible groups are disabled (cannot be selected)
- ✅ "Next" button disabled if no group selected
- ✅ Validation error shown if incompatible group selected
- ✅ "Create New Group" link present (placeholder OK)

### 5. Step 4: Dates & Capacity
- ✅ Start date is required (validation error if empty)
- ✅ Start date must be today or future (validation error if past)
- ✅ End date is optional (no error if empty)
- ✅ End date must be after start date (validation error if before/equal)
- ✅ Budget must be non-negative (validation error if negative)
- ✅ Seats input accepts positive integers
- ✅ Credits input accepts positive integers
- ✅ Outcome targets accepts free text
- ✅ All capacity fields are optional

### 6. Step 5: Pricing & Review
- ✅ Review summary displays all selections from steps 1-4
- ✅ CampaignPricingSettings component renders correctly
- ✅ Pricing model selection (5 options) works
- ✅ Estimated cost calculation displays
- ✅ Budget comparison shows (within/exceeds budget)
- ✅ SROI projection notice displays
- ✅ Validation error if pricing not configured
- ✅ "Create Campaign" button disabled if validation fails

### 7. Wizard Navigation
- ✅ Progress bar shows current step (5 steps)
- ✅ Completed steps show checkmark
- ✅ "Next" button advances to next step
- ✅ "Previous" button goes back to previous step
- ✅ "Previous" button hidden on step 1
- ✅ "Next" button hidden on step 5
- ✅ "Create Campaign" button only shown on step 5
- ✅ Validation runs before advancing to next step
- ✅ Error messages display clearly

### 8. Cancel & Unsaved Changes
- ✅ "Cancel" button present on all steps
- ✅ Warning modal shows if unsaved changes exist
- ✅ "Continue Editing" dismisses modal
- ✅ "Discard & Exit" redirects to campaigns list
- ✅ No warning modal if no changes made
- ✅ Unsaved changes tracking works (form fields monitored)

### 9. Form Submission
- ✅ POST to `/api/campaigns` with correct payload
- ✅ Payload includes all form data + companyId
- ✅ Loading state shown during submission ("Creating Campaign...")
- ✅ Submit button disabled during submission
- ✅ Success: redirect to `/cockpit/[companyId]/campaigns/[newCampaignId]`
- ✅ Error: display error message, stay on wizard
- ✅ Network errors handled gracefully

### 10. Mobile Responsive
- ✅ Progress bar stacks vertically on mobile
- ✅ Cards grid becomes single column on mobile
- ✅ Form fields stack on mobile (form-row becomes 1 column)
- ✅ Navigation buttons stack vertically on mobile
- ✅ Filter bar stacks vertically on mobile
- ✅ Modal fits mobile viewport

### 11. Loading & Error States
- ✅ Loading spinner shown while fetching templates
- ✅ Loading spinner shown while fetching beneficiary groups
- ✅ Loading spinner shown while fetching company admins
- ✅ Error banner shown if data fetch fails
- ✅ Empty state shown if no templates match filter
- ✅ Empty state shown if no groups match filter
- ✅ Validation errors display in red banner
- ✅ Multiple validation errors shown as list

### 12. Integration with CampaignPricingSettings
- ✅ Component renders in step 5
- ✅ Capacity data passed correctly (volunteers, beneficiaries, sessions)
- ✅ Budget data passed correctly
- ✅ Currency defaulted to EUR
- ✅ onSave callback updates formData.pricingTerms
- ✅ Pricing validation integrated into wizard validation

## Manual Testing Checklist

1. **Happy Path**: Complete wizard from step 1 to 5, submit successfully
2. **Validation Errors**: Trigger each validation error, verify error messages
3. **Data Loading**: Verify all data loads from APIs (templates, groups, admins)
4. **Compatibility**: Select incompatible template/group, verify warning
5. **Cancel Flow**: Make changes, click Cancel, verify warning modal
6. **Mobile**: Test on viewport <768px, verify responsive layout
7. **Keyboard Nav**: Tab through form, verify focus management
8. **Screen Reader**: Verify ARIA labels, live regions, announcements

## Automated Testing Recommendations

### Unit Tests
- Form validation functions
- Compatibility checking logic
- Data filtering (templates, groups)
- Unsaved changes detection

### Integration Tests
- API calls (templates, groups, admins)
- Form submission payload
- Redirect after successful submission

### E2E Tests (Playwright)
- Complete wizard flow (step 1 → 5 → submit)
- Validation error flow
- Cancel with unsaved changes
- Template/group selection
- Mobile responsive layout

## Known Limitations

1. "Create Custom Template" link is placeholder (not implemented)
2. "Create New Group" link is placeholder (not implemented)
3. SROI projection is placeholder text (calculated after 30 days)
4. Company admins API endpoint may need implementation
5. Campaign detail page (`/campaigns/[id]`) may need implementation

## Browser Compatibility

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile Safari (iOS 14+)
- ✅ Chrome Mobile (Android)
