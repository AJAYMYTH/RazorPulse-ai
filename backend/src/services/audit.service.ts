import { db } from '../db/index.js';
import {
  DecisionRecord,
  StageType,
  ResultType,
  BatchSummaryStats,
} from '../types/index.js';

export class AuditService {
  /**
   * Append-only audit logger.
   * Every money-related evaluation, gate check, or execution outcome is logged immutably.
   */
  async log(
    orderId: string,
    stage: StageType,
    payload: Record<string, any>,
    result: ResultType,
    reason: string
  ): Promise<DecisionRecord> {
    return await db.appendDecision({
      order_id: orderId,
      stage,
      payload,
      result,
      reason,
    });
  }

  /**
   * Retrieves the full chronological decision trail for an order.
   * Feeds the 5-stage timeline in the dashboard.
   */
  async getOrderTrail(orderId: string): Promise<DecisionRecord[]> {
    return await db.getDecisionsForOrder(orderId);
  }

  /**
   * Calculates aggregate metrics across all processed orders for the Batch Summary screen.
   */
  async getBatchSummary(): Promise<BatchSummaryStats> {
    const decisions = await db.getAllDecisions();
    const orders = await db.getOrders();

    const decisionStageRecords = decisions.filter((d) => d.stage === 'decision');
    const gateAcceptedRecords = decisions.filter(
      (d) => d.stage === 'gate' && d.result === 'accepted'
    );
    const gateRejectedRecords = decisions.filter(
      (d) => d.stage === 'gate' && d.result === 'rejected'
    );
    const executionErrors = decisions.filter(
      (d) => d.stage === 'execution' && d.result === 'error'
    );

    // Break down rejection reasons for the chart
    const rejectionReasons: Record<string, number> = {};
    for (const r of gateRejectedRecords) {
      const reasonKey = r.reason || 'Unknown bound violation';
      rejectionReasons[reasonKey] = (rejectionReasons[reasonKey] || 0) + 1;
    }

    const offersMade = decisionStageRecords.filter(
      (d) => d.payload?.action && d.payload.action !== 'none'
    ).length;
    const offersAccepted = gateAcceptedRecords.length;
    const offersRejected = gateRejectedRecords.length;
    const failuresHandled = executionErrors.length;

    // Simulated conversion: accepted offers that successfully generated links
    const convertedCount = decisions.filter(
      (d) =>
        d.stage === 'execution' &&
        d.result === 'success' &&
        d.payload?.status === 'paid'
    ).length;

    const simulatedConversionRate =
      offersAccepted > 0 ? Math.round((convertedCount / offersAccepted) * 100) : 0;

    return {
      total_orders: orders.length,
      offers_made: offersMade,
      offers_accepted: offersAccepted,
      offers_rejected: offersRejected,
      failures_handled: failuresHandled,
      simulated_conversion_rate: simulatedConversionRate,
      rejection_reasons: rejectionReasons,
    };
  }
}

export const auditService = new AuditService();
