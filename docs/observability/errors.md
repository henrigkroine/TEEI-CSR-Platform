# Error Tracking with Sentry

## Overview

The TEEI Platform uses **Sentry** for real-time error tracking, performance monitoring, and release health. Sentry captures exceptions, provides stack traces, and correlates errors with user impact and traces.

## Architecture

```
┌─────────────┐     Sentry SDK      ┌─────────────┐
│  Services   │ ──────────────────> │  Sentry.io  │
│  (Node.js)  │   HTTPS (DSN)       │    SaaS     │
└─────────────┘                     └─────────────┘
       │                                    │
       │ OTel Trace ID                      │
       v                                    v
┌─────────────┐                     ┌─────────────┐
│   Jaeger    │                     │   Grafana   │
│   Traces    │                     │  Dashboard  │
└─────────────┘                     └─────────────┘
```

## Setup

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create organization: `teei-platform`
3. Create project: `teei-csr-platform` (Node.js)
4. Copy the DSN from Project Settings → Client Keys

### 2. Configure DSN in Kubernetes

Create a sealed secret with your Sentry DSN:

```bash
# Install kubeseal
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Create sealed secret
kubectl create secret generic teei-sentry-dsn \
  --from-literal=SENTRY_DSN='https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT' \
  --dry-run=client -o yaml | \
  kubeseal --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  --format yaml > observability/sentry/sentry-sealed.yaml

# Apply
kubectl apply -f observability/sentry/sentry-sealed.yaml
```

### 3. Update Service Deployments

Add the secret reference to service deployments:

```yaml
# k8s/base/api-gateway/deployment.yaml
spec:
  template:
    spec:
      containers:
      - name: api-gateway
        envFrom:
        - secretRef:
            name: teei-sentry-dsn
        env:
        - name: SENTRY_ENVIRONMENT
          value: "staging"
        - name: SENTRY_RELEASE
          value: "1.0.0"
        - name: SENTRY_TRACES_SAMPLE_RATE
          value: "0.1"
```

### 4. Service Integration

Services in `packages/*/` use `@sentry/node` (already configured):

```javascript
// packages/observability/sentry.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  release: process.env.SENTRY_RELEASE || 'unknown',
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Postgres(),
  ],
  beforeSend(event, hint) {
    // Sanitize PII
    if (event.request) {
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
    }
    return event;
  },
});

// Express middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
// ... routes ...
app.use(Sentry.Handlers.errorHandler());
```

## Error Tracking

### Automatic Capture

Sentry automatically captures:
- **Unhandled exceptions**: `throw new Error('...')`
- **Promise rejections**: `Promise.reject(new Error('...'))`
- **HTTP errors**: 500 status codes
- **Database errors**: Query failures
- **Timeouts**: Request/query timeouts

### Manual Capture

**1. Capture exception**:
```javascript
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { operation: 'sroi_calculation' },
    extra: { input_data: data },
  });
  throw error; // Re-throw if needed
}
```

**2. Capture message**:
```javascript
Sentry.captureMessage('Unusual activity detected', {
  level: 'warning',
  tags: { user_id: userId },
  extra: { activity: activityLog },
});
```

**3. Add breadcrumbs**:
```javascript
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User login attempt',
  level: 'info',
  data: { user_id: userId, method: 'email' },
});
```

### Context

**Set user context**:
```javascript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
  tenant_id: user.tenant_id,
});
```

**Set tags**:
```javascript
Sentry.setTag('tenant_id', 'acme-corp');
Sentry.setTag('feature_flag', 'new_dashboard');
```

**Set extra context**:
```javascript
Sentry.setContext('report', {
  type: 'executive_pack',
  format: 'pdf',
  size_bytes: 1234567,
});
```

## Performance Monitoring

### Automatic Transactions

Sentry automatically creates transactions for:
- HTTP requests (via Express integration)
- Database queries (via Postgres integration)
- HTTP client calls (via Http integration)

### Manual Transactions

**1. Measure custom operation**:
```javascript
const transaction = Sentry.startTransaction({
  op: 'calculate',
  name: 'SROI Calculation',
});

try {
  const result = await calculateSROI(data);
  transaction.setData('result', result.value);
  transaction.setStatus('ok');
  return result;
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

**2. Add spans**:
```javascript
const transaction = Sentry.getCurrentHub().getScope().getTransaction();

if (transaction) {
  const span = transaction.startChild({
    op: 'db.query',
    description: 'Fetch user profile',
  });

  try {
    const profile = await db.query('SELECT * FROM profiles WHERE id = $1', [userId]);
    span.setData('rows_returned', profile.length);
    return profile;
  } finally {
    span.finish();
  }
}
```

## Integration with Traces

Link Sentry errors to Jaeger traces:

```javascript
const { trace } = require('@opentelemetry/api');

app.use((req, res, next) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const traceId = span.spanContext().traceId;

    Sentry.configureScope(scope => {
      scope.setTag('trace_id', traceId);
      scope.setContext('trace', {
        trace_id: traceId,
        span_id: span.spanContext().spanId,
        jaeger_url: `http://jaeger:16686/trace/${traceId}`,
      });
    });
  }
  next();
});
```

In Sentry UI:
1. Click on an error
2. See `trace_id` in tags
3. Click link to view full trace in Jaeger

## Grafana Dashboard

View the **Errors (Sentry)** dashboard:

- **Error Count by Service**: Errors per second
- **Unique Issues**: Distinct error types
- **Users Affected**: Impact analysis
- **Top Error Types**: Most common exceptions
- **Error Rate Heatmap**: Temporal patterns
- **Recent Critical Errors**: Fatal errors with links

## Querying Sentry

### Sentry UI

Access at [sentry.io/organizations/teei-platform/issues/](https://sentry.io/organizations/teei-platform/issues/)

**Filters**:
- **Service**: `service:teei-api-gateway`
- **Error Type**: `error.type:ValidationError`
- **User**: `user.id:12345`
- **Tag**: `tenant_id:acme-corp`
- **Level**: `level:fatal`
- **Release**: `release:1.0.0`

**Search Examples**:
```
# Database errors
error.type:QueryFailedError

# Specific user
user.email:admin@example.com

# Slow transactions
transaction.duration:>2s

# Environment
environment:staging

# Recent errors
firstSeen:-24h
```

### Prometheus Metrics

Sentry metrics are exposed via Prometheus (if configured):

```promql
# Error rate
sum(rate(sentry_events_total{type="error"}[5m])) by (service)

# Unique issues
count(sentry_events_total{type="error"}) by (issue_id)

# Users affected
count(sentry_events_total{type="error"}) by (user_id)
```

## Alerts

### Sentry Built-in Alerts

1. **Issue Alert**: Alert when issue occurs
   - Go to Project Settings → Alerts → Create Alert
   - Condition: "When an event is seen more than 10 times in 1 minute"
   - Action: Send to Slack, PagerDuty, etc.

2. **Metric Alert**: Alert on metric threshold
   - Condition: "When error rate exceeds 5% for 10 minutes"
   - Action: Notify team

### Prometheus Alerts

```yaml
# observability/prometheus/rules.yaml
- alert: HighSentryErrorRate
  expr: |
    sum(rate(sentry_events_total{type="error"}[5m])) by (service) > 10
  for: 5m
  annotations:
    summary: "{{ $labels.service }} has high Sentry error rate"

- alert: SentryCriticalError
  expr: |
    increase(sentry_events_total{level="fatal"}[5m]) > 0
  for: 1m
  annotations:
    summary: "Critical error detected in {{ $labels.service }}"
```

## Best Practices

### 1. Don't Spam Sentry

**Bad**: Capture every validation error
```javascript
if (!email) {
  Sentry.captureException(new Error('Email required')); // Don't!
  return res.status(400).json({ error: 'Email required' });
}
```

**Good**: Only capture unexpected errors
```javascript
if (!email) {
  return res.status(400).json({ error: 'Email required' });
}

// Only capture database failures, not expected validation
try {
  await db.saveUser(email);
} catch (error) {
  Sentry.captureException(error); // Good!
  throw error;
}
```

### 2. Add Context

```javascript
Sentry.captureException(error, {
  tags: {
    tenant_id: req.tenant.id,
    operation: 'report_generation',
  },
  extra: {
    report_type: params.type,
    date_range: params.dateRange,
    user_input: sanitize(params),
  },
  level: 'error',
});
```

### 3. Use Fingerprinting

Group similar errors:
```javascript
Sentry.captureException(error, {
  fingerprint: ['database-timeout', databaseName],
});
```

### 4. Sampling

For high-volume services:
```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions
  beforeSend(event) {
    // Sample errors based on type
    if (event.exception?.values?.[0]?.type === 'ValidationError') {
      // Only send 10% of validation errors
      return Math.random() < 0.1 ? event : null;
    }
    return event; // Send all other errors
  },
});
```

### 5. Sanitize PII

```javascript
Sentry.init({
  beforeSend(event) {
    // Remove sensitive data
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.ssn;
      delete event.request.data.credit_card;
    }
    return event;
  },
});
```

## Release Tracking

Track deployments in Sentry:

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Set auth token
export SENTRY_AUTH_TOKEN=your_auth_token

# Create release
sentry-cli releases new "1.0.0"

# Upload source maps (for better stack traces)
sentry-cli releases files "1.0.0" upload-sourcemaps ./dist

# Finalize release
sentry-cli releases finalize "1.0.0"

# Associate commits
sentry-cli releases set-commits "1.0.0" --auto

# Deploy
sentry-cli releases deploys "1.0.0" new -e staging
```

Set `SENTRY_RELEASE` in deployments:
```yaml
env:
- name: SENTRY_RELEASE
  value: "1.0.0"
```

## Troubleshooting

### Events Not Appearing

1. **Check DSN**:
   ```bash
   kubectl get secret teei-sentry-dsn -o jsonpath='{.data.SENTRY_DSN}' | base64 -d
   ```

2. **Verify Sentry Init**:
   Check service logs for:
   ```
   [Sentry] DSN successfully configured
   ```

3. **Test Manually**:
   ```javascript
   Sentry.captureMessage('Test error from staging');
   ```

4. **Check Network**:
   Ensure services can reach `*.ingest.sentry.io`

### High Quota Usage

- Review sampling rates (reduce `tracesSampleRate`)
- Filter out noisy errors in `beforeSend`
- Use fingerprinting to group similar issues
- Increase Sentry quota or upgrade plan

### Missing Stack Traces

- Upload source maps for minified code
- Set `SENTRY_RELEASE` to match uploaded source maps
- Ensure `NODE_ENV=production` in deployments

## References

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry Node.js SDK](https://docs.sentry.io/platforms/node/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [TEEI Sentry Integration](../../packages/observability/sentry.md)
