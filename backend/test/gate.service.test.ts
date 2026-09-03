import { describe, it, expect } from 'vitest';
import { GateService } from '../src/services/gate.service.js';
import {
  DecisionPayload,
  Order,
  CatalogItem,
  DecisionRecord,
} from '../src/types/index.js';

describe('GateService — Deterministic Bounds Enforcement', () => {
  const gateService = new GateService();

  const mockCatalog: CatalogItem[] = [
    {
      id: 'cat_1',
      merchant_id: 'mch_1',
      sku: 'SKU-WR-WOOD',
      name: 'Walnut Wrist Rest',
      price: 1499,
      category: 'Accessories',
      co_purchase_tags: ['keyboard'],
    },
    {
      id: 'cat_2',
      merchant_id: 'mch_1',
      sku: 'SKU-HUB-8IN1',
      name: 'USB-C Hub',
      price: 3499,
      category: 'Accessories',
      co_purchase_tags: ['laptop'],
    },
  ];

  const mockOrder: Order = {
    id: 'ord_test_100',
    merchant_id: 'mch_1',
    customer_id: 'cust_1',
    items: [{ sku: 'SKU-KB-PRO', quantity: 1, price: 8499 }],
    total_amount: 8499,
    status: 'paid',
    created_at: new Date().toISOString(),
  };

  it('Rule 1: Rejects decision when discount exceeds 15% cap', () => {
    const decision: DecisionPayload = {
      action: 'cross_sell',
      recommended_sku: 'SKU-WR-WOOD',
      reason: 'Special holiday promotional offer with high discount',
      discount_pct: 20, // Exceeds 15%
      confidence: 0.9,
    };

    const result = gateService.evaluate(decision, mockOrder, mockCatalog, []);

    expect(result.accepted).toBe(false);
    expect(result.ruleViolated).toBe('max_discount_exceeded');
    expect(result.reason).toContain('Discount exceeds 15% cap');
  });

  it('Rule 1: Accepts decision when discount is within 15% cap (e.g. 10%)', () => {
    const decision: DecisionPayload = {
      action: 'cross_sell',
      recommended_sku: 'SKU-WR-WOOD',
      reason: 'Valid complementary accessory cross-sell',
      discount_pct: 10,
      confidence: 0.85,
    };

    const result = gateService.evaluate(decision, mockOrder, mockCatalog, []);

    expect(result.accepted).toBe(true);
    expect(result.ruleViolated).toBeUndefined();
    expect(result.reason).toContain('All deterministic bounds satisfied');
  });

  it('Rule 2: Rejects duplicate offer when order already has an accepted decision', () => {
    const decision: DecisionPayload = {
      action: 'cross_sell',
      recommended_sku: 'SKU-WR-WOOD',
      reason: 'Second offer attempt on same order',
      discount_pct: 10,
      confidence: 0.85,
    };

    const priorDecisions: DecisionRecord[] = [
      {
        id: 'dec_prior',
        order_id: mockOrder.id,
        stage: 'gate',
        result: 'accepted',
        reason: 'Prior offer accepted',
        payload: {},
        created_at: new Date().toISOString(),
      },
    ];

    const result = gateService.evaluate(decision, mockOrder, mockCatalog, priorDecisions);

    expect(result.accepted).toBe(false);
    expect(result.ruleViolated).toBe('one_offer_per_order');
    expect(result.reason).toContain('Order already has an active accepted offer');
  });

  it('Rule 3: Rejects when order status is refunded', () => {
    const refundedOrder: Order = { ...mockOrder, status: 'refunded' };
    const decision: DecisionPayload = {
      action: 'cross_sell',
      recommended_sku: 'SKU-WR-WOOD',
      reason: 'Attempted offer on refunded order',
      discount_pct: 10,
      confidence: 0.85,
    };

    const result = gateService.evaluate(decision, refundedOrder, mockCatalog, []);

    expect(result.accepted).toBe(false);
    expect(result.ruleViolated).toBe('order_ineligible');
    expect(result.reason).toContain('Order status ineligible: refunded');
  });

  it('Rule 3: Rejects when order status is disputed', () => {
    const disputedOrder: Order = { ...mockOrder, status: 'disputed' };
    const decision: DecisionPayload = {
      action: 'cross_sell',
      recommended_sku: 'SKU-WR-WOOD',
      reason: 'Attempted offer on disputed order',
      discount_pct: 10,
      confidence: 0.85,
    };

    const result = gateService.evaluate(decision, disputedOrder, mockCatalog, []);

    expect(result.accepted).toBe(false);
    expect(result.ruleViolated).toBe('order_ineligible');
    expect(result.reason).toContain('Order status ineligible: disputed');
  });

  it('Rule 4: Rejects decision when confidence is below 0.60', () => {
    const decision: DecisionPayload = {
      action: 'cross_sell',
      recommended_sku: 'SKU-WR-WOOD',
      reason: 'Uncertain recommendation with low affinity',
      discount_pct: 10,
      confidence: 0.45, // Below 0.60
    };

    const result = gateService.evaluate(decision, mockOrder, mockCatalog, []);

    expect(result.accepted).toBe(false);
    expect(result.ruleViolated).toBe('low_confidence');
    expect(result.reason).toContain('Confidence below threshold');
  });

  it('Rule 5: Rejects decision when SKU is not found in merchant catalog', () => {
    const decision: DecisionPayload = {
      action: 'cross_sell',
      recommended_sku: 'SKU-NON-EXISTENT-999',
      reason: 'Hallucinated or out-of-catalog item recommendation',
      discount_pct: 10,
      confidence: 0.85,
    };

    const result = gateService.evaluate(decision, mockOrder, mockCatalog, []);

    expect(result.accepted).toBe(false);
    expect(result.ruleViolated).toBe('invalid_sku');
    expect(result.reason).toContain('not found in merchant catalog');
  });

  it('Rule 0: Gracefully handles action "none" without error', () => {
    const decision: DecisionPayload = {
      action: 'none',
      recommended_sku: null,
      reason: 'Customer has comprehensive setup; no upsell needed',
      discount_pct: 0,
      confidence: 0.95,
    };

    const result = gateService.evaluate(decision, mockOrder, mockCatalog, []);

    expect(result.accepted).toBe(false);
    expect(result.ruleViolated).toBe('action_none');
  });
});
