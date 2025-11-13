import { describe, it, expect } from 'vitest';
import { generatePayloadHash, createPayloadSample } from '../delivery-log.js';

describe('Delivery Log Utilities', () => {
  it('should generate consistent hash for same payload', () => {
    const payload = {
      companyId: '123',
      platform: 'benevity',
      data: { value: 100 },
    };

    const hash1 = generatePayloadHash(payload);
    const hash2 = generatePayloadHash(payload);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 produces 64 char hex string
  });

  it('should generate different hashes for different payloads', () => {
    const payload1 = { companyId: '123', data: { value: 100 } };
    const payload2 = { companyId: '123', data: { value: 200 } };

    const hash1 = generatePayloadHash(payload1);
    const hash2 = generatePayloadHash(payload2);

    expect(hash1).not.toBe(hash2);
  });

  it('should create payload sample for small payloads', () => {
    const payload = { companyId: '123', data: { value: 100 } };

    const sample = createPayloadSample(payload);

    expect(sample).toEqual(payload);
    expect(sample._truncated).toBeUndefined();
  });

  it('should truncate large payloads', () => {
    const largePayload = {
      companyId: '123',
      data: 'x'.repeat(2000), // Creates a large payload
    };

    const sample = createPayloadSample(largePayload);

    expect(sample._truncated).toBe(true);
    expect(sample._originalLength).toBeGreaterThan(1000);
    expect(JSON.stringify(sample).length).toBeLessThan(JSON.stringify(largePayload).length);
  });

  it('should hash payloads consistently regardless of key order', () => {
    const payload1 = { a: 1, b: 2, c: 3 };
    const payload2 = { c: 3, b: 2, a: 1 };

    const hash1 = generatePayloadHash(payload1);
    const hash2 = generatePayloadHash(payload2);

    expect(hash1).toBe(hash2);
  });
});
