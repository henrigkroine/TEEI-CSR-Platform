# TEEI Gaps & TODO

**Last Updated**: 2025-01-27

---

## Critical Gaps (Blocking)

| System | Gap | Impact | Effort | Priority |
|--------|-----|--------|--------|----------|
| **Production URLs** | Unknown deployment URLs | Cannot access production | Low | High |
| **Badge System** | No badge generation code found | Cannot issue badges | Medium | Medium |
| **WBP Portal** | Portal code not found | Participants cannot access portal | High | High |
| **Skills Academy** | Portal code not found | Learners cannot access courses | High | High |

---

## Important Gaps (Should Fix)

| System | Gap | Impact | Effort | Priority |
|--------|-----|--------|--------|----------|
| **Environment Variables** | Incomplete documentation | Hard to deploy new services | Low | Medium |
| **LiveKit Integration** | Not found in codebase | Video calls may not work | Medium | Medium |
| **Turnstile CAPTCHA** | Not found in codebase | Bot protection missing | Low | Low |
| **LinkedIn OAuth** | Not found in codebase | WBP auth may be incomplete | Low | Low |
| **Certificate Verification** | No `/verify/[code]` page | Cannot verify certificates | Medium | Medium |

---

## Data Connection Gaps

| System | Gap | Impact | Effort | Status |
|--------|-----|--------|--------|--------|
| **CSR Cockpit Metrics** | Some demo endpoints use mock data | Demo mode works, production uses real data | Low | ✅ Resolved |
| **Campaign Dashboard** | Fully connected | ✅ Working | - | ✅ Complete |
| **Evidence Explorer** | Fully connected | ✅ Working | - | ✅ Complete |
| **Report Generation** | Fully connected | ✅ Working | - | ✅ Complete |

---

## API Gaps

| Endpoint | Gap | Impact | Effort | Status |
|----------|-----|--------|--------|--------|
| **Webhook Endpoints** | Some webhooks are stubs | External integrations may not work | Medium | ⚠️ Partial |
| **Twilio Webhook** | Stub only | SMS notifications not working | Low | ⚠️ Stub |
| **Workable Webhook** | Not built | Applicant tracking missing | Medium | ❌ Not built |

---

## Feature Gaps

| Feature | Gap | Impact | Effort | Status |
|---------|-----|--------|--------|--------|
| **Badge Generation** | Code not found | Cannot issue badges | High | ❌ Missing |
| **Certificate Generation** | Code not found | Cannot issue certificates | High | ❌ Missing |
| **WBP Portal** | Code not found | Participants cannot access | High | ❌ Missing |
| **Skills Academy** | Code not found | Learners cannot access | High | ❌ Missing |
| **LiveKit Video** | Integration not found | Video calls may not work | Medium | ❓ Unknown |

---

## Documentation Gaps

| Documentation | Gap | Impact | Effort | Status |
|---------------|-----|--------|--------|--------|
| **Production URLs** | Not documented | Cannot access production | Low | ❌ Missing |
| **Cloudflare Pages** | Project names unknown | Cannot deploy | Low | ❌ Missing |
| **Deployment Process** | Not documented | Hard to deploy | Medium | ❌ Missing |
| **Environment Variables** | Incomplete | Hard to configure | Low | ⚠️ Partial |
| **API Examples** | Limited examples | Hard to integrate | Low | ⚠️ Partial |

---

## Security Gaps

| Security | Gap | Impact | Effort | Status |
|----------|-----|--------|--------|--------|
| **JWT Algorithm** | Using HS256, should be RS256 | Less secure | Medium | ⚠️ Planned |
| **HTTPS Enforcement** | Not enforced | Insecure in production | Low | ⚠️ Should fix |
| **Database Encryption** | Passwords/emails not encrypted | PII exposure risk | High | ⚠️ Should fix |
| **Rate Limit Persistence** | In-memory only | Not distributed | Medium | ⚠️ Should fix |
| **Session Management** | No token refresh | Security risk | Medium | ⚠️ Should fix |

---

## Performance Gaps

| Performance | Gap | Impact | Effort | Status |
|-------------|-----|--------|--------|--------|
| **Query Optimization** | Some complex queries slow | Poor user experience | Medium | 🔄 In Progress |
| **Cache Strategy** | Some endpoints not cached | Unnecessary load | Low | ⚠️ Partial |
| **SSE Reconnection** | May drop connections | Real-time updates fail | Low | ⚠️ Should fix |

---

## Integration Gaps

| Integration | Gap | Impact | Effort | Status |
|-------------|-----|--------|--------|--------|
| **Kintell API** | Manual CSV only | No real-time sync | High | ⚠️ Manual |
| **Upskilling API** | Manual CSV only | No real-time sync | High | ⚠️ Manual |
| **Discord Bot** | Partial implementation | Some features missing | Medium | ⚠️ Partial |
| **Twilio SMS** | Stub only | SMS not working | Low | ⚠️ Stub |

---

## TODO Items

### High Priority

- [ ] **Find Badge System**: Search for badge generation code or document as missing
- [ ] **Find WBP Portal**: Locate WBP portal code or document as missing
- [ ] **Find Skills Academy**: Locate Skills Academy code or document as missing
- [ ] **Document Production URLs**: Get all production deployment URLs
- [ ] **Document Cloudflare Pages**: List all Cloudflare Pages projects
- [ ] **Complete Environment Variables**: Document all env vars per service

### Medium Priority

- [ ] **Upgrade JWT to RS256**: Move from HS256 to RS256 for better security
- [ ] **Implement Certificate Verification**: Create `/verify/[code]` page
- [ ] **Fix SSE Reconnection**: Improve real-time connection reliability
- [ ] **Optimize Queries**: Improve slow query performance
- [ ] **Complete Twilio Integration**: Implement SMS notifications
- [ ] **Complete Discord Bot**: Finish all Discord features

### Low Priority

- [ ] **Add API Examples**: Create example requests/responses
- [ ] **Document Deployment**: Write deployment runbook
- [ ] **Add Turnstile**: Implement bot protection
- [ ] **Add LinkedIn OAuth**: Complete WBP authentication
- [ ] **Improve Caching**: Add caching to more endpoints

---

## Resolved Issues

✅ **Data Connections**: All metrics now connected to real data  
✅ **Multi-Tenant Isolation**: Working correctly  
✅ **RBAC**: Properly enforced  
✅ **Report Generation**: Fully operational  
✅ **Campaign Management**: Complete  
✅ **Analytics**: Fully connected  

---

## Known Limitations

### Intentional Limitations

- **Demo Endpoints**: Some endpoints intentionally use mock data for demos
- **Manual CSV Import**: Kintell/Upskilling require manual CSV import (no API available)
- **Stub Webhooks**: Some webhooks are stubs until providers are configured

### Technical Limitations

- **JWT HS256**: Using HS256 until RS256 upgrade (planned)
- **In-Memory Rate Limiting**: Not distributed (acceptable for current scale)
- **SSE Drops**: Connections may drop (reconnection logic in place)

---

## Recommendations

1. **Immediate**: Document production URLs and deployment process
2. **Short-term**: Find or rebuild badge/certificate system
3. **Short-term**: Locate or rebuild WBP/Skills Academy portals
4. **Medium-term**: Upgrade JWT to RS256
5. **Medium-term**: Implement database encryption for PII
6. **Long-term**: Add API examples and integration guides

---

**Next**: See [12-CONNECTION-MAP.md](./12-CONNECTION-MAP.md) for system connection diagrams.
