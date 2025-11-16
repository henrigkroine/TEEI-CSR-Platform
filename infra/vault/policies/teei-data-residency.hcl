# Vault policy for TEEI Data Residency Service
# Grants access to region-scoped secrets and KMS keys

# =====================================================
# Data Residency Service Secrets
# =====================================================

# Read data-residency service secrets
path "secret/data/teei/data-residency" {
  capabilities = ["read"]
}

path "secret/data/teei/data-residency/*" {
  capabilities = ["read"]
}

# Allow listing secrets
path "secret/metadata/teei/data-residency" {
  capabilities = ["list", "read"]
}

# =====================================================
# Region-Scoped KMS Keys
# =====================================================

# EU Central 1 - KMS keys for EU data encryption
path "kms/eu-central-1/*" {
  capabilities = ["read", "update"]
}

path "transit/encrypt/eu-central-1-*" {
  capabilities = ["update"]
}

path "transit/decrypt/eu-central-1-*" {
  capabilities = ["update"]
}

# US East 1 - KMS keys for US data encryption
path "kms/us-east-1/*" {
  capabilities = ["read", "update"]
}

path "transit/encrypt/us-east-1-*" {
  capabilities = ["update"]
}

path "transit/decrypt/us-east-1-*" {
  capabilities = ["update"]
}

# =====================================================
# Database Credentials (Region-Scoped)
# =====================================================

# EU database credentials
path "database/creds/teei-eu-central-1-readonly" {
  capabilities = ["read"]
}

path "database/creds/teei-eu-central-1-readwrite" {
  capabilities = ["read"]
}

# US database credentials
path "database/creds/teei-us-east-1-readonly" {
  capabilities = ["read"]
}

path "database/creds/teei-us-east-1-readwrite" {
  capabilities = ["read"]
}

# =====================================================
# Cache/Redis Credentials (Region-Scoped)
# =====================================================

# EU Redis
path "secret/data/teei/redis/eu-central-1" {
  capabilities = ["read"]
}

# US Redis
path "secret/data/teei/redis/us-east-1" {
  capabilities = ["read"]
}

# =====================================================
# PKI for Inter-Service TLS
# =====================================================

# Issue certificates for data-residency service
path "pki/issue/teei-data-residency" {
  capabilities = ["create", "update"]
}

# =====================================================
# Audit Log Access (Read-Only)
# =====================================================

# Read audit logs for compliance reporting
path "secret/data/teei/audit/residency/*" {
  capabilities = ["read", "list"]
}

# =====================================================
# Token Self-Management
# =====================================================

# Allow service to renew its own token
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Allow service to look up its own token
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# =====================================================
# AppRole Authentication
# =====================================================

# Allow data-residency service to authenticate via AppRole
path "auth/approle/login" {
  capabilities = ["create", "update"]
}

# Read role-id for data-residency service
path "auth/approle/role/teei-data-residency/role-id" {
  capabilities = ["read"]
}
