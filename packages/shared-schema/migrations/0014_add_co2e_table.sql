-- Migration 0014: Add CO2e Emissions Tracking Table
-- Purpose: Store regional grid carbon intensity data for workload emissions calculations
-- Date: 2025-11-16
-- Worker: Phase J GreenOps - carbon-coeff-modeler

-- =============================================================================
-- 1. CO2E EMISSIONS TABLE (Regional Grid Carbon Intensity)
-- =============================================================================

CREATE TABLE IF NOT EXISTS co2e_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic & Temporal
  region VARCHAR(50) NOT NULL,  -- e.g., 'us-east-1', 'eu-central-1'
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Carbon Intensity
  gCO2_per_kWh DECIMAL(10,4) NOT NULL,  -- Grid carbon intensity (grams CO2 per kilowatt-hour)

  -- Energy Mix (percentage breakdown, should sum to ~100%)
  energy_mix_solar DECIMAL(5,2) DEFAULT 0.00,     -- % of solar in grid mix
  energy_mix_wind DECIMAL(5,2) DEFAULT 0.00,      -- % of wind in grid mix
  energy_mix_hydro DECIMAL(5,2) DEFAULT 0.00,     -- % of hydro in grid mix
  energy_mix_nuclear DECIMAL(5,2) DEFAULT 0.00,   -- % of nuclear in grid mix
  energy_mix_coal DECIMAL(5,2) DEFAULT 0.00,      -- % of coal in grid mix
  energy_mix_gas DECIMAL(5,2) DEFAULT 0.00,       -- % of natural gas in grid mix
  energy_mix_oil DECIMAL(5,2) DEFAULT 0.00,       -- % of oil in grid mix
  energy_mix_other DECIMAL(5,2) DEFAULT 0.00,     -- % of other sources

  -- Data Source & Quality
  source VARCHAR(50) DEFAULT 'electricity_maps',  -- 'electricity_maps', 'watttime', 'manual'
  data_quality VARCHAR(20) DEFAULT 'real_time',   -- 'real_time', 'forecast', 'historical', 'estimated'
  confidence_score DECIMAL(3,2),                   -- 0.00 - 1.00 (data quality indicator)

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,              -- Additional data (API response, notes, etc.)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Unique constraint: one record per region per timestamp
  CONSTRAINT unique_region_timestamp UNIQUE (region, timestamp)
);

-- =============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- =============================================================================

-- Primary lookup: get latest intensity for a region (hot path for calculator)
CREATE INDEX idx_co2e_region_timestamp ON co2e_emissions(region, timestamp DESC);

-- Time-series queries: trend analysis over time ranges
CREATE INDEX idx_co2e_timestamp ON co2e_emissions(timestamp DESC);

-- Regional analysis: all regions at specific time
CREATE INDEX idx_co2e_region_created ON co2e_emissions(region, created_at DESC);

-- Data quality filtering
CREATE INDEX idx_co2e_quality ON co2e_emissions(data_quality, timestamp DESC)
  WHERE data_quality = 'real_time';

-- High carbon intensity periods (for optimization alerts)
CREATE INDEX idx_co2e_high_intensity ON co2e_emissions(gCO2_per_kWh DESC, timestamp DESC)
  WHERE gCO2_per_kWh > 400;  -- Above 400g CO2/kWh is considered high

-- Clean energy periods (low carbon intensity)
CREATE INDEX idx_co2e_clean_periods ON co2e_emissions(gCO2_per_kWh ASC, timestamp DESC)
  WHERE gCO2_per_kWh < 100;  -- Below 100g CO2/kWh is considered very clean

-- GIN index for metadata JSON queries
CREATE INDEX idx_co2e_metadata_gin ON co2e_emissions USING GIN (metadata jsonb_path_ops);

-- =============================================================================
-- 3. UPDATE TRIGGER
-- =============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_co2e_emissions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER co2e_emissions_updated_at_trigger
  BEFORE UPDATE ON co2e_emissions
  FOR EACH ROW
  EXECUTE FUNCTION update_co2e_emissions_timestamp();

-- =============================================================================
-- 4. HELPER VIEWS
-- =============================================================================

-- Latest carbon intensity per region
CREATE OR REPLACE VIEW v_latest_co2e_by_region AS
SELECT DISTINCT ON (region)
  region,
  timestamp,
  gCO2_per_kWh,
  energy_mix_solar,
  energy_mix_wind,
  energy_mix_coal,
  energy_mix_gas,
  source,
  data_quality,
  created_at
FROM co2e_emissions
ORDER BY region, timestamp DESC;

COMMENT ON VIEW v_latest_co2e_by_region IS 'Most recent carbon intensity reading for each region';

-- Hourly averages for the last 24 hours
CREATE OR REPLACE VIEW v_co2e_24h_hourly_avg AS
SELECT
  region,
  DATE_TRUNC('hour', timestamp) AS hour,
  AVG(gCO2_per_kWh) AS avg_gCO2_per_kWh,
  MIN(gCO2_per_kWh) AS min_gCO2_per_kWh,
  MAX(gCO2_per_kWh) AS max_gCO2_per_kWh,
  AVG(energy_mix_solar + energy_mix_wind + energy_mix_hydro) AS avg_renewable_pct,
  COUNT(*) AS sample_count
FROM co2e_emissions
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY region, DATE_TRUNC('hour', timestamp)
ORDER BY region, hour DESC;

COMMENT ON VIEW v_co2e_24h_hourly_avg IS 'Hourly carbon intensity averages for the last 24 hours per region';

-- Clean energy windows (for workload scheduling optimization)
CREATE OR REPLACE VIEW v_clean_energy_windows AS
SELECT
  region,
  timestamp,
  gCO2_per_kWh,
  (energy_mix_solar + energy_mix_wind + energy_mix_hydro) AS renewable_pct,
  (100 - energy_mix_coal - energy_mix_oil - energy_mix_gas) AS clean_energy_pct
FROM co2e_emissions
WHERE
  gCO2_per_kWh < 200  -- Less than 200g CO2/kWh
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY gCO2_per_kWh ASC, timestamp DESC;

COMMENT ON VIEW v_clean_energy_windows IS 'Low-carbon time windows suitable for batch workload scheduling';

-- =============================================================================
-- 5. WORKLOAD EMISSIONS TABLE (Calculated Emissions per Service)
-- =============================================================================

CREATE TABLE IF NOT EXISTS workload_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Workload Identification
  service_name VARCHAR(100) NOT NULL,  -- 'q2q-ai', 'reporting', 'api-gateway'
  region VARCHAR(50) NOT NULL,

  -- Time Period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Activity Metrics
  request_count BIGINT NOT NULL,
  total_kWh DECIMAL(12,6) NOT NULL,        -- Total energy consumed
  avg_kWh_per_request DECIMAL(12,9),       -- Average energy per request

  -- Emissions
  total_gCO2e DECIMAL(15,4) NOT NULL,      -- Total emissions in grams CO2e
  gCO2e_per_1k_requests DECIMAL(12,4),     -- Emissions per 1000 requests (reporting metric)

  -- Carbon Intensity Context
  avg_grid_gCO2_per_kWh DECIMAL(10,4),     -- Average grid intensity during period
  min_grid_gCO2_per_kWh DECIMAL(10,4),     -- Minimum grid intensity during period
  max_grid_gCO2_per_kWh DECIMAL(10,4),     -- Maximum grid intensity during period

  -- Metadata
  calculation_method VARCHAR(50) DEFAULT 'direct',  -- 'direct', 'estimated', 'proxy'
  assumptions JSONB DEFAULT '{}'::jsonb,            -- Energy assumptions used
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Unique constraint: one calculation per service/region/period
  CONSTRAINT unique_workload_period UNIQUE (service_name, region, period_start, period_end)
);

-- Indexes for workload emissions
CREATE INDEX idx_workload_service_period ON workload_emissions(service_name, period_start DESC);
CREATE INDEX idx_workload_region_period ON workload_emissions(region, period_start DESC);
CREATE INDEX idx_workload_created ON workload_emissions(created_at DESC);
CREATE INDEX idx_workload_high_emissions ON workload_emissions(total_gCO2e DESC);

-- Update trigger for workload_emissions
CREATE TRIGGER workload_emissions_updated_at_trigger
  BEFORE UPDATE ON workload_emissions
  FOR EACH ROW
  EXECUTE FUNCTION update_co2e_emissions_timestamp();

COMMENT ON TABLE workload_emissions IS 'Calculated carbon emissions per service workload';
COMMENT ON COLUMN workload_emissions.total_gCO2e IS 'Total emissions in grams CO2 equivalent';
COMMENT ON COLUMN workload_emissions.gCO2e_per_1k_requests IS 'Normalized emissions per 1000 requests for comparison';
COMMENT ON COLUMN workload_emissions.assumptions IS 'Energy consumption assumptions (e.g., {"wh_per_request": 0.5})';

-- =============================================================================
-- 6. DATA RETENTION POLICY (90-DAY TTL)
-- =============================================================================

-- Create function to delete old records
CREATE OR REPLACE FUNCTION cleanup_old_co2e_data()
RETURNS void AS $$
BEGIN
  -- Delete co2e_emissions older than 90 days
  DELETE FROM co2e_emissions
  WHERE timestamp < NOW() - INTERVAL '90 days';

  -- Delete workload_emissions older than 90 days
  DELETE FROM workload_emissions
  WHERE period_end < NOW() - INTERVAL '90 days';

  RAISE NOTICE 'Cleaned up CO2e data older than 90 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_co2e_data IS 'Deletes CO2e and workload emissions data older than 90 days (run via cron)';

-- Note: Schedule this function to run daily via a cron job or pg_cron
-- Example: SELECT cron.schedule('cleanup-co2e', '0 2 * * *', 'SELECT cleanup_old_co2e_data();');

-- =============================================================================
-- 7. SAMPLE DATA (Optional - for testing)
-- =============================================================================

-- Insert sample data for US-EAST-1 (Virginia) - coal-heavy grid
INSERT INTO co2e_emissions (
  region, timestamp, gCO2_per_kWh,
  energy_mix_solar, energy_mix_wind, energy_mix_coal, energy_mix_gas, energy_mix_nuclear,
  source, data_quality, confidence_score
) VALUES (
  'us-east-1',
  NOW() - INTERVAL '1 hour',
  450.25,
  5.2, 8.3, 35.6, 38.4, 12.5,
  'electricity_maps',
  'real_time',
  0.95
) ON CONFLICT (region, timestamp) DO NOTHING;

-- Insert sample data for EU-CENTRAL-1 (Frankfurt) - cleaner grid
INSERT INTO co2e_emissions (
  region, timestamp, gCO2_per_kWh,
  energy_mix_solar, energy_mix_wind, energy_mix_coal, energy_mix_gas, energy_mix_nuclear,
  source, data_quality, confidence_score
) VALUES (
  'eu-central-1',
  NOW() - INTERVAL '1 hour',
  280.50,
  12.5, 28.3, 18.2, 25.4, 15.6,
  'electricity_maps',
  'real_time',
  0.92
) ON CONFLICT (region, timestamp) DO NOTHING;

-- =============================================================================
-- 8. COMMENTS
-- =============================================================================

COMMENT ON TABLE co2e_emissions IS 'Regional grid carbon intensity tracking for emissions calculations';
COMMENT ON COLUMN co2e_emissions.region IS 'AWS region or geographic zone (e.g., us-east-1, eu-central-1)';
COMMENT ON COLUMN co2e_emissions.gCO2_per_kWh IS 'Carbon intensity in grams CO2 per kilowatt-hour';
COMMENT ON COLUMN co2e_emissions.energy_mix_solar IS 'Percentage of solar energy in grid mix (0-100)';
COMMENT ON COLUMN co2e_emissions.source IS 'Data provider (electricity_maps, watttime, manual)';
COMMENT ON COLUMN co2e_emissions.data_quality IS 'Data type: real_time, forecast, historical, or estimated';
COMMENT ON COLUMN co2e_emissions.confidence_score IS 'Data confidence level (0.00 = low, 1.00 = high)';

-- =============================================================================
-- 9. ROLLBACK PREPARATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 0014 complete. To rollback:';
  RAISE NOTICE '  DROP VIEW IF EXISTS v_clean_energy_windows CASCADE;';
  RAISE NOTICE '  DROP VIEW IF EXISTS v_co2e_24h_hourly_avg CASCADE;';
  RAISE NOTICE '  DROP VIEW IF EXISTS v_latest_co2e_by_region CASCADE;';
  RAISE NOTICE '  DROP TABLE IF EXISTS workload_emissions CASCADE;';
  RAISE NOTICE '  DROP TABLE IF EXISTS co2e_emissions CASCADE;';
  RAISE NOTICE '  DROP FUNCTION IF EXISTS cleanup_old_co2e_data() CASCADE;';
  RAISE NOTICE '  DROP FUNCTION IF EXISTS update_co2e_emissions_timestamp() CASCADE;';
END $$;
