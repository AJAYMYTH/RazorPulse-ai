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

// --- AUTHENTICATION ENDPOINTS ---

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check registered users
    let user = await db.getUserByEmail(normalizedEmail);

    // Fallback: If demo user credentials used
    if (!user && (normalizedEmail === 'demo@razorpulse.ai' || normalizedEmail === 'admin@apextech.in')) {
      user = {
        id: 'usr_demo_apex_01',
        name: 'Ajay Kumar',
        email: normalizedEmail,
        password_hash: 'buildathon2026',
        merchant_id: 'mch_apex_gear_001',
        company_name: 'Apex Electronics & Tech Gear',
        role: 'owner',
        created_at: new Date().toISOString(),
      };
      await db.saveUser(user);
    }

    if (!user || user.password_hash !== password) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Generate lightweight bearer token
    const token = `rzp_token_${user.id}_${Buffer.from(user.email).toString('base64')}`;

    // Return sanitized user object (omit password_hash)
    const { password_hash, ...sanitizedUser } = user;

    res.json({
      success: true,
      token,
      user: sanitizedUser,
      message: 'Authentication successful',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Signup / Merchant Onboarding
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, company_name } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }

    const merchantId = `mch_${Date.now()}`;
    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password_hash: password,
      merchant_id: merchantId,
      company_name: company_name?.trim() || `${name}'s Store`,
      role: 'owner' as const,
      created_at: new Date().toISOString(),
    };

    await db.saveUser(newUser);

    const token = `rzp_token_${newUser.id}_${Buffer.from(newUser.email).toString('base64')}`;
    const { password_hash, ...sanitizedUser } = newUser;

    res.status(201).json({
      success: true,
      token,
      user: sanitizedUser,
      message: 'Account created successfully',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Current User Info
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    const parts = token.split('_');
    if (parts.length < 4) {
      return res.status(401).json({ success: false, error: 'Malformed authentication token' });
    }

    const emailBase64 = parts[parts.length - 1];
    const email = Buffer.from(emailBase64, 'base64').toString('utf-8');

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User session expired or not found' });
    }

    const { password_hash, ...sanitizedUser } = user;
    res.json({ success: true, user: sanitizedUser });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
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
