# TEEI CSR Platform - Kubernetes Deployment Guide

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Multi-Region Deployment](#multi-region-deployment)
- [Deployment Procedures](#deployment-procedures)
- [Region Selection Criteria](#region-selection-criteria)
- [Failover Procedures](#failover-procedures)
- [Troubleshooting](#troubleshooting)

---

## Overview

The TEEI CSR Platform is deployed across multiple regions using Kubernetes with Kustomize for configuration management. This guide covers deployment procedures for both single-region and multi-region configurations.

### Directory Structure

```
k8s/
├── base/                          # Base Kubernetes manifests
│   ├── api-gateway/
│   ├── corp-cockpit-astro/
│   ├── reporting/
│   ├── analytics/
│   ├── ... (other services)
│   ├── ingress.yaml
│   └── network-policies.yaml
├── overlays/                      # Environment-specific overlays
│   ├── development/               # Development environment
│   ├── staging/                   # Staging environment
│   ├── production/                # Production (base configuration)
│   ├── eu-central-1/              # EU region (Frankfurt)
│   └── us-east-1/                 # US region (N. Virginia)
├── jobs/                          # Kubernetes Jobs and CronJobs
├── overlays/regions-config.yaml   # Multi-region configuration
└── README.md                      # This file
```

---

## Architecture

### Service Components

The platform consists of the following core services:

1. **API Gateway** - Central API routing and authentication
2. **Corporate Cockpit** - Executive dashboard (Astro 5)
3. **Reporting Service** - GenAI-powered reporting with citations
4. **Q2Q AI Service** - Qualitative-to-Quantitative analysis
5. **Analytics Service** - ClickHouse-based analytics
6. **Unified Profile** - User profile management
7. **Notifications** - Event-driven notifications
8. **Journey Engine** - User journey tracking
9. **Impact Calculator** - SROI/VIS calculations
10. **Connectors** - Third-party integrations (Kintell, Buddy, Upskilling)

### Infrastructure Services

- **PostgreSQL** - Primary data store with cross-region replication
- **ClickHouse** - Analytics database with sharding
- **NATS** - Message broker with leafnode connections
- **Grafana** - Observability and monitoring

---

## Multi-Region Deployment

The platform supports multi-region deployment across:

### Supported Regions

| Region        | Code          | Primary | GDPR | Data Residency | Capacity | Status |
|---------------|---------------|---------|------|----------------|----------|--------|
| US East       | us-east-1     | Yes     | No   | US             | 60%      | Active |
| EU Central    | eu-central-1  | No      | Yes  | EU             | 40%      | Active |

### Regional Endpoints

#### US East 1 (Primary)
- Web: `https://us.teei-platform.com`
- API: `https://api.us.teei-platform.com`
- Reports: `https://reports.us.teei-platform.com`

#### EU Central 1
- Web: `https://eu.teei-platform.com`
- API: `https://api.eu.teei-platform.com`
- Reports: `https://reports.eu.teei-platform.com`

### Regional Features

#### US East 1 (us-east-1)
- **Primary region** - handles majority of global traffic
- **Higher resource limits** - optimized for peak load
- **Data residency**: United States
- **Timezone**: America/New_York (EST/EDT)
- **Locale**: en-US
- **GDPR compliance**: Standard mode

#### EU Central 1 (eu-central-1)
- **Secondary region** - handles European traffic
- **GDPR-compliant** - strict data residency enforcement
- **Data residency**: European Union
- **Timezone**: Europe/Berlin (CET/CEST)
- **Locale**: en-GB (with multi-locale support)
- **GDPR compliance**: Strict mode

---

## Deployment Procedures

### Prerequisites

1. **Tools Required**:
   - `kubectl` (v1.27+)
   - `kustomize` (v5.0+)
   - `helm` (v3.12+) - for infrastructure services
   - AWS CLI (configured with appropriate credentials)

2. **Access Requirements**:
   - Kubernetes cluster access (RBAC configured)
   - AWS credentials with EKS permissions
   - Container registry access (ghcr.io)

### Single-Region Deployment

#### Development Environment

```bash
# Deploy to development
kubectl apply -k k8s/overlays/development

# Verify deployment
kubectl get pods -n teei-development
kubectl get ingress -n teei-development
```

#### Staging Environment

```bash
# Deploy to staging
kubectl apply -k k8s/overlays/staging

# Verify deployment
kubectl get pods -n teei-staging
kubectl get ingress -n teei-staging
```

#### Production (Generic)

```bash
# Deploy to production (single region)
kubectl apply -k k8s/overlays/production

# Verify deployment
kubectl get pods -n teei-production
kubectl get ingress -n teei-production
```

### Multi-Region Deployment

#### Deploy to US East 1 (Primary)

```bash
# 1. Apply multi-region configuration
kubectl apply -f k8s/overlays/regions-config.yaml

# 2. Deploy to US region
kubectl apply -k k8s/overlays/us-east-1

# 3. Verify deployment
kubectl get pods -n teei-us-east-1
kubectl get ingress -n teei-us-east-1

# 4. Check regional labels
kubectl get pods -n teei-us-east-1 -L teei.platform/region
```

#### Deploy to EU Central 1

```bash
# 1. Ensure multi-region config is applied
kubectl get configmap multi-region-config -n kube-system

# 2. Deploy to EU region
kubectl apply -k k8s/overlays/eu-central-1

# 3. Verify deployment
kubectl get pods -n teei-eu-central-1
kubectl get ingress -n teei-eu-central-1

# 4. Check GDPR compliance labels
kubectl get namespace teei-eu-central-1 -o yaml | grep gdpr
```

#### Complete Multi-Region Setup

```bash
#!/bin/bash
# deploy-multi-region.sh

# Deploy multi-region configuration
echo "Deploying multi-region configuration..."
kubectl apply -f k8s/overlays/regions-config.yaml

# Deploy to US East 1 (Primary)
echo "Deploying to US East 1 (Primary)..."
kubectl apply -k k8s/overlays/us-east-1
kubectl wait --for=condition=available --timeout=600s deployment --all -n teei-us-east-1

# Deploy to EU Central 1
echo "Deploying to EU Central 1..."
kubectl apply -k k8s/overlays/eu-central-1
kubectl wait --for=condition=available --timeout=600s deployment --all -n teei-eu-central-1

# Verify cross-region connectivity
echo "Verifying cross-region connectivity..."
kubectl run test-connectivity --rm -i --tty --image=curlimages/curl \
  --restart=Never --namespace=teei-us-east-1 \
  -- curl -s http://eu-teei-api-gateway.teei-eu-central-1.svc.cluster.local/health

echo "Multi-region deployment complete!"
```

### Updating Deployments

#### Update Single Service

```bash
# Update a specific service in US region
kubectl set image deployment/us-teei-api-gateway \
  api-gateway=ghcr.io/henrigkroine/teei-api-gateway:v1.1.0 \
  -n teei-us-east-1

# Rollout status
kubectl rollout status deployment/us-teei-api-gateway -n teei-us-east-1
```

#### Rolling Update Across Regions

```bash
#!/bin/bash
# rolling-update.sh

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
  echo "Usage: ./rolling-update.sh <version>"
  exit 1
fi

# Update US region first (primary)
echo "Updating US region to $NEW_VERSION..."
kubectl set image deployment/us-teei-api-gateway \
  api-gateway=ghcr.io/henrigkroine/teei-api-gateway:$NEW_VERSION \
  -n teei-us-east-1

kubectl rollout status deployment/us-teei-api-gateway -n teei-us-east-1

# Wait for health checks
sleep 30

# Update EU region
echo "Updating EU region to $NEW_VERSION..."
kubectl set image deployment/eu-teei-api-gateway \
  api-gateway=ghcr.io/henrigkroine/teei-api-gateway:$NEW_VERSION \
  -n teei-eu-central-1

kubectl rollout status deployment/eu-teei-api-gateway -n teei-eu-central-1

echo "Rolling update complete!"
```

---

## Region Selection Criteria

### Automatic Region Selection

The platform uses geo-proximity routing to automatically direct users to the nearest region:

#### North America → US East 1
- Countries: US, CA, MX
- Latency: <50ms
- Data residency: United States

#### Europe → EU Central 1
- Countries: DE, FR, GB, ES, IT, NL, SE, NO, DK, FI, BE, AT, CH, IE, PL, PT, CZ
- Latency: <30ms (within EU)
- Data residency: European Union
- **GDPR enforcement**: Mandatory for EU citizens

#### Asia-Pacific → US East 1 (temporary)
- Countries: JP, SG, AU, NZ, IN, KR, HK
- Latency: 150-200ms
- Note: APAC region planned for future deployment

#### Default Fallback → US East 1
- All other regions route to US (primary)

### Manual Region Override

Users can manually select a region via:

1. **Region cookie**: `teei-region=eu-central-1` (24h TTL)
2. **Query parameter**: `?region=us-east-1`
3. **User profile setting**: Stored in database

### GDPR Compliance Enforcement

**Important**: EU citizens are **automatically routed to EU Central 1** regardless of geographic location to ensure GDPR compliance.

```yaml
# GDPR enforcement (from regions-config.yaml)
gdpr:
  enabled: true
  enforce_eu_residency: true
  cross_border_transfers:
    eu_to_us:
      allowed: false
      require_consent: true
```

---

## Failover Procedures

### Health Monitoring

Each region performs continuous health checks:

- **Interval**: 30 seconds
- **Unhealthy threshold**: 3 consecutive failures
- **Healthy threshold**: 2 consecutive successes

### Automatic Failover

#### US East 1 Failure → EU Central 1

```bash
# Health check failure detected in US
# Traffic automatically routes to EU

# Verify failover
kubectl get pods -n teei-us-east-1 | grep -i crash
kubectl logs -n teei-us-east-1 deployment/us-teei-api-gateway --tail=100

# Monitor EU region handling increased load
kubectl top pods -n teei-eu-central-1
```

#### EU Central 1 Failure → US East 1

```bash
# EU region health check fails
# Non-GDPR traffic routes to US (GDPR traffic queued)

# GDPR-compliant users will see:
# "Service temporarily unavailable. Data residency requirements prevent failover."
```

### Manual Failover

#### Planned Maintenance - Drain Region

```bash
# Drain US East 1 for maintenance
kubectl cordon $(kubectl get nodes -n teei-us-east-1 -o name)
kubectl drain $(kubectl get nodes -n teei-us-east-1 -o name) --ignore-daemonsets

# Traffic automatically routes to EU
# Wait for pods to terminate gracefully

# Perform maintenance...

# Uncordon nodes
kubectl uncordon $(kubectl get nodes -n teei-us-east-1 -o name)
```

#### Emergency Failover - Force Traffic Shift

```bash
#!/bin/bash
# emergency-failover.sh

SOURCE_REGION=$1
TARGET_REGION=$2

echo "Emergency failover: $SOURCE_REGION → $TARGET_REGION"

# Update DNS to point to target region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-failover-$TARGET_REGION.json

# Scale down source region
kubectl scale deployment --all --replicas=0 -n teei-$SOURCE_REGION

# Scale up target region
kubectl scale deployment --all --replicas=5 -n teei-$TARGET_REGION

echo "Failover complete. Monitor $TARGET_REGION closely."
```

### Failback Procedures

```bash
# After incident resolution, failback to primary region

# 1. Verify primary region health
kubectl get pods -n teei-us-east-1
kubectl get deployments -n teei-us-east-1

# 2. Gradually shift traffic back (10% increments)
# Update load balancer weights via Route53

# 3. Monitor error rates and latency
kubectl logs -n teei-us-east-1 deployment/us-teei-api-gateway --tail=500 | grep ERROR

# 4. Complete failback
# Update DNS to restore primary routing
```

---

## Troubleshooting

### Common Issues

#### 1. Pods Not Scheduling (Region Affinity)

```bash
# Check node labels
kubectl get nodes --show-labels | grep topology.kubernetes.io/region

# Verify pod affinity rules
kubectl describe pod <pod-name> -n teei-us-east-1 | grep -A 20 Affinity

# Solution: Ensure nodes have correct region labels
kubectl label nodes <node-name> topology.kubernetes.io/region=us-east-1
```

#### 2. Cross-Region Network Policy Blocking Traffic

```bash
# Test cross-region connectivity
kubectl run test-eu --rm -i --tty --image=curlimages/curl \
  --restart=Never --namespace=teei-us-east-1 \
  -- curl -v http://eu-teei-api-gateway.teei-eu-central-1.svc.cluster.local/health

# Check network policies
kubectl get networkpolicies -n teei-us-east-1
kubectl describe networkpolicy allow-cross-region-us-to-eu -n teei-us-east-1

# Solution: Verify namespace labels match NetworkPolicy selectors
kubectl get namespace teei-eu-central-1 --show-labels
```

#### 3. GDPR Compliance Violations

```bash
# Check if EU user data is being processed in US region
kubectl logs -n teei-us-east-1 deployment/us-teei-api-gateway | grep "gdpr_violation"

# Audit data residency
kubectl exec -it deployment/us-teei-reporting -n teei-us-east-1 -- \
  psql -c "SELECT region, COUNT(*) FROM users WHERE gdpr_required=true GROUP BY region;"

# Solution: Ensure geo-routing is enforcing GDPR rules
kubectl get configmap multi-region-config -n kube-system -o yaml | grep -A 10 gdpr
```

#### 4. Resource Quota Exceeded

```bash
# Check regional resource quotas
kubectl get resourcequota -n teei-us-east-1
kubectl describe resourcequota -n teei-us-east-1

# View current resource usage
kubectl top pods -n teei-us-east-1
kubectl top nodes

# Solution: Adjust quotas in regions-config.yaml or scale down non-critical services
```

#### 5. Ingress TLS Certificate Issues

```bash
# Check certificate status
kubectl get certificate -n teei-us-east-1
kubectl describe certificate teei-platform-tls-us-east-1 -n teei-us-east-1

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Solution: Verify DNS is resolving correctly
dig us.teei-platform.com
nslookup api.us.teei-platform.com
```

### Monitoring Commands

```bash
# Real-time pod status across all regions
watch kubectl get pods --all-namespaces | grep teei

# Regional deployment health
kubectl get deployments -n teei-us-east-1
kubectl get deployments -n teei-eu-central-1

# Ingress status
kubectl get ingress -n teei-us-east-1
kubectl get ingress -n teei-eu-central-1

# Network policies
kubectl get networkpolicies --all-namespaces | grep teei

# Regional service discovery
kubectl get configmap service-discovery -n kube-system -o yaml
```

### Logs & Debugging

```bash
# API Gateway logs (US)
kubectl logs -f deployment/us-teei-api-gateway -n teei-us-east-1

# Corporate Cockpit logs (EU)
kubectl logs -f deployment/eu-teei-corp-cockpit -n teei-eu-central-1

# Reporting service logs (with GenAI traces)
kubectl logs -f deployment/us-teei-reporting -n teei-us-east-1 | grep -i anthropic

# Cross-region replication logs (PostgreSQL)
kubectl logs -f deployment/postgresql-primary -n teei-us-east-1 | grep replication

# NATS leafnode connectivity
kubectl logs -f deployment/nats -n teei-us-east-1 | grep leafnode
```

---

## Additional Resources

- **Kustomize Documentation**: https://kustomize.io/
- **Kubernetes Multi-Region**: https://kubernetes.io/docs/setup/best-practices/multiple-zones/
- **AWS EKS Best Practices**: https://aws.github.io/aws-eks-best-practices/
- **GDPR Compliance Guide**: https://gdpr.eu/
- **TEEI Platform Docs**: `/docs/` (repository root)

---

## Support

For deployment issues or questions:

1. Check this README and troubleshooting section
2. Review deployment logs: `kubectl logs -n <namespace> deployment/<deployment-name>`
3. Consult `/docs/DEPLOYMENT.md` for detailed procedures
4. Contact DevOps team via #teei-ops Slack channel

---

**Last Updated**: 2025-11-15
**Version**: 1.0.0
**Maintainer**: TEEI Platform Team
