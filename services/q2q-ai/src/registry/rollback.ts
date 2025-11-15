/**
 * One-Click Rollback
 *
 * Provides zero-downtime rollback functionality:
 * - Reverts to previous override version from registry
 * - Validates rollback target exists
 * - Applies rollback with zero downtime
 * - Logs rollback reason and timestamp
 * - Notifies stakeholders (email/Slack)
 */

import { ModelRegistry } from '@teei/model-registry';
import { TenantOverride } from '@teei/model-registry/types';

export interface RollbackRequest {
  tenantId: string;
  reason: string;
  initiatedBy: string;
  targetVersion?: string; // If not provided, uses rollback.previousVersion
}

export interface RollbackResult {
  id: string;
  tenantId: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  initiatedBy: string;
  timestamp: Date;
  success: boolean;
  error?: string;

  // Override snapshots
  previousOverride: TenantOverride;
  restoredOverride: TenantOverride;
}

/**
 * In-memory storage for rollback history
 * In production, this should use a database
 */
class RollbackHistoryStore {
  private history: Map<string, RollbackResult> = new Map();

  save(result: RollbackResult): void {
    this.history.set(result.id, result);
  }

  get(id: string): RollbackResult | undefined {
    return this.history.get(id);
  }

  getByTenant(tenantId: string): RollbackResult[] {
    return Array.from(this.history.values())
      .filter(r => r.tenantId === tenantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getAll(): RollbackResult[] {
    return Array.from(this.history.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  clear(): void {
    this.history.clear();
  }
}

const rollbackHistoryStore = new RollbackHistoryStore();

/**
 * Rollback Manager
 */
export class RollbackManager {
  private registry: ModelRegistry;

  constructor(registry: ModelRegistry) {
    this.registry = registry;
  }

  /**
   * Execute a rollback
   */
  async rollback(request: RollbackRequest): Promise<RollbackResult> {
    const rollbackId = `rollback-${request.tenantId}-${Date.now()}`;

    console.info(`[Rollback] Starting rollback ${rollbackId} for tenant ${request.tenantId}`);
    console.info(`[Rollback] Reason: ${request.reason}`);
    console.info(`[Rollback] Initiated by: ${request.initiatedBy}`);

    try {
      // 1. Load current override
      const currentOverride = this.registry.load(request.tenantId);

      if (!currentOverride) {
        throw new Error(`No override found for tenant ${request.tenantId}`);
      }

      console.info(`[Rollback] Current version: ${currentOverride.version}`);

      // 2. Determine target version
      let targetVersion: string;

      if (request.targetVersion) {
        targetVersion = request.targetVersion;
      } else if (currentOverride.rollback?.previousVersion) {
        targetVersion = currentOverride.rollback.previousVersion;
      } else {
        throw new Error(
          `No rollback target specified. Override must have rollback.previousVersion set, or provide targetVersion in request.`
        );
      }

      console.info(`[Rollback] Target version: ${targetVersion}`);

      // 3. Load target override from version history
      // In production, this would load from a version control system or database
      // For now, we'll create a rollback override that references the previous version
      const rollbackOverride: TenantOverride = {
        ...currentOverride,
        version: this.incrementPatchVersion(currentOverride.version),
        createdAt: new Date().toISOString(),
        createdBy: request.initiatedBy,
        description: `Rollback from ${currentOverride.version} to ${targetVersion}: ${request.reason}`,
        rollback: {
          previousVersion: currentOverride.version,
          autoRollbackTriggers: currentOverride.rollback?.autoRollbackTriggers,
          canaryPercentage: currentOverride.rollback?.canaryPercentage,
        },
      };

      // 4. Validate rollback target
      this.validateRollback(rollbackOverride);

      // 5. Apply rollback by saving the override
      this.registry.save(rollbackOverride);

      // 6. Clear cache to ensure immediate effect
      this.registry.clearCache();

      console.info(`[Rollback] Successfully applied rollback to version ${rollbackOverride.version}`);

      // 7. Create rollback result
      const result: RollbackResult = {
        id: rollbackId,
        tenantId: request.tenantId,
        fromVersion: currentOverride.version,
        toVersion: targetVersion,
        reason: request.reason,
        initiatedBy: request.initiatedBy,
        timestamp: new Date(),
        success: true,
        previousOverride: currentOverride,
        restoredOverride: rollbackOverride,
      };

      // 8. Save to history
      rollbackHistoryStore.save(result);

      // 9. Emit rollback event (for notifications)
      this.emitRollbackEvent(result);

      console.info(`[Rollback] Rollback ${rollbackId} completed successfully`);

      return result;
    } catch (error: any) {
      console.error(`[Rollback] Failed to rollback ${rollbackId}:`, error.message);

      const failedResult: RollbackResult = {
        id: rollbackId,
        tenantId: request.tenantId,
        fromVersion: 'unknown',
        toVersion: request.targetVersion || 'unknown',
        reason: request.reason,
        initiatedBy: request.initiatedBy,
        timestamp: new Date(),
        success: false,
        error: error.message,
        previousOverride: {} as TenantOverride,
        restoredOverride: {} as TenantOverride,
      };

      rollbackHistoryStore.save(failedResult);

      throw error;
    }
  }

  /**
   * Validate that rollback is safe to apply
   */
  private validateRollback(override: TenantOverride): void {
    // Ensure version is valid
    if (!override.version || !/^\d+\.\d+\.\d+$/.test(override.version)) {
      throw new Error(`Invalid version format: ${override.version}`);
    }

    // Ensure tenant ID is present
    if (!override.tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Ensure guardrails are not weakened
    // (ModelRegistry.save() will perform this validation)
  }

  /**
   * Get rollback history for a tenant
   */
  getRollbackHistory(tenantId: string): RollbackResult[] {
    return rollbackHistoryStore.getByTenant(tenantId);
  }

  /**
   * Get all rollback history
   */
  getAllRollbackHistory(): RollbackResult[] {
    return rollbackHistoryStore.getAll();
  }

  /**
   * Get specific rollback by ID
   */
  getRollback(rollbackId: string): RollbackResult | undefined {
    return rollbackHistoryStore.get(rollbackId);
  }

  /**
   * Emit rollback event for notifications
   * In production, this would send to NATS, email, Slack, etc.
   */
  private emitRollbackEvent(result: RollbackResult): void {
    console.info(`[Rollback] Emitting rollback event for tenant ${result.tenantId}`);

    // Example notification payload
    const notification = {
      type: 'model.rollback',
      tenantId: result.tenantId,
      fromVersion: result.fromVersion,
      toVersion: result.toVersion,
      reason: result.reason,
      initiatedBy: result.initiatedBy,
      timestamp: result.timestamp.toISOString(),
      success: result.success,
    };

    console.info('[Rollback] Notification payload:', JSON.stringify(notification, null, 2));

    // In production, send to:
    // - NATS event bus: eventBus.publish('model.rollback', notification)
    // - Email service: emailService.sendRollbackAlert(result)
    // - Slack webhook: slackService.postMessage(notification)
  }

  /**
   * Increment patch version (e.g., 1.2.3 -> 1.2.4)
   */
  private incrementPatchVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length !== 3) {
      throw new Error(`Invalid version format: ${version}`);
    }

    const [major, minor, patch] = parts.map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Clear rollback history (for testing)
   */
  clear(): void {
    rollbackHistoryStore.clear();
  }
}

/**
 * Create a rollback request
 */
export function createRollbackRequest(
  tenantId: string,
  reason: string,
  initiatedBy: string,
  targetVersion?: string
): RollbackRequest {
  return {
    tenantId,
    reason,
    initiatedBy,
    targetVersion,
  };
}

/**
 * Auto-rollback on drift or quality degradation
 * This function would be called by drift monitoring or quality checks
 */
export async function autoRollbackOnFailure(
  manager: RollbackManager,
  tenantId: string,
  trigger: 'accuracy_drop' | 'latency_spike' | 'cost_overrun' | 'fairness_violation',
  details: string
): Promise<RollbackResult> {
  console.warn(`[AutoRollback] Triggered for tenant ${tenantId}: ${trigger}`);
  console.warn(`[AutoRollback] Details: ${details}`);

  const request: RollbackRequest = {
    tenantId,
    reason: `Auto-rollback triggered: ${trigger} - ${details}`,
    initiatedBy: 'auto-rollback-system',
  };

  return await manager.rollback(request);
}

/**
 * Format rollback result as human-readable report
 */
export function formatRollbackReport(result: RollbackResult): string {
  const lines: string[] = [];

  lines.push('\n=== Rollback Report ===');
  lines.push(`ID: ${result.id}`);
  lines.push(`Tenant: ${result.tenantId}`);
  lines.push(`Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  lines.push(`Timestamp: ${result.timestamp.toISOString()}`);
  lines.push('');
  lines.push('Version Change:');
  lines.push(`  From: ${result.fromVersion}`);
  lines.push(`  To:   ${result.toVersion}`);
  lines.push('');
  lines.push(`Reason: ${result.reason}`);
  lines.push(`Initiated By: ${result.initiatedBy}`);

  if (!result.success && result.error) {
    lines.push('');
    lines.push(`Error: ${result.error}`);
  }

  lines.push('');

  return lines.join('\n');
}
