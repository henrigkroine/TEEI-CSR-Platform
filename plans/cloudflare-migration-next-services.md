# Next Microservices to Migrate
**Date:** 2025-01-27  
**Status:** Planning

---

## ✅ Completed Migrations

1. ✅ **Reporting Service** (port 3001) - SROI/VIS calculations
2. ✅ **Analytics Service** (port 3007) - Metrics endpoints  
3. ✅ **Campaigns Service** (port 3002) - Campaign management

---

## 🎯 Next Priority: Medium Priority Services

### 1. **SSE/Real-Time Service** (port 4017) - HIGHEST PRIORITY
**Current Status:** Proxied through `/api/sse/dashboard.ts`

**Why Next:**
- Critical for dashboard real-time updates
- Currently proxying to external service
- Users expect live data updates

**Migration Approach:**
- **Option A (Recommended):** Use Cloudflare Workers for SSE support
  - Better SSE handling than Pages
  - Can use D1 for event storage
  - Supports long-lived connections
  
- **Option B:** Simplify to polling
  - Replace SSE with periodic API calls
  - Easier but less efficient
  - Good fallback if SSE proves difficult

**Files to Update:**
- `src/pages/api/sse/dashboard.ts` - Currently proxies
- `src/utils/sseClient.ts` - Client-side SSE handler (579 lines)
- `src/hooks/useSSEConnection.ts` - React hook

**Complexity:** Medium-High (SSE requires careful connection management)

**Estimated Effort:** 8-12 hours

---

### 2. **Identity/SSO Service** (port 3017) - MEDIUM PRIORITY
**Current Status:** Used for SSO configuration and SCIM provisioning

**Why Next:**
- Enterprise feature (SSO/SCIM)
- Currently has mock fallback
- Can be simplified for V1

**Migration Approach:**
- **Option A:** Use Cloudflare Workers for SSO
  - Better for SAML/OIDC handling
  - Can integrate with Cloudflare Access
  - More secure for auth flows
  
- **Option B:** Simplify to basic auth
  - Remove SSO for V1
  - Keep email/password only
  - Add SSO later

**Files to Update:**
- `src/api/identity.ts` - Identity API client
- `src/components/identity/*` - SSO/SCIM UI components
- `src/pages/api/identity/*` - New API routes needed

**Complexity:** High (SSO is complex, SCIM even more so)

**Estimated Effort:** 16-24 hours (or 4-8 hours if simplified to basic auth)

**Recommendation:** **Defer to Phase 2** - SSO can wait, focus on core features first

---

### 3. **Q2Q AI Service** (port 3005) - LOW PRIORITY
**Current Status:** Already has fallback mock data

**Why Next:**
- Used for AI insights/narrative clusters
- Already gracefully degrades
- Not critical for V1

**Migration Approach:**
- **Option A:** Mock/Static Data
  - Return static insights for V1
  - No AI processing needed
  - Fastest option
  
- **Option B:** Simplify AI Processing
  - Basic keyword extraction
  - Simple clustering
  - No LLM needed for V1

**Files to Update:**
- `src/api/dashboard.ts` - `fetchAIInsights()` function
- `src/components/dashboard/AIInsights.tsx` - UI component

**Complexity:** Low (already has fallback)

**Estimated Effort:** 2-4 hours (if mocking) or 8-12 hours (if simplifying)

**Recommendation:** **Mock for V1** - AI insights are nice-to-have, not critical

---

## 🔄 Low Priority (Can Defer or Remove)

### 4. **Compliance Service** (port 4017) - LOW PRIORITY
**Current Status:** Already has fallback (returns empty alerts)

**Why Defer:**
- Already gracefully handles missing service
- Returns empty array if unavailable
- Not blocking core functionality

**Migration Approach:**
- Return static/mock compliance data
- Or remove compliance alerts for V1

**Estimated Effort:** 2-4 hours

**Recommendation:** **Defer** - Not critical for MVP

---

### 5. **NLQ Service** (port 3011) - LOW PRIORITY
**Current Status:** Natural language queries

**Why Defer:**
- Advanced feature
- Not in core user flow
- Can be added later

**Recommendation:** **Remove for V1** - Add back in Phase 2 if needed

---

## 📊 Migration Priority Matrix

| Service | Priority | Complexity | Effort | Recommendation |
|---------|----------|------------|--------|----------------|
| **SSE/Real-Time** | 🔴 High | Medium-High | 8-12h | **Migrate Next** |
| **Identity/SSO** | 🟡 Medium | High | 16-24h | **Defer to Phase 2** |
| **Q2Q AI** | 🟢 Low | Low | 2-4h | **Mock for V1** |
| **Compliance** | 🟢 Low | Low | 2-4h | **Defer** |
| **NLQ** | 🟢 Low | Medium | 8-12h | **Remove for V1** |

---

## 🎯 Recommended Next Steps

### Phase 1 (Immediate - Before Production)
1. **SSE/Real-Time Service** → Migrate to Cloudflare Workers or polling
   - Critical for user experience
   - Currently blocking real-time features

### Phase 2 (Post-Launch - Enterprise Features)
2. **Identity/SSO Service** → Migrate to Cloudflare Workers
   - Enterprise requirement
   - Can use Cloudflare Access integration

### Phase 3 (Future Enhancements)
3. **Q2Q AI Service** → Mock or simplify
4. **Compliance Service** → Mock or remove
5. **NLQ Service** → Remove for V1

---

## 💡 Quick Wins (Can Do Now)

### 1. Mock Q2Q AI Service (2 hours)
Replace the service call with static data:
```typescript
// In src/api/dashboard.ts - fetchAIInsights()
// Already has fallback, just remove the try/catch and always return mock
```

### 2. Remove Compliance Service Dependency (1 hour)
```typescript
// In src/api/dashboard.ts - fetchComplianceAlerts()
// Already returns empty array, just remove the service call
```

### 3. Simplify SSE to Polling (4-6 hours)
Replace SSE with periodic API calls:
- Update `useSSEConnection.ts` to use polling
- Remove SSE proxy route
- Simpler, more reliable for V1

---

## 🚀 Recommended Action Plan

### Week 1: Core Functionality
1. ✅ **Done:** Reporting, Analytics, Campaigns
2. **Next:** SSE/Real-Time → Convert to polling (simpler than SSE)
3. **Quick Win:** Mock Q2Q AI and Compliance

### Week 2: Polish & Deploy
1. Test all migrated endpoints
2. Create D1 schema
3. Deploy to Cloudflare Pages

### Post-Launch: Enterprise Features
1. Identity/SSO → Cloudflare Workers
2. Real SSE → Cloudflare Workers (if needed)
3. Advanced AI features

---

## 📝 Notes

- **SSE on Cloudflare Pages:** Limited support, Workers recommended
- **SSO on Cloudflare:** Can use Cloudflare Access (paid feature) or Workers
- **AI Services:** Can be mocked for V1, add real AI later
- **Compliance:** Not critical for MVP, can be static data

---

**Next Action:** Migrate SSE to polling or Cloudflare Workers
