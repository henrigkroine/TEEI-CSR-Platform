/**
 * Dead Letter Queue (DLQ) Implementation for NATS
 *
 * Handles failed event processing with:
 * - Exponential backoff retry logic
 * - Maximum retry attempts
 * - Dead letter stream for poison messages
 * - Monitoring and alerting hooks
 */

import { NatsConnection, JetStreamClient, RetentionPolicy, StorageType } from 'nats';
import pino from 'pino';

const logger = pino({ name: 'dlq' });

/**
 * DLQ Configuration
 */
export interface DLQConfig {
  /** Maximum number of retry attempts before sending to DLQ */
  maxRetries: number;
  /** Initial delay in milliseconds (default: 1000ms) */
  initialDelayMs: number;
  /** Maximum delay in milliseconds (default: 60000ms = 1 minute) */
  maxDelayMs: number;
  /** Backoff multiplier (default: 2 for exponential backoff) */
  backoffMultiplier: number;
  /** Name of the dead letter stream */
  deadLetterStream: string;
  /** Enable detailed logging */
  verbose: boolean;
}

const DEFAULT_DLQ_CONFIG: DLQConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  deadLetterStream: 'DEAD_LETTER',
  verbose: false,
};

/**
 * Event Processing Result
 */
export interface EventProcessingResult {
  success: boolean;
  error?: Error;
  shouldRetry?: boolean;
}

/**
 * DLQ Message Metadata
 */
export interface DLQMessageMetadata {
  originalSubject: string;
  attemptCount: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  errorMessage?: string;
  errorStack?: string;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attemptNumber: number,
  config: DLQConfig
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * DLQ Manager for handling failed events
 */
export class DLQManager {
  private config: DLQConfig;
  private nc: NatsConnection;
  private js: JetStreamClient;

  constructor(
    nc: NatsConnection,
    js: JetStreamClient,
    config: Partial<DLQConfig> = {}
  ) {
    this.nc = nc;
    this.js = js;
    this.config = { ...DEFAULT_DLQ_CONFIG, ...config };
  }

  /**
   * Initialize DLQ stream if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      const jsm = await this.nc.jetstreamManager();

      // Create dead letter stream
      try {
        await jsm.streams.info(this.config.deadLetterStream);
        logger.info({ stream: this.config.deadLetterStream }, 'DLQ stream already exists');
      } catch {
        await jsm.streams.add({
          name: this.config.deadLetterStream,
          subjects: [`${this.config.deadLetterStream}.*`],
          retention: RetentionPolicy.Limits,
          max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days in nanoseconds
          max_msgs: 10000,
          storage: StorageType.File,
        });
        logger.info({ stream: this.config.deadLetterStream }, 'Created DLQ stream');
      }
    } catch (error) {
      logger.error({ error }, 'Failed to initialize DLQ');
      throw error;
    }
  }

  /**
   * Process event with retry logic
   *
   * @param subject - NATS subject
   * @param handler - Event handler function
   * @param options - Processing options
   */
  async processWithRetry<T>(
    subject: string,
    data: T,
    handler: (data: T) => Promise<EventProcessingResult>,
    metadata: Partial<DLQMessageMetadata> = {}
  ): Promise<EventProcessingResult> {
    const attemptCount = (metadata.attemptCount || 0) + 1;
    const firstAttemptAt = metadata.firstAttemptAt || new Date().toISOString();
    const lastAttemptAt = new Date().toISOString();

    try {
      if (this.config.verbose) {
        logger.info(
          { subject, attemptCount, maxRetries: this.config.maxRetries },
          'Processing event'
        );
      }

      const result = await handler(data);

      if (result.success) {
        if (attemptCount > 1) {
          logger.info(
            { subject, attemptCount },
            'Event processed successfully after retry'
          );
        }
        return result;
      }

      // Handler indicated failure
      if (attemptCount >= this.config.maxRetries) {
        // Max retries exceeded, send to DLQ
        await this.sendToDeadLetter(subject, data, {
          originalSubject: subject,
          attemptCount,
          firstAttemptAt,
          lastAttemptAt,
          errorMessage: result.error?.message,
          errorStack: result.error?.stack,
        });

        return {
          success: false,
          error: new Error(`Max retries exceeded (${this.config.maxRetries})`),
        };
      }

      // Schedule retry with exponential backoff
      if (result.shouldRetry !== false) {
        const retryDelay = calculateRetryDelay(attemptCount, this.config);
        logger.warn(
          { subject, attemptCount, retryDelay },
          'Event processing failed, scheduling retry'
        );

        // In a real implementation, this would schedule a delayed retry
        // For now, we'll use a simple setTimeout
        setTimeout(async () => {
          await this.processWithRetry(subject, data, handler, {
            originalSubject: subject,
            attemptCount,
            firstAttemptAt,
            lastAttemptAt: new Date().toISOString(),
          });
        }, retryDelay);
      }

      return result;
    } catch (error) {
      logger.error({ error, subject, attemptCount }, 'Unexpected error processing event');

      if (attemptCount >= this.config.maxRetries) {
        await this.sendToDeadLetter(subject, data, {
          originalSubject: subject,
          attemptCount,
          firstAttemptAt,
          lastAttemptAt,
          errorMessage: (error as Error).message,
          errorStack: (error as Error).stack,
        });
      }

      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Send failed message to dead letter queue
   */
  async sendToDeadLetter<T>(
    subject: string,
    data: T,
    metadata: DLQMessageMetadata
  ): Promise<void> {
    try {
      const dlqSubject = `${this.config.deadLetterStream}.${subject.replace(/\./g, '_')}`;
      const message = {
        data,
        metadata,
        deadLetteredAt: new Date().toISOString(),
      };

      await this.js.publish(dlqSubject, JSON.stringify(message));

      logger.error(
        {
          subject,
          dlqSubject,
          attemptCount: metadata.attemptCount,
          errorMessage: metadata.errorMessage,
        },
        'Message sent to dead letter queue'
      );

      // Emit metric or alert for monitoring
      this.emitDLQAlert(subject, metadata);
    } catch (error) {
      logger.error({ error, subject }, 'Failed to send message to DLQ');
      throw error;
    }
  }

  /**
   * Emit alert for DLQ message (hook for monitoring systems)
   */
  private emitDLQAlert(subject: string, metadata: DLQMessageMetadata): void {
    // Hook for monitoring/alerting systems (Sentry, Prometheus, etc.)
    logger.warn(
      {
        alert: 'DLQ_MESSAGE',
        subject,
        attemptCount: metadata.attemptCount,
        errorMessage: metadata.errorMessage,
      },
      'DLQ alert emitted'
    );

    // In production, emit to monitoring system:
    // - Increment DLQ counter metric
    // - Send alert to Sentry/PagerDuty
    // - Update Grafana dashboard
  }

  /**
   * Get messages from dead letter queue for manual review
   */
  async getDLQMessages(limit: number = 100): Promise<any[]> {
    const messages: any[] = [];

    try {
      const consumer = await this.js.consumers.get(
        this.config.deadLetterStream,
        'dlq-consumer'
      );

      const iter = await consumer.fetch({ max_messages: limit });

      for await (const msg of iter) {
        messages.push({
          subject: msg.subject,
          data: JSON.parse(msg.data.toString()),
          metadata: msg.info,
        });
        msg.ack();
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch DLQ messages');
    }

    return messages;
  }

  /**
   * Reprocess a message from the DLQ
   */
  async reprocessDLQMessage<T>(
    message: any,
    handler: (data: T) => Promise<EventProcessingResult>
  ): Promise<EventProcessingResult> {
    logger.info({ subject: message.subject }, 'Reprocessing DLQ message');

    return await this.processWithRetry(
      message.metadata.originalSubject,
      message.data.data,
      handler,
      {
        attemptCount: 0, // Reset attempt count for manual reprocessing
        firstAttemptAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
      }
    );
  }

  /**
   * Get DLQ statistics
   */
  async getDLQStats(): Promise<{
    messageCount: number;
    streamName: string;
    consumers: number;
  }> {
    try {
      const jsm = await this.nc.jetstreamManager();
      const stream = await jsm.streams.info(this.config.deadLetterStream);

      return {
        messageCount: stream.state.messages,
        streamName: this.config.deadLetterStream,
        consumers: stream.state.consumer_count,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get DLQ stats');
      return {
        messageCount: 0,
        streamName: this.config.deadLetterStream,
        consumers: 0,
      };
    }
  }

  /**
   * Purge old messages from DLQ
   */
  async purgeDLQ(): Promise<void> {
    try {
      const jsm = await this.nc.jetstreamManager();
      await jsm.streams.purge(this.config.deadLetterStream);
      logger.info({ stream: this.config.deadLetterStream }, 'DLQ purged');
    } catch (error) {
      logger.error({ error }, 'Failed to purge DLQ');
      throw error;
    }
  }
}

/**
 * Retry Strategies
 */
export const RetryStrategies = {
  /**
   * Exponential backoff (default)
   */
  exponential: (config: Partial<DLQConfig> = {}): DLQConfig => ({
    ...DEFAULT_DLQ_CONFIG,
    ...config,
    backoffMultiplier: 2,
  }),

  /**
   * Linear backoff
   */
  linear: (config: Partial<DLQConfig> = {}): DLQConfig => ({
    ...DEFAULT_DLQ_CONFIG,
    ...config,
    backoffMultiplier: 1,
  }),

  /**
   * Aggressive retry with short delays
   */
  aggressive: (config: Partial<DLQConfig> = {}): DLQConfig => ({
    ...DEFAULT_DLQ_CONFIG,
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 1.5,
    ...config,
  }),

  /**
   * Conservative retry with long delays
   */
  conservative: (config: Partial<DLQConfig> = {}): DLQConfig => ({
    ...DEFAULT_DLQ_CONFIG,
    maxRetries: 2,
    initialDelayMs: 5000,
    maxDelayMs: 120000,
    backoffMultiplier: 3,
    ...config,
  }),
};

/**
 * Error Classification
 */
export enum ErrorType {
  TRANSIENT = 'transient', // Temporary errors (network, timeout) - should retry
  PERMANENT = 'permanent', // Permanent errors (validation, not found) - no retry
  UNKNOWN = 'unknown', // Unknown errors - retry with caution
}

/**
 * Classify error for retry decision
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  // Transient errors - should retry
  if (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('unavailable') ||
    message.includes('503') ||
    message.includes('429')
  ) {
    return ErrorType.TRANSIENT;
  }

  // Permanent errors - don't retry
  if (
    message.includes('validation') ||
    message.includes('not found') ||
    message.includes('404') ||
    message.includes('400') ||
    message.includes('unauthorized') ||
    message.includes('forbidden')
  ) {
    return ErrorType.PERMANENT;
  }

  return ErrorType.UNKNOWN;
}
