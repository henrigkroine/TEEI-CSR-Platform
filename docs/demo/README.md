# Demo Factory & Data Masker

The Demo Factory enables creation of safe, realistic demo tenants for demonstrations, testing, and training purposes.

## Features

- **Deterministic Pseudonymization**: Same input always produces same masked output (referential consistency)
- **Realistic Data**: Locale-aware fake data with seasonality patterns and regional distributions
- **Safety Guardrails**: Enforced `demo-` prefix, blocked webhooks, automatic TTL
- **One-Click Teardown**: Complete cleanup of all tenant data
- **Scalable**: Small (1K events), Medium (25K events), Large (126K events)
- **Export**: Download demo data as JSON, JSONL, or SQL

## Quick Start

### Create a Demo Tenant

```bash
curl -X POST https://api.teei.example.com/v1/demo/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenantName": "acme-demo",
    "size": "medium",
    "regions": ["US", "EU"],
    "vertical": "technology",
    "adminEmail": "admin@example.com",
    "timeRangeMonths": 12,
    "includeSeasonality": true
  }'
```

**Response:**
```json
{
  "tenant": {
    "tenantId": "demo-acme-demo",
    "status": "ready",
    "seedProgress": 100,
    "seedStats": {
      "usersCreated": 500,
      "eventsCreated": 25250
    }
  },
  "seedResult": {
    "status": "success",
    "totalEvents": 25250,
    "totalDurationMs": 240000
  }
}
```

### Get Tenant Status

```bash
curl https://api.teei.example.com/v1/demo/demo-acme-demo
```

### Warm Analytics Tiles

```bash
curl -X POST https://api.teei.example.com/v1/demo/demo-acme-demo/warm \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "demo-acme-demo",
    "force": false
  }'
```

### Export Demo Data

```bash
curl -X POST https://api.teei.example.com/v1/demo/demo-acme-demo/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "includeEvents": true,
    "includeTiles": true,
    "includeReports": true
  }' \
  -o demo-acme-demo.json
```

### Delete Demo Tenant

```bash
curl -X DELETE https://api.teei.example.com/v1/demo/demo-acme-demo
```

## Size Configurations

### Small
- **Users**: 50
- **Events**: ~1,125
  - Volunteer: 500
  - Donation: 200
  - Learning: 300
  - Enrollment: 100
  - Buddy: 25
- **Seed Time**: ~1 minute
- **Use Case**: Quick demos, smoke tests

### Medium
- **Users**: 500
- **Events**: ~25,250
  - Volunteer: 10,000
  - Donation: 5,000
  - Learning: 8,000
  - Enrollment: 2,000
  - Buddy: 250
- **Seed Time**: ~4 minutes
- **Use Case**: Sales demos, integration testing

### Large
- **Users**: 2,000
- **Events**: ~126,000
  - Volunteer: 50,000
  - Donation: 25,000
  - Learning: 40,000
  - Enrollment: 10,000
  - Buddy: 1,000
- **Seed Time**: ~15 minutes
- **Use Case**: Performance testing, comprehensive demos

## Regions

- **US**: United States (USD, higher activity)
- **UK**: United Kingdom (GBP)
- **EU**: European Union (EUR)
- **APAC**: Asia-Pacific (USD, moderate activity)
- **LATAM**: Latin America (USD, moderate activity)
- **MULTI**: Multi-regional (USD, global distribution)

## Industry Verticals

Activity multipliers vary by vertical:

- **Technology**: High learning (1.5x), high volunteering (1.2x)
- **Finance**: High donations (1.5x), high volunteering (1.2x)
- **Healthcare**: Very high volunteering (1.5x), high learning (1.3x)
- **Nonprofit**: Very high volunteering (2.0x), high donations (1.5x)
- **Education**: Very high learning (2.0x), high volunteering (1.3x)
- **Others**: Consulting, Retail, Manufacturing (see docs)

## Safety Features

### Enforced Demo Prefix
All demo tenants MUST have `demo-` prefix. Endpoints reject non-prefixed tenants.

```bash
# ✅ Allowed
curl /v1/demo/demo-acme-corp

# ❌ Blocked (403 Forbidden)
curl /v1/demo/prod-acme-corp
curl /v1/demo/customer-acme-corp
```

### Blocked Outbound Webhooks
Demo tenants cannot configure outbound webhooks to prevent accidental data leaks.

### Automatic TTL
Demo tenants expire after 30 days and are garbage collected.

### No Real PII
All PII is deterministically pseudonymized using HMAC-SHA256:
- Names → Locale-appropriate fake names
- Emails → Fake emails (optionally preserving domain)
- Phones → Fake phone numbers
- Addresses → Fake addresses
- Free text → Lorem ipsum with PII redaction

### Referential Consistency
Same subject key always produces same masked values:

```typescript
const masker = new DataMasker({ tenantId: 'demo-foo', masterSalt: 'secret' });

// Same subjectKey → same results
const name1 = masker.maskName('John Doe', 'user-123');
const name2 = masker.maskName('John Doe', 'user-123');
console.log(name1.masked === name2.masked); // true

// All PII for same subject derived from same hash
const email = masker.maskEmail('john@example.com', 'user-123');
console.log(name1.hash === email.hash); // true
```

## Rate Limits

- **Creation**: 5 demo tenants per hour per IP
- **Refresh**: 10 per hour per tenant
- **Export**: 20 per hour per tenant

## CLI Usage

### Create

```bash
pnpm demo:create \
  --name acme-demo \
  --size medium \
  --regions US,EU \
  --vertical technology \
  --admin admin@example.com
```

### Refresh

```bash
pnpm demo:refresh --tenant demo-acme-demo --full
```

### Teardown

```bash
pnpm demo:teardown --tenant demo-acme-demo --confirm
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway                          │
│  POST /demo/tenants (create)                            │
│  POST /demo/:tenant/refresh                             │
│  DELETE /demo/:tenant (teardown)                        │
│  POST /demo/:tenant/export                              │
│  POST /demo/:tenant/warm                                │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
┌────────▼────────┐       ┌────────▼────────┐
│  Impact-In      │       │  Analytics      │
│  - DemoSeeder   │       │  - Tile Warmer  │
│  - Generators   │       │  - Aggregations │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │    ┌────────────────┐   │
         └────►  Data Masker   ◄───┘
              │  - Deterministic│
              │  - Locale-aware │
              └─────────────────┘
```

### Components

1. **Data Masker** (`packages/data-masker`)
   - Core pseudonymization library
   - HMAC-SHA256 deterministic hashing
   - Locale-aware fake data (Faker.js)

2. **Event Generators** (`services/impact-in/src/demo/generators`)
   - Volunteer, Donation, Session, Enrollment, Buddy generators
   - Realistic distributions and seasonality
   - Idempotent event IDs

3. **Demo Seeder** (`services/impact-in/src/demo/seeder.ts`)
   - Orchestrates all generators
   - Progress tracking
   - Persistence to staging

4. **API Gateway** (`services/api-gateway/src/routes/demo`)
   - REST endpoints
   - Safety guards
   - Rate limiting

5. **Analytics** (`services/analytics/src/demo`)
   - Pre-aggregation warmers
   - Tile caching
   - SROI/VIS synthesis

## Development

### Run Tests

```bash
# Data masker tests
cd packages/data-masker
pnpm test:coverage

# Contract tests
pnpm test:integration

# E2E tests
pnpm test:e2e -- demo-factory.spec.ts
```

### Local Development

```bash
# Start services
pnpm dev

# Create demo tenant locally
curl -X POST http://localhost:3000/v1/demo/tenants \
  -H "Content-Type: application/json" \
  -d @demo-request.json
```

## Troubleshooting

### Seed Timeout
**Problem**: Large demo tenant creation times out
**Solution**: Use smaller size or increase timeout in API gateway config

### Invalid Tenant ID
**Problem**: 403 Forbidden on demo endpoints
**Solution**: Ensure tenant ID starts with `demo-` prefix

### Duplicate Tenant
**Problem**: "Demo tenant already exists" error
**Solution**: Delete existing tenant first or choose different name

### Export Too Large
**Problem**: Export fails due to size
**Solution**: Use `includeEvents: false` or export as JSONL for streaming

## Best Practices

1. **Use appropriate size**: Start with `small` for quick tests
2. **Set realistic regions**: Match your demo audience geography
3. **Choose relevant vertical**: Impacts activity distributions
4. **Enable seasonality**: Makes data more realistic
5. **Clean up regularly**: Delete unused demo tenants to free resources
6. **Monitor TTL**: Demo tenants expire after 30 days
7. **Export before deletion**: Download data if you need to preserve it

## Security Considerations

1. **Master Salt**: Keep `DEMO_MASTER_SALT` secret and rotate periodically
2. **Admin Access**: Limit demo creation to authorized users
3. **Webhook Blocking**: Never disable webhook blocking for demo tenants
4. **Data Residency**: Demo data stored in same region as parent tenant
5. **Audit Logging**: All demo operations logged for compliance

## Roadmap

- [ ] Scheduled garbage collection for expired tenants
- [ ] Custom event generators via config
- [ ] Multi-tenant demo environments
- [ ] Demo tenant snapshots
- [ ] Automated smoke tests on demo tenants
- [ ] Integration with Storybook for UI demos

## Support

- **Documentation**: `/docs/demo`
- **API Reference**: `/packages/openapi/demo.yaml`
- **Slack**: #demo-factory
- **Issues**: GitHub Issues with `demo` label
