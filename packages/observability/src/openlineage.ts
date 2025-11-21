/**
 * OpenLineage Emitter - Data Lineage Tracking
 *
 * Emits OpenLineage events for dataset lineage tracking and compliance.
 * Sinks events to ClickHouse for catalog UI integration.
 *
 * Event types:
 * - START_RUN: Job execution started
 * - COMPLETE_RUN: Job execution completed successfully
 * - FAIL_RUN: Job execution failed
 *
 * @module observability/openlineage
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('observability:openlineage');

export interface Dataset {
  namespace: string; // e.g., 'postgres://teei-db', 'clickhouse://teei-analytics'
  name: string; // e.g., 'evidence_snippets', 'metrics_company_period'
  facets?: Record<string, any>; // Schema, quality metrics, etc.
}

export interface Job {
  namespace: string; // e.g., 'teei.reporting', 'teei.q2q-ai'
  name: string; // e.g., 'generate_report', 'extract_evidence'
}

export interface Run {
  runId: string; // UUID for this run
  facets?: Record<string, any>; // Runtime config, parameters, etc.
}

export interface OpenLineageEvent {
  eventType: 'START' | 'COMPLETE' | 'FAIL';
  eventTime: string; // ISO 8601
  run: Run;
  job: Job;
  inputs?: Dataset[];
  outputs?: Dataset[];
  producer: string; // e.g., 'teei-platform/1.0.0'
}

/**
 * OpenLineage Emitter
 * Emits lineage events to ClickHouse topic for catalog integration
 */
export class OpenLineageEmitter {
  private producer: string;
  private namespace: string;
  private enabled: boolean;

  constructor(options: {
    producer?: string;
    namespace: string;
    enabled?: boolean;
  }) {
    this.producer = options.producer || 'teei-platform/1.0.0';
    this.namespace = options.namespace;
    this.enabled = options.enabled !== false; // Default to enabled

    if (!this.enabled) {
      logger.info('OpenLineage emitter disabled');
    } else {
      logger.info(`OpenLineage emitter initialized for namespace: ${this.namespace}`);
    }
  }

  /**
   * Emit START event
   * Indicates a job has started processing
   */
  async emitStart(params: {
    runId: string;
    jobName: string;
    inputs?: Dataset[];
    runFacets?: Record<string, any>;
  }): Promise<void> {
    if (!this.enabled) return;

    const event: OpenLineageEvent = {
      eventType: 'START',
      eventTime: new Date().toISOString(),
      run: {
        runId: params.runId,
        facets: params.runFacets || {},
      },
      job: {
        namespace: this.namespace,
        name: params.jobName,
      },
      inputs: params.inputs || [],
      producer: this.producer,
    };

    await this.sendEvent(event);
  }

  /**
   * Emit COMPLETE event
   * Indicates a job completed successfully with output datasets
   */
  async emitComplete(params: {
    runId: string;
    jobName: string;
    inputs?: Dataset[];
    outputs?: Dataset[];
    runFacets?: Record<string, any>;
  }): Promise<void> {
    if (!this.enabled) return;

    const event: OpenLineageEvent = {
      eventType: 'COMPLETE',
      eventTime: new Date().toISOString(),
      run: {
        runId: params.runId,
        facets: params.runFacets || {},
      },
      job: {
        namespace: this.namespace,
        name: params.jobName,
      },
      inputs: params.inputs || [],
      outputs: params.outputs || [],
      producer: this.producer,
    };

    await this.sendEvent(event);
  }

  /**
   * Emit FAIL event
   * Indicates a job failed with error details
   */
  async emitFail(params: {
    runId: string;
    jobName: string;
    inputs?: Dataset[];
    error: Error;
    runFacets?: Record<string, any>;
  }): Promise<void> {
    if (!this.enabled) return;

    const event: OpenLineageEvent = {
      eventType: 'FAIL',
      eventTime: new Date().toISOString(),
      run: {
        runId: params.runId,
        facets: {
          ...params.runFacets,
          error: {
            message: params.error.message,
            stack: params.error.stack,
          },
        },
      },
      job: {
        namespace: this.namespace,
        name: params.jobName,
      },
      inputs: params.inputs || [],
      producer: this.producer,
    };

    await this.sendEvent(event);
  }

  /**
   * Send event to ClickHouse topic
   * TODO: Implement actual ClickHouse sink integration
   */
  private async sendEvent(event: OpenLineageEvent): Promise<void> {
    try {
      logger.info('OpenLineage event emitted', {
        eventType: event.eventType,
        jobName: event.job.name,
        runId: event.run.runId,
        inputCount: event.inputs?.length || 0,
        outputCount: event.outputs?.length || 0,
      });

      // TODO: Send to ClickHouse lineage_events table
      // For now, just log the event
      // In production: Insert into ClickHouse via HTTP interface or NATS topic
      /*
      await clickhouseClient.insert({
        table: 'lineage_events',
        values: [
          {
            event_type: event.eventType,
            event_time: event.eventTime,
            job_namespace: event.job.namespace,
            job_name: event.job.name,
            run_id: event.run.runId,
            inputs: JSON.stringify(event.inputs),
            outputs: JSON.stringify(event.outputs),
            run_facets: JSON.stringify(event.run.facets),
            producer: event.producer,
          },
        ],
        format: 'JSONEachRow',
      });
      */
    } catch (error: any) {
      logger.error('Failed to emit OpenLineage event', {
        error: error.message,
        event: event.job.name,
      });
      // Don't throw - lineage emission should not fail the job
    }
  }

  /**
   * Create a dataset descriptor
   * Helper method to construct dataset metadata
   */
  static dataset(params: {
    namespace: string;
    name: string;
    schema?: { fields: Array<{ name: string; type: string }> };
    quality?: { rowCount?: number; columnCount?: number };
  }): Dataset {
    const facets: Record<string, any> = {};

    if (params.schema) {
      facets.schema = {
        fields: params.schema.fields,
      };
    }

    if (params.quality) {
      facets.dataQuality = params.quality;
    }

    return {
      namespace: params.namespace,
      name: params.name,
      facets: Object.keys(facets).length > 0 ? facets : undefined,
    };
  }
}

/**
 * Create OpenLineage emitter from environment variables
 */
export function createOpenLineageEmitter(namespace: string): OpenLineageEmitter {
  return new OpenLineageEmitter({
    namespace,
    producer: `teei-platform/${process.env.npm_package_version || '1.0.0'}`,
    enabled: process.env.OPENLINEAGE_ENABLED !== 'false', // Default enabled
  });
}
