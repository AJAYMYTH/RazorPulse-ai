import fs from 'fs';
import path from 'path';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const STORE_PATH = path.resolve(process.cwd(), '../backend/data/store.json');

function getLocalStoreFallback() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to read local store.json:', e);
  }
  return { merchants: [], catalog: [], customers: [], orders: [], decisions: [] };
}

export async function fetchBatchSummary() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/batch/summary`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return await res.json();
  } catch (_) {
    // fallback to local compute
  }

  const store = getLocalStoreFallback();
  const decisions = store.decisions || [];
  const orders = store.orders || [];

  const decisionStage = decisions.filter((d: any) => d.stage === 'decision');
  const gateAccepted = decisions.filter((d: any) => d.stage === 'gate' && d.result === 'accepted');
  const gateRejected = decisions.filter((d: any) => d.stage === 'gate' && d.result === 'rejected');
  const executionErrors = decisions.filter((d: any) => d.stage === 'execution' && d.result === 'error');

  const rejectionReasons: Record<string, number> = {};
  for (const r of gateRejected) {
    const key = r.reason || 'Unknown bound violation';
    rejectionReasons[key] = (rejectionReasons[key] || 0) + 1;
  }

  const offersMade = decisionStage.filter((d: any) => d.payload?.action && d.payload.action !== 'none').length;
  const offersAccepted = gateAccepted.length;

  return {
    total_orders: orders.length,
    offers_made: offersMade,
    offers_accepted: offersAccepted,
    offers_rejected: gateRejected.length,
    failures_handled: executionErrors.length,
    simulated_conversion_rate: 67, // Illustrative simulated metric for demo
    rejection_reasons: rejectionReasons,
  };
}

export async function fetchOrders() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return await res.json();
  } catch (_) {
    // fallback
  }

  const store = getLocalStoreFallback();
  const orders = store.orders || [];
  const customers = store.customers || [];
  const decisions = store.decisions || [];

  return orders.map((order: any) => {
    const customer = customers.find((c: any) => c.id === order.customer_id);
    const orderDecisions = decisions.filter((d: any) => d.order_id === order.id);

    const decisionStage = orderDecisions.find((d: any) => d.stage === 'decision');
    const gateStage = orderDecisions.find((d: any) => d.stage === 'gate');
    const executionStage = orderDecisions.find((d: any) => d.stage === 'execution');

    return {
      id: order.id,
      customer_name: customer?.name || 'Guest',
      customer_order_count: customer?.order_count || 1,
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at,
      action: decisionStage?.payload?.action || 'none',
      recommended_sku: decisionStage?.payload?.recommended_sku || null,
      discount_pct: decisionStage?.payload?.discount_pct ?? null,
      gate_result: gateStage?.result || 'pending',
      gate_reason: gateStage?.reason || null,
      execution_status: executionStage?.payload?.status || (executionStage?.result === 'error' ? 'failed' : 'none'),
      payment_link_url: executionStage?.payload?.short_url || null,
    };
  });
}

export async function fetchOrderTrail(orderId: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${orderId}/trail`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return await res.json();
  } catch (_) {
    // fallback
  }

  const store = getLocalStoreFallback();
  const order = (store.orders || []).find((o: any) => o.id === orderId);
  const customer = (store.customers || []).find((c: any) => c.id === order?.customer_id);
  const trail = (store.decisions || []).filter((d: any) => d.order_id === orderId);

  return {
    order: order || null,
    customer: customer || null,
    trail: trail.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  };
}

export async function fetchFailures() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/failures`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return await res.json();
  } catch (_) {
    // fallback
  }

  const store = getLocalStoreFallback();
  return (store.decisions || []).filter((d: any) => d.result === 'error');
}
