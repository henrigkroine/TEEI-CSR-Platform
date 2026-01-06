# SOC 2 Access Review Checklist

**Purpose**: Quarterly access review for SOC 2 compliance
**Frequency**: Quarterly (Q1, Q2, Q3, Q4)
**Responsibility**: Security Lead + Engineering Managers
**Retention**: 7 years (compliance requirement)

---

## Overview

Per SOC 2 requirements, we must review and document access controls quarterly to ensure:
1. Users have appropriate access levels for their roles
2. Terminated users are deprovisioned within 24 hours
3. Privileged access (admin, root) is limited and audited
4. Service accounts follow least-privilege principles

---

## Review Schedule

| Quarter | Review Date | Completed By | Status | Evidence File |
|---------|-------------|--------------|--------|---------------|
| Q1 2025 | 2025-04-01 | | ☐ Pending | `/ops/security/access-reviews/2025-Q1.md` |
| Q2 2025 | 2025-07-01 | | ☐ Pending | `/ops/security/access-reviews/2025-Q2.md` |
| Q3 2025 | 2025-10-01 | | ☐ Pending | `/ops/security/access-reviews/2025-Q3.md` |
| Q4 2025 | 2025-12-31 | | ☐ Pending | `/ops/security/access-reviews/2025-Q4.md` |

---

## Access Review Procedures

### 1. Production Kubernetes Access

```bash
# List all users with access to prod namespace
kubectl get rolebindings -n teei-prod -o json | \
  jq -r '.items[] | "\(.metadata.name): \(.subjects[]?.name)"' | \
  sort | uniq

# List cluster admins
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] | select(.roleRef.name=="cluster-admin") | "\(.metadata.name): \(.subjects[]?.name)"'

# Export to review file
kubectl get rolebindings -n teei-prod -o yaml > access-reviews/$(date +%Y-Q1)-k8s-access.yaml
```

**Review Questions**:
- [ ] Does each user still require production access?
- [ ] Are cluster-admin users limited to SRE team?
- [ ] Have any users left the company (check HR list)?
- [ ] Are service accounts following least-privilege?

---

### 2. AWS IAM Access

```bash
# List all IAM users
aws iam list-users --query 'Users[*].[UserName,CreateDate,PasswordLastUsed]' --output table

# List users with AdministratorAccess
aws iam list-policies-granting-service-access \
  --arn arn:aws:iam::aws:policy/AdministratorAccess \
  --service-namespaces '*'

# List access keys older than 90 days
aws iam list-access-keys --output json | \
  jq -r '.AccessKeyMetadata[] | select((.CreateDate | fromdateiso8601) < (now - (90*86400))) | .UserName'
```

**Review Questions**:
- [ ] Are all IAM users still employed?
- [ ] Are there unused access keys >90 days?
- [ ] Do IAM policies follow least-privilege?
- [ ] Are MFA requirements enforced?

---

### 3. Database Access

```bash
# List PostgreSQL users
psql $DATABASE_URL -c "\du"

# Check for superuser accounts
psql $DATABASE_URL -c "SELECT usename FROM pg_user WHERE usesuper = true;"

# List active connections
psql $DATABASE_URL -c "SELECT usename, application_name, client_addr, state FROM pg_stat_activity WHERE state = 'active';"
```

**Review Questions**:
- [ ] Are all database users still employed/required?
- [ ] Are there unused superuser accounts?
- [ ] Do service accounts use read-only credentials where possible?
- [ ] Are passwords rotated quarterly?

---

### 4. GitHub Access

```bash
# List organization members (requires GitHub CLI)
gh api /orgs/henrigkroine/members --paginate | jq -r '.[].login'

# List admin users
gh api /orgs/henrigkroine/members?role=admin | jq -r '.[].login'

# List teams and members
gh api /orgs/henrigkroine/teams --paginate | jq -r '.[].name' | while read team; do
  echo "Team: $team"
  gh api "/orgs/henrigkroine/teams/$team/members" | jq -r '.[].login'
  echo ""
done
```

**Review Questions**:
- [ ] Are all org members still employed?
- [ ] Do admin privileges align with roles?
- [ ] Are team memberships current?
- [ ] Are external collaborators documented?

---

### 5. Third-Party SaaS Access

| Service | Access Review Command | Owner |
|---------|----------------------|-------|
| Sentry | Check Sentry org members | DevOps Lead |
| PagerDuty | Check PagerDuty users | SRE Lead |
| Grafana Cloud | Check Grafana org users | SRE Lead |
| Slack | Check Slack workspace members | Security Lead |
| Statuspage.io | Check Statuspage team members | SRE Lead |

**Review Questions**:
- [ ] Are all users still employed?
- [ ] Are admin roles limited?
- [ ] Are MFA requirements enforced?
- [ ] Are API keys documented and rotated?

---

### 6. Service Account Inventory

```bash
# Kubernetes service accounts
kubectl get serviceaccounts -n teei-prod -o json | \
  jq -r '.items[] | "\(.metadata.name): \(.secrets[]?.name)"'

# AWS IAM roles for service accounts (IRSA)
aws iam list-roles --query 'Roles[?contains(RoleName, `teei`)].RoleName'
```

**Review Questions**:
- [ ] Are all service accounts documented?
- [ ] Do service accounts follow least-privilege?
- [ ] Are unused service accounts deprovisioned?
- [ ] Are service account credentials rotated?

---

## Termination Checklist

When an employee is terminated, complete within 24 hours:

- [ ] **GitHub**: Remove from organization
- [ ] **AWS IAM**: Delete user and access keys
- [ ] **Kubernetes**: Delete rolebindings for user
- [ ] **Database**: Revoke user privileges
- [ ] **Slack**: Deactivate account
- [ ] **Sentry**: Remove from organization
- [ ] **PagerDuty**: Remove from schedules and escalations
- [ ] **VPN**: Revoke certificates
- [ ] **SSH Keys**: Remove from authorized_keys
- [ ] **Documentation**: Update access control matrix

---

## Evidence Collection

For each quarterly review, collect:

1. **Access Lists**: Export of all users/roles from each system
2. **Review Notes**: Document any changes made
3. **Approval**: Signed approval from Security Lead
4. **Remediation**: List of accounts deprovisioned
5. **Exceptions**: Document any approved exceptions

**Storage**: `/ops/security/access-reviews/YYYY-QN/`

**Template**:
```
access-reviews/
└── 2025-Q1/
    ├── review-summary.md
    ├── k8s-access.yaml
    ├── aws-iam-users.json
    ├── github-members.json
    ├── database-users.txt
    ├── changes-log.md
    └── approval-signature.txt
```

---

## Approval Workflow

1. **Engineering Manager**: Reviews team members' access
2. **Security Lead**: Reviews privileged access and exceptions
3. **CTO**: Final approval for quarterly review
4. **Auditor**: Provides to external auditor for SOC 2

**Approval Format**:
```
I have reviewed the Q1 2025 access review and confirm:
- All users have appropriate access for their roles
- Terminated users have been deprovisioned within 24 hours
- Privileged access is limited and justified
- Service accounts follow least-privilege principles

Signed: [Name]
Date: [YYYY-MM-DD]
Role: [Title]
```

---

## Automated Checks

Schedule quarterly access review automation:

```yaml
# .github/workflows/access-review.yml
name: Quarterly Access Review
on:
  schedule:
    - cron: '0 0 1 1,4,7,10 *'  # Jan 1, Apr 1, Jul 1, Oct 1

jobs:
  access-review:
    runs-on: ubuntu-latest
    steps:
      - name: Export K8s access
        run: kubectl get rolebindings -n teei-prod -o yaml > k8s-access.yaml

      - name: Export AWS IAM users
        run: aws iam list-users > aws-iam-users.json

      - name: Create GitHub issue
        run: |
          gh issue create \
            --title "Q$(date +%q) $(date +%Y) Access Review" \
            --body "Quarterly access review due. See checklist: /ops/security/access-review-checklist.md" \
            --label "compliance,soc2" \
            --assignee "security-lead"
```

---

## References

- [SOC 2 Trust Services Criteria](https://www.aicpa.org/resources/download/trust-services-criteria)
- [NIST Access Control Guidelines](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [Least Privilege Principles](https://www.cisa.gov/uscert/bsi/articles/knowledge/principles/least-privilege)
