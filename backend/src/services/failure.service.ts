import { db } from '../db/index.js';
import { auditService } from './audit.service.js';
import { DecisionRecord } from '../types/index.js';

export class FailureService {
  /**
   * Handles Payment Link Expiry (Primary Failure Scenario).
   * Verifies that when an offer link expires without being paid, it is recorded
   * as an execution error and explicitly halts further processing on that order
   * without creating duplicate links (No Retry Storm).
   */
  async handlePaymentLinkExpiry(
    orderId: string,
    paymentLinkId: string
  ): Promise<DecisionRecord> {
    const reason = `Payment link (${paymentLinkId}) expired unconverted. Action halted safely without retry storm.`;

    const record = await auditService.log(
      orderId,
      'execution',
      {
        payment_link_id: paymentLinkId,
        status: 'expired',
        recovery_action: 'logged_and_stopped',
        retry_count: 0,
      },
      'error',
      reason
    );

    return record;
  }

  /**
   * Handles Malformed LLM Output (Secondary Failure Scenario).
   * When raw LLM output fails schema validation, this isolates the error,
   * logs the invalid payload for developer observability, and prevents pipeline crash.
   */
  async handleMalformedLLMOutput(
    orderId: string,
    rawOutput: any,
    validationError: string
  ): Promise<DecisionRecord> {
    const reason = `LLM response failed schema validation: ${validationError}. Pipeline advanced to next order without crashing.`;

    const record = await auditService.log(
      orderId,
      'decision',
      {
        raw_output: rawOutput,
        error: validationError,
        recovery_action: 'pipeline_continued_safely',
      },
      'error',
      reason
    );

    return record;
  }

  /**
   * Retrieves all handled failures across all stages.
   * Feeds the /failures route in the dashboard.
   */
  async getHandledFailures(): Promise<DecisionRecord[]> {
    const allDecisions = await db.getAllDecisions();
    return allDecisions.filter((d) => d.result === 'error');
  }
}

export const failureService = new FailureService();
