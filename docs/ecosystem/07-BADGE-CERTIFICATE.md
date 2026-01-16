# TEEI Badge & Certificate System

**Last Updated**: 2025-01-27  
**Status**: ❓ **NOT FOUND IN CODEBASE**

---

## Search Results

**Badge Generation Code**: ❌ Not found  
**Certificate Generation Code**: ❌ Not found  
**Badge Templates**: ❌ Not found  
**Certificate Templates**: ❌ Not found

---

## Expected System (Based on Requirements)

### Supported Badge Types

| Type | Tiers | Template File | Status |
|------|-------|---------------|--------|
| **mfu-mentor** | 8 | mfu-mentor.ts | ❓ |
| **mfu-fellow** | 8 | mfu-fellow.ts | ❓ |
| **lc-tutor** | 8 | lc-tutor.ts | ❓ |
| **lc-learner** | 8 | lc-learner.ts | ❓ |

**Tier Levels** (expected):
1. Emerging
2. Contributing
3. High Impact
4. Exceptional
5-8. (Additional tiers)

---

## Expected Badge Generation Flow

1. **Admin imports CSV** from Kintell
2. **System calculates tier** from session count
3. **Admin clicks "Issue Badge"**
4. **Badge PNG generated** (3 sizes: small, medium, large)
5. **Certificate PDF generated**
6. **Uploaded to R2** storage
7. **Email sent via Resend** with badge/certificate links
8. **Credential stored in database**

---

## Expected Storage

- **R2 Bucket**: `teei-certificates` (or configured bucket)
- **Path Pattern**: `credentials/{program}/{verification_code}/`
- **Files**:
  - `badge-small.png`
  - `badge-medium.png`
  - `badge-large.png`
  - `certificate.pdf`

---

## Expected Verification

- **Public Page**: `/verify/[code]`
- **QR Code**: On certificate links to verification
- **Database Table**: `credentials_issued` (if exists)
- **Verification Code**: Unique per credential

---

## Discord Badge System (Found)

### Discord Recognition

**Location**: `services/discord-bot/src/commands/recognize.ts`

**Features**:
- Volunteer recognition via Discord command
- Role assignment based on badge level
- VIS score updates
- Public recognition embeds

**Badge Levels**:
- `emerging` - ⭐ Emerging Volunteer
- `contributing` - 🌟 Contributing Volunteer
- `high_impact` - ✨ High Impact Volunteer
- `exceptional` - 🏆 Exceptional Volunteer

**Status**: ✅ Working (Discord bot)

---

## Database Tables (Expected)

### `credentials_issued` (if exists)
- `id`, `user_id` (FK), `program_type`, `tier`
- `verification_code`, `badge_url`, `certificate_url`
- `issued_at`, `issued_by`

### `badge_templates` (if exists)
- `id`, `program_type`, `tier`, `template_config` (JSONB)
- `created_at`, `updated_at`

---

## Possible Locations

If badge system exists, it might be in:
1. **Legacy codebase** (removed/moved)
2. **Separate service** (not in monorepo)
3. **External tool** (not in codebase)
4. **Planned feature** (not yet implemented)

---

## Recommendations

1. **Search Legacy Code**: Check git history for badge code
2. **Check External Services**: Verify if badges are generated externally
3. **Document as Missing**: If not found, document as planned feature
4. **Verify Requirements**: Confirm if badge system is still needed
5. **Check Admin Pages**: Look for badge import/issue pages

---

## Related Systems

### VIS Score System
- **Location**: `services/impact-calculator/`
- **Purpose**: Volunteer Impact Score calculation
- **Status**: ✅ Working
- **Connection**: Discord bot uses VIS scores for recognition

### Certificate Generation (Reports)
- **Location**: `services/reporting/`
- **Purpose**: PDF report generation
- **Status**: ✅ Working
- **Note**: Could be adapted for certificate generation

---

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Badge Generation** | ❌ Not Found | No code found |
| **Certificate Generation** | ❌ Not Found | No code found |
| **Badge Templates** | ❌ Not Found | No templates found |
| **R2 Storage** | ✅ Configured | Storage available |
| **Email System** | ✅ Working | Resend/SendGrid configured |
| **Verification Page** | ❌ Not Found | No `/verify/[code]` page |
| **Discord Recognition** | ✅ Working | Discord bot has recognition |
| **VIS Scores** | ✅ Working | Impact calculator operational |

---

**Next**: See [08-CSR-COCKPIT.md](./08-CSR-COCKPIT.md) for CSR reporting infrastructure.
