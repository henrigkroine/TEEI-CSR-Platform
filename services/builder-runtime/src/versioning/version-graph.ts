/**
 * Version Graph - Immutable versioning with visual diff support
 *
 * Maintains a directed acyclic graph (DAG) of canvas versions
 */

import { z } from 'zod';
import { Canvas, Block } from '../canvas/blocks.js';

/**
 * Version Node Schema
 */
export const VersionNodeSchema = z.object({
  id: z.string().uuid(),
  canvasId: z.string().uuid(),
  versionNumber: z.number().int().min(1),
  parentVersionId: z.string().uuid().nullable(),
  snapshot: z.any(), // Full canvas snapshot
  snapshotHash: z.string(), // SHA-256 hash of snapshot for integrity
  changesSummary: z.object({
    blocksAdded: z.number().int().min(0),
    blocksModified: z.number().int().min(0),
    blocksDeleted: z.number().int().min(0),
    description: z.string().max(500).optional()
  }),
  metadata: z.object({
    createdBy: z.string().uuid(),
    createdAt: z.string().datetime(),
    tags: z.array(z.string()).default([]),
    commitMessage: z.string().max(1000).optional()
  })
});

export type VersionNode = z.infer<typeof VersionNodeSchema>;

/**
 * Version Diff Schema
 */
export const VersionDiffSchema = z.object({
  fromVersion: z.number().int(),
  toVersion: z.number().int(),
  changes: z.array(z.object({
    type: z.enum(['added', 'modified', 'deleted', 'moved']),
    blockId: z.string().uuid(),
    blockType: z.string(),
    blockTitle: z.string(),
    oldValue: z.any().optional(),
    newValue: z.any().optional(),
    path: z.string().optional() // JSON path to changed property
  })),
  summary: z.object({
    totalChanges: z.number().int().min(0),
    blocksAdded: z.number().int().min(0),
    blocksModified: z.number().int().min(0),
    blocksDeleted: z.number().int().min(0),
    blocksMoved: z.number().int().min(0)
  })
});

export type VersionDiff = z.infer<typeof VersionDiffSchema>;

/**
 * Create a new version snapshot
 */
export function createVersionSnapshot(
  canvas: Canvas,
  parentVersionId: string | null,
  versionNumber: number,
  createdBy: string,
  commitMessage?: string
): VersionNode {
  const snapshot = JSON.parse(JSON.stringify(canvas)); // Deep clone
  const snapshotHash = computeHash(snapshot);

  return {
    id: crypto.randomUUID(),
    canvasId: canvas.id,
    versionNumber,
    parentVersionId,
    snapshot,
    snapshotHash,
    changesSummary: {
      blocksAdded: 0,
      blocksModified: 0,
      blocksDeleted: 0,
      description: commitMessage
    },
    metadata: {
      createdBy,
      createdAt: new Date().toISOString(),
      tags: [],
      commitMessage
    }
  };
}

/**
 * Compute SHA-256 hash of snapshot
 */
function computeHash(snapshot: any): string {
  const crypto = require('crypto');
  const data = JSON.stringify(snapshot, Object.keys(snapshot).sort());
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compare two versions and generate diff
 */
export function diffVersions(
  fromVersion: VersionNode,
  toVersion: VersionNode
): VersionDiff {
  const fromBlocks = new Map<string, Block>(
    fromVersion.snapshot.blocks.map((b: Block) => [b.id, b])
  );
  const toBlocks = new Map<string, Block>(
    toVersion.snapshot.blocks.map((b: Block) => [b.id, b])
  );

  const changes: VersionDiff['changes'] = [];
  let blocksAdded = 0;
  let blocksModified = 0;
  let blocksDeleted = 0;
  let blocksMoved = 0;

  // Check for added and modified blocks
  for (const [id, toBlock] of toBlocks.entries()) {
    const fromBlock = fromBlocks.get(id);

    if (!fromBlock) {
      // Block added
      changes.push({
        type: 'added',
        blockId: id,
        blockType: toBlock.type,
        blockTitle: toBlock.title,
        newValue: toBlock
      });
      blocksAdded++;
    } else {
      // Check if modified
      const diff = deepDiff(fromBlock, toBlock);

      if (diff.length > 0) {
        // Check if just position changed
        const positionOnly = diff.every(d => d.path.startsWith('position'));

        if (positionOnly) {
          changes.push({
            type: 'moved',
            blockId: id,
            blockType: toBlock.type,
            blockTitle: toBlock.title,
            oldValue: fromBlock.position,
            newValue: toBlock.position
          });
          blocksMoved++;
        } else {
          changes.push({
            type: 'modified',
            blockId: id,
            blockType: toBlock.type,
            blockTitle: toBlock.title,
            oldValue: fromBlock,
            newValue: toBlock
          });
          blocksModified++;
        }
      }
    }
  }

  // Check for deleted blocks
  for (const [id, fromBlock] of fromBlocks.entries()) {
    if (!toBlocks.has(id)) {
      changes.push({
        type: 'deleted',
        blockId: id,
        blockType: fromBlock.type,
        blockTitle: fromBlock.title,
        oldValue: fromBlock
      });
      blocksDeleted++;
    }
  }

  return {
    fromVersion: fromVersion.versionNumber,
    toVersion: toVersion.versionNumber,
    changes,
    summary: {
      totalChanges: changes.length,
      blocksAdded,
      blocksModified,
      blocksDeleted,
      blocksMoved
    }
  };
}

/**
 * Deep diff two objects
 */
function deepDiff(
  obj1: any,
  obj2: any,
  path: string = ''
): Array<{ path: string; oldValue: any; newValue: any }> {
  const diffs: Array<{ path: string; oldValue: any; newValue: any }> = [];

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    if (obj1 !== obj2) {
      diffs.push({ path, oldValue: obj1, newValue: obj2 });
    }
    return diffs;
  }

  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;

    if (!(key in obj1)) {
      diffs.push({ path: newPath, oldValue: undefined, newValue: obj2[key] });
    } else if (!(key in obj2)) {
      diffs.push({ path: newPath, oldValue: obj1[key], newValue: undefined });
    } else {
      diffs.push(...deepDiff(obj1[key], obj2[key], newPath));
    }
  }

  return diffs;
}

/**
 * Restore canvas from version snapshot
 */
export function restoreFromVersion(version: VersionNode): Canvas {
  // Verify hash integrity
  const computedHash = computeHash(version.snapshot);
  if (computedHash !== version.snapshotHash) {
    throw new Error('Version snapshot integrity check failed: hash mismatch');
  }

  return JSON.parse(JSON.stringify(version.snapshot)); // Deep clone
}

/**
 * Get version history (linear chain from root to version)
 */
export function getVersionHistory(
  versions: VersionNode[],
  targetVersionId: string
): VersionNode[] {
  const versionMap = new Map(versions.map(v => [v.id, v]));
  const history: VersionNode[] = [];

  let currentVersion = versionMap.get(targetVersionId);

  while (currentVersion) {
    history.unshift(currentVersion); // Add to beginning
    currentVersion = currentVersion.parentVersionId
      ? versionMap.get(currentVersion.parentVersionId)
      : undefined;
  }

  return history;
}

/**
 * Find latest version for a canvas
 */
export function findLatestVersion(versions: VersionNode[]): VersionNode | null {
  if (versions.length === 0) {
    return null;
  }

  return versions.reduce((latest, current) =>
    current.versionNumber > latest.versionNumber ? current : latest
  );
}

/**
 * Validate version graph (no cycles, all parents exist)
 */
export function validateVersionGraph(versions: VersionNode[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const versionMap = new Map(versions.map(v => [v.id, v]));

  for (const version of versions) {
    // Check parent exists
    if (version.parentVersionId && !versionMap.has(version.parentVersionId)) {
      errors.push(
        `Version ${version.id} references non-existent parent ${version.parentVersionId}`
      );
    }

    // Check for cycles (version can't be its own ancestor)
    const visited = new Set<string>();
    let current = version;

    while (current.parentVersionId) {
      if (visited.has(current.id)) {
        errors.push(`Cycle detected in version graph involving ${version.id}`);
        break;
      }

      visited.add(current.id);
      const parent = versionMap.get(current.parentVersionId);

      if (!parent) {
        break;
      }

      current = parent;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
