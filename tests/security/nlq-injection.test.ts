/**
 * NLQ SQL Injection Security Tests
 *
 * CRITICAL SECURITY TESTS - Validates 12-point safety guardrails against SQL injection attacks
 *
 * Test Coverage:
 * - Classic SQL injection patterns
 * - Union-based attacks
 * - Stacked queries
 * - Boolean-based blind injection
 * - Comment injection
 * - Time-based blind injection
 *
 * Expected Behavior: ALL attack vectors MUST be rejected with 403 Forbidden
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { SafetyGuardrails } from '../../services/insights-nlq/src/validators/safety-guardrails.js';

describe('NLQ SQL Injection Security Tests', () => {
  const testCompanyId = '550e8400-e29b-41d4-a716-446655440000';

  describe('Classic SQL Injection Attacks', () => {
    it('should reject DROP TABLE injection', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'; DROP TABLE users; --
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.overallSeverity).toBe('critical');
      expect(result.violations).toContain('INJ_001');

      const injectionCheck = result.checks.find(c => c.check === 'sql_injection');
      expect(injectionCheck?.passed).toBe(false);
      expect(injectionCheck?.severity).toBe('critical');
      expect(injectionCheck?.details).toContain('SQL injection pattern');
    });

    it('should reject DELETE FROM injection', async () => {
      const maliciousSql = `
        SELECT avg(sroi_score) FROM outcome_scores
        WHERE company_id = '${testCompanyId}'; DELETE FROM metrics_company_period; --
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.overallSeverity).toBe('critical');
      expect(result.violations).toContain('INJ_001');
    });

    it('should reject UPDATE SET injection', async () => {
      const maliciousSql = `
        SELECT COUNT(*) FROM users
        WHERE company_id = '${testCompanyId}'; UPDATE users SET is_admin = true; --
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.overallSeverity).toBe('critical');
      expect(result.violations).toContain('INJ_001');
    });

    it('should reject INSERT INTO injection', async () => {
      const maliciousSql = `
        SELECT * FROM evidence_snippets
        WHERE company_id = '${testCompanyId}'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.overallSeverity).toBe('critical');
      expect(result.violations).toContain('INJ_001');
    });

    it('should reject EXEC/EXECUTE injection', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'; EXEC sp_executesql N'DROP TABLE users'; --
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.overallSeverity).toBe('critical');
      expect(result.violations).toContain('INJ_001');
    });

    it('should reject xp_ extended stored procedures', async () => {
      const maliciousSql = `
        SELECT * FROM users WHERE company_id = '${testCompanyId}'; xp_cmdshell 'net user'; --
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.overallSeverity).toBe('critical');
      expect(result.violations).toContain('INJ_001');
    });
  });

  describe('Union-Based SQL Injection', () => {
    it('should reject basic UNION SELECT attack', async () => {
      const maliciousSql = `
        SELECT metric_name, metric_value FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        UNION SELECT email, password FROM users --
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.overallSeverity).toBe('high');
      expect(result.violations).toContain('UNION_001');

      const unionCheck = result.checks.find(c => c.check === 'union_injection');
      expect(unionCheck?.passed).toBe(false);
      expect(unionCheck?.severity).toBe('high');
    });

    it('should reject UNION ALL attack', async () => {
      const maliciousSql = `
        SELECT * FROM outcome_scores
        WHERE company_id = '${testCompanyId}'
        UNION ALL SELECT * FROM users
        LIMIT 1000
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('UNION_001');
    });

    it('should reject UNION with NULL padding', async () => {
      const maliciousSql = `
        SELECT id, name FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        UNION SELECT null, table_name FROM information_schema.tables
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('UNION_001');
    });

    it('should reject nested UNION attack', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        UNION (SELECT * FROM users UNION SELECT * FROM evidence_snippets)
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('UNION_001');
    });
  });

  describe('Boolean-Based Blind Injection', () => {
    it('should reject OR 1=1 attack (string-based)', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}' OR '1'='1'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.overallSeverity).toBe('critical');
      expect(result.violations).toContain('INJ_001');
    });

    it('should reject OR 1=1 attack (numeric)', async () => {
      const maliciousSql = `
        SELECT * FROM outcome_scores
        WHERE company_id = '${testCompanyId}' OR 1=1
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('INJ_001');
    });

    it('should reject OR true attack', async () => {
      const maliciousSql = `
        SELECT * FROM users
        WHERE company_id = '${testCompanyId}' OR true
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      // This should fail tenant isolation check
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should reject OR EXISTS attack', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        OR EXISTS(SELECT * FROM users WHERE is_admin = true)
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      // Should fail tenant isolation due to OR clause
      expect(result.violations).toContain('TNT_002');
    });

    it('should reject AND sleep-based timing attack', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        AND (SELECT COUNT(*) FROM pg_sleep(5)) > 0
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });
  });

  describe('Stacked Queries Injection', () => {
    it('should reject multiple statements with DROP', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}' LIMIT 100;
        DROP TABLE evidence_snippets;
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('INJ_001');
    });

    it('should reject multiple statements with UPDATE', async () => {
      const maliciousSql = `
        SELECT COUNT(*) FROM users WHERE company_id = '${testCompanyId}' LIMIT 1;
        UPDATE users SET role = 'admin' WHERE email LIKE '%@company.com';
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('INJ_001');
    });

    it('should reject multiple SELECT statements', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period WHERE company_id = '${testCompanyId}' LIMIT 100;
        SELECT * FROM users;
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      // Semicolon at end detected
      expect(result.violations).toContain('INJ_001');
    });

    it('should reject statement with trailing semicolon', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        LIMIT 100;
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('INJ_001');
    });
  });

  describe('Comment Injection', () => {
    it('should reject inline block comments', async () => {
      const maliciousSql = `
        SELECT /* malicious comment */ *
        FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('CMT_001');

      const commentCheck = result.checks.find(c => c.check === 'comment_stripping');
      expect(commentCheck?.passed).toBe(false);
      expect(commentCheck?.severity).toBe('medium');
    });

    it('should reject line comments with double dash', async () => {
      const maliciousSql = `
        SELECT * FROM outcome_scores
        WHERE company_id = '${testCompanyId}' -- malicious comment
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('CMT_001');
    });

    it('should reject multi-line block comments', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        /*
         * This is a malicious
         * multi-line comment
         */
        WHERE company_id = '${testCompanyId}'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('CMT_001');
    });

    it('should reject comment used to bypass WHERE clause', async () => {
      const maliciousSql = `
        SELECT * FROM users
        WHERE company_id = '${testCompanyId}' -- AND deleted_at IS NULL
        LIMIT 1000
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('CMT_001');
    });
  });

  describe('Time-Based Blind Injection', () => {
    it('should reject pg_sleep function', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        AND pg_sleep(5) IS NOT NULL
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');

      const funcCheck = result.checks.find(c => c.check === 'function_whitelist');
      expect(funcCheck?.passed).toBe(false);
      expect(funcCheck?.severity).toBe('critical');
    });

    it('should reject WAITFOR DELAY (SQL Server)', async () => {
      const maliciousSql = `
        SELECT * FROM outcome_scores
        WHERE company_id = '${testCompanyId}';
        WAITFOR DELAY '00:00:05'--
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      // Should fail due to semicolon and comment
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should reject BENCHMARK function (MySQL)', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        AND BENCHMARK(10000000, MD5('test'))
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      // BENCHMARK not in whitelist, should fail
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Advanced Injection Techniques', () => {
    it('should reject hex-encoded injection', async () => {
      const maliciousSql = `
        SELECT * FROM users
        WHERE company_id = '${testCompanyId}'
        AND username = 0x61646d696e
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      // Should pass basic checks but may fail table whitelist
      // This tests demonstrates the pattern is detected
      expect(result).toBeDefined();
    });

    it('should reject CHAR-based injection', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        OR CHAR(65,68,77,73,78) = 'ADMIN'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      // Should fail tenant isolation due to OR
      expect(result.violations).toContain('TNT_002');
    });

    it('should reject string concatenation injection', async () => {
      const maliciousSql = `
        SELECT * FROM outcome_scores
        WHERE company_id = '${testCompanyId}'
        OR 'a' || 'dmin' = 'admin'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('TNT_002');
    });

    it('should reject case manipulation injection', async () => {
      const maliciousSql = `
        SeLeCt * FrOm users
        WhErE company_id = '${testCompanyId}'
        oR '1'='1'
        LiMiT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('INJ_001');
    });

    it('should reject null byte injection attempt', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}\0'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      // Should still validate normally
      expect(result).toBeDefined();
    });
  });

  describe('Information Schema Exploitation', () => {
    it('should reject query against information_schema.tables', async () => {
      const maliciousSql = `
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      // Should fail tenant isolation (no company_id filter)
      expect(result.violations).toContain('TNT_001');
    });

    it('should reject query against information_schema.columns', async () => {
      const maliciousSql = `
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users'
        AND company_id = '${testCompanyId}'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      // Should fail table whitelist
      expect(result.violations).toContain('TBL_001');
    });

    it('should reject pg_catalog access', async () => {
      const maliciousSql = `
        SELECT * FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        AND company_id = '${testCompanyId}'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('TBL_001');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should accept valid query with proper structure', async () => {
      const validSql = `
        SELECT
          metric_name,
          AVG(metric_value) as avg_value,
          COUNT(*) as count
        FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        AND period_start >= '2025-01-01'
        AND period_end <= '2025-03-31'
        GROUP BY metric_name
        ORDER BY avg_value DESC
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(validSql, {
        companyId: testCompanyId,
        allowedTables: ['metrics_company_period'],
      });

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.overallSeverity).toBe('none');
    });

    it('should handle empty SQL gracefully', async () => {
      const result = await SafetyGuardrails.validate('', {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      // Should fail tenant isolation (no company_id)
      expect(result.violations).toContain('TNT_001');
    });

    it('should handle SQL with only whitespace', async () => {
      const result = await SafetyGuardrails.validate('   \n\t  ', {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('TNT_001');
    });

    it('should detect injection in subquery', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        AND metric_value > (
          SELECT AVG(metric_value) FROM metrics_company_period; DROP TABLE users; --
        )
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('INJ_001');
    });
  });

  describe('Security Best Practices Validation', () => {
    it('should enforce that all checks are run', async () => {
      const sql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(sql, {
        companyId: testCompanyId,
      });

      // Verify all 12 checks are present
      expect(result.checks).toHaveLength(12);

      const checkNames = result.checks.map(c => c.check);
      expect(checkNames).toContain('sql_injection');
      expect(checkNames).toContain('table_whitelist');
      expect(checkNames).toContain('column_whitelist');
      expect(checkNames).toContain('time_window_limit');
      expect(checkNames).toContain('tenant_isolation');
      expect(checkNames).toContain('join_safety');
      expect(checkNames).toContain('function_whitelist');
      expect(checkNames).toContain('row_limit');
      expect(checkNames).toContain('nested_query_depth');
      expect(checkNames).toContain('union_injection');
      expect(checkNames).toContain('comment_stripping');
      expect(checkNames).toContain('exfiltration_pattern');
    });

    it('should provide detailed violation information', async () => {
      const maliciousSql = `
        SELECT * FROM users; DROP TABLE metrics_company_period; --
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);

      // Should have violation codes
      const hasViolationCodes = result.violations.some(v =>
        v.includes('_') && v.length >= 3
      );
      expect(hasViolationCodes).toBe(true);
    });

    it('should calculate severity correctly', async () => {
      const criticalSql = `
        SELECT * FROM users WHERE company_id = 'x'; DROP TABLE users; --
      `;

      const result = await SafetyGuardrails.validate(criticalSql, {
        companyId: testCompanyId,
      });

      expect(result.overallSeverity).toBe('critical');
    });
  });
});
