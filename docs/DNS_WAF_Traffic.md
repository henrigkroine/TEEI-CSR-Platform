# DNS, WAF & Traffic Management Documentation

**TEEI Platform - Multi-Region Traffic Management**

Version: 1.0
Last Updated: 2025-11-15
Owner: Platform Operations Team

---

## Table of Contents

1. [Overview](#overview)
2. [DNS Architecture](#dns-architecture)
3. [WAF Configuration](#waf-configuration)
4. [CDN Strategy](#cdn-strategy)
5. [Traffic Splitting](#traffic-splitting)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Operational Procedures](#operational-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Disaster Recovery](#disaster-recovery)

---

## Overview

The TEEI Platform operates a multi-region deployment across US (us-east-1) and EU (eu-central-1) regions with intelligent traffic routing, edge caching, and comprehensive security through AWS Route53, WAF, CloudFront, and Istio service mesh.

### Key Features

- **Latency-Based Routing**: Automatically routes users to the closest region for optimal performance
- **GDPR Compliance**: EU users are always routed to EU infrastructure for data residency
- **Health Check Failover**: Automatic failover to secondary region within 2 minutes (RTO)
- **WAF Protection**: OWASP Top 10 protection, rate limiting, bot management
- **Edge Caching**: CloudFront CDN reduces origin load by 70%+
- **Service Mesh**: Istio/Envoy for canary deployments and blue/green releases

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Global Users                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Route53 DNS │
                    │  (Hosted Zone)│
                    └───────┬───────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼───────┐       ┌──────▼──────┐
        │  Latency-Based│       │ Geolocation │
        │    Routing    │       │  (EU GDPR)  │
        └───────┬───────┘       └──────┬──────┘
                │                      │
        ┌───────┴───────┐      ┌──────┴──────┐
        │               │      │             │
┌───────▼──────┐ ┌─────▼──────▼───┐ ┌──────▼────────┐
│ CloudFront   │ │  CloudFront    │ │  CloudFront   │
│ US (Primary) │ │  EU (Primary)  │ │  EU (GDPR)    │
└───────┬──────┘ └────────┬───────┘ └──────┬────────┘
        │                 │                 │
        ▼                 ▼                 ▼
    ┌───────┐         ┌───────┐        ┌───────┐
    │  WAF  │         │  WAF  │        │  WAF  │
    │  US   │         │  EU   │        │  EU   │
    └───┬───┘         └───┬───┘        └───┬───┘
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   US-EAST-1   │  │  EU-CENTRAL-1 │  │  EU-CENTRAL-1 │
│      ALB      │  │      ALB      │  │      ALB      │
├───────────────┤  ├───────────────┤  ├───────────────┤
│ Istio Gateway │  │ Istio Gateway │  │ Istio Gateway │
├───────────────┤  ├───────────────┤  ├───────────────┤
│   Services    │  │   Services    │  │   Services    │
│  (K8s Pods)   │  │  (K8s Pods)   │  │  (K8s Pods)   │
└───────────────┘  └───────────────┘  └───────────────┘
```

---

## DNS Architecture

### Hosted Zones

#### Global Zone: `teei-platform.com`

Primary hosted zone for all global DNS records.

**DNSSEC**: Enabled for enhanced security
**Zone ID**: `Z1234567890ABC`
**Nameservers**:
- `ns-1234.awsdns-12.org`
- `ns-5678.awsdns-34.com`
- `ns-9012.awsdns-56.net`
- `ns-3456.awsdns-78.co.uk`

#### Regional Zones

- **US Zone**: `us.teei-platform.com` (Z1234567890DEF)
- **EU Zone**: `eu.teei-platform.com` (Z0987654321GHI)

### DNS Records

#### API Endpoint: `api.teei-platform.com`

**Primary Routing**: Latency-based
- US Region (us-east-1): 60% weight, latency optimized
- EU Region (eu-central-1): 40% weight, latency optimized

**GDPR Override**: Geolocation routing
- EU countries → eu-central-1 (strict enforcement)
- Countries: DE, FR, GB, NO, SE, DK, FI, IT, ES, NL, BE, AT, IE, PT

**Example DNS Query**:
```bash
# From US: resolves to US ALB
dig api.teei-platform.com +short
# Output: 54.123.45.67 (us-east-1)

# From EU: resolves to EU ALB (geolocation override)
dig api.teei-platform.com +short
# Output: 52.234.56.78 (eu-central-1)
```

#### Reports Endpoint: `reports.teei-platform.com`

**Routing**: Weighted
- US: 60% traffic
- EU: 40% traffic

**Use Case**: A/B testing, gradual traffic migration

#### WebSocket Endpoint: `ws.teei-platform.com`

**Routing**: Latency-based with sticky sessions
- Long TTL (300s) for session persistence
- Uses NLB instead of ALB for WebSocket support

#### Regional Subdomains

Direct access to specific regions:
- `us.teei-platform.com` → us-east-1 ALB
- `eu.teei-platform.com` → eu-central-1 ALB

### Health Checks

#### Configuration

| Endpoint | Protocol | Path | Interval | Threshold | Expected Status |
|----------|----------|------|----------|-----------|-----------------|
| US API | HTTPS | /health/ready | 30s | 3 failures | 200 OK |
| EU API | HTTPS | /health/ready | 30s | 3 failures | 200 OK |
| US Reports | HTTPS | /health/ready | 30s | 3 failures | 200 OK |
| EU Reports | HTTPS | /health/ready | 30s | 3 failures | 200 OK |

#### Failover Logic

1. **Detection**: Health check fails 3 consecutive times (90 seconds)
2. **Action**: Route53 stops routing traffic to unhealthy endpoint
3. **Failover**: Traffic automatically routed to healthy secondary region
4. **Recovery**: When health check passes, traffic gradually resumes (weighted)
5. **RTO**: ~2 minutes from first failure to full failover

#### Testing Health Checks

```bash
# Check current health status
./scripts/infra/update-dns.sh get-health-check us-api-health

# Create new health check
./scripts/infra/update-dns.sh create-health-check \
  api.us.teei-platform.com /health/ready 443 30 3
```

---

## WAF Configuration

### Web Application Firewall (WAF v2)

The TEEI Platform uses AWS WAF v2 with a comprehensive rule set to protect against common web vulnerabilities and attacks.

### WAF Web ACLs

#### Global WAF (CloudFront)

**Scope**: CLOUDFRONT
**Name**: `teei-platform-global-waf`
**Default Action**: ALLOW (block specific threats)

#### Regional WAFs

- **US**: `teei-platform-us-east-1-waf` (ALBs in us-east-1)
- **EU**: `teei-platform-eu-central-1-waf` (ALBs in eu-central-1, GDPR compliant)

### WAF Rules

#### AWS Managed Rules

| Priority | Rule Group | Purpose |
|----------|------------|---------|
| 10 | AWSManagedRulesCommonRuleSet | OWASP Top 10 protection |
| 20 | AWSManagedRulesKnownBadInputsRuleSet | Known malicious patterns |
| 30 | AWSManagedRulesSQLiRuleSet | SQL injection protection |
| 40 | AWSManagedRulesLinuxRuleSet | Linux-specific exploits (path traversal, RCE) |
| 50 | AWSManagedRulesAnonymousIpList | Block VPNs, proxies, Tor |
| 60 | AWSManagedRulesAmazonIpReputationList | Known malicious IPs |
| 70 | AWSManagedRulesBotControlRuleSet | Bot detection & blocking |

#### Custom Rate Limiting Rules

| Priority | Rule | Limit | Window | Scope |
|----------|------|-------|--------|-------|
| 100 | GlobalRateLimit | 1000 req | 5 min | Per IP |
| 110 | APIRateLimit | 300 req | 1 min | Per user (Authorization header) |
| 120 | GenAIRateLimit | 50 req | 1 min | Per user (GenAI endpoints) |
| 130 | LoginBruteForceProtection | 10 req | 5 min | Per IP (login endpoint) |

#### Custom Security Rules

| Priority | Rule | Purpose | Action |
|----------|------|---------|--------|
| 140 | CSRFTokenValidation | Require X-CSRF-Token for mutations | BLOCK (403) |
| 150 | UserAgentValidation | Block requests without User-Agent | BLOCK (403) |
| 160 | OversizedPayloadProtection | Block requests > 10 MB | BLOCK (413) |
| 170 | GeoBlocking | Block high-risk countries | BLOCK (403) |
| 180 | PathTraversalProtection | Block ../ patterns | BLOCK (403) |
| 190 | XSSProtection | Block XSS patterns | BLOCK (403) |

### Rate Limiting Examples

#### Global Rate Limit (1000 req/5min per IP)

```bash
# Test rate limiting
for i in {1..1100}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.teei-platform.com/health/ready
done

# Expected output: 200 for first 1000, 429 for subsequent requests
```

#### GenAI Rate Limit (50 req/min per user)

```bash
# Test GenAI rate limiting
for i in {1..60}; do
  curl -H "Authorization: Bearer $TOKEN" \
    https://api.teei-platform.com/api/v1/gen-reports/quarterly
done

# Expected output: 200 for first 50, 429 for subsequent requests
```

### WAF Logging

**Log Destination**: S3 bucket `s3://teei-waf-logs-us-east-1/`
**Log Format**: JSON (one log per request)
**Redacted Fields**: `authorization`, `cookie` headers

**Sample Log Entry**:
```json
{
  "timestamp": 1700000000000,
  "formatVersion": 1,
  "webaclId": "arn:aws:wafv2:us-east-1:ACCOUNT_ID:global/webacl/teei-platform-global-waf/...",
  "terminatingRuleId": "GlobalRateLimit",
  "action": "BLOCK",
  "httpRequest": {
    "clientIp": "203.0.113.45",
    "country": "US",
    "httpMethod": "GET",
    "uri": "/api/v1/reports",
    "httpVersion": "HTTP/2.0"
  },
  "rateBasedRuleList": [
    {
      "rateBasedRuleName": "GlobalRateLimit",
      "maxRateAllowed": 1000
    }
  ]
}
```

### Analyzing WAF Logs

```bash
# Analyze blocked requests
./scripts/infra/waf-analysis.sh analyze 1h

# Identify false positives
./scripts/infra/waf-analysis.sh false-positives

# Analyze security threats
./scripts/infra/waf-analysis.sh threats

# Export HTML report
./scripts/infra/waf-analysis.sh export
```

### Whitelisting IPs

```bash
# Add IP to allowlist (bypasses rate limiting)
./scripts/infra/waf-analysis.sh whitelist 203.0.113.45

# Add IP range to allowlist
aws wafv2 update-ip-set \
  --scope CLOUDFRONT \
  --id IP_SET_ID \
  --name teei-internal-ips \
  --addresses "10.0.0.0/8" "172.16.0.0/12" \
  --lock-token LOCK_TOKEN
```

---

## CDN Strategy

### CloudFront Distributions

#### US Distribution

**Distribution ID**: `d1234567890`
**Domain**: `d1234567890.cloudfront.net`
**CNAMEs**: `cdn.teei-platform.com`, `us.cdn.teei-platform.com`

**Origins**:
- Primary: US ALB (`teei-api-us-alb-1234567890.us-east-1.elb.amazonaws.com`)
- Failover: EU ALB (`teei-api-eu-alb-0987654321.eu-central-1.elb.amazonaws.com`)
- Static Assets: S3 (`teei-static-assets-us.s3.us-east-1.amazonaws.com`)

#### EU Distribution

**Distribution ID**: `d0987654321`
**Domain**: `d0987654321.cloudfront.net`
**CNAMEs**: `eu.cdn.teei-platform.com`

**Origins**:
- Primary: EU ALB (`teei-api-eu-alb-0987654321.eu-central-1.elb.amazonaws.com`)
- Failover: US ALB (limited for GDPR compliance)
- Static Assets: S3 (`teei-static-assets-eu.s3.eu-central-1.amazonaws.com`)

### Cache Behaviors

| Path Pattern | TTL | Caching | Use Case |
|--------------|-----|---------|----------|
| `/assets/*` | 1 year | Enabled | Static assets (JS, CSS, images) |
| `/api/v1/reports/*` | 5 min | Enabled | Report data (stale-while-revalidate) |
| `/api/*` | 0 | Disabled | Dynamic API responses |
| `/health/*` | 0 | Disabled | Health checks (always fresh) |

### Cache Invalidation

```bash
# Invalidate all cached content
aws cloudfront create-invalidation \
  --distribution-id d1234567890 \
  --paths "/*"

# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id d1234567890 \
  --paths "/api/v1/reports/*" "/assets/app-*.js"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id d1234567890 \
  --id INVALIDATION_ID
```

### Security Headers

CloudFront automatically adds the following security headers to all responses:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{NONCE}'; ...
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Origin Failover

CloudFront automatically fails over to the secondary origin when:
- Origin returns 500, 502, 503, 504
- Origin is unreachable (connection timeout)
- Health check fails

**Failover Time**: ~30 seconds

---

## Traffic Splitting

### Service Mesh (Istio/Envoy)

The TEEI Platform uses Istio service mesh for advanced traffic management within Kubernetes clusters.

### Canary Deployments

**Strategy**: Progressive rollout from 0% → 5% → 25% → 50% → 100%

**Example**: Deploy new API version
```yaml
# Start with 5% canary
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: teei-api-virtualservice
spec:
  http:
    - route:
        - destination:
            host: teei-api
            subset: stable
          weight: 95
        - destination:
            host: teei-api
            subset: canary
          weight: 5
```

**Monitoring During Canary**:
- Error rate per version
- Latency p50, p95, p99 per version
- Business metrics (conversions, revenue)

**Rollback Criteria**:
- Error rate > 1%
- Latency p99 > 2x baseline
- Customer complaints
- Failed health checks

### Blue/Green Deployments

**Strategy**: Deploy new version (green) alongside old version (blue), test, then switch 100% traffic

**Example**: Deploy new reports service
```yaml
# Initial state: 100% blue
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: teei-reports-virtualservice
spec:
  http:
    - route:
        - destination:
            host: teei-reports
            subset: blue
          weight: 100
```

**Testing Green**:
```bash
# Test green version with header
curl -H "x-version: green" https://reports.teei-platform.com/api/v1/reports
```

**Switch to Green**:
```yaml
# Switch traffic: 100% green
spec:
  http:
    - route:
        - destination:
            host: teei-reports
            subset: green
          weight: 100
```

### Traffic Mirroring

**Purpose**: Test new versions with real traffic without impacting users

**Example**: Mirror 10% of production traffic to staging
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: teei-api-virtualservice
spec:
  http:
    - route:
        - destination:
            host: teei-api
            subset: stable
          weight: 100
      mirror:
        host: teei-api-staging
        subset: stable
      mirrorPercentage:
        value: 10
```

**Monitoring**:
- Staging error rate
- Staging latency
- Staging resource usage

---

## Monitoring & Alerts

### Grafana Dashboard

**Dashboard**: `DNS, WAF & Traffic Management` (`dns-waf-traffic`)
**Location**: `/observability/grafana/dashboards/dns-waf-traffic.json`

**Panels**:
1. DNS Query Rate by Region
2. Health Check Status
3. WAF Block Rate by Rule
4. Traffic Distribution by Region
5. Latency Distribution by Routing Policy
6. Health Check Failures (Last Hour)
7. Failover Events Timeline
8. Geographic Distribution of Traffic
9. Overall Health Check Pass Rate
10. WAF Block Rate %
11. WAF Blocked Requests Logs

### CloudWatch Alarms

#### DNS/Route53 Alarms

| Alarm | Metric | Threshold | Actions |
|-------|--------|-----------|---------|
| HealthCheckFailed | HealthCheckStatus | < 1 (unhealthy) | SNS: route53-health-alerts |
| HealthCheckPercentageHealthy | HealthCheckPercentageHealthy | < 50% | SNS: route53-health-alerts |

#### WAF Alarms

| Alarm | Metric | Threshold | Actions |
|-------|--------|-----------|---------|
| WAFBlockRateHigh | BlockedRequests | > 100/min | SNS: waf-alerts |
| WAFRateLimitTriggered | CountedRequests | > 50/min | SNS: waf-alerts |

#### CloudFront Alarms

| Alarm | Metric | Threshold | Actions |
|-------|--------|-----------|---------|
| CloudFront5xxErrorRateHigh | 5xxErrorRate | > 5% | SNS: cloudfront-alerts |
| CloudFrontCacheHitRateLow | CacheHitRate | < 70% | SNS: cloudfront-alerts |

### Metrics Collection

**Prometheus Metrics**:
```promql
# DNS query rate
rate(route53_query_count{hosted_zone="teei-platform.com"}[5m])

# WAF block rate
sum(rate(waf_blocked_requests{web_acl="teei-platform-global-waf"}[5m])) by (rule_name)

# Health check status
route53_health_check_status{job="route53"}

# CloudFront cache hit rate
cloudfront_cache_hit_rate{distribution_id="d1234567890"}
```

### Distributed Tracing

**Backend**: Jaeger
**Sampling Rate**: 1%
**Retention**: 7 days

**Trace Headers**:
- `x-request-id`: Unique request ID
- `x-b3-traceid`: Zipkin/Jaeger trace ID
- `x-b3-spanid`: Span ID

**Example Trace**:
```
CloudFront → WAF → ALB → Istio Gateway → API Service → Database
  50ms       10ms   20ms      15ms           100ms         50ms
Total: 245ms
```

---

## Operational Procedures

### Updating DNS Records

#### Create Latency-Based Record

```bash
# Create alias record for API with latency-based routing
./scripts/infra/update-dns.sh create-alias \
  api.teei-platform.com \
  teei-api-us-alb-1234567890.us-east-1.elb.amazonaws.com \
  Z1234567890ABC \
  us-api-latency \
  us-east-1
```

#### Update Existing Record

```bash
# Update CNAME record
./scripts/infra/update-dns.sh upsert \
  www.teei-platform.com \
  CNAME \
  teei-platform.com \
  300
```

#### Delete Record

```bash
# Delete A record
./scripts/infra/update-dns.sh delete \
  old.teei-platform.com \
  A
```

### Testing DNS Routing

#### Test from Different Regions

```bash
# Test latency-based routing
./scripts/infra/test-dns-routing.sh latency api.teei-platform.com

# Test weighted routing
./scripts/infra/test-dns-routing.sh weighted reports.teei-platform.com

# Test geolocation routing
./scripts/infra/test-dns-routing.sh geolocation api.teei-platform.com
```

#### Test Health Check Failover

```bash
# Manual failover test
./scripts/infra/test-dns-routing.sh failover \
  api.teei-platform.com \
  api.us.teei-platform.com \
  api.eu.teei-platform.com
```

### Deploying Canary

#### Step 1: Deploy Canary Version

```bash
# Deploy new version with canary label
kubectl set image deployment/teei-api \
  teei-api=teei-api:v2.0.0-canary \
  -l version=canary
```

#### Step 2: Route 5% Traffic to Canary

```bash
# Apply VirtualService with 5% canary traffic
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: teei-api-virtualservice
spec:
  http:
    - route:
        - destination:
            host: teei-api
            subset: stable
          weight: 95
        - destination:
            host: teei-api
            subset: canary
          weight: 5
EOF
```

#### Step 3: Monitor Canary Metrics

```bash
# Check error rate
kubectl exec -it prometheus-0 -- promtool query instant \
  'rate(http_requests_total{version="canary",status=~"5.."}[5m])'

# Check latency
kubectl exec -it prometheus-0 -- promtool query instant \
  'histogram_quantile(0.99, http_request_duration_seconds{version="canary"})'
```

#### Step 4: Increase Canary Traffic

```bash
# Increase to 25%
kubectl patch virtualservice teei-api-virtualservice --type=merge -p '
{
  "spec": {
    "http": [{
      "route": [
        {"destination": {"host": "teei-api", "subset": "stable"}, "weight": 75},
        {"destination": {"host": "teei-api", "subset": "canary"}, "weight": 25}
      ]
    }]
  }
}'
```

#### Step 5: Promote or Rollback

```bash
# Promote to 100% (success)
kubectl patch virtualservice teei-api-virtualservice --type=merge -p '
{
  "spec": {
    "http": [{
      "route": [
        {"destination": {"host": "teei-api", "subset": "canary"}, "weight": 100}
      ]
    }]
  }
}'

# Rollback to stable (failure)
kubectl patch virtualservice teei-api-virtualservice --type=merge -p '
{
  "spec": {
    "http": [{
      "route": [
        {"destination": {"host": "teei-api", "subset": "stable"}, "weight": 100}
      ]
    }]
  }
}'
```

---

## Troubleshooting

### DNS Issues

#### DNS Not Resolving

**Symptom**: `dig api.teei-platform.com` returns no results

**Diagnosis**:
```bash
# Check if hosted zone exists
aws route53 list-hosted-zones | grep teei-platform.com

# Check if record exists
./scripts/infra/update-dns.sh get api.teei-platform.com A

# Test from Route53 nameserver
dig @ns-1234.awsdns-12.org api.teei-platform.com
```

**Solutions**:
1. Verify hosted zone exists
2. Verify record exists in hosted zone
3. Check nameserver delegation
4. Wait for DNS propagation (up to 48h for new domains)

#### DNS Resolves to Wrong Region

**Symptom**: EU users resolving to US ALB

**Diagnosis**:
```bash
# Test geolocation routing
./scripts/infra/test-dns-routing.sh geolocation api.teei-platform.com

# Check DNS record configuration
./scripts/infra/update-dns.sh get api.teei-platform.com A
```

**Solutions**:
1. Verify geolocation routing policy is configured
2. Check geolocation takes precedence over latency routing
3. Verify EU ALB is healthy
4. Clear DNS cache on client

#### Health Check Always Failing

**Symptom**: Health check status shows unhealthy despite service being up

**Diagnosis**:
```bash
# Check health check status
./scripts/infra/update-dns.sh get-health-check us-api-health

# Test health endpoint directly
curl -v https://api.us.teei-platform.com/health/ready

# Check ALB target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/teei-api-us/...
```

**Solutions**:
1. Verify health endpoint returns 200 OK
2. Check security group allows Route53 health check IPs
3. Verify SSL certificate is valid
4. Check health check configuration (path, port, protocol)

### WAF Issues

#### Legitimate Requests Being Blocked

**Symptom**: Users reporting 403 errors for valid requests

**Diagnosis**:
```bash
# Analyze WAF logs for false positives
./scripts/infra/waf-analysis.sh false-positives

# Check which rule is blocking
./scripts/infra/waf-analysis.sh blocked
```

**Solutions**:
1. Identify the blocking rule
2. Add exception for specific URI pattern
3. Whitelist user IP address
4. Adjust rule sensitivity

**Example**: Whitelist IP
```bash
./scripts/infra/waf-analysis.sh whitelist 203.0.113.45
```

#### Rate Limiting Too Aggressive

**Symptom**: Users hitting rate limits under normal usage

**Diagnosis**:
```bash
# Analyze rate limiting events
./scripts/infra/waf-analysis.sh rate-limiting

# Check rate limit thresholds
aws wafv2 get-web-acl \
  --scope CLOUDFRONT \
  --id WEB_ACL_ID \
  --name teei-platform-global-waf
```

**Solutions**:
1. Increase rate limit threshold
2. Change from per-IP to per-user (Authorization header)
3. Whitelist internal IPs
4. Implement backoff retry logic in client

#### WAF Not Blocking Attacks

**Symptom**: Security scans show vulnerabilities not being blocked

**Diagnosis**:
```bash
# Test SQL injection protection
curl "https://api.teei-platform.com/api/v1/reports?id=1' OR '1'='1"

# Test XSS protection
curl "https://api.teei-platform.com/api/v1/reports?search=<script>alert('xss')</script>"
```

**Solutions**:
1. Verify WAF is associated with CloudFront/ALB
2. Enable AWS Managed Rules
3. Add custom rules for specific attack patterns
4. Review WAF logs for COUNT mode (testing without blocking)

### CloudFront Issues

#### Low Cache Hit Rate

**Symptom**: Cache hit rate < 70%

**Diagnosis**:
```bash
# Check cache hit rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=d1234567890 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

**Solutions**:
1. Increase TTL for cacheable content
2. Normalize query strings (cache based on specific params only)
3. Remove `Cache-Control: no-cache` headers from origin
4. Enable Origin Shield

#### Origin 5xx Errors

**Symptom**: CloudFront returning 502/503/504 errors

**Diagnosis**:
```bash
# Check origin health
curl -v https://teei-api-us-alb-1234567890.us-east-1.elb.amazonaws.com/health/ready

# Check CloudFront error rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name 5xxErrorRate \
  --dimensions Name=DistributionId,Value=d1234567890 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average
```

**Solutions**:
1. Check origin ALB is healthy
2. Increase origin timeout settings
3. Enable origin failover
4. Scale up backend services

---

## Disaster Recovery

### Failover Scenarios

#### Scenario 1: US Region Total Failure

**Detection**: All US health checks fail (RTO: 2 minutes)

**Automatic Actions**:
1. Route53 detects US health check failures (90 seconds)
2. Route53 stops routing traffic to US region
3. All traffic routed to EU region
4. CloudFront fails over to EU origin

**Manual Actions**:
1. Investigate US region outage
2. Notify stakeholders
3. Scale up EU region capacity
4. Monitor EU region performance

**Recovery**:
1. Restore US region services
2. Verify US health checks pass
3. Route53 automatically resumes US traffic (weighted)
4. Monitor traffic distribution
5. Scale down EU region after validation

#### Scenario 2: EU Region Total Failure

**Detection**: All EU health checks fail (RTO: 2 minutes)

**Automatic Actions**:
1. Route53 detects EU health check failures
2. EU traffic routed to US region
3. ⚠️ **GDPR Concern**: EU user data now in US region

**Manual Actions**:
1. Investigate EU region outage
2. Notify stakeholders **and GDPR compliance team**
3. Activate EU disaster recovery plan
4. Restore EU services ASAP
5. Document GDPR data transfer

**Recovery**:
1. Restore EU region services
2. Verify EU health checks pass
3. Route53 automatically resumes EU traffic
4. Verify GDPR compliance restored

#### Scenario 3: CloudFront Failure

**Detection**: CloudFront distribution unavailable

**Automatic Actions**:
1. DNS failover to ALB directly (bypassing CloudFront)

**Manual Actions**:
1. Contact AWS support for CloudFront issue
2. Temporarily route traffic directly to ALBs
3. Monitor increased origin load
4. Scale up ALBs if needed

**Recovery**:
1. CloudFront distribution restored
2. Update DNS to route through CloudFront
3. Monitor cache performance

### Backup & Restore

#### DNS Records Backup

```bash
# Export DNS records
./scripts/infra/update-dns.sh export dns-backup-$(date +%Y%m%d).json

# Store in S3
aws s3 cp dns-backup-$(date +%Y%m%d).json s3://teei-backups/dns/
```

#### Restore DNS Records

```bash
# Download backup from S3
aws s3 cp s3://teei-backups/dns/dns-backup-20250115.json .

# Import DNS records
./scripts/infra/update-dns.sh import dns-backup-20250115.json
```

### Runbook: Total Platform Failure

#### Prerequisites
- AWS credentials with admin access
- Access to Terraform state
- Access to GitHub repository
- Access to Vault for secrets

#### Step-by-Step Recovery

**1. Assess Damage** (5 minutes)
```bash
# Check all health checks
./scripts/infra/update-dns.sh list-health-checks

# Check CloudFront status
aws cloudfront list-distributions --query 'DistributionList.Items[].{Id:Id,Status:Status}'

# Check ALB status
aws elbv2 describe-load-balancers --region us-east-1
aws elbv2 describe-load-balancers --region eu-central-1
```

**2. Activate Disaster Recovery** (15 minutes)
```bash
# Restore infrastructure from Terraform
cd infra/
terraform init
terraform plan -out=dr-plan
terraform apply dr-plan

# Restore DNS records
./scripts/infra/update-dns.sh import s3://teei-backups/dns/latest.json
```

**3. Restore Services** (30 minutes)
```bash
# Restore Kubernetes clusters
kubectl apply -f k8s/manifests/

# Restore databases
./scripts/infra/postgres-failover.sh restore

# Verify services
kubectl get pods -A
```

**4. Verify Functionality** (15 minutes)
```bash
# Test DNS resolution
./scripts/infra/test-dns-routing.sh all api.teei-platform.com

# Test API endpoints
curl https://api.teei-platform.com/health/ready
curl https://api.teei-platform.com/api/v1/reports

# Test WAF
./scripts/infra/waf-analysis.sh summary
```

**5. Resume Traffic** (5 minutes)
```bash
# Update DNS to production
./scripts/infra/update-dns.sh upsert api.teei-platform.com A 54.123.45.67 60

# Monitor traffic
watch -n 5 'aws cloudwatch get-metric-statistics ...'
```

**Total RTO: 70 minutes**

---

## Appendix

### DNS Record Reference

| Record | Type | Routing | TTL | Value |
|--------|------|---------|-----|-------|
| api.teei-platform.com | A | Latency + Geolocation | 60 | ALB (US/EU) |
| reports.teei-platform.com | A | Weighted | 60 | ALB (60% US, 40% EU) |
| ws.teei-platform.com | A | Latency | 300 | NLB (US/EU) |
| us.teei-platform.com | A | Simple | 60 | US ALB |
| eu.teei-platform.com | A | Simple | 60 | EU ALB |
| cdn.teei-platform.com | A | Latency | 300 | CloudFront |

### WAF Rule Reference

| Rule ID | Name | Type | Priority | Action |
|---------|------|------|----------|--------|
| 10 | AWSManagedRulesCommonRuleSet | Managed | 10 | Block |
| 100 | GlobalRateLimit | Rate-based | 100 | Block |
| 110 | APIRateLimit | Rate-based | 110 | Block |
| 120 | GenAIRateLimit | Rate-based | 120 | Block |
| 140 | CSRFTokenValidation | Custom | 140 | Block |
| 170 | GeoBlocking | Custom | 170 | Block |

### Contact Information

- **Platform Team**: platform-ops@teei-platform.com
- **Security Team**: security@teei-platform.com
- **On-Call**: +1-555-PLATFORM (Pagerduty)
- **AWS Support**: Enterprise Support Plan

### Related Documentation

- [Multi-Region Architecture](/docs/Multi_Region_Architecture.md)
- [Disaster Recovery Plan](/docs/Disaster_Recovery.md)
- [Security Hardening](/docs/Security_Hardening.md)
- [Monitoring & Observability](/docs/Monitoring.md)

---

**Document Version**: 1.0
**Last Review**: 2025-11-15
**Next Review**: 2026-02-15 (Quarterly)
**Approved By**: Platform Operations Team
