# Vault policy for TEEI Unified Profile Service
# Grants read access to unified-profile secrets

path "secret/data/teei/unified-profile" {
  capabilities = ["read"]
}

path "secret/data/teei/unified-profile/*" {
  capabilities = ["read"]
}

path "secret/metadata/teei/unified-profile" {
  capabilities = ["list", "read"]
}
