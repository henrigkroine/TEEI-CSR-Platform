/**
 * Adjustment Engine
 *
 * Applies manual adjustments to consolidated metrics
 */

import type {
  TenantMetricData,
  AdjustmentApplication,
  ConsolAdjustment,
} from '@teei/shared-types';
import { db } from '@teei/shared-schema';
import { consolAdjustments } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';

export class AdjustmentEngine {
  /**
   * Apply manual adjustments for a given org and period
   */
  async apply(
    orgId: string,
    period: string,
    metrics: TenantMetricData[]
  ): Promise<AdjustmentApplication[]> {
    // Get published adjustments for this org and period
    const adjustments = await db.select()
      .from(consolAdjustments)
      .where(
        and(
          eq(consolAdjustments.orgId, orgId),
          eq(consolAdjustments.period, period),
          eq(consolAdjustments.published, true)
        )
      );

    if (adjustments.length === 0) {
      return [];
    }

    const applications: AdjustmentApplication[] = [];

    for (const adjustment of adjustments) {
      applications.push({
        adjustmentId: adjustment.id,
        orgUnitId: adjustment.orgUnitId || undefined,
        metric: adjustment.metric as any,
        amount: parseFloat(adjustment.amountBase), // Use base currency amount
        currency: adjustment.currency,
        note: adjustment.note,
      });
    }

    return applications;
  }

  /**
   * Validate adjustment before publishing
   */
  async validateAdjustment(adjustmentId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const [adjustment] = await db.select()
      .from(consolAdjustments)
      .where(eq(consolAdjustments.id, adjustmentId))
      .limit(1);

    if (!adjustment) {
      return {
        valid: false,
        errors: ['Adjustment not found'],
      };
    }

    const errors: string[] = [];

    // Validate required fields
    if (!adjustment.note || adjustment.note.trim().length === 0) {
      errors.push('Note is required');
    }

    if (!adjustment.metric || adjustment.metric.trim().length === 0) {
      errors.push('Metric is required');
    }

    if (!adjustment.amountBase || parseFloat(adjustment.amountBase) === 0) {
      errors.push('Amount must be non-zero');
    }

    // Validate that adjustment hasn't been published yet
    if (adjustment.published) {
      errors.push('Adjustment has already been published and is immutable');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Publish adjustment (makes it immutable)
   */
  async publishAdjustment(
    adjustmentId: string,
    publishedBy: string
  ): Promise<void> {
    const validation = await this.validateAdjustment(adjustmentId);

    if (!validation.valid) {
      throw new Error(`Cannot publish adjustment: ${validation.errors.join(', ')}`);
    }

    await db.update(consolAdjustments)
      .set({
        published: true,
        publishedAt: new Date().toISOString(),
        publishedBy,
      })
      .where(eq(consolAdjustments.id, adjustmentId));
  }
}
