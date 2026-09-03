import {
  DecisionPayload,
  Order,
  CatalogItem,
  DecisionRecord,
  GateEvaluationResult,
} from '../types/index.js';
import { auditService } from './audit.service.js';

export class GateService {
  /**
   * Pure deterministic rule evaluation. Zero external network or LLM dependencies.
   * Satisfies TRD Section 5:
   * 1. Max discount: discount_pct <= 15
   * 2. One offer per order: no prior accepted decision for order_id
   * 3. Order eligibility: order.status not in ('refunded', 'disputed')
   * 4. Minimum confidence: confidence >= 0.6
   * 5. Valid SKU: recommended_sku exists in merchant's catalog
   */
  evaluate(
    decision: DecisionPayload,
    order: Order,
    catalog: CatalogItem[],
    existingDecisions: DecisionRecord[] = []
  ): GateEvaluationResult {
    // 0. Action 'none' check
    if (decision.action === 'none' || !decision.recommended_sku) {
      return {
        accepted: false,
        ruleViolated: 'action_none',
        reason: "Decision action is 'none' — model concluded no high-confidence offer warranted",
      };
    }

    // 1. Rule 3: Order Eligibility (check order state first)
    if (order.status === 'refunded' || order.status === 'disputed') {
      return {
        accepted: false,
        ruleViolated: 'order_ineligible',
        reason: `Order status ineligible: ${order.status}`,
      };
    }

    // 2. Rule 2: One Offer Per Order (Idempotency & margin guard)
    const hasPriorAccepted = existingDecisions.some(
      (d) =>
        d.order_id === order.id &&
        d.stage === 'gate' &&
        d.result === 'accepted'
    );
    if (hasPriorAccepted) {
      return {
        accepted: false,
        ruleViolated: 'one_offer_per_order',
        reason: 'Order already has an active accepted offer',
      };
    }

    // 3. Rule 1: Max Discount Cap (15% limit)
    if (decision.discount_pct > 15) {
      return {
        accepted: false,
        ruleViolated: 'max_discount_exceeded',
        reason: `Discount exceeds 15% cap (got ${decision.discount_pct}%)`,
      };
    }

    // 4. Rule 4: Minimum Confidence Threshold (0.60)
    if (decision.confidence < 0.6) {
      return {
        accepted: false,
        ruleViolated: 'low_confidence',
        reason: `Confidence below threshold (${decision.confidence.toFixed(2)} < 0.60)`,
      };
    }

    // 5. Rule 5: Valid SKU existence in merchant catalog
    const skuExists = catalog.some(
      (c) => c.sku.toLowerCase() === decision.recommended_sku?.toLowerCase()
    );
    if (!skuExists) {
      return {
        accepted: false,
        ruleViolated: 'invalid_sku',
        reason: `SKU '${decision.recommended_sku}' not found in merchant catalog`,
      };
    }

    // All bounds satisfied!
    return {
      accepted: true,
      reason: 'All deterministic bounds satisfied (discount <= 15%, conf >= 0.60, valid SKU, eligible order)',
    };
  }

  /**
   * Helper that evaluates and records the result to the append-only audit log.
   */
  async evaluateAndLog(
    decision: DecisionPayload,
    order: Order,
    catalog: CatalogItem[],
    existingDecisions: DecisionRecord[] = []
  ): Promise<GateEvaluationResult> {
    const evalResult = this.evaluate(decision, order, catalog, existingDecisions);

    await auditService.log(
      order.id,
      'gate',
      {
        decision,
        accepted: evalResult.accepted,
        ruleViolated: evalResult.ruleViolated || null,
      },
      evalResult.accepted ? 'accepted' : 'rejected',
      evalResult.reason
    );

    return evalResult;
  }
}

export const gateService = new GateService();
