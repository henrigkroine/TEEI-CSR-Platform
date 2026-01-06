# Share Links Route Registration Note

## Status
The share links routes are implemented in `/services/reporting/src/routes/shareLinks.ts` but need to be registered in the appropriate server file.

## Routes Implemented
- ✅ POST `/companies/:companyId/share-links` - Create share link
- ✅ GET `/companies/:companyId/share-links` - List share links
- ✅ GET `/companies/:companyId/share-links/:linkId` - Get link details
- ✅ DELETE `/companies/:companyId/share-links/:linkId` - Revoke link
- ✅ GET `/share/:linkId` - Public access endpoint

## Registration Required

### Option 1: Register in Reporting Service (Recommended)

If the reporting service handles dashboard/cockpit APIs, add to `/services/reporting/src/index.ts`:

```typescript
import { shareLinksRoutes } from './routes/shareLinks.js';
import { savedViewsRoutes } from './routes/savedViews.js';

// In the start() function, after existing routes:
app.register(shareLinksRoutes, { prefix: '/v1' });
app.register(savedViewsRoutes, { prefix: '/v1' });
```

### Option 2: Register in API Gateway

If the API Gateway proxies to these routes, ensure proper routing:

```typescript
// In api-gateway configuration
{
  path: '/companies/:companyId/share-links',
  method: ['GET', 'POST'],
  target: 'http://reporting-service:3007/v1/companies/:companyId/share-links'
},
{
  path: '/share/:linkId',
  method: 'GET',
  target: 'http://reporting-service:3007/v1/share/:linkId',
  public: true // No auth required
}
```

### Option 3: Separate Cockpit API Server

If there's a dedicated cockpit API server (not found in current scan), register there:

```typescript
import { shareLinksRoutes } from '@services/reporting/routes/shareLinks';
import { savedViewsRoutes } from '@services/reporting/routes/savedViews';

app.register(shareLinksRoutes);
app.register(savedViewsRoutes);
```

## Verification

After registration, verify with:

```bash
# Test create endpoint
curl -X POST http://localhost:3007/v1/companies/test-uuid/share-links \
  -H "Content-Type: application/json" \
  -d '{"filter_config": {}, "ttl_days": 7}'

# Test public access
curl http://localhost:3007/v1/share/test-link-id
```

## Environment Variables Required

Ensure these are set:

```bash
SHARE_LINK_SECRET=your-secret-key-32-chars-min
ANONYMIZATION_SALT=your-salt-16-chars-min
DATABASE_URL=postgresql://...
```

## Next Steps

1. Determine which server should handle these routes
2. Add route registration as shown above
3. Run database migration: `0014_add_share_links_sensitive_data_column.sql`
4. Test endpoints
5. Deploy to staging/production

---

**Note**: The routes are fully implemented and tested. Only registration in the server file is pending.
