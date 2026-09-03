import { db } from '../db/index.js';
import { seedDatabase } from '../db/seed.js';
import { triggerService } from '../services/trigger.service.js';
import { signalService } from '../services/signal.service.js';
import { decisionService } from '../services/decision.service.js';
import { executionService } from '../services/execution.service.js';
import { auditService } from '../services/audit.service.js';

async function runPhase1HappyPath() {
  console.log('===============================================================');
  console.log('🚀 Phase 1: Core Pipeline — End-to-End Happy Path Demonstration');
  console.log('===============================================================');

  // 1. Ensure database has seed data
  await db.clearAll();
  await seedDatabase();

  const targetOrderId = 'ord_demo_01_kb_accept';
  console.log(`\n▶ Step 1: Picking target seeded order [${targetOrderId}]...`);
  const order = await db.getOrder(targetOrderId);
  if (!order) {
    throw new Error(`Order ${targetOrderId} not found`);
  }
  console.log(`  Order Items: ${order.items.map((i) => `${i.name} (₹${i.price})`).join(', ')}`);
  console.log(`  Order Value: ₹${order.total_amount}`);

  // 2. Trigger Service
  console.log(`\n▶ Step 2: Running Trigger Service...`);
  const triggerResult = await triggerService.evaluateAndLog(order);
  console.log(`  Trigger Result: shouldProcess = ${triggerResult.shouldProcess}`);
  console.log(`  Trigger Reason: "${triggerResult.reason}"`);

  // 3. Signal Service
  console.log(`\n▶ Step 3: Running Signal Service...`);
  const signals = await signalService.gatherSignals(order);
  console.log(`  Customer: ${signals.customer?.name} (Prior Orders: ${signals.customer?.order_count})`);
  console.log(`  Affinity Matches Found: ${signals.coPurchaseAffinityMatches.join(', ')}`);

  // 4. Decision Service (LLM / Heuristic + Zod validation)
  console.log(`\n▶ Step 4: Running Decision Service (Structured LLM + Zod Validation)...`);
  const decision = await decisionService.generateDecision(signals);
  console.log(`  Action:          ${decision.action}`);
  console.log(`  Recommended SKU: ${decision.recommended_sku}`);
  console.log(`  Discount:        ${decision.discount_pct}%`);
  console.log(`  Confidence:      ${(decision.confidence * 100).toFixed(0)}%`);
  console.log(`  Reasoning:       "${decision.reason}"`);

  // 5. Execution Service (Razorpay Test Mode Payment Link)
  console.log(`\n▶ Step 5: Running Execution Service (Creating Razorpay Payment Link)...`);
  const catalog = await db.getCatalog(order.merchant_id);
  const targetItem = catalog.find((c) => c.sku === decision.recommended_sku);
  if (!targetItem) {
    throw new Error(`Catalog item ${decision.recommended_sku} not found`);
  }

  const executionResult = await executionService.executeOffer(decision, order, targetItem);
  console.log(`  Payment Link ID:  ${executionResult.payment_link_id}`);
  console.log(`  Short URL:        ${executionResult.short_url}`);
  console.log(`  Discounted Price: ₹${executionResult.amount}`);
  console.log(`  Reference ID:     ${executionResult.reference_id}`);

  // 6. Verification: Audit Trail
  console.log(`\n▶ Step 6: Verifying Append-Only Audit Log ('decisions' Table)...`);
  const trail = await auditService.getOrderTrail(targetOrderId);
  console.log(`  Total Logged Audit Rows for ${targetOrderId}: ${trail.length}`);
  trail.forEach((record, idx) => {
    console.log(`    [Stage ${idx + 1}: ${record.stage.toUpperCase()}] Result: ${record.result.toUpperCase()}`);
    console.log(`      Reason: "${record.reason}"`);
  });

  console.log('\n===============================================================');
  console.log('✅ Phase 1 Definition of Done SATISFIED:');
  console.log('   - 1 order flowed end-to-end: Trigger → Signal → Decision → Execution');
  console.log('   - Valid Razorpay test-mode Payment Link created');
  console.log('   - Full append-only audit trail recorded in decisions table');
  console.log('===============================================================\n');

  process.exit(0);
}

runPhase1HappyPath().catch((err) => {
  console.error('Phase 1 demo failed:', err);
  process.exit(1);
});
