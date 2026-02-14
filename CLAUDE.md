# CLAUDE RULES FOR TEEI CSR PLATFORM

## 🌐 DEV TUNNEL URLs (USE THESE FOR TESTING)

**ALWAYS use these tunnel URLs for external testing (Cursor, Playwright, etc.):**

| Project | Tunnel URL | Local Port |
|---------|------------|------------|
| TEEI Astro | https://dev.theeducationalequalityinstitute.org | 4421 |
| YPAI Astro | https://dev-ypai.theeducationalequalityinstitute.org | 4422 |
| Apollo | https://dev-apollo.theeducationalequalityinstitute.org | 4423 |
| Buddy | https://dev-buddy.theeducationalequalityinstitute.org | 4424 |
| Grant CRM | https://dev-grant.theeducationalequalityinstitute.org | 6401 |
| **CSR Platform** | https://dev-csr.theeducationalequalityinstitute.org | 6410 |
| CSR Admin | https://dev-csr-admin.theeducationalequalityinstitute.org | 6411 |

**Why Tunnels?** WSL2 runs in a VM - Windows apps can't directly reach `localhost` ports.

**Tunnel Management:** `pm2 logs dev-tunnels` | `pm2 restart dev-tunnels`

---

## HARD SAFETY RULES

1. Do NOT deploy to production. I will run deploy commands manually.

2. Do NOT run deploy/publish/migrate/apply commands without my explicit approval.

3. Do NOT use any docs except those marked CANONICAL.

## SINGLE SOURCES OF TRUTH

- Canonical docs: `docs/canonical/CANONICAL_*.md`

- Pipeline docs: `docs/pipeline/CANONICAL_PIPELINE__*.md`  

- Current state: `docs/CURRENT_STATE.md`

- AI navigation: `LLM_INDEX.md`

## NEVER USE

- Any file in `docs/_archived/`

- Any file with `old`, `backup`, `deprecated` in the name

## TRUST HIERARCHY

1. Live code

2. docs/canonical/CANONICAL_*.md

3. docs/pipeline/CANONICAL_PIPELINE__*.md

4. docs/CURRENT_STATE.md

5. Feature docs (docs/features/)


## Git Safety Rules
- READ-ONLY commands ALLOWED: git log, git show, git diff, git status, git branch
- FORBIDDEN: git reset --hard, git checkout -- ., git clean -fd, git push --force, git branch -D
- git add, git commit, git push are ALLOWED only when explicitly requested
- NEVER force push. NEVER reset. NEVER rebase without explicit approval.
- Before ANY destructive file changes: git add -A && git commit -m "checkpoint"
- Use /rewind for session recovery instead of destructive git commands
