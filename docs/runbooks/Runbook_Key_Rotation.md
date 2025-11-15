# Runbook: Quarterly Credential & Key Rotation

**Document ID**: RB-GA-003
**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Owner**: Security Engineering Team
**Severity**: HIGH
**Rotation Frequency**: Quarterly (every 90 days)

---

## 📋 Overview

This runbook provides step-by-step procedures for rotating all cryptographic keys, API credentials, database passwords, and service certificates across the TEEI CSR Platform infrastructure. Regular rotation reduces the blast radius of credential compromise and meets compliance requirements (SOC 2, ISO 27001, GDPR).

### Rotation Schedule

| Credential Type | Rotation Frequency | Automation Status | Lead Time |
|----------------|-------------------|-------------------|-----------|
| **Database passwords** | 90 days | Semi-automated | 24 hours |
| **API keys (external)** | 90 days | Manual | 48 hours |
| **JWT signing keys** | 90 days | Automated | N/A |
| **TLS certificates** | 365 days (or 30 days before expiry) | Automated (cert-manager) | N/A |
| **Encryption keys (KMS)** | 365 days | Automated (AWS KMS rotation) | N/A |
| **Service account tokens** | 90 days | Semi-automated | 24 hours |
| **SSH keys** | 180 days | Manual | 7 days |
| **SOPS age keys** | 180 days | Manual | 7 days |

---

## 🔐 Credential Inventory

### 1. Database Credentials

**PostgreSQL**:
- **Master password**: `teei-prod-db-{region}` RDS instance
- **Application user**: `app_user` (used by services)
- **Replication user**: `replicator` (for standby sync)
- **Backup user**: `backup_user` (for pg_dump/restore)

**ClickHouse**:
- **Admin user**: `admin`
- **Query user**: `analytics_reader`
- **Insert user**: `analytics_writer`

**Redis** (if applicable):
- **AUTH password**: Redis instance auth token

---

### 2. External API Keys

| Service | Key Type | Usage | Rotation Owner |
|---------|----------|-------|----------------|
| **OpenAI/Anthropic** | API Key | Gen-AI report generation | AI/ML Team |
| **SendGrid** | API Key | Email notifications | Platform Team |
| **Stripe** | Secret Key | Payment processing | Finance Team |
| **Datadog** | API + App Key | Monitoring/logs | SRE Team |
| **PagerDuty** | Integration Key | Incident alerts | SRE Team |
| **GitHub** | PAT (Personal Access Token) | CI/CD, deployments | DevOps Team |
| **Slack** | OAuth Token | Notifications | Platform Team |

---

### 3. Internal Service Credentials

**Kubernetes Service Accounts**:
- `argocd-server`
- `cert-manager`
- `external-secrets-operator`
- `prometheus-operator`
- `istio-ingressgateway`

**NATS Credentials**:
- System account: `SYS`
- Platform account: `PLATFORM`
- Analytics account: `ANALYTICS`

**JWT Signing Keys**:
- `jwt-signing-key-v{N}` (used for user session tokens)
- `api-token-signing-key-v{N}` (used for API authentication)

---

### 4. Encryption Keys

**AWS KMS Keys**:
- `alias/teei-prod-db-encryption` (RDS encryption)
- `alias/teei-prod-s3-encryption` (S3 bucket encryption)
- `alias/teei-prod-secrets` (Secrets Manager encryption)
- `alias/teei-prod-backup` (Backup encryption)

**SOPS Age Keys**:
- `.sops.yaml` (git repository encryption)
- Age public/private keypair (stored in 1Password)

---

## 🔄 Rotation Procedures

### Database Password Rotation

**Target**: PostgreSQL RDS instances (`teei-prod-db-us-east-1`, `teei-prod-db-eu-central-1`)

#### Step 1: Generate New Passwords

```bash
# Generate strong random passwords (32 characters, alphanumeric + symbols)
NEW_APP_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
NEW_REPLICATOR_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
NEW_BACKUP_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

echo "Generated new passwords (DO NOT log these in plaintext)"
```

#### Step 2: Update RDS Master Password (Optional, high-risk)

**Note**: Master password rotation causes brief connection disruptions. Schedule during maintenance window.

```bash
# Update master password via AWS CLI
aws rds modify-db-instance \
  --db-instance-identifier teei-prod-db-us-east-1 \
  --master-user-password "$NEW_MASTER_PASSWORD" \
  --apply-immediately \
  --region us-east-1

# Monitor modification progress
aws rds describe-db-instances \
  --db-instance-identifier teei-prod-db-us-east-1 \
  --region us-east-1 \
  --query 'DBInstances[0].DBInstanceStatus'

# Expected: "available" (after ~5 minutes)
```

#### Step 3: Rotate Application User Password

**Connect to database and update password**:
```sql
-- Connect as master user
psql -h teei-prod-db-us-east-1.xxxxx.us-east-1.rds.amazonaws.com -U postgres -d teei_prod

-- Rotate app_user password
ALTER USER app_user WITH PASSWORD 'NEW_APP_PASSWORD_HERE';

-- Verify
\du app_user
-- Expected: Role attributes updated
```

#### Step 4: Update Kubernetes Secrets

**Store new password in Kubernetes secret**:
```bash
# US-EAST-1
kubectl create secret generic postgres-credentials \
  --from-literal=username=app_user \
  --from-literal=password="$NEW_APP_PASSWORD" \
  --from-literal=host=teei-prod-db-us-east-1.xxxxx.us-east-1.rds.amazonaws.com \
  --from-literal=database=teei_prod \
  --namespace=teei-platform \
  --dry-run=client -o yaml | kubectl apply -f -

# EU-CENTRAL-1
kubectl create secret generic postgres-credentials \
  --from-literal=username=app_user \
  --from-literal=password="$NEW_APP_PASSWORD" \
  --from-literal=host=teei-prod-db-eu-central-1.xxxxx.eu-central-1.rds.amazonaws.com \
  --from-literal=database=teei_prod \
  --namespace=teei-platform \
  --dry-run=client -o yaml | kubectl apply -f - \
  --context teei-prod-eu-central-1
```

#### Step 5: Rolling Restart Services

**Restart pods to pick up new credentials**:
```bash
# Restart platform services (rolling update, zero downtime)
kubectl rollout restart deployment platform -n teei-platform
kubectl rollout restart deployment reporting -n teei-platform
kubectl rollout restart deployment analytics -n teei-platform

# Monitor rollout
kubectl rollout status deployment platform -n teei-platform
# Expected: "deployment "platform" successfully rolled out"

# Verify connectivity
kubectl logs -n teei-platform deployment/platform --tail=50 | grep -i "database"
# Expected: "Database connection established"
```

#### Step 6: Update AWS Secrets Manager

**Store backup copy in Secrets Manager**:
```bash
# Store new password
aws secretsmanager update-secret \
  --secret-id teei/prod/postgres/app-user \
  --secret-string "{\"username\":\"app_user\",\"password\":\"$NEW_APP_PASSWORD\"}" \
  --region us-east-1

# Verify storage
aws secretsmanager get-secret-value \
  --secret-id teei/prod/postgres/app-user \
  --region us-east-1 \
  --query 'SecretString' \
  --output text | jq .
```

#### Step 7: Test Database Access

```bash
# Test from pod
kubectl exec -n teei-platform deployment/platform -- \
  psql "postgresql://app_user:$NEW_APP_PASSWORD@teei-prod-db-us-east-1.xxxxx.us-east-1.rds.amazonaws.com/teei_prod" \
  -c "SELECT NOW();"

# Expected: Current timestamp returned
```

#### Step 8: Document Rotation

```bash
# Update rotation log
cat >> /var/log/credential-rotation.log <<EOF
---
Date: $(date -Iseconds)
Credential: PostgreSQL app_user password
Regions: us-east-1, eu-central-1
Rotated By: $(whoami)
Status: SUCCESS
Next Rotation Due: $(date -d "+90 days" -Iseconds)
EOF
```

---

### External API Key Rotation

#### OpenAI/Anthropic API Keys

**Step 1: Generate new key in provider console**:
1. Log into OpenAI dashboard (https://platform.openai.com/api-keys)
2. Create new secret key: `teei-prod-genai-{YYYYMMDD}`
3. Copy key to clipboard (only shown once)

**Step 2: Update Kubernetes secret**:
```bash
# Update secret
kubectl create secret generic genai-api-keys \
  --from-literal=openai-api-key="$NEW_OPENAI_KEY" \
  --from-literal=anthropic-api-key="$NEW_ANTHROPIC_KEY" \
  --namespace=teei-platform \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart reporting service
kubectl rollout restart deployment reporting -n teei-platform
```

**Step 3: Test API connectivity**:
```bash
# Test from reporting pod
kubectl exec -n teei-platform deployment/reporting -- \
  curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $NEW_OPENAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"test"}],"max_tokens":5}'

# Expected: Valid JSON response with completion
```

**Step 4: Revoke old key**:
1. Return to OpenAI dashboard
2. Delete old key: `teei-prod-genai-{OLD_DATE}`
3. Monitor for errors in logs (should be none)

**Step 5: Update cost tracking**:
```bash
# Update cost allocation tags
aws resourcegroupstaggingapi tag-resources \
  --resource-arn-list arn:aws:secretsmanager:us-east-1:123456789012:secret:teei/prod/genai-api-keys \
  --tags Key=RotatedDate,Value=$(date -Iseconds)
```

---

### JWT Signing Key Rotation

**Automated via key rotation service** (zero-downtime):

#### Step 1: Generate new key pair

```bash
# Generate new RSA key pair (4096-bit)
openssl genrsa -out jwt-signing-key-v$(date +%Y%m).private.pem 4096
openssl rsa -in jwt-signing-key-v$(date +%Y%m).private.pem -pubout -out jwt-signing-key-v$(date +%Y%m).public.pem

# Verify key pair
openssl rsa -in jwt-signing-key-v$(date +%Y%m).private.pem -check
# Expected: "RSA key ok"
```

#### Step 2: Store in Kubernetes secret

```bash
# Create secret with versioned key
kubectl create secret generic jwt-signing-keys \
  --from-file=current-private=jwt-signing-key-v$(date +%Y%m).private.pem \
  --from-file=current-public=jwt-signing-key-v$(date +%Y%m).public.pem \
  --from-file=previous-private=jwt-signing-key-v$(date -d "last month" +%Y%m).private.pem \
  --from-file=previous-public=jwt-signing-key-v$(date -d "last month" +%Y%m).public.pem \
  --namespace=teei-platform \
  --dry-run=client -o yaml | kubectl apply -f -
```

**Note**: Keep previous key for 30 days to allow token verification during transition.

#### Step 3: Rolling restart auth service

```bash
# Restart authentication service
kubectl rollout restart deployment auth-service -n teei-platform

# Monitor logs for key loading
kubectl logs -n teei-platform deployment/auth-service --tail=50 | grep "JWT"
# Expected: "JWT signing key loaded: v202511"
```

#### Step 4: Test token generation

```bash
# Generate test token
curl -X POST https://platform.teei.io/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"test-user","password":"test-pass"}'

# Verify token signature
# (Use jwt.io or similar tool to decode and verify)
```

#### Step 5: Schedule old key deletion

```bash
# Set reminder to delete old key in 30 days
echo "kubectl delete secret jwt-signing-keys-v$(date -d "last month" +%Y%m) -n teei-platform" | at now + 30 days
```

---

### TLS Certificate Rotation

**Automated via cert-manager** (renews 30 days before expiry):

#### Verify cert-manager is running

```bash
kubectl get pods -n cert-manager
# Expected: All pods in Running state

kubectl get certificates -A
# Expected: All certificates "Ready=True"
```

#### Manual renewal (if needed)

```bash
# Force renewal of specific certificate
kubectl cert-manager renew \
  --namespace=teei-platform \
  platform-tls-cert

# Monitor renewal
kubectl describe certificate platform-tls-cert -n teei-platform
# Check "Events" section for renewal activity
```

#### Verify new certificate

```bash
# Check certificate expiry
echo | openssl s_client -connect platform.teei.io:443 2>/dev/null | openssl x509 -noout -dates
# Expected: notAfter date ~90 days in future
```

---

### AWS KMS Key Rotation

**Automated annual rotation**:

```bash
# Verify automatic rotation is enabled
aws kms get-key-rotation-status \
  --key-id alias/teei-prod-db-encryption \
  --region us-east-1

# Expected output:
# {
#   "KeyRotationEnabled": true
# }

# Check rotation history
aws kms list-key-rotations \
  --key-id alias/teei-prod-db-encryption \
  --region us-east-1

# Expected: List of previous rotations (automatically managed by AWS)
```

**Enable rotation if disabled**:
```bash
aws kms enable-key-rotation \
  --key-id alias/teei-prod-db-encryption \
  --region us-east-1
```

**Note**: AWS automatically rotates key material yearly. Old keys are retained for decryption.

---

### SOPS Age Key Rotation

**For encrypted secrets in git repositories**:

#### Step 1: Generate new age keypair

```bash
# Generate new keypair
age-keygen -o ~/.config/sops/age/keys-$(date +%Y%m).txt

# Expected output:
# Public key: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Store in 1Password
op item create --category="Secure Note" \
  --title="SOPS Age Key $(date +%Y-%m)" \
  --vault="Infrastructure" \
  "age-private-key=$(cat ~/.config/sops/age/keys-$(date +%Y%m).txt)" \
  "age-public-key=$(age-keygen -y ~/.config/sops/age/keys-$(date +%Y%m).txt)"
```

#### Step 2: Update .sops.yaml

```yaml
# .sops.yaml
creation_rules:
  - path_regex: \.enc\.yaml$
    age: >-
      age1NEW_PUBLIC_KEY_HERE,
      age1OLD_PUBLIC_KEY_HERE  # Keep for 30 days
```

#### Step 3: Re-encrypt all secrets

```bash
# Find all SOPS-encrypted files
find . -name "*.enc.yaml" -type f > /tmp/sops-files.txt

# Re-encrypt with new key
while read -r file; do
  echo "Re-encrypting: $file"
  sops updatekeys -y "$file"
done < /tmp/sops-files.txt
```

#### Step 4: Commit and push

```bash
git add .sops.yaml **/*.enc.yaml
git commit -m "chore(security): Rotate SOPS age keys (quarterly rotation)"
git push origin main
```

#### Step 5: Update CI/CD secrets

```bash
# Update GitHub Actions secret
gh secret set SOPS_AGE_KEY --body "$(cat ~/.config/sops/age/keys-$(date +%Y%m).txt)"

# Update ArgoCD secret
kubectl create secret generic sops-age-key \
  --from-file=keys.txt=~/.config/sops/age/keys-$(date +%Y%m).txt \
  --namespace=argocd \
  --dry-run=client -o yaml | kubectl apply -f -
```

#### Step 6: Remove old key (after 30 days)

```bash
# Edit .sops.yaml to remove old public key
# Re-encrypt all files again
# Delete old private key from 1Password
```

---

## 🚨 Emergency Credential Rotation

**If credential compromise is suspected**:

### Immediate Actions (< 15 minutes)

1. **Revoke compromised credential immediately**:
   ```bash
   # Example: Revoke API key
   curl -X DELETE https://api.provider.com/keys/{compromised-key-id} \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

2. **Generate and deploy new credential** (follow standard rotation procedure, skip delays)

3. **Audit recent usage**:
   ```sql
   -- Check audit logs for suspicious activity
   SELECT * FROM audit_logs
   WHERE credential_id = 'compromised-key-id'
     AND timestamp > NOW() - INTERVAL '7 days'
   ORDER BY timestamp DESC;
   ```

4. **Notify security team**:
   ```bash
   # Create PagerDuty incident
   curl -X POST https://events.pagerduty.com/v2/enqueue \
     -H 'Content-Type: application/json' \
     -d '{
       "routing_key": "'$PAGERDUTY_SECURITY_KEY'",
       "event_action": "trigger",
       "payload": {
         "summary": "Credential compromise detected - emergency rotation initiated",
         "severity": "critical",
         "source": "security-team"
       }
     }'
   ```

5. **Document incident**:
   ```bash
   # Create incident report
   cat > /tmp/incident-$(date +%Y%m%d-%H%M).md <<EOF
   # Security Incident: Credential Compromise

   **Date**: $(date -Iseconds)
   **Credential**: [REDACTED - type only]
   **Scope**: [Affected services]
   **Rotation Status**: In progress
   **Estimated Impact**: [TBD]

   ## Timeline
   - $(date -Iseconds): Compromise detected
   - $(date -Iseconds): Credential revoked
   - [TBD]: Rotation completed

   ## Next Steps
   - Complete rotation
   - Audit trail analysis
   - Post-incident review
   EOF
   ```

---

## 📊 Rotation Tracking

### Rotation Log

**Maintain rotation log** in `/var/log/credential-rotation.log`:

```bash
# Sample log entry
---
Date: 2025-11-15T10:00:00Z
Credential: PostgreSQL app_user password
Regions: us-east-1, eu-central-1
Rotated By: sre-team
Status: SUCCESS
Next Rotation Due: 2026-02-15T10:00:00Z
Notes: Quarterly rotation, no issues
---
```

### Upcoming Rotations Dashboard

**Prometheus metrics**:
```yaml
# /etc/prometheus/rotation-metrics.yaml
- name: credential_rotation_status
  help: Days until next credential rotation
  type: gauge
  labels:
    credential_type: [db_password, api_key, jwt_key, tls_cert]
    region: [us-east-1, eu-central-1]
  expr: |
    (credential_next_rotation_timestamp - time()) / 86400
```

**Grafana dashboard panels**:
- Credentials expiring in < 7 days (RED alert)
- Credentials expiring in < 30 days (YELLOW warning)
- Last rotation date (audit trail)

---

## ✅ Post-Rotation Checklist

After completing rotation:

- [ ] All services restarted and healthy
- [ ] Database connectivity verified
- [ ] API endpoints responding with new credentials
- [ ] No authentication errors in logs (check for 5 minutes)
- [ ] Monitoring dashboards showing normal metrics
- [ ] Old credentials revoked/deleted
- [ ] New credentials stored in Secrets Manager/1Password
- [ ] Rotation log updated
- [ ] Next rotation scheduled (calendar reminder)
- [ ] Team notified in #platform-security channel

---

## 📚 Related Documentation

- [Security Hardening Checklist](/docs/Security_Hardening_Checklist.md)
- [SIEM & SOC2 Compliance](/docs/SIEM_SOC2.md)
- [mTLS Service Mesh](/docs/mTLS_Service_Mesh.md)
- [Incident Response Runbook](/docs/runbooks/Runbook_Incident_Escalation.md)

---

## 📞 Escalation Contacts

| Role | Contact | Scope |
|------|---------|-------|
| **Security Lead** | Slack: @security-lead | Rotation issues |
| **On-Call SRE** | PagerDuty: `platform-oncall` | Service disruptions |
| **CISO** | Slack: @ciso | Compromise incidents |

---

**Document History**:
- **v1.0.0** (2025-11-15): Initial quarterly rotation runbook
