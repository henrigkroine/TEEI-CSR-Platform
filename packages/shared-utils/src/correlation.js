import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
const asyncLocalStorage = new AsyncLocalStorage();
/**
 * Get current correlation ID from async context
 */
export function getCorrelationId() {
    const context = asyncLocalStorage.getStore();
    return context?.correlationId;
}
/**
 * Get current causation ID from async context
 */
export function getCausationId() {
    const context = asyncLocalStorage.getStore();
    return context?.causationId;
}
/**
 * Run a function with correlation context
 */
export function withCorrelation(correlationId, causationId, fn) {
    return asyncLocalStorage.run({ correlationId, causationId }, fn);
}
/**
 * Generate a new correlation ID
 */
export function generateCorrelationId() {
    return randomUUID();
}
//# sourceMappingURL=correlation.js.map