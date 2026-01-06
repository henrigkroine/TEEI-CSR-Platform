# Founding-8 Licensing & License-to-Impact (L2I) Bundles

**Version**: 1.0
**Status**: Active
**Last Updated**: 2025-11-17

## Overview

The Founding-8 licensing model combines traditional SaaS subscription tiers with impact-driven License-to-Impact (L2I) bundles that directly fund TEEI program initiatives. This creates a virtuous cycle where platform revenue directly enables social impact.

## Subscription Plans

### Essentials
**Target**: Small organizations starting their CSR journey
**Base Price**: $499/month (annual: $4,788/year - 20% discount)
**Seat Limit**: 10 users

**Features**:
- ✅ Report Builder (basic quarterly/annual reports)
- ✅ Export PDF/CSV
- ✅ Up to 10 custom metrics
- ✅ 50 reports/month generation limit
- ✅ 500K AI tokens/month
- ✅ 50GB storage
- ✅ Email support (48h SLA)
- ✅ Single region deployment (EU or US)
- ❌ Boardroom Live
- ❌ Natural Language Queries (NLQ)
- ❌ AI Copilot
- ❌ Multi-region deployment
- ❌ External connectors (Benevity, Goodera, Workday)
- ❌ SSO/SAML
- ❌ Custom branding

### Professional
**Target**: Growing organizations with established CSR programs
**Base Price**: $1,499/month (annual: $14,388/year - 20% discount)
**Seat Limit**: 50 users

**Features**:
- ✅ Everything in Essentials
- ✅ **Boardroom Live** (real-time executive dashboards)
- ✅ **NLQ** (Natural Language Queries) - 200 queries/month
- ✅ **AI Copilot** (contextual assistance) - 1M tokens/month
- ✅ Export PPTX (executive packs)
- ✅ Unlimited reports
- ✅ 2M AI tokens/month
- ✅ 200GB storage
- ✅ Forecasting & trend analysis
- ✅ Benchmarking (cohort comparisons)
- ✅ API access (10K requests/month)
- ✅ Priority support (12h SLA)
- ✅ Dual-region deployment (EU + US)
- ✅ 2 external connectors
- ❌ SSO/SAML
- ❌ Custom branding
- ❌ Multi-region (3+ regions)
- ❌ Unlimited connectors

### Enterprise
**Target**: Large organizations with complex global CSR operations
**Base Price**: $4,999/month (annual: $47,988/year - 20% discount)
**Seat Limit**: Unlimited

**Features**:
- ✅ Everything in Professional
- ✅ **Multi-region deployment** (EU, US, UK, APAC)
- ✅ **Unlimited external connectors**
- ✅ **SSO/SAML** (Okta, Azure AD, Google Workspace)
- ✅ **Custom branding** (whitelabel)
- ✅ Unlimited NLQ queries
- ✅ 10M AI tokens/month (custom limits available)
- ✅ Unlimited storage
- ✅ Gen-AI narrative reports
- ✅ SCIM provisioning
- ✅ API access (unlimited)
- ✅ Dedicated support (4h SLA)
- ✅ Custom integrations
- ✅ Advanced RBAC & audit logs
- ✅ Data residency controls
- ✅ CSRD/ESRS compliance toolkit

---

## License-to-Impact (L2I) Bundles

L2I bundles are add-on SKUs that customers can purchase to directly fund TEEI program initiatives. Each bundle maps to specific impact tiers and surfaces recognition metadata.

### L2I SKU Structure

| SKU Code | Name | Price | Impact Tier | Learners Supported | Program Tags | Recognition Level |
|----------|------|-------|-------------|-------------------|--------------|------------------|
| `L2I-250` | Impact Starter | $5,000/year | Tier 1 | 250 learners | Language, Mentorship | Bronze Badge |
| `L2I-500` | Impact Builder | $10,000/year | Tier 2 | 500 learners | Language, Mentorship, Upskilling | Silver Badge |
| `L2I-EXPAND` | Impact Expander | $50,000/year | Tier 3 | 2,500 learners | All programs + WEEI | Gold Badge |
| `L2I-LAUNCH` | Impact Launcher | $100,000/year | Tier 4 | 5,000+ learners | All programs + Custom initiatives | Platinum Badge + Founding-8 Member |

### Program Tag Mapping

**Language**: English language learning for non-native speakers
**Mentorship**: 1:1 mentor matching via buddy system
**Upskilling**: Career development & technical skills (Kintell courses)
**WEEI**: Women's Economic Empowerment Initiative

### Recognition Metadata

Each L2I bundle includes:
- **Impact Badge**: Visual badge for company profile (Bronze/Silver/Gold/Platinum)
- **Founding-8 Status**: Platinum tier unlocks exclusive "Founding-8 Member" designation
- **Impact Certificate**: Annual impact report showing learners served, outcomes, SROI
- **Public Recognition**: Opt-in listing on TEEI public impact directory
- **Quarterly Updates**: Personalized impact stories from funded programs

### L2I Allocation Tracking

The platform tracks:
1. **Total Commitment**: Sum of all L2I bundle purchases
2. **Allocation by Program**: Breakdown by Language/Mentorship/Upskilling/WEEI
3. **Learners Served**: Real-time count of learners benefiting from funding
4. **Outcome Metrics**: SROI, VIS, engagement rates for funded cohorts
5. **Evidence Lineage**: Linking company funding to specific learner outcomes

---

## Feature Gating Matrix

| Feature | Essentials | Professional | Enterprise |
|---------|-----------|--------------|------------|
| Report Builder | ✅ Basic | ✅ Advanced | ✅ Advanced + Gen-AI |
| Boardroom Live | ❌ | ✅ | ✅ |
| NLQ | ❌ | ✅ (200/mo) | ✅ (unlimited) |
| AI Copilot | ❌ | ✅ (1M tokens) | ✅ (10M tokens) |
| Export Formats | PDF, CSV | PDF, CSV, PPTX | PDF, CSV, PPTX |
| External Connectors | 0 | 2 | Unlimited |
| Multi-region | Single | Dual | Global (4+ regions) |
| SSO/SAML | ❌ | ❌ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ |
| API Access | ❌ | ✅ (10K req/mo) | ✅ (unlimited) |
| Seat Limit | 10 | 50 | Unlimited |
| Storage | 50GB | 200GB | Unlimited |
| Support SLA | 48h | 12h | 4h |

---

## Billing Flows

### 1. New Subscription
```
POST /api/billing/subscriptions
{
  "companyId": "uuid",
  "plan": "professional",
  "seatCount": 25,
  "billingPeriod": "annual",
  "paymentMethodId": "pm_xxx"
}

Response:
{
  "subscriptionId": "uuid",
  "status": "active",
  "currentPeriodEnd": "2026-11-17",
  "amount": 14388,
  "currency": "usd"
}
```

### 2. Attach L2I Bundle
```
POST /api/billing/l2i-bundles
{
  "companyId": "uuid",
  "subscriptionId": "uuid",
  "sku": "L2I-500",
  "quantity": 1,
  "programAllocation": {
    "language": 0.4,
    "mentorship": 0.3,
    "upskilling": 0.3
  }
}

Response:
{
  "bundleId": "uuid",
  "sku": "L2I-500",
  "impactTier": "tier2",
  "learnersSupported": 500,
  "recognitionBadge": "silver",
  "annualCommitment": 10000
}
```

### 3. Upgrade Plan
```
PATCH /api/billing/subscriptions/:id
{
  "plan": "enterprise",
  "seatCount": 100
}

Response:
{
  "subscriptionId": "uuid",
  "plan": "enterprise",
  "proratedAmount": 2450,
  "nextBillingAmount": 47988
}
```

### 4. Check Entitlements
```
GET /api/entitlements/me?companyId=uuid

Response:
{
  "plan": "professional",
  "features": {
    "reportBuilder": { "enabled": true, "tier": "advanced" },
    "boardroomLive": { "enabled": true },
    "nlq": { "enabled": true, "quota": { "limit": 200, "used": 45, "resetDate": "2025-12-01" } },
    "aiCopilot": { "enabled": true, "tokenLimit": 1000000, "tokensUsed": 234567 },
    "exportPptx": { "enabled": true },
    "connectors": { "enabled": true, "limit": 2, "active": ["benevity", "goodera"] },
    "sso": { "enabled": false },
    "customBranding": { "enabled": false }
  },
  "l2iBundles": [
    {
      "sku": "L2I-500",
      "impactTier": "tier2",
      "learnersSupported": 500,
      "recognitionBadge": "silver",
      "programAllocation": { "language": 4000, "mentorship": 3000, "upskilling": 3000 }
    }
  ],
  "quotas": {
    "seats": { "limit": 50, "used": 32 },
    "storage": { "limit": 214748364800, "used": 85899345920 },
    "aiTokens": { "limit": 2000000, "used": 234567, "resetDate": "2025-12-01" }
  }
}
```

---

## Invoice Line Items

Example invoice for Professional + L2I-500:

```
Company: Acme Corp
Period: 2025-11-17 to 2026-11-17

Line Items:
1. Professional Plan (annual)           $14,388.00
2. Additional seats (15 @ $20/seat/mo)  $3,600.00
3. L2I-500 Impact Bundle                $10,000.00
   - Language Program allocation        $4,000.00
   - Mentorship Program allocation      $3,000.00
   - Upskilling Program allocation      $3,000.00

Subtotal:                               $27,988.00
Tax (if applicable):                    $0.00
Total:                                  $27,988.00
```

---

## Data Integrity Requirements

1. **Invoices must sum correctly**: `total = plan_base + (seats * seat_price) + l2i_bundles`
2. **Tenant isolation**: All queries MUST filter by `companyId` with Row-Level Security
3. **L2I allocation tracking**: Sum of program allocations MUST equal bundle price
4. **Feature gates**: Entitlement checks MUST return in <50ms (cached)
5. **Audit trail**: All subscription changes logged to `billing_events`
6. **Stripe sync**: Webhook handlers MUST be idempotent (use `stripe_event_id`)

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/billing/subscriptions` | Create subscription | Admin |
| GET | `/api/billing/subscriptions/:companyId` | Get active subscription | Company Admin |
| PATCH | `/api/billing/subscriptions/:id` | Update subscription | Company Admin |
| POST | `/api/billing/subscriptions/:id/cancel` | Cancel subscription | Company Admin |
| POST | `/api/billing/l2i-bundles` | Attach L2I bundle | Company Admin |
| GET | `/api/billing/l2i-bundles/:companyId` | List L2I bundles | Company Admin |
| PATCH | `/api/billing/l2i-bundles/:id/allocate` | Update program allocation | Company Admin |
| GET | `/api/billing/invoices/:companyId` | List invoices | Company Admin |
| GET | `/api/entitlements/me` | Get current entitlements | Any authenticated user |
| POST | `/api/entitlements/check` | Check specific feature | Any authenticated user |

---

## Success Criteria

✅ **Plan Definitions**: Essentials, Professional, Enterprise with clear feature gates
✅ **L2I Bundles**: 4 SKUs with impact tier mapping and recognition metadata
✅ **Enforcement**: Feature gates enforced via `/entitlements/me` endpoint
✅ **Billing Flows**: Create/upgrade/cancel with L2I bundle attachment
✅ **Admin UI**: Plan management, L2I assignment, impact summary dashboard
✅ **Unit Tests**: 80%+ coverage for plan checks, L2I bundle logic
✅ **E2E Tests**: Subscription → entitlement propagation flow
✅ **Data Integrity**: Invoices sum correctly, tenant isolation enforced
✅ **Documentation**: Price cards, API reference, Founding-8 guide

---

## Founding-8 Member Benefits

Organizations purchasing the **L2I-LAUNCH** bundle ($100K/year) unlock exclusive Founding-8 membership:

1. **Platinum Badge**: Displayed on company profile and all generated reports
2. **Founding-8 Seal**: Official designation for early impact investors
3. **Impact Advisory Board**: Quarterly sessions with TEEI leadership to shape program direction
4. **Custom Initiatives**: Propose and fund custom social impact projects
5. **Co-marketing**: Joint case studies, press releases, conference speaking opportunities
6. **Early Access**: Beta features, new connectors, advanced analytics
7. **Enhanced Reporting**: White-glove Gen-AI narrative reports with CSRD alignment
8. **Dedicated CSM**: Assigned Customer Success Manager

---

## Migration Path

Existing customers on legacy plans (starter/pro/enterprise) will be migrated:
- `starter` → `essentials` (feature parity, price match for 6 months)
- `pro` → `professional` (feature parity, grandfathered pricing for 12 months)
- `enterprise` → `enterprise` (seamless transition, no price changes)

---

## Next Steps

1. ✅ Design plan structure and L2I bundles
2. ⏳ Extend database schema for L2I allocations
3. ⏳ Update billing service types and routes
4. ⏳ Implement entitlement enforcement
5. ⏳ Build admin UI for plan management
6. ⏳ Create OpenAPI specification
7. ⏳ Write tests and documentation
8. ⏳ Deploy to staging and validate
