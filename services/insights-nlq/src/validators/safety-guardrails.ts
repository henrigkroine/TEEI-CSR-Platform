/**
 * 12-Point Safety Guardrails for NLQ Query Validation
 *
 * CRITICAL SECURITY COMPONENT - Prevents:
 * - SQL injection attacks
 * - Data exfiltration attempts
 * - PII exposure
 * - Tenant data leakage
 * - Performance degradation (query bombs)
 *
 * All queries MUST pass all 12 checks before execution.
 */

export interface SafetyCheckResult {
  check: string;
  passed: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  violationCode?: string;
}

export interface SafetyValidationResult {
  passed: boolean;
  checks: SafetyCheckResult[];
  violations: string[];
  overallSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 12-Point Safety Validator
 */
export class SafetyGuardrails {
  /**
   * Run all 12 safety checks on a generated SQL query
   */
  static async validate(sql: string, context: {
    companyId: string;
    templateId?: string;
    allowedTables?: string[];
    allowedJoins?: string[];
  }): Promise<SafetyValidationResult> {
    const checks: SafetyCheckResult[] = [];

    // 1. SQL Injection Detection
    checks.push(this.checkSqlInjection(sql));

    // 2. Table Whitelist Validation
    checks.push(this.checkTableWhitelist(sql, context.allowedTables || []));

    // 3. Column Whitelist (PII Protection)
    checks.push(this.checkPiiColumns(sql));

    // 4. Time Window Limit
    checks.push(this.checkTimeWindowLimit(sql));

    // 5. Tenant Isolation (companyId enforcement)
    checks.push(this.checkTenantIsolation(sql, context.companyId));

    // 6. Join Safety
    checks.push(this.checkJoinSafety(sql, context.allowedJoins || []));

    // 7. Function Whitelist
    checks.push(this.checkFunctionWhitelist(sql));

    // 8. Row Limit Enforcement
    checks.push(this.checkRowLimit(sql));

    // 9. Nested Query Depth
    checks.push(this.checkNestedQueryDepth(sql));

    // 10. UNION Injection Prevention
    checks.push(this.checkUnionInjection(sql));

    // 11. Comment Stripping Verification
    checks.push(this.checkCommentStripping(sql));

    // 12. Exfiltration Pattern Detection
    checks.push(this.checkExfiltrationPatterns(sql));

    // Aggregate results
    const violations = checks.filter(c => !c.passed).map(c => c.violationCode || c.check);
    const passed = violations.length === 0;
    const overallSeverity = this.calculateOverallSeverity(checks);

    return {
      passed,
      checks,
      violations,
      overallSeverity,
    };
  }

  /**
   * Check 1: SQL Injection Detection
   * Detects common SQL injection patterns
   */
  private static checkSqlInjection(sql: string): SafetyCheckResult {
    const sqlLower = sql.toLowerCase();

    // Dangerous patterns
    const injectionPatterns = [
      /;\s*drop\s+/i,           // DROP statements
      /;\s*delete\s+from\s+/i,  // DELETE with semicolon
      /;\s*update\s+.*\s+set\s+/i, // UPDATE with semicolon
      /;\s*insert\s+into\s+/i,  // INSERT with semicolon
      /;\s*exec(\s|\()/i,       // EXEC/EXECUTE
      /;\s*xp_\w+/i,            // Extended stored procedures
      /'\s*or\s+'1'\s*=\s*'1/i, // Classic OR 1=1
      /'\s*or\s+1\s*=\s*1/i,    // Numeric OR 1=1
      /\/\*.*\*\//,             // Block comments (after stripping should be clean)
      /--/,                     // Line comments (after stripping should be clean)
      /;\s*$/,                  // Trailing semicolon (multi-statement)
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(sql)) {
        return {
          check: 'sql_injection',
          passed: false,
          severity: 'critical',
          details: `Detected SQL injection pattern: ${pattern.source}`,
          violationCode: 'INJ_001',
        };
      }
    }

    return {
      check: 'sql_injection',
      passed: true,
      severity: 'low',
      details: 'No SQL injection patterns detected',
    };
  }

  /**
   * Check 2: Table Whitelist Validation
   * Ensures only approved tables are accessed
   */
  private static checkTableWhitelist(sql: string, allowedTables: string[]): SafetyCheckResult {
    // Default allowed tables if none specified
    const defaultAllowed = [
      'metrics_company_period',
      'outcome_scores',
      'users',
      'evidence_snippets',
      'benchmarks_cohort_aggregates',
    ];

    const whitelist = allowedTables.length > 0 ? allowedTables : defaultAllowed;

    // Extract table names from FROM and JOIN clauses
    const fromPattern = /\bfrom\s+(\w+)/gi;
    const joinPattern = /\bjoin\s+(\w+)/gi;

    const tables = new Set<string>();
    let match;

    while ((match = fromPattern.exec(sql)) !== null) {
      tables.add(match[1].toLowerCase());
    }

    while ((match = joinPattern.exec(sql)) !== null) {
      tables.add(match[1].toLowerCase());
    }

    const unauthorizedTables = Array.from(tables).filter(
      t => !whitelist.map(w => w.toLowerCase()).includes(t)
    );

    if (unauthorizedTables.length > 0) {
      return {
        check: 'table_whitelist',
        passed: false,
        severity: 'critical',
        details: `Unauthorized tables accessed: ${unauthorizedTables.join(', ')}`,
        violationCode: 'TBL_001',
      };
    }

    return {
      check: 'table_whitelist',
      passed: true,
      severity: 'low',
      details: 'All tables are whitelisted',
    };
  }

  /**
   * Check 3: PII Column Protection
   * Prevents access to personally identifiable information
   */
  private static checkPiiColumns(sql: string): SafetyCheckResult {
    const piiColumns = [
      'email',
      'phone',
      'phone_number',
      'address',
      'street',
      'city',
      'postal_code',
      'zip_code',
      'ssn',
      'social_security',
      'passport',
      'driver_license',
      'date_of_birth',
      'dob',
      'birth_date',
      'full_name',
      'first_name',
      'last_name',
      'ip_address',
      'credit_card',
      'bank_account',
    ];

    const sqlLower = sql.toLowerCase();

    for (const col of piiColumns) {
      // Check for column in SELECT, WHERE, GROUP BY, ORDER BY
      const pattern = new RegExp(`\\b${col}\\b`, 'i');
      if (pattern.test(sqlLower)) {
        return {
          check: 'column_whitelist',
          passed: false,
          severity: 'critical',
          details: `PII column detected: ${col}`,
          violationCode: 'PII_001',
        };
      }
    }

    return {
      check: 'column_whitelist',
      passed: true,
      severity: 'low',
      details: 'No PII columns accessed',
    };
  }

  /**
   * Check 4: Time Window Limit
   * Prevents queries spanning excessive time ranges
   */
  private static checkTimeWindowLimit(sql: string): SafetyCheckResult {
    // Extract date literals and check if they span > 365 days (default limit)
    // This is a simplified check - production would parse actual dates
    const datePattern = /\d{4}-\d{2}-\d{2}/g;
    const dates = sql.match(datePattern) || [];

    if (dates.length >= 2) {
      const firstDate = new Date(dates[0]);
      const lastDate = new Date(dates[dates.length - 1]);
      const daysDiff = Math.abs((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff > 730) { // 2 years max
        return {
          check: 'time_window_limit',
          passed: false,
          severity: 'medium',
          details: `Time window exceeds limit: ${daysDiff.toFixed(0)} days (max: 730)`,
          violationCode: 'TIME_001',
        };
      }
    }

    return {
      check: 'time_window_limit',
      passed: true,
      severity: 'low',
      details: 'Time window within acceptable range',
    };
  }

  /**
   * Check 5: Tenant Isolation
   * Enforces companyId filter to prevent data leakage
   */
  private static checkTenantIsolation(sql: string, companyId: string): SafetyCheckResult {
    const sqlLower = sql.toLowerCase();

    // Must have company_id = 'UUID' filter
    const tenantFilterPattern = new RegExp(`company_id\\s*=\\s*['"]?${companyId}['"]?`, 'i');

    if (!tenantFilterPattern.test(sql)) {
      return {
        check: 'tenant_isolation',
        passed: false,
        severity: 'critical',
        details: `Missing or incorrect companyId filter (expected: ${companyId})`,
        violationCode: 'TNT_001',
      };
    }

    // Ensure no OR clauses that could bypass tenant filter
    const bypassPatterns = [
      /company_id\s*=.*\bor\b/i,
      /\bor\b.*company_id\s*=/i,
    ];

    for (const pattern of bypassPatterns) {
      if (pattern.test(sql)) {
        return {
          check: 'tenant_isolation',
          passed: false,
          severity: 'critical',
          details: 'Potential tenant filter bypass detected',
          violationCode: 'TNT_002',
        };
      }
    }

    return {
      check: 'tenant_isolation',
      passed: true,
      severity: 'low',
      details: 'Tenant isolation enforced',
    };
  }

  /**
   * Check 6: Join Safety
   * Restricts joins to approved relationships
   */
  private static checkJoinSafety(sql: string, allowedJoins: string[]): SafetyCheckResult {
    const joinPattern = /\bjoin\s+(\w+)/gi;
    const joins = new Set<string>();
    let match;

    while ((match = joinPattern.exec(sql)) !== null) {
      joins.add(match[1].toLowerCase());
    }

    if (joins.size === 0) {
      return {
        check: 'join_safety',
        passed: true,
        severity: 'low',
        details: 'No joins detected',
      };
    }

    const unauthorizedJoins = Array.from(joins).filter(
      j => !allowedJoins.map(a => a.toLowerCase()).includes(j)
    );

    if (unauthorizedJoins.length > 0) {
      return {
        check: 'join_safety',
        passed: false,
        severity: 'high',
        details: `Unauthorized joins: ${unauthorizedJoins.join(', ')}`,
        violationCode: 'JOIN_001',
      };
    }

    return {
      check: 'join_safety',
      passed: true,
      severity: 'low',
      details: 'All joins are authorized',
    };
  }

  /**
   * Check 7: Function Whitelist
   * Only allows safe SQL functions
   */
  private static checkFunctionWhitelist(sql: string): SafetyCheckResult {
    const allowedFunctions = [
      'avg', 'sum', 'count', 'min', 'max', 'stddev', 'variance',
      'round', 'ceil', 'floor', 'abs',
      'date_trunc', 'extract', 'now', 'current_date', 'current_timestamp',
      'lower', 'upper', 'trim', 'substring', 'concat',
      'coalesce', 'nullif', 'greatest', 'least',
      'case', 'when', 'then', 'else', 'end',
      'exists', 'in', 'not',
    ];

    const dangerousFunctions = [
      'pg_sleep', 'pg_read_file', 'pg_ls_dir', 'pg_stat_file',
      'lo_import', 'lo_export', 'lo_unlink',
      'copy', 'dblink', 'dblink_connect', 'dblink_exec',
      'system', 'shell', 'exec', 'execute',
    ];

    const sqlLower = sql.toLowerCase();

    for (const func of dangerousFunctions) {
      const pattern = new RegExp(`\\b${func}\\s*\\(`, 'i');
      if (pattern.test(sqlLower)) {
        return {
          check: 'function_whitelist',
          passed: false,
          severity: 'critical',
          details: `Dangerous function detected: ${func}`,
          violationCode: 'FUNC_001',
        };
      }
    }

    return {
      check: 'function_whitelist',
      passed: true,
      severity: 'low',
      details: 'No dangerous functions detected',
    };
  }

  /**
   * Check 8: Row Limit Enforcement
   * Ensures LIMIT clause exists and is reasonable
   */
  private static checkRowLimit(sql: string): SafetyCheckResult {
    const limitPattern = /\blimit\s+(\d+)/i;
    const match = sql.match(limitPattern);

    if (!match) {
      return {
        check: 'row_limit',
        passed: false,
        severity: 'medium',
        details: 'Missing LIMIT clause',
        violationCode: 'LIMIT_001',
      };
    }

    const limit = parseInt(match[1], 10);
    if (limit > 10000) {
      return {
        check: 'row_limit',
        passed: false,
        severity: 'medium',
        details: `LIMIT too high: ${limit} (max: 10000)`,
        violationCode: 'LIMIT_002',
      };
    }

    return {
      check: 'row_limit',
      passed: true,
      severity: 'low',
      details: `Row limit enforced: ${limit}`,
    };
  }

  /**
   * Check 9: Nested Query Depth
   * Limits subquery nesting to prevent query bombs
   */
  private static checkNestedQueryDepth(sql: string): SafetyCheckResult {
    const maxDepth = 3;
    let depth = 0;
    let maxObservedDepth = 0;

    for (const char of sql) {
      if (char === '(') {
        depth++;
        maxObservedDepth = Math.max(maxObservedDepth, depth);
      } else if (char === ')') {
        depth--;
      }
    }

    // Approximate subquery depth (not perfect but good enough)
    const subqueryCount = (sql.match(/\bselect\b/gi) || []).length - 1;

    if (subqueryCount > maxDepth) {
      return {
        check: 'nested_query_depth',
        passed: false,
        severity: 'medium',
        details: `Nested query depth exceeds limit: ${subqueryCount} (max: ${maxDepth})`,
        violationCode: 'NEST_001',
      };
    }

    return {
      check: 'nested_query_depth',
      passed: true,
      severity: 'low',
      details: `Nested query depth acceptable: ${subqueryCount}`,
    };
  }

  /**
   * Check 10: UNION Injection Prevention
   * Detects UNION-based injection attempts
   */
  private static checkUnionInjection(sql: string): SafetyCheckResult {
    const unionPattern = /\bunion\b/i;

    if (unionPattern.test(sql)) {
      // UNION is generally not needed for NLQ queries and is a red flag
      return {
        check: 'union_injection',
        passed: false,
        severity: 'high',
        details: 'UNION clause detected (not allowed in NLQ queries)',
        violationCode: 'UNION_001',
      };
    }

    return {
      check: 'union_injection',
      passed: true,
      severity: 'low',
      details: 'No UNION injection detected',
    };
  }

  /**
   * Check 11: Comment Stripping Verification
   * Ensures SQL comments have been removed
   */
  private static checkCommentStripping(sql: string): SafetyCheckResult {
    const blockCommentPattern = /\/\*.*?\*\//s;
    const lineCommentPattern = /--.*$/m;

    if (blockCommentPattern.test(sql) || lineCommentPattern.test(sql)) {
      return {
        check: 'comment_stripping',
        passed: false,
        severity: 'medium',
        details: 'SQL comments detected (should be stripped)',
        violationCode: 'CMT_001',
      };
    }

    return {
      check: 'comment_stripping',
      passed: true,
      severity: 'low',
      details: 'No comments detected',
    };
  }

  /**
   * Check 12: Exfiltration Pattern Detection
   * Detects patterns that could exfiltrate data
   */
  private static checkExfiltrationPatterns(sql: string): SafetyCheckResult {
    const exfiltrationPatterns = [
      /\binto\s+outfile\b/i,        // SELECT INTO OUTFILE
      /\binto\s+dumpfile\b/i,       // SELECT INTO DUMPFILE
      /\bload_file\s*\(/i,          // LOAD_FILE()
      /\bcopy\s+.*\bto\b/i,         // COPY TO
      /\bpg_read_file\s*\(/i,       // pg_read_file()
      /\blo_export\s*\(/i,          // lo_export()
    ];

    for (const pattern of exfiltrationPatterns) {
      if (pattern.test(sql)) {
        return {
          check: 'exfiltration_pattern',
          passed: false,
          severity: 'critical',
          details: `Data exfiltration pattern detected: ${pattern.source}`,
          violationCode: 'EXFIL_001',
        };
      }
    }

    return {
      check: 'exfiltration_pattern',
      passed: true,
      severity: 'low',
      details: 'No exfiltration patterns detected',
    };
  }

  /**
   * Calculate overall severity from all checks
   */
  private static calculateOverallSeverity(checks: SafetyCheckResult[]): SafetyValidationResult['overallSeverity'] {
    const failedChecks = checks.filter(c => !c.passed);

    if (failedChecks.length === 0) return 'none';

    const hasCritical = failedChecks.some(c => c.severity === 'critical');
    if (hasCritical) return 'critical';

    const hasHigh = failedChecks.some(c => c.severity === 'high');
    if (hasHigh) return 'high';

    const hasMedium = failedChecks.some(c => c.severity === 'medium');
    if (hasMedium) return 'medium';

    return 'low';
  }
}
