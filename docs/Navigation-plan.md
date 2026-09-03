# Navigation Plan — Upsell & Cross-Sell Agent Dashboard
**Razorpay Buildathon 2026 · Track 1: AI Growth & Agentic Commerce**
Document type: Navigation / Information Architecture Plan · Status: Prototype for submission

This plan covers the read-only Astro.js dashboard — the surface judges will actually look at during the live demo and pitch video. The dashboard has no write actions (see TRD Section 7); its job is purely to make the decision trail legible.

---

## 1. Design Goal

The dashboard exists for one purpose: make "explainable, bounded, gated" *visible* in under 10 seconds per screen. Every screen should answer one of these questions immediately on load:
- What happened?
- Why did it happen (or not happen)?
- Did anything fail, and how was it handled?

No screen should require more than one click to reach from the home view — the demo has 5 minutes total, most of it on the live pipeline, not UI navigation.

## 2. Site Map

```
/                      → Batch Summary (home)
/orders                → Order List
/orders/:id            → Order Trail Detail
/failures              → Failure Log (subset view)
```

Four routes total. No auth, no settings, no merchant switcher — all deliberately out of scope per PRD Non-Goals.

## 3. Screen-by-Screen Breakdown

### 3.1 `/` — Batch Summary (Home)
**Purpose:** The first thing judges see. Proves the system works across a batch, not one cherry-picked order.

**Contents:**
- Header stat row: total orders processed, offers made, offers accepted (gate), offers rejected (gate), conversion rate on accepted offers
- A simple bar/count breakdown of rejection reasons (e.g., "3 rejected: discount too high," "2 rejected: low confidence")
- A prominent "1 failure handled" indicator linking to `/failures`
- A table of the most recent orders, each row linking to `/orders/:id`

**States:**
- Loading: skeleton stat cards
- Empty (no batch run yet): a single call-to-action explaining how to trigger the seeded batch (dev-only, not shown in final demo)
- Populated (demo state): fully rendered as above

### 3.2 `/orders` — Order List
**Purpose:** Secondary navigation surface, mostly for judges who want to browse beyond the home summary.

**Contents:**
- Table: order ID, customer, order value, decision action (cross_sell / upsell / none), gate result (accepted / rejected), execution status
- Filter by gate result (accepted / rejected / error) — simple client-side filter, no backend query params needed for prototype scope

### 3.3 `/orders/:id` — Order Trail Detail
**Purpose:** The core "explainability" screen — this is what's on screen during the 1:20–3:00 live-demo segment of the pitch video.

**Contents, in vertical timeline order (matches the pipeline stages exactly):**
1. **Trigger** — what fired the pipeline for this order (order value, customer type)
2. **Signal** — catalog items and customer history the decision was based on
3. **Decision** — the raw structured JSON from the LLM (action, SKU, discount, reason, confidence), rendered readably, not as a JSON blob dump
4. **Gate** — accepted or rejected, with the specific rule and reason if rejected
5. **Execution** — the real Razorpay Payment Link (short URL, status: created / paid / expired), only shown if the gate accepted

**States:**
- Rejected-at-gate order: timeline stops visually at the Gate stage, styled distinctly (not as an error, but as "system working as intended")
- Failed-execution order: Execution stage shows the error state clearly (see 3.4)
- Successful order: full five-stage timeline, ending in a "converted" or "pending payment" badge

### 3.4 `/failures` — Failure Log
**Purpose:** Directly supports the 3:00–3:40 segment of the pitch video — isolates the one deliberately handled failure case so it doesn't get lost in a full order list.

**Contents:**
- List of every `decisions` row with `result: error`, across all stages
- Each entry shows: order ID, stage where it failed, reason, and — critically — what the system did next (e.g., "logged, no retry attempted, pipeline continued to next order")
- Links back to the relevant `/orders/:id` for full context

## 4. User Flow for the Demo

```
Start on "/" (Batch Summary)
   → point out the batch-level numbers (proves scale, not a single lucky case)
   → click into one ACCEPTED order → /orders/:id
       → walk the timeline: trigger → signal → decision (read the reasoning aloud) → gate (accepted) → execution (real Payment Link)
   → navigate back, click into one REJECTED order → /orders/:id
       → point at the Gate stage specifically: "discount exceeded 15% cap" — this proves "bounded and gated"
   → navigate to /failures
       → show the one handled failure and narrate the recovery behavior
   → return to "/" to close on the batch-level conversion number
```

This flow is designed to require exactly 4 navigations, matching the time budget of the live-demo segment in the pitch video.

## 5. Visual/Interaction Notes

- Keep the JSON/reasoning text large enough to read on a recorded screen capture — this was explicitly flagged as a demo risk in the PRD/pitch-video plan.
- Use consistent color coding across all screens: accepted = one color, rejected = a second (not alarming-red, since rejection is correct system behavior, not an error), error/failure = a third.
- No modal dialogs or multi-step interactions — everything needed for a given screen should be visible without additional clicks, since the video has no time for UI exploration.

## 6. Explicitly Out of Scope for Navigation (Prototype)

- Merchant login/switching
- Any settings or bounds-configuration screens (bounds live in code/config per TRD)
- Pagination beyond what a 10–20 order seeded batch requires (a simple scrollable list is sufficient)
- Mobile-responsive layout — the dashboard is built for a screen-recorded desktop demo, not merchant daily use in this prototype phase

---

*Companion documents: PRD.md (requirements), TRD.md (technical design), Implementation-plan.md (build schedule).*
