import { db } from '../db/index.js';
import { Order, Customer, CatalogItem } from '../types/index.js';
import { auditService } from './audit.service.js';

export interface SignalBundle {
  order: Order;
  customer: Customer | null;
  purchasedSkus: string[];
  candidateItems: CatalogItem[];
  coPurchaseAffinityMatches: string[];
}

export class SignalService {
  /**
   * Pulls relevant catalog items, affinities, and customer history.
   */
  async gatherSignals(order: Order): Promise<SignalBundle> {
    const customer = await db.getCustomer(order.customer_id);
    const fullCatalog = await db.getCatalog(order.merchant_id);

    const purchasedSkus = order.items.map((i) => i.sku);

    // Find items not yet purchased
    const candidateItems = fullCatalog.filter(
      (item) => !purchasedSkus.includes(item.sku)
    );

    // Extract tags from purchased catalog items to match affinities
    const purchasedCatalogItems = fullCatalog.filter((item) =>
      purchasedSkus.includes(item.sku)
    );

    const purchasedTags = new Set<string>();
    for (const item of purchasedCatalogItems) {
      for (const tag of item.co_purchase_tags || []) {
        purchasedTags.add(tag.toLowerCase());
      }
    }

    // Identify candidate items that share co-purchase affinity tags
    const affinityMatches: string[] = [];
    for (const candidate of candidateItems) {
      const match = (candidate.co_purchase_tags || []).some(
        (t) =>
          purchasedTags.has(t.toLowerCase()) ||
          purchasedTags.has(candidate.category.toLowerCase())
      );
      if (match) {
        affinityMatches.push(candidate.sku);
      }
    }

    const payload = {
      order_id: order.id,
      customer_tier: customer && customer.order_count > 2 ? 'repeat' : 'new',
      customer_orders_count: customer ? customer.order_count : 1,
      purchased_skus: purchasedSkus,
      candidate_count: candidateItems.length,
      affinity_matches: affinityMatches,
    };

    const reason = `Gathered signals: ${customer ? customer.name : 'Guest'} (${payload.customer_tier}), ${affinityMatches.length} catalog affinity match(es)`;
    await auditService.log(order.id, 'signal', payload, 'success', reason);

    return {
      order,
      customer,
      purchasedSkus,
      candidateItems,
      coPurchaseAffinityMatches: affinityMatches,
    };
  }
}

export const signalService = new SignalService();
