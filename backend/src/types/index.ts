import { z } from 'zod';

export interface Merchant {
  id: string;
  name: string;
  created_at: string;
}

export interface CatalogItem {
  id: string;
  merchant_id: string;
  sku: string;
  name: string;
  price: number;
  category: string;
  co_purchase_tags: string[];
}

export interface Customer {
  id: string;
  merchant_id: string;
  name: string;
  order_count: number;
}

export interface OrderItem {
  sku: string;
  name?: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'created' | 'paid' | 'refunded' | 'disputed';

export interface Order {
  id: string;
  merchant_id: string;
  customer_id: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  created_at: string;
}

export type StageType = 'trigger' | 'signal' | 'decision' | 'gate' | 'execution';
export type ResultType = 'accepted' | 'rejected' | 'error' | 'success';

export interface DecisionRecord {
  id: string;
  order_id: string;
  stage: StageType;
  payload: Record<string, any>;
  result: ResultType;
  reason: string;
  created_at: string;
}

// Zod Schema per TRD Section 4
export const DecisionSchema = z.object({
  action: z.enum(['cross_sell', 'upsell', 'none']),
  recommended_sku: z.string().nullable(),
  reason: z.string().min(10),
  discount_pct: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
});

export type DecisionPayload = z.infer<typeof DecisionSchema>;

export interface GateEvaluationResult {
  accepted: boolean;
  ruleViolated?: string;
  reason: string;
}

export interface ExecutionResult {
  payment_link_id: string;
  short_url: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'expired';
  reference_id: string;
}

export interface BatchSummaryStats {
  total_orders: number;
  offers_made: number;
  offers_accepted: number;
  offers_rejected: number;
  failures_handled: number;
  simulated_conversion_rate: number;
  rejection_reasons: Record<string, number>;
}
