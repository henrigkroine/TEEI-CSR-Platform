/**
 * Tests for RingBuffer (In-Memory Level 1 Cache)
 */

import { describe, it, expect } from 'vitest';
import { RingBuffer } from './RingBuffer';

describe('RingBuffer', () => {
  describe('Basic Operations', () => {
    it('should initialize with correct capacity', () => {
      const buffer = new RingBuffer<number>(3);
      expect(buffer.capacity()).toBe(3);
      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.isFull()).toBe(false);
    });

    it('should reject invalid capacity', () => {
      expect(() => new RingBuffer(0)).toThrow('RingBuffer maxSize must be at least 1');
      expect(() => new RingBuffer(-1)).toThrow('RingBuffer maxSize must be at least 1');
    });

    it('should push items correctly', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      expect(buffer.size()).toBe(1);
      expect(buffer.getLatest()).toBe(1);

      buffer.push(2);
      expect(buffer.size()).toBe(2);
      expect(buffer.getLatest()).toBe(2);

      buffer.push(3);
      expect(buffer.size()).toBe(3);
      expect(buffer.isFull()).toBe(true);
      expect(buffer.getLatest()).toBe(3);
    });

    it('should overwrite oldest when full (FIFO)', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Overwrites 1

      expect(buffer.size()).toBe(3);
      expect(buffer.getAll()).toEqual([2, 3, 4]);
      expect(buffer.getLatest()).toBe(4);
    });

    it('should return null for empty buffer', () => {
      const buffer = new RingBuffer<number>(3);
      expect(buffer.getLatest()).toBeNull();
    });

    it('should clear buffer correctly', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.clear();

      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.getLatest()).toBeNull();
    });
  });

  describe('getAll() chronological order', () => {
    it('should return items in chronological order (not full)', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.getAll()).toEqual([1, 2, 3]);
    });

    it('should return items in chronological order (full + wrapped)', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Overwrites 1
      buffer.push(5); // Overwrites 2

      expect(buffer.getAll()).toEqual([3, 4, 5]);
    });
  });

  describe('getAt() indexed access', () => {
    it('should return item at specific index', () => {
      const buffer = new RingBuffer<string>(3);
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');

      expect(buffer.getAt(0)).toBe('a'); // Oldest
      expect(buffer.getAt(1)).toBe('b');
      expect(buffer.getAt(2)).toBe('c'); // Newest
    });

    it('should handle wrapped buffer correctly', () => {
      const buffer = new RingBuffer<string>(3);
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');
      buffer.push('d'); // Overwrites 'a'

      expect(buffer.getAt(0)).toBe('b'); // Oldest after wrap
      expect(buffer.getAt(1)).toBe('c');
      expect(buffer.getAt(2)).toBe('d'); // Newest
    });

    it('should return null for out-of-bounds index', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);

      expect(buffer.getAt(-1)).toBeNull();
      expect(buffer.getAt(2)).toBeNull(); // Only 2 items
      expect(buffer.getAt(100)).toBeNull();
    });
  });
});
