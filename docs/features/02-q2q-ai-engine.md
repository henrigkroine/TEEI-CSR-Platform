---
id: 02
key: q2q-ai-engine
name: Q2Q AI Engine
category: AI & Analytics
status: production
lastReviewed: 2025-01-27
---

# Q2Q AI Engine

## 1. Summary

- Production-ready AI-powered text classification service that converts qualitative feedback into quantitative outcome scores.
- Multi-provider architecture supporting Claude (Anthropic), OpenAI, and Google Gemini with seamless switching.
- Analyzes learner feedback for confidence changes, belonging, language proficiency, employability signals, and risk cues.
- Includes RAG-enhanced retrieval, mandatory citation guarantees, and multilingual calibration (EN/UK/NO) for trustworthy, auditable measurements.

## 2. Current Status

- Overall status: `production`

- Fully implemented Q2Q AI service (port 3005) with 77 TypeScript files. Core features include multi-provider AI inference (Claude 3.5 Sonnet, GPT-4o Mini, Gemini 1.5 Flash), structured classification across 10 outcome dimensions, evidence extraction with citation guarantees, cost tracking per request, retry logic with exponential backoff, and calibration system with F1/precision/recall metrics. Q2Q v3 methodology shows 0.87 macro F1 (EN), 0.82 (UK), 0.84 (NO), and 100% citation coverage. Service includes safety checks, prompt versioning, drift detection, and governance features.

- Comprehensive test suite exists with tests for safety, fairness, registry, prompts, metrics, multilingual support, language detection, labels, drift, and retry logic. Documentation includes Q2Qv3_Methodology.md, Q2Q_Model_Governance.md, and Q2Q_Label_Taxonomy.md.

## 3. What's Next

- Harden safety checks and labeling workflows for production edge cases in `services/q2q-ai/src/safety/`.
- Add batch classification endpoint for processing multiple feedback items in a single request.
- Implement local model fallback for offline scenarios or cost optimization.
- Enhance evidence snippet extraction specifically for Gen-AI report generation use cases.

## 4. Code & Files

Backend / services:
- `services/q2q-ai/` - Q2Q AI service (77 TypeScript files)
- `services/q2q-ai/src/inference/` - AI provider infrastructure (driver, providers, prompts, retry)
- `services/q2q-ai/src/classifier.ts` - Main classification logic
- `services/q2q-ai/src/classifier-real.ts` - Production classifier implementation
- `services/q2q-ai/src/safety/` - Safety moderation checks
- `services/q2q-ai/src/labeling/` - Labeling taxonomy and active queue
- `services/q2q-ai/src/retrieval/` - RAG retrieval pipeline (embeddings, chunker, retriever)
- `services/q2q-ai/src/citations/` - Citation guarantee engine
- `services/q2q-ai/src/eval/` - Evaluation harness (multilingual, drift, golden sets)
- `services/q2q-ai/src/calibration/` - Calibration system (threshold optimizer, tenant weights, evaluator)
- `services/q2q-ai/src/routes/classify.ts` - Classification API endpoint
- `packages/model-registry/` - AI model configuration

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/q2q/` - Q2Q UI components (if exists)

Shared / schema / docs:
- `docs/Q2Qv3_Methodology.md` - Q2Q v3 methodology documentation
- `docs/Q2Q_Model_Governance.md` - Model governance guide
- `docs/Q2Q_Label_Taxonomy.md` - Label taxonomy documentation
- `docs/Q2Q_GenReports_Wiring.md` - Gen-AI reports integration

## 5. Dependencies

Consumes:
- AI providers: Claude (Anthropic), OpenAI, Google Gemini APIs
- Model Registry for model versioning and configuration
- Safety Moderation service for content screening
- Evidence database for citation validation

Provides:
- Outcome scores used by SROI and VIS calculators
- Evidence snippets for Report Generation
- Classification results consumed by Analytics Engine
- Language comfort signals for Journey Tracking

## 6. Notes

- Q2Q v3 represents major advancement with RAG-enhanced retrieval and 100% citation coverage.
- Multi-provider architecture allows cost optimization and failover scenarios.
- Multilingual support (EN/UK/NO) with per-language calibration ensures accuracy across locales.
- Cost tracking monitors token usage and estimated costs per request for budget management.
- Safety checks include prompt shielding and anomaly signal detection.



