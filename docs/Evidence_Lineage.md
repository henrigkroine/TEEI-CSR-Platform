# Evidence Lineage System

## Overview

The Evidence Lineage system provides full traceability from high-level metrics down to the individual evidence snippets that support them. This enables operators to investigate metric values, understand the underlying data, and ensure quality while maintaining strict privacy controls.

## Architecture

```
┌─────────────────┐
│   Metrics       │  (metrics_company_period)
│  - KPI values   │
│  - Aggregations │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Outcome Scores  │  (outcome_scores)
│  - Dimensions   │
│  - Q2Q Scores   │
│  - Confidence   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Evidence      │  (evidence_snippets)
│   Snippets      │
│  - Text         │
│  - Source ref   │
└─────────────────┘
```

### Data Flow

1. **Evidence Collection**: Raw feedback, check-in notes, and other text data are ingested
2. **Q2Q Classification**: AI classifier (or rule-based/manual) generates outcome scores for each text
3. **Evidence Storage**: Relevant snippets are extracted and linked to outcome scores
4. **Aggregation**: Outcome scores are aggregated into period metrics
5. **Lineage Query**: Users can trace from metrics back to evidence snippets

## Database Schema

### outcome_scores

Stores Q2Q classification results for text data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| text_id | UUID | Reference to source text (feedback_id, checkin_id, etc.) |
| text_type | VARCHAR(50) | Source type (buddy_feedback, kintell_feedback, checkin_note) |
| dimension | VARCHAR(50) | Q2Q dimension (confidence, belonging, lang_level_proxy, job_readiness, well_being) |
| score | DECIMAL(4,3) | Score value (0.000 - 1.000) |
| confidence | DECIMAL(4,3) | Model confidence in the score |
| model_version | VARCHAR(50) | AI model version used |
| method | ENUM | Classification method (ai_classifier, rule_based, manual) |
| provider_used | VARCHAR(50) | AI provider (claude, openai, gemini) |
| created_at | TIMESTAMP | When the score was generated |

**Indexes:**
- `outcome_scores_text_id_idx` on `text_id`
- `outcome_scores_created_at_idx` on `created_at`
- `outcome_scores_dimension_idx` on `dimension`

### evidence_snippets

Stores anonymized text snippets linked to outcome scores.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| outcome_score_id | UUID | Foreign key to outcome_scores |
| snippet_text | TEXT | Anonymized text snippet |
| snippet_hash | VARCHAR(64) | SHA-256 hash for deduplication |
| embedding_ref | VARCHAR(255) | Reference to vector DB |
| embedding | TEXT | JSON array of embedding vector |
| source_ref | VARCHAR(255) | Reference to original text position |
| created_at | TIMESTAMP | When the snippet was created |

**Indexes:**
- `evidence_snippets_outcome_score_idx` on `outcome_score_id`
- `evidence_snippets_hash_idx` on `snippet_hash`

## API Endpoints

### GET /metrics/:metricId/evidence

Get evidence snippets for a specific metric.

**Parameters:**
- `metricId` (path): UUID of the metric
- `limit` (query, optional): Maximum number of evidence items (default: 20)

**Response:**
```json
{
  "metricId": "uuid",
  "evidenceCount": 15,
  "evidence": [
    {
      "id": "uuid",
      "snippetText": "I feel more confident speaking ***",
      "provenance": {
        "sourceType": "buddy_feedback",
        "date": "2024-11-10T14:30:00Z",
        "classificationMethod": "ai_classifier"
      },
      "q2qScores": {
        "dimension": "confidence",
        "score": 0.85,
        "confidence": 0.92
      }
    }
  ]
}
```

### GET /metrics/company/:companyId/period/:period/evidence

Get all evidence for a company in a specific period.

**Parameters:**
- `companyId` (path): UUID of the company
- `period` (path): Period format (YYYY-MM or YYYY-Q1/Q2/Q3/Q4)
- `limit` (query, optional): Maximum number of evidence items (default: 20)

**Response:**
```json
{
  "companyId": "uuid",
  "period": "2024-11",
  "dateRange": {
    "start": "2024-11-01",
    "end": "2024-11-30"
  },
  "evidenceCount": 42,
  "evidence": [...]
}
```

## Redaction System

All evidence snippets are redacted on the server side before being sent to clients. No PII ever reaches the frontend.

### Redaction Rules

| PII Type | Pattern | Redacted Format | Example |
|----------|---------|-----------------|---------|
| Email | `user@domain.com` | `***@***.com` | john@example.com → ***@***.com |
| Phone | `555-123-4567` | `***-***-****` | 555-123-4567 → ***-***-**** |
| Credit Card | `4532-1234-5678-9010` | `****-****-****-9010` | 4532-1234-5678-9010 → ****-****-****-9010 |
| SSN | `123-45-6789` | `***-**-****` | 123-45-6789 → ***-**-**** |
| Names | `My name is John Smith` | `My name is [NAME]` | My name is John Smith → My name is [NAME] |

### Redaction Implementation

Located in `/services/analytics/src/utils/redaction.ts`:

```typescript
import { redactPII } from '../utils/redaction';

// Redact all PII from text
const cleanText = redactPII(dirtyText);
```

**Functions:**
- `redactPII(text)`: Redact all types of PII
- `redactEmails(text)`: Redact email addresses
- `redactPhoneNumbers(text)`: Redact phone numbers
- `redactCreditCards(text)`: Redact credit card numbers
- `redactSSNs(text)`: Redact social security numbers
- `redactNames(text)`: Redact potential names
- `containsPII(text)`: Check if text contains PII

## UI Components

### EvidenceDrawer

React component that displays evidence lineage in a drawer interface.

**Location:** `/apps/corp-cockpit-astro/src/components/EvidenceDrawer.tsx`

**Props:**
```typescript
interface EvidenceDrawerProps {
  metricId?: string;
  companyId?: string;
  period?: string;
  isOpen: boolean;
  onClose: () => void;
}
```

**Features:**
- Displays evidence snippets with redaction applied
- Shows Q2Q scores (dimension, score, confidence)
- Displays provenance (source type, date, classification method)
- Pagination (10 items per page)
- Loading and error states
- Relative time formatting ("2 days ago")
- Badges for source types and classification methods

### Integration with KPICard

The `KPICard` component has been enhanced to support evidence viewing:

```tsx
<KPICard
  title="Participants"
  value="1,234"
  metricId="metric-uuid"
  companyId="company-uuid"
  period="2024-11"
  showEvidenceButton={true}
/>
```

**New Props:**
- `metricId`: UUID of the metric
- `companyId`: UUID of the company
- `period`: Period string
- `showEvidenceButton`: Enable "View Evidence" button

## Operator Guide

### Investigating Evidence

1. **Navigate to Dashboard**: Go to the main dashboard page
2. **Select KPI**: Find the KPI card you want to investigate
3. **View Evidence**: Click the "View Evidence" button on the KPI card
4. **Review Snippets**: The drawer opens showing redacted evidence snippets
5. **Analyze Scores**: Review Q2Q scores and confidence levels
6. **Check Provenance**: Verify source types and classification methods
7. **Navigate Pages**: Use pagination to see more evidence

### Sample Queries

#### Get evidence for a specific metric
```bash
curl http://localhost:3007/metrics/{metricId}/evidence
```

#### Get all evidence for a period
```bash
curl http://localhost:3007/metrics/company/{companyId}/period/2024-11/evidence
```

#### Get evidence with custom limit
```bash
curl http://localhost:3007/metrics/{metricId}/evidence?limit=50
```

### Troubleshooting

#### No evidence available

**Possible causes:**
- Metric has no linked outcome scores
- Evidence snippets not yet generated
- Date range issue (evidence outside period)

**Solution:**
1. Verify metric exists in database
2. Check outcome_scores table for linked scores
3. Ensure evidence_snippets table has entries
4. Verify date ranges match

#### PII visible in responses

**This should never happen!**

**Immediate actions:**
1. Stop the analytics service
2. Audit the redaction utility
3. Review server logs
4. Notify security team
5. Check that redactPII() is called on all evidence endpoints

**Prevention:**
- All redaction happens server-side
- Unit tests verify redaction patterns
- Never send raw text to frontend

#### Slow evidence queries

**Optimizations:**
1. Use pagination (limit parameter)
2. Add indexes on frequently queried columns
3. Cache evidence responses (10-minute TTL)
4. Consider materialized views for common queries

## Performance Considerations

### Query Optimization

Evidence queries join two tables (outcome_scores + evidence_snippets):
- Use indexes on foreign keys
- Limit results to recent periods
- Default limit of 20 items
- Consider caching for frequently accessed evidence

### Caching Strategy

- **Evidence by metric**: 10-minute TTL
- **Evidence by period**: 1-hour TTL
- Cache invalidation on new evidence generation

### Pagination

- Default: 10 items per page in UI
- API default: 20 items
- Maximum: 100 items per request

## Security & Privacy

### Data Protection

1. **Server-side redaction only**: Never send PII to frontend
2. **Hash-based deduplication**: Prevent duplicate evidence storage
3. **Audit logging**: Track evidence access
4. **Access control**: RBAC on evidence endpoints
5. **Encryption at rest**: Database encryption enabled

### Compliance

- **GDPR**: Right to erasure via evidence deletion
- **CCPA**: Consumer access to evidence data
- **HIPAA**: PHI redaction in healthcare contexts
- **Data retention**: Configurable retention policies

## Testing

### Unit Tests

Located in `/services/analytics/src/__tests__/redaction.test.ts`:

```bash
# Run tests
cd /home/user/TEEI-CSR-Platform/services/analytics
pnpm test
```

**Test coverage:**
- Email redaction (multiple formats)
- Phone number redaction (US and international)
- Credit card redaction (preserving last 4 digits)
- SSN redaction
- Name redaction (titles, common patterns)
- Edge cases (empty strings, null values, partial patterns)

### Integration Tests

Test end-to-end evidence lineage:
1. Insert test feedback
2. Generate outcome scores
3. Create evidence snippets
4. Query evidence endpoints
5. Verify redaction applied

## Future Enhancements

1. **Graph Visualization**: D3.js visualization of metric → score → evidence
2. **Evidence Filtering**: Filter by dimension, confidence, source type
3. **Export**: CSV/PDF export of evidence lineage
4. **Search**: Full-text search across evidence snippets
5. **Analytics**: Evidence quality metrics (confidence distribution, coverage)
6. **Real-time Updates**: WebSocket for live evidence streaming
7. **ML Insights**: Anomaly detection in evidence patterns

## References

- [Platform Architecture](./Platform_Architecture.md)
- [Q2Q Classifier](./Q2Q_Classifier.md)
- [Data Privacy](./Data_Privacy.md)
- [API Documentation](./API_Documentation.md)

## Support

For issues or questions:
- **Development**: Contact Worker 2 team
- **Operations**: Check service logs at `/var/log/teei/analytics`
- **Security**: Report PII leaks immediately to security team
