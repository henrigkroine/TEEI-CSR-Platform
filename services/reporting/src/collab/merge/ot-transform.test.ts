/**
 * Unit tests for Operational Transform (OT) algorithm
 *
 * Tests conflict-free transformation of concurrent operations.
 * Target: ≥90% code coverage
 */

import { describe, test, expect } from 'vitest';
import {
  transform,
  applyOperation,
  validateOperation,
  compressOperations
} from './ot-transform';
import type { Operation, InsertOperation, DeleteOperation, ReplaceOperation } from '@teei/shared-types';

describe('Operational Transform', () => {
  describe('transform - Insert vs Insert', () => {
    test('should handle inserts at different positions', () => {
      const opA: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 0,
        text: 'A'
      };

      const opB: InsertOperation = {
        ...opA,
        id: '2',
        userId: 'user2',
        clock: 1,
        position: 5,
        text: 'B'
      };

      const [opA_, opB_] = transform(opA, opB);

      // A inserts before B -> B's position shifts
      expect(opA_.position).toBe(0);
      expect(opB_.position).toBe(6); // 5 + 1 (length of 'A')
    });

    test('should handle inserts at same position with tie-breaking', () => {
      const opA: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'alice',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 5,
        text: 'A'
      };

      const opB: InsertOperation = {
        ...opA,
        id: '2',
        userId: 'bob',
        text: 'B'
      };

      const [opA_, opB_] = transform(opA, opB);

      // Tie-breaking by userId (lexicographic)
      // 'alice' < 'bob' -> A goes first
      expect(opA_.position).toBe(5);
      expect(opB_.position).toBe(6);
    });
  });

  describe('transform - Insert vs Delete', () => {
    test('should handle insert before delete range', () => {
      const opInsert: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 0,
        text: 'X'
      };

      const opDelete: DeleteOperation = {
        id: '2',
        docId: 'doc1',
        userId: 'user2',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 5,
        length: 3
      };

      const [opInsert_, opDelete_] = transform(opInsert, opDelete);

      // Insert before delete -> delete position shifts
      expect(opInsert_.position).toBe(0);
      expect(opDelete_.position).toBe(6); // 5 + 1
    });

    test('should handle insert after delete range', () => {
      const opInsert: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 10,
        text: 'X'
      };

      const opDelete: DeleteOperation = {
        id: '2',
        docId: 'doc1',
        userId: 'user2',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 0,
        length: 5
      };

      const [opInsert_, opDelete_] = transform(opInsert, opDelete);

      // Insert after delete -> insert position shifts backward
      expect(opInsert_.position).toBe(5); // 10 - 5
      expect(opDelete_.position).toBe(0);
    });

    test('should handle insert inside delete range', () => {
      const opInsert: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 3,
        text: 'X'
      };

      const opDelete: DeleteOperation = {
        id: '2',
        docId: 'doc1',
        userId: 'user2',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 0,
        length: 10
      };

      const [opInsert_, opDelete_] = transform(opInsert, opDelete);

      // Insert moves to start of delete
      expect(opInsert_.position).toBe(0);
    });
  });

  describe('transform - Delete vs Delete', () => {
    test('should handle non-overlapping deletes', () => {
      const opA: DeleteOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 0,
        length: 3
      };

      const opB: DeleteOperation = {
        id: '2',
        docId: 'doc1',
        userId: 'user2',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 10,
        length: 5
      };

      const [opA_, opB_] = transform(opA, opB);

      // A before B -> B shifts backward
      expect(opA_.position).toBe(0);
      expect(opA_.length).toBe(3);
      expect(opB_.position).toBe(7); // 10 - 3
      expect(opB_.length).toBe(5);
    });

    test('should handle overlapping deletes', () => {
      const opA: DeleteOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 0,
        length: 10
      };

      const opB: DeleteOperation = {
        id: '2',
        docId: 'doc1',
        userId: 'user2',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 5,
        length: 10
      };

      const [opA_, opB_] = transform(opA, opB);

      // Overlapping region: [5, 10)
      // After A deletes [0,10), B only deletes [10,15) relative to A
      expect(opA_.length).toBe(5); // Reduced by overlap
      expect(opB_.length).toBe(5); // Reduced by overlap
    });

    test('should handle fully contained delete', () => {
      const opA: DeleteOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 0,
        length: 20
      };

      const opB: DeleteOperation = {
        id: '2',
        docId: 'doc1',
        userId: 'user2',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 5,
        length: 5
      };

      const [opA_, opB_] = transform(opA, opB);

      // B is fully contained in A -> B becomes noop
      expect(opB_.length).toBe(0);
    });
  });

  describe('applyOperation', () => {
    test('should apply insert', () => {
      const content = 'Hello';
      const op: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 5,
        text: ' World'
      };

      const result = applyOperation(content, op);
      expect(result).toBe('Hello World');
    });

    test('should apply delete', () => {
      const content = 'Hello World';
      const op: DeleteOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 5,
        length: 6
      };

      const result = applyOperation(content, op);
      expect(result).toBe('Hello');
    });

    test('should apply replace', () => {
      const content = 'Hello World';
      const op: ReplaceOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'replace',
        position: 6,
        length: 5,
        text: 'Everyone'
      };

      const result = applyOperation(content, op);
      expect(result).toBe('Hello Everyone');
    });
  });

  describe('validateOperation', () => {
    test('should validate correct operation', () => {
      const op: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 5,
        text: 'test'
      };

      expect(() => validateOperation(op, 'doc1', 10)).not.toThrow();
    });

    test('should reject operation with mismatched docId', () => {
      const op: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 5,
        text: 'test'
      };

      expect(() => validateOperation(op, 'doc2', 10)).toThrow('docId mismatch');
    });

    test('should reject operation with out-of-bounds position', () => {
      const op: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 20,
        text: 'test'
      };

      expect(() => validateOperation(op, 'doc1', 10)).toThrow('out of bounds');
    });

    test('should reject delete beyond content length', () => {
      const op: DeleteOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'delete',
        position: 5,
        length: 10
      };

      expect(() => validateOperation(op, 'doc1', 10)).toThrow('beyond content length');
    });

    test('should reject insert with control characters', () => {
      const op: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 0,
        text: 'test\x00invalid'
      };

      expect(() => validateOperation(op, 'doc1', 10)).toThrow('invalid control characters');
    });
  });

  describe('compressOperations', () => {
    test('should merge adjacent inserts from same user', () => {
      const ops: InsertOperation[] = [
        {
          id: '1',
          docId: 'doc1',
          userId: 'user1',
          timestamp: Date.now(),
          clock: 1,
          type: 'insert',
          position: 0,
          text: 'a'
        },
        {
          id: '2',
          docId: 'doc1',
          userId: 'user1',
          timestamp: Date.now(),
          clock: 2,
          type: 'insert',
          position: 1,
          text: 'b'
        }
      ];

      const compressed = compressOperations(ops);

      expect(compressed.length).toBe(1);
      expect((compressed[0] as InsertOperation).text).toBe('ab');
      expect(compressed[0].clock).toBe(2);
    });

    test('should not merge inserts from different users', () => {
      const ops: InsertOperation[] = [
        {
          id: '1',
          docId: 'doc1',
          userId: 'user1',
          timestamp: Date.now(),
          clock: 1,
          type: 'insert',
          position: 0,
          text: 'a'
        },
        {
          id: '2',
          docId: 'doc1',
          userId: 'user2',
          timestamp: Date.now(),
          clock: 2,
          type: 'insert',
          position: 1,
          text: 'b'
        }
      ];

      const compressed = compressOperations(ops);

      expect(compressed.length).toBe(2);
    });

    test('should merge adjacent deletes', () => {
      const ops: DeleteOperation[] = [
        {
          id: '1',
          docId: 'doc1',
          userId: 'user1',
          timestamp: Date.now(),
          clock: 1,
          type: 'delete',
          position: 0,
          length: 3
        },
        {
          id: '2',
          docId: 'doc1',
          userId: 'user1',
          timestamp: Date.now(),
          clock: 2,
          type: 'delete',
          position: 0,
          length: 2
        }
      ];

      const compressed = compressOperations(ops);

      expect(compressed.length).toBe(1);
      expect((compressed[0] as DeleteOperation).length).toBe(5);
    });
  });

  describe('Convergence property', () => {
    test('should converge to same result regardless of operation order', () => {
      const content = 'Hello';

      const opA: InsertOperation = {
        id: '1',
        docId: 'doc1',
        userId: 'user1',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 5,
        text: ' World'
      };

      const opB: InsertOperation = {
        id: '2',
        docId: 'doc1',
        userId: 'user2',
        timestamp: Date.now(),
        clock: 1,
        type: 'insert',
        position: 0,
        text: 'Hey '
      };

      // Apply A then B'
      const [opA_, opB_] = transform(opA, opB);
      const result1 = applyOperation(applyOperation(content, opA), opB_);

      // Apply B then A'
      const [opB__, opA__] = transform(opB, opA);
      const result2 = applyOperation(applyOperation(content, opB), opA__);

      expect(result1).toBe(result2);
      expect(result1).toBe('Hey Hello World');
    });
  });
});
