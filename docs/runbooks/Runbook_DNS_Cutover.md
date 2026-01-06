# DNS Cutover Runbook

**Version**: 1.0
**Last Updated**: 2025-11-15
**RTO Target**: < 2 minutes
**Propagation Time**: 1-5 minutes (TTL dependent)
**Owner**: Network Operations / dr-gameday-lead
**Escalation**: Infrastructure Lead, CTO

---

## Overview

This runbook details the DNS cutover procedure for regional failover. It covers updating Route53 DNS records to point to the secondary region (EU) and verifying global propagation.

**Scope**:
- Route53 hosted zones
- Cloudflare CDN/WAF configuration
- Health check updates
- SSL/TLS certificate validation

**Related Runbooks**:
- Parent: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Region_Failover.md`
- DNS/WAF Guide: `/home/user/TEEI-CSR-Platform/docs/DNS_WAF_Traffic.md`

---

## Pre-Cutover Assessment

### 1. Verify Target Region Health

**Check EU Load Balancer Status:**
```bash
# Get ALB DNS name
EU_ALB=$(aws elbv2 describe-load-balancers \
  --region eu-central-1 \
  --query "LoadBalancers[?LoadBalancerName=='teei-prod-eu-alb'].DNSName" \
  --output text)

echo "EU ALB: $EU_ALB"

# Test ALB health endpoint
curl -I "https://${EU_ALB}/health"
# Expected: HTTP/2 200
```

**Check Target Group Health:**
```bash
# Get target group ARN
TG_ARN=$(aws elbv2 describe-target-groups \
  --region eu-central-1 \
  --query "TargetGroups[?TargetGroupName=='teei-prod-eu-tg'].TargetGroupArn" \
  --output text)

# Check target health
aws elbv2 describe-target-health \
  --region eu-central-1 \
  --target-group-arn "$TG_ARN"
# Expected: All targets "healthy"
```

---

### 2. Capture Current DNS Configuration

**Save Existing Records:**
```bash
# Export current Route53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id Z1234EXAMPLE \
  --output json > /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/dns-before-cutover.json

# Capture key A records
dig +short api.teei.example.com > /tmp/dns-before-api.txt
dig +short cockpit.teei.example.com > /tmp/dns-before-cockpit.txt
dig +short *.teei.example.com > /tmp/dns-before-wildcard.txt
```

**Verify Current TTL Values:**
```bash
dig +noall +answer api.teei.example.com | awk '{print $2}'
# Expected: 300 (5 minutes) or lower for faster cutover
```

---

### 3. Pre-Lower TTL (Recommended for Planned Failovers)

**Note**: For emergency failovers, skip this step. For planned maintenance, execute 24 hours before cutover.

```bash
# Reduce TTL to 60 seconds
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234EXAMPLE \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.teei.example.com",
          "Type": "A",
          "TTL": 60,
          "ResourceRecords": [{"Value": "52.1.2.3"}]
        }
      }
    ]
  }'

# Wait 24 hours for old TTL to expire before cutover
```

---

## DNS Cutover Procedure

### Phase 1: Update Route53 A Records (Target: 30 seconds)

**1.1 Prepare Change Batch File**

Create `/home/user/TEEI-CSR-Platform/scripts/gameday/dns-cutover-eu.json`:
```json
{
  "Comment": "DR Failover to EU-CENTRAL-1 - $(date -Iseconds)",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.teei.example.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [
          {"Value": "52.58.10.20"}
        ]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "cockpit.teei.example.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [
          {"Value": "52.58.10.20"}
        ]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "*.teei.example.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [
          {"Value": "52.58.10.20"}
        ]
      }
    }
  ]
}
```

**1.2 Execute DNS Update**
```bash
# Apply changes
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234EXAMPLE \
  --change-batch file:///home/user/TEEI-CSR-Platform/scripts/gameday/dns-cutover-eu.json \
  --output json > /tmp/dns-change-id.json

# Capture change ID
CHANGE_ID=$(jq -r '.ChangeInfo.Id' /tmp/dns-change-id.json)
echo "Change ID: $CHANGE_ID"
```

**1.3 Monitor Change Status**
```bash
# Wait for change to propagate
aws route53 get-change --id "$CHANGE_ID" --query 'ChangeInfo.Status'
# Expected: "INSYNC" (usually < 60 seconds)
```

---

### Phase 2: Update Health Checks (Target: 20 seconds)

**2.1 Update Route53 Health Check Endpoint**
```bash
# Get health check ID
HC_ID=$(aws route53 list-health-checks \
  --query "HealthChecks[?HealthCheckConfig.FullyQualifiedDomainName=='api.teei.example.com'].Id" \
  --output text)

# Update health check to monitor EU endpoint
aws route53 update-health-check \
  --health-check-id "$HC_ID" \
  --ip-address "52.58.10.20" \
  --port 443 \
  --resource-path "/health"

# Verify health check status
aws route53 get-health-check-status --health-check-id "$HC_ID"
# Expected: Status = "Healthy"
```

---

### Phase 3: Update Cloudflare Configuration (Target: 30 seconds)

**3.1 Update Cloudflare Origin Server**
```bash
# Get zone ID
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=teei.example.com" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.result[0].id')

# Get DNS record ID for api.teei.example.com
RECORD_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=api.teei.example.com" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" | jq -r '.result[0].id')

# Update A record to EU ALB
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "api.teei.example.com",
    "content": "52.58.10.20",
    "ttl": 60,
    "proxied": true
  }'
```

**3.2 Update WAF Rules (If Region-Specific)**
```bash
# Update WAF custom rules to allow EU origin
curl -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/firewall/rules/${RULE_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "filter": {
      "expression": "(ip.src.country ne \"US\" and ip.src.country ne \"EU\")"
    },
    "action": "block"
  }'
```

---

### Phase 4: Verify DNS Propagation (Target: 2-5 minutes)

**4.1 Check DNS Resolution from Multiple Locations**
```bash
# Query from local resolver
dig +short api.teei.example.com
# Expected: 52.58.10.20 (EU ALB IP)

# Query Google's public DNS
dig @8.8.8.8 +short api.teei.example.com

# Query Cloudflare's public DNS
dig @1.1.1.1 +short api.teei.example.com

# Query from different regions using AWS Route53 Resolver
for REGION in us-east-1 eu-west-1 ap-southeast-1; do
  echo "Checking from $REGION:"
  aws route53resolver list-resolver-endpoints --region $REGION --query 'ResolverEndpoints[0].IpAddresses[0].Ip' --output text
done
```

**4.2 Test HTTP/HTTPS Connectivity**
```bash
# Test API endpoint
curl -I https://api.teei.example.com/health
# Expected: HTTP/2 200 (from EU region)

# Verify response headers include EU region indicator
curl -s https://api.teei.example.com/health | jq -r '.region'
# Expected: "eu-central-1"
```

**4.3 Verify SSL/TLS Certificate**
```bash
# Check certificate validity
openssl s_client -connect api.teei.example.com:443 -servername api.teei.example.com < /dev/null 2>/dev/null | openssl x509 -noout -text | grep -A 2 "Subject Alternative Name"
# Expected: Certificate includes api.teei.example.com (wildcard or SAN)
```

---

### Phase 5: Global Propagation Verification (Target: 3 minutes)

**5.1 Use DNS Propagation Checker**
```bash
# Check propagation from multiple global locations
/home/user/TEEI-CSR-Platform/scripts/gameday/check-dns-propagation.sh api.teei.example.com 52.58.10.20
```

**Example Output**:
```
Location          | IP Address    | Status
------------------|---------------|--------
US-East (VA)      | 52.58.10.20   | ✓ OK
US-West (CA)      | 52.58.10.20   | ✓ OK
EU-West (Ireland) | 52.58.10.20   | ✓ OK
Asia-Pacific      | 52.1.2.3      | ✗ STALE (old TTL)
```

**5.2 Wait for Full Propagation**
```bash
# Continuously monitor until 100% propagation
while true; do
  STALE_COUNT=$(/home/user/TEEI-CSR-Platform/scripts/gameday/check-dns-propagation.sh api.teei.example.com 52.58.10.20 | grep "STALE" | wc -l)
  if [ "$STALE_COUNT" -eq 0 ]; then
    echo "DNS fully propagated!"
    break
  fi
  echo "Waiting for propagation... ($STALE_COUNT locations still stale)"
  sleep 30
done
```

---

### Phase 6: Evidence Collection (Target: 15 seconds)

**6.1 Capture Post-Cutover DNS State**
```bash
# Export updated Route53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id Z1234EXAMPLE \
  --output json > /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/dns-after-cutover.json

# Save DNS resolution proof
dig +short api.teei.example.com > /tmp/dns-after-api.txt
dig +short cockpit.teei.example.com > /tmp/dns-after-cockpit.txt

# Copy evidence to archive
cp /tmp/dns-*.txt /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/
```

**6.2 Calculate Cutover Duration**
```bash
# Compare timestamps
DNS_START=$(jq -r '.ChangeInfo.SubmittedAt' /tmp/dns-change-id.json)
DNS_END=$(date -Iseconds)

echo "DNS cutover started: $DNS_START"
echo "DNS cutover completed: $DNS_END"
# Calculate duration (should be < 5 minutes including propagation)
```

---

## Post-Cutover Validation

### Critical Checks

**1. Verify All Subdomains Resolved**
```bash
# Test all critical subdomains
for SUBDOMAIN in api cockpit admin webhooks; do
  IP=$(dig +short ${SUBDOMAIN}.teei.example.com | head -1)
  echo "${SUBDOMAIN}.teei.example.com -> $IP"
  if [ "$IP" != "52.58.10.20" ]; then
    echo "⚠️  WARNING: $SUBDOMAIN not pointing to EU ALB!"
  fi
done
```

**2. Check User-Facing Services**
```bash
# Test login flow
curl -I https://cockpit.teei.example.com/login
# Expected: HTTP/2 200

# Test API authentication
curl -H "Authorization: Bearer ${TEST_TOKEN}" https://api.teei.example.com/v1/profile
# Expected: HTTP/2 200 with user data
```

**3. Monitor Error Rates During Cutover**
```bash
# Check Cloudflare Analytics for 5xx errors
curl "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/analytics/dashboard?since=-10&until=now" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" | jq '.result.totals.requests.http_status."5xx"'
# Expected: < 0.1% error rate
```

**4. Verify CDN Cache Behavior**
```bash
# Check cache status
curl -I https://api.teei.example.com/health | grep -i "cf-cache-status"
# Expected: cf-cache-status: MISS (first request after cutover)

# Second request should hit cache
curl -I https://api.teei.example.com/health | grep -i "cf-cache-status"
# Expected: cf-cache-status: HIT
```

---

## Rollback Procedure (Revert DNS to US)

**When to Rollback**:
- EU region health checks failing
- Elevated error rates (> 1%)
- Database issues in EU
- Customer-impacting bugs discovered

**Rollback Steps**:

**1. Prepare Rollback Change Batch**
```bash
# Use original DNS records saved in evidence directory
cp /home/user/TEEI-CSR-Platform/ops/gameday/evidence/*/dns-before-cutover.json /tmp/dns-rollback.json
```

**2. Execute DNS Rollback**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234EXAMPLE \
  --change-batch file:///tmp/dns-rollback.json
```

**3. Verify Rollback**
```bash
dig +short api.teei.example.com
# Expected: US ALB IP (52.1.2.3)
```

**Detailed Procedure**: See `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Rollback.md`

---

## Troubleshooting

### Issue: DNS Not Propagating After 10 Minutes

**Root Cause**: Client-side DNS caching or ISP resolver caching old TTL.

**Diagnosis**:
```bash
# Check authoritative nameservers
dig +trace api.teei.example.com
# Look for NS records and final A record
```

**Solution**:
- **For testing**: Use `dig @8.8.8.8` or `dig @1.1.1.1` to query public resolvers
- **For production**: Wait for TTL expiration (up to 5 minutes with TTL=300)
- **Nuclear option**: Purge Cloudflare cache
  ```bash
  curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -d '{"purge_everything":true}'
  ```

---

### Issue: SSL Certificate Mismatch After Cutover

**Root Cause**: EU ALB using different certificate than US ALB.

**Diagnosis**:
```bash
openssl s_client -connect api.teei.example.com:443 -servername api.teei.example.com < /dev/null 2>&1 | grep "Verify return code"
# Expected: Verify return code: 0 (ok)
# Actual: Verify return code: 21 (certificate validation failed)
```

**Solution**:
```bash
# Import US certificate to EU ALB
aws acm import-certificate \
  --region eu-central-1 \
  --certificate fileb:///path/to/cert.pem \
  --private-key fileb:///path/to/private-key.pem \
  --certificate-chain fileb:///path/to/chain.pem

# Update ALB listener to use imported certificate
aws elbv2 modify-listener \
  --region eu-central-1 \
  --listener-arn arn:aws:elasticloadbalancing:eu-central-1:123456789:listener/... \
  --certificates CertificateArn=arn:aws:acm:eu-central-1:123456789:certificate/...
```

---

### Issue: Cloudflare Shows "Error 521: Web Server is Down"

**Root Cause**: Cloudflare cannot connect to EU origin server.

**Diagnosis**:
```bash
# Test origin health directly (bypass Cloudflare)
curl -I -H "Host: api.teei.example.com" https://52.58.10.20/health
```

**Solution**:
- **If origin is healthy**: Update Cloudflare SSL/TLS mode to "Full (strict)"
- **If origin is down**: Rollback DNS to US region immediately

---

## Compliance & Audit

**SOC2 CC9.1 Requirements**:
- [x] RTO < 5 minutes (DNS component: < 2 minutes + propagation)
- [x] Evidence of DNS records before/after cutover
- [x] DNS propagation verification from multiple locations
- [x] SSL/TLS certificate validation

**Evidence Artifacts**:
- Pre-cutover DNS records (JSON export)
- Post-cutover DNS records (JSON export)
- DNS propagation report (global locations)
- Route53 change ID and timestamp
- Cutover duration calculation

**Storage**: `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/dns/cutover-$(date +%Y%m%d-%H%M%S)/`

---

## Appendix A: DNS Records Inventory

**Production DNS Records (teei.example.com hosted zone):**

| Record Name | Type | TTL | Current Value (US) | Failover Value (EU) |
|-------------|------|-----|--------------------|---------------------|
| api.teei.example.com | A | 300 | 52.1.2.3 | 52.58.10.20 |
| cockpit.teei.example.com | A | 300 | 52.1.2.3 | 52.58.10.20 |
| admin.teei.example.com | A | 300 | 52.1.2.3 | 52.58.10.20 |
| webhooks.teei.example.com | A | 300 | 52.1.2.3 | 52.58.10.20 |
| *.teei.example.com | A | 300 | 52.1.2.3 | 52.58.10.20 |
| teei.example.com | A | 300 | 52.1.2.3 | 52.58.10.20 |

**Note**: All subdomains use same ALB for simplicity. Adjust if services use dedicated load balancers.

---

## Appendix B: DNS Propagation Monitoring Script

Create `/home/user/TEEI-CSR-Platform/scripts/gameday/check-dns-propagation.sh`:
```bash
#!/bin/bash
DOMAIN=$1
EXPECTED_IP=$2

DNS_SERVERS=(
  "8.8.8.8:US-Google"
  "1.1.1.1:Global-Cloudflare"
  "208.67.222.222:US-OpenDNS"
  "9.9.9.9:Global-Quad9"
)

echo "Location | IP Address | Status"
echo "---------|------------|-------"

for SERVER in "${DNS_SERVERS[@]}"; do
  IFS=':' read -r IP LOCATION <<< "$SERVER"
  RESOLVED_IP=$(dig @$IP +short $DOMAIN | head -1)

  if [ "$RESOLVED_IP" == "$EXPECTED_IP" ]; then
    echo "$LOCATION | $RESOLVED_IP | ✓ OK"
  else
    echo "$LOCATION | $RESOLVED_IP | ✗ STALE"
  fi
done
```

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | dr-gameday-lead | Initial creation for Phase G |

**Next Review**: 2026-02-15
