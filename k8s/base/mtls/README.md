# mTLS Infrastructure

This directory contains all mTLS (Mutual TLS) and service mesh configuration for the TEEI CSR Platform.

## Overview

Provides zero-trust service-to-service security with:

- **Encryption**: All internal traffic encrypted with TLS 1.3
- **Authentication**: Both client and server verify identity
- **Authorization**: ServiceAccount-based RBAC
- **Certificate Rotation**: Automatic every 24 hours
- **Cross-Region**: Secure US ↔ EU communication

## Files

| File | Purpose |
|------|---------|
| `peer-authentication.yaml` | mTLS enforcement policies (STRICT/PERMISSIVE) |
| `authorization-policies.yaml` | Zero-trust service-to-service RBAC |
| `destination-rules.yaml` | Client-side mTLS configuration |
| `cert-manager.yaml` | Certificate automation infrastructure |
| `certificates.yaml` | Certificate definitions (24h rotation) |
| `cross-region-tls.yaml` | Multi-region mesh federation |
| `namespace-labels.yaml` | Istio injection configuration |

## Quick Start

### 1. Install Prerequisites

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install Istio operator
kubectl apply -f https://github.com/istio/istio/releases/download/1.20.0/istio-operator.yaml
```

### 2. Deploy Istio

```bash
# Apply Istio control plane
kubectl apply -k ../istio/

# Wait for Istio to be ready
kubectl wait --for=condition=Available deployment/istiod -n istio-system --timeout=5m
```

### 3. Deploy mTLS Policies

```bash
# Apply all mTLS configurations
kubectl apply -k .

# Verify
kubectl get peerauthentication -A
kubectl get authorizationpolicy -A
kubectl get certificates -n istio-system
```

### 4. Enable for Your Namespace

```bash
# Enable mTLS for production namespace (STRICT mode)
../../../scripts/infra/enable-mtls.sh default STRICT

# Verify it's working
../../../scripts/infra/verify-mtls.sh default
```

## Configuration Modes

### Production (STRICT)

```yaml
spec:
  mtls:
    mode: STRICT  # Only mTLS allowed, reject plaintext
```

Use for: Production environments

### Staging (PERMISSIVE)

```yaml
spec:
  mtls:
    mode: PERMISSIVE  # Allow both plaintext and mTLS
```

Use for: Staging, debugging, gradual migration

### Disabled (DISABLE)

```yaml
spec:
  mtls:
    mode: DISABLE  # No mTLS
```

Use for: Legacy services (not recommended)

## Authorization Examples

### Allow API Gateway to Backend Services

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-gateway-to-backends
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
```

### Allow Cross-Region Access

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-eu-region
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

### Deny by Default

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  {}  # Empty = deny all
```

## Certificate Management

### Automatic Rotation

Certificates auto-rotate every 24 hours:

- **Issued**: T=0h
- **Renewed**: T=12h (50% lifetime)
- **Expires**: T=24h

### Manual Rotation

```bash
# Rotate specific certificate
../../../scripts/infra/rotate-certs.sh istio-system istio-pilot-cert

# Rotate all certificates
../../../scripts/infra/rotate-certs.sh all
```

### Check Expiry

```bash
kubectl get certificates -n istio-system -o custom-columns=NAME:.metadata.name,EXPIRY:.status.notAfter
```

## Monitoring

### Grafana Dashboard

Open: `http://grafana.example.com/d/mtls-security`

Panels:
- mTLS connection success rate
- Certificate expiry timeline
- Authorization denials
- Cross-region latency

### Key Metrics

```promql
# mTLS request rate
sum(rate(istio_requests_total{security_policy="mutual_tls"}[5m]))

# Certificate expiry (hours)
(certmanager_certificate_expiration_timestamp_seconds - time()) / 3600

# Authorization denials
sum(rate(istio_requests_total{response_code="403"}[5m]))
```

## Troubleshooting

### Sidecar Not Injected

```bash
kubectl label namespace <namespace> istio-injection=enabled
kubectl rollout restart deployment/<deployment> -n <namespace>
```

### Authorization Denied (403)

```bash
# Check policies
kubectl get authorizationpolicy -n <namespace>

# Add allow rule
kubectl apply -f my-authorization-policy.yaml
```

### Certificate Expired

```bash
# Rotate immediately
../../../scripts/infra/rotate-certs.sh istio-system all
```

### Debug Connection

```bash
../../../scripts/infra/debug-mtls.sh <namespace> <pod-name> <target-service>
```

## Security Best Practices

1. **Always use STRICT in production**
2. **Deny-by-default authorization** (empty policy)
3. **Principle of least privilege** (minimal permissions)
4. **Monitor certificate expiry** (<6 hours alert)
5. **Review authorization denials** weekly
6. **Separate trust domains** per region
7. **Use ServiceAccount per service**

## Cross-Region Setup

### US Region (us.cluster.local)

```bash
# Apply with US trust domain
kubectl apply -k ../../overlays/production/
```

### EU Region (eu.cluster.local)

```bash
# Apply with EU trust domain
kubectl apply -k ../../overlays/eu-region/
```

### Trust Bundle

Exchange CA certificates:

```bash
# Extract US CA
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca\.crt}' | base64 -d > us-ca.pem

# Extract EU CA (from EU cluster)
kubectl --context=eu get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca\.crt}' | base64 -d > eu-ca.pem

# Combine
cat us-ca.pem eu-ca.pem > combined-ca.pem

# Update trust bundle ConfigMap
kubectl create configmap trust-bundle -n istio-system --from-file=combined-ca.pem --dry-run=client -o yaml | kubectl apply -f -
```

## Performance

### Expected Overhead

- **Latency**: +2-5ms (mTLS handshake)
- **CPU**: +50-100m per sidecar
- **Memory**: +100-200Mi per sidecar

### Optimization

```yaml
# Increase connection pooling
trafficPolicy:
  connectionPool:
    http:
      http2MaxRequests: 1000
      maxRequestsPerConnection: 2
```

## Support

For issues:

1. Run verify script: `../../../scripts/infra/verify-mtls.sh`
2. Check Grafana dashboard: "mTLS Security"
3. Review documentation: `/docs/mTLS_Service_Mesh.md`
4. Debug with: `../../../scripts/infra/debug-mtls.sh`

## References

- [Full Documentation](/docs/mTLS_Service_Mesh.md)
- [Istio Documentation](https://istio.io/latest/docs/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [SPIFFE/SPIRE](https://spiffe.io/)
