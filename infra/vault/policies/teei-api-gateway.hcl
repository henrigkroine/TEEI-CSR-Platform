# Vault policy for TEEI API Gateway
# Grants read access to api-gateway secrets

path "secret/data/teei/api-gateway" {
  capabilities = ["read"]
}

path "secret/data/teei/api-gateway/*" {
  capabilities = ["read"]
}

# Allow listing secrets
path "secret/metadata/teei/api-gateway" {
  capabilities = ["list", "read"]
}
