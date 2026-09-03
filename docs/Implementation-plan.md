# Implementation Plan — Upsell & Cross-Sell Agent
**Razorpay Buildathon 2026 · Track 1: AI Growth & Agentic Commerce**
Document type: Implementation / Build Plan · Status: Prototype for submission

This plan sequences the work defined in PRD.md and TRD.md into buildable phases, ordered so that the highest-weighted rubric items (explainability, bounds, failure handling) are done *before* dashboard polish — not after, when time is short.

---

## 0. Guiding Principle for Sequencing

Judges are explicitly scoring "every money action explainable, bounded and gated" plus "one failure handled gracefully." Those are Phases 2 and 3 below. If time runs out, it should run out during Phase 4 (dashboard) or Phase 5 (polish) — never before Phase 3 is complete. Build in this order even though a dashboard feels more demo-able early; it is not what's being scored.

---

## Phase 0 — Project Setup
**Goal:** Working environment, no product logic yet.

- [ ] Create Razorpay account, generate test-mode keys (`rzp_test_...`)
- [ ] Create Supabase project; enable RLS on all tables from the start
- [ ] Scaffold Node.js + TypeScript backend project (repo structure, linting, Zod, Razorpay SDK, Supabase client)
- [ ] Scaffold Astro.js dashboard project, connected to the same Supabase instance (read-only client)
- [ ] Create tables from TRD Section 3: `merchants`, `catalog`, `customers`, `orders`, `decisions`
- [ ] Seed one synthetic merchant, 15–20 catalog SKUs with realistic `co_purchase_tags`, 10–20 synthetic orders across varied customers and order values

**Definition of done:** Backend can read/write all five tables against Supabase; dashboard can query them read-only.

---

## Phase 1 — Core Pipeline, Happy Path Only
**Goal:** One order flows end-to-end through Trigger → Signal → Decision → Execution, no gate yet, no dashboard yet.

- [ ] Trigger Service: function that accepts an `order_id` and kicks off the pipeline (manual/dev trigger endpoint is fine — see TRD `/api/orders/seed`)
- [ ] Signal Service: pulls catalog + customer order history for the given order
- [ ] Decision Service: single LLM call using existing multi-provider abstraction, prompt built from TRD Section 4
- [ ] Zod validation of the LLM response against `DecisionSchema`
- [ ] Execution Service: create a real Razorpay test-mode Payment Link for the recommended SKU
- [ ] Write a `decisions` row for every stage as the pipeline runs

**Definition of done:** Running the pipeline against one seeded order produces a real, working Payment Link and a full set of logged rows in `decisions`.

---

## Phase 2 — Gate Layer & Bounds
**Goal:** No decision reaches Execution without passing deterministic checks. This is the highest-priority phase for the rubric.

- [ ] Implement Gate Service as a pure function per TRD Section 5 (no external dependencies)
- [ ] Implement all five rules: max discount, one-offer-per-order, order eligibility, minimum confidence, valid SKU
- [ ] Every rejection writes a `decisions` row with `result: rejected` and a specific, human-readable `reason`
- [ ] Unit tests covering every rule individually, plus at least one test proving a decision that *should* pass all rules does reach Execution
- [ ] Manually construct at least one seeded order designed to be rejected (e.g., an LLM-plausible discount above 15%) so the demo batch has a guaranteed rejection example

**Definition of done:** Gate Service has passing unit tests for all five rules; running the full seeded batch produces at least one accepted and at least one rejected decision, both correctly logged.

---

## Phase 3 — Failure Handling
**Goal:** Prove the system degrades gracefully. Do not skip or shortcut this phase.

- [ ] Choose the primary failure case: **Payment Link expiry** (recommended in TRD Section 8)
- [ ] Implement the expiry-check path: query Payment Link status, detect unconverted + expired, log as `result: error` with a clear reason
- [ ] Confirm explicitly that expiry does **not** trigger an automatic retry or duplicate link — this is the "graceful, not retry-storming" behavior called out in the PRD
- [ ] As a secondary, already-structural failure path: confirm a deliberately malformed/mocked LLM response is caught by Zod, logged as `result: error` at the `decision` stage, and the pipeline continues to the next order without crashing
- [ ] Write a short test or manual demo script that reliably reproduces the chosen failure on demand (for the pitch video, this needs to be repeatable, not left to chance)

**Definition of done:** The chosen failure can be triggered on command, is logged with a clear reason, and the batch run continues past it without manual intervention.

---

## Phase 4 — Dashboard
**Goal:** Build exactly what Navigation-plan.md specifies — no more.

- [ ] `/` Batch Summary: stat row, rejection-reason breakdown, failure indicator, recent orders table
- [ ] `/orders`: order list with gate-result filter
- [ ] `/orders/:id`: five-stage vertical timeline per TRD/Navigation-plan
- [ ] `/failures`: isolated failure log view
- [ ] Confirm the demo user flow in Navigation-plan.md Section 4 works in exactly 4 navigations

**Definition of done:** A full run-through of the Section 4 demo flow (Navigation-plan.md) works without errors, on a fresh page load, using the seeded batch data.

---

## Phase 5 — Batch Demo Run & Documentation Polish
**Goal:** Freeze functionality; make everything presentable.

- [ ] Run the full pipeline across all 10–20 seeded orders in one batch execution
- [ ] Record the resulting summary numbers (offers made, accepted, rejected, converted) — these become the numbers narrated in the pitch video
- [ ] Clean up README with setup instructions and the architecture diagram from TRD Section 1
- [ ] Do a final pass on PRD/TRD/Navigation-plan for consistency if anything changed during the build
- [ ] Rehearse the exact demo flow from Navigation-plan.md Section 4 at least twice, timed

**Definition of done:** A single, repeatable batch run produces consistent demo numbers, and the demo flow has been rehearsed end-to-end at least twice.

---

## Phase 6 — Buffer / Contingency
**Goal:** Absorb the inevitable last-minute breakage without touching scope.

- [ ] Reserve this time purely for fixing what breaks during rehearsal — no new features
- [ ] If time is critically short, cut from Phase 4 (dashboard polish) or the Nice-to-Have list in PRD Section 8 first — never from Phase 2 or Phase 3
- [ ] Have a fallback: a pre-recorded/cached successful pipeline run in case live API calls are flaky during actual recording

**Definition of done:** Submission is ready — repo, docs, and a rehearsed 5-minute pitch video recording, per the presentation plan in the project PRD.

---

## Phase-to-Rubric Mapping (Quick Reference)

| Buildathon rubric item | Covered in phase |
|---|---|
| "Grows revenue for a merchant" | Phase 1 (core pipeline), Phase 5 (batch numbers) |
| "Every money action explainable" | Phase 1 (audit rows), Phase 2 (gate reasons) |
| "Bounded and gated" | Phase 2 |
| "Show the audit trail" | Phase 4 (`/orders/:id` timeline) |
| "One failure handled gracefully" | Phase 3, surfaced in Phase 4 (`/failures`) |

---

*Companion documents: PRD.md (requirements), TRD.md (technical design), Navigation-plan.md (dashboard IA & flow).*
