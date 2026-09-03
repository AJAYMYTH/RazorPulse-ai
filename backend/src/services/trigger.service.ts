import { Order } from '../types/index.js';
import { auditService } from './audit.service.js';

export interface TriggerEvaluation {
  shouldProcess: boolean;
  reason: string;
}

export class TriggerService {
  /**
   * Filters orders at the threshold (e.g. minimum value, item availability).
   */
  async evaluateAndLog(order: Order): Promise<TriggerEvaluation> {
    if (!order.items || order.items.length === 0) {
      const reason = 'Order has no line items to analyze';
      await auditService.log(order.id, 'trigger', { order_id: order.id, amount: order.total_amount }, 'rejected', reason);
      return { shouldProcess: false, reason };
    }

    const reason = `Order triggered pipeline: ₹${order.total_amount} with ${order.items.length} item(s)`;
    await auditService.log(
      order.id,
      'trigger',
      {
        order_id: order.id,
        amount: order.total_amount,
        items_count: order.items.length,
        status: order.status,
      },
      'success',
      reason
    );

    return { shouldProcess: true, reason };
  }
}

export const triggerService = new TriggerService();
