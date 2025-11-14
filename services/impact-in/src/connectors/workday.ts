/**
 * Workday Connector
 * Pushes impact data to Workday's CSR Impact Report format
 * Supports both SOAP (legacy) and REST (modern) endpoints
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead/Workday Mapper
 */

import { request } from 'undici';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { retryWithBackoff } from '../lib/retry.js';
import { createServiceLogger } from '@teei/shared-utils';
import { db } from '@teei/shared-schema';
import { impactProviderTokens } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';

const logger = createServiceLogger('impact-in:workday');

export interface WorkdayConfig {
  apiUrl: string;
  protocol: 'soap' | 'rest';
  tenantId: string;
  // SOAP authentication (WS-Security)
  username?: string;
  password?: string;
  // REST authentication (OAuth)
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
}

export interface ImpactEvent {
  eventId: string;
  companyId: string;
  userId: string;
  eventType: string;
  timestamp: string;
  value?: number;
  unit?: string;
  metadata?: Record<string, any>;
}

export interface WorkdayDeliveryResult {
  success: boolean;
  deliveryId: string;
  providerResponse?: any;
  error?: string;
  attemptCount: number;
}

/**
 * Map internal impact events to Workday's CSR Impact Report format v3.0
 */
function mapToWorkdaySchema(event: ImpactEvent): Record<string, any> {
  return {
    schema_version: 'v3.0',
    impact_report: {
      external_reference_id: event.eventId,
      report_date: event.timestamp,
      worker: {
        worker_id: event.userId,
      },
      csr_activity: {
        activity_type: event.eventType,
        value: event.value || 0,
        unit_of_measure: event.unit || 'Count',
        additional_data: event.metadata || {},
      },
    },
  };
}

/**
 * Workday Connector Class with SOAP/REST adapter
 */
export class WorkdayConnector {
  private config: WorkdayConfig;
  private companyId: string;
  private xmlBuilder: XMLBuilder;
  private xmlParser: XMLParser;

  constructor(config: WorkdayConfig, companyId: string) {
    this.config = config;
    this.companyId = companyId;

    // Initialize XML parser/builder for SOAP
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
    });

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseTagValue: true,
    });
  }

  /**
   * Deliver impact event to Workday
   */
  async deliver(event: ImpactEvent, deliveryId: string): Promise<WorkdayDeliveryResult> {
    logger.info('Delivering to Workday', {
      eventId: event.eventId,
      deliveryId,
      protocol: this.config.protocol,
    });

    let attemptCount = 0;

    try {
      const result = await retryWithBackoff(
        async () => {
          attemptCount++;
          if (this.config.protocol === 'soap') {
            return await this.sendToWorkdaySOAP(event, deliveryId);
          } else {
            return await this.sendToWorkdayREST(event, deliveryId);
          }
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
        },
        (context) => {
          logger.warn('Retrying Workday delivery', {
            attempt: context.attempt,
            error: context.lastError?.message,
          });
        }
      );

      return {
        success: true,
        deliveryId,
        providerResponse: result,
        attemptCount,
      };
    } catch (error: any) {
      logger.error('Workday delivery failed', {
        eventId: event.eventId,
        deliveryId,
        error: error.message,
        attemptCount,
      });

      return {
        success: false,
        deliveryId,
        error: error.message,
        attemptCount,
      };
    }
  }

  /**
   * Send event to Workday via SOAP with WS-Security
   */
  private async sendToWorkdaySOAP(event: ImpactEvent, deliveryId: string): Promise<any> {
    const payload = mapToWorkdaySchema(event);

    // Build SOAP envelope with WS-Security header
    const soapEnvelope = {
      'soap:Envelope': {
        '@_xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
        '@_xmlns:wd': 'urn:com.workday/bsvc',
        'soap:Header': {
          'wsse:Security': {
            '@_xmlns:wsse':
              'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
            'wsse:UsernameToken': {
              'wsse:Username': this.config.username,
              'wsse:Password': {
                '@_Type':
                  'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText',
                '#text': this.config.password,
              },
            },
          },
        },
        'soap:Body': {
          'wd:Submit_CSR_Impact_Report': {
            'wd:CSR_Impact_Report': {
              'wd:External_Reference_ID': payload.impact_report.external_reference_id,
              'wd:Report_Date': payload.impact_report.report_date,
              'wd:Worker_Reference': {
                'wd:ID': {
                  '@_wd:type': 'Employee_ID',
                  '#text': payload.impact_report.worker.worker_id,
                },
              },
              'wd:CSR_Activity': {
                'wd:Activity_Type': payload.impact_report.csr_activity.activity_type,
                'wd:Value': payload.impact_report.csr_activity.value,
                'wd:Unit_of_Measure': payload.impact_report.csr_activity.unit_of_measure,
              },
            },
          },
        },
      },
    };

    const xmlBody = this.xmlBuilder.build(soapEnvelope);
    const url = `${this.config.apiUrl}/ccx/service/${this.config.tenantId}/CSR_Impact_Report`;

    logger.debug('Sending to Workday SOAP', { url, deliveryId });

    const response = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: 'Submit_CSR_Impact_Report',
        'X-Idempotency-Key': deliveryId,
      },
      body: xmlBody,
    });

    const statusCode = response.statusCode;
    const responseText = await response.body.text();

    if (statusCode >= 200 && statusCode < 300) {
      const parsedResponse = this.xmlParser.parse(responseText);
      logger.info('Workday SOAP delivery successful', { deliveryId, statusCode });
      return parsedResponse;
    }

    // Handle SOAP fault
    const parsedError = this.xmlParser.parse(responseText);
    const faultString =
      parsedError?.['soap:Envelope']?.['soap:Body']?.['soap:Fault']?.faultstring ||
      'Unknown SOAP error';

    logger.error('Workday SOAP error', { deliveryId, statusCode, fault: faultString });

    const error: any = new Error(`Workday SOAP error: ${faultString}`);
    error.statusCode = statusCode;
    error.response = parsedError;

    throw error;
  }

  /**
   * Send event to Workday via REST with OAuth
   */
  private async sendToWorkdayREST(event: ImpactEvent, deliveryId: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const payload = mapToWorkdaySchema(event);

    const url = `${this.config.apiUrl}/api/v1/${this.config.tenantId}/csr-impact-reports`;

    logger.debug('Sending to Workday REST', { url, deliveryId });

    const response = await request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': deliveryId,
      },
      body: JSON.stringify(payload),
    });

    const statusCode = response.statusCode;
    const body = await response.body.json();

    if (statusCode >= 200 && statusCode < 300) {
      logger.info('Workday REST delivery successful', { deliveryId, statusCode });
      return body;
    }

    // Handle errors
    const errorMessage = body.error || body.message || 'Unknown error';
    logger.error('Workday REST error', { deliveryId, statusCode, error: errorMessage });

    const error: any = new Error(`Workday REST error: ${errorMessage}`);
    error.statusCode = statusCode;
    error.response = body;

    throw error;
  }

  /**
   * Get or refresh OAuth access token (for REST mode)
   */
  private async getAccessToken(): Promise<string> {
    if (this.config.protocol !== 'rest') {
      throw new Error('OAuth tokens are only required for REST mode');
    }

    // Check if we have a valid token in database
    const tokenRecord = await db
      .select()
      .from(impactProviderTokens)
      .where(
        and(
          eq(impactProviderTokens.companyId, this.companyId),
          eq(impactProviderTokens.provider, 'workday')
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    const now = new Date();

    // If token exists and is not expired, use it
    if (tokenRecord && tokenRecord.expiresAt > now) {
      logger.debug('Using cached Workday access token');
      return tokenRecord.accessToken;
    }

    // Otherwise, obtain new token
    logger.info('Obtaining new Workday access token');
    return await this.obtainAccessToken();
  }

  /**
   * Obtain new access token using client credentials flow
   */
  private async obtainAccessToken(): Promise<string> {
    if (!this.config.tokenUrl) {
      throw new Error('Token URL is required for Workday REST OAuth');
    }

    const response = await request(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId!,
        client_secret: this.config.clientSecret!,
      }).toString(),
    });

    const statusCode = response.statusCode;
    const body: any = await response.body.json();

    if (statusCode !== 200) {
      throw new Error(`Failed to obtain Workday access token: ${body.error || 'Unknown error'}`);
    }

    const { access_token, expires_in, token_type } = body;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Store token in database
    await db
      .insert(impactProviderTokens)
      .values({
        companyId: this.companyId,
        provider: 'workday',
        accessToken: access_token,
        tokenType: token_type || 'Bearer',
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [impactProviderTokens.companyId, impactProviderTokens.provider],
        set: {
          accessToken: access_token,
          tokenType: token_type || 'Bearer',
          expiresAt,
          updatedAt: new Date(),
        },
      });

    logger.info('Workday access token obtained', { expiresAt });

    return access_token;
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: Partial<WorkdayConfig>): WorkdayConfig {
    if (!config.apiUrl) {
      throw new Error('Workday API URL is required');
    }
    if (!config.tenantId) {
      throw new Error('Workday tenant ID is required');
    }
    if (!config.protocol || !['soap', 'rest'].includes(config.protocol)) {
      throw new Error('Workday protocol must be either "soap" or "rest"');
    }

    if (config.protocol === 'soap') {
      if (!config.username || !config.password) {
        throw new Error('Username and password are required for SOAP mode');
      }
    } else if (config.protocol === 'rest') {
      if (!config.clientId || !config.clientSecret) {
        throw new Error('Client ID and secret are required for REST mode');
      }
    }

    return config as WorkdayConfig;
  }

  /**
   * Test connection to Workday API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.config.protocol === 'soap') {
        // Test SOAP endpoint with simple request
        const url = `${this.config.apiUrl}/ccx/service/${this.config.tenantId}/CSR_Impact_Report?wsdl`;
        const response = await request(url, { method: 'GET' });
        const statusCode = response.statusCode;

        if (statusCode >= 200 && statusCode < 300) {
          logger.info('Workday SOAP connection test successful');
          return { success: true };
        }

        return { success: false, error: `HTTP ${statusCode}` };
      } else {
        // Test REST endpoint
        const accessToken = await this.getAccessToken();
        const url = `${this.config.apiUrl}/api/v1/${this.config.tenantId}/health`;

        const response = await request(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const statusCode = response.statusCode;

        if (statusCode >= 200 && statusCode < 300) {
          logger.info('Workday REST connection test successful');
          return { success: true };
        }

        return { success: false, error: `HTTP ${statusCode}` };
      }
    } catch (error: any) {
      logger.error('Workday connection test failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

/**
 * Create Workday connector from environment variables
 */
export function createWorkdayConnector(companyId: string): WorkdayConnector {
  const protocol = (process.env.WORKDAY_PROTOCOL || 'rest') as 'soap' | 'rest';

  const config = WorkdayConnector.validateConfig({
    apiUrl: process.env.WORKDAY_API_URL,
    protocol,
    tenantId: process.env.WORKDAY_TENANT_ID,
    username: process.env.WORKDAY_USERNAME,
    password: process.env.WORKDAY_PASSWORD,
    clientId: process.env.WORKDAY_CLIENT_ID,
    clientSecret: process.env.WORKDAY_CLIENT_SECRET,
    tokenUrl: process.env.WORKDAY_TOKEN_URL,
  });

  return new WorkdayConnector(config, companyId);
}
