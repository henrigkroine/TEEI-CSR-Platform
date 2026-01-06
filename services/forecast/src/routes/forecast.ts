import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { forecastETS } from '../models/ets.js';
import { forecastProphet } from '../models/prophet.js';
import { forecastEnsemble, autoSelectModel } from '../models/ensemble.js';
import { runBacktest, compareModels } from '../lib/backtest.js';
import { generateScenarios } from '../lib/scenarios.js';
import {
  getCached,
  setCached,
  generateCacheKey,
  hashConfig,
} from '../lib/cache.js';
import {
  TimeSeriesDataPoint,
  ETSConfig,
  ProphetConfig,
  BacktestConfig,
  ForecastResult,
} from '../types.js';

// Request body schema
const ForecastRequestSchema = z.object({
  companyId: z.string().uuid(),
  metric: z.enum(['sroi_ratio', 'vis_score']),
  horizonMonths: z.number().int().min(1).max(24).default(6),
  model: z.enum(['ets', 'prophet', 'ensemble', 'auto']).default('ensemble'),
  includeBacktest: z.boolean().default(false),
  includeScenarios: z.boolean().default(true),
  config: z
    .object({
      ets: z
        .object({
          method: z.enum(['simple', 'holt', 'holt-winters']).optional(),
          seasonalPeriod: z.number().optional(),
          alpha: z.number().min(0).max(1).optional(),
          beta: z.number().min(0).max(1).optional(),
          gamma: z.number().min(0).max(1).optional(),
          seasonal: z.enum(['additive', 'multiplicative']).optional(),
        })
        .optional(),
      prophet: z
        .object({
          growth: z.enum(['linear', 'logistic']).optional(),
          changepoints: z.array(z.string()).optional(),
          seasonality: z
            .object({
              yearly: z.boolean().optional(),
              quarterly: z.boolean().optional(),
              monthly: z.boolean().optional(),
            })
            .optional(),
        })
        .optional(),
      backtest: z
        .object({
          trainMonths: z.number().default(24),
          testMonths: z.number().default(6),
          stride: z.number().default(3),
        })
        .optional(),
    })
    .optional(),
});

type ForecastRequest = z.infer<typeof ForecastRequestSchema>;

/**
 * Forecast API Routes
 */
export const forecastRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /forecast/v2
   * Generate time-series forecast for SROI or VIS metrics
   */
  fastify.post<{
    Body: ForecastRequest;
  }>('/v2', async (request, reply) => {
    const startTime = Date.now();

    try {
      // Validate request
      const params = ForecastRequestSchema.parse(request.body);

      const {
        companyId,
        metric,
        horizonMonths,
        model,
        includeBacktest,
        includeScenarios,
        config,
      } = params;

      // Generate cache key
      const configHash = hashConfig({ model, horizonMonths, config });
      const cacheKey = generateCacheKey(companyId, metric, horizonMonths, configHash);

      // Check cache
      const cached = await getCached(cacheKey);
      if (cached) {
        fastify.log.info({ companyId, metric, cacheKey }, 'Cache hit for forecast');
        return reply.send({
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true,
            latencyMs: Date.now() - startTime,
          },
        });
      }

      // Fetch historical data from analytics service
      const historicalData = await fetchHistoricalData(companyId, metric, fastify);

      if (historicalData.length < 3) {
        return reply.code(400).send({
          error: 'Insufficient historical data',
          message: `Need at least 3 months of data for forecasting. Found ${historicalData.length} months.`,
        });
      }

      fastify.log.info(
        { companyId, metric, dataPoints: historicalData.length },
        'Fetched historical data'
      );

      // Run forecast based on selected model
      let forecastResult: ForecastResult;
      let modelUsed: string = model;

      switch (model) {
        case 'ets': {
          const etsConfig: ETSConfig = {
            method: config?.ets?.method || 'holt-winters',
            seasonalPeriod: config?.ets?.seasonalPeriod || 12,
            alpha: config?.ets?.alpha,
            beta: config?.ets?.beta,
            gamma: config?.ets?.gamma,
            seasonal: config?.ets?.seasonal,
          };
          forecastResult = await forecastETS(historicalData, horizonMonths, etsConfig);
          modelUsed = `ets-${etsConfig.method}`;
          break;
        }

        case 'prophet': {
          const prophetConfig: ProphetConfig = {
            growth: config?.prophet?.growth || 'linear',
            changepoints: config?.prophet?.changepoints,
            seasonality: config?.prophet?.seasonality || { yearly: true, quarterly: true },
          };
          forecastResult = await forecastProphet(historicalData, horizonMonths, prophetConfig);
          modelUsed = 'prophet';
          break;
        }

        case 'ensemble': {
          const ensembleConfig = {
            ets: config?.ets ? {
              method: config.ets.method || 'holt-winters' as const,
              seasonalPeriod: config.ets.seasonalPeriod,
              alpha: config.ets.alpha,
              beta: config.ets.beta,
              gamma: config.ets.gamma,
              seasonal: config.ets.seasonal,
            } : undefined,
            prophet: config?.prophet ? {
              growth: config.prophet.growth || 'linear' as const,
              changepoints: config.prophet.changepoints,
              seasonality: config.prophet.seasonality || {},
            } : undefined,
          };
          forecastResult = await forecastEnsemble(historicalData, horizonMonths, ensembleConfig);
          modelUsed = 'ensemble';
          break;
        }

        case 'auto': {
          const autoResult = await autoSelectModel(historicalData, horizonMonths);
          forecastResult = autoResult;
          modelUsed = autoResult.selectedModel;
          break;
        }

        default:
          return reply.code(400).send({
            error: 'Invalid model',
            message: `Model '${model}' is not supported`,
          });
      }

      // Generate scenarios if requested
      let scenarios;
      if (includeScenarios) {
        scenarios = generateScenarios(forecastResult);
      }

      // Run back-testing if requested
      let backtest;
      if (includeBacktest && historicalData.length >= 12) {
        const backtestConfig: BacktestConfig = {
          trainMonths: config?.backtest?.trainMonths || 18,
          testMonths: config?.backtest?.testMonths || 6,
          stride: config?.backtest?.stride || 3,
        };

        // Create model function for back-testing
        const modelFn = async (data: TimeSeriesDataPoint[], horizon: number) => {
          switch (model) {
            case 'ets': {
              const etsConfig: ETSConfig = {
                method: config?.ets?.method || 'holt-winters',
                seasonalPeriod: config?.ets?.seasonalPeriod,
                alpha: config?.ets?.alpha,
                beta: config?.ets?.beta,
                gamma: config?.ets?.gamma,
                seasonal: config?.ets?.seasonal,
              };
              return forecastETS(data, horizon, etsConfig);
            }
            case 'prophet': {
              const prophetConfig: ProphetConfig = {
                growth: config?.prophet?.growth || 'linear',
                changepoints: config?.prophet?.changepoints,
                seasonality: config?.prophet?.seasonality || { yearly: true },
              };
              return forecastProphet(data, horizon, prophetConfig);
            }
            default: {
              const ensembleConfig = {
                ets: config?.ets ? {
                  method: config.ets.method || 'holt-winters' as const,
                  seasonalPeriod: config.ets.seasonalPeriod,
                  alpha: config.ets.alpha,
                  beta: config.ets.beta,
                  gamma: config.ets.gamma,
                  seasonal: config.ets.seasonal,
                } : undefined,
                prophet: config?.prophet ? {
                  growth: config.prophet.growth || 'linear' as const,
                  changepoints: config.prophet.changepoints,
                  seasonality: config.prophet.seasonality || {},
                } : undefined,
              };
              return forecastEnsemble(data, horizon, ensembleConfig);
            }
          }
        };

        const backtestResult = await runBacktest(
          historicalData,
          modelFn,
          backtestConfig
        );

        backtest = {
          avgMetrics: backtestResult.avgMetrics,
          foldCount: backtestResult.folds.length,
        };
      }

      // Build response
      const response = {
        forecast: {
          predictions: forecastResult.predictions,
          confidenceBands: forecastResult.confidenceBands,
        },
        scenarios: scenarios?.scenarios,
        backtest,
        metadata: {
          modelUsed,
          historicalMonths: historicalData.length,
          generatedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
          cached: false,
        },
      };

      // Cache the result (6-hour TTL)
      await setCached(cacheKey, response, 21600);

      fastify.log.info(
        {
          companyId,
          metric,
          modelUsed,
          latencyMs: response.metadata.latencyMs,
        },
        'Forecast generated successfully'
      );

      return reply.send(response);
    } catch (error) {
      fastify.log.error({ error }, 'Error generating forecast');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        error: 'Failed to generate forecast',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /forecast/compare
   * Compare multiple forecasting models
   */
  fastify.post<{
    Body: {
      companyId: string;
      metric: string;
      horizonMonths?: number;
    };
  }>('/compare', async (request, reply) => {
    const { companyId, metric, horizonMonths: _horizonMonths = 6 } = request.body;

    try {
      // Fetch historical data
      const historicalData = await fetchHistoricalData(companyId, metric, fastify);

      if (historicalData.length < 24) {
        return reply.code(400).send({
          error: 'Insufficient data for model comparison',
          message: 'Need at least 24 months of data for reliable comparison',
        });
      }

      // Define models to compare
      const models = {
        'ets-simple': async (data: TimeSeriesDataPoint[], horizon: number) =>
          forecastETS(data, horizon, { method: 'simple' }),
        'ets-holt': async (data: TimeSeriesDataPoint[], horizon: number) =>
          forecastETS(data, horizon, { method: 'holt' }),
        'ets-holt-winters': async (data: TimeSeriesDataPoint[], horizon: number) =>
          forecastETS(data, horizon, { method: 'holt-winters', seasonalPeriod: 12 }),
        prophet: async (data: TimeSeriesDataPoint[], horizon: number) =>
          forecastProphet(data, horizon, {
            growth: 'linear',
            seasonality: { yearly: true },
          }),
        ensemble: async (data: TimeSeriesDataPoint[], horizon: number) =>
          forecastEnsemble(data, horizon),
      };

      const backtestConfig: BacktestConfig = {
        trainMonths: 18,
        testMonths: 6,
        stride: 3,
      };

      const comparison = await compareModels(historicalData, models, backtestConfig);

      return reply.send({
        companyId,
        metric,
        modelComparison: comparison.modelComparison,
        recommendation:
          comparison.modelComparison?.[0]?.modelName || 'ets-holt-winters',
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error comparing models');
      return reply.code(500).send({
        error: 'Failed to compare models',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

/**
 * Fetch historical data from analytics service
 *
 * In production, this would call the analytics service API
 * For now, we'll use a stub with sample data
 */
async function fetchHistoricalData(
  _companyId: string,
  metric: string,
  fastify: any
): Promise<TimeSeriesDataPoint[]> {
  // TODO: Replace with actual API call to analytics service
  // const response = await fetch(
  //   `http://analytics:3008/v1/analytics/metrics/company/${companyId}/history?metric=${metric}&months=36`
  // );
  // return response.json();

  // Stub implementation - generate sample data
  fastify.log.warn('Using stub data - integrate with analytics service in production');

  const months = 24;
  const baseValue = metric === 'sroi_ratio' ? 3.5 : 75;
  const data: TimeSeriesDataPoint[] = [];

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);

    // Add trend and seasonality
    const trend = i * 0.02;
    const seasonal = Math.sin((i / 12) * 2 * Math.PI) * 0.5;
    const noise = (Math.random() - 0.5) * 0.3;

    data.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat((baseValue + trend + seasonal + noise).toFixed(2)),
    });
  }

  return data;
}
