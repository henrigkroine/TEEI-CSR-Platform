/**
 * Mapper Tests
 * Unit tests for mapping engine and transform rules
 */

import { describe, it, expect } from 'vitest';
import { applyMapping } from '../mapper.js';
import type { MappingConfig } from '@teei/shared-types';

describe('Field Mapping', () => {
  it('should apply direct mapping', () => {
    const row = { Date: '2024-01-15', Hours: '5', Activity: 'tutoring' };
    const config: MappingConfig = {
      targetContract: 'volunteer.event',
      fieldMappings: [
        { sourceColumn: 'Date', targetField: 'eventDate', required: true },
        { sourceColumn: 'Hours', targetField: 'hours', required: true },
        { sourceColumn: 'Activity', targetField: 'activityType', required: true },
      ],
    };

    const result = applyMapping(row, config);
    expect(result.eventDate).toBe('2024-01-15');
    expect(result.hours).toBe('5');
    expect(result.activityType).toBe('tutoring');
  });

  it('should apply default values', () => {
    const row = { Hours: '5' };
    const config: MappingConfig = {
      targetContract: 'volunteer.event',
      fieldMappings: [
        { sourceColumn: 'Hours', targetField: 'hours', required: true },
      ],
      defaultValues: {
        activityType: 'general',
        organizationName: 'Unknown',
      },
    };

    const result = applyMapping(row, config);
    expect(result.hours).toBe('5');
    expect(result.activityType).toBe('general');
    expect(result.organizationName).toBe('Unknown');
  });
});

describe('Transform Rules', () => {
  it('should apply concatenation', () => {
    const row = { FirstName: 'John', LastName: 'Doe' };
    const config: MappingConfig = {
      targetContract: 'volunteer.event',
      fieldMappings: [
        {
          sourceColumn: 'FirstName',
          targetField: 'fullName',
          required: true,
          transform: {
            type: 'concat',
            sourceColumns: ['FirstName', 'LastName'],
            targetField: 'fullName',
            config: { separator: ' ' },
          },
        },
      ],
    };

    const result = applyMapping(row, config);
    expect(result.fullName).toBe('John Doe');
  });

  it('should apply split', () => {
    const row = { FullName: 'John,Doe' };
    const config: MappingConfig = {
      targetContract: 'volunteer.event',
      fieldMappings: [
        {
          sourceColumn: 'FullName',
          targetField: 'firstName',
          required: true,
          transform: {
            type: 'split',
            sourceColumns: ['FullName'],
            targetField: 'firstName',
            config: { delimiter: ',', index: 0 },
          },
        },
      ],
    };

    const result = applyMapping(row, config);
    expect(result.firstName).toBe('John');
  });

  it('should apply constant value', () => {
    const row = { Hours: '5' };
    const config: MappingConfig = {
      targetContract: 'volunteer.event',
      fieldMappings: [
        {
          sourceColumn: 'Hours',
          targetField: 'hours',
          required: true,
        },
        {
          sourceColumn: '',
          targetField: 'activityType',
          required: true,
          transform: {
            type: 'constant',
            sourceColumns: [],
            targetField: 'activityType',
            config: { value: 'tutoring' },
          },
        },
      ],
    };

    const result = applyMapping(row, config);
    expect(result.activityType).toBe('tutoring');
  });

  it('should apply coalesce', () => {
    const row = { Phone1: '', Phone2: '555-1234', Phone3: '555-5678' };
    const config: MappingConfig = {
      targetContract: 'volunteer.event',
      fieldMappings: [
        {
          sourceColumn: 'Phone1',
          targetField: 'phone',
          required: true,
          transform: {
            type: 'coalesce',
            sourceColumns: ['Phone1', 'Phone2', 'Phone3'],
            targetField: 'phone',
          },
        },
      ],
    };

    const result = applyMapping(row, config);
    expect(result.phone).toBe('555-1234');
  });

  it('should apply currency conversion', () => {
    const row = { Amount: '$100.00' };
    const config: MappingConfig = {
      targetContract: 'donation.event',
      fieldMappings: [
        {
          sourceColumn: 'Amount',
          targetField: 'amount',
          required: true,
          transform: {
            type: 'currencyConvert',
            sourceColumns: ['Amount'],
            targetField: 'amount',
            config: { rate: 0.85 },
          },
        },
      ],
    };

    const result = applyMapping(row, config);
    expect(result.amount).toBe(85); // 100 * 0.85
  });
});

describe('Filter Conditions', () => {
  it('should filter rows by condition', () => {
    const row = { Hours: '3', Activity: 'tutoring' };
    const config: MappingConfig = {
      targetContract: 'volunteer.event',
      fieldMappings: [
        { sourceColumn: 'Hours', targetField: 'hours', required: true },
      ],
      filterConditions: [
        { column: 'Hours', operator: 'gte', value: 5 },
      ],
    };

    const result = applyMapping(row, config);
    expect(Object.keys(result)).toHaveLength(0); // Row filtered out
  });

  it('should pass rows that match condition', () => {
    const row = { Hours: '10', Activity: 'tutoring' };
    const config: MappingConfig = {
      targetContract: 'volunteer.event',
      fieldMappings: [
        { sourceColumn: 'Hours', targetField: 'hours', required: true },
      ],
      filterConditions: [
        { column: 'Hours', operator: 'gte', value: 5 },
      ],
    };

    const result = applyMapping(row, config);
    expect(result.hours).toBe('10');
  });
});
