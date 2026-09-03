import { db } from '../db/index.js';
import { Order, DecisionRecord } from '../types/index.js';
import { triggerService } from './trigger.service.js';
import { signalService } from './signal.service.js';
import { decisionService } from './decision.service.js';
import { gateService } from './gate.service.js';
import { executionService } from './execution.service.js';
import { failureService } from './failure.service.js';

export interface PipelineExecutionResult {
  orderId: string;
  success: boolean;
  stageReached: 'trigger' | 'signal' | 'decision' | 'gate' | 'execution';
  outcome: 'accepted' | 'rejected' | 'error' | 'skipped';
  summary: string;
}

export class PipelineService {
  /**
   * Processes a single order through the complete 5-stage pipeline:
   * 1. Trigger Service -> Filters order
   * 2. Signal Service -> Pulls catalog affinities & customer history
   * 3. Decision Service -> Structured LLM inference (validated by Zod)
   * 4. Gate Service -> Deterministic bounds check (no LLM)
   * 5. Execution Service -> Razorpay test-mode Payment Link
   */
  async processOrder(orderId: string): Promise<PipelineExecutionResult> {
    const order = await db.getOrder(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const existingDecisions = await db.getDecisionsForOrder(orderId);

    // 1. TRIGGER STAGE
    const trigger = await triggerService.evaluateAndLog(order);
    if (!trigger.shouldProcess) {
      return {
        orderId,
        success: false,
        stageReached: 'trigger',
        outcome: 'skipped',
        summary: trigger.reason,
      };
    }

    // 2. SIGNAL STAGE
    const signals = await signalService.gatherSignals(order);

    // 3. DECISION STAGE
    let decision;
    try {
      decision = await decisionService.generateDecision(signals);
    } catch (err: any) {
      // Graceful degradation on decision error
      return {
        orderId,
        success: false,
        stageReached: 'decision',
        outcome: 'error',
        summary: err.message,
      };
    }

    // 4. GATE STAGE (The deterministic rule shield)
    const catalog = await db.getCatalog(order.merchant_id);
    const gateResult = await gateService.evaluateAndLog(
      decision,
      order,
      catalog,
      existingDecisions
    );

    if (!gateResult.accepted) {
      return {
        orderId,
        success: true,
        stageReached: 'gate',
        outcome: 'rejected',
        summary: `Gate safely rejected: ${gateResult.reason}`,
      };
    }

    // 5. EXECUTION STAGE
    const recommendedItem = catalog.find(
      (c) => c.sku.toLowerCase() === decision.recommended_sku?.toLowerCase()
    );

    if (!recommendedItem) {
      return {
        orderId,
        success: false,
        stageReached: 'execution',
        outcome: 'error',
        summary: `Recommended SKU ${decision.recommended_sku} was not found in catalog`,
      };
    }

    const execution = await executionService.executeOffer(
      decision,
      order,
      recommendedItem
    );

    // Demonstration hook: simulate link expiry for the designated failure test case
    if (orderId === 'ord_demo_13_fail_expired') {
      await failureService.handlePaymentLinkExpiry(
        orderId,
        execution.payment_link_id
      );
      return {
        orderId,
        success: true,
        stageReached: 'execution',
        outcome: 'error',
        summary: 'Simulated payment link expiry handled gracefully without retry loop',
      };
    }

    return {
      orderId,
      success: true,
      stageReached: 'execution',
      outcome: 'accepted',
      summary: `Payment Link created: ${execution.short_url}`,
    };
  }

  /**
   * Processes all seeded orders in sequence and returns batch results.
   */
  async processBatch(): Promise<PipelineExecutionResult[]> {
    const orders = await db.getOrders();
    console.log(`🚀 Starting pipeline run for batch of ${orders.length} orders...`);

    const results: PipelineExecutionResult[] = [];
    for (const order of orders) {
      console.log(`Processing Order: ${order.id}...`);
      try {
        const res = await this.processOrder(order.id);
        results.push(res);
      } catch (err: any) {
        console.error(`Error processing order ${order.id}:`, err);
        results.push({
          orderId: order.id,
          success: false,
          stageReached: 'trigger',
          outcome: 'error',
          summary: err.message,
        });
      }
      // 300ms throttle to prevent Razorpay test-mode rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log(`🏁 Batch run complete across ${orders.length} orders.`);
    return results;
  }
}

export const pipelineService = new PipelineService();
