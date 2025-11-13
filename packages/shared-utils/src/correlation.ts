import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

interface CorrelationContext {
  correlationId: string;
  causationId?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Get current correlation ID from async context
 */
export function getCorrelationId(): string | undefined {
  const context = asyncLocalStorage.getStore();
  return context?.correlationId;
}

/**
 * Get current causation ID from async context
 */
export function getCausationId(): string | undefined {
  const context = asyncLocalStorage.getStore();
  return context?.causationId;
}

/**
 * Run a function with correlation context
 */
export function withCorrelation<T>(
  correlationId: string,
  causationId: string | undefined,
  fn: () => T
): T {
  return asyncLocalStorage.run({ correlationId, causationId }, fn);
}

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return randomUUID();
}
