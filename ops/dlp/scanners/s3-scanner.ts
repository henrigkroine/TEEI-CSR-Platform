/**
 * DLP Scanner for S3/MinIO
 * Weekly scheduled scan for sensitive data in object storage
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { parse as parseYAML } from 'yaml';
import { createReadStream, readFileSync } from 'fs';
import { Readable } from 'stream';

interface DLPPattern {
  id: string;
  name: string;
  category: 'pii' | 'financial' | 'health' | 'secret' | 'technical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  regex: string;
  description: string;
  context_keywords?: string[];
}

interface DLPPolicies {
  patterns: DLPPattern[];
  actions: Array<{ name: string; description: string }>;
  thresholds: Record<string, { action: string; alert_immediately: boolean; notify: string[] }>;
}

interface ScanResult {
  bucket: string;
  key: string;
  size: number;
  lastModified: Date;
  findings: Array<{
    patternId: string;
    patternName: string;
    category: string;
    severity: string;
    matchCount: number;
    preview: string; // First 50 chars of match (redacted)
  }>;
  actionsTaken: string[];
}

export class S3DLPScanner {
  private s3Client: S3Client;
  private policies: DLPPolicies;
  private quarantineBucket: string;

  constructor(
    s3Config: { region: string; endpoint?: string; credentials?: any },
    policyPath: string,
    quarantineBucket: string,
  ) {
    this.s3Client = new S3Client(s3Config);
    this.quarantineBucket = quarantineBucket;

    // Load DLP policies from YAML
    const policyYaml = readFileSync(policyPath, 'utf-8');
    this.policies = parseYAML(policyYaml) as DLPPolicies;
  }

  /**
   * Scan entire bucket for sensitive data
   */
  async scanBucket(bucket: string, prefix?: string): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    // List all objects in bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await this.s3Client.send(listCommand);
    const objects = response.Contents || [];

    console.log(`[DLP] Scanning ${objects.length} objects in bucket: ${bucket}`);

    // Scan each object
    for (const obj of objects) {
      if (!obj.Key) continue;

      try {
        const scanResult = await this.scanObject(bucket, obj.Key);
        results.push(scanResult);

        // Take action if findings detected
        if (scanResult.findings.length > 0) {
          await this.handleFindings(scanResult);
        }
      } catch (error) {
        console.error(`[DLP] Failed to scan ${obj.Key}:`, error);
      }
    }

    return results;
  }

  /**
   * Scan single object for sensitive data
   */
  async scanObject(bucket: string, key: string): Promise<ScanResult> {
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.s3Client.send(getCommand);

    // Read object content
    const content = await this.streamToString(response.Body as Readable);

    const findings: ScanResult['findings'] = [];

    // Test each pattern
    for (const pattern of this.policies.patterns) {
      const regex = new RegExp(pattern.regex, 'g');
      const matches = content.match(regex);

      if (matches && matches.length > 0) {
        // Check context keywords if specified
        if (pattern.context_keywords) {
          const hasContext = pattern.context_keywords.some((keyword) =>
            content.toLowerCase().includes(keyword.toLowerCase()),
          );
          if (!hasContext) continue; // Skip if no context match
        }

        findings.push({
          patternId: pattern.id,
          patternName: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
          matchCount: matches.length,
          preview: this.redactMatch(matches[0]),
        });
      }
    }

    return {
      bucket,
      key,
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      findings,
      actionsTaken: [],
    };
  }

  /**
   * Handle findings based on severity
   */
  private async handleFindings(scanResult: ScanResult): Promise<void> {
    const maxSeverity = this.getMaxSeverity(scanResult.findings);
    const threshold = this.policies.thresholds[maxSeverity];

    if (!threshold) return;

    const actions: string[] = [];

    // Quarantine if critical
    if (threshold.action === 'quarantine') {
      await this.quarantineObject(scanResult.bucket, scanResult.key);
      actions.push('quarantined');
    }

    // Alert if needed
    if (threshold.alert_immediately) {
      await this.sendAlert(scanResult, threshold.notify);
      actions.push('alert_sent');
    }

    scanResult.actionsTaken = actions;

    // Log to audit trail
    console.warn('[DLP FINDING]', {
      bucket: scanResult.bucket,
      key: scanResult.key,
      severity: maxSeverity,
      findingsCount: scanResult.findings.length,
      actions,
    });
  }

  /**
   * Move object to quarantine bucket
   */
  private async quarantineObject(bucket: string, key: string): Promise<void> {
    const copyCommand = new CopyObjectCommand({
      Bucket: this.quarantineBucket,
      CopySource: `${bucket}/${key}`,
      Key: `quarantine/${new Date().toISOString()}/${key}`,
      MetadataDirective: 'COPY',
      TaggingDirective: 'COPY',
    });

    await this.s3Client.send(copyCommand);
    console.log(`[DLP] Quarantined: ${bucket}/${key} -> ${this.quarantineBucket}`);
  }

  /**
   * Send alert to security team
   */
  private async sendAlert(scanResult: ScanResult, recipients: string[]): Promise<void> {
    // Integration point for Slack, email, PagerDuty
    console.warn('[DLP ALERT]', {
      recipients,
      bucket: scanResult.bucket,
      key: scanResult.key,
      findings: scanResult.findings.map((f) => ({
        pattern: f.patternName,
        severity: f.severity,
        count: f.matchCount,
      })),
    });

    // TODO: Implement actual alerting (Slack webhook, email, etc.)
  }

  /**
   * Get maximum severity from findings
   */
  private getMaxSeverity(findings: ScanResult['findings']): 'low' | 'medium' | 'high' | 'critical' {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    let maxSeverity = 'low';
    let maxOrder = 0;

    for (const finding of findings) {
      const order = severityOrder[finding.severity as keyof typeof severityOrder];
      if (order > maxOrder) {
        maxOrder = order;
        maxSeverity = finding.severity;
      }
    }

    return maxSeverity as 'low' | 'medium' | 'high' | 'critical';
  }

  /**
   * Redact match for preview (show first 10 chars, rest as X)
   */
  private redactMatch(match: string): string {
    if (match.length <= 10) return 'X'.repeat(match.length);
    return match.substring(0, 10) + 'X'.repeat(Math.min(match.length - 10, 40));
  }

  /**
   * Convert stream to string
   */
  private async streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  /**
   * Generate scan report
   */
  generateReport(results: ScanResult[]): {
    totalObjects: number;
    objectsWithFindings: number;
    findingsByCategory: Record<string, number>;
    findingsBySeverity: Record<string, number>;
    topPatterns: Array<{ patternName: string; count: number }>;
  } {
    const objectsWithFindings = results.filter((r) => r.findings.length > 0);

    const findingsByCategory: Record<string, number> = {};
    const findingsBySeverity: Record<string, number> = {};
    const patternCounts: Record<string, number> = {};

    for (const result of objectsWithFindings) {
      for (const finding of result.findings) {
        findingsByCategory[finding.category] = (findingsByCategory[finding.category] || 0) + 1;
        findingsBySeverity[finding.severity] = (findingsBySeverity[finding.severity] || 0) + 1;
        patternCounts[finding.patternName] = (patternCounts[finding.patternName] || 0) + finding.matchCount;
      }
    }

    const topPatterns = Object.entries(patternCounts)
      .map(([name, count]) => ({ patternName: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalObjects: results.length,
      objectsWithFindings: objectsWithFindings.length,
      findingsByCategory,
      findingsBySeverity,
      topPatterns,
    };
  }
}

/**
 * CLI entry point for scheduled scans
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const scanner = new S3DLPScanner(
    {
      region: process.env.AWS_REGION || 'eu-west-1',
      endpoint: process.env.S3_ENDPOINT, // For MinIO
    },
    '/home/user/TEEI-CSR-Platform/ops/dlp/policies/pii-patterns.yml',
    process.env.QUARANTINE_BUCKET || 'teei-quarantine',
  );

  const bucket = process.env.SCAN_BUCKET || 'teei-data';

  console.log(`[DLP] Starting scan of bucket: ${bucket}`);

  scanner
    .scanBucket(bucket)
    .then((results) => {
      const report = scanner.generateReport(results);
      console.log('[DLP] Scan complete:', report);
    })
    .catch((error) => {
      console.error('[DLP] Scan failed:', error);
      process.exit(1);
    });
}
