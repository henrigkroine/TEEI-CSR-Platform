# Secrets Management - Operator Guide

This guide is for platform operators who need to manage secrets in the TEEI CSR Platform.

## Quick Reference

### Check Secret Status

```bash
# List all secrets in namespace
kubectl get secrets -n teei-staging

# Check if a specific secret exists
kubectl get secret teei-api-gateway-secrets -n teei-staging

# View secret keys (not values)
kubectl get secret teei-api-gateway-secrets -n teei-staging -o jsonpath='{.data}' | jq 'keys'

# Decode a secret value (use with caution!)
kubectl get secret teei-api-gateway-secrets -n teei-staging -o jsonpath='{.data.JWT_SECRET}' | base64 -d
```

### Create a Secret Manually

```bash
# From literal values
kubectl create secret generic teei-api-gateway-secrets \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=REDIS_URL="redis://redis-service:6379" \
  --namespace=teei-staging

# From file
kubectl create secret generic teei-api-gateway-secrets \
  --from-file=jwt-secret=./jwt.txt \
  --namespace=teei-staging

# From env file
kubectl create secret generic teei-api-gateway-secrets \
  --from-env-file=./secrets.env \
  --namespace=teei-staging
```

### Update a Secret

```bash
# Edit secret directly (opens in editor)
kubectl edit secret teei-api-gateway-secrets -n teei-staging

# Patch a specific key
kubectl patch secret teei-api-gateway-secrets -n teei-staging \
  -p "{\"data\":{\"JWT_SECRET\":\"$(echo -n 'new-value' | base64)\"}}"

# Replace entire secret
kubectl create secret generic teei-api-gateway-secrets \
  --from-literal=JWT_SECRET="new-value" \
  --namespace=teei-staging \
  --dry-run=client -o yaml | kubectl replace -f -
```

### Delete a Secret

```bash
# Delete a specific secret
kubectl delete secret teei-api-gateway-secrets -n teei-staging

# Delete all TEEI secrets in namespace
kubectl delete secrets -n teei-staging -l part-of=teei-csr-platform
```

## Environment-Specific Operations

### Staging Environment

**Namespace:** `teei-staging`

**Recommended approach:** Sealed Secrets

```bash
# Set context
kubectl config set-context --current --namespace=teei-staging

# Apply sealed secrets
kubectl apply -f k8s/overlays/staging/sealed-secrets/

# Verify secrets were created
kubectl get secrets | grep teei

# Check sealed secrets controller
kubectl get pods -n kube-system -l name=sealed-secrets-controller
```

### Production Environment

**Namespace:** `teei-production`

**Recommended approach:** HashiCorp Vault

```bash
# Set context
kubectl config set-context --current --namespace=teei-production

# Verify Vault integration
kubectl get pods -n vault -l app.kubernetes.io/name=vault-agent-injector

# Check service accounts have Vault annotations
kubectl describe serviceaccount teei-api-gateway -n teei-production

# View Vault-injected secrets in pod
kubectl exec -it <pod-name> -n teei-production -- cat /vault/secrets/config
```

## Common Scenarios

### Scenario 1: New Service Needs Secrets

1. **Identify required secrets**
   - Check service's `.env.example` file
   - Review `SECRETS_INVENTORY.md`

2. **Create secret template**
   ```bash
   cat > service-secret.yaml <<EOF
   apiVersion: v1
   kind: Secret
   metadata:
     name: teei-new-service-secrets
     namespace: teei-staging
     labels:
       app: teei-new-service
       part-of: teei-csr-platform
   type: Opaque
   stringData:
     DATABASE_URL: "postgresql://user:pass@postgres:5432/db"
     API_KEY: "your-api-key-here"
   EOF
   ```

3. **Encrypt and apply**
   - For Sealed Secrets: `kubeseal < service-secret.yaml > service-sealed.yaml`
   - For SOPS: `sops -e -i service-secret.yaml`
   - For Vault: `vault kv put secret/teei/new-service DATABASE_URL=... API_KEY=...`

4. **Update deployment**
   - Add `envFrom` or `env` references to deployment YAML
   - Apply deployment changes

5. **Verify**
   ```bash
   kubectl get secret teei-new-service-secrets -n teei-staging
   kubectl describe deployment teei-new-service -n teei-staging | grep -A5 "Environment"
   ```

### Scenario 2: Rotate Compromised Secret

**URGENT - Follow immediately if a secret is compromised**

1. **Generate new secret value**
   ```bash
   NEW_SECRET=$(openssl rand -hex 32)
   ```

2. **Update in secret store**

   **Vault:**
   ```bash
   vault kv put secret/teei/api-gateway JWT_SECRET="${NEW_SECRET}"
   ```

   **Sealed Secrets:**
   ```bash
   cat <<EOF | kubeseal --format=yaml > api-gateway-sealed-new.yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: teei-api-gateway-secrets
     namespace: teei-production
   stringData:
     JWT_SECRET: "${NEW_SECRET}"
     REDIS_URL: "redis://redis-service:6379"
   EOF
   kubectl apply -f api-gateway-sealed-new.yaml
   ```

   **SOPS:**
   ```bash
   sops k8s/overlays/production/secrets/api-gateway.yaml
   # Update JWT_SECRET value in editor
   kubectl apply -f k8s/overlays/production/secrets/api-gateway.yaml
   ```

3. **Restart affected pods**
   ```bash
   kubectl rollout restart deployment/teei-api-gateway -n teei-production
   kubectl rollout status deployment/teei-api-gateway -n teei-production
   ```

4. **Verify pods are healthy**
   ```bash
   kubectl get pods -n teei-production -l app=teei-api-gateway
   kubectl logs -n teei-production -l app=teei-api-gateway --tail=50
   ```

5. **Update dependent services**
   - If JWT_SECRET is shared, update all services that use it
   - Update external systems that may cache the secret

6. **Document incident**
   - Log when secret was rotated
   - Note reason for rotation
   - Update audit trail

### Scenario 3: Adding New Environment

1. **Create namespace**
   ```bash
   kubectl create namespace teei-demo
   ```

2. **Copy secrets from template**
   ```bash
   # Export from staging (use with caution!)
   kubectl get secrets -n teei-staging -l part-of=teei-csr-platform -o yaml > staging-secrets.yaml

   # Edit namespace and values
   sed -i 's/namespace: teei-staging/namespace: teei-demo/g' staging-secrets.yaml

   # Apply
   kubectl apply -f staging-secrets.yaml
   ```

3. **Or create fresh secrets**
   ```bash
   # Use the secret templates in k8s/base/secrets/
   # Update values for demo environment
   # Apply to teei-demo namespace
   ```

### Scenario 4: Migrating from Manual to Vault

1. **Set up Vault** (if not already done)
   ```bash
   cd scripts/infra
   ./bootstrap-vault.sh
   ```

2. **Export existing secrets to Vault**
   ```bash
   # Get secret from Kubernetes
   JWT_SECRET=$(kubectl get secret teei-api-gateway-secrets -n teei-production \
     -o jsonpath='{.data.JWT_SECRET}' | base64 -d)

   # Store in Vault
   vault kv put secret/teei/api-gateway \
     JWT_SECRET="${JWT_SECRET}" \
     REDIS_URL="redis://redis-service:6379"
   ```

3. **Update deployment with Vault annotations**
   ```yaml
   spec:
     template:
       metadata:
         annotations:
           vault.hashicorp.com/agent-inject: "true"
           vault.hashicorp.com/role: "teei-api-gateway"
           vault.hashicorp.com/agent-inject-secret-config: "secret/teei/api-gateway"
   ```

4. **Deploy and verify**
   ```bash
   kubectl apply -f k8s/base/api-gateway/deployment.yaml
   kubectl get pods -n teei-production -l app=teei-api-gateway
   kubectl describe pod <pod-name> -n teei-production
   ```

5. **Remove old Kubernetes secret** (after verification)
   ```bash
   kubectl delete secret teei-api-gateway-secrets -n teei-production
   ```

## Monitoring and Auditing

### Check Secret Age

```bash
# List secrets with creation timestamp
kubectl get secrets -n teei-production -o custom-columns=\
NAME:.metadata.name,\
AGE:.metadata.creationTimestamp

# Secrets older than 90 days should be rotated
```

### Audit Secret Access

**Vault:**
```bash
# View audit logs
vault audit list
vault read sys/audit/file/log

# Check who accessed a secret
vault audit list -detailed
```

**Kubernetes:**
```bash
# Enable audit logging in kube-apiserver
# Check audit logs for secret access
kubectl get events -n teei-production --sort-by='.lastTimestamp' | grep Secret
```

### Alert on Secret Changes

```yaml
# Example Prometheus alert
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: secret-alerts
spec:
  groups:
  - name: secrets
    rules:
    - alert: SecretModified
      expr: |
        kube_secret_info{namespace="teei-production"} * on(secret) group_right()
        changes(kube_secret_info{namespace="teei-production"}[5m]) > 0
      annotations:
        summary: "Secret {{ $labels.secret }} was modified"
```

## Backup and Disaster Recovery

### Backup Secrets

```bash
# Backup all secrets in namespace
kubectl get secrets -n teei-production -o yaml > teei-production-secrets-backup.yaml

# Encrypt backup
gpg --encrypt --recipient ops@teei.com teei-production-secrets-backup.yaml

# Store encrypted backup securely (NOT in Git)
# Examples: S3, secure vault, encrypted USB drive
```

### Restore Secrets

```bash
# Decrypt backup
gpg --decrypt teei-production-secrets-backup.yaml.gpg > secrets.yaml

# Restore to cluster
kubectl apply -f secrets.yaml

# Verify
kubectl get secrets -n teei-production
```

### Backup Sealed Secrets Private Key

```bash
# This is CRITICAL - if you lose this key, you cannot decrypt sealed secrets
kubectl get secret -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key=active \
  -o yaml > sealed-secrets-key-backup.yaml

# Encrypt and store securely
gpg --encrypt --recipient ops@teei.com sealed-secrets-key-backup.yaml
```

## Troubleshooting

### Secret Not Found

```bash
# Check if secret exists
kubectl get secret <secret-name> -n <namespace>

# Check deployment reference
kubectl describe deployment <deployment-name> -n <namespace> | grep -A10 "Environment"

# Check events
kubectl get events -n <namespace> --sort-by='.lastTimestamp' | grep -i secret
```

### Invalid Secret Data

```bash
# Verify secret has required keys
kubectl get secret <secret-name> -n <namespace> -o json | jq '.data | keys'

# Check if values are base64 encoded properly
kubectl get secret <secret-name> -n <namespace> -o json | jq -r '.data.KEY' | base64 -d
```

### Pod Failing Due to Missing Secret

```bash
# Check pod events
kubectl describe pod <pod-name> -n <namespace>

# Check if secret exists
kubectl get secret <secret-name> -n <namespace>

# Verify secret reference in deployment
kubectl get deployment <deployment-name> -n <namespace> -o yaml | grep -A20 "env:"
```

### Vault Injection Not Working

```bash
# Check Vault agent injector is running
kubectl get pods -n vault -l app.kubernetes.io/name=vault-agent-injector

# Check pod has Vault annotations
kubectl describe pod <pod-name> -n <namespace> | grep vault

# Check Vault agent sidecar logs
kubectl logs <pod-name> -n <namespace> -c vault-agent
kubectl logs <pod-name> -n <namespace> -c vault-agent-init

# Verify service account
kubectl get serviceaccount <sa-name> -n <namespace> -o yaml
```

## Security Checklist

- [ ] All secrets are encrypted at rest (Vault/Sealed Secrets/SOPS)
- [ ] No plaintext secrets in Git
- [ ] Different secrets for each environment
- [ ] Secrets rotated within last 90 days
- [ ] Audit logging enabled
- [ ] RBAC configured to limit secret access
- [ ] Backup of encryption keys stored securely
- [ ] Team members trained on secret management
- [ ] Incident response plan for compromised secrets
- [ ] Regular security audits scheduled

## Emergency Procedures

### Secret Compromised

1. Immediately rotate the secret (see Scenario 2)
2. Notify security team
3. Check audit logs for unauthorized access
4. Update all systems using the secret
5. Document incident and lessons learned

### Lost Encryption Key

**Sealed Secrets:**
- If private key is lost and no backup exists, sealed secrets cannot be decrypted
- You must create new secrets and re-seal them
- This is why backing up the controller key is critical

**SOPS/age:**
- If age private key is lost, encrypted files cannot be decrypted
- Restore from backup or re-create secrets

**Vault:**
- If Vault unseal keys are lost, Vault cannot be unsealed
- Shamir's secret sharing requires threshold of key holders
- Backup unseal keys securely

### Cluster Migration

1. Export secrets from old cluster
   ```bash
   kubectl get secrets -n teei-production -o yaml > secrets-export.yaml
   ```

2. Update namespace if needed
   ```bash
   sed -i 's/namespace: teei-production/namespace: new-teei-production/g' secrets-export.yaml
   ```

3. Import to new cluster
   ```bash
   kubectl apply -f secrets-export.yaml --context=new-cluster
   ```

4. Verify
   ```bash
   kubectl get secrets -n teei-production --context=new-cluster
   ```

## Best Practices Summary

1. **Use the right tool for the job**
   - Vault for production
   - Sealed Secrets for staging
   - SOPS for flexibility

2. **Never commit plaintext secrets**
   - Always encrypt before committing
   - Use `.gitignore` for raw secret files

3. **Rotate regularly**
   - Set calendar reminders
   - Automate where possible
   - Document rotation procedures

4. **Backup encryption keys**
   - Multiple secure locations
   - Test restore procedures
   - Document key locations

5. **Monitor and audit**
   - Enable audit logging
   - Set up alerts
   - Review logs regularly

6. **Train your team**
   - Document procedures
   - Conduct drills
   - Share knowledge

## Getting Help

- **Documentation:** See README.md and integration guides in this directory
- **Secrets Inventory:** See SECRETS_INVENTORY.md for service-specific secrets
- **Platform Team:** Contact via internal channels
- **Security Issues:** Follow responsible disclosure process

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
**Maintained by:** Platform Engineering Team
