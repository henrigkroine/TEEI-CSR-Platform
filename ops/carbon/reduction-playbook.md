# Carbon Reduction Playbook

## Overview

This playbook provides actionable strategies to reduce the carbon footprint of the TEEI CSR Platform. Following these recommendations can reduce emissions by 30-50% while maintaining performance and reliability.

---

## 🎯 Quick Wins (0-30 days)

### 1. Regional Optimization

**Impact**: 30-44% reduction
**Effort**: Medium
**Priority**: High

**Actions**:
- Migrate workloads from high-carbon regions to low-carbon alternatives:
  - `ap-northeast-1` (Tokyo, 518 gCO₂e/kWh) → `us-west-2` (Oregon, 291 gCO₂e/kWh)
  - `ap-southeast-1` (Singapore, 498 gCO₂e/kWh) → `eu-west-1` (Ireland, 283 gCO₂e/kWh)

- Use multi-region routing to prefer low-carbon regions when possible

**Implementation**:
```bash
# Update Terraform/K8s configs to prioritize low-carbon regions
terraform apply -var="preferred_regions=[\"us-west-2\",\"eu-west-1\"]"

# Update DNS routing weights
ops/failover/drill-cli.ts weighted-dns-update --weights='{"us-west-2":50,"eu-west-1":50}'
```

---

### 2. Auto-Scaling Implementation

**Impact**: 15-25% reduction
**Effort**: Low
**Priority**: High

**Actions**:
- Enable Kubernetes Horizontal Pod Autoscaling (HPA) for all services
- Set aggressive scale-down policies for non-critical services
- Implement cluster autoscaling to remove idle nodes

**Implementation**:
```yaml
# k8s/base/api-gateway/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 15
```

---

### 3. Instance Right-Sizing

**Impact**: 10-20% reduction
**Effort**: Medium
**Priority**: Medium

**Actions**:
- Analyze CPU/memory utilization over 30 days
- Downsize over-provisioned instances
- Use burstable instances (T-series in AWS) for variable workloads

**Implementation**:
```bash
# Run sizing analysis
kubectl top pods --all-namespaces

# Review recommendations
ops/finops/finops-cli.ts allocate

# Update deployment resource requests/limits
kubectl set resources deployment/api-gateway \
  --requests=cpu=250m,memory=256Mi \
  --limits=cpu=500m,memory=512Mi
```

---

## 📅 Medium-term Initiatives (30-90 days)

### 4. Time-Shifted Batch Processing

**Impact**: 20-30% reduction (for batch workloads)
**Effort**: Medium
**Priority**: Medium

**Actions**:
- Schedule non-critical batch jobs during off-peak hours (10pm-6am local time)
- Grid carbon intensity is typically 20-30% lower during these hours
- Use carbon-aware scheduling tools (e.g., Carbon Aware SDK)

**Implementation**:
```yaml
# Example CronJob with off-peak scheduling
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-report-generator
spec:
  schedule: "0 2 * * *"  # 2 AM UTC (off-peak)
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            carbon-aware-scheduling: "true"
```

---

### 5. Storage Lifecycle Management

**Impact**: 10-15% reduction
**Effort**: Low
**Priority**: Medium

**Actions**:
- Implement data lifecycle policies
- Archive data older than 90 days to cold storage
- Delete unused data and backups

**Implementation**:
```bash
# AWS S3 lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket teei-data \
  --lifecycle-configuration file://lifecycle.json

# lifecycle.json:
{
  "Rules": [
    {
      "Id": "ArchiveOldReports",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

---

### 6. Renewable Energy Matching

**Impact**: Variable (depends on provider)
**Effort**: Low
**Priority**: Low

**Actions**:
- Purchase Renewable Energy Certificates (RECs) to offset remaining emissions
- Work with cloud providers to use renewable-powered regions
- Track and report renewable energy percentage

**Implementation**:
- AWS: Enable renewable energy matching in billing console
- Azure: Purchase carbon offsets through sustainability dashboard
- GCP: Already carbon-neutral by default

---

## 🚀 Long-term Strategy (90+ days)

### 7. Carbon-Aware Architecture

**Impact**: 25-35% reduction
**Effort**: High
**Priority**: Medium

**Actions**:
- Build carbon awareness into application logic
- Route requests to regions with current low carbon intensity
- Defer non-urgent work to low-carbon time windows

**Implementation**:
```typescript
// Example: Carbon-aware request routing
import { getCarbonIntensity } from '@carbon/carbon-estimator';

async function routeRequest(req: Request): Promise<string> {
  const regions = ['us-west-2', 'eu-west-1', 'ap-southeast-1'];

  // Get current carbon intensity for each region
  const intensities = await Promise.all(
    regions.map(async r => ({
      region: r,
      intensity: await getCarbonIntensity(r)
    }))
  );

  // Route to lowest carbon region
  const bestRegion = intensities.sort((a, b) => a.intensity - b.intensity)[0];

  return bestRegion.region;
}
```

---

### 8. ML Model Optimization

**Impact**: 15-20% reduction (for AI workloads)
**Effort**: High
**Priority**: Low

**Actions**:
- Use smaller, more efficient models where possible
- Implement model quantization and pruning
- Cache inference results to reduce redundant computations

---

### 9. Carbon Budgets & Governance

**Impact**: Ongoing reduction
**Effort**: Medium
**Priority**: High

**Actions**:
- Set carbon budgets per team/service
- Include carbon metrics in CI/CD pipelines
- Block deployments that exceed carbon thresholds
- Quarterly carbon reviews with leadership

**Implementation**:
```yaml
# .github/workflows/carbon-check.yml
- name: Check carbon budget
  run: |
    CURRENT_CARBON=$(ops/carbon/carbon-cli.ts total --service=$SERVICE)
    BUDGET=5000  # kg CO2e per month

    if [ "$CURRENT_CARBON" -gt "$BUDGET" ]; then
      echo "❌ Carbon budget exceeded: $CURRENT_CARBON kg > $BUDGET kg"
      exit 1
    fi

    echo "✅ Carbon budget OK: $CURRENT_CARBON kg / $BUDGET kg"
```

---

## 📊 Monitoring & Reporting

### Key Metrics to Track

1. **Total Carbon Emissions** (kg CO₂e/month)
2. **Carbon Intensity** (gCO₂e per request)
3. **Energy Consumption** (kWh/month)
4. **Carbon Efficiency Trend** (% reduction month-over-month)
5. **Renewable Energy Percentage**

### Dashboards

- **Grafana**: `/dashboards/carbon-footprint`
- **FinOps**: Combined cost + carbon view

### Reports

- **Monthly Carbon Report**: Generated automatically on 1st of each month
- **Quarterly Sustainability Report**: Shared with leadership
- **Annual ESG Disclosure**: For compliance and stakeholder reporting

---

## 🎓 Resources

### Tools

- [Cloud Carbon Footprint](https://www.cloudcarbonfootprint.org/)
- [Carbon Aware SDK](https://github.com/Green-Software-Foundation/carbon-aware-sdk)
- [Electricity Maps](https://app.electricitymaps.com/)
- [Green Software Foundation](https://greensoftware.foundation/)

### Standards & Frameworks

- [GHG Protocol](https://ghgprotocol.org/)
- [Science Based Targets](https://sciencebasedtargets.org/)
- [ISO 14064](https://www.iso.org/iso-14064-greenhouse-gases.html)

### Training

- Green Software Foundation: Principles of Green Software Engineering
- Linux Foundation: Green Software for Practitioners (LFC131)

---

## ✅ Implementation Checklist

### Phase 1 (Weeks 1-4)
- [ ] Enable auto-scaling for all services
- [ ] Migrate high-traffic workloads to low-carbon regions
- [ ] Right-size over-provisioned instances
- [ ] Set up carbon monitoring dashboard

### Phase 2 (Weeks 5-8)
- [ ] Implement time-shifted batch processing
- [ ] Deploy storage lifecycle policies
- [ ] Establish carbon budgets per team
- [ ] Train teams on carbon-aware practices

### Phase 3 (Weeks 9-12)
- [ ] Build carbon-aware routing logic
- [ ] Purchase renewable energy credits
- [ ] Integrate carbon checks in CI/CD
- [ ] Publish first sustainability report

---

## 📞 Support

For questions or support implementing these recommendations:

- **Slack**: `#ops-sustainability`
- **Email**: sustainability@teei.example.com
- **Docs**: [Carbon Reduction Guide](https://docs.teei.example.com/carbon)

---

**Last Updated**: 2025-11-15
**Owner**: SRE Team / Sustainability Working Group
**Review Cadence**: Quarterly
