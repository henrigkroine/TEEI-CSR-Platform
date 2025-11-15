# Distributed Tracing with Jaeger

## Overview

The TEEI Platform uses **Jaeger** for distributed tracing with OpenTelemetry (OTel) instrumentation. This enables end-to-end request tracking across microservices, performance analysis, and service dependency mapping.

## Architecture

```
┌─────────────┐     OTLP/HTTP (4318)      ┌─────────────┐
│  Services   │ ──────────────────────────> │   Jaeger    │
│  (OTel SDK) │     OTLP/gRPC (4317)       │ All-in-One  │
└─────────────┘ ──────────────────────────> └─────────────┘
                                                    │
                                                    v
                                            ┌─────────────┐
                                            │   Grafana   │
                                            │  (UI + Query)│
                                            └─────────────┘
```

## Deployment

Jaeger is deployed as an all-in-one container in staging:

```bash
kubectl apply -k k8s/base/observability/jaeger
```

**Ports**:
- `16686`: Jaeger UI
- `4318`: OTLP HTTP receiver
- `4317`: OTLP gRPC receiver
- `14268`: Jaeger Thrift HTTP
- `14250`: Jaeger gRPC

## Querying Traces

### Jaeger UI

Access at `http://teei-jaeger:16686`:

1. **Service Search**: Select service from dropdown
2. **Operation Filter**: Filter by span operation (e.g., `GET /api/profile`)
3. **Tags**: Add filters like `http.status_code=500`, `error=true`
4. **Time Range**: Adjust lookback period
5. **Min/Max Duration**: Filter slow requests

### Grafana Dashboard

View the **Distributed Traces** dashboard in Grafana:

- **Trace Count by Service**: Overall trace volume
- **P95 Latency by Service**: Performance metrics
- **Error Rate by Service**: Failed trace percentage
- **Dependency Graph**: Service-to-service call topology

### LogQL Queries (from Loki)

Find trace IDs in logs and link to Jaeger:

```logql
{app="teei-api-gateway", trace_id=~".+"} | json | trace_id != ""
```

## Query Examples

### 1. Find Slow Requests

In Jaeger UI:
- Service: `teei-api-gateway`
- Tags: `http.status_code=200`
- Min Duration: `1s`
- Limit Results: `20`

### 2. Error Traces

Tags:
- `error=true`
- `http.status_code=~5..`

### 3. Specific User Journey

Tags:
- `user.id=12345`
- Operation: `POST /api/journey/create`

### 4. Database Query Spans

Service: `teei-unified-profile`
Operation: `SELECT`
Tags: `db.system=postgresql`

### 5. Cross-Service Request Flow

Search for a trace ID in Jaeger UI to see the full call chain:
1. API Gateway → Auth Check
2. API Gateway → Profile Service
3. Profile Service → PostgreSQL
4. Profile Service → Cache

## Trace Context Propagation

Services automatically propagate trace context via HTTP headers:

- `traceparent`: W3C Trace Context (primary)
- `tracestate`: Vendor-specific data
- `x-b3-traceid`: Zipkin B3 (fallback)

Example HTTP request:
```http
GET /api/profile/123
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

## Instrumentation

### Node.js Services

OTel SDK auto-instrumentation is configured in `packages/observability/`:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://teei-jaeger:4318/v1/traces',
  }),
  serviceName: process.env.SERVICE_NAME,
});

sdk.start();
```

### Custom Spans

Add manual instrumentation for business logic:

```javascript
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('teei-custom');

async function calculateSROI(data) {
  const span = tracer.startSpan('calculate_sroi', {
    attributes: {
      'sroi.input_count': data.length,
      'sroi.calculator_version': '2.0',
    },
  });

  try {
    const result = await sroiEngine.calculate(data);
    span.setAttribute('sroi.result', result.value);
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

## Best Practices

### 1. Span Naming
- Use consistent, hierarchical names: `HTTP GET /api/profile/:id`
- Avoid high-cardinality values in names (use attributes instead)

### 2. Attributes
- Add business context: `user.id`, `tenant.id`, `report.type`
- Tag errors: `error=true`, `error.type=ValidationError`
- Include SLI metrics: `cache.hit=true`, `db.query_time_ms=45`

### 3. Sampling
- Production: 10% head-based sampling (configured in Jaeger)
- Staging: 100% sampling for full visibility
- Use tail-based sampling for complex scenarios

### 4. Error Handling
```javascript
span.recordException(error);
span.setStatus({
  code: SpanStatusCode.ERROR,
  message: error.message,
});
```

## Integration with Logs

Logs automatically include `trace_id` and `span_id` when OTel is active:

```json
{
  "level": "error",
  "msg": "Database query failed",
  "trace_id": "0af7651916cd43dd8448eb211c80319c",
  "span_id": "b7ad6b7169203331",
  "service": "teei-unified-profile"
}
```

Query logs for a trace in Loki:
```logql
{trace_id="0af7651916cd43dd8448eb211c80319c"}
```

## Performance Analysis

### Identify Bottlenecks

1. **Service Level**: Which service has highest P95 latency?
   - Dashboard: Distributed Traces → P95 Latency by Service

2. **Operation Level**: Which endpoints are slow?
   - Jaeger UI → Select service → Sort by duration

3. **Span Level**: Which DB query or HTTP call causes delay?
   - Click on trace → Expand spans → Look for long duration

### Optimize

- **Database**: Add indexes for slow queries (see `db.statement` span attribute)
- **Caching**: Cache frequently accessed data (track `cache.hit` ratio)
- **Batching**: Batch N+1 queries (look for repetitive span patterns)
- **Timeouts**: Set appropriate timeouts (see `http.timeout` spans)

## Alerts

Prometheus alerting rules based on trace metrics:

```yaml
# High error rate
- alert: HighTraceErrorRate
  expr: |
    sum(rate(traces_spanmetrics_calls_total{status="STATUS_CODE_ERROR"}[5m])) by (service)
    / sum(rate(traces_spanmetrics_calls_total[5m])) by (service) > 0.05
  for: 5m
  annotations:
    summary: "{{ $labels.service }} has high error rate"

# Slow P95 latency
- alert: SlowP95Latency
  expr: |
    histogram_quantile(0.95, sum(rate(duration_milliseconds_bucket[5m])) by (le, service)) > 2000
  for: 10m
  annotations:
    summary: "{{ $labels.service }} P95 latency > 2s"
```

## Troubleshooting

### Traces Not Appearing

1. **Check OTel Exporter Config**:
   ```bash
   kubectl get cm teei-api-gateway-config -o yaml | grep OTEL_EXPORTER_OTLP_ENDPOINT
   ```
   Should be: `http://teei-jaeger:4318`

2. **Check Jaeger Logs**:
   ```bash
   kubectl logs -l app=teei-jaeger -n teei-platform
   ```

3. **Verify Network Connectivity**:
   ```bash
   kubectl exec -it deploy/teei-api-gateway -- curl http://teei-jaeger:14269
   ```

### Missing Spans

- Check service instrumentation (OTel SDK initialized?)
- Verify sampling rate (might be sampled out)
- Look for errors in service logs

### High Cardinality

If Jaeger memory usage is high:
- Review span attribute cardinality (avoid unique IDs in span names)
- Adjust `MEMORY_MAX_TRACES` in Jaeger deployment
- Consider Tempo for long-term storage

## Migration to Tempo

For production, migrate to Grafana Tempo:

```yaml
# k8s/base/observability/tempo/deployment.yaml
image: grafana/tempo:latest
```

Tempo advantages:
- Cost-effective long-term storage (S3/GCS)
- No in-memory limits
- Native Grafana integration

## References

- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [TEEI Observability Package](../../packages/observability/README.md)
