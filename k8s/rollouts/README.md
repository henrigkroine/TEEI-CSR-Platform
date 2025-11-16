# Argo Rollouts - Deployment Manifests

This directory contains Argo Rollouts manifests for progressive delivery (blue/green and canary deployments).

## Directory Structure

```
rollouts/
├── blue-green/           # Blue/Green deployment manifests
│   ├── api-gateway-rollout.yaml
│   ├── reporting-rollout.yaml
│   ├── corp-cockpit-rollout.yaml
│   └── kustomization.yaml
├── canary/               # Canary deployment manifests
│   ├── q2q-ai-rollout.yaml
│   ├── analytics-rollout.yaml
│   ├── data-residency-rollout.yaml
│   └── kustomization.yaml
├── analysis/             # Analysis templates for automated validation
│   ├── success-rate-analysis.yaml
│   ├── latency-analysis.yaml
│   ├── genai-token-analysis.yaml
│   ├── gdpr-compliance-analysis.yaml
│   └── kustomization.yaml
└── README.md
```

## Quick Start

### 1. Install Argo Rollouts

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f ../base/argo-rollouts/install.yaml
kubectl -n argo-rollouts get pods
```

### 2. Deploy Analysis Templates

```bash
kubectl apply -k analysis/
kubectl get analysistemplates
```

### 3. Deploy Rollouts

```bash
# Blue/Green rollouts
kubectl apply -k blue-green/

# Canary rollouts
kubectl apply -k canary/

# Verify
kubectl get rollouts
```

## Deployment Examples

### Blue/Green: API Gateway

```bash
# Deploy new version
kubectl argo rollouts set image teei-api-gateway \
  api-gateway=ghcr.io/henrigkroine/teei-api-gateway:v1.2.3

# Monitor
kubectl argo rollouts get rollout teei-api-gateway --watch

# Promote (manual)
kubectl argo rollouts promote teei-api-gateway
```

### Canary: Q2Q AI Service

```bash
# Deploy new version
kubectl argo rollouts set image teei-q2q-ai \
  q2q-ai=ghcr.io/henrigkroine/teei-q2q-ai:v1.5.0

# Monitor canary progression (auto-promotes)
kubectl argo rollouts get rollout teei-q2q-ai --watch
```

### Multi-Region Coordinated Rollout

```bash
# Use coordinated rollout script
/home/user/TEEI-CSR-Platform/scripts/infra/coordinated-rollout.sh \
  teei-api-gateway \
  ghcr.io/henrigkroine/teei-api-gateway:v1.2.3
```

## Rollback

### Manual Rollback

```bash
# Abort and revert
kubectl argo rollouts abort <rollout-name>
kubectl argo rollouts undo <rollout-name>
```

### Emergency Multi-Region Rollback

```bash
/home/user/TEEI-CSR-Platform/scripts/infra/emergency-rollback.sh \
  <rollout-name> \
  "Reason for rollback"
```

## Service Mapping

| Service | Strategy | Auto-Promotion | File |
|---------|----------|----------------|------|
| API Gateway | Blue/Green | No (manual) | blue-green/api-gateway-rollout.yaml |
| Reporting (GenAI) | Blue/Green | No (manual) | blue-green/reporting-rollout.yaml |
| Corp Cockpit | Blue/Green | Yes (10 min) | blue-green/corp-cockpit-rollout.yaml |
| Q2Q AI | Canary | Yes (with analysis) | canary/q2q-ai-rollout.yaml |
| Analytics | Canary | Yes (with analysis) | canary/analytics-rollout.yaml |
| Data Residency | Canary | No (manual) | canary/data-residency-rollout.yaml |

## Monitoring

### Grafana Dashboard

```bash
# Import dashboard
kubectl apply -f ../../observability/grafana/dashboards/rollouts.json

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:80
# Open: http://localhost:3000/d/rollouts
```

### CLI Monitoring

```bash
# List all rollouts
kubectl argo rollouts list

# Get rollout status
kubectl argo rollouts get rollout <name>

# Watch rollout
kubectl argo rollouts get rollout <name> --watch

# Get analysis runs
kubectl get analysisrun -l rollout=<name>
```

## Documentation

Full documentation: `/home/user/TEEI-CSR-Platform/docs/Blue_Green_Canary_Rollouts.md`

Topics covered:
- Deployment strategies overview
- Blue/Green vs Canary decision matrix
- Analysis template creation
- Regional coordination
- Rollback procedures
- Troubleshooting guide
- Best practices

## References

- [Argo Rollouts Docs](https://argoproj.github.io/argo-rollouts/)
- [Analysis Templates](https://argoproj.github.io/argo-rollouts/features/analysis/)
- [Traffic Management](https://argoproj.github.io/argo-rollouts/features/traffic-management/)
