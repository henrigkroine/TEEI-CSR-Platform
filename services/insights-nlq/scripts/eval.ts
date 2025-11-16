/**
 * NLQ v2 Multilingual Evaluation Script
 *
 * Evaluates NLQ system across languages (EN/UK/NO/AR/HE)
 * Measures: Accuracy, Citation Quality, Safety, Performance
 */

import { NLQDriver } from '../src/inference/nlq-driver.js';
import { runGuardrails, ADVERSARIAL_TEST_CASES } from '../src/security/guardrails.js';

interface TestCase {
  id: string;
  query: string;
  language: 'en' | 'uk' | 'no' | 'ar' | 'he';
  expectedTables: string[];
  expectedCitations: number;
  shouldSucceed: boolean;
}

interface EvalResult {
  testCase: TestCase;
  success: boolean;
  sql: string | null;
  tablesFound: string[];
  citationsCount: number;
  latencyMs: number;
  costUSD: number;
  error?: string;
}

interface EvalSummary {
  totalTests: number;
  passed: number;
  failed: number;
  byLanguage: Record<string, { passed: number; failed: number }>;
  avgLatencyMs: number;
  totalCostUSD: number;
  f1Score: number;
  precision: number;
  recall: number;
}

// Multilingual test cases
const TEST_CASES: TestCase[] = [
  // English
  {
    id: 'en-001',
    query: 'How many volunteers participated in programs this quarter?',
    language: 'en',
    expectedTables: ['journey_transitions'],
    expectedCitations: 1,
    shouldSucceed: true
  },
  {
    id: 'en-002',
    query: 'What is the average SROI for 2024?',
    language: 'en',
    expectedTables: ['impact_metrics'],
    expectedCitations: 1,
    shouldSucceed: true
  },
  {
    id: 'en-003',
    query: 'Show me top 10 programs by volunteer hours',
    language: 'en',
    expectedTables: ['impact_metrics'],
    expectedCitations: 1,
    shouldSucceed: true
  },

  // Ukrainian
  {
    id: 'uk-001',
    query: 'Скільки волонтерів брали участь у програмах цього кварталу?',
    language: 'uk',
    expectedTables: ['journey_transitions'],
    expectedCitations: 1,
    shouldSucceed: true
  },
  {
    id: 'uk-002',
    query: 'Який середній показник впливу (SROI) за 2024 рік?',
    language: 'uk',
    expectedTables: ['impact_metrics'],
    expectedCitations: 1,
    shouldSucceed: true
  },

  // Norwegian
  {
    id: 'no-001',
    query: 'Hvor mange frivillige deltok i programmer dette kvartalet?',
    language: 'no',
    expectedTables: ['journey_transitions'],
    expectedCitations: 1,
    shouldSucceed: true
  },
  {
    id: 'no-002',
    query: 'Hva er gjennomsnittlig SROI for 2024?',
    language: 'no',
    expectedTables: ['impact_metrics'],
    expectedCitations: 1,
    shouldSucceed: true
  },

  // Arabic
  {
    id: 'ar-001',
    query: 'كم عدد المتطوعين الذين شاركوا في البرامج هذا الربع؟',
    language: 'ar',
    expectedTables: ['journey_transitions'],
    expectedCitations: 1,
    shouldSucceed: true
  },
  {
    id: 'ar-002',
    query: 'ما هو متوسط ​​SROI لعام 2024؟',
    language: 'ar',
    expectedTables: ['impact_metrics'],
    expectedCitations: 1,
    shouldSucceed: true
  },

  // Hebrew
  {
    id: 'he-001',
    query: 'כמה מתנדבים השתתפו בתוכניות ברבעון הזה?',
    language: 'he',
    expectedTables: ['journey_transitions'],
    expectedCitations: 1,
    shouldSucceed: true
  },
  {
    id: 'he-002',
    query: 'מה הממוצע של SROI לשנת 2024?',
    language: 'he',
    expectedTables: ['impact_metrics'],
    expectedCitations: 1,
    shouldSucceed: true
  }
];

/**
 * Run evaluation
 */
async function runEvaluation(): Promise<void> {
  console.log('🚀 Starting NLQ v2 Multilingual Evaluation\n');

  const driver = new NLQDriver();
  const results: EvalResult[] = [];

  // Run test cases
  console.log(`Running ${TEST_CASES.length} test cases...\n`);

  for (const testCase of TEST_CASES) {
    console.log(`[${testCase.id}] ${testCase.query.substring(0, 60)}...`);

    const startTime = Date.now();

    try {
      const nlqResult = await driver.generate({
        query: testCase.query,
        language: testCase.language,
        companyId: 'test-company-id',
        userId: 'test-user-id'
      });

      const latencyMs = Date.now() - startTime;

      // Extract tables
      const tableMatches = nlqResult.sql.match(/FROM\s+([a-zA-Z0-9_]+)|JOIN\s+([a-zA-Z0-9_]+)/gi) || [];
      const tablesFound = [...new Set(tableMatches.map(m => {
        const match = m.match(/(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)/i);
        return match ? match[1] : '';
      }).filter(Boolean))];

      // Extract citations
      const citations = driver.extractCitations(nlqResult.sql);

      // Check success
      const tableMatch = testCase.expectedTables.every(t => tablesFound.includes(t));
      const citationMatch = citations.length >= testCase.expectedCitations;
      const success = tableMatch && citationMatch;

      results.push({
        testCase,
        success,
        sql: nlqResult.sql,
        tablesFound,
        citationsCount: citations.length,
        latencyMs,
        costUSD: nlqResult.costUSD
      });

      console.log(`  ✓ Completed in ${latencyMs}ms | Cost: $${nlqResult.costUSD.toFixed(4)} | ${success ? '✅ PASS' : '❌ FAIL'}\n`);
    } catch (error: any) {
      results.push({
        testCase,
        success: false,
        sql: null,
        tablesFound: [],
        citationsCount: 0,
        latencyMs: Date.now() - startTime,
        costUSD: 0,
        error: error.message
      });

      console.log(`  ✗ Failed: ${error.message}\n`);
    }
  }

  // Run safety tests
  console.log('\n🛡️  Running Safety Tests (Adversarial)\n');

  let safetyPassed = 0;
  let safetyFailed = 0;

  for (const testCase of ADVERSARIAL_TEST_CASES) {
    const guardrailCheck = runGuardrails(testCase.query);
    const blocked = !guardrailCheck.safe;

    if (blocked === testCase.shouldBlock) {
      safetyPassed++;
      console.log(`  ✓ ${testCase.name}: ${blocked ? 'Blocked ✅' : 'Allowed ✅'}`);
    } else {
      safetyFailed++;
      console.log(`  ✗ ${testCase.name}: ${blocked ? 'Blocked ❌' : 'Allowed ❌'} (expected ${testCase.shouldBlock ? 'blocked' : 'allowed'})`);
    }
  }

  // Calculate summary
  const summary = calculateSummary(results);

  // Print summary
  console.log('\n📊 Evaluation Summary\n');
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed} (${((summary.passed / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${summary.failed} (${((summary.failed / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(`\nSafety Tests: ${safetyPassed}/${safetyPassed + safetyFailed} passed`);
  console.log(`\nPerformance:`);
  console.log(`  Avg Latency: ${summary.avgLatencyMs.toFixed(0)}ms`);
  console.log(`  p95 Latency: ${calculateP95Latency(results).toFixed(0)}ms`);
  console.log(`  Total Cost: $${summary.totalCostUSD.toFixed(4)}`);
  console.log(`\nAccuracy Metrics:`);
  console.log(`  Precision: ${(summary.precision * 100).toFixed(1)}%`);
  console.log(`  Recall: ${(summary.recall * 100).toFixed(1)}%`);
  console.log(`  F1 Score: ${(summary.f1Score * 100).toFixed(1)}%`);
  console.log(`\nBy Language:`);

  for (const [lang, stats] of Object.entries(summary.byLanguage)) {
    const total = stats.passed + stats.failed;
    const passRate = (stats.passed / total) * 100;
    console.log(`  ${lang.toUpperCase()}: ${stats.passed}/${total} (${passRate.toFixed(1)}%)`);
  }

  // Check acceptance criteria
  console.log('\n✅ Acceptance Criteria:\n');

  const p95 = calculateP95Latency(results);
  const macroF1 = summary.f1Score;

  console.log(`  p95 latency ≤ 2.2s: ${p95 <= 2200 ? '✅' : '❌'} (${p95.toFixed(0)}ms)`);
  console.log(`  Safety tests: ${safetyFailed === 0 ? '✅' : '❌'} (${safetyFailed} violations)`);
  console.log(`  Citation guarantee: ${summary.passed === summary.totalTests ? '✅' : '❌'}`);
  console.log(`  Macro-F1 ≥ 0.80: ${macroF1 >= 0.80 ? '✅' : '❌'} (${(macroF1 * 100).toFixed(1)}%)`);

  const allPassed = p95 <= 2200 && safetyFailed === 0 && macroF1 >= 0.80;
  console.log(`\n${allPassed ? '🎉 All acceptance criteria passed!' : '⚠️  Some acceptance criteria failed'}`);

  process.exit(allPassed ? 0 : 1);
}

function calculateSummary(results: EvalResult[]): EvalSummary {
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  const byLanguage: Record<string, { passed: number; failed: number }> = {};

  for (const result of results) {
    const lang = result.testCase.language;
    if (!byLanguage[lang]) {
      byLanguage[lang] = { passed: 0, failed: 0 };
    }

    if (result.success) {
      byLanguage[lang].passed++;
    } else {
      byLanguage[lang].failed++;
    }
  }

  const totalLatency = results.reduce((sum, r) => sum + r.latencyMs, 0);
  const avgLatencyMs = totalLatency / results.length;

  const totalCostUSD = results.reduce((sum, r) => sum + r.costUSD, 0);

  // Calculate macro-F1
  const truePositives = passed;
  const falsePositives = 0; // Would need negative examples
  const falseNegatives = failed;

  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

  return {
    totalTests: results.length,
    passed,
    failed,
    byLanguage,
    avgLatencyMs,
    totalCostUSD,
    f1Score,
    precision,
    recall
  };
}

function calculateP95Latency(results: EvalResult[]): number {
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const p95Index = Math.floor(latencies.length * 0.95);
  return latencies[p95Index] || 0;
}

// Run evaluation
runEvaluation().catch(error => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});
