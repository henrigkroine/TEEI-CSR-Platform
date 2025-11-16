# NLQ Security Test Suite

Comprehensive security tests for the Natural Language Query (NLQ) system's 12-point safety guardrails.

## Quick Start

```bash
# Run all security tests
pnpm test tests/security/

# Run specific test file
pnpm test tests/security/nlq-injection.test.ts

# Run with coverage
pnpm test:coverage tests/security/
```

## Test Files

| File | Lines | Tests | Coverage |
|------|-------|-------|----------|
| nlq-injection.test.ts | 719 | 45+ | SQL Injection |
| nlq-exfiltration.test.ts | 765 | 38+ | Data Exfiltration |
| nlq-tenant-isolation.test.ts | 734 | 32+ | Tenant Isolation |
| nlq-pii-protection.test.ts | 855 | 36+ | PII Protection |
| nlq-prompt-injection.test.ts | 653 | 52+ | Prompt Injection |
| nlq-dos.test.ts | 710 | 28+ | DoS/Performance |

**Total**: 5,082 lines, 231+ tests, 150+ attack vectors

## What Gets Tested

### 1. SQL Injection Prevention
- Classic injection (DROP, DELETE, UPDATE, INSERT)
- UNION-based attacks
- Boolean blind (OR 1=1)
- Time-based blind (pg_sleep)
- Comment injection
- Stacked queries

### 2. Data Exfiltration Prevention
- File writing (INTO OUTFILE, COPY TO)
- File reading (pg_read_file, LOAD_FILE)
- Network exfiltration (dblink)
- Large object manipulation (lo_export)
- Command execution (system, shell, exec)

### 3. Tenant Isolation
- Missing companyId filter detection
- OR clause bypass prevention
- Cross-tenant access attempts
- Subquery isolation
- JOIN-based boundary violations

### 4. PII Protection
- 21 PII columns protected
- Email, phone, address fields
- Government IDs (SSN, passport)
- Financial data (credit cards)
- Name fields, IP addresses

### 5. Prompt Injection Resistance
- Jailbreak attempts
- Role confusion attacks
- System prompt leaking
- Intent manipulation
- Context poisoning

### 6. DoS Prevention
- Query bombs (nesting >3 levels)
- Cartesian products
- Excessive time windows (>730 days)
- Excessive row limits (>10,000)
- Resource-intensive aggregations

## Expected Results

**ALL TESTS SHOULD PASS** - meaning all attacks are successfully blocked.

## Security Violations

Tests validate these violation codes are raised:

- `INJ_001` - SQL injection detected
- `EXFIL_001` - Data exfiltration pattern detected
- `TNT_001` - Missing/incorrect tenant filter
- `TNT_002` - Tenant filter bypass attempt
- `PII_001` - PII column access attempt
- `FUNC_001` - Dangerous function detected
- `LIMIT_001` - Missing LIMIT clause
- `LIMIT_002` - LIMIT too high
- `TIME_001` - Time window exceeds limit
- `NEST_001` - Nested query depth exceeded
- `UNION_001` - UNION injection detected
- `CMT_001` - SQL comments detected
- `TBL_001` - Unauthorized table access
- `JOIN_001` - Unauthorized join

## Integration with CI/CD

These tests should run on every commit and PR:

```yaml
- name: Security Tests
  run: pnpm test tests/security/
```

## Documentation

See `SECURITY_TEST_SUMMARY.md` for comprehensive documentation including:
- Detailed test coverage breakdown
- Attack vector matrix
- Expected vs actual behavior
- Security recommendations
- Monitoring metrics
- Maintenance guidelines

## Contact

Created by: **security-nlq-tester** specialist agent
Date: 2025-11-16
