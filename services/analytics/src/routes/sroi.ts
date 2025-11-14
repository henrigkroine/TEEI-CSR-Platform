import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { calculateSROI, saveSROICalculation, getHistoricalSROI, DEFAULT_VALUATION_WEIGHTS } from '../calculators/sroi-calculator.js';
import { db } from '@teei/shared-schema/db';
import { sroiValuationWeights } from '@teei/shared-schema';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('sroi-routes');

/**
 * Query schema for SROI calculation request
 */
const SROIQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'custom']).default('month'),
  program: z.string().default('buddy'),
  companyId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(), // Required for custom period
  endDate: z.string().datetime().optional(), // Required for custom period
  save: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
});

/**
 * Schema for updating valuation weights
 */
const UpdateWeightsSchema = z.object({
  companyId: z.string().uuid().optional(),
  weights: z.array(
    z.object({
      activityType: z.string(),
      valuePoints: z.number().positive(),
      effectiveFrom: z.string().datetime().optional(),
      notes: z.string().optional(),
    })
  ),
});

/**
 * Calculates period dates based on period type
 */
function calculatePeriodDates(
  period: string,
  startDate?: string,
  endDate?: string
): { periodStart: Date; periodEnd: Date } {
  const now = new Date();

  if (period === 'custom') {
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required for custom period');
    }
    return {
      periodStart: new Date(startDate),
      periodEnd: new Date(endDate),
    };
  }

  let periodStart: Date;
  const periodEnd = now;

  switch (period) {
    case 'week':
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      periodStart = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    case 'year':
      periodStart = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      throw new Error(`Invalid period type: ${period}`);
  }

  return { periodStart, periodEnd };
}

/**
 * SROI API routes
 */
export const sroiRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/impact/sroi
   * Calculate SROI for a given period and program
   */
  fastify.get('/sroi', async (request, reply) => {
    try {
      const query = SROIQuerySchema.parse(request.query);
      const { period, program, companyId, startDate, endDate, save } = query;

      const { periodStart, periodEnd } = calculatePeriodDates(period, startDate, endDate);

      logger.info({ period, program, companyId, periodStart, periodEnd }, 'SROI calculation requested');

      // Calculate SROI
      const calculation = await calculateSROI({
        periodStart,
        periodEnd,
        programType: program,
        companyId,
      });

      // Save if requested
      if (save) {
        await saveSROICalculation(calculation, companyId);
      }

      return calculation;
    } catch (error) {
      logger.error({ error }, 'SROI calculation failed');
      reply.status(500).send({
        error: 'SROI calculation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/impact/sroi/breakdown
   * Get detailed activity breakdown with SROI calculation
   */
  fastify.get('/sroi/breakdown', async (request, reply) => {
    try {
      const query = SROIQuerySchema.parse(request.query);
      const { period, program, companyId, startDate, endDate } = query;

      const { periodStart, periodEnd } = calculatePeriodDates(period, startDate, endDate);

      const calculation = await calculateSROI({
        periodStart,
        periodEnd,
        programType: program,
        companyId,
      });

      // Return detailed breakdown
      return {
        period: {
          start: calculation.period.start.toISOString(),
          end: calculation.period.end.toISOString(),
          type: period,
        },
        program: calculation.program,
        summary: {
          sroiRatio: calculation.sroiRatio,
          socialValue: calculation.socialValue,
          investment: calculation.investment,
          confidence: calculation.confidence,
        },
        breakdown: calculation.breakdown,
        calculatedAt: calculation.calculatedAt.toISOString(),
      };
    } catch (error) {
      logger.error({ error }, 'SROI breakdown failed');
      reply.status(500).send({
        error: 'SROI breakdown failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/impact/sroi/history
   * Get historical SROI calculations
   */
  fastify.get('/sroi/history', async (request, reply) => {
    try {
      const query = z
        .object({
          program: z.string().default('buddy'),
          companyId: z.string().uuid().optional(),
          limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).default('12'),
        })
        .parse(request.query);

      const { program, companyId, limit } = query;

      const history = await getHistoricalSROI(program, companyId, limit);

      return {
        program,
        companyId,
        count: history.length,
        calculations: history,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to retrieve SROI history');
      reply.status(500).send({
        error: 'Failed to retrieve SROI history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/impact/sroi/weights
   * Update valuation weights (admin only)
   */
  fastify.post('/sroi/weights', async (request, reply) => {
    try {
      const body = UpdateWeightsSchema.parse(request.body);
      const { companyId, weights } = body;

      // TODO: Add admin authentication check
      // if (!request.user?.isAdmin) {
      //   return reply.status(403).send({ error: 'Admin access required' });
      // }

      const now = new Date();

      // Insert new weights
      for (const weight of weights) {
        await db.insert(sroiValuationWeights).values({
          companyId: companyId || null,
          activityType: weight.activityType,
          valuePoints: weight.valuePoints.toString(),
          effectiveFrom: weight.effectiveFrom ? new Date(weight.effectiveFrom) : now,
          notes: weight.notes,
        });
      }

      logger.info({ companyId, weightCount: weights.length }, 'Valuation weights updated');

      return {
        success: true,
        message: `Updated ${weights.length} valuation weights`,
        companyId,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to update valuation weights');
      reply.status(500).send({
        error: 'Failed to update valuation weights',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/impact/sroi/weights
   * Get current valuation weights
   */
  fastify.get('/sroi/weights', async (request, reply) => {
    try {
      const query = z
        .object({
          companyId: z.string().uuid().optional(),
        })
        .parse(request.query);

      const { companyId } = query;

      // Return default weights with company overrides
      const weights = { ...DEFAULT_VALUATION_WEIGHTS };

      if (companyId) {
        const customWeights = await db
          .select()
          .from(sroiValuationWeights)
          .where(db.eq(sroiValuationWeights.companyId, companyId));

        // Show custom weights alongside defaults
        return {
          defaults: DEFAULT_VALUATION_WEIGHTS,
          custom: customWeights.map((w) => ({
            activityType: w.activityType,
            valuePoints: parseFloat(w.valuePoints),
            effectiveFrom: w.effectiveFrom.toISOString(),
            effectiveTo: w.effectiveTo?.toISOString(),
            notes: w.notes,
          })),
          companyId,
        };
      }

      return {
        defaults: DEFAULT_VALUATION_WEIGHTS,
        custom: [],
      };
    } catch (error) {
      logger.error({ error }, 'Failed to retrieve valuation weights');
      reply.status(500).send({
        error: 'Failed to retrieve valuation weights',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};
