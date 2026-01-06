/**
 * SMTP Domain Setup Helpers
 *
 * Features:
 * - Domain verification helpers
 * - DKIM/SPF record generation
 * - From-domain configuration per tenant
 * - Bounce and complaint handling
 * - Email reputation monitoring
 */

import crypto from 'crypto';
import { createServiceLogger } from '@teei/shared-utils';
import { getDb } from '@teei/shared-schema';
import { smtpDomains, emailReputationMetrics } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';

const logger = createServiceLogger('notifications:smtp-domain');

/**
 * SMTP domain configuration
 */
export interface SMTPDomainConfig {
  companyId: string;
  domain: string;
  fromEmail: string;
  fromName: string;
  dkimPublicKey?: string;
  dkimPrivateKey?: string;
  dkimSelector: string;
  verified: boolean;
  verificationToken?: string;
  reputationScore: number;
}

/**
 * DNS records for domain verification
 */
export interface DNSRecords {
  spf: {
    type: 'TXT';
    name: string;
    value: string;
  };
  dkim: {
    type: 'TXT';
    name: string;
    value: string;
  };
  dmarc: {
    type: 'TXT';
    name: string;
    value: string;
  };
  verification: {
    type: 'TXT';
    name: string;
    value: string;
  };
}

/**
 * Email reputation status
 */
export interface ReputationStatus {
  companyId: string;
  domain: string;
  score: number; // 0-100
  bounceRate: number;
  complaintRate: number;
  lastBounceAt?: Date;
  lastComplaintAt?: Date;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: string[];
}

/**
 * Generate DKIM key pair
 */
export function generateDKIMKeys(): {
  publicKey: string;
  privateKey: string;
  selector: string;
} {
  // Generate 2048-bit RSA key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // Generate selector (e.g., "teei20251115")
  const selector = `teei${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  return {
    publicKey,
    privateKey,
    selector,
  };
}

/**
 * Generate DNS records for domain
 */
export function generateDNSRecords(params: {
  domain: string;
  dkimPublicKey: string;
  dkimSelector: string;
  verificationToken: string;
  dmarcEmail: string;
}): DNSRecords {
  // Extract public key content (remove headers)
  const publicKeyContent = params.dkimPublicKey
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\n/g, '')
    .trim();

  // SPF record (allow SendGrid and other providers)
  const spfRecord = {
    type: 'TXT' as const,
    name: params.domain,
    value: 'v=spf1 include:sendgrid.net include:_spf.google.com ~all',
  };

  // DKIM record
  const dkimRecord = {
    type: 'TXT' as const,
    name: `${params.dkimSelector}._domainkey.${params.domain}`,
    value: `v=DKIM1; k=rsa; p=${publicKeyContent}`,
  };

  // DMARC record
  const dmarcRecord = {
    type: 'TXT' as const,
    name: `_dmarc.${params.domain}`,
    value: `v=DMARC1; p=quarantine; rua=mailto:${params.dmarcEmail}; ruf=mailto:${params.dmarcEmail}; fo=1`,
  };

  // Verification record
  const verificationRecord = {
    type: 'TXT' as const,
    name: `_teei-verify.${params.domain}`,
    value: params.verificationToken,
  };

  return {
    spf: spfRecord,
    dkim: dkimRecord,
    dmarc: dmarcRecord,
    verification: verificationRecord,
  };
}

/**
 * Generate verification token
 */
export function generateVerificationToken(domain: string): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .createHash('sha256')
    .update(`${domain}:${timestamp}:${random}`)
    .digest('hex');

  return `teei-verify=${hash.substring(0, 32)}`;
}

/**
 * Set up SMTP domain for a company
 */
export async function setupSMTPDomain(params: {
  companyId: string;
  domain: string;
  fromEmail: string;
  fromName: string;
  dmarcEmail: string;
}): Promise<{
  config: SMTPDomainConfig;
  dnsRecords: DNSRecords;
}> {
  try {
    const db = getDb();

    // Generate DKIM keys
    const { publicKey, privateKey, selector } = generateDKIMKeys();

    // Generate verification token
    const verificationToken = generateVerificationToken(params.domain);

    // Save to database
    const [domain] = await db
      .insert(smtpDomains)
      .values({
        companyId: params.companyId,
        domain: params.domain,
        fromEmail: params.fromEmail,
        fromName: params.fromName,
        dkimPublicKey: publicKey,
        dkimPrivateKey: privateKey,
        dkimSelector: selector,
        verified: false,
        verificationToken,
        reputationScore: 100,
      })
      .returning();

    // Generate DNS records
    const dnsRecords = generateDNSRecords({
      domain: params.domain,
      dkimPublicKey: publicKey,
      dkimSelector: selector,
      verificationToken,
      dmarcEmail: params.dmarcEmail,
    });

    logger.info('SMTP domain configured', {
      companyId: params.companyId,
      domain: params.domain,
    });

    return {
      config: {
        companyId: domain.companyId,
        domain: domain.domain,
        fromEmail: domain.fromEmail,
        fromName: domain.fromName,
        dkimPublicKey: domain.dkimPublicKey || undefined,
        dkimPrivateKey: domain.dkimPrivateKey || undefined,
        dkimSelector: domain.dkimSelector,
        verified: domain.verified,
        verificationToken: domain.verificationToken || undefined,
        reputationScore: domain.reputationScore,
      },
      dnsRecords,
    };
  } catch (error: any) {
    logger.error('Failed to setup SMTP domain:', error);
    throw error;
  }
}

/**
 * Verify domain by checking DNS records
 */
export async function verifyDomain(
  companyId: string,
  domain: string
): Promise<{ verified: boolean; errors: string[] }> {
  try {
    const db = getDb();

    // Get domain config
    const [domainConfig] = await db
      .select()
      .from(smtpDomains)
      .where(eq(smtpDomains.companyId, companyId))
      .where(eq(smtpDomains.domain, domain));

    if (!domainConfig) {
      return {
        verified: false,
        errors: ['Domain not configured'],
      };
    }

    const errors: string[] = [];

    // In production, you would use a DNS lookup library to verify:
    // 1. Verification TXT record exists
    // 2. SPF record is correct
    // 3. DKIM record is correct
    // 4. DMARC record exists

    // For now, we'll simulate verification
    // In production, use a library like 'dns' or 'dnspromises'
    const dns = await import('dns').then(m => m.promises);

    try {
      // Check verification record
      const txtRecords = await dns.resolveTxt(`_teei-verify.${domain}`);
      const verificationRecord = txtRecords
        .flat()
        .find(record => record === domainConfig.verificationToken);

      if (!verificationRecord) {
        errors.push('Verification TXT record not found');
      }

      // Check SPF record
      const spfRecords = await dns.resolveTxt(domain);
      const spfRecord = spfRecords
        .flat()
        .find(record => record.startsWith('v=spf1'));

      if (!spfRecord) {
        errors.push('SPF record not found');
      } else if (!spfRecord.includes('sendgrid.net')) {
        errors.push('SPF record missing SendGrid include');
      }

      // Check DKIM record
      const dkimRecords = await dns.resolveTxt(
        `${domainConfig.dkimSelector}._domainkey.${domain}`
      );
      const dkimRecord = dkimRecords
        .flat()
        .find(record => record.startsWith('v=DKIM1'));

      if (!dkimRecord) {
        errors.push('DKIM record not found');
      }

      // Check DMARC record
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
      const dmarcRecord = dmarcRecords
        .flat()
        .find(record => record.startsWith('v=DMARC1'));

      if (!dmarcRecord) {
        errors.push('DMARC record not found');
      }
    } catch (err: any) {
      logger.error('DNS verification failed:', err);
      errors.push(`DNS lookup failed: ${err.message}`);
    }

    const verified = errors.length === 0;

    // Update database
    if (verified) {
      await db
        .update(smtpDomains)
        .set({
          verified: true,
          updatedAt: new Date(),
        })
        .where(eq(smtpDomains.companyId, companyId))
        .where(eq(smtpDomains.domain, domain));

      logger.info('Domain verified', { companyId, domain });
    }

    return { verified, errors };
  } catch (error: any) {
    logger.error('Domain verification error:', error);
    return {
      verified: false,
      errors: [error.message],
    };
  }
}

/**
 * Handle email bounce
 */
export async function handleBounce(params: {
  companyId: string;
  domain: string;
  recipient: string;
  bounceType: 'hard' | 'soft';
  reason: string;
}): Promise<void> {
  try {
    const db = getDb();

    // Update reputation metrics
    await db
      .insert(emailReputationMetrics)
      .values({
        companyId: params.companyId,
        domain: params.domain,
        metricType: 'bounce',
        bounceType: params.bounceType,
        recipient: params.recipient,
        reason: params.reason,
      });

    // Update reputation score
    await updateReputationScore(params.companyId, params.domain);

    logger.info('Bounce recorded', {
      companyId: params.companyId,
      domain: params.domain,
      recipient: params.recipient,
      bounceType: params.bounceType,
    });
  } catch (error: any) {
    logger.error('Failed to handle bounce:', error);
  }
}

/**
 * Handle spam complaint
 */
export async function handleComplaint(params: {
  companyId: string;
  domain: string;
  recipient: string;
  reason?: string;
}): Promise<void> {
  try {
    const db = getDb();

    // Update reputation metrics
    await db
      .insert(emailReputationMetrics)
      .values({
        companyId: params.companyId,
        domain: params.domain,
        metricType: 'complaint',
        recipient: params.recipient,
        reason: params.reason || 'User marked as spam',
      });

    // Update reputation score
    await updateReputationScore(params.companyId, params.domain);

    logger.warn('Spam complaint recorded', {
      companyId: params.companyId,
      domain: params.domain,
      recipient: params.recipient,
    });
  } catch (error: any) {
    logger.error('Failed to handle complaint:', error);
  }
}

/**
 * Update reputation score based on bounce/complaint rates
 */
async function updateReputationScore(
  companyId: string,
  domain: string
): Promise<void> {
  try {
    const db = getDb();

    // Calculate bounce and complaint rates from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metrics = await db
      .select()
      .from(emailReputationMetrics)
      .where(eq(emailReputationMetrics.companyId, companyId))
      .where(eq(emailReputationMetrics.domain, domain));

    const recentMetrics = metrics.filter(
      m => new Date(m.createdAt) >= thirtyDaysAgo
    );

    const totalSent = recentMetrics.length;
    const bounces = recentMetrics.filter(m => m.metricType === 'bounce').length;
    const complaints = recentMetrics.filter(m => m.metricType === 'complaint').length;

    const bounceRate = totalSent > 0 ? (bounces / totalSent) * 100 : 0;
    const complaintRate = totalSent > 0 ? (complaints / totalSent) * 100 : 0;

    // Calculate score (100 - penalties)
    let score = 100;

    // Bounce rate penalties
    if (bounceRate > 10) score -= 40;
    else if (bounceRate > 5) score -= 20;
    else if (bounceRate > 2) score -= 10;

    // Complaint rate penalties (more severe)
    if (complaintRate > 0.5) score -= 50;
    else if (complaintRate > 0.3) score -= 30;
    else if (complaintRate > 0.1) score -= 15;

    score = Math.max(0, Math.min(100, score));

    // Update domain reputation score
    await db
      .update(smtpDomains)
      .set({
        reputationScore: score,
        updatedAt: new Date(),
      })
      .where(eq(smtpDomains.companyId, companyId))
      .where(eq(smtpDomains.domain, domain));

    logger.info('Reputation score updated', {
      companyId,
      domain,
      score,
      bounceRate: bounceRate.toFixed(2),
      complaintRate: complaintRate.toFixed(2),
    });
  } catch (error: any) {
    logger.error('Failed to update reputation score:', error);
  }
}

/**
 * Get email reputation status
 */
export async function getReputationStatus(
  companyId: string,
  domain: string
): Promise<ReputationStatus> {
  try {
    const db = getDb();

    // Get domain config
    const [domainConfig] = await db
      .select()
      .from(smtpDomains)
      .where(eq(smtpDomains.companyId, companyId))
      .where(eq(smtpDomains.domain, domain));

    if (!domainConfig) {
      throw new Error('Domain not found');
    }

    // Get recent metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metrics = await db
      .select()
      .from(emailReputationMetrics)
      .where(eq(emailReputationMetrics.companyId, companyId))
      .where(eq(emailReputationMetrics.domain, domain));

    const recentMetrics = metrics.filter(
      m => new Date(m.createdAt) >= thirtyDaysAgo
    );

    const totalSent = recentMetrics.length;
    const bounces = recentMetrics.filter(m => m.metricType === 'bounce');
    const complaints = recentMetrics.filter(m => m.metricType === 'complaint');

    const bounceRate = totalSent > 0 ? (bounces.length / totalSent) * 100 : 0;
    const complaintRate = totalSent > 0 ? (complaints.length / totalSent) * 100 : 0;

    const lastBounce = bounces.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    const lastComplaint = complaints.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    // Determine status
    let status: ReputationStatus['status'] = 'excellent';
    if (domainConfig.reputationScore < 30) status = 'critical';
    else if (domainConfig.reputationScore < 50) status = 'poor';
    else if (domainConfig.reputationScore < 70) status = 'fair';
    else if (domainConfig.reputationScore < 90) status = 'good';

    // Generate recommendations
    const recommendations: string[] = [];
    if (bounceRate > 5) {
      recommendations.push('Bounce rate is high. Clean your email list and remove invalid addresses.');
    }
    if (complaintRate > 0.3) {
      recommendations.push('Complaint rate is high. Review email content and ensure recipients opted in.');
    }
    if (!domainConfig.verified) {
      recommendations.push('Domain is not verified. Complete DNS record setup.');
    }
    if (status === 'excellent') {
      recommendations.push('Email reputation is excellent. Keep up the good practices!');
    }

    return {
      companyId,
      domain,
      score: domainConfig.reputationScore,
      bounceRate,
      complaintRate,
      lastBounceAt: lastBounce ? new Date(lastBounce.createdAt) : undefined,
      lastComplaintAt: lastComplaint ? new Date(lastComplaint.createdAt) : undefined,
      status,
      recommendations,
    };
  } catch (error: any) {
    logger.error('Failed to get reputation status:', error);
    throw error;
  }
}

/**
 * Get SMTP domain configuration
 */
export async function getSMTPDomainConfig(
  companyId: string,
  domain: string
): Promise<SMTPDomainConfig | null> {
  try {
    const db = getDb();

    const [config] = await db
      .select()
      .from(smtpDomains)
      .where(eq(smtpDomains.companyId, companyId))
      .where(eq(smtpDomains.domain, domain));

    if (!config) {
      return null;
    }

    return {
      companyId: config.companyId,
      domain: config.domain,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      dkimPublicKey: config.dkimPublicKey || undefined,
      dkimPrivateKey: config.dkimPrivateKey || undefined,
      dkimSelector: config.dkimSelector,
      verified: config.verified,
      verificationToken: config.verificationToken || undefined,
      reputationScore: config.reputationScore,
    };
  } catch (error: any) {
    logger.error('Failed to get SMTP domain config:', error);
    return null;
  }
}
