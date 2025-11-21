/**
 * Evidence Ledger Example Usage
 *
 * This file demonstrates how to use the Evidence Ledger in practice.
 * Run with: pnpm tsx services/reporting/src/evidence/example.ts
 */

import { createEvidenceLedger } from './ledger';

async function main() {
  // Initialize ledger from environment variables
  const ledger = createEvidenceLedger();

  const reportId = 'example-report-001';
  const userId = 'user-123';

  console.log('=== Evidence Ledger Example ===\n');

  // Step 1: Add initial citations
  console.log('Step 1: Adding initial citations...');

  const entry1 = await ledger.append({
    reportId,
    citationId: 'citation-001',
    action: 'ADDED',
    citationText: 'Volunteers reported 85% satisfaction with the buddy matching system',
    editor: 'system',
    metadata: {
      reason: 'Initial report generation',
      requestId: 'req-001',
    },
  });

  console.log(`✓ Added citation 1: ${entry1.id}`);
  console.log(`  Content Hash: ${entry1.contentHash}`);
  console.log(`  Previous Hash: ${entry1.previousHash || 'null (first entry)'}`);
  console.log(`  Signature: ${entry1.signature.substring(0, 16)}...`);

  const entry2 = await ledger.append({
    reportId,
    citationId: 'citation-002',
    action: 'ADDED',
    citationText: 'Employee engagement increased by 23% after participation in volunteer programs',
    editor: 'system',
    metadata: {
      reason: 'Initial report generation',
      requestId: 'req-001',
    },
  });

  console.log(`✓ Added citation 2: ${entry2.id}`);
  console.log(`  Previous Hash: ${entry2.previousHash?.substring(0, 16)}... (links to entry 1)\n`);

  // Step 2: Modify a citation
  console.log('Step 2: Modifying a citation...');

  const entry3 = await ledger.append({
    reportId,
    citationId: 'citation-001',
    action: 'MODIFIED',
    citationText: 'Volunteers reported 87% satisfaction with the buddy matching system (updated)',
    editor: userId,
    metadata: {
      reason: 'User corrected satisfaction percentage',
      requestId: 'req-002',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
    },
  });

  console.log(`✓ Modified citation 1: ${entry3.id}`);
  console.log(`  Previous Hash: ${entry3.previousHash?.substring(0, 16)}... (links to entry 2)\n`);

  // Step 3: Remove a citation
  console.log('Step 3: Removing a citation...');

  const entry4 = await ledger.append({
    reportId,
    citationId: 'citation-002',
    action: 'REMOVED',
    citationText: '', // Empty for removed citations
    editor: userId,
    metadata: {
      reason: 'Citation no longer relevant after data update',
      requestId: 'req-003',
    },
  });

  console.log(`✓ Removed citation 2: ${entry4.id}\n`);

  // Step 4: Retrieve all entries
  console.log('Step 4: Retrieving all entries...');

  const entries = await ledger.getEntries(reportId);
  console.log(`Found ${entries.length} ledger entries:\n`);

  entries.forEach((entry, index) => {
    console.log(`Entry ${index + 1}:`);
    console.log(`  ID: ${entry.id}`);
    console.log(`  Action: ${entry.action}`);
    console.log(`  Citation: ${entry.citationId}`);
    console.log(`  Editor: ${entry.editor}`);
    console.log(`  Timestamp: ${entry.timestamp.toISOString()}`);
    console.log(`  Reason: ${entry.metadata?.reason || 'N/A'}`);
    console.log();
  });

  // Step 5: Verify integrity
  console.log('Step 5: Verifying ledger integrity...');

  const verification = await ledger.verifyIntegrity(reportId);

  if (verification.valid) {
    console.log(`✓ Ledger is valid!`);
    console.log(`  Total entries: ${verification.totalEntries}`);
    console.log(`  Verified entries: ${verification.verifiedEntries}`);
    console.log(`  First entry: ${verification.firstEntry?.id}`);
    console.log(`  Last entry: ${verification.lastEntry?.id}`);
  } else {
    console.log(`✗ Ledger integrity compromised!`);
    console.log(`  Errors: ${verification.errors.length}`);
    verification.errors.forEach(error => console.log(`    - ${error}`));
  }

  console.log();

  // Step 6: Detect tampering
  console.log('Step 6: Checking for tampering...');

  const tamperLogs = await ledger.detectTampering(reportId);

  if (tamperLogs.length === 0) {
    console.log('✓ No tampering detected\n');
  } else {
    console.log(`⚠ Tampering detected: ${tamperLogs.length} issues`);
    tamperLogs.forEach(log => {
      console.log(`  Entry ${log.entryId}:`);
      console.log(`    Type: ${log.tamperType}`);
      console.log(`    Details: ${log.details}`);
    });
    console.log();
  }

  console.log('=== Example Complete ===');
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✓ Example completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Example failed:', error);
      process.exit(1);
    });
}

export { main };
