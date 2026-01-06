/**
 * Operational Transform (OT) Algorithm for Real-Time Collaboration
 *
 * Implements conflict-free transformation of concurrent operations
 * using operational transformation principles.
 *
 * References:
 * - "Operational transformation in real-time group editors" (Ellis & Gibbs, 1989)
 * - "Achieving Convergence in Operational Transformation" (Sun et al., 1998)
 */

import type {
  Operation,
  OperationType,
  InsertOperation,
  DeleteOperation,
  ReplaceOperation,
  SetAttributeOperation,
  RemoveAttributeOperation
} from '@teei/shared-types';

/**
 * Transform two concurrent operations against each other
 *
 * Given operations A and B that were created concurrently (same base state),
 * returns transformed operations A' and B' such that:
 * - Applying A then B' produces the same result as applying B then A'
 *
 * @param opA First operation
 * @param opB Second operation
 * @returns [opA', opB'] - Transformed operations
 */
export function transform(
  opA: Operation,
  opB: Operation
): [Operation, Operation] {
  // Handle same-user operations (no transformation needed)
  if (opA.userId === opB.userId && opA.clock === opB.clock) {
    return [opA, opB];
  }

  // Dispatch to specific transform functions
  if (opA.type === OperationType.Insert && opB.type === OperationType.Insert) {
    return transformInsertInsert(opA, opB);
  }

  if (opA.type === OperationType.Insert && opB.type === OperationType.Delete) {
    return transformInsertDelete(opA, opB);
  }

  if (opA.type === OperationType.Delete && opB.type === OperationType.Insert) {
    const [opB_, opA_] = transformInsertDelete(opB, opA);
    return [opA_, opB_];
  }

  if (opA.type === OperationType.Delete && opB.type === OperationType.Delete) {
    return transformDeleteDelete(opA, opB);
  }

  if (opA.type === OperationType.Replace || opB.type === OperationType.Replace) {
    // Decompose replace into delete + insert
    return transformReplace(opA, opB);
  }

  // Attribute operations
  if (isAttributeOp(opA) || isAttributeOp(opB)) {
    return transformAttribute(opA, opB);
  }

  // Fallback: no transformation
  return [opA, opB];
}

/**
 * Transform Insert vs Insert
 *
 * Case 1: Same position -> use tie-breaking (user ID)
 * Case 2: Different positions -> adjust if needed
 */
function transformInsertInsert(
  opA: InsertOperation,
  opB: InsertOperation
): [InsertOperation, InsertOperation] {
  const posA = opA.position;
  const posB = opB.position;

  if (posA < posB) {
    // A inserts before B -> shift B's position
    return [
      opA,
      { ...opB, position: posB + opA.text.length }
    ];
  }

  if (posA > posB) {
    // B inserts before A -> shift A's position
    return [
      { ...opA, position: posA + opB.text.length },
      opB
    ];
  }

  // Same position: tie-break by user ID (lexicographic)
  if (opA.userId < opB.userId) {
    return [
      opA,
      { ...opB, position: posB + opA.text.length }
    ];
  } else {
    return [
      { ...opA, position: posA + opB.text.length },
      opB
    ];
  }
}

/**
 * Transform Insert vs Delete
 */
function transformInsertDelete(
  opInsert: InsertOperation,
  opDelete: DeleteOperation
): [InsertOperation, DeleteOperation] {
  const insPos = opInsert.position;
  const delPos = opDelete.position;
  const delEnd = delPos + opDelete.length;

  // Insert is before delete range
  if (insPos <= delPos) {
    return [
      opInsert,
      { ...opDelete, position: delPos + opInsert.text.length }
    ];
  }

  // Insert is after delete range
  if (insPos >= delEnd) {
    return [
      { ...opInsert, position: insPos - opDelete.length },
      opDelete
    ];
  }

  // Insert is inside delete range -> move insert to start of delete
  return [
    { ...opInsert, position: delPos },
    opDelete
  ];
}

/**
 * Transform Delete vs Delete
 */
function transformDeleteDelete(
  opA: DeleteOperation,
  opB: DeleteOperation
): [DeleteOperation, DeleteOperation] {
  const posA = opA.position;
  const posB = opB.position;
  const endA = posA + opA.length;
  const endB = posB + opB.length;

  // No overlap: adjust positions
  if (endA <= posB) {
    // A is entirely before B
    return [
      opA,
      { ...opB, position: posB - opA.length }
    ];
  }

  if (endB <= posA) {
    // B is entirely before A
    return [
      { ...opA, position: posA - opB.length },
      opB
    ];
  }

  // Overlapping deletes: compute intersection and adjust
  const overlapStart = Math.max(posA, posB);
  const overlapEnd = Math.min(endA, endB);
  const overlapLen = overlapEnd - overlapStart;

  // A's perspective: subtract overlap from B's delete
  const opA_: DeleteOperation = {
    ...opA,
    position: posA < posB ? posA : posA - (posB < posA ? opB.length - overlapLen : 0),
    length: opA.length - (posA >= posB && endA <= endB ? opA.length : overlapLen)
  };

  // B's perspective: subtract overlap from A's delete
  const opB_: DeleteOperation = {
    ...opB,
    position: posB < posA ? posB : posB - (posA < posB ? opA.length - overlapLen : 0),
    length: opB.length - (posB >= posA && endB <= endA ? opB.length : overlapLen)
  };

  // Handle degenerate case: delete of length 0
  if (opA_.length <= 0) {
    opA_.length = 0;
  }
  if (opB_.length <= 0) {
    opB_.length = 0;
  }

  return [opA_, opB_];
}

/**
 * Transform Replace operations (decompose into delete + insert)
 */
function transformReplace(
  opA: Operation,
  opB: Operation
): [Operation, Operation] {
  // Decompose replace into atomic delete + insert
  const opsA = decomposeOperation(opA);
  const opsB = decomposeOperation(opB);

  // Transform each pair
  let currentA = opsA;
  let currentB = opsB;

  for (let i = 0; i < currentA.length; i++) {
    for (let j = 0; j < currentB.length; j++) {
      [currentA[i], currentB[j]] = transform(currentA[i], currentB[j]);
    }
  }

  // Recompose if possible
  const opA_ = recomposeOperations(currentA, opA.type);
  const opB_ = recomposeOperations(currentB, opB.type);

  return [opA_, opB_];
}

/**
 * Transform attribute operations
 */
function transformAttribute(
  opA: Operation,
  opB: Operation
): [Operation, Operation] {
  // Attribute operations are position-based
  // Apply same logic as insert/delete for position adjustment
  if (!isAttributeOp(opA) || !isAttributeOp(opB)) {
    return [opA, opB];
  }

  const posA = (opA as SetAttributeOperation).position;
  const posB = (opB as SetAttributeOperation).position;

  // Simple position adjustment (can be enhanced)
  if (posA < posB) {
    return [opA, opB];
  } else {
    return [opA, opB];
  }
}

/**
 * Decompose compound operations into atomic ops
 */
function decomposeOperation(op: Operation): Operation[] {
  if (op.type === OperationType.Replace) {
    const replaceOp = op as ReplaceOperation;
    return [
      {
        ...op,
        type: OperationType.Delete,
        length: replaceOp.length
      } as DeleteOperation,
      {
        ...op,
        type: OperationType.Insert,
        position: replaceOp.position,
        text: replaceOp.text
      } as InsertOperation
    ];
  }
  return [op];
}

/**
 * Recompose atomic operations back into compound op (if applicable)
 */
function recomposeOperations(ops: Operation[], originalType: OperationType): Operation {
  if (originalType === OperationType.Replace && ops.length === 2) {
    const deleteOp = ops[0] as DeleteOperation;
    const insertOp = ops[1] as InsertOperation;
    return {
      ...deleteOp,
      type: OperationType.Replace,
      text: insertOp.text
    } as ReplaceOperation;
  }
  return ops[0]; // Return first op as fallback
}

/**
 * Check if operation is an attribute operation
 */
function isAttributeOp(op: Operation): boolean {
  return (
    op.type === OperationType.SetAttribute ||
    op.type === OperationType.RemoveAttribute
  );
}

/**
 * Apply operation to text content
 *
 * @param content Current text content
 * @param op Operation to apply
 * @returns New text content
 */
export function applyOperation(content: string, op: Operation): string {
  switch (op.type) {
    case OperationType.Insert: {
      const insertOp = op as InsertOperation;
      return (
        content.slice(0, insertOp.position) +
        insertOp.text +
        content.slice(insertOp.position)
      );
    }

    case OperationType.Delete: {
      const deleteOp = op as DeleteOperation;
      return (
        content.slice(0, deleteOp.position) +
        content.slice(deleteOp.position + deleteOp.length)
      );
    }

    case OperationType.Replace: {
      const replaceOp = op as ReplaceOperation;
      return (
        content.slice(0, replaceOp.position) +
        replaceOp.text +
        content.slice(replaceOp.position + replaceOp.length)
      );
    }

    // Attribute operations don't modify content
    case OperationType.SetAttribute:
    case OperationType.RemoveAttribute:
      return content;

    default:
      return content;
  }
}

/**
 * Validate operation against document constraints
 *
 * @throws Error if operation is invalid
 */
export function validateOperation(
  op: Operation,
  docId: string,
  contentLength: number
): void {
  // Validate docId match
  if (op.docId !== docId) {
    throw new Error(
      `Operation docId mismatch: expected ${docId}, got ${op.docId}`
    );
  }

  // Validate position bounds
  const position = (op as any).position;
  if (position !== undefined) {
    if (position < 0 || position > contentLength) {
      throw new Error(
        `Operation position ${position} out of bounds [0, ${contentLength}]`
      );
    }
  }

  // Validate delete/replace length
  if (op.type === OperationType.Delete || op.type === OperationType.Replace) {
    const deleteOp = op as DeleteOperation;
    if (deleteOp.position + deleteOp.length > contentLength) {
      throw new Error(
        `Operation would delete beyond content length: pos=${deleteOp.position}, len=${deleteOp.length}, content=${contentLength}`
      );
    }
  }

  // Validate insert text (no control characters except newline/tab)
  if (op.type === OperationType.Insert || op.type === OperationType.Replace) {
    const text = (op as InsertOperation).text;
    if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(text)) {
      throw new Error('Operation contains invalid control characters');
    }
  }
}

/**
 * Compress operation sequence by merging adjacent ops
 *
 * Example: Insert("a", 0) + Insert("b", 1) -> Insert("ab", 0)
 */
export function compressOperations(ops: Operation[]): Operation[] {
  if (ops.length <= 1) return ops;

  const compressed: Operation[] = [];
  let current = ops[0];

  for (let i = 1; i < ops.length; i++) {
    const next = ops[i];

    // Try to merge current with next
    const merged = tryMerge(current, next);
    if (merged) {
      current = merged;
    } else {
      compressed.push(current);
      current = next;
    }
  }

  compressed.push(current);
  return compressed;
}

/**
 * Attempt to merge two adjacent operations
 */
function tryMerge(opA: Operation, opB: Operation): Operation | null {
  // Only merge ops from same user
  if (opA.userId !== opB.userId) return null;

  // Merge adjacent inserts
  if (
    opA.type === OperationType.Insert &&
    opB.type === OperationType.Insert
  ) {
    const insertA = opA as InsertOperation;
    const insertB = opB as InsertOperation;

    if (insertA.position + insertA.text.length === insertB.position) {
      return {
        ...insertA,
        text: insertA.text + insertB.text,
        clock: Math.max(insertA.clock, insertB.clock)
      };
    }
  }

  // Merge adjacent deletes
  if (
    opA.type === OperationType.Delete &&
    opB.type === OperationType.Delete
  ) {
    const deleteA = opA as DeleteOperation;
    const deleteB = opB as DeleteOperation;

    if (deleteA.position === deleteB.position) {
      return {
        ...deleteA,
        length: deleteA.length + deleteB.length,
        clock: Math.max(deleteA.clock, deleteB.clock)
      };
    }
  }

  return null;
}
