/**
 * Validator Tests
 * Unit tests for validation engine and PII detection
 */

import { describe, it, expect } from 'vitest';
import { validateRow, validateMapping } from '../validator.js';

describe('Contract Validation', () => {
  it('should validate volunteer event', () => {
    const row = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      eventDate: '2024-01-15T10:00:00Z',
      hours: 5,
      activityType: 'tutoring',
    };

    const errors = validateRow(row, 0, 'volunteer.event');
    expect(errors).toHaveLength(0);
  });

  it('should detect missing required fields', () => {
    const row = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      // Missing userId, eventDate, hours, activityType
    };

    const errors = validateRow(row, 0, 'volunteer.event');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.errorType === 'missing_required_field')).toBe(true);
  });

  it('should detect invalid types', () => {
    const row = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      eventDate: '2024-01-15T10:00:00Z',
      hours: 'five', // Invalid: should be number
      activityType: 'tutoring',
    };

    const errors = validateRow(row, 0, 'volunteer.event');
    expect(errors.some(e => e.errorType === 'invalid_type')).toBe(true);
  });

  it('should detect out of range values', () => {
    const row = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      eventDate: '2024-01-15T10:00:00Z',
      hours: -5, // Invalid: must be >= 0
      activityType: 'tutoring',
    };

    const errors = validateRow(row, 0, 'volunteer.event');
    expect(errors.some(e => e.errorType === 'out_of_range')).toBe(true);
  });
});

describe('PII Detection', () => {
  it('should detect email addresses', () => {
    const row = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      eventDate: '2024-01-15T10:00:00Z',
      hours: 5,
      activityType: 'tutoring',
      notes: 'Contact john.doe@example.com for details',
    };

    const errors = validateRow(row, 0, 'volunteer.event');
    expect(errors.some(e => e.errorType === 'pii_detected')).toBe(true);
  });

  it('should detect SSN', () => {
    const row = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      eventDate: '2024-01-15T10:00:00Z',
      hours: 5,
      activityType: 'tutoring',
      notes: 'SSN: 123-45-6789',
    };

    const errors = validateRow(row, 0, 'volunteer.event');
    expect(errors.some(e => e.errorType === 'pii_detected')).toBe(true);
  });

  it('should detect phone numbers', () => {
    const row = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      eventDate: '2024-01-15T10:00:00Z',
      hours: 5,
      activityType: 'tutoring',
      notes: 'Call 555-123-4567',
    };

    const errors = validateRow(row, 0, 'volunteer.event');
    expect(errors.some(e => e.errorType === 'pii_detected')).toBe(true);
  });

  it('should detect credit card numbers', () => {
    const row = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      eventDate: '2024-01-15T10:00:00Z',
      hours: 5,
      activityType: 'tutoring',
      notes: 'Card: 4532-1234-5678-9010',
    };

    const errors = validateRow(row, 0, 'volunteer.event');
    expect(errors.some(e => e.errorType === 'pii_detected')).toBe(true);
  });
});

describe('Mapping Configuration Validation', () => {
  it('should validate valid mapping config', async () => {
    const config = {
      targetContract: 'volunteer.event' as const,
      fieldMappings: [
        { sourceColumn: 'Date', targetField: 'eventDate', required: true },
        { sourceColumn: 'Hours', targetField: 'hours', required: true },
      ],
    };

    const result = await validateMapping(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing required fields', async () => {
    const config = {
      targetContract: 'volunteer.event' as const,
      fieldMappings: [
        { sourceColumn: 'Date', targetField: 'eventDate', required: true },
        // Missing hours, userId, eventId, activityType
      ],
    };

    const result = await validateMapping(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect duplicate target fields', async () => {
    const config = {
      targetContract: 'volunteer.event' as const,
      fieldMappings: [
        { sourceColumn: 'Date1', targetField: 'eventDate', required: true },
        { sourceColumn: 'Date2', targetField: 'eventDate', required: true }, // Duplicate
      ],
    };

    const result = await validateMapping(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  it('should validate with default values', async () => {
    const config = {
      targetContract: 'volunteer.event' as const,
      fieldMappings: [
        { sourceColumn: 'Date', targetField: 'eventDate', required: true },
        { sourceColumn: 'Hours', targetField: 'hours', required: true },
      ],
      defaultValues: {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        activityType: 'general',
      },
    };

    const result = await validateMapping(config);
    expect(result.valid).toBe(true);
  });
});
