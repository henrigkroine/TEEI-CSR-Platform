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
/**
 * OpenLineage Emitter
 * Emits lineage events to ClickHouse topic for catalog integration
 */
export class OpenLineageEmitter {
    producer;
    namespace;
    enabled;
    constructor(options) {
        this.producer = options.producer || 'teei-platform/1.0.0';
        this.namespace = options.namespace;
        this.enabled = options.enabled !== false; // Default to enabled
        if (!this.enabled) {
            logger.info('OpenLineage emitter disabled');
        }
        else {
            logger.info(`OpenLineage emitter initialized for namespace: ${this.namespace}`);
        }
    }
    /**
     * Emit START event
     * Indicates a job has started processing
     */
    async emitStart(params) {
        if (!this.enabled)
            return;
        const event = {
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
    async emitComplete(params) {
        if (!this.enabled)
            return;
        const event = {
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
    async emitFail(params) {
        if (!this.enabled)
            return;
        const event = {
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
    async sendEvent(event) {
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
        }
        catch (error) {
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
    static dataset(params) {
        const facets = {};
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
export function createOpenLineageEmitter(namespace) {
    return new OpenLineageEmitter({
        namespace,
        producer: `teei-platform/${process.env.npm_package_version || '1.0.0'}`,
        enabled: process.env.OPENLINEAGE_ENABLED !== 'false', // Default enabled
    });
}
//# sourceMappingURL=openlineage.js.map