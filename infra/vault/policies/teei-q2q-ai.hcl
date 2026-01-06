# Vault policy for TEEI Q2Q AI Service
# Grants read access to q2q-ai secrets

path "secret/data/teei/q2q-ai" {
  capabilities = ["read"]
}

path "secret/data/teei/q2q-ai/*" {
  capabilities = ["read"]
}

path "secret/metadata/teei/q2q-ai" {
  capabilities = ["list", "read"]
}
