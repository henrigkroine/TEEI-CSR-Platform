# Secrets Rotation Runbook

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Owner**: Worker 1 Team 5 (Supply Chain Security)
**Ref**: Phase J - J5.3 Secrets Rotation Playbooks

---

## Table of Contents

1. [Overview](#overview)
2. [Rotation Policy](#rotation-policy)
3. [Automated Rotation Procedures](#automated-rotation-procedures)
4. [Manual Emergency Rotation](#manual-emergency-rotation)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Compliance Mapping](#compliance-mapping)
8. [Appendix](#appendix)

---

## Overview

This runbook provides comprehensive procedures for rotating secrets across the TEEI CSR Platform infrastructure. It covers both automated scheduled rotations and emergency manual rotations.

### Scope

- **HashiCorp Vault**: Database credentials (PostgreSQL, ClickHouse)
- **AWS Secrets Manager**: API keys (Electricity Maps, LLM providers)
- **Kubernetes Secrets**: Service account tokens, TLS certificates

### Key Principles

1. **Zero-Downtime**: All rotations must maintain service availability
2. **Fail-Safe**: Automatic rollback on validation failure
3. **Auditable**: All rotations logged with timestamps and outcomes
4. **Testable**: New credentials validated before promotion
5. **Recoverable**: Previous versions retained for emergency rollback

---

## Rotation Policy

### Policy Statement

**All secrets MUST be rotated every 90 days maximum.**

### Rotation Schedule

| Secret Type | Rotation Frequency | Warning Threshold | Automation Status |
|-------------|-------------------|-------------------|-------------------|
| PostgreSQL passwords | 90 days | 80 days | Automated |
| ClickHouse passwords | 90 days | 80 days | Automated |
| LLM API keys (OpenAI, Anthropic) | 90 days | 80 days | Manual (provider-managed) |
| Electricity Maps API | 90 days | 80 days | Manual (provider-managed) |
| Kubernetes service account tokens | 90 days | 80 days | Automated (Vault injection) |
| TLS certificates | 90 days | 80 days | Automated (cert-manager) |

### Audit Requirements

- **Daily**: Automated audit checks run via cron
- **Weekly**: Security team reviews audit reports
- **Monthly**: Compliance report generated for leadership
- **Quarterly**: Full secrets inventory and policy review

---

## Automated Rotation Procedures

### 3.1 Vault Secrets Rotation (Databases)

#### Prerequisites

- Vault access with appropriate permissions
- Database admin credentials
- Network connectivity to database servers

#### Execution

```bash
# 1. Audit current secrets status
./scripts/infra/secrets-rotation-audit.sh

# 2. Dry run to verify rotation plan
./scripts/infra/rotate-vault-secrets.sh --dry-run

# 3. Execute rotation
./scripts/infra/rotate-vault-secrets.sh

# 4. Verify rotation success
./scripts/infra/secrets-rotation-audit.sh
```

#### Expected Output

```
=== TEEI Secrets Rotation - Starting ===
[INFO] Vault connectivity verified
[INFO] Rotating PostgreSQL credentials for reporting...
[SUCCESS] Database password updated successfully
[SUCCESS] New credentials validated successfully
[SUCCESS] Vault secrets updated successfully
[SUCCESS] Final verification passed - password rotation complete

=== Rotation Summary ===
Total rotations attempted: 6
Successful: 6
Failed: 0
```

#### Verification

```bash
# Test database connectivity with rotated credentials
vault kv get secret/teei/reporting | grep -v password

# Check Kubernetes pods restart with new secrets (if auto-injected)
kubectl get pods -n teei-platform -l app=reporting -w
```

### 3.2 AWS Secrets Manager Rotation

#### Prerequisites

- AWS credentials with SecretsManager permissions
- Access to provider consoles (for manual rotations)

#### Execution

```bash
# 1. Audit AWS secrets
AWS_REGION=us-east-1 ./scripts/infra/secrets-rotation-audit.sh

# 2. Rotate secrets (mix of automatic and manual)
AWS_REGION=us-east-1 ./scripts/infra/rotate-aws-secrets.sh

# 3. Follow manual rotation prompts for provider-managed keys
```

#### Manual Steps for Provider-Managed Keys

**OpenAI API Key:**

1. Navigate to https://platform.openai.com/api-keys
2. Create new secret key with descriptive name: `teei-platform-YYYYMMDD`
3. Copy the new key (only shown once!)
4. Update AWS Secrets Manager:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id teei/openai-api-key \
     --secret-string '{"api_key":"sk-proj-..."}' \
     --region us-east-1
   ```
5. Test new key:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer sk-proj-..." | jq .
   ```
6. Delete old key from OpenAI console after 24-hour grace period

**Anthropic API Key:**

1. Navigate to https://console.anthropic.com/settings/keys
2. Create new key: `teei-platform-YYYYMMDD`
3. Copy the key
4. Update AWS Secrets Manager:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id teei/anthropic-api-key \
     --secret-string '{"api_key":"sk-ant-..."}' \
     --region us-east-1
   ```
5. Test new key:
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: sk-ant-..." \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-haiku-20240307","max_tokens":1024,"messages":[{"role":"user","content":"test"}]}' | jq .
   ```
6. Delete old key from Anthropic console after grace period

**Electricity Maps API:**

1. Navigate to https://app.electricitymaps.com/api-portal
2. Revoke existing token
3. Generate new token
4. Update AWS Secrets Manager:
   ```bash
   aws secretsmanager put-secret-value \
     --secret-id teei/electricity-maps-api-key \
     --secret-string '{"api_key":"YOUR_NEW_TOKEN"}' \
     --region us-east-1
   ```
5. Test:
   ```bash
   curl "https://api-access.electricitymaps.com/free-tier/carbon-intensity/latest?zone=US-CAL-CISO" \
     -H "auth-token: YOUR_NEW_TOKEN" | jq .
   ```

### 3.3 Kubernetes Secrets Update

After rotating secrets in Vault or AWS SM, update Kubernetes secrets:

```bash
# For Vault-injected secrets, restart pods to pick up new values
kubectl rollout restart deployment/reporting -n teei-platform
kubectl rollout restart deployment/analytics -n teei-platform

# For AWS Secrets Manager with External Secrets Operator
# Secrets are updated automatically within 5 minutes
# Or force refresh:
kubectl annotate es teei-external-secrets force-sync="$(date +%s)" -n teei-platform

# Verify secret updates
kubectl get secrets -n teei-platform
kubectl describe secret teei-reporting-postgres -n teei-platform
```

---

## Manual Emergency Rotation

### 4.1 When to Perform Emergency Rotation

Emergency rotation is required when:

- Secret is compromised (leaked in logs, commits, exposed publicly)
- Security incident detected (unauthorized access, breach)
- Employee departure (access revocation required)
- Compliance audit finding (non-compliant secret usage)
- Scheduled rotation automation failure

### 4.2 Emergency PostgreSQL Password Rotation

**Time to Complete**: ~5 minutes
**Risk Level**: Medium (brief connection interruptions possible)

#### Steps

1. **Generate New Credential**

   ```bash
   NEW_PASSWORD=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9!@#$%^&*()-_=+[]{}|;:,.<>?' | head -c 32)
   echo "New password generated (do not log this!)"
   ```

2. **Update Database**

   ```bash
   # Connect with current credentials
   PGPASSWORD="${CURRENT_PASSWORD}" psql -h postgres-service -U teei_reporting -d postgres

   # Rotate password
   ALTER USER teei_reporting PASSWORD '${NEW_PASSWORD}';
   \q
   ```

3. **Update Vault**

   ```bash
   # Get existing secret data
   vault kv get -format=json secret/teei/reporting > /tmp/reporting-secret.json

   # Update password field
   jq --arg pwd "${NEW_PASSWORD}" '.data.data.password = $pwd' /tmp/reporting-secret.json | \
     jq '.data.data' | \
     vault kv put secret/teei/reporting -

   # Verify
   vault kv get secret/teei/reporting
   ```

4. **Update Kubernetes Secret**

   ```bash
   # Create new secret YAML
   kubectl create secret generic teei-reporting-postgres \
     --from-literal=password="${NEW_PASSWORD}" \
     --dry-run=client -o yaml | \
     kubectl apply -f - -n teei-platform
   ```

5. **Restart Service**

   ```bash
   # Restart pods to pick up new credentials
   kubectl rollout restart deployment/reporting -n teei-platform

   # Monitor restart
   kubectl rollout status deployment/reporting -n teei-platform

   # Check logs for connection success
   kubectl logs -l app=reporting -n teei-platform --tail=50 | grep -i "database\|connection"
   ```

6. **Verify Service Health**

   ```bash
   # Check pod status
   kubectl get pods -l app=reporting -n teei-platform

   # Test API endpoint
   curl -X GET https://api.teei-platform.com/reporting/health

   # Check database connectivity
   PGPASSWORD="${NEW_PASSWORD}" psql -h postgres-service -U teei_reporting -d teei_reporting -c "SELECT 1;"
   ```

7. **Document in Incident Log**

   ```bash
   cat >> /var/log/emergency-rotations.log <<EOF
   $(date -Iseconds),reporting,postgresql,emergency,REASON:${ROTATION_REASON},SUCCESS
   EOF
   ```

### 4.3 Emergency LLM API Key Rotation

**Time to Complete**: ~10 minutes
**Risk Level**: Low (graceful failover possible)

#### Steps for OpenAI

1. **Generate New Key** (OpenAI Console)
   - Navigate to https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name: `teei-emergency-rotation-$(date +%Y%m%d)`
   - Copy key immediately (shown once only)

2. **Stage New Key in AWS SM (AWSPENDING)**

   ```bash
   # Get current secret
   CURRENT_SECRET=$(aws secretsmanager get-secret-value \
     --secret-id teei/openai-api-key \
     --query SecretString --output text)

   # Create AWSPENDING version with new key
   NEW_SECRET=$(echo "${CURRENT_SECRET}" | jq --arg key "${NEW_API_KEY}" '.api_key = $key')

   aws secretsmanager put-secret-value \
     --secret-id teei/openai-api-key \
     --secret-string "${NEW_SECRET}" \
     --version-stages AWSPENDING
   ```

3. **Test New Key**

   ```bash
   # Test API call
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer ${NEW_API_KEY}" | jq '.data[0]'

   # If successful, proceed. If failed, investigate before promoting.
   ```

4. **Promote to AWSCURRENT**

   ```bash
   # Get AWSPENDING version ID
   VERSION_ID=$(aws secretsmanager describe-secret \
     --secret-id teei/openai-api-key \
     --query 'VersionIdsToStages' --output json | \
     jq -r 'to_entries[] | select(.value | contains(["AWSPENDING"])) | .key')

   # Promote to AWSCURRENT
   aws secretsmanager update-secret-version-stage \
     --secret-id teei/openai-api-key \
     --version-stage AWSCURRENT \
     --move-to-version-id "${VERSION_ID}"
   ```

5. **Verify Service Pickup**

   ```bash
   # External Secrets Operator refreshes within 5 minutes
   # Force immediate refresh:
   kubectl annotate es teei-external-secrets force-sync="$(date +%s)" -n teei-platform

   # Watch for update
   kubectl get secret teei-openai-api-key -n teei-platform -o yaml | grep -A5 data

   # Check Q2Q service logs for successful API calls
   kubectl logs -l app=q2q-ai -n teei-platform --tail=100 | grep -i openai
   ```

6. **Revoke Old Key**

   ```bash
   # Wait 1 hour for all services to pick up new key
   # Then revoke old key via OpenAI console
   # Monitor error rates - should be zero if rotation successful
   ```

### 4.4 Emergency ClickHouse Password Rotation

Similar to PostgreSQL, with ClickHouse-specific commands:

```bash
# 1. Generate password
NEW_PASSWORD=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9!@#$%^&*()-_=+' | head -c 32)

# 2. Update ClickHouse
clickhouse-client --host=clickhouse-service --user=teei_analytics --password="${CURRENT_PASSWORD}" \
  --query="ALTER USER teei_analytics IDENTIFIED BY '${NEW_PASSWORD}';"

# 3. Test new credentials
clickhouse-client --host=clickhouse-service --user=teei_analytics --password="${NEW_PASSWORD}" \
  --query="SELECT 1;"

# 4. Update Vault (same as PostgreSQL process)
# 5. Update Kubernetes secrets
# 6. Restart affected services
```

---

## Rollback Procedures

### 5.1 Vault Secret Rollback

Vault KV v2 maintains version history. To rollback:

```bash
# 1. List secret versions
vault kv metadata get secret/teei/reporting

# Output shows:
# Version  Destroyed  Created Time
# -------  ---------  ------------
# 5        false      2025-11-16T10:30:00Z  <- Current (failed rotation)
# 4        false      2025-08-18T08:15:00Z  <- Previous (last known good)

# 2. Rollback to previous version
vault kv rollback -version=4 secret/teei/reporting

# 3. Verify rollback
vault kv get secret/teei/reporting

# 4. Test database connectivity
ROLLED_BACK_PASSWORD=$(vault kv get -field=password secret/teei/reporting)
PGPASSWORD="${ROLLED_BACK_PASSWORD}" psql -h postgres-service -U teei_reporting -c "SELECT 1;"

# 5. If database password was already changed, update database to match Vault:
PGPASSWORD="${NEW_FAILED_PASSWORD}" psql -h postgres-service -U teei_reporting -d postgres \
  -c "ALTER USER teei_reporting PASSWORD '${ROLLED_BACK_PASSWORD}';"

# 6. Restart services
kubectl rollout restart deployment/reporting -n teei-platform
```

### 5.2 AWS Secrets Manager Rollback

AWS SM maintains version stages. To rollback:

```bash
# 1. List versions
aws secretsmanager describe-secret --secret-id teei/openai-api-key

# Output shows AWSCURRENT and AWSPREVIOUS version IDs

# 2. Get AWSPREVIOUS version ID
PREVIOUS_VERSION=$(aws secretsmanager describe-secret \
  --secret-id teei/openai-api-key \
  --query 'VersionIdsToStages' --output json | \
  jq -r 'to_entries[] | select(.value | contains(["AWSPREVIOUS"])) | .key')

# 3. Promote AWSPREVIOUS to AWSCURRENT
aws secretsmanager update-secret-version-stage \
  --secret-id teei/openai-api-key \
  --version-stage AWSCURRENT \
  --move-to-version-id "${PREVIOUS_VERSION}"

# 4. Verify rollback
aws secretsmanager get-secret-value --secret-id teei/openai-api-key --version-stage AWSCURRENT

# 5. Force Kubernetes refresh
kubectl annotate es teei-external-secrets force-sync="$(date +%s)" -n teei-platform

# 6. Monitor service health
kubectl logs -l app=q2q-ai -n teei-platform --tail=50 | grep -i "api\|error"
```

### 5.3 Kubernetes Secret Rollback

If using GitOps (Argo CD / Flux):

```bash
# 1. Revert secret manifest in Git
git revert <commit-hash>
git push

# 2. Wait for GitOps sync or force:
argocd app sync teei-platform

# 3. Verify secret update
kubectl get secret teei-reporting-postgres -n teei-platform -o yaml

# 4. Restart pods
kubectl rollout restart deployment/reporting -n teei-platform
```

Manual rollback:

```bash
# 1. Retrieve previous secret from backup
kubectl get secret teei-reporting-postgres -n teei-platform -o yaml > /tmp/current-secret.yaml

# 2. Apply backed-up secret
kubectl apply -f /path/to/backup/reporting-postgres-secret.yaml

# 3. Restart deployment
kubectl rollout restart deployment/reporting -n teei-platform
```

---

## Troubleshooting Guide

### 6.1 Rotation Script Failures

#### Problem: Vault Connection Failed

**Symptoms:**
```
ERROR: Vault is not accessible at http://localhost:8200
```

**Solutions:**

1. Check Vault status:
   ```bash
   vault status
   ```

2. Verify VAULT_ADDR environment variable:
   ```bash
   echo $VAULT_ADDR
   export VAULT_ADDR=https://vault.teei-platform.com
   ```

3. Check Vault authentication:
   ```bash
   vault token lookup
   # If expired, re-authenticate:
   vault login -method=oidc
   ```

4. Verify network connectivity:
   ```bash
   curl -k ${VAULT_ADDR}/v1/sys/health
   ```

#### Problem: Database Password Update Failed

**Symptoms:**
```
ERROR: Failed to update password in PostgreSQL
```

**Solutions:**

1. Verify database connectivity:
   ```bash
   PGPASSWORD="${CURRENT_PASSWORD}" psql -h postgres-service -U teei_reporting -c "SELECT version();"
   ```

2. Check database user permissions:
   ```bash
   PGPASSWORD="${CURRENT_PASSWORD}" psql -h postgres-service -U teei_reporting -d postgres -c "\du teei_reporting"
   # User must have LOGIN and can change own password
   ```

3. Verify network/firewall rules:
   ```bash
   telnet postgres-service 5432
   ```

4. Check PostgreSQL logs:
   ```bash
   kubectl logs -l app=postgres -n teei-platform --tail=100 | grep -i error
   ```

#### Problem: New Credentials Validation Failed

**Symptoms:**
```
ERROR: New credentials failed validation, attempting rollback...
```

**Solutions:**

1. Check if password was actually updated in database:
   ```bash
   PGPASSWORD="${NEW_PASSWORD}" psql -h postgres-service -U teei_reporting -c "SELECT 1;"
   ```

2. Verify password complexity requirements (if any):
   ```bash
   # PostgreSQL typically has no default password policy
   # Check for custom password check modules
   PGPASSWORD="${CURRENT_PASSWORD}" psql -h postgres-service -U postgres -c "SHOW shared_preload_libraries;"
   ```

3. Manual verification:
   ```bash
   # Connect with old password and check user
   PGPASSWORD="${CURRENT_PASSWORD}" psql -h postgres-service -U teei_reporting -d postgres \
     -c "SELECT rolname, rolvaliduntil FROM pg_authid WHERE rolname='teei_reporting';"
   ```

4. If validation continues to fail, investigate network/proxy issues:
   ```bash
   tcpdump -i any -s 0 -w /tmp/postgres-rotation.pcap host postgres-service
   ```

### 6.2 AWS Secrets Manager Issues

#### Problem: Secret Not Found

**Symptoms:**
```
ERROR: Secret not found: teei/openai-api-key
```

**Solutions:**

1. List all secrets:
   ```bash
   aws secretsmanager list-secrets --region us-east-1 | jq '.SecretList[].Name'
   ```

2. Check secret in different region:
   ```bash
   for region in us-east-1 us-west-2 eu-west-1; do
     echo "Checking ${region}..."
     aws secretsmanager list-secrets --region ${region} | grep teei
   done
   ```

3. Verify IAM permissions:
   ```bash
   aws sts get-caller-identity
   # Ensure role/user has secretsmanager:GetSecretValue permission
   ```

#### Problem: Rotation Lambda Not Configured

**Symptoms:**
```
WARNING: Automatic rotation not enabled for teei/openai-api-key
```

**Solutions:**

1. Enable rotation for secret:
   ```bash
   aws secretsmanager rotate-secret \
     --secret-id teei/openai-api-key \
     --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:teei-secret-rotator \
     --rotation-rules AutomaticallyAfterDays=90
   ```

2. If lambda doesn't exist, create rotation lambda (see AWS documentation)

3. For provider-managed secrets (OpenAI, Anthropic), rotation is manual only

### 6.3 Kubernetes Secret Update Issues

#### Problem: Pods Not Picking Up New Secrets

**Symptoms:** Rotation complete but services still using old credentials

**Solutions:**

1. Restart deployment:
   ```bash
   kubectl rollout restart deployment/reporting -n teei-platform
   ```

2. Verify secret was updated:
   ```bash
   kubectl get secret teei-reporting-postgres -n teei-platform -o jsonpath='{.metadata.creationTimestamp}'
   # Should show recent timestamp
   ```

3. Check if using Vault injection (secrets injected at pod start):
   ```bash
   kubectl get pod <pod-name> -n teei-platform -o yaml | grep vault
   # If using Vault injection, must restart pods
   ```

4. For External Secrets Operator:
   ```bash
   # Check ExternalSecret status
   kubectl get externalsecret teei-secrets -n teei-platform -o yaml

   # Force refresh
   kubectl annotate es teei-external-secrets force-sync="$(date +%s)" -n teei-platform
   ```

5. Verify pods restarted:
   ```bash
   kubectl get pods -n teei-platform -l app=reporting --sort-by=.metadata.creationTimestamp
   ```

### 6.4 Audit Script Issues

#### Problem: No Secrets Found in Audit

**Symptoms:**
```
WARNING: No secrets found in Vault under secret/teei/
```

**Solutions:**

1. Verify secret path structure:
   ```bash
   vault kv list secret/
   vault kv list secret/teei/
   ```

2. Check authentication:
   ```bash
   vault token lookup
   # Verify policies allow reading secrets
   ```

3. Try different secret engine path:
   ```bash
   # If secrets are at different path
   vault kv list secret/data/teei/
   ```

4. Update audit script path if needed:
   ```bash
   # Edit script to match actual Vault structure
   vim /home/user/TEEI-CSR-Platform/scripts/infra/secrets-rotation-audit.sh
   ```

---

## Compliance Mapping

### 7.1 SOC 2 Type II

**Control Mapping:**

| Control ID | Control Objective | Implementation |
|------------|-------------------|----------------|
| CC6.1 | Logical and physical access controls | 90-day rotation policy enforced via automation |
| CC6.2 | Authentication and authorization | Multi-layer secret storage (Vault + AWS SM + K8s) |
| CC6.6 | Encryption and data protection | Secrets encrypted at rest and in transit |
| CC7.2 | Detection of security events | Daily automated audit with alerting on overdue rotations |

**Evidence:**

- Automated audit logs: `/var/log/vault-rotation-audit.log`
- Rotation execution logs: `/var/log/vault-rotation.log`, `/var/log/aws-secrets-rotation.log`
- Weekly compliance reports: Generated via audit script
- Access control policies: Vault policies at `/infra/vault/policies/`

### 7.2 ISO 27001:2022

**Control Mapping:**

| Control | Requirement | Implementation |
|---------|-------------|----------------|
| A.5.15 | Access control | Role-based access to Vault and AWS SM |
| A.5.17 | Authentication information | Secrets rotated every 90 days |
| A.8.3 | Management of technical vulnerabilities | Automated rotation reduces exposure window |
| A.8.16 | Monitoring activities | Continuous monitoring via audit script |

### 7.3 PCI DSS 4.0

**Requirement Mapping:**

| Requirement | Description | Implementation |
|-------------|-------------|----------------|
| 8.3.10 | Change passwords at least every 90 days | Enforced via automation and alerting |
| 8.6.1 | Authenticate all access to system components | Secrets required for all database/API access |
| 10.3.4 | Log all authentication attempts | Audit log records all rotation attempts |

### 7.4 NIST Cybersecurity Framework

**Function Mapping:**

| Function | Category | Implementation |
|----------|----------|----------------|
| Identify (ID) | ID.AM-2: Software platforms and applications inventory | Secrets inventory via audit script |
| Protect (PR) | PR.AC-1: Identities and credentials are issued, managed, verified | Automated rotation and validation |
| Detect (DE) | DE.CM-3: Personnel activity is monitored | Audit logs track all rotation activities |
| Respond (RS) | RS.RP-1: Response plan is executed during or after an incident | Emergency rotation procedures defined |

---

## Appendix

### A. Rotation Script Locations

```
/home/user/TEEI-CSR-Platform/scripts/infra/
├── rotate-vault-secrets.sh       # Vault (PostgreSQL, ClickHouse) rotation
├── rotate-aws-secrets.sh          # AWS Secrets Manager rotation
├── secrets-rotation-audit.sh      # Audit and reporting
└── bootstrap-vault.sh             # Vault initialization (reference only)
```

### B. Log File Locations

```
/var/log/
├── vault-rotation.log             # Vault rotation execution log
├── vault-rotation-audit.log       # Vault rotation audit trail
├── aws-secrets-rotation.log       # AWS SM rotation execution log
├── aws-secrets-rotation-audit.log # AWS SM rotation audit trail
└── emergency-rotations.log        # Emergency rotation incident log
```

### C. Cron Schedule Examples

```bash
# Daily audit at 6 AM
0 6 * * * /home/user/TEEI-CSR-Platform/scripts/infra/secrets-rotation-audit.sh --output /var/reports/secrets-audit-$(date +\%Y\%m\%d).csv

# Weekly automated rotation on Sundays at 2 AM (low traffic period)
0 2 * * 0 /home/user/TEEI-CSR-Platform/scripts/infra/rotate-vault-secrets.sh >> /var/log/vault-rotation.log 2>&1

# Monthly AWS rotation on first Sunday at 3 AM
0 3 1-7 * 0 /home/user/TEEI-CSR-Platform/scripts/infra/rotate-aws-secrets.sh >> /var/log/aws-secrets-rotation.log 2>&1

# Alert on critical audit findings
0 7 * * * /home/user/TEEI-CSR-Platform/scripts/infra/secrets-rotation-audit.sh && echo "All secrets OK" || echo "ALERT: Secrets require rotation!" | mail -s "TEEI Secrets Audit Alert" security@teei-platform.com
```

### D. Secret Naming Conventions

**Vault Secrets:**
```
secret/teei/{service-name}               # Service-level secrets
secret/teei/{service-name}/postgres      # PostgreSQL credentials
secret/teei/{service-name}/clickhouse    # ClickHouse credentials
secret/teei/{service-name}/redis         # Redis credentials
```

**AWS Secrets Manager:**
```
teei/{provider}-api-key                  # External API keys
teei/certs/{domain}                      # TLS certificates
teei/tokens/{service}                    # Service tokens
```

**Kubernetes Secrets:**
```
teei-{service}-postgres                  # Database credentials
teei-{service}-api-keys                  # API keys
teei-{service}-tls                       # TLS certificates
```

### E. Support Contacts

| Team | Responsibility | Contact | Escalation SLA |
|------|---------------|---------|----------------|
| Platform Engineering | Vault infrastructure | platform@teei.com | 1 hour |
| Security Team | Secrets policy and compliance | security@teei.com | 2 hours |
| Database Team | PostgreSQL/ClickHouse admin | dba@teei.com | 4 hours |
| On-Call Engineer | 24/7 emergency rotations | oncall@teei.com | 15 minutes |

### F. Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-16 | secrets-rotator agent | Initial release - comprehensive rotation playbooks |

### G. References

- [HashiCorp Vault KV Secrets Engine Documentation](https://developer.hashicorp.com/vault/docs/secrets/kv)
- [AWS Secrets Manager Rotation Documentation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
- [PostgreSQL Password Management](https://www.postgresql.org/docs/current/auth-password.html)
- [ClickHouse User Management](https://clickhouse.com/docs/en/operations/access-rights)
- [Kubernetes Secrets Best Practices](https://kubernetes.io/docs/concepts/configuration/secret/)

---

**Document Status**: ✅ Complete
**Next Review Date**: 2025-12-16
**Approved By**: Worker 1 Team 5 Lead
