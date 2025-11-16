/**
 * GDPR Data Residency Enforcement - EU Strict Mode
 *
 * This module enforces strict data residency rules for EU tenants,
 * ensuring GDPR compliance by preventing data processing outside
 * approved EU regions, even when carbon optimization suggests
 * more energy-efficient alternatives.
 *
 * @module data-residency/policy/eu-strict
 * @author carbon-scheduler (Worker 1 Team 2 - GreenOps)
 * @version 1.0.0
 */

import { createHash } from 'crypto';

/**
 * Supported AWS regions
 */
export enum AWSRegion {
  US_EAST_1 = 'us-east-1',
  US_EAST_2 = 'us-east-2',
  US_WEST_1 = 'us-west-1',
  US_WEST_2 = 'us-west-2',
  EU_CENTRAL_1 = 'eu-central-1',
  EU_WEST_1 = 'eu-west-1',
  EU_WEST_2 = 'eu-west-2',
  EU_WEST_3 = 'eu-west-3',
  EU_NORTH_1 = 'eu-north-1',
  AP_SOUTHEAST_1 = 'ap-southeast-1',
  AP_NORTHEAST_1 = 'ap-northeast-1',
}

/**
 * Data residency requirement levels
 */
export enum ResidencyLevel {
  /** No restrictions - data can be processed globally */
  GLOBAL = 'global',
  /** Must stay within EU - GDPR Article 44-50 */
  EU_STRICT = 'eu_strict',
  /** Must stay within US */
  US_ONLY = 'us_only',
  /** Single region only (highest restriction) */
  SINGLE_REGION = 'single_region',
}

/**
 * Enforcement mode for residency violations
 */
export enum EnforcementMode {
  /** Block operation and throw error */
  STRICT = 'strict',
  /** Log warning but allow operation */
  ADVISORY = 'advisory',
  /** Disabled - no enforcement */
  DISABLED = 'disabled',
}

/**
 * Tenant configuration
 */
export interface TenantConfig {
  tenantId: string;
  residencyLevel: ResidencyLevel;
  allowedRegions: AWSRegion[];
  primaryRegion: AWSRegion;
  enforcementMode: EnforcementMode;
}

/**
 * Carbon optimization suggestion
 */
export interface CarbonHint {
  suggestedRegion: AWSRegion;
  currentCarbonIntensity: number; // gCO2/kWh
  suggestedCarbonIntensity: number; // gCO2/kWh
  potentialSavingsPercent: number;
  renewablePercent: number;
}

/**
 * Residency enforcement decision
 */
export interface ResidencyDecision {
  allowed: boolean;
  enforcedRegion: AWSRegion;
  originalRegion: AWSRegion;
  carbonHintOverridden: boolean;
  reason: string;
  auditLogId: string;
  estimatedCO2Penalty?: number; // gCO2 - emissions from not using cleaner region
}

/**
 * Audit log entry
 */
export interface ResidencyAuditLog {
  id: string;
  timestamp: Date;
  tenantId: string;
  workloadType: string;
  originalRegion: AWSRegion;
  enforcedRegion: AWSRegion;
  residencyLevel: ResidencyLevel;
  carbonHintProvided: boolean;
  carbonHintOverridden: boolean;
  potentialCO2SavingsGrams?: number;
  reason: string;
  metadata: Record<string, any>;
}

/**
 * EU GDPR-compliant regions (Article 44-50)
 */
const EU_REGIONS: AWSRegion[] = [
  AWSRegion.EU_CENTRAL_1, // Frankfurt, Germany
  AWSRegion.EU_WEST_1,    // Ireland
  AWSRegion.EU_WEST_2,    // London, UK (post-Brexit adequacy decision)
  AWSRegion.EU_WEST_3,    // Paris, France
  AWSRegion.EU_NORTH_1,   // Stockholm, Sweden
];

/**
 * US regions
 */
const US_REGIONS: AWSRegion[] = [
  AWSRegion.US_EAST_1, // Virginia
  AWSRegion.US_EAST_2, // Ohio
  AWSRegion.US_WEST_1, // N. California
  AWSRegion.US_WEST_2, // Oregon
];

/**
 * In-memory audit log storage (for production, use PostgreSQL/ClickHouse)
 */
const auditLogs: ResidencyAuditLog[] = [];

/**
 * GDPRResidencyPolicy - Enforces EU data residency rules
 */
export class GDPRResidencyPolicy {
  private tenantConfig: TenantConfig;
  private enableAuditLogging: boolean;

  constructor(tenantConfig: TenantConfig, enableAuditLogging = true) {
    this.tenantConfig = tenantConfig;
    this.enableAuditLogging = enableAuditLogging;
  }

  /**
   * Evaluate scheduling decision with GDPR residency enforcement
   *
   * @param requestedRegion - The region requested for workload execution
   * @param carbonHint - Optional carbon optimization suggestion
   * @param workloadType - Type of workload (for audit logging)
   * @returns ResidencyDecision with enforcement outcome
   */
  public evaluate(
    requestedRegion: AWSRegion,
    carbonHint?: CarbonHint,
    workloadType = 'batch-job'
  ): ResidencyDecision {
    // Step 1: Check if residency enforcement is enabled
    if (this.tenantConfig.enforcementMode === EnforcementMode.DISABLED) {
      return this.createDecision(
        true,
        requestedRegion,
        requestedRegion,
        false,
        'Residency enforcement disabled',
        workloadType,
        carbonHint
      );
    }

    // Step 2: Validate requested region against allowed regions
    const isAllowedRegion = this.isRegionAllowed(requestedRegion);

    if (!isAllowedRegion) {
      // Region not allowed - enforce primary region
      const decision = this.createDecision(
        false,
        this.tenantConfig.primaryRegion,
        requestedRegion,
        !!carbonHint,
        `Region ${requestedRegion} violates ${this.tenantConfig.residencyLevel} residency policy. Enforcing ${this.tenantConfig.primaryRegion}.`,
        workloadType,
        carbonHint
      );

      if (this.tenantConfig.enforcementMode === EnforcementMode.STRICT) {
        this.logAudit(decision, workloadType, carbonHint);
        return decision;
      } else {
        // Advisory mode - log but allow
        this.logAudit(decision, workloadType, carbonHint);
        return {
          ...decision,
          allowed: true,
        };
      }
    }

    // Step 3: Check if carbon hint suggests a different region
    if (carbonHint && carbonHint.suggestedRegion !== requestedRegion) {
      const carbonRegionAllowed = this.isRegionAllowed(carbonHint.suggestedRegion);

      if (carbonRegionAllowed) {
        // Carbon hint is compliant - use it
        const decision = this.createDecision(
          true,
          carbonHint.suggestedRegion,
          requestedRegion,
          false,
          `Carbon optimization applied: ${carbonHint.suggestedRegion} is ${carbonHint.potentialSavingsPercent}% cleaner and GDPR-compliant`,
          workloadType,
          carbonHint
        );
        this.logAudit(decision, workloadType, carbonHint);
        return decision;
      } else {
        // Carbon hint violates residency - override it
        const estimatedCO2Penalty = this.calculateCO2Penalty(carbonHint, requestedRegion);
        const decision = this.createDecision(
          true,
          requestedRegion,
          requestedRegion,
          true,
          `Carbon hint for ${carbonHint.suggestedRegion} overridden: violates ${this.tenantConfig.residencyLevel} policy. Staying in ${requestedRegion}.`,
          workloadType,
          carbonHint,
          estimatedCO2Penalty
        );
        this.logAudit(decision, workloadType, carbonHint);
        return decision;
      }
    }

    // Step 4: No conflicts - allow requested region
    const decision = this.createDecision(
      true,
      requestedRegion,
      requestedRegion,
      false,
      'Requested region complies with residency policy',
      workloadType,
      carbonHint
    );
    this.logAudit(decision, workloadType, carbonHint);
    return decision;
  }

  /**
   * Check if a region is allowed for this tenant
   */
  private isRegionAllowed(region: AWSRegion): boolean {
    // Global tenants - all regions allowed
    if (this.tenantConfig.residencyLevel === ResidencyLevel.GLOBAL) {
      return true;
    }

    // Single region - only primary region allowed
    if (this.tenantConfig.residencyLevel === ResidencyLevel.SINGLE_REGION) {
      return region === this.tenantConfig.primaryRegion;
    }

    // Check explicit allowed regions list
    return this.tenantConfig.allowedRegions.includes(region);
  }

  /**
   * Calculate CO2 penalty from not using the cleaner region
   */
  private calculateCO2Penalty(
    carbonHint: CarbonHint,
    enforcedRegion: AWSRegion
  ): number {
    // Estimate based on typical batch job energy consumption
    const estimatedKWh = 0.5; // 0.5 kWh per batch job (avg)
    const currentIntensity = carbonHint.currentCarbonIntensity;
    const suggestedIntensity = carbonHint.suggestedCarbonIntensity;
    const penaltyGCO2 = (currentIntensity - suggestedIntensity) * estimatedKWh;
    return Math.max(0, penaltyGCO2);
  }

  /**
   * Create a residency decision object
   */
  private createDecision(
    allowed: boolean,
    enforcedRegion: AWSRegion,
    originalRegion: AWSRegion,
    carbonHintOverridden: boolean,
    reason: string,
    workloadType: string,
    carbonHint?: CarbonHint,
    estimatedCO2Penalty?: number
  ): ResidencyDecision {
    const auditLogId = this.generateAuditId(workloadType, enforcedRegion);

    return {
      allowed,
      enforcedRegion,
      originalRegion,
      carbonHintOverridden,
      reason,
      auditLogId,
      estimatedCO2Penalty,
    };
  }

  /**
   * Log residency decision for audit trail
   */
  private logAudit(
    decision: ResidencyDecision,
    workloadType: string,
    carbonHint?: CarbonHint
  ): void {
    if (!this.enableAuditLogging) {
      return;
    }

    const auditLog: ResidencyAuditLog = {
      id: decision.auditLogId,
      timestamp: new Date(),
      tenantId: this.tenantConfig.tenantId,
      workloadType,
      originalRegion: decision.originalRegion,
      enforcedRegion: decision.enforcedRegion,
      residencyLevel: this.tenantConfig.residencyLevel,
      carbonHintProvided: !!carbonHint,
      carbonHintOverridden: decision.carbonHintOverridden,
      potentialCO2SavingsGrams: carbonHint
        ? this.calculateCO2Penalty(carbonHint, decision.enforcedRegion)
        : undefined,
      reason: decision.reason,
      metadata: {
        enforcementMode: this.tenantConfig.enforcementMode,
        allowedRegions: this.tenantConfig.allowedRegions,
        carbonHint: carbonHint
          ? {
              suggestedRegion: carbonHint.suggestedRegion,
              currentIntensity: carbonHint.currentCarbonIntensity,
              suggestedIntensity: carbonHint.suggestedCarbonIntensity,
              savingsPercent: carbonHint.potentialSavingsPercent,
            }
          : null,
      },
    };

    auditLogs.push(auditLog);

    // Log to console (in production, write to PostgreSQL or ClickHouse)
    console.log('[GDPR Residency Audit]', JSON.stringify(auditLog, null, 2));
  }

  /**
   * Generate unique audit log ID
   */
  private generateAuditId(workloadType: string, region: AWSRegion): string {
    const timestamp = Date.now();
    const hash = createHash('sha256')
      .update(`${this.tenantConfig.tenantId}-${workloadType}-${region}-${timestamp}`)
      .digest('hex')
      .substring(0, 16);
    return `audit-${hash}`;
  }

  /**
   * Get audit logs for this tenant
   */
  public getAuditLogs(): ResidencyAuditLog[] {
    return auditLogs.filter((log) => log.tenantId === this.tenantConfig.tenantId);
  }

  /**
   * Get statistics on carbon overrides
   */
  public getCarbonOverrideStats(): {
    totalDecisions: number;
    carbonHintsOverridden: number;
    totalCO2Penalty: number;
    overrideRate: number;
  } {
    const logs = this.getAuditLogs();
    const totalDecisions = logs.length;
    const carbonHintsOverridden = logs.filter((log) => log.carbonHintOverridden).length;
    const totalCO2Penalty = logs.reduce(
      (sum, log) => sum + (log.potentialCO2SavingsGrams || 0),
      0
    );
    const overrideRate = totalDecisions > 0 ? carbonHintsOverridden / totalDecisions : 0;

    return {
      totalDecisions,
      carbonHintsOverridden,
      totalCO2Penalty,
      overrideRate,
    };
  }
}

/**
 * Factory function to create EU strict residency policy
 */
export function createEUStrictPolicy(
  tenantId: string,
  primaryRegion: AWSRegion = AWSRegion.EU_CENTRAL_1,
  enforcementMode: EnforcementMode = EnforcementMode.STRICT
): GDPRResidencyPolicy {
  const config: TenantConfig = {
    tenantId,
    residencyLevel: ResidencyLevel.EU_STRICT,
    allowedRegions: EU_REGIONS,
    primaryRegion,
    enforcementMode,
  };

  return new GDPRResidencyPolicy(config);
}

/**
 * Factory function to create US-only residency policy
 */
export function createUSOnlyPolicy(
  tenantId: string,
  primaryRegion: AWSRegion = AWSRegion.US_EAST_1,
  enforcementMode: EnforcementMode = EnforcementMode.STRICT
): GDPRResidencyPolicy {
  const config: TenantConfig = {
    tenantId,
    residencyLevel: ResidencyLevel.US_ONLY,
    allowedRegions: US_REGIONS,
    primaryRegion,
    enforcementMode,
  };

  return new GDPRResidencyPolicy(config);
}

/**
 * Factory function to create global (no restrictions) policy
 */
export function createGlobalPolicy(
  tenantId: string,
  primaryRegion: AWSRegion = AWSRegion.US_EAST_1
): GDPRResidencyPolicy {
  const config: TenantConfig = {
    tenantId,
    residencyLevel: ResidencyLevel.GLOBAL,
    allowedRegions: Object.values(AWSRegion),
    primaryRegion,
    enforcementMode: EnforcementMode.ADVISORY,
  };

  return new GDPRResidencyPolicy(config);
}

/**
 * Example usage
 */
export function exampleUsage(): void {
  // Create EU strict policy for a German tenant
  const euPolicy = createEUStrictPolicy('tenant-de-001', AWSRegion.EU_CENTRAL_1);

  // Scenario 1: Carbon hint suggests US-WEST-2 (cleaner grid)
  const carbonHint1: CarbonHint = {
    suggestedRegion: AWSRegion.US_WEST_2,
    currentCarbonIntensity: 320, // EU-CENTRAL-1
    suggestedCarbonIntensity: 180, // US-WEST-2 (much cleaner!)
    potentialSavingsPercent: 43.75,
    renewablePercent: 70,
  };

  const decision1 = euPolicy.evaluate(
    AWSRegion.EU_CENTRAL_1,
    carbonHint1,
    'q2q-embeddings'
  );

  console.log('Decision 1:', decision1);
  // Expected: Carbon hint OVERRIDDEN - stays in EU-CENTRAL-1 for GDPR compliance

  // Scenario 2: Carbon hint suggests EU-WEST-1 (within EU, slightly cleaner)
  const carbonHint2: CarbonHint = {
    suggestedRegion: AWSRegion.EU_WEST_1,
    currentCarbonIntensity: 320, // EU-CENTRAL-1
    suggestedCarbonIntensity: 280, // EU-WEST-1
    potentialSavingsPercent: 12.5,
    renewablePercent: 45,
  };

  const decision2 = euPolicy.evaluate(
    AWSRegion.EU_CENTRAL_1,
    carbonHint2,
    'analytics-backfill'
  );

  console.log('Decision 2:', decision2);
  // Expected: Carbon hint ACCEPTED - switches to EU-WEST-1 (GDPR-compliant)

  // Get statistics
  const stats = euPolicy.getCarbonOverrideStats();
  console.log('Override Statistics:', stats);
}

// Export constants for use in other modules
export { EU_REGIONS, US_REGIONS };
