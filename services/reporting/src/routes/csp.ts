import type { FastifyPluginAsync } from 'fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * CSP Violation Report Type
 * Based on the CSP Level 3 specification
 * @see https://www.w3.org/TR/CSP3/#violation-reports
 */
interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'disposition': 'enforce' | 'report';
    'blocked-uri': string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code'?: number;
    'script-sample'?: string;
  };
}

/**
 * CSP Report-To Format (newer format)
 * @see https://w3c.github.io/reporting/#examples
 */
interface CSPReportTo {
  type: 'csp-violation';
  url: string;
  age: number;
  user_agent: string;
  body: {
    documentURL: string;
    violatedDirective: string;
    effectiveDirective: string;
    originalPolicy: string;
    disposition: 'enforce' | 'report';
    blockedURL: string;
    lineNumber?: number;
    columnNumber?: number;
    sourceFile?: string;
    statusCode?: number;
    sample?: string;
  };
}

/**
 * Normalized CSP violation for logging
 */
interface NormalizedCSPViolation {
  timestamp: string;
  documentUrl: string;
  violatedDirective: string;
  effectiveDirective: string;
  blockedUri: string;
  disposition: 'enforce' | 'report';
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
  scriptSample?: string;
  userAgent: string;
  ip: string;
}

/**
 * Normalize CSP report to a consistent format
 */
function normalizeCSPReport(
  report: CSPViolationReport | CSPReportTo,
  request: FastifyRequest
): NormalizedCSPViolation {
  // Handle legacy csp-report format
  if ('csp-report' in report) {
    const cspReport = report['csp-report'];
    return {
      timestamp: new Date().toISOString(),
      documentUrl: cspReport['document-uri'],
      violatedDirective: cspReport['violated-directive'],
      effectiveDirective: cspReport['effective-directive'],
      blockedUri: cspReport['blocked-uri'],
      disposition: cspReport.disposition,
      sourceFile: cspReport['source-file'],
      lineNumber: cspReport['line-number'],
      columnNumber: cspReport['column-number'],
      scriptSample: cspReport['script-sample'],
      userAgent: request.headers['user-agent'] || 'unknown',
      ip: (request.ip || 'unknown'),
    };
  }

  // Handle Report-To format
  if ('type' in report && report.type === 'csp-violation') {
    const body = report.body;
    return {
      timestamp: new Date().toISOString(),
      documentUrl: body.documentURL,
      violatedDirective: body.violatedDirective,
      effectiveDirective: body.effectiveDirective,
      blockedUri: body.blockedURL,
      disposition: body.disposition,
      sourceFile: body.sourceFile,
      lineNumber: body.lineNumber,
      columnNumber: body.columnNumber,
      scriptSample: body.sample,
      userAgent: report.user_agent,
      ip: (request.ip || 'unknown'),
    };
  }

  throw new Error('Invalid CSP report format');
}

/**
 * Check if the violation is likely a false positive
 */
function isFalsePositive(violation: NormalizedCSPViolation): boolean {
  const blockedUri = violation.blockedUri.toLowerCase();

  // Common browser extensions that trigger CSP violations
  const browserExtensions = [
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    'ms-browser-extension://',
  ];

  if (browserExtensions.some(ext => blockedUri.startsWith(ext))) {
    return true;
  }

  // Common third-party scripts that are known to be safe
  // (these should be whitelisted in CSP instead)
  const knownSafeThirdParty = [
    'about:blank',
    'about:srcdoc',
    'data:',
  ];

  if (knownSafeThirdParty.some(prefix => blockedUri.startsWith(prefix))) {
    return true;
  }

  return false;
}

/**
 * Determine severity of the violation
 */
function getViolationSeverity(violation: NormalizedCSPViolation): 'low' | 'medium' | 'high' | 'critical' {
  const directive = violation.effectiveDirective;

  // Critical: script-src violations (XSS risk)
  if (directive === 'script-src' || directive === 'script-src-elem') {
    return 'critical';
  }

  // High: style-src violations (data exfiltration risk)
  if (directive === 'style-src' || directive === 'style-src-elem') {
    return 'high';
  }

  // Medium: connect-src violations (data leakage risk)
  if (directive === 'connect-src') {
    return 'medium';
  }

  // Low: other directives (img-src, font-src, etc.)
  return 'low';
}

/**
 * Forward CSP violation to Worker-1 logging service
 * In production, this would send to an external logging service
 */
async function forwardToWorker1(violation: NormalizedCSPViolation, fastify: any): Promise<void> {
  try {
    // In production, replace this with actual Worker-1 API call
    // For now, we'll log to Fastify's logger which can be configured to forward to external services

    const severity = getViolationSeverity(violation);

    fastify.log.warn({
      type: 'csp-violation',
      severity,
      violation,
    }, `CSP Violation: ${violation.effectiveDirective} blocked ${violation.blockedUri}`);

    // Example Worker-1 API call (uncomment in production):
    /*
    await fetch('https://worker1.teei-platform.com/api/security/csp-violations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WORKER1_API_KEY}`,
      },
      body: JSON.stringify(violation),
    });
    */
  } catch (error) {
    fastify.log.error('Failed to forward CSP violation to Worker-1:', error);
  }
}

/**
 * CSP violation report endpoint
 */
export const cspRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/csp-report
   * Receives CSP violation reports from browsers
   */
  fastify.post(
    '/api/csp-report',
    {
      schema: {
        description: 'Receive Content Security Policy violation reports',
        tags: ['security'],
        body: {
          type: 'object',
          additionalProperties: true, // CSP reports have varying formats
        },
        response: {
          204: {
            type: 'null',
            description: 'Report received successfully',
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const report = request.body as CSPViolationReport | CSPReportTo;

        // Normalize the report
        const violation = normalizeCSPReport(report, request);

        // Filter out false positives
        if (isFalsePositive(violation)) {
          fastify.log.debug('CSP violation filtered as false positive:', violation);
          return reply.code(204).send();
        }

        // Log the violation
        const severity = getViolationSeverity(violation);
        fastify.log.info({
          type: 'csp-violation',
          severity,
          violation,
        });

        // Forward to Worker-1 (async, don't wait)
        forwardToWorker1(violation, fastify).catch(error => {
          fastify.log.error('Failed to forward CSP violation:', error);
        });

        // Send 204 No Content (standard response for report endpoints)
        return reply.code(204).send();
      } catch (error) {
        fastify.log.error('Error processing CSP report:', error);
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Invalid CSP report format',
        });
      }
    }
  );

  /**
   * GET /api/csp-report/stats
   * Get CSP violation statistics (for admin dashboard)
   */
  fastify.get(
    '/api/csp-report/stats',
    {
      schema: {
        description: 'Get CSP violation statistics',
        tags: ['security'],
        response: {
          200: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              bySeverity: {
                type: 'object',
                properties: {
                  critical: { type: 'number' },
                  high: { type: 'number' },
                  medium: { type: 'number' },
                  low: { type: 'number' },
                },
              },
              byDirective: {
                type: 'object',
                additionalProperties: { type: 'number' },
              },
              recentViolations: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // In production, this would query a database or logging service
      // For now, return mock data

      return reply.send({
        total: 0,
        bySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        byDirective: {
          'script-src': 0,
          'style-src': 0,
          'img-src': 0,
          'connect-src': 0,
        },
        recentViolations: [],
      });
    }
  );

  /**
   * GET /api/csp-report/health
   * Health check for CSP reporting endpoint
   */
  fastify.get(
    '/api/csp-report/health',
    {
      schema: {
        description: 'Health check for CSP reporting',
        tags: ['security'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    }
  );
};
