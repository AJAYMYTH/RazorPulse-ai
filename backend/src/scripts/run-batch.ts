import { db } from '../db/index.js';
import { seedDatabase } from '../db/seed.js';
import { pipelineService } from '../services/pipeline.service.js';
import { auditService } from '../services/audit.service.js';

async function main() {
  console.log('===============================================================');
  console.log('🏁 Razorpay Buildathon 2026: Batch Pipeline Execution');
  console.log('===============================================================');

  // Ensure fresh seed
  await db.clearAll();
  await seedDatabase();

  const results = await pipelineService.processBatch();

  const summary = await auditService.getBatchSummary();

  console.log('\n===============================================================');
  console.log('📊 BATCH SUMMARY RESULTS');
  console.log('===============================================================');
  console.log(`Total Orders Processed:     ${summary.total_orders}`);
  console.log(`Offers Made (by LLM):       ${summary.offers_made}`);
  console.log(`Gate Accepted:              ${summary.offers_accepted}`);
  console.log(`Gate Safely Rejected:       ${summary.offers_rejected}`);
  console.log(`Failures Handled Gracefully:${summary.failures_handled}`);
  console.log('\nRejection Reason Breakdown:');
  for (const [reason, count] of Object.entries(summary.rejection_reasons)) {
    console.log(`  • ${count}x: "${reason}"`);
  }
  console.log('===============================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Batch run failed:', err);
  process.exit(1);
});
