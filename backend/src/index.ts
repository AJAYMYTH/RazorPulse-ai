import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { db } from './db/index.js';
import { seedDatabase } from './db/seed.js';
import { auditService } from './services/audit.service.js';
import { pipelineService } from './services/pipeline.service.js';
import { failureService } from './services/failure.service.js';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    supabaseConnected: db.isSupabaseActive,
    timestamp: new Date().toISOString(),
  });
});

// TRD Section 7: Batch Summary
app.get('/api/batch/summary', async (req, res) => {
  try {
    const summary = await auditService.getBatchSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Orders List
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await db.getOrders();
    const decisions = await db.getAllDecisions();

    // Map enriched order rows for dashboard table
    const enriched = await Promise.all(
      orders.map(async (order) => {
        const customer = await db.getCustomer(order.customer_id);
        const orderDecisions = decisions.filter((d) => d.order_id === order.id);

        const decisionStage = orderDecisions.find((d) => d.stage === 'decision');
        const gateStage = orderDecisions.find((d) => d.stage === 'gate');
        const executionStage = orderDecisions.find((d) => d.stage === 'execution');

        return {
          id: order.id,
          customer_name: customer?.name || 'Guest',
          customer_order_count: customer?.order_count || 1,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          action: decisionStage?.payload?.action || 'pending',
          recommended_sku: decisionStage?.payload?.recommended_sku || null,
          discount_pct: decisionStage?.payload?.discount_pct ?? null,
          gate_result: gateStage?.result || 'pending',
          gate_reason: gateStage?.reason || null,
          execution_status: executionStage?.payload?.status || (executionStage?.result === 'error' ? 'failed' : 'none'),
          payment_link_url: executionStage?.payload?.short_url || null,
        };
      })
    );

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// TRD Section 7: Order Trail Detail
app.get('/api/orders/:id/trail', async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await db.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const customer = await db.getCustomer(order.customer_id);
    const trail = await auditService.getOrderTrail(orderId);

    res.json({
      order,
      customer,
      trail,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Failure Log View (Navigation Plan 3.4)
app.get('/api/failures', async (req, res) => {
  try {
    const failures = await failureService.getHandledFailures();
    res.json(failures);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dev Seed & Batch Runner (TRD Section 7: /api/orders/seed)
app.post('/api/orders/seed', async (req, res) => {
  try {
    await db.clearAll();
    await seedDatabase();
    const results = await pipelineService.processBatch();
    res.json({ message: 'Seed & batch processing complete', count: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single Order Process
app.post('/api/orders/:id/process', async (req, res) => {
  try {
    const result = await pipelineService.processOrder(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ Upsell & Cross-Sell Backend running on http://localhost:${PORT}`);
});
