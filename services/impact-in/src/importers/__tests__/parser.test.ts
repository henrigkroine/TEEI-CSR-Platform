/**
 * Parser Tests
 * Unit tests for CSV/XLSX/JSON parsing and schema inference
 */

import { describe, it, expect } from 'vitest';
import { parseAndInferSchema } from '../parser.js';

describe('CSV Parser', () => {
  it('should parse CSV with comma delimiter', async () => {
    const csv = `Name,Age,Email
John Doe,30,john@example.com
Jane Smith,25,jane@example.com`;

    const buffer = Buffer.from(csv, 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'csv',
      fileName: 'test.csv',
    });

    expect(result.columns).toHaveLength(3);
    expect(result.rowCount).toBe(2);
    expect(result.delimiter).toBe(',');
    expect(result.columns[0].name).toBe('Name');
    expect(result.columns[1].type).toBe('number');
    expect(result.columns[2].type).toBe('email');
  });

  it('should detect semicolon delimiter', async () => {
    const csv = `Name;Age;City
John;30;NYC
Jane;25;LA`;

    const buffer = Buffer.from(csv, 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'csv',
      fileName: 'test.csv',
    });

    expect(result.delimiter).toBe(';');
    expect(result.rowCount).toBe(2);
  });

  it('should sanitize column names (remove formula injection)', async () => {
    const csv = `=Name,+Age,-Score,@Email
John,30,100,john@example.com`;

    const buffer = Buffer.from(csv, 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'csv',
      fileName: 'test.csv',
    });

    expect(result.columns[0].name).toBe('Name');
    expect(result.columns[1].name).toBe('Age');
    expect(result.columns[2].name).toBe('Score');
    expect(result.columns[3].name).toBe('Email');
  });

  it('should infer date columns', async () => {
    const csv = `Date,Value
2024-01-15,100
2024-02-20,200`;

    const buffer = Buffer.from(csv, 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'csv',
      fileName: 'test.csv',
    });

    expect(result.columns[0].type).toBe('date');
    expect(result.columns[0].dateFormat).toBe('YYYY-MM-DD');
  });

  it('should infer currency columns', async () => {
    const csv = `Amount,Currency
$100.00,USD
$250.50,USD`;

    const buffer = Buffer.from(csv, 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'csv',
      fileName: 'test.csv',
    });

    expect(result.columns[0].type).toBe('currency');
  });
});

describe('JSON Parser', () => {
  it('should parse JSON array of objects', async () => {
    const data = [
      { name: 'John', age: 30, email: 'john@example.com' },
      { name: 'Jane', age: 25, email: 'jane@example.com' },
    ];

    const buffer = Buffer.from(JSON.stringify(data), 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'json',
      fileName: 'test.json',
    });

    expect(result.columns).toHaveLength(3);
    expect(result.rowCount).toBe(2);
    expect(result.columns.find(c => c.name === 'email')?.type).toBe('email');
  });

  it('should handle missing fields in JSON', async () => {
    const data = [
      { name: 'John', age: 30 },
      { name: 'Jane', email: 'jane@example.com' },
    ];

    const buffer = Buffer.from(JSON.stringify(data), 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'json',
      fileName: 'test.json',
    });

    expect(result.columns).toHaveLength(3); // name, age, email
  });
});

describe('Schema Inference', () => {
  it('should detect phone numbers', async () => {
    const csv = `Phone
555-123-4567
555-987-6543`;

    const buffer = Buffer.from(csv, 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'csv',
      fileName: 'test.csv',
    });

    expect(result.columns[0].type).toBe('phone');
  });

  it('should detect URLs', async () => {
    const csv = `Website
https://example.com
https://test.com`;

    const buffer = Buffer.from(csv, 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'csv',
      fileName: 'test.csv',
    });

    expect(result.columns[0].type).toBe('url');
  });

  it('should detect boolean values', async () => {
    const csv = `Active
true
false
true`;

    const buffer = Buffer.from(csv, 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'csv',
      fileName: 'test.csv',
    });

    expect(result.columns[0].type).toBe('boolean');
  });

  it('should handle null values', async () => {
    const csv = `Name,Age
John,30
Jane,
Bob,25`;

    const buffer = Buffer.from(csv, 'utf-8');
    const result = await parseAndInferSchema({
      buffer,
      format: 'csv',
      fileName: 'test.csv',
    });

    expect(result.columns[1].nullable).toBe(true);
    expect(result.columns[1].nullCount).toBe(1);
  });
});
