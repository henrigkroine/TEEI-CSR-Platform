#!/usr/bin/env python3
"""
AWS Cost Forecasting Model

Purpose: Predict 30-day AWS costs using historical data with Prophet/ARIMA
Target: MAPE ≤10% (Mean Absolute Percentage Error)

Data Source: ClickHouse aws_costs table (90-day history)
Output:
  - /data/finops/forecasts/cost-forecast-YYYY-MM-DD.json
  - Prometheus metrics for alerting
  - ClickHouse forecast table for dashboard

Algorithm: Facebook Prophet (preferred) with fallback to ARIMA

Schedule: Daily at 03:00 UTC (after cost-ingest.sh)

Requirements:
  - prophet (pip install prophet)
  - pandas
  - clickhouse-driver
  - prometheus-client
"""

import sys
import json
import logging
import warnings
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
import numpy as np
from clickhouse_driver import Client as ClickHouseClient
from prometheus_client import CollectorRegistry, Gauge, push_to_gateway

# Suppress Prophet warnings
warnings.filterwarnings("ignore")
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ"
)
logger = logging.getLogger(__name__)

# Configuration
CLICKHOUSE_HOST = "clickhouse"
CLICKHOUSE_DB = "teei_observability"
FORECAST_DAYS = 30
LOOKBACK_DAYS = 90
OUTPUT_DIR = Path("/data/finops/forecasts")
PROMETHEUS_PUSHGATEWAY = "pushgateway:9091"

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class CostForecaster:
    """AWS cost forecasting with Prophet and ARIMA fallback."""

    def __init__(self, clickhouse_host: str = CLICKHOUSE_HOST, db: str = CLICKHOUSE_DB):
        self.ch_client = ClickHouseClient(host=clickhouse_host)
        self.db = db
        self.model = None
        self.forecast_method = "prophet"

    def fetch_historical_data(self, days: int = LOOKBACK_DAYS) -> pd.DataFrame:
        """Fetch historical daily cost data from ClickHouse."""
        logger.info(f"Fetching {days} days of historical cost data...")

        query = f"""
        SELECT
            date AS ds,
            sum(cost_usd) AS y
        FROM {self.db}.aws_costs
        WHERE date >= today() - {days}
        GROUP BY ds
        ORDER BY ds
        """

        result = self.ch_client.execute(query)
        df = pd.DataFrame(result, columns=["ds", "y"])
        df["ds"] = pd.to_datetime(df["ds"])

        logger.info(f"Fetched {len(df)} data points from {df['ds'].min()} to {df['ds'].max()}")
        logger.info(f"Cost range: ${df['y'].min():.2f} - ${df['y'].max():.2f} (avg: ${df['y'].mean():.2f})")

        return df

    def train_prophet_model(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """Train Prophet model and generate forecast."""
        try:
            from prophet import Prophet

            logger.info("Training Prophet model...")

            # Initialize Prophet with custom parameters
            model = Prophet(
                daily_seasonality=False,
                weekly_seasonality=True,
                yearly_seasonality=True,
                changepoint_prior_scale=0.05,  # Control overfitting
                seasonality_prior_scale=10.0,
                interval_width=0.95  # 95% confidence intervals
            )

            # Fit model
            model.fit(df)

            # Generate forecast
            future = model.make_future_dataframe(periods=FORECAST_DAYS)
            forecast = model.predict(future)

            # Calculate metrics on training data
            train_predictions = forecast[forecast["ds"].isin(df["ds"])].copy()
            train_predictions = train_predictions.merge(df, on="ds", suffixes=("_pred", "_actual"))

            mape = self._calculate_mape(train_predictions["y_actual"], train_predictions["yhat"])
            rmse = np.sqrt(np.mean((train_predictions["y_actual"] - train_predictions["yhat"]) ** 2))

            metrics = {
                "method": "prophet",
                "mape": float(mape),
                "rmse": float(rmse),
                "training_samples": len(df),
                "forecast_days": FORECAST_DAYS
            }

            logger.info(f"Prophet model trained successfully: MAPE={mape:.2f}%, RMSE=${rmse:.2f}")

            self.model = model
            self.forecast_method = "prophet"

            return forecast, metrics

        except ImportError:
            logger.warning("Prophet not installed, falling back to ARIMA")
            return self.train_arima_model(df)

    def train_arima_model(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """Fallback ARIMA model if Prophet is unavailable."""
        try:
            from statsmodels.tsa.arima.model import ARIMA

            logger.info("Training ARIMA model...")

            # Simple ARIMA(1,1,1) model
            model = ARIMA(df["y"], order=(1, 1, 1))
            fitted_model = model.fit()

            # Generate forecast
            forecast_result = fitted_model.forecast(steps=FORECAST_DAYS)

            # Create forecast dataframe
            last_date = df["ds"].max()
            future_dates = pd.date_range(
                start=last_date + timedelta(days=1),
                periods=FORECAST_DAYS,
                freq="D"
            )

            forecast = pd.DataFrame({
                "ds": pd.concat([df["ds"], pd.Series(future_dates)]),
                "yhat": pd.concat([fitted_model.fittedvalues, forecast_result]),
                "yhat_lower": pd.concat([
                    fitted_model.fittedvalues * 0.9,
                    forecast_result * 0.9
                ]),
                "yhat_upper": pd.concat([
                    fitted_model.fittedvalues * 1.1,
                    forecast_result * 1.1
                ])
            })

            # Calculate metrics
            train_predictions = forecast[forecast["ds"].isin(df["ds"])].copy()
            train_predictions = train_predictions.merge(df, on="ds", suffixes=("_pred", "_actual"))

            mape = self._calculate_mape(train_predictions["y_actual"], train_predictions["yhat"])
            rmse = np.sqrt(np.mean((train_predictions["y_actual"] - train_predictions["yhat"]) ** 2))

            metrics = {
                "method": "arima",
                "mape": float(mape),
                "rmse": float(rmse),
                "training_samples": len(df),
                "forecast_days": FORECAST_DAYS
            }

            logger.info(f"ARIMA model trained successfully: MAPE={mape:.2f}%, RMSE=${rmse:.2f}")

            self.model = fitted_model
            self.forecast_method = "arima"

            return forecast, metrics

        except ImportError as e:
            logger.error(f"Failed to import ARIMA: {e}")
            logger.error("Install statsmodels: pip install statsmodels")
            sys.exit(1)

    @staticmethod
    def _calculate_mape(actual: pd.Series, predicted: pd.Series) -> float:
        """Calculate Mean Absolute Percentage Error."""
        actual = actual.replace(0, np.nan)  # Avoid division by zero
        return float(np.mean(np.abs((actual - predicted) / actual)) * 100)

    def save_forecast(self, forecast: pd.DataFrame, metrics: Dict, output_file: Path):
        """Save forecast to JSON file."""
        logger.info(f"Saving forecast to {output_file}...")

        # Get only future predictions
        today = pd.Timestamp.now().normalize()
        future_forecast = forecast[forecast["ds"] > today].copy()

        output = {
            "metadata": {
                "forecast_date": datetime.utcnow().isoformat() + "Z",
                "method": metrics["method"],
                "mape": metrics["mape"],
                "rmse": metrics["rmse"],
                "training_samples": metrics["training_samples"],
                "forecast_days": metrics["forecast_days"]
            },
            "forecast": [
                {
                    "date": row["ds"].strftime("%Y-%m-%d"),
                    "predicted_cost": float(row["yhat"]),
                    "lower_bound": float(row["yhat_lower"]),
                    "upper_bound": float(row["yhat_upper"])
                }
                for _, row in future_forecast.iterrows()
            ]
        }

        with open(output_file, "w") as f:
            json.dump(output, f, indent=2)

        logger.info(f"Forecast saved: {len(output['forecast'])} days")

    def load_to_clickhouse(self, forecast: pd.DataFrame):
        """Load forecast data into ClickHouse."""
        logger.info("Loading forecast into ClickHouse...")

        # Create table if not exists
        create_table_query = f"""
        CREATE TABLE IF NOT EXISTS {self.db}.cost_forecasts (
            forecast_date Date,
            prediction_date Date,
            predicted_cost Float64,
            lower_bound Float64,
            upper_bound Float64,
            forecast_method String,
            ingestion_timestamp DateTime DEFAULT now()
        ) ENGINE = ReplacingMergeTree(ingestion_timestamp)
        PARTITION BY toYYYYMM(prediction_date)
        ORDER BY (forecast_date, prediction_date)
        SETTINGS index_granularity = 8192;
        """

        self.ch_client.execute(create_table_query)

        # Prepare data for insertion
        today = pd.Timestamp.now().normalize()
        future_forecast = forecast[forecast["ds"] > today].copy()
        forecast_date = today.strftime("%Y-%m-%d")

        data = [
            (
                forecast_date,
                row["ds"].strftime("%Y-%m-%d"),
                float(row["yhat"]),
                float(row["yhat_lower"]),
                float(row["yhat_upper"]),
                self.forecast_method
            )
            for _, row in future_forecast.iterrows()
        ]

        insert_query = f"""
        INSERT INTO {self.db}.cost_forecasts
        (forecast_date, prediction_date, predicted_cost, lower_bound, upper_bound, forecast_method)
        VALUES
        """

        self.ch_client.execute(insert_query, data)

        logger.info(f"Loaded {len(data)} forecast records into ClickHouse")

    def push_to_prometheus(self, forecast: pd.DataFrame, metrics: Dict):
        """Push forecast metrics to Prometheus Pushgateway."""
        logger.info("Pushing metrics to Prometheus...")

        registry = CollectorRegistry()

        # Model accuracy metrics
        mape_gauge = Gauge(
            "cost_forecast_mape_percent",
            "Mean Absolute Percentage Error of cost forecast model",
            registry=registry
        )
        mape_gauge.set(metrics["mape"])

        rmse_gauge = Gauge(
            "cost_forecast_rmse_usd",
            "Root Mean Squared Error of cost forecast model",
            registry=registry
        )
        rmse_gauge.set(metrics["rmse"])

        # 30-day forecast total
        today = pd.Timestamp.now().normalize()
        future_forecast = forecast[forecast["ds"] > today].copy()
        total_30d_forecast = future_forecast["yhat"].sum()

        forecast_total_gauge = Gauge(
            "cost_forecast_30d_total_usd",
            "Predicted total AWS cost for next 30 days",
            registry=registry
        )
        forecast_total_gauge.set(total_30d_forecast)

        # 7-day forecast (for near-term alerts)
        forecast_7d = future_forecast.head(7)["yhat"].sum()
        forecast_7d_gauge = Gauge(
            "cost_forecast_7d_total_usd",
            "Predicted total AWS cost for next 7 days",
            registry=registry
        )
        forecast_7d_gauge.set(forecast_7d)

        # Forecast timestamp
        timestamp_gauge = Gauge(
            "cost_forecast_timestamp",
            "Unix timestamp of last successful forecast",
            registry=registry
        )
        timestamp_gauge.set(datetime.utcnow().timestamp())

        # Push to gateway
        try:
            push_to_gateway(
                PROMETHEUS_PUSHGATEWAY,
                job="cost_forecast",
                registry=registry
            )
            logger.info("Metrics pushed to Prometheus successfully")
        except Exception as e:
            logger.error(f"Failed to push to Prometheus: {e}")


def main():
    """Main execution."""
    try:
        logger.info("=" * 70)
        logger.info("AWS Cost Forecasting - Starting")
        logger.info("=" * 70)

        # Initialize forecaster
        forecaster = CostForecaster()

        # Fetch historical data
        df = forecaster.fetch_historical_data(days=LOOKBACK_DAYS)

        if len(df) < 30:
            logger.error(f"Insufficient data: {len(df)} days (minimum 30 required)")
            sys.exit(1)

        # Train model and generate forecast
        forecast, metrics = forecaster.train_prophet_model(df)

        # Validate MAPE target
        if metrics["mape"] > 10:
            logger.warning(f"MAPE {metrics['mape']:.2f}% exceeds 10% target - model may need tuning")
        else:
            logger.info(f"✓ MAPE {metrics['mape']:.2f}% meets ≤10% target")

        # Save outputs
        today = datetime.utcnow().strftime("%Y-%m-%d")
        output_file = OUTPUT_DIR / f"cost-forecast-{today}.json"
        forecaster.save_forecast(forecast, metrics, output_file)

        # Load to ClickHouse
        forecaster.load_to_clickhouse(forecast)

        # Push to Prometheus
        forecaster.push_to_prometheus(forecast, metrics)

        # Summary
        logger.info("=" * 70)
        logger.info("Forecast Summary")
        logger.info("=" * 70)
        logger.info(f"Method: {metrics['method'].upper()}")
        logger.info(f"MAPE: {metrics['mape']:.2f}%")
        logger.info(f"RMSE: ${metrics['rmse']:.2f}")
        logger.info(f"Training samples: {metrics['training_samples']}")
        logger.info(f"Forecast horizon: {FORECAST_DAYS} days")

        # Get 30-day forecast total
        today_ts = pd.Timestamp.now().normalize()
        future_forecast = forecast[forecast["ds"] > today_ts].copy()
        total_30d = future_forecast["yhat"].sum()
        avg_daily = future_forecast["yhat"].mean()

        logger.info(f"30-day forecast total: ${total_30d:.2f}")
        logger.info(f"Average daily cost: ${avg_daily:.2f}")
        logger.info(f"Output file: {output_file}")
        logger.info("=" * 70)
        logger.info("✓ Cost forecasting complete!")

    except Exception as e:
        logger.error(f"Forecasting failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
