# TRD — Upsell & Cross-Sell Agent
**Razorpay Buildathon 2026 · Track 1: AI Growth & Agentic Commerce**
Document type: Technical Requirements Document · Status: Prototype for submission

Companion to PRD.md — this document defines the technical design that satisfies the product requirements.

---

## 1. Architecture Overview

```
Order Event (poll / webhook)
        │
        ▼
  Trigger Service  ──(filters: order value, repeat customer, abandoned cart)
        │
        ▼
  Signal Service  ──(reads catalog + order/customer history from Postgres)
        │
        ▼
  Decision Service  ──(LLM call → structured JSON, Zod-validated)
        │
        ▼
  Gate Service  ──(deterministic rule checks, no LLM dependency)
        │
        ├── REJECTED → logged to audit_log, pipeline continues to next order
        │
        ▼ ACCEPTED
  Execution Service  ──(Razorpay Orders / Payment Links API, test mode)
        │
        ▼
  Audit Log (Postgres, append-only)
        │
        ▼
  Dashboard (read layer, Astro.js)
```

Each service is a separate module with a narrow, testable interface — this is what allows the Gate Service specifically to be unit-tested in isolation from the LLM.

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language / runtime | Node.js 20+, TypeScript | Compile-time safety on money-related payloads; matches existing project experience |
| Payment integration | `razorpay` npm SDK, test-mode keys (`rzp_test_`) | Official SDK; Orders API + Payment Links API cover the full demo flow |
| Decision engine | Existing multi-provider LLM abstraction | Reuses debugged infrastructure; failover avoids single point of failure during demo |
| Schema validation | Zod | Rejects malformed LLM output before it can corrupt the audit trail or reach the gate |
| Database | Supabase (Postgres) | Real relational audit-log table; RLS for merchant isolation; free tier sufficient |
| Queue (optional, if time allows) | BullMQ + Redis | Decouples order ingestion from LLM latency; not required for prototype happy path |
| Dashboard | Astro.js | Server-rendered, fast to build, ideal for a linear trigger→decision→gate→execution timeline view |
| Testing | Vitest (or Jest) | Unit tests specifically for the Gate Service |
| Hosting (demo) | Railway/Render (backend), Vercel (dashboard) | Fast deploy, free tier, no infra overhead during build window |

## 3. Data Model

### 3.1 `merchants`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| name | text | |
| created_at | timestamptz | |

### 3.2 `catalog`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| merchant_id | uuid, FK → merchants | RLS scoping key |
| sku | text | |
| name | text | |
| price | numeric | |
| category | text | |
| co_purchase_tags | text[] | Simple co-purchase signal for synthetic data |

### 3.3 `customers`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| merchant_id | uuid, FK | |
| name | text | Synthetic |
| order_count | int | Used as a "repeat customer" signal |

### 3.4 `orders`
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| merchant_id | uuid, FK | |
| customer_id | uuid, FK | |
| items | jsonb | List of SKUs + quantities |
| total_amount | numeric | |
| status | text | `created`, `paid`, `refunded`, `disputed` |
| created_at | timestamptz | |

### 3.5 `decisions` (the audit log — append-only)
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| order_id | uuid, FK | |
| stage | text | `trigger`, `signal`, `decision`, `gate`, `execution` |
| payload | jsonb | Structured content of that stage |
| result | text | `accepted`, `rejected`, `error`, `success` |
| reason | text | Human-readable explanation — never nullable for gate/error rows |
| created_at | timestamptz | |

This table is the single source of truth for the dashboard and for "explainability." Rows are never updated or deleted — corrections are new rows.

## 4. Decision Layer — Structured Output Contract

The LLM must return JSON matching this Zod schema; anything that fails validation is treated as an `error` result at the `decision` stage and routed to the failure-handling path, not silently retried indefinitely.

```ts
const DecisionSchema = z.object({
  action: z.enum(["cross_sell", "upsell", "none"]),
  recommended_sku: z.string().nullable(),
  reason: z.string().min(10),
  discount_pct: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
});
```

Prompt design principles:
- The model is given the order, the customer's history, and the catalog (with co-purchase tags) — nothing else.
- The model is explicitly instructed to return `action: "none"` when no confident recommendation exists, rather than forcing a low-quality upsell.
- The prompt does not ask the model to apply discount limits — that is the Gate Service's job, deliberately kept out of the LLM's control.

## 5. Gate Layer — Deterministic Rules (No LLM Dependency)

| Rule | Bound | Behavior on violation |
|---|---|---|
| Max discount | `discount_pct <= 15` | Reject, log `"discount exceeds 15% cap"` |
| One offer per order | No existing `accepted` decision for this `order_id` | Reject, log `"order already has an active offer"` |
| Order eligibility | `order.status not in (refunded, disputed)` | Reject, log `"order status ineligible: {status}"` |
| Minimum confidence | `confidence >= 0.6` | Reject, log `"confidence below threshold ({confidence})"` |
| Valid SKU | `recommended_sku` exists in merchant's catalog | Reject, log `"SKU not found in catalog"` |

The Gate Service is a pure function: `(decision, order, catalogSnapshot) → { result, reason }`. It has zero external dependencies, which is what makes it unit-testable and what proves to judges that bounds are enforced deterministically, not by asking the LLM nicely.

## 6. Execution Layer

On `accepted`:
1. Call Razorpay Payment Links API (test mode) to create a link for the recommended SKU, with an idempotency key derived from `order_id + sku` to prevent duplicate links if the pipeline is triggered twice for the same order.
2. Store the returned `payment_link_id` and `short_url` in the `decisions` row for that stage.
3. Poll (or webhook-listen for) the Payment Link's status to detect conversion or expiry — this expiry path is the recommended failure-handling scenario (see Section 8).

## 7. API Surface (Internal, for the Dashboard)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/orders/:id/trail` | GET | Full decision trail for one order, all stages |
| `/api/batch/summary` | GET | Aggregate counts: offers made, accepted, rejected, converted |
| `/api/orders/seed` | POST | (Dev-only) trigger the pipeline against seeded synthetic orders |

No write endpoints are exposed to the dashboard — it is read-only by design, since the prototype has no merchant-configuration UI (see PRD Non-Goals).

## 8. Failure Handling — Technical Design

Recommended primary failure case: **Payment Link expiry.**
- A background check (cron or manual trigger for demo) queries Razorpay for Payment Links past their expiry window with no successful payment.
- On detecting expiry, the system logs a `decisions` row with `stage: execution`, `result: error`, `reason: "payment link expired unconverted"`.
- The system explicitly does **not** auto-retry by creating a new link — it logs the outcome and stops, which is the "no retry-storm" behavior called out in the PRD.

Secondary failure path (already covered structurally): malformed LLM JSON → Zod validation failure → logged as `error` at the `decision` stage → pipeline moves to the next order without crashing the batch run.

## 9. Security & Data Handling

- Supabase Row-Level Security scoped by `merchant_id` on all tables, even though the prototype only seeds one merchant — this proves multi-tenant readiness without extra build cost.
- Razorpay API keys stored as environment variables, never committed, never logged in the `decisions` table (payloads store only decision/business data, not credentials).
- No real customer PII — all customer/order data is synthetic.

## 10. Non-Functional Requirements

| Requirement | Prototype target |
|---|---|
| Latency (per order, trigger → execution) | Under 10 seconds for the demo batch |
| Idempotency | No duplicate Payment Links for the same order on repeated triggers |
| Observability | Every stage of every order is queryable from the `decisions` table alone, no external log system required for the demo |
| Testability | Gate Service has unit tests covering every rule in Section 5 |

## 11. Scalability Path (Beyond Prototype, for Judges' "Production-Grade" Question)

- Swap polling for real Razorpay webhook ingestion — no architecture change, only the Trigger Service's input source changes.
- Introduce BullMQ/Redis between Trigger and Signal services to decouple LLM latency from order ingestion throughput.
- Multi-provider LLM routing already supports failover; extend with cost-based routing (cheap model for low-value orders, stronger model for high-value orders).
- `decisions` table as append-only is already compliance-log-shaped; can be streamed to a dedicated analytics store (e.g., a warehouse) without changing the write path.

---

*Companion documents: PRD.md (requirements), Navigation-plan.md (dashboard IA & flow), Implementation-plan.md (build schedule).*
