/**
 * Get current correlation ID from async context
 */
export declare function getCorrelationId(): string | undefined;
/**
 * Get current causation ID from async context
 */
export declare function getCausationId(): string | undefined;
/**
 * Run a function with correlation context
 */
export declare function withCorrelation<T>(correlationId: string, causationId: string | undefined, fn: () => T): T;
/**
 * Generate a new correlation ID
 */
export declare function generateCorrelationId(): string;
//# sourceMappingURL=correlation.d.ts.map