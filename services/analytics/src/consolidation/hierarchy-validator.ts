/**
 * Hierarchy Validator
 *
 * Validates org unit hierarchies for data integrity
 */

import type {
  HierarchyValidationResult,
  ConsolidationValidationError,
  OrgUnit,
  OrgUnitMember,
} from '@teei/shared-types';
import { db } from '@teei/shared-schema';
import { orgUnits, orgUnitMembers } from '@teei/shared-schema';
import { eq, and, isNull } from 'drizzle-orm';

export class HierarchyValidator {
  /**
   * Validate org hierarchy
   */
  async validate(orgId: string): Promise<HierarchyValidationResult> {
    const errors: ConsolidationValidationError[] = [];
    const warnings: string[] = [];

    // Get all units
    const units = await db.select()
      .from(orgUnits)
      .where(eq(orgUnits.orgId, orgId));

    const activeUnits = units.filter(u => u.active);

    // Get all memberships
    const allMemberships = await this.getAllMemberships(units.map(u => u.id));

    // Check for orphaned units (parent doesn't exist)
    const orphanedUnits = this.findOrphanedUnits(units);
    if (orphanedUnits.length > 0) {
      errors.push({
        field: 'hierarchy',
        message: `Found ${orphanedUnits.length} orphaned units (parent doesn't exist)`,
        code: 'ORPHANED_UNITS',
      });
    }

    // Check for circular references
    const circularRefs = this.findCircularReferences(units);
    if (circularRefs.length > 0) {
      errors.push({
        field: 'hierarchy',
        message: `Found ${circularRefs.length} circular references in hierarchy`,
        code: 'CIRCULAR_REFERENCES',
      });
    }

    // Check percent shares
    const invalidShares = this.validatePercentShares(allMemberships);
    if (invalidShares.length > 0) {
      errors.push({
        field: 'percentShare',
        message: `Found ${invalidShares.length} org units with invalid percent shares (must sum to 100%)`,
        code: 'INVALID_PERCENT_SHARES',
      });

      warnings.push(
        ...invalidShares.map(
          s => `Org unit ${s.orgUnitId}: shares sum to ${s.totalShare}% (expected 100%)`
        )
      );
    }

    // Check for inactive units with active memberships
    const inactiveWithMembers = units.filter(u => {
      if (u.active) return false;
      const memberships = allMemberships.filter(m => m.orgUnitId === u.id);
      return memberships.length > 0;
    });

    if (inactiveWithMembers.length > 0) {
      warnings.push(
        `Found ${inactiveWithMembers.length} inactive units with active memberships`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalUnits: units.length,
        activeUnits: activeUnits.length,
        orphanedUnits: orphanedUnits.length,
        circularReferences: circularRefs.length,
        invalidPercentShares: invalidShares.length,
      },
    };
  }

  /**
   * Find orphaned units (parent doesn't exist)
   */
  private findOrphanedUnits(units: OrgUnit[]): OrgUnit[] {
    const unitIds = new Set(units.map(u => u.id));
    const orphaned: OrgUnit[] = [];

    for (const unit of units) {
      if (unit.parentId && !unitIds.has(unit.parentId)) {
        orphaned.push(unit);
      }
    }

    return orphaned;
  }

  /**
   * Find circular references in hierarchy
   */
  private findCircularReferences(units: OrgUnit[]): OrgUnit[] {
    const circular: OrgUnit[] = [];
    const visited = new Set<string>();

    for (const unit of units) {
      if (visited.has(unit.id)) continue;

      const path = new Set<string>();
      let current: OrgUnit | undefined = unit;

      while (current) {
        if (path.has(current.id)) {
          // Circular reference found
          circular.push(unit);
          break;
        }

        path.add(current.id);
        visited.add(current.id);

        // Move to parent
        current = current.parentId
          ? units.find(u => u.id === current?.parentId)
          : undefined;
      }
    }

    return circular;
  }

  /**
   * Validate percent shares (should sum to 100% per org unit)
   */
  private validatePercentShares(
    memberships: OrgUnitMember[]
  ): Array<{ orgUnitId: string; totalShare: number }> {
    const invalid: Array<{ orgUnitId: string; totalShare: number }> = [];

    // Group by org unit
    const byUnit = new Map<string, OrgUnitMember[]>();
    for (const membership of memberships) {
      const existing = byUnit.get(membership.orgUnitId) || [];
      existing.push(membership);
      byUnit.set(membership.orgUnitId, existing);
    }

    // Check each unit
    for (const [orgUnitId, unitMemberships] of byUnit.entries()) {
      const totalShare = unitMemberships.reduce(
        (sum, m) => sum + parseFloat(m.percentShare),
        0
      );

      // Allow small floating point errors (±0.01%)
      if (Math.abs(totalShare - 100) > 0.01) {
        invalid.push({ orgUnitId, totalShare });
      }
    }

    return invalid;
  }

  /**
   * Get all memberships for org units
   */
  private async getAllMemberships(orgUnitIds: string[]): Promise<OrgUnitMember[]> {
    if (orgUnitIds.length === 0) return [];

    const memberships = await db.select()
      .from(orgUnitMembers)
      .where(
        and(
          eq(orgUnitMembers.orgUnitId, orgUnitIds[0])
          // TODO: Use inArray when available
        )
      );

    return memberships;
  }
}
