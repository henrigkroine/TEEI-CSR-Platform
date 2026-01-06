# Investigation: Grant Terminology in TEEI CSR Platform

**Date**: 2025-01-27  
**Status**: 🔴 **CRITICAL MISMATCH IDENTIFIED**

---

## Executive Summary

The TEEI CSR Platform codebase contains extensive "grant" terminology that is **incorrect** for the actual product. The platform is a **volunteer program management and impact measurement system**, NOT a grant application or management system.

**Root Cause**: The design blueprint (`EXPERIENCE_BLUEPRINT_HANDOFF.md`) was created for a "TEEI Grant Manager" product, and the codebase was built following that blueprint without updating terminology to match the actual CSR Platform purpose.

**Impact**: 
- **73+ references** to "grant" terminology across the codebase
- **Confusing user experience** - landing page and dashboard mention grants
- **Misaligned product messaging** - contradicts platform overview documentation
- **Surface-level changes** - mostly copy/text, not deep architectural issues

---

## 1. Files Containing Grant References

### Critical User-Facing Files (HIGH PRIORITY)

| File | Grant References | Impact |
|------|------------------|--------|
| `apps/corp-cockpit-astro/src/pages/en/index.astro` | 6 references | **Landing page** - first impression |
| `apps/corp-cockpit-astro/src/components/dashboard/GrantPipeline.tsx` | 3 references | **Component name + UI** |
| `apps/corp-cockpit-astro/src/components/dashboard/ActionableItems.tsx` | 3 references | **Item IDs** (`grant-ua`, `grant-wee`, `grant-stem`) |
| `apps/corp-cockpit-astro/src/layouts/CockpitLayout.astro` | 2 references | **Navigation label + sidebar copy** |
| `apps/corp-cockpit-astro/src/layouts/CockpitExperienceLayout.astro` | 3 references | **Brand title "Grant Manager" + nav label** |
| `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/index.astro` | 4 references | **Dashboard page title + sample data** |

### Documentation Files

| File | Grant References | Impact |
|------|------------------|--------|
| `docs/EXPERIENCE_BLUEPRINT_HANDOFF.md` | 5+ references | **Design handoff doc** - source of confusion |
| `apps/corp-cockpit-astro/docs/EXPERIENCE_BLUEPRINT.md` | 4 references | **Design system doc** |

### Database Schema (FALSE POSITIVES - OK)

| File | Grant References | Status |
|------|------------------|--------|
| `packages/shared-schema/src/schema/entitlements.js` | Multiple | ✅ **OK** - These are "entitlement grants" (feature flags), not grant applications |

---

## 2. Origin Analysis

### The Source Document

**File**: `docs/EXPERIENCE_BLUEPRINT_HANDOFF.md`  
**Title**: "TEEI Grant Manager — Experience Blueprint Handoff"

This document was created as a design handoff for a "Grant Manager" product. Key evidence:

```markdown
# TEEI Grant Manager — Experience Blueprint Handoff

This document captures the design tokens, layout system, component specs, and interaction guidance for the refreshed cockpit experience...
```

### What Happened

1. **Design Phase**: Blueprint created for "Grant Manager" product
2. **Development Phase**: Codebase built following blueprint exactly
3. **Product Pivot/Mismatch**: Actual product is CSR Platform (volunteer programs), not grant management
4. **Terminology Never Updated**: Grant references remained in code

### Evidence of Mismatch

The blueprint document itself contains grant-focused language:
- "Grant Pipeline" with stages: Prospect → Qualified → Drafting → Submitted
- "Grant approvals"
- "Grant velocity"
- "briefs that actually move grants forward"

But the actual platform (per `TEEI_PLATFORM_OVERVIEW.md`) is:
- Volunteer program management
- Impact measurement (SROI, VIS)
- CSR reporting
- **NOT** grant applications

---

## 3. Detailed Findings

### Landing Page (`/en/index.astro`)

**Current Copy**:
- "Run grant approvals, AI narratives, and compliance from one control room"
- "Grant Pipeline" feature badge
- "Grant velocity" in operational guardrails
- "briefs that actually move grants forward"

**Should Be**:
- "Run volunteer programs, AI insights, and compliance from one control room"
- "Campaign Pipeline" or "Program Pipeline"
- "Program velocity" or "Campaign velocity"
- "briefs that actually move campaigns forward"

### Dashboard Components

#### GrantPipeline Component

**Current**:
- Component name: `GrantPipeline`
- Title: "Grant Pipeline"
- Stages: Prospect → Qualified → Drafting → Submitted (grant application stages)

**Should Be**:
- Component name: `CampaignPipeline` or `ProgramPipeline`
- Title: "Campaign Pipeline" or "Program Pipeline"
- Stages: Planning → Active → Review → Completed (campaign lifecycle)

#### ActionableItems Component

**Current**:
- Item IDs: `grant-ua`, `grant-wee`, `grant-stem`
- Titles reference "grant" in some sample data

**Should Be**:
- Item IDs: `campaign-ua`, `campaign-wee`, `campaign-stem` (or `program-*`)
- Titles reference campaigns/programs

### Layout Files

#### CockpitExperienceLayout.astro

**Current**:
- Brand title: "Grant Manager"
- Description: "TEEI Grant Manager Experience"
- Nav label: "Grant Pipeline"

**Should Be**:
- Brand title: "Corporate Cockpit" or "CSR Platform"
- Description: "TEEI Corporate Cockpit Experience"
- Nav label: "Campaign Pipeline" or "Programs"

#### CockpitLayout.astro

**Current**:
- Nav label: "Grant Pipeline"
- Sidebar copy: "Kick off the AI Writer with your latest grant context"

**Should Be**:
- Nav label: "Campaign Pipeline"
- Sidebar copy: "Kick off the AI Writer with your latest campaign context"

---

## 4. Recommended Fixes

### Priority 1: User-Facing Copy (IMMEDIATE)

| Current | Should Be | File |
|---------|-----------|------|
| "Grant approvals" | "Report approvals" or "Campaign approvals" | `en/index.astro` |
| "Grant Pipeline" | "Campaign Pipeline" | All dashboard files |
| "Grant Manager" | "Corporate Cockpit" | `CockpitExperienceLayout.astro` |
| "Grant velocity" | "Campaign velocity" | `en/index.astro` |
| "move grants forward" | "move campaigns forward" | `en/index.astro` |
| "grant context" | "campaign context" | `CockpitLayout.astro` |

### Priority 2: Component Names (HIGH)

| Current | Should Be | Impact |
|---------|-----------|--------|
| `GrantPipeline` | `CampaignPipeline` | Component rename + all imports |
| `grant-ua`, `grant-wee`, etc. | `campaign-ua`, `campaign-wee`, etc. | ID updates in ActionableItems |

### Priority 3: Documentation (MEDIUM)

| Current | Should Be | File |
|---------|-----------|------|
| "TEEI Grant Manager" | "TEEI Corporate Cockpit" | `EXPERIENCE_BLUEPRINT_HANDOFF.md` |
| "grant-automation experience" | "CSR management experience" | `EXPERIENCE_BLUEPRINT.md` |
| All grant pipeline references | Campaign/Program pipeline | All docs |

### Priority 4: Sample Data (LOW)

Update hardcoded sample data in:
- `ActionableItems.tsx` - sample items
- `GrantPipeline.tsx` - sample pipeline cards
- `[lang]/cockpit/[companyId]/index.astro` - dashboard sample data

---

## 5. Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Update landing page copy (`en/index.astro`)
2. ✅ Update layout brand titles (`CockpitExperienceLayout.astro`, `CockpitLayout.astro`)
3. ✅ Update navigation labels

### Phase 2: Component Refactoring (2-4 hours)
1. ✅ Rename `GrantPipeline` → `CampaignPipeline`
2. ✅ Update all imports
3. ✅ Update component internal copy
4. ✅ Update ActionableItems IDs

### Phase 3: Documentation (1-2 hours)
1. ✅ Update `EXPERIENCE_BLUEPRINT_HANDOFF.md`
2. ✅ Update `EXPERIENCE_BLUEPRINT.md`
3. ✅ Add note about terminology alignment

### Phase 4: Sample Data (1 hour)
1. ✅ Update hardcoded sample data
2. ✅ Ensure consistency across all dashboard pages

---

## 6. Terminology Mapping

| Grant Term | CSR Platform Term | Rationale |
|------------|-------------------|-----------|
| Grant Pipeline | **Campaign Pipeline** | Campaigns are company-specific program instances |
| Grant approvals | **Report approvals** | Reports need approval, not grants |
| Grant Manager | **Corporate Cockpit** | Matches actual product name |
| Grant briefs | **Campaign briefs** or **Report briefs** | Briefs are for campaigns/reports |
| Grant velocity | **Campaign velocity** | Speed of campaign execution |
| Grant context | **Campaign context** | Context for campaigns |

**Alternative**: Use "Program Pipeline" if campaigns don't fit the mental model, but "Campaign" aligns better with the existing campaign management features.

---

## 7. Impact Assessment

### Surface-Level Changes ✅
- **Mostly copy/text changes** - no deep architectural impact
- Component rename requires import updates but no logic changes
- No database schema changes needed
- No API contract changes

### User Experience Impact 🔴
- **HIGH** - Landing page is first impression
- **HIGH** - Dashboard is primary interface
- **MEDIUM** - Documentation affects developer onboarding

### Risk Assessment
- **LOW RISK** - These are cosmetic changes
- **No breaking changes** - Component rename is internal
- **Easy to rollback** - All changes are in frontend

---

## 8. Files Summary

**Total Files Affected**: ~15 files

**Breakdown**:
- Landing/Marketing pages: 1 file
- Dashboard components: 3 files
- Layout files: 2 files
- Dashboard pages: 1 file
- Documentation: 2 files
- Sample data: Multiple files

**Estimated Effort**: 6-9 hours total

---

## 9. Recommended Next Steps

1. **Immediate**: Update landing page copy to remove "grant" references
2. **This Sprint**: Rename `GrantPipeline` component and update imports
3. **Next Sprint**: Update all documentation
4. **Ongoing**: Add linting rule to catch "grant" terminology in user-facing copy

---

## 10. Validation Checklist

After fixes, verify:
- [ ] Landing page has no "grant" references
- [ ] Dashboard shows "Campaign Pipeline" not "Grant Pipeline"
- [ ] Sidebar shows "Corporate Cockpit" not "Grant Manager"
- [ ] All component names updated
- [ ] All imports updated
- [ ] Documentation updated
- [ ] Sample data updated
- [ ] No broken links or references

---

**Conclusion**: This is a terminology mismatch from the design phase that was never corrected. The fixes are straightforward surface-level changes that will significantly improve product clarity and alignment with the actual platform purpose.



