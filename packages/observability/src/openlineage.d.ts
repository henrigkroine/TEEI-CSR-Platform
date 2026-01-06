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
export interface Dataset {
    namespace: string;
    name: string;
    facets?: Record<string, any>;
}
export interface Job {
    namespace: string;
    name: string;
}
export interface Run {
    runId: string;
    facets?: Record<string, any>;
}
export interface OpenLineageEvent {
    eventType: 'START' | 'COMPLETE' | 'FAIL';
    eventTime: string;
    run: Run;
    job: Job;
    inputs?: Dataset[];
    outputs?: Dataset[];
    producer: string;
}
/**
 * OpenLineage Emitter
 * Emits lineage events to ClickHouse topic for catalog integration
 */
export declare class OpenLineageEmitter {
    private producer;
    private namespace;
    private enabled;
    constructor(options: {
        producer?: string;
        namespace: string;
        enabled?: boolean;
    });
    /**
     * Emit START event
     * Indicates a job has started processing
     */
    emitStart(params: {
        runId: string;
        jobName: string;
        inputs?: Dataset[];
        runFacets?: Record<string, any>;
    }): Promise<void>;
    /**
     * Emit COMPLETE event
     * Indicates a job completed successfully with output datasets
     */
    emitComplete(params: {
        runId: string;
        jobName: string;
        inputs?: Dataset[];
        outputs?: Dataset[];
        runFacets?: Record<string, any>;
    }): Promise<void>;
    /**
     * Emit FAIL event
     * Indicates a job failed with error details
     */
    emitFail(params: {
        runId: string;
        jobName: string;
        inputs?: Dataset[];
        error: Error;
        runFacets?: Record<string, any>;
    }): Promise<void>;
    /**
     * Send event to ClickHouse topic
     * TODO: Implement actual ClickHouse sink integration
     */
    private sendEvent;
    /**
     * Create a dataset descriptor
     * Helper method to construct dataset metadata
     */
    static dataset(params: {
        namespace: string;
        name: string;
        schema?: {
            fields: Array<{
                name: string;
                type: string;
            }>;
        };
        quality?: {
            rowCount?: number;
            columnCount?: number;
        };
    }): Dataset;
}
/**
 * Create OpenLineage emitter from environment variables
 */
export declare function createOpenLineageEmitter(namespace: string): OpenLineageEmitter;
//# sourceMappingURL=openlineage.d.ts.map