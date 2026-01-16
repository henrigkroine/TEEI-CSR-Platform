# TEEI User Portals

**Last Updated**: 2025-01-27

---

## Overview

User portals are public-facing or participant-facing interfaces separate from the corporate admin dashboard.

---

## WBP Portal (Welcome Buddy Program)

**Status**: ❓ Not found in current codebase  
**Expected Location**: `wbp-portal/` or similar

### Expected Features (if exists)

#### Buddy Portal
- Buddy dashboard
- Match information
- Meeting scheduling
- Check-in forms
- Feedback submission

#### Participant Portal
- Participant dashboard
- Buddy information
- Event calendar
- Progress tracking

### Auth System
- **Expected**: Magic link or LinkedIn OAuth
- **Status**: ❓ Unknown

### LiveKit Integration
- **Expected**: Video calls for buddy sessions
- **Status**: ❓ Unknown (LiveKit not found in codebase)

### Messaging System
- **Expected**: In-app messaging between buddies
- **Status**: ❓ Unknown

---

## Skills Academy Portal

**Status**: ❓ Not found in current codebase  
**Expected Location**: `skills-academy/` or similar

### Expected Features (if exists)

#### Learner Dashboard
- Course catalog
- Enrollment management
- Progress tracking
- Certificate viewing

#### Course Enrollment
- Browse courses
- Enroll in courses
- Track completion

#### Progress Tracking
- Course progress percentage
- Module completion
- Time spent
- Quiz scores

#### Certificate Generation
- Automatic certificate on completion
- Download certificates
- Share certificates

---

## Portal Pages Found

### Corporate Cockpit Portal Pages

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **Portal Home** | `/portal.astro` | Portal landing page | ✅ |
| **Portal Index** | `/en/portal/index.astro` | English portal | ✅ |

### Partner Portal Pages

| Page | Route | Purpose | Status |
|------|-------|---------|--------|
| **Partner Dashboard** | `/en/partners/[partnerId]/index.astro` | Partner view | ✅ |
| **Partner Tenants** | `/en/partners/[partnerId]/tenants.astro` | Tenant management | ✅ |
| **Partner Dashboard (UK)** | `/uk/partners/[partnerId]/index.astro` | UK locale | ✅ |
| **Partner Dashboard (NO)** | `/no/partners/[partnerId]/index.astro` | Norwegian locale | ✅ |

---

## Authentication Systems

### Magic Link Auth
- **Status**: ❓ Unknown (not found in codebase)
- **Expected**: Email-based passwordless login

### LinkedIn OAuth
- **Status**: ❓ Unknown (not found in codebase)
- **Expected**: Professional network login for WBP

### Google OAuth
- **Status**: ✅ Configured (via API Gateway)
- **Used In**: SSO for corporate users

---

## Portal Status Summary

| Portal | Status | Pages Found | Auth | Data Connected |
|--------|--------|-------------|------|----------------|
| **WBP Portal** | ❓ | 0 | ❓ | ❓ |
| **Skills Academy** | ❓ | 0 | ❓ | ❓ |
| **Partner Portal** | ✅ | 4 | ✅ | ✅ |
| **Corporate Portal** | ✅ | 2 | ✅ | ✅ |

---

## Missing Portals

The following portals were mentioned in the original requirements but not found:

1. **WBP Portal** - Welcome Buddy Program participant/buddy interface
2. **Skills Academy** - Learning management system portal

**Possible Reasons**:
- Not yet implemented
- Moved to different location
- Integrated into Corporate Cockpit
- Legacy/removed

---

## Recommendations

1. **Search for Portal Code**: Check if WBP/Skills Academy code exists elsewhere
2. **Document if Missing**: If portals don't exist, document as planned features
3. **Check Legacy Code**: Look for old portal implementations
4. **Verify Requirements**: Confirm if portals are still needed

---

**Next**: See [07-BADGE-CERTIFICATE.md](./07-BADGE-CERTIFICATE.md) for badge system documentation.
