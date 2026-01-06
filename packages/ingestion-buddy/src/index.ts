/**
 * Buddy Program Ingestion Layer
 *
 * Main entry point for Buddy Program → CSR Platform integration.
 *
 * **Phase 2: Implementation (Agents 7-14)**
 * - ✅ Agent 7: Export specification
 * - ✅ Agent 8: CSV/JSON/XLSX parsers
 * - ✅ Agent 9: Zod validators
 * - ✅ Agent 10-12: Transformers
 * - ✅ Agent 13: Persistors
 * - ⏳ Agent 14: CLI tools
 *
 * @module ingestion-buddy
 * @packageDocumentation
 */

// Parsers (Agent 8)
export * from './parsers';

// Validators (Agent 9)
export * from './validators';

// Transformers (Agents 10-12)
export * from './transformers';

// Persistors (Agent 13)
export * from './persistors';

// Utils (Agents 4-5)
export * from './utils/identity-matcher';
export * from './utils/activity-taxonomy';
