# mTLS Service Mesh Documentation

**Version:** 1.0
**Last Updated:** 2025-11-15
**Author:** mtls-hardener agent
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [mTLS Configuration](#mtls-configuration)
5. [Authorization Policies](#authorization-policies)
6. [Certificate Management](#certificate-management)
7. [Cross-Region mTLS](#cross-region-mtls)
8. [Monitoring & Observability](#monitoring--observability)
9. [Operational Procedures](#operational-procedures)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)
12. [Performance Tuning](#performance-tuning)

---

## Overview

### What is mTLS?

Mutual TLS (mTLS) is a security protocol that provides:

- **Encryption**: All service-to-service communication is encrypted
- **Authentication**: Both client and server verify each other's identity
- **Authorization**: Fine-grained access control based on service identity
- **Zero-Trust**: No implicit trust based on network location

### Why Service Mesh?

The TEEI platform uses **Istio** service mesh to provide:

- **Automatic mTLS**: No code changes required in applications
- **Certificate Management**: Automatic issuance and rotation
- **Traffic Management**: Load balancing, circuit breaking, retries
- **Observability**: Metrics, logs, and traces for all traffic
- **Policy Enforcement**: Centralized security and authorization

### Security Posture

- **Production**: STRICT mode - only mTLS connections allowed
- **Staging**: PERMISSIVE mode - both plaintext and mTLS for debugging
- **Development**: PERMISSIVE mode - flexible for local development
- **Certificate Rotation**: Every 24 hours (automatic)
- **Authorization**: Deny-by-default with explicit allow policies

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Istio Control Plane                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Istiod    │  │ Ingress GW   │  │  Egress GW   │       │
│  │ (Pilot)     │  │ (Entry Point)│  │ (Exit Point) │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ mTLS Configuration
                            │ Certificate Distribution
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Plane                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │ Service A     │  │ Service B     │  │ Service C     │   │
│  │ ┌───────────┐ │  │ ┌───────────┐ │  │ ┌───────────┐ │   │
│  │ │  App      │ │  │ │  App      │ │  │ │  App      │ │   │
│  │ └───────────┘ │  │ └───────────┘ │  │ └───────────┘ │   │
│  │ ┌───────────┐ │  │ ┌───────────┐ │  │ ┌───────────┐ │   │
│  │ │Istio Proxy│◄┼──┼►│Istio Proxy│◄┼──┼►│Istio Proxy│ │   │
│  │ │ (Envoy)   │ │  │ │ (Envoy)   │ │  │ │ (Envoy)   │ │   │
│  │ └───────────┘ │  │ └───────────┘ │  │ └───────────┘ │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
                  │                  │
                  │   mTLS Traffic   │
                  │   Encrypted      │
                  └──────────────────┘
```

### Trust Model

1. **Root CA**: Self-signed root certificate (10 year lifetime)
2. **Intermediate CA**: Istio CA (managed by cert-manager)
3. **Workload Certificates**: Issued to each service (24 hour lifetime)
4. **Trust Domain**: `cluster.local` (US), `eu.cluster.local` (EU)

### Request Flow

```
Client → Envoy Sidecar → mTLS Handshake → Server Envoy → Server App
         │                                  │
         ├─ Client Cert                    ├─ Server Cert
         ├─ Validate Server                ├─ Validate Client
         ├─ Authorize Request              ├─ Check Authorization
         └─ Encrypt Traffic                └─ Decrypt & Forward
```

---

## Installation

### Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- Helm 3.x (optional)
- cert-manager 1.13+ (required)

### Step 1: Install cert-manager

```bash
# Install cert-manager for certificate automation
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=2m
kubectl wait --for=condition=Available deployment/cert-manager-webhook -n cert-manager --timeout=2m
```

### Step 2: Install Istio Operator

```bash
# Install Istio operator
kubectl apply -f https://github.com/istio/istio/releases/download/1.20.0/istio-operator.yaml

# Wait for operator to be ready
kubectl wait --for=condition=Available deployment/istio-operator -n istio-operator --timeout=2m
```

### Step 3: Apply Istio Configuration

```bash
# Apply all Istio base configuration
kubectl apply -k k8s/base/istio/

# Wait for Istio control plane to be ready
kubectl wait --for=condition=Available deployment/istiod -n istio-system --timeout=5m
kubectl wait --for=condition=Available deployment/istio-ingressgateway -n istio-system --timeout=5m
kubectl wait --for=condition=Available deployment/istio-egressgateway -n istio-system --timeout=5m
```

### Step 4: Apply mTLS Policies

```bash
# Apply mTLS policies and certificates
kubectl apply -k k8s/base/mtls/

# Verify installation
kubectl get peerauthentication -A
kubectl get authorizationpolicy -A
kubectl get certificates -n istio-system
```

### Step 5: Enable mTLS for Application Namespaces

```bash
# Enable mTLS for production namespace (STRICT mode)
./scripts/infra/enable-mtls.sh default STRICT

# Enable mTLS for staging namespace (PERMISSIVE mode)
./scripts/infra/enable-mtls.sh staging PERMISSIVE

# Verify mTLS is working
./scripts/infra/verify-mtls.sh default
```

### Step 6: Deploy Monitoring Dashboard

```bash
# Import Grafana dashboard
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: mtls-security-dashboard
  namespace: observability
  labels:
    grafana_dashboard: "1"
data:
  mtls-security.json: |
$(cat observability/grafana/dashboards/mtls-security.json | sed 's/^/    /')
EOF
```

---

## mTLS Configuration

### PeerAuthentication Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `STRICT` | Only mTLS connections allowed | Production environments |
| `PERMISSIVE` | Both plaintext and mTLS allowed | Migration, debugging |
| `DISABLE` | mTLS disabled (not recommended) | Legacy services |

### Global Default Policy

**File**: `/k8s/base/mtls/peer-authentication.yaml`

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default-mtls-strict
  namespace: istio-system  # Global policy
spec:
  mtls:
    mode: STRICT  # Reject all plaintext
```

### Namespace-Specific Policy

**Production** (STRICT):
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: production-mtls-strict
  namespace: default
spec:
  mtls:
    mode: STRICT
```

**Staging** (PERMISSIVE):
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: staging-mtls-permissive
  namespace: staging
spec:
  mtls:
    mode: PERMISSIVE  # Allow debugging
```

### Service-Specific Policy

Override mTLS for specific ports (e.g., legacy services):

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: legacy-service-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: legacy-service
  mtls:
    mode: PERMISSIVE
  portLevelMtls:
    8080:
      mode: DISABLE  # Disable mTLS only on port 8080
```

### DestinationRule (Client-Side mTLS)

**File**: `/k8s/base/mtls/destination-rules.yaml`

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: default-mtls
  namespace: istio-system
spec:
  host: "*.local"  # All services
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL  # Use Istio mTLS
```

---

## Authorization Policies

### Zero-Trust Model

**Default**: DENY ALL traffic

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all-default
  namespace: default
spec:
  {}  # Empty = deny everything
```

### Service-to-Service Authorization

Allow API Gateway to call backend services:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-api-gateway-to-backends
  namespace: default
spec:
  selector:
    matchLabels:
      component: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/default/sa/teei-api-gateway"
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
```

### Service Identity Format

Service principals use SPIFFE format:

```
<trust-domain>/ns/<namespace>/sa/<service-account>

Examples:
  cluster.local/ns/default/sa/teei-api-gateway
  cluster.local/ns/default/sa/teei-reporting
  eu.cluster.local/ns/default/sa/teei-analytics
```

### Path-Based Authorization

Restrict access to specific endpoints:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-reporting-to-ai
  namespace: default
spec:
  selector:
    matchLabels:
      app: teei-q2q-ai
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/default/sa/teei-reporting"
    to:
    - operation:
        methods: ["POST"]
        paths: ["/api/v1/q2q/*", "/api/v1/insights/*"]
```

### Method-Based Authorization

Allow only specific HTTP methods:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: readonly-analytics
  namespace: default
spec:
  selector:
    matchLabels:
      app: teei-analytics
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/default/sa/teei-reporting"
    to:
    - operation:
        methods: ["GET"]  # Read-only access
```

### Health Check Exemption

Allow health checks without authentication:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: default
spec:
  action: ALLOW
  rules:
  - to:
    - operation:
        paths: ["/health", "/healthz", "/ready", "/readyz"]
        methods: ["GET"]
```

---

## Certificate Management

### Certificate Lifecycle

```
┌──────────────┐
│  Bootstrap   │  Self-signed root CA (10 years)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Root CA     │  Istio CA certificate
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Workload Cert│  Service certificates (24 hours)
│              │  - Auto-issued by cert-manager
│              │  - Auto-renewed at 50% lifetime (12h)
│              │  - Distributed via Kubernetes secrets
└──────────────┘
```

### Certificate Rotation Timeline

| Time | Event |
|------|-------|
| T=0h | Certificate issued |
| T=12h | Auto-renewal triggered (50% lifetime) |
| T=18h | Alert if renewal failed |
| T=23h | Critical alert if renewal failed |
| T=24h | Certificate expires (connections fail) |

### Automatic Rotation

cert-manager handles automatic rotation:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: istio-pilot-cert
  namespace: istio-system
spec:
  duration: 24h           # Certificate lifetime
  renewBefore: 12h        # Renew at 50% lifetime
  rotationPolicy: Always  # Force key rotation
  issuerRef:
    name: istio-ca
    kind: ClusterIssuer
```

### Manual Certificate Rotation

Force immediate rotation:

```bash
# Rotate specific certificate
./scripts/infra/rotate-certs.sh istio-system istio-pilot-cert

# Rotate all certificates in a namespace
./scripts/infra/rotate-certs.sh istio-system all

# Rotate all certificates across all namespaces
./scripts/infra/rotate-certs.sh all
```

### Certificate Monitoring

**Grafana Dashboard**: "mTLS Security > Certificate Expiry Timeline"

**Prometheus Alert**:

```yaml
- alert: CertificateExpiringSoon
  expr: (certmanager_certificate_expiration_timestamp_seconds - time()) / 3600 < 6
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Certificate {{ $labels.name }} expires in < 6 hours"
    description: "Certificate will expire at {{ $value }}h"
```

### Certificate Providers

| Provider | Use Case | Lifetime |
|----------|----------|----------|
| `istio-ca` (self-signed) | Internal mTLS | 24 hours |
| `letsencrypt-prod` | Public TLS (ingress) | 90 days |
| `letsencrypt-staging` | Testing | 90 days |

---

## Cross-Region mTLS

### Multi-Cluster Setup

The TEEI platform supports cross-region service calls with mTLS:

- **US Region**: Trust domain `us.cluster.local`
- **EU Region**: Trust domain `eu.cluster.local`
- **Trust Bundle**: Combined CA certificates from both regions

### Trust Bundle Configuration

**File**: `/k8s/base/mtls/cert-manager.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: trust-bundle
  namespace: istio-system
data:
  us-ca.pem: |
    -----BEGIN CERTIFICATE-----
    # US region CA certificate
    -----END CERTIFICATE-----

  eu-ca.pem: |
    -----BEGIN CERTIFICATE-----
    # EU region CA certificate
    -----END CERTIFICATE-----

  combined-ca.pem: |
    # Concatenated: us-ca.pem + eu-ca.pem
```

### Extracting CA Certificates

**US Region**:
```bash
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca\.crt}' | base64 -d > us-ca.pem
```

**EU Region**:
```bash
# Connect to EU cluster
kubectl --context=eu-cluster get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca\.crt}' | base64 -d > eu-ca.pem
```

**Combine**:
```bash
cat us-ca.pem eu-ca.pem > combined-ca.pem
```

### Cross-Region ServiceEntry

**File**: `/k8s/base/mtls/cross-region-tls.yaml`

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: eu-region-services
  namespace: istio-system
spec:
  hosts:
  - "*.eu.cluster.local"
  location: MESH_INTERNAL
  ports:
  - number: 15443
    name: tls
    protocol: TLS
  resolution: DNS
  endpoints:
  - address: istio-ingressgateway.eu-region.example.com
    ports:
      tls: 15443
```

### Cross-Region Gateway

Expose port 15443 for cross-region mTLS:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: cross-region-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 15443
      name: tls-cross-region
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.us.cluster.local"
    - "*.eu.cluster.local"
```

### Cross-Region Authorization

Allow services from EU region:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-cross-region-eu
  namespace: default
spec:
  selector:
    matchLabels:
      cross-region-enabled: "true"
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "eu.cluster.local/ns/default/sa/*"
```

---

## Monitoring & Observability

### Metrics

**Istio Metrics** (Prometheus):

- `istio_requests_total{security_policy="mutual_tls"}` - mTLS request count
- `istio_tcp_connections_opened_total{security_policy="mutual_tls"}` - mTLS connections
- `istio_request_duration_milliseconds` - Request latency (including mTLS handshake)
- `certmanager_certificate_expiration_timestamp_seconds` - Certificate expiry time
- `certmanager_certificate_ready_status` - Certificate ready status

**cert-manager Metrics**:

- `certmanager_certificate_ready_status` - Certificate status (0=not ready, 1=ready)
- `certmanager_certificate_expiration_timestamp_seconds` - Expiry timestamp

### Grafana Dashboard

**Dashboard**: `/observability/grafana/dashboards/mtls-security.json`

**Panels**:

1. **mTLS Connection Success Rate** - Overall mTLS health (>99% = green)
2. **Certificate Expiry Timeline** - Hours until expiry for all certs
3. **mTLS Failures Over Time** - 4xx/5xx errors from mTLS
4. **Service-to-Service Traffic** - Which services are communicating
5. **Authorization Denials** - 403 errors from AuthorizationPolicy
6. **Control Plane Health** - Istio Pilot instances
7. **Certificate Rotations** - Rotation events (24h)
8. **mTLS Handshake Latency** - p95 latency (<5ms = green)
9. **Cross-Region Latency** - p95 latency for cross-region calls
10. **Sidecar Resource Usage** - Memory/CPU of Envoy proxies

### Alerts

**Critical Alerts**:

```yaml
# Certificate expiring in <6 hours
- alert: CertificateExpiringSoon
  expr: (certmanager_certificate_expiration_timestamp_seconds - time()) / 3600 < 6
  severity: critical

# mTLS failure rate >5%
- alert: HighMTLSFailureRate
  expr: sum(rate(istio_requests_total{response_code=~"4..",security_policy="mutual_tls"}[5m])) / sum(rate(istio_requests_total[5m])) > 0.05
  severity: critical

# Authorization denials >10/sec
- alert: HighAuthorizationDenials
  expr: sum(rate(istio_requests_total{response_code="403"}[5m])) > 10
  severity: warning
```

### Logging

**Envoy Access Logs** (JSON format):

```json
{
  "start_time": "2025-11-15T10:00:00.000Z",
  "method": "GET",
  "path": "/api/v1/metrics",
  "response_code": 200,
  "duration": 15,
  "upstream_service": "teei-analytics.default.svc.cluster.local",
  "requested_server_name": "teei-analytics",
  "tls_version": "TLSv1.3",
  "tls_cipher_suite": "TLS_AES_256_GCM_SHA384",
  "peer_certificate": "CN=teei-api-gateway"
}
```

### Tracing

**Jaeger Integration**:

- 10% sampling rate (configurable)
- Full trace includes mTLS handshake time
- Traces show service identity (from certificates)

---

## Operational Procedures

### Enable mTLS for New Service

1. **Label namespace** for Istio injection:
   ```bash
   kubectl label namespace my-namespace istio-injection=enabled
   ```

2. **Apply PeerAuthentication** policy:
   ```bash
   ./scripts/infra/enable-mtls.sh my-namespace STRICT
   ```

3. **Add AuthorizationPolicy** to allow traffic:
   ```yaml
   apiVersion: security.istio.io/v1beta1
   kind: AuthorizationPolicy
   metadata:
     name: allow-access-to-my-service
     namespace: my-namespace
   spec:
     selector:
       matchLabels:
         app: my-service
     action: ALLOW
     rules:
     - from:
       - source:
           principals:
           - "cluster.local/ns/default/sa/teei-api-gateway"
   ```

4. **Restart pods** to inject sidecars:
   ```bash
   kubectl rollout restart deployment/my-service -n my-namespace
   ```

5. **Verify** mTLS is working:
   ```bash
   ./scripts/infra/verify-mtls.sh my-namespace
   ```

### Migrate Service to mTLS

**Migration Path**: DISABLE → PERMISSIVE → STRICT

1. **Current state**: No mTLS (DISABLE or no policy)

2. **Enable PERMISSIVE mode** (allow both plaintext and mTLS):
   ```bash
   ./scripts/infra/enable-mtls.sh my-namespace PERMISSIVE
   ```

3. **Monitor** plaintext vs mTLS traffic in Grafana

4. **Gradually migrate** clients to mTLS-enabled

5. **Switch to STRICT** when all clients use mTLS:
   ```bash
   kubectl patch peerauthentication my-namespace-mtls-policy -n my-namespace \
     --type merge -p '{"spec":{"mtls":{"mode":"STRICT"}}}'
   ```

6. **Verify** no plaintext connections:
   ```bash
   ./scripts/infra/verify-mtls.sh my-namespace
   ```

### Certificate Expiry Incident Response

**Alert**: "Certificate expires in <6 hours"

1. **Check certificate status**:
   ```bash
   kubectl get certificates -n istio-system
   ```

2. **Check cert-manager logs**:
   ```bash
   kubectl logs -n cert-manager deployment/cert-manager --tail=100
   ```

3. **Force rotation**:
   ```bash
   ./scripts/infra/rotate-certs.sh istio-system <cert-name>
   ```

4. **Verify new certificate**:
   ```bash
   kubectl get certificate <cert-name> -n istio-system -o yaml
   ```

5. **Restart Istio components** (if needed):
   ```bash
   kubectl rollout restart deployment/istiod -n istio-system
   ```

### mTLS Connection Failure Response

**Symptom**: 503 errors, "upstream connect error or disconnect/reset before headers"

1. **Check sidecar injection**:
   ```bash
   ./scripts/infra/verify-mtls.sh <namespace>
   ```

2. **Debug specific pod**:
   ```bash
   ./scripts/infra/debug-mtls.sh <namespace> <pod-name> <target-service>
   ```

3. **Check authorization policies**:
   ```bash
   kubectl get authorizationpolicy -n <namespace>
   ```

4. **Check Envoy logs**:
   ```bash
   kubectl logs <pod-name> -n <namespace> -c istio-proxy --tail=100
   ```

5. **Verify certificates**:
   ```bash
   kubectl exec <pod-name> -n <namespace> -c istio-proxy -- \
     openssl x509 -in /etc/certs/cert-chain.pem -noout -enddate
   ```

---

## Troubleshooting

### Common Issues

#### 1. Sidecar Not Injected

**Symptom**: Pod has no `istio-proxy` container

**Cause**: Namespace not labeled for injection

**Solution**:
```bash
kubectl label namespace <namespace> istio-injection=enabled
kubectl delete pod <pod-name> -n <namespace>  # Force recreation
```

#### 2. Certificate Not Found

**Symptom**: Envoy logs: "SSL routines:CRYPTO_internal:unsafe legacy renegotiation disabled"

**Cause**: Certificate not mounted in sidecar

**Solution**:
```bash
# Check cert-manager is running
kubectl get pods -n cert-manager

# Check certificate status
kubectl get certificates -n istio-system

# Force certificate renewal
./scripts/infra/rotate-certs.sh istio-system all
```

#### 3. Authorization Denied (403)

**Symptom**: HTTP 403 Forbidden

**Cause**: No AuthorizationPolicy allowing the request

**Solution**:
```bash
# Check existing policies
kubectl get authorizationpolicy -n <namespace>

# Create allow policy
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-<source>-to-<destination>
  namespace: <namespace>
spec:
  selector:
    matchLabels:
      app: <destination>
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/<namespace>/sa/<source>"
EOF
```

#### 4. mTLS Mode Mismatch

**Symptom**: Connection refused or SSL errors

**Cause**: Source and destination have incompatible mTLS modes

**Solution**:
```bash
# Check PeerAuthentication policies
kubectl get peerauthentication -A

# Align modes (both STRICT or both PERMISSIVE)
./scripts/infra/enable-mtls.sh <namespace> PERMISSIVE  # For debugging
```

#### 5. High mTLS Latency

**Symptom**: p95 latency >10ms

**Cause**: Frequent certificate validation or handshake issues

**Solution**:
```bash
# Check certificate rotation frequency
kubectl get certificates -n istio-system -o yaml | grep duration

# Increase certificate lifetime (if acceptable)
# Edit certificate duration from 24h to 48h

# Check Envoy proxy resource limits
kubectl get pods -n <namespace> -o yaml | grep -A 10 "istio-proxy" | grep -A 5 "resources"
```

### Debug Commands

#### Check mTLS is active

```bash
# From within a pod with sidecar
kubectl exec <pod> -n <namespace> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ssl.handshake
```

#### View Envoy configuration

```bash
kubectl exec <pod> -n <namespace> -c istio-proxy -- \
  curl -s localhost:15000/config_dump > envoy-config.json
```

#### Check certificate details

```bash
kubectl exec <pod> -n <namespace> -c istio-proxy -- \
  openssl x509 -in /etc/certs/cert-chain.pem -text -noout
```

#### View peer certificate

```bash
kubectl exec <pod> -n <namespace> -c istio-proxy -- \
  openssl s_client -connect <service>:80 -showcerts
```

#### Check authorization

```bash
# Install istioctl
curl -L https://istio.io/downloadIstio | sh -
cd istio-*/bin
./istioctl authn tls-check <pod>.<namespace>
```

---

## Security Best Practices

### 1. Always Use STRICT in Production

```yaml
# Production namespaces must use STRICT mode
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: production-strict
  namespace: production
spec:
  mtls:
    mode: STRICT  # Reject plaintext
```

### 2. Deny-by-Default Authorization

```yaml
# Always start with deny-all
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: <namespace>
spec:
  {}  # Empty = deny all

---
# Then add explicit allows
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-specific-access
  namespace: <namespace>
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/allowed-service"]
```

### 3. Principle of Least Privilege

Only grant minimum required permissions:

```yaml
# BAD: Allow all methods
- operation:
    methods: ["*"]

# GOOD: Allow only required methods
- operation:
    methods: ["GET", "POST"]
    paths: ["/api/v1/metrics/*"]
```

### 4. Service Account per Service

Create dedicated ServiceAccounts:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: teei-reporting
  namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: teei-reporting
spec:
  template:
    spec:
      serviceAccountName: teei-reporting  # Use dedicated SA
```

### 5. Monitor Certificate Expiry

Set up alerts for certificates expiring in <6 hours:

```yaml
- alert: CertificateExpiringSoon
  expr: (certmanager_certificate_expiration_timestamp_seconds - time()) / 3600 < 6
  severity: critical
```

### 6. Rotate Certificates Regularly

Even with auto-rotation, test manual rotation:

```bash
# Monthly test: force rotation
./scripts/infra/rotate-certs.sh istio-system all
```

### 7. Audit Authorization Denials

Review 403 errors weekly:

```promql
sum(rate(istio_requests_total{response_code="403"}[24h])) by (source_app, destination_app)
```

### 8. Separate Trust Domains per Region

Use different trust domains for isolation:

- US: `us.cluster.local`
- EU: `eu.cluster.local`

Cross-region access requires explicit trust bundle configuration.

### 9. Encrypt at Rest and in Transit

- **In Transit**: mTLS (covered)
- **At Rest**: Encrypt Kubernetes secrets, use Sealed Secrets or Vault

### 10. Regular Security Audits

Monthly checklist:

- [ ] Review all AuthorizationPolicies
- [ ] Check for PERMISSIVE or DISABLE modes in production
- [ ] Verify certificate rotation is working
- [ ] Review authorization denial logs
- [ ] Update Istio to latest patch version

---

## Performance Tuning

### mTLS Overhead

Expected overhead:

- **Latency**: +2-5ms for mTLS handshake (first request)
- **CPU**: +50-100m per sidecar
- **Memory**: +100-200Mi per sidecar
- **Bandwidth**: +5-10% for TLS encryption

### Optimization Strategies

#### 1. Connection Pooling

Enable HTTP/2 connection reuse:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: connection-pooling
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        http2MaxRequests: 1000
        maxRequestsPerConnection: 2  # Reuse connections
```

#### 2. Certificate Caching

Longer certificate lifetime (if security allows):

```yaml
spec:
  duration: 48h        # Increase from 24h
  renewBefore: 24h     # Renew at 50%
```

**Trade-off**: Longer lifetime = longer compromise window

#### 3. Sidecar Resource Limits

Tune based on traffic:

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: istio-proxy
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m      # Increase for high traffic
        memory: 512Mi
```

#### 4. Disable Tracing for Low-Priority Traffic

Reduce overhead by lowering sampling rate:

```yaml
meshConfig:
  defaultConfig:
    tracing:
      sampling: 1.0  # 1% instead of 10%
```

#### 5. Enable Compression

Reduce bandwidth usage:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: EnvoyFilter
metadata:
  name: enable-compression
spec:
  configPatches:
  - applyTo: HTTP_FILTER
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.compressor
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.compressor.v3.Compressor
          compressor_library:
            name: gzip
```

---

## Conclusion

This mTLS implementation provides:

- **Zero-Trust Security**: All service-to-service traffic is encrypted and authenticated
- **Automatic Certificate Management**: 24-hour rotation with zero downtime
- **Fine-Grained Authorization**: ServiceAccount-based access control
- **Cross-Region Support**: Secure communication between US and EU regions
- **Observability**: Comprehensive monitoring and alerting
- **Operational Excellence**: Scripts for common tasks and troubleshooting

### Quick Reference

| Task | Command |
|------|---------|
| Enable mTLS | `./scripts/infra/enable-mtls.sh <namespace> STRICT` |
| Verify mTLS | `./scripts/infra/verify-mtls.sh <namespace>` |
| Debug mTLS | `./scripts/infra/debug-mtls.sh <namespace> <pod>` |
| Rotate certs | `./scripts/infra/rotate-certs.sh <namespace> <cert>` |
| View dashboard | http://grafana.example.com/d/mtls-security |

### Support

For issues or questions:

1. Check Grafana dashboard: "mTLS Security"
2. Run debug script: `./scripts/infra/debug-mtls.sh`
3. Review Envoy logs: `kubectl logs <pod> -c istio-proxy`
4. Consult Istio docs: https://istio.io/latest/docs/

---

**Document Version**: 1.0
**Last Review**: 2025-11-15
**Next Review**: 2026-02-15
