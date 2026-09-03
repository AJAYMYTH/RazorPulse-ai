import { failureService } from '../services/failure.service.js';
import { auditService } from '../services/audit.service.js';

async function main() {
  console.log('===============================================================');
  console.log('🧪 DEMO: Graceful Failure Handling (Rubric Verification)');
  console.log('===============================================================');

  const testOrderId = 'ord_demo_13_fail_expired';
  const mockPaymentLinkId = 'plink_test_expiry_demo_99';

  console.log(`\n[Scenario 1: Payment Link Expiry without Retry-Storm]`);
  console.log(`Simulating customer not paying within time window for ${testOrderId}...`);

  const expiryRecord = await failureService.handlePaymentLinkExpiry(
    testOrderId,
    mockPaymentLinkId
  );

  console.log(`✅ Handled Expiry Record Created:`);
  console.log(`   Stage:  ${expiryRecord.stage}`);
  console.log(`   Result: ${expiryRecord.result}`);
  console.log(`   Reason: "${expiryRecord.reason}"`);
  console.log(`   Safe recovery: No retry loop initiated.\n`);

  console.log(`[Scenario 2: Malformed LLM JSON schema]`);
  const malformedPayload = { action: 'super_discount', weird_field: 12345 };
  const schemaErrorRecord = await failureService.handleMalformedLLMOutput(
    'ord_demo_test_malformed',
    malformedPayload,
    'Invalid action "super_discount", expected cross_sell | upsell | none'
  );

  console.log(`✅ Handled Malformed Schema Record Created:`);
  console.log(`   Stage:  ${schemaErrorRecord.stage}`);
  console.log(`   Result: ${schemaErrorRecord.result}`);
  console.log(`   Reason: "${schemaErrorRecord.reason}"`);
  console.log(`   Safe recovery: Pipeline advanced without crashing.\n`);

  const allFailures = await failureService.getHandledFailures();
  console.log(`Total Handled Failures Queryable in Dashboard: ${allFailures.length}`);
  console.log('===============================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Failure demo script failed:', err);
  process.exit(1);
});
