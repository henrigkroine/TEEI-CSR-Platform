/**
 * CSP Violation Reporting Endpoint - Worker 3 Phase D
 *
 * Receives and logs Content Security Policy violation reports
 * Forwards violations to Worker 1 observability stack for monitoring
 *
 * Endpoint: POST /api/csp-reports
 */

import { Request, Response } from 'express';

/**
 * CSP Violation Report structure (as sent by browser)
 *
 * Spec: https://w3c.github.io/webappsec-csp/#violation-reports
 */
interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    referrer?: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    disposition?: 'enforce' | 'report';
    'blocked-uri': string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code': number;
    'script-sample'?: string;
  };
}

/**
 * Processed violation entry for logging
 */
interface ProcessedViolation {
  timestamp: string;
  documentUri: string;
  referrer?: string;
  violatedDirective: string;
  effectiveDirective: string;
  blockedUri: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
  scriptSample?: string;
  disposition: 'enforce' | 'report';
  statusCode: number;
  userAgent: string;
  clientIp: string;
  severity: 'critical' | 'warning' | 'info';
}

/**
 * Determine severity of CSP violation
 */
function determineSeverity(directive: string, blockedUri: string): 'critical' | 'warning' | 'info' {
  // Critical: Actual XSS attempts or dangerous violations
  if (
    directive.includes('script-src') &&
    (blockedUri === 'inline' || blockedUri.includes('javascript:'))
  ) {
    return 'critical';
  }

  // Critical: Eval usage (often indicates attack or misconfiguration)
  if (blockedUri === 'eval') {
    return 'critical';
  }

  // Warning: External script/style loading from unexpected sources
  if (
    (directive.includes('script-src') || directive.includes('style-src')) &&
    blockedUri.startsWith('http')
  ) {
    return 'warning';
  }

  // Info: Less critical violations (images, fonts, etc.)
  return 'info';
}

/**
 * Check if violation should be rate-limited (duplicate/spam)
 */
const violationCache = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // Max 10 identical violations per minute

function isRateLimited(violationKey: string): boolean {
  const now = Date.now();
  const lastSeen = violationCache.get(violationKey) || 0;

  if (now - lastSeen < RATE_LIMIT_WINDOW) {
    // Count violations
    const count = parseInt(violationKey.split(':')[1] || '0', 10);
    if (count >= RATE_LIMIT_MAX) {
      return true;
    }
  } else {
    // Reset counter
    violationCache.set(violationKey, now);
  }

  return false;
}

/**
 * Forward violation to Worker 1 observability stack
 *
 * This is a stub - implement actual forwarding based on Worker 1 API
 */
async function forwardToObservability(violation: ProcessedViolation): Promise<void> {
  try {
    // TODO: Implement actual API call to Worker 1
    // Example:
    // await fetch('https://observability.teei.io/api/logs/csp', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(violation),
    // });

    console.log('[CSP Report] Would forward to observability:', violation);
  } catch (error) {
    console.error('[CSP Report] Failed to forward to observability:', error);
  }
}

/**
 * Log violation to local logs (for debugging)
 */
function logViolation(violation: ProcessedViolation): void {
  const logLevel = violation.severity === 'critical' ? 'error' : violation.severity === 'warning' ? 'warn' : 'info';

  const message = `[CSP Violation] ${violation.violatedDirective} blocked ${violation.blockedUri}`;
  const context = {
    documentUri: violation.documentUri,
    sourceFile: violation.sourceFile,
    line: violation.lineNumber,
    column: violation.columnNumber,
    sample: violation.scriptSample?.substring(0, 100),
  };

  console[logLevel](message, context);
}

/**
 * CSP Report Handler
 *
 * Receives POST requests with CSP violation reports
 */
export async function handleCSPReport(req: Request, res: Response): Promise<void> {
  try {
    // Parse violation report
    const report: CSPViolationReport = req.body;

    if (!report || !report['csp-report']) {
      res.status(400).json({ error: 'Invalid CSP report format' });
      return;
    }

    const cspReport = report['csp-report'];

    // Extract client information
    const userAgent = req.get('User-Agent') || 'unknown';
    const clientIp = req.ip || req.get('X-Forwarded-For') || 'unknown';

    // Process violation
    const violation: ProcessedViolation = {
      timestamp: new Date().toISOString(),
      documentUri: cspReport['document-uri'],
      referrer: cspReport.referrer,
      violatedDirective: cspReport['violated-directive'],
      effectiveDirective: cspReport['effective-directive'],
      blockedUri: cspReport['blocked-uri'],
      sourceFile: cspReport['source-file'],
      lineNumber: cspReport['line-number'],
      columnNumber: cspReport['column-number'],
      scriptSample: cspReport['script-sample'],
      disposition: cspReport.disposition || 'enforce',
      statusCode: cspReport['status-code'],
      userAgent,
      clientIp,
      severity: determineSeverity(cspReport['effective-directive'], cspReport['blocked-uri']),
    };

    // Generate violation key for rate limiting
    const violationKey = `${violation.documentUri}:${violation.effectiveDirective}:${violation.blockedUri}`;

    // Check rate limiting
    if (isRateLimited(violationKey)) {
      console.log('[CSP Report] Rate limited duplicate violation');
      res.status(204).send(); // No content (accepted but rate-limited)
      return;
    }

    // Log violation locally
    logViolation(violation);

    // Forward to observability stack
    await forwardToObservability(violation);

    // Alert on critical violations (optional)
    if (violation.severity === 'critical') {
      console.error('[CSP Report] 🚨 CRITICAL VIOLATION DETECTED 🚨');
      // TODO: Implement alerting (e.g., PagerDuty, Slack)
    }

    // Respond with 204 No Content (standard for CSP reporting)
    res.status(204).send();
  } catch (error) {
    console.error('[CSP Report] Error processing violation report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * CSP Report Statistics Endpoint (optional)
 *
 * Returns aggregated statistics about CSP violations
 * Useful for monitoring dashboard
 */
export async function getCSPReportStats(req: Request, res: Response): Promise<void> {
  try {
    // TODO: Implement statistics aggregation
    // This would query a database or cache for violation statistics

    const stats = {
      totalViolations: 0,
      criticalViolations: 0,
      warningViolations: 0,
      infoViolations: 0,
      topViolatedDirectives: [],
      topBlockedUris: [],
      lastUpdated: new Date().toISOString(),
    };

    res.json(stats);
  } catch (error) {
    console.error('[CSP Report] Error fetching statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express route registration helper
 */
export function registerCSPReportRoutes(app: any): void {
  // CSP violation reporting endpoint
  app.post('/api/csp-reports', handleCSPReport);

  // CSP statistics endpoint (optional)
  app.get('/api/csp-reports/stats', getCSPReportStats);

  console.log('[CSP Report] Routes registered');
}

export default {
  handleCSPReport,
  getCSPReportStats,
  registerCSPReportRoutes,
};
