# PRD — Upsell & Cross-Sell Agent
**Razorpay Buildathon 2026 · Track 1: AI Growth & Agentic Commerce**
Document type: Product Requirements Document · Status: Prototype for submission

---

## 1. Summary

An autonomous agent that monitors a merchant's orders on Razorpay test-mode APIs and decides — within hard-coded bounds — when to offer a customer a cross-sell (related product) or upsell (bigger/better version of what they bought). Every decision is explainable, bounded, gated, and logged before it ever reaches a payment API.

This PRD defines *what* the prototype must do and *why*. The TRD (companion document) defines *how* it's built.

---

## 2. Problem Statement

Small and mid-size merchants leave 10–30% of potential e-commerce revenue on the table because they lack a dedicated growth team to run upsell/cross-sell campaigns manually. Existing automation tools either require staff time to configure and monitor (which small teams don't have), or apply blanket, non-personalized rules that under- or over-discount customers. Meanwhile, commerce is shifting toward agent-to-agent transactions (NPCI's UAP, Razorpay's live Claude/UPI pilots), and merchants need infrastructure that can make bounded, explainable money-decisions without a human in the loop.

## 3. Goals

| Goal | How the prototype demonstrates it |
|---|---|
| G1 — Prove revenue-growth automation is viable for a merchant with no growth team | Agent runs unattended across a batch of orders and produces measurable upsell/cross-sell offers |
| G2 — Prove every money action is explainable | Every decision is logged with structured reasoning, visible on a dashboard |
| G3 — Prove every money action is bounded and gated | A deterministic gate layer rejects out-of-bounds decisions before execution, and rejections are shown, not hidden |
| G4 — Prove the system handles failure gracefully | One real failure mode is deliberately triggered and shown recovering without crashing or duplicating actions |

## 4. Non-Goals (Out of Scope for the Prototype)

- Real merchant onboarding or live (non-test-mode) payments
- Multi-currency or multi-region support
- A full admin/merchant-configuration UI (bounds are configured in code/config for the prototype, not through a UI)
- Real-time webhook infrastructure at production scale (polling or simple webhook receipt is sufficient for the demo)
- Customer-facing chat/conversational interface (this track direction is "Upsell & Cross-sell Agent," not "Conversational checkout")
- Actual agent-to-agent (AI buyer) integration — the prototype targets the merchant-side decision layer, not a full ACP/AP2-style buyer-agent handshake

## 5. Target Users

- **Primary (real-world):** Small-to-mid merchants on Razorpay with no dedicated growth/CRM function — solo founders, 2–5 person ops teams.
- **Primary (for this submission):** Buildathon judges evaluating explainability, boundedness, and failure handling as the core rubric.
- **Secondary (future):** Larger merchants wanting an additional automated revenue channel layered on top of existing tools.

## 6. User Stories

1. *As a merchant*, when a customer completes an order, I want the system to automatically evaluate whether a cross-sell or upsell makes sense, so I don't have to manually review every order.
2. *As a merchant*, I want every automated offer to stay within limits I trust (max discount, one offer per order), so the system never damages my margins or customer relationships.
3. *As a merchant*, I want to see *why* an offer was made or rejected, so I can trust and audit the system's behavior.
4. *As a judge/reviewer*, I want to see the full decision trail for a batch of orders — including at least one rejected decision and one handled failure — so I can verify the system meets "explainable, bounded, gated."

## 7. Features — Must-Have (Prototype Scope)

| # | Feature | Description | Priority |
|---|---|---|---|
| F1 | Order trigger | Detect a new order (poll or webhook) and pass it into the pipeline | P0 |
| F2 | Signal gathering | Pull relevant catalog + order/customer history for the triggered order | P0 |
| F3 | Decision engine | LLM call returns a structured decision: action type, SKU, discount %, reasoning, confidence | P0 |
| F4 | Gate layer | Deterministic rule engine that accepts/rejects the decision against hard-coded bounds, logging the reason either way | P0 |
| F5 | Execution | On acceptance, create a real Razorpay test-mode Payment Link for the recommended item | P0 |
| F6 | Audit log | Every trigger, decision, gate result, and execution outcome persisted, queryable per order | P0 |
| F7 | Failure handling | One real failure case (expired link, malformed LLM output, or gate rejection) shown recovering gracefully | P0 |
| F8 | Dashboard | Read-only view showing the trail per order and a batch-level summary (offers made, accepted, rejected, conversion) | P0 |
| F9 | Synthetic data seeding | Seeded catalog + order history so the pipeline can run without a live merchant | P0 |

## 8. Features — Nice-to-Have (If Time Allows)

| # | Feature | Description |
|---|---|---|
| N1 | Confidence-based routing | Route low-confidence decisions to a cheaper/faster model, high-value orders to a stronger model |
| N2 | Merchant-configurable bounds | Simple config file/table so bounds aren't hardcoded (still not a full UI) |
| N3 | Real webhook ingestion | Replace polling with actual Razorpay webhook receipt |
| N4 | Multi-tenant schema demo | Show `merchant_id`-scoped rows and RLS working across two seeded merchants |

## 9. Success Metrics (For the Demo, Not Production KPIs)

- **Coverage:** Pipeline runs successfully across a batch of 10–20 synthetic orders without manual intervention.
- **Explainability:** 100% of decisions (accepted and rejected) have a logged, human-readable reason.
- **Boundedness:** At least one deliberately out-of-bounds scenario is correctly rejected by the gate layer in the demo batch.
- **Resilience:** The one chosen failure case is triggered and recovered from without a crash or duplicate money action.
- **Conversion signal (illustrative, not literal):** Dashboard reports offer acceptance/conversion rate across the batch, even though it's simulated.

## 10. Assumptions

- Razorpay test-mode API access is available and stable during the build/demo window.
- No real merchant or real customer exists — all order/customer/catalog data is synthetic and seeded.
- A single LLM provider (or the existing multi-provider abstraction) is available for the decision layer.
- The demo audience (judges) primarily cares about the explainability/bounded/gated/failure-handling behavior over UI polish.

## 11. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| LLM returns malformed or unpredictable output under demo conditions | Pipeline stalls or produces a bad decision | Zod-validated structured output + this becomes the chosen failure case to demo intentionally |
| Razorpay test-mode rate limits during demo rehearsal | Demo interruption | Cache/replay known-good responses as a fallback for the recorded video |
| Running out of build time before the failure-handling and audit trail are done | These are the most heavily weighted rubric items | Build gate layer + audit log in Phase 2, before dashboard polish (see Implementation Plan) |
| Synthetic data looks unrealistic to judges | Weaker demo credibility | Base the seeded catalog on real co-purchase logic (e.g., laptop → sleeve) rather than random pairings |

## 12. Open Questions

- Does the Buildathon require a live merchant integration, or is a fully synthetic-data prototype acceptable? (Assume synthetic is acceptable per "Razorpay test-mode APIs" wording in the brief.)
- Is there a required minimum LLM provider, or is bring-your-own-provider acceptable?

---

*Companion documents: TRD.md (technical design), Navigation-plan.md (dashboard IA & flow), Implementation-plan.md (build schedule).*
