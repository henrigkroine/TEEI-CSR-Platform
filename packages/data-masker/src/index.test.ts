import { describe, it, expect } from 'vitest';
import * as DataMasker from './index.js';

describe('Data Masker - Package Exports', () => {
  it('should export all masking functions', () => {
    expect(DataMasker.maskName).toBeDefined();
    expect(DataMasker.maskEmail).toBeDefined();
    expect(DataMasker.maskPhone).toBeDefined();
    expect(DataMasker.maskAddress).toBeDefined();
    expect(DataMasker.maskIBAN).toBeDefined();
    expect(DataMasker.maskFreeText).toBeDefined();
    expect(DataMasker.maskCompanyName).toBeDefined();
    expect(DataMasker.maskJobTitle).toBeDefined();
    expect(DataMasker.generateDeterministicUserId).toBeDefined();
  });

  it('should export context creation function', () => {
    expect(DataMasker.createMaskingContext).toBeDefined();
  });

  it('should export hashing utilities', () => {
    expect(DataMasker.generateDeterministicHash).toBeDefined();
    expect(DataMasker.hashToSeed).toBeDefined();
    expect(DataMasker.hashToUUID).toBeDefined();
    expect(DataMasker.generateSalt).toBeDefined();
    expect(DataMasker.hashValue).toBeDefined();
    expect(DataMasker.DEFAULT_DEMO_SALT).toBeDefined();
  });

  it('should export PII detection functions', () => {
    expect(DataMasker.detectPII).toBeDefined();
    expect(DataMasker.assertNoPII).toBeDefined();
    expect(DataMasker.redactPII).toBeDefined();
    expect(DataMasker.isDemoTenantId).toBeDefined();
    expect(DataMasker.assertDemoTenant).toBeDefined();
  });

  it('should export schemas', () => {
    expect(DataMasker.LocaleSchema).toBeDefined();
    expect(DataMasker.MaskerConfigSchema).toBeDefined();
  });

  it('should work end-to-end', () => {
    // Create context
    const context = DataMasker.createMaskingContext('demo-test', 'user-1');

    // Mask data
    const maskedName = DataMasker.maskName('John Doe', context);
    const maskedEmail = DataMasker.maskEmail('john@example.com', context);

    // Validate no PII in masked data (should not throw)
    expect(() => DataMasker.assertNoPII(maskedName, 'name')).not.toThrow();

    // Check demo tenant
    expect(DataMasker.isDemoTenantId('demo-test')).toBe(true);
    expect(() => DataMasker.assertDemoTenant('demo-test')).not.toThrow();
  });
});
