/**
 * Ring Buffer (Circular Buffer) for Level 1 In-Memory Cache
 *
 * FIFO queue with fixed capacity. When full, oldest items are overwritten.
 * Provides O(1) push and getLatest operations with minimal memory overhead.
 *
 * Design:
 * - Fixed-size array (default: 3 snapshots)
 * - Write pointer tracks next insertion position
 * - No memory allocation after initialization (performance)
 * - Thread-safe for single-threaded JS (no locks needed)
 *
 * Performance:
 * - push(): O(1)
 * - getLatest(): O(1)
 * - getAll(): O(n)
 * - Memory: O(capacity)
 */

export class RingBuffer<T> {
  private buffer: (T | undefined)[] = [];
  private maxSize: number;
  private writeIndex = 0;
  private itemCount = 0; // Track actual items for getLatest logic

  /**
   * Creates a new ring buffer with fixed capacity
   * @param maxSize Maximum number of items to store (default: 3)
   */
  constructor(maxSize: number = 3) {
    if (maxSize < 1) {
      throw new Error('RingBuffer maxSize must be at least 1');
    }
    this.maxSize = maxSize;
    // Pre-allocate array for performance (avoid resizing)
    this.buffer = new Array(maxSize).fill(undefined);
  }

  /**
   * Pushes a new item into the buffer
   * Overwrites oldest item if buffer is full
   *
   * @param item Item to push
   */
  push(item: T): void {
    this.buffer[this.writeIndex] = item;
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;

    // Track item count up to maxSize
    if (this.itemCount < this.maxSize) {
      this.itemCount++;
    }
  }

  /**
   * Gets the most recently pushed item
   *
   * @returns Latest item, or null if buffer is empty
   */
  getLatest(): T | null {
    if (this.itemCount === 0) {
      return null;
    }

    // Latest item is one position before writeIndex (with wrap-around)
    const latestIndex = (this.writeIndex - 1 + this.maxSize) % this.maxSize;
    return this.buffer[latestIndex] ?? null;
  }

  /**
   * Gets all items in chronological order (oldest first)
   *
   * @returns Array of items (may be smaller than maxSize)
   */
  getAll(): T[] {
    if (this.itemCount === 0) {
      return [];
    }

    const result: T[] = [];

    if (this.itemCount < this.maxSize) {
      // Buffer not full yet - return items from 0 to writeIndex
      for (let i = 0; i < this.writeIndex; i++) {
        const item = this.buffer[i];
        if (item !== undefined) {
          result.push(item);
        }
      }
    } else {
      // Buffer is full - return items from writeIndex (oldest) to end, then wrap around
      for (let i = 0; i < this.maxSize; i++) {
        const index = (this.writeIndex + i) % this.maxSize;
        const item = this.buffer[index];
        if (item !== undefined) {
          result.push(item);
        }
      }
    }

    return result;
  }

  /**
   * Gets item at specific index (0 = oldest, n-1 = newest)
   *
   * @param index Zero-based index
   * @returns Item at index, or null if out of bounds
   */
  getAt(index: number): T | null {
    if (index < 0 || index >= this.itemCount) {
      return null;
    }

    if (this.itemCount < this.maxSize) {
      return this.buffer[index] ?? null;
    } else {
      const actualIndex = (this.writeIndex + index) % this.maxSize;
      return this.buffer[actualIndex] ?? null;
    }
  }

  /**
   * Clears all items from the buffer
   */
  clear(): void {
    this.buffer = new Array(this.maxSize).fill(undefined);
    this.writeIndex = 0;
    this.itemCount = 0;
  }

  /**
   * Returns the number of items currently in the buffer
   */
  size(): number {
    return this.itemCount;
  }

  /**
   * Returns the maximum capacity of the buffer
   */
  capacity(): number {
    return this.maxSize;
  }

  /**
   * Checks if the buffer is full
   */
  isFull(): boolean {
    return this.itemCount === this.maxSize;
  }

  /**
   * Checks if the buffer is empty
   */
  isEmpty(): boolean {
    return this.itemCount === 0;
  }
}
