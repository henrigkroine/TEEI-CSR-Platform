-- Rollback: AI Prompt Audit Trail
-- Worker 10: AI/ML Explainability & Guardrails

-- Drop tables in reverse order
DROP TABLE IF EXISTS ai_safety_policy CASCADE;
DROP TABLE IF EXISTS ai_budget_config CASCADE;
DROP TABLE IF EXISTS ai_prompt_audit CASCADE;
