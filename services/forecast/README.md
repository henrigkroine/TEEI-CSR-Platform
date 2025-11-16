# Forecast Service v2

Production-grade time-series forecasting service for SROI and VIS metrics.

## Features

- **Multiple Forecasting Models**:
  - ETS (Simple, Holt, Holt-Winters)
  - Prophet-like (Trend + Seasonality decomposition)
  - Ensemble (Combined ETS + Prophet)
  - Auto-selection (Best model based on historical performance)

- **Confidence Bands**: 80% and 95% prediction intervals
- **Back-testing**: Walk-forward validation with MAE/RMSE/MAPE metrics
- **Scenario Modeling**: Optimistic/Realistic/Pessimistic forecasts
- **Performance**: p95 latency <2.5s with Redis caching
- **Observability**: OpenTelemetry integration for tracing

## Architecture

```
services/forecast/
├── src/
│   ├── models/           # Forecasting algorithms
│   │   ├── ets.ts       # Exponential smoothing (Simple, Holt, Holt-Winters)
│   │   ├── prophet.ts   # Prophet-like trend + seasonality
│   │   └── ensemble.ts  # Combined model predictions
│   ├── lib/             # Utilities
│   │   ├── backtest.ts  # Walk-forward validation
│   │   ├── confidence.ts # Confidence band calculation
│   │   ├── scenarios.ts  # Scenario generation
│   │   └── cache.ts      # Redis caching layer
│   ├── routes/          # API endpoints
│   │   └── forecast.ts  # POST /v1/analytics/forecast/v2
│   ├── health/          # Health checks
│   └── __tests__/       # Unit tests (80%+ coverage)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## API Endpoints

### POST /v1/analytics/forecast/v2

Generate time-series forecast for SROI or VIS metrics.

**Request:**
```json
{
  "companyId": "uuid",
  "metric": "sroi_ratio",
  "horizonMonths": 6,
  "model": "ensemble",
  "includeBacktest": false,
  "includeScenarios": true,
  "config": {
    "ets": {
      "method": "holt-winters",
      "seasonalPeriod": 12
    }
  }
}
```

**Response:**
```json
{
  "forecast": {
    "predictions": [
      { "date": "2025-12-01", "value": 3.8 }
    ],
    "confidenceBands": {
      "lower80": [3.2],
      "upper80": [4.4],
      "lower95": [2.9],
      "upper95": [4.7]
    }
  },
  "scenarios": {
    "optimistic": [{ "date": "2025-12-01", "value": 4.4 }],
    "realistic": [{ "date": "2025-12-01", "value": 3.8 }],
    "pessimistic": [{ "date": "2025-12-01", "value": 3.2 }]
  },
  "backtest": {
    "avgMetrics": { "mae": 0.3, "rmse": 0.4, "mape": 8.2 }
  },
  "metadata": {
    "modelUsed": "ets-holt-winters",
    "historicalMonths": 24,
    "generatedAt": "2025-11-15T10:00:00Z",
    "latencyMs": 450,
    "cached": false
  }
}
```

### POST /v1/analytics/forecast/compare

Compare accuracy of multiple forecasting models.

**Request:**
```json
{
  "companyId": "uuid",
  "metric": "vis_score",
  "horizonMonths": 6
}
```

**Response:**
```json
{
  "modelComparison": [
    { "modelName": "ets-holt-winters", "avgMAE": 2.1, "avgRMSE": 2.8 },
    { "modelName": "prophet", "avgMAE": 2.3, "avgRMSE": 3.0 },
    { "modelName": "ensemble", "avgMAE": 2.0, "avgRMSE": 2.7 }
  ],
  "recommendation": "ensemble"
}
```

## Models

### ETS (Exponential Smoothing)

**Simple Exponential Smoothing**:
- Level only, no trend or seasonality
- Best for: Stable time series without trend

**Holt's Method**:
- Level + trend
- Best for: Data with trend but no seasonality

**Holt-Winters**:
- Level + trend + seasonality
- Best for: Data with both trend and seasonal patterns
- Supports additive and multiplicative seasonality
- Auto-detects seasonal period (default: 12 months)

**Configuration:**
```typescript
{
  method: 'holt-winters',
  seasonalPeriod: 12,
  alpha: 0.7,  // Level smoothing (auto-tuned if omitted)
  beta: 0.1,   // Trend smoothing
  gamma: 0.2,  // Seasonal smoothing
  seasonal: 'additive'
}
```

### Prophet-like Model

Simplified version of Facebook Prophet:
- **Piecewise linear trend** with automatic changepoint detection
- **Fourier series seasonality** (yearly, quarterly, monthly)
- **Residual-based confidence intervals**

**Configuration:**
```typescript
{
  growth: 'linear',
  changepoints: ['2024-06-01'],  // Auto-detected if omitted
  seasonality: {
    yearly: true,
    quarterly: true,
    monthly: false
  }
}
```

### Ensemble Model

Combines ETS and Prophet using weighted averaging:
- Default: 50% ETS, 50% Prophet
- Typically more robust than single models
- Confidence bands averaged across models

**Configuration:**
```typescript
{
  ets: { method: 'holt-winters' },
  prophet: { growth: 'linear', seasonality: { yearly: true } },
  weights: { ets: 0.6, prophet: 0.4 }
}
```

### Auto-Selection

Automatically selects best model based on back-testing:
1. Runs ETS and Prophet on historical data
2. Compares in-sample MAE
3. Returns forecast from best-performing model

## Back-testing

Walk-forward validation with configurable parameters:

```typescript
{
  trainMonths: 18,  // Training window
  testMonths: 6,    // Test window
  stride: 3         // Move forward by N months
}
```

**Metrics:**
- **MAE** (Mean Absolute Error): Average absolute difference
- **RMSE** (Root Mean Squared Error): Penalizes large errors
- **MAPE** (Mean Absolute Percentage Error): Percentage-based error

## Confidence Bands

Two approaches for prediction intervals:

1. **Parametric** (default):
   - Assumes normally distributed errors
   - Fast computation
   - 80% CI: ±1.28σ, 95% CI: ±1.96σ

2. **Bootstrap**:
   - Non-parametric resampling
   - More robust for non-normal errors
   - Slower but more accurate

Error grows with forecast horizon using simple multiplier: √(1 + h * 0.1)

## Scenario Modeling

Three scenarios derived from confidence bands:

- **Optimistic**: Upper 80% confidence band
  - Assumes favorable conditions with sustained growth
- **Realistic**: Point estimate (median)
  - Based on historical patterns and current trajectory
- **Pessimistic**: Lower 80% confidence band
  - Accounts for potential headwinds or reduced engagement

## Caching

Redis-based caching with 6-hour TTL:

**Cache key format:**
```
forecast:{companyId}:{metric}:{horizonMonths}:{configHash}
```

**Pre-computation:**
- Nightly cron job for common forecasts
- Reduces latency for frequently requested forecasts

## Performance Optimization

Target: p95 latency <2.5s

1. **Caching**: 6-hour TTL, pre-computed common forecasts
2. **Query optimization**: Fetch only last 36 months of data
3. **Parallel processing**: Back-test folds run concurrently (limit: 4)
4. **Streaming**: SSE for latency >1s (future enhancement)

## Running the Service

### Development

```bash
# Install dependencies
cd services/forecast
pnpm install

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

### Production

```bash
# Build
pnpm build

# Start
pnpm start
```

### Environment Variables

```bash
PORT_FORECAST=3007
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
LOG_LEVEL=info
NODE_ENV=production
```

## Testing

**Unit tests** (4 files, 80%+ coverage):
- `ets.test.ts`: ETS model accuracy
- `backtest.test.ts`: Validation metrics
- `scenarios.test.ts`: Scenario generation
- `forecast-api.test.ts`: Endpoint integration

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test ets.test.ts

# Watch mode
pnpm test --watch

# Coverage report
pnpm test:coverage
```

## Integration with Analytics Service

Historical data endpoint:
```
GET /v1/analytics/metrics/company/:companyId/history?metric=sroi_ratio&months=24
```

Returns time-series data for forecasting.

## Health Checks

- `GET /health` - Basic health check
- `GET /health/live` - Kubernetes liveness probe
- `GET /health/ready` - Kubernetes readiness probe (checks Redis)
- `GET /health/dependencies` - Detailed dependency status

## Production Considerations

1. **Data Quality**:
   - Minimum 3 months for basic forecasts
   - Minimum 12 months for seasonal models
   - Minimum 24 months for reliable back-testing

2. **Model Selection**:
   - Use auto-selection for unknown patterns
   - Use Holt-Winters for seasonal SROI/VIS data
   - Use ensemble for critical forecasts

3. **Monitoring**:
   - Track forecast accuracy vs actuals
   - Monitor cache hit rates
   - Alert on p95 latency >2.5s

4. **Rate Limiting**:
   - Max 100 forecasts/day per company (future enhancement)
   - Prevents abuse and controls costs

## Future Enhancements

- [ ] Full Facebook Prophet integration (Python bridge)
- [ ] ARIMA/SARIMA models
- [ ] External regressor support (e.g., market indicators)
- [ ] SSE streaming for long-running forecasts
- [ ] Model registry with versioning
- [ ] A/B testing framework for model comparison
- [ ] Automated model retraining pipeline

## References

- [Exponential Smoothing (Hyndman & Athanasopoulos)](https://otexts.com/fpp3/expsmooth.html)
- [Facebook Prophet](https://facebook.github.io/prophet/)
- [Forecasting: Principles and Practice](https://otexts.com/fpp3/)
