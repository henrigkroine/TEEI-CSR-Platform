# CRITICAL ACCESSIBILITY FIXES - IMMEDIATE ACTION REQUIRED

**Date:** November 14, 2025
**Priority:** P0 - BLOCKING
**Estimated Fix Time:** 5 minutes

---

## 🔴 CRITICAL: Application Won't Build

### Issue
Invalid Tailwind CSS class prevents the application from compiling and running.

**File:** `/apps/corp-cockpit-astro/src/styles/global.css`
**Line:** 126

### Error
```
The `hover:bg-border/50` class does not exist. If `hover:bg-border/50` is a custom class,
make sure it is defined within a `@layer` directive.
```

### Current Code (BROKEN)
```css
.btn {
  @apply btn border border-border bg-background hover:bg-border/50;
}
```

### Fix Option 1: Use Standard Tailwind Class (RECOMMENDED - FASTEST)
```css
.btn {
  @apply btn border border-gray-300 bg-background hover:bg-gray-100;
}
```

### Fix Option 2: Define Color in Tailwind Config
Add to `/apps/corp-cockpit-astro/tailwind.config.mjs`:

```javascript
export default {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: 'hsl(var(--primary))',
        // ... etc
      }
    }
  }
}
```

Then the original code will work.

### Verification Steps

1. Apply the fix
2. Run build:
   ```bash
   cd /home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro
   pnpm build
   ```
3. Should complete without errors
4. Start dev server:
   ```bash
   pnpm dev
   ```
5. Visit http://localhost:4321
6. Verify UI renders correctly

---

## Next Steps After P0 Fix

Once the application builds successfully:

### 1. Run Accessibility Test Suite
```bash
cd /home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro
pnpm playwright test tests/a11y/accessibility.spec.ts --project=chromium
```

### 2. Review Test Results
- Check for any axe-core violations
- Review console output for logged violations
- Update main audit report with actual test results

### 3. Address P1 Issues (1 hour)
See `/reports/a11y_phaseD_audit.md` for:
- Adding main landmark elements
- Implementing skip links
- Adding table scope attributes

---

## Support

For questions contact:
- Accessibility Team: accessibility@teei-platform.com
- Full Audit Report: `/reports/a11y_phaseD_audit.md`
