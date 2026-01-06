---
id: 29
key: benchmarks
name: Benchmarks
category: Platform
status: production
lastReviewed: 2025-01-27
---

# Benchmarks

## 1. Summary

- Cohort comparison and benchmarking system for comparing company performance against industry peers.
- Features cohort comparison, percentile ribbons, benchmark metrics, and privacy-preserving data sharing (k-anonymity, differential privacy).
- Provides industry, region, and size-based benchmarks with opt-in data sharing.
- Used by executives and analysts for competitive analysis and performance benchmarking.

## 2. Current Status

- Overall status: `production`

- Fully implemented Benchmarks feature in Corporate Cockpit with benchmark components (`apps/corp-cockpit-astro/src/components/benchmarks/` with 13 TypeScript files). Core features include cohort comparison, percentile ribbons, benchmark metrics, k-anonymity (minimum 5 companies per cohort), differential privacy (ε=0.1), opt-in data sharing, and consent-based benchmarking. Analytics service includes benchmark endpoints with privacy guarantees.

- Documentation may exist in `docs/benchmarks/` for benchmark documentation. Service includes comprehensive privacy protections for data sharing.

## 3. What's Next

- Add advanced cohort builder UI with saved cohorts.
- Enhance percentile ribbon visualization with more granular bands.
- Implement benchmark alerts for performance changes.
- Add benchmark export functionality for reporting.

## 4. Code & Files

Backend / services:
- `services/analytics/src/routes/benchmarks.ts` - Benchmark API endpoints
- `services/analytics/src/lib/k-anonymity.ts` - k-anonymity checks
- `services/analytics/src/lib/dp-noise.ts` - Differential privacy noise

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/benchmarks/` - Benchmark components (13 *.tsx files)

Shared / schema / docs:
- `docs/benchmarks/` - Benchmark documentation (if exists)

## 5. Dependencies

Consumes:
- Analytics Engine for benchmark data
- Consent Management for opt-in data sharing
- Privacy controls for k-anonymity and differential privacy

Provides:
- Benchmark data for Corporate Cockpit Dashboard
- Competitive analysis for executives
- Performance benchmarking for strategic planning

## 6. Notes

- Cohort comparison enables performance comparison against industry peers.
- Percentile ribbons visualize performance distribution across cohorts.
- k-anonymity ensures minimum 5 companies per cohort for privacy.
- Differential privacy adds noise to protect individual company data.
- Opt-in data sharing ensures companies consent to benchmarking participation.



