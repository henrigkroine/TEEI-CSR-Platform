# SOPS Integration Guide

This guide explains how to use Mozilla SOPS (Secrets OPerationS) for encrypting Kubernetes secrets.

## Overview

SOPS is a flexible encryption tool that:
- Encrypts only the values in YAML files, leaving keys readable
- Supports multiple backends (age, AWS KMS, GCP KMS, Azure Key Vault, PGP)
- Integrates with Git workflows
- Works with any text-based configuration format

## Why SOPS?

- Encrypt secrets before committing to Git
- Diff-friendly (only values are encrypted)
- Multiple key management backends
- Editor integration for seamless editing
- GitOps compatible

## Setup

### 1. Install SOPS

**macOS:**
```bash
brew install sops
```

**Linux:**
```bash
wget https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
chmod +x sops-v3.8.1.linux.amd64
sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops
```

**Windows:**
```bash
choco install sops
```

### 2. Install age (recommended encryption backend)

**macOS:**
```bash
brew install age
```

**Linux:**
```bash
wget https://github.com/FiloSottile/age/releases/download/v1.1.1/age-v1.1.1-linux-amd64.tar.gz
tar xzf age-v1.1.1-linux-amd64.tar.gz
sudo mv age/age /usr/local/bin/
sudo mv age/age-keygen /usr/local/bin/
```

### 3. Generate age keys

Generate encryption keys for each environment:

```bash
# Staging key
age-keygen -o ~/.config/sops/age/staging.txt

# Production key
age-keygen -o ~/.config/sops/age/production.txt

# Development key
age-keygen -o ~/.config/sops/age/development.txt
```

Each command outputs:
```
# created: 2024-01-15T10:30:00Z
# public key: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AGE-SECRET-KEY-1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 4. Update .sops.yaml

Update the `.sops.yaml` file in the repository root with your public keys:

```yaml
creation_rules:
  - path_regex: k8s/overlays/production/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1your-actual-production-public-key-here

  - path_regex: k8s/overlays/staging/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1your-actual-staging-public-key-here
```

### 5. Set SOPS_AGE_KEY environment variable

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# SOPS age keys
export SOPS_AGE_KEY_FILE=~/.config/sops/age/staging.txt
```

Or for multiple environments:

```bash
# Function to switch SOPS environment
sops-env() {
  case $1 in
    staging)
      export SOPS_AGE_KEY_FILE=~/.config/sops/age/staging.txt
      ;;
    production)
      export SOPS_AGE_KEY_FILE=~/.config/sops/age/production.txt
      ;;
    development)
      export SOPS_AGE_KEY_FILE=~/.config/sops/age/development.txt
      ;;
    *)
      echo "Usage: sops-env {staging|production|development}"
      ;;
  esac
}
```

## Encrypting Secrets

### Create a secret file

```yaml
# k8s/overlays/staging/secrets/api-gateway.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-api-gateway-secrets
  namespace: teei-staging
type: Opaque
stringData:
  JWT_SECRET: "my-secret-jwt-key"
  REDIS_URL: "redis://staging-redis:6379"
```

### Encrypt the file

```bash
sops -e -i k8s/overlays/staging/secrets/api-gateway.yaml
```

The file now looks like this:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-api-gateway-secrets
  namespace: teei-staging
type: Opaque
stringData:
  JWT_SECRET: ENC[AES256_GCM,data:xPz...,iv:...,tag:...,type:str]
  REDIS_URL: ENC[AES256_GCM,data:8Kl...,iv:...,tag:...,type:str]
sops:
  kms: []
  gcp_kms: []
  azure_kv: []
  age:
    - recipient: age1...
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2024-01-15T10:30:00Z"
  version: 3.8.1
```

### Decrypt and edit

```bash
# Edit encrypted file (decrypts in editor, re-encrypts on save)
sops k8s/overlays/staging/secrets/api-gateway.yaml

# Decrypt to stdout
sops -d k8s/overlays/staging/secrets/api-gateway.yaml

# Decrypt to file
sops -d k8s/overlays/staging/secrets/api-gateway.yaml > api-gateway-decrypted.yaml
```

## Deploying Encrypted Secrets

### Option 1: Decrypt before applying

```bash
sops -d k8s/overlays/staging/secrets/api-gateway.yaml | kubectl apply -f -
```

### Option 2: Use KSOPS (Kustomize SOPS plugin)

Install KSOPS:

```bash
# Install as kustomize plugin
wget https://github.com/viaduct-ai/kustomize-sops/releases/download/v4.3.1/ksops_4.3.1_Linux_x86_64.tar.gz
tar xzf ksops_4.3.1_Linux_x86_64.tar.gz
mkdir -p ~/.config/kustomize/plugin/viaduct.ai/v1/ksops
mv ksops ~/.config/kustomize/plugin/viaduct.ai/v1/ksops/
chmod +x ~/.config/kustomize/plugin/viaduct.ai/v1/ksops/ksops
```

Create a KSOPS generator in kustomization.yaml:

```yaml
# k8s/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

generators:
  - secrets-generator.yaml

resources:
  - ../../base/api-gateway
```

```yaml
# k8s/overlays/staging/secrets-generator.yaml
apiVersion: viaduct.ai/v1
kind: ksops
metadata:
  name: teei-secrets
files:
  - secrets/api-gateway.yaml
  - secrets/q2q-ai.yaml
  - secrets/discord-bot.yaml
```

Deploy with kustomize:

```bash
kustomize build --enable-alpha-plugins k8s/overlays/staging | kubectl apply -f -
```

## Encrypting All Service Secrets

Create encrypted secrets for each service:

```bash
# Set staging environment
export SOPS_AGE_KEY_FILE=~/.config/sops/age/staging.txt

# API Gateway
cat > k8s/overlays/staging/secrets/api-gateway.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: teei-api-gateway-secrets
  namespace: teei-staging
type: Opaque
stringData:
  JWT_SECRET: "$(openssl rand -hex 32)"
  REDIS_URL: "redis://staging-redis:6379"
EOF
sops -e -i k8s/overlays/staging/secrets/api-gateway.yaml

# Q2Q AI
cat > k8s/overlays/staging/secrets/q2q-ai.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: teei-q2q-ai-secrets
  namespace: teei-staging
type: Opaque
stringData:
  ANTHROPIC_API_KEY: "sk-ant-api03-staging-key"
  DATABASE_URL: "postgresql://user:pass@postgres:5432/teei_csr"
EOF
sops -e -i k8s/overlays/staging/secrets/q2q-ai.yaml

# Continue for all services...
```

## Secret Rotation

To rotate a secret:

```bash
# 1. Edit encrypted file
sops k8s/overlays/staging/secrets/api-gateway.yaml

# 2. Update the value in your editor
# (SOPS will decrypt, let you edit, then re-encrypt)

# 3. Commit changes
git add k8s/overlays/staging/secrets/api-gateway.yaml
git commit -m "Rotate API Gateway JWT secret"

# 4. Deploy
sops -d k8s/overlays/staging/secrets/api-gateway.yaml | kubectl apply -f -
kubectl rollout restart deployment/teei-api-gateway -n teei-staging
```

## Team Collaboration

### Sharing Public Keys

Public keys can be safely shared and committed to Git:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: k8s/overlays/production/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: >-
      age1alice...,
      age1bob...,
      age1charlie...
```

Each team member with the corresponding private key can decrypt.

### Adding a new team member

1. New member generates their age key:
   ```bash
   age-keygen -o ~/.config/sops/age/my-key.txt
   ```

2. Share their public key with the team

3. Update `.sops.yaml` to include new public key

4. Re-encrypt all secrets:
   ```bash
   sops updatekeys k8s/overlays/staging/secrets/*.yaml
   ```

## Security Best Practices

1. Never commit private keys to Git
2. Add private keys to `.gitignore`
3. Use different keys for each environment
4. Rotate keys every 12 months
5. Revoke access by re-encrypting without their key
6. Use cloud KMS for production (better key management)
7. Audit encrypted file access using Git history

## Cloud KMS Integration

### AWS KMS

```yaml
# .sops.yaml
creation_rules:
  - path_regex: k8s/overlays/production/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    kms: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
```

Encrypt:
```bash
sops -e -i secrets.yaml
```

### Google Cloud KMS

```yaml
# .sops.yaml
creation_rules:
  - path_regex: k8s/overlays/production/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    gcp_kms: 'projects/my-project/locations/global/keyRings/sops/cryptoKeys/sops-key'
```

### Azure Key Vault

```yaml
# .sops.yaml
creation_rules:
  - path_regex: k8s/overlays/production/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    azure_keyvault: 'https://my-vault.vault.azure.net/keys/sops-key/abcd1234'
```

## Comparison with Other Solutions

| Feature | SOPS | Sealed Secrets | Vault |
|---------|------|----------------|-------|
| Encryption at rest | Yes | Yes | Yes |
| GitOps friendly | Yes | Yes | Partial |
| Diff-friendly | Yes | No | N/A |
| Cloud KMS support | Yes | No | Yes |
| External infrastructure | Optional | Controller | Server |
| Team collaboration | Easy | Medium | Medium |
| Best for | Git workflows | K8s-native | Dynamic secrets |

## Troubleshooting

### "Failed to get the data key"

Ensure your age key is set:
```bash
export SOPS_AGE_KEY_FILE=~/.config/sops/age/staging.txt
```

### "no matching creation rule"

Check that your file path matches rules in `.sops.yaml`.

### "MAC mismatch"

File was tampered with or corrupted. Restore from Git.

## References

- [SOPS Documentation](https://github.com/getsops/sops)
- [age Encryption Tool](https://age-encryption.org/)
- [KSOPS Plugin](https://github.com/viaduct-ai/kustomize-sops)
