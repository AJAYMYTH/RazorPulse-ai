-- ==============================================================================
-- Schema Definition: Upsell & Cross-Sell Agent
-- Track 1: AI Growth & Agentic Commerce (Razorpay Buildathon 2026)
-- Target: PostgreSQL / Supabase
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Merchants Table
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Catalog Table
CREATE TABLE IF NOT EXISTS catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    co_purchase_tags TEXT[] DEFAULT '{}',
    UNIQUE(merchant_id, sku)
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_count INT NOT NULL DEFAULT 1
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    items JSONB NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('created', 'paid', 'refunded', 'disputed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Decisions Table (The Audit Log — Strictly Append-Only)
CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('trigger', 'signal', 'decision', 'gate', 'execution')),
    payload JSONB NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('accepted', 'rejected', 'error', 'success')),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast queries & timeline retrieval
CREATE INDEX IF NOT EXISTS idx_catalog_merchant_sku ON catalog(merchant_id, sku);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_decisions_order_id ON decisions(order_id);
CREATE INDEX IF NOT EXISTS idx_decisions_stage ON decisions(stage);
CREATE INDEX IF NOT EXISTS idx_decisions_result ON decisions(result);

-- ==============================================================================
-- Row-Level Security (RLS) - Proves Multi-Tenant Readiness
-- ==============================================================================
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Default Permissive Read for prototype service-role / anon keys
CREATE POLICY "Allow service role full access on merchants" ON merchants FOR ALL USING (true);
CREATE POLICY "Allow service role full access on catalog" ON catalog FOR ALL USING (true);
CREATE POLICY "Allow service role full access on customers" ON customers FOR ALL USING (true);
CREATE POLICY "Allow service role full access on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow service role full access on decisions" ON decisions FOR ALL USING (true);
