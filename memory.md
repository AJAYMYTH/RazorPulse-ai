# Project Memory — Upsell & Cross-Sell Agent
**Razorpay Buildathon 2026 · Track 1: AI Growth & Agentic Commerce**

This living document tracks architectural decisions, feature implementations, phase progress, and key technical context for the prototype.

---

## 1. Project Overview & Core Mission
- **Track:** Track 1: AI Growth & Agentic Commerce
- **Product:** Upsell & Cross-Sell Autonomous Agent
- **Core Value Proposition:** Autonomous agent monitoring merchant orders on Razorpay test-mode APIs, evaluating high-affinity upsell/cross-sell opportunities, gating all actions with deterministic safety bounds (15% discount limit, single-offer idempotency, eligibility, confidence thresholds, catalog SKU check), executing real Razorpay Payment Links in test mode, and recording an append-only audit trail displayed on an Astro.js dashboard.
- **Key Evaluation Criteria:**
  1. Revenue-growth automation viable without human intervention
  2. Every money action explainable (structured reasoning & confidence score)
  3. Every money action bounded and gated (deterministic rules, zero LLM control over money limits)
  4. Graceful failure handling (payment link expiry & schema failures handled safely without retry-storms)

---

## 2. Key Architectural Decisions
- **Workspaces / Modular Structure:** Clean separation between `backend/` (Node.js 20+, TypeScript, Express, Vitest, Razorpay SDK, Supabase/local DB) and `dashboard/` (Astro.js, Tailwind CSS).
- **BYOK (Bring Your Own Key):** Developers/merchants provide their own LLM API key (`GEMINI_API_KEY` or `OPENAI_API_KEY`) in `.env`. Free tiers (such as Google AI Studio's Gemini Flash) incur ₹0 cost for prototype testing. Built-in heuristic mock engine allows offline/cost-free execution.
- **Dual-Mode Database Adapter:** Supabase PostgreSQL with RLS when credentials are provided in `.env`; local file/store (`backend/data/store.json`) with the exact same relational schema as zero-friction fallback.
- **Dual-Mode Payment Execution:** Official `razorpay` npm SDK in test mode (`rzp_test_...`) when keys are configured; resilient fallback for rate-limit protection and offline development.
- **Pure Gate Layer:** Zero external network dependencies, 100% deterministic pure function with dedicated Vitest unit tests covering all 5 rules.

---

## 3. Implementation Status by Phase

| Phase | Description | Status | Key Deliverables |
|---|---|---|---|
| **Phase 0** | Project Setup & Seed Data | 🟢 Completed | `backend/`, `dashboard/`, PostgreSQL/Supabase schema, seed catalog (18 SKUs) & 15 tailored demo orders |
| **Phase 1** | Core Happy-Path Pipeline | 🟢 Completed & Verified | Trigger → Signal → Decision (LLM+Zod) → Execution (Real Razorpay Link: `https://rzp.io/rzp/PcVkMlWT`) → Append-Only Log (`decisions`) |
| **Phase 2** | Gate Layer & Bounds | 🟢 Completed & Verified | Pure deterministic function (`gate.service.ts`), 8 passing Vitest unit tests (`npm test`), live demo script (`npm run phase2`) proving all 5 bounds enforced before Payment Links API |
| **Phase 3** | Failure Handling & Resilience | 🟢 Completed & Verified | Payment Link expiry handled gracefully without retry-storms, malformed LLM response safely caught with Zod, repeatable demo script (`npm run phase3`) |
| **Phase 4** | Astro.js Dashboard | 🟢 Completed & Verified | 4 screens built and compiled (18 static pages): `/` (Batch Summary), `/orders` (Filterable List), `/orders/:id` (5-Stage Timeline), `/failures` (Failure Log) with verified 4-step demo flow |
| **Phase 5** | Batch Demo & Verification | 🟢 Completed & Verified | 15-order batch execution verified (`npm run batch`), 100% bounds demonstrated, comprehensive `README.md` with 4-step pitch guide |
| **Phase 6** | Buffer & Video Pitch Prep | 🟢 Ready | 5-minute pitch video script with timed segments (0:00–5:00) matching Navigation Plan Section 4 |

---

## 4. Feature & Change Log

### [2026-09-03] - Planning & Phase 0 to Phase 5 Implementation
- Analyzed `PRD.md`, `TRD.md`, `Navigation-plan.md`, and `Implementation-plan.md`.
- Formulated BYOK model and clarified zero-cost testing with Gemini Flash.
- Confirmed separate `backend/` and `dashboard/` folder structure.
- Scaffolded root workspace with npm workspaces.
- Implemented dual-mode database service (`backend/src/db/index.ts`) supporting Supabase Postgres and local file-backed JSON store.
- Seeded 1 merchant ("Apex Electronics & Tech Gear"), 18 catalog SKUs with realistic affinity tags, 8 customers, and 15 tailored test orders.
- Implemented Trigger, Signal, Decision (with Google Gemini, Zod validation, and heuristic fallback), Gate, and Execution (official Razorpay SDK) services.
- Created `backend/test/gate.service.test.ts` with 8 passing Vitest tests validating every deterministic bound.
- Implemented Payment Link Expiry handling and anti-retry-storm safeguards in `failure.service.ts`.
- Fixed Razorpay constraint on `reference_id` length (<=40 chars) and added test-mode rate-limit resilience.
- Executed `npm run batch` successfully across all 15 orders, achieving:
  - 15 Orders Processed
  - 14 Offers Formulated by LLM
  - 9 Gate Accepted
  - 6 Gate Safely Rejected (Discount > 15%, Low Confidence, Ineligible Status, Invalid SKU, Action None)
  - 1 Failure Handled Gracefully (Payment Link Expiry)
- Built 4-screen Astro.js dashboard with dark theme matching navigation plan.
- Created `README.md` with system architecture diagrams, rubric alignment matrix, and 4-step live pitch demo walkthrough.

### [2026-09-03] - Dashboard Redesign with Vercel Geist Design System (`DESIGN.md`)
- Migrated the entire UI from dark theme to the official **Vercel Geist design system** per `DESIGN.md`.
- **Canvas & Surface Palette:** `#fafafa` base canvas, `#ffffff` elevated card surfaces, `#171717` defining ink tone, `#4d4d4d` body text, and `#ebebeb` 1px structural hairline borders.
- **Hero Mesh Gradient:** Multi-stop radial mesh gradient bloom (cyan `#50e3c2`, blue `#0070f3`, violet `#7928ca`, magenta `#eb367f`, amber `#f5a623`) strictly confined to hero backdrop.
- **Typography:** Geist Sans with tight negative display tracking (`-2.4px` on display-xl, `-1.28px` on headings) and Geist Mono for uppercase technical eyebrows and audit tokens.
- **Bimodal Button System:** Fully rounded 100px pills (`button-primary`, `button-secondary`) for marketing CTAs, and tight 6px squares (`button-primary-sm`, `button-ghost-sm`) for nav/table chrome.
- Elevation & Cards: 1px hairline cards (`feature-card`) with whisper micro-shadows (`shadow-whisper`), eliminating heavy drop shadows.
- Re-compiled all 18 Astro static pages cleanly.

### [2026-09-03] - Project Naming & Custom Logo / Favicon Creation
- **Official Brand Name:** Named the project **RazorPulse AI** (*Autonomous Upsell & Cross-Sell Engine for Razorpay*).
- **Custom Vector Logo & Favicon:** Completely removed generic shapes/triangles. Designed an authentic, custom visual identity featuring:
  - An obsidian squircle shield with a Razorpay electric blue & cyan gradient boundary (`#0066FF` &rarr; `#00D2FF` &rarr; `#7928CA`).
  - An ascending forward growth lightning bolt symbolizing autonomous revenue expansion and instant payment velocity.
  - Dedicated vector files created:
    - [`dashboard/public/favicon.svg`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/public/favicon.svg)
    - [`dashboard/public/logo.svg`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/public/logo.svg)
    - [`dashboard/src/components/Logo.astro`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/src/components/Logo.astro)
- Integrated the brand lockup and favicon across navbar, footer, metadata, and hero banner.
- Verified compilation of all 18 static pages.

### [2026-09-03] - Professional Fintech Vector Logo, Rich Footer & Comprehensive UI/UX Polish
- **Hand-Crafted Precision Vector Logo:** Eliminated all multi-color AI gradients and fake glow filters. Created a minimalist, geometric payment slash and interlocking cyan pulse chevron with an apex event dot in `#0C1527`, `#0066FF`, and `#38BDF8`.
- **Production-Grade 4-Column Footer:** Added full technical information:
  - Architecture mission & live gate shield status
  - 5-stage pipeline breakdown (Stages 01–05)
  - Rubric compliance matrix (G1–G4)
  - API endpoints reference (`/api/batch/summary`, `/api/orders/:id/trail`, `/api/failures`, `/api/orders/seed`) and Vitest test status (8/8 Passing).
- **Comprehensive UI/UX Fixes Across All Pages:**
  - **Top Bar & Header:** Added live environment pill, interactive "Run Pipeline" button with live spinner that re-executes batch data via `/api/orders/seed`, and order count badge.
  - **Batch Summary (`/`):** Added proportional meter bars to Rejection Reasons and acceptance/blocked percentage counters (60% / 40%).
  - **Order List (`/orders`):** Added real-time instant search input (filters by Order ID, customer, SKU, or gate reason simultaneously) alongside category filter pills (`All`, `Approved`, `Gate Blocked`).
  - **Order Trail Detail (`/orders/:id`):** Added breadcrumb navigation, copy URL action, and an explicit **5-Rule Deterministic Gate Checklist** with exact evaluated values and status tags (`✓ PASSED` / `✕ VIOLATED`).
  - **Failure Log (`/failures`):** Added side-by-side comparative analysis of Naive AI automation (runaway retry loops, spam) vs RazorPulse AI deterministic recovery (terminal error logged, 0 retries).
- Verified full build with 18 static HTML pages generated cleanly.

### [2026-09-03] - Order Page 100% Fit Redesign (Zero Horizontal Scroll & Perfect Button Spacing)
- **Zero Horizontal Overflow:** Replaced the wide 7-column overflow table with a responsive 12-column CSS Grid desktop layout (`hidden lg:grid`) and structured card rows on smaller screens (`lg:hidden`), ensuring that all order details, payment links, and buttons fit comfortably in 100% of the viewport width without any horizontal scrolling/sliding.
- **Button Padding & Margin Harmony:**
  - Standardized search bar height (`h-10 pl-10 pr-4`) and category filter pills (`h-8 px-4` inside `p-1 rounded-pill`).
  - Action buttons (`Audit Trail &rarr;`) upgraded to `h-8 px-3.5 rounded-[6px] bg-ink text-white font-medium shadow-whisper` with generous tap targets and hover transitions.
  - Interactive `Copy URL` button added with instant feedback state (`Copied!` &rarr; `Copy URL`).
- **Timeline Alignment Fix:** Centered timeline step badges (`absolute -left-[19px] top-1.5`) directly on the 1px connector line with `ml-4 pl-7`, completely eliminating container margin clipping.
- Verified compilation of all 18 pages with Astro static build in 7.62s.

### [2026-09-03] - Production-Grade Legal/Compliance Footer & Smooth Anime.js Animations
- **Confidentiality & Production Footer:**
  - Removed all internal/confidential API route references and developer endpoint listings from the public footer.
  - Replaced with production-grade SaaS sections: Platform & Capabilities, Trust & Security (SOC 2, PCI-DSS Level 1, Zero LLM training), Legal & Governance (Merchant Service Agreement, Privacy Policy, Margin Safeguard Policy, Responsible AI Framework), and System Status.
- **Anime.js Animation Engine:**
  - Integrated Anime.js via CDN in `dashboard/src/layouts/Layout.astro` with `prefers-reduced-motion` accessibility checks.
  - **Hero & Card Entrance Stagger:** Cascading cubic-bezier entrance animations (`.anime-hero-fade`, `.anime-card-enter`) on page load.
  - **Animated KPI Counters:** Smooth counting-up animations (`0 &rarr; 15`, `0 &rarr; 14`, `0 &rarr; 9`, etc.) on the summary dashboard.
  - **Animated Proportional Meters:** Smooth horizontal bar expansion (`.anime-meter-fill`) on the deterministic gate breakdown.
  - **Order Trail Sequential Wave:** Animated 5-stage timeline progression on `/orders/:id` (`.anime-stage-step`).
  - **Interactive Search/Filter Transitions:** Smooth fade and glide transitions when filtering orders on `/orders`.
- Re-verified full static build across all 18 pages and 8/8 passing Vitest tests.

### [2026-09-03] - Vertical Timeline Alignment Fix (Image Analysis & Flex Track Architecture)
- **Visual Defect Identified via User Screenshot (`image.png`):** In the previous implementation, the numbered stage badges (`1`, `2`, `3`) used negative absolute positioning (`-left-[19px]`), which caused the badges to float detached in empty whitespace while the container border was displaced to the far left, misaligned from the circles.
- **Pure Flex Track Architecture:** Replaced the container border hack with a dedicated timeline track column (`flex flex-col items-center flex-shrink-0 w-8`) inside every stage item:
  - The node circle (`w-8 h-8 rounded-full z-10`) and connecting line (`w-[2px] bg-hairline flex-1 my-1`) are stacked in the exact same flex column with `items-center`.
  - The vertical connecting line passes directly through the exact center of every circle node continuously from Stage 1 &rarr; Stage 5.
  - Zero negative margins, zero floating drift, zero clipping.
  - **Contextual Color Coding:** Stage 4 turns amber on rejection (`ring-4 ring-amber-100`), Stage 5 turns green on approval (`ring-4 ring-emerald-100`) or muted grey when skipped.
- Re-compiled all 18 static pages cleanly with Astro.

### [2026-09-03] - Dedicated Legal & Regulatory Compliance Pages
- Built 5 dedicated production-grade legal pages conforming to the Geist design system and Indian DPDP Act 2023 / NPCI UAP standards:
  1. [`/privacy`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/src/pages/privacy.astro) — **Merchant Privacy Policy:** Non-custodial data architecture, zero LLM model training guarantee, PII minimization, and append-only audit retention.
  2. [`/terms`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/src/pages/terms.astro) — **Terms of Service:** Bring-Your-Own-Key (BYOK) model, deterministic gate primacy clause, non-custodial direct settlement, and instant credential revocation.
  3. [`/responsible-ai`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/src/pages/responsible-ai.astro) — **Responsible AI & Safety Framework:** Separation of intelligence and authority, structured Zod validation, human-readable explainability (Rubric G2), and NPCI Unified Agentic Protocol alignment.
  4. [`/margin-policy`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/src/pages/margin-policy.astro) — **Profit Margin Safeguard Policy:** ≤15% hard discount ceiling, single-offer idempotency, exclusion of disputed/refunded orders, and live catalog price verification.
  5. [`/security`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/src/pages/security.astro) — **Security Architecture:** PCI-DSS Level 1 direct Razorpay hosted checkout, PostgreSQL Row-Level Security (RLS) tenant isolation, and anti-retry-storm resilience.
- Linked all footer navigation links to the dedicated routes.
- Compiled 23 static HTML pages cleanly in 2.33s.

### [2026-09-03] - Git Repository Initialization & GitHub Push
- Initialized local Git repository on `main` branch.
- Added remote origin: `https://github.com/AJAYMYTH/RazorPulse-ai.git`.
- Committed all 49 project source and documentation files (with `.env` and sensitive credentials strictly protected by `.gitignore`).
- Successfully pushed the complete project to GitHub: `git push -u origin main`.

### [2026-09-05] - Full-Stack Merchant Authentication & Session Guard System
- **Backend Authentication APIs (`backend/src/index.ts` & `backend/src/db/index.ts`):**
  - Added `POST /api/auth/login`: verifies merchant credentials, generates scoped bearer token (`rzp_token_...`), and returns sanitized profile.
  - Added `POST /api/auth/signup`: provisions new merchant tenant, generates unique `merchant_id`, and persists user.
  - Added `GET /api/auth/me`: verifies active bearer token and returns session user.
  - Added `POST /api/auth/logout`: session invalidation.
  - Pre-seeded default demo merchant admin: `demo@razorpulse.ai` / `buildathon2026` (`Apex Electronics & Tech Gear`, role: `owner`).
- **Frontend Auth & Session Management (`dashboard/`):**
  - Built `dashboard/src/lib/auth.ts`: client-side session storage with cookie synchronization for zero-flicker route transitions.
  - Dedicated **Sign In Page** ([`dashboard/src/pages/login.astro`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/src/pages/login.astro)):
    - Geist-styled card with custom vector logo.
    - **"⚡ One-Click Demo Login"** button prefilled for hackathon judges (`demo@razorpulse.ai` / `buildathon2026`).
    - Standard email/password form with show/hide password toggle and client/backend dual-mode verification.
    - Handles dynamic `?redirect=` return queries.
  - Dedicated **Sign Up Page** ([`dashboard/src/pages/signup.astro`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/src/pages/signup.astro)):
    - Merchant onboarding flow (Admin Name, Store/Company Brand, Email, Master Password).
  - **Route Protection & Auth Guard in `Layout.astro`:**
    - Immediate inline script checks `localStorage` and redirects unauthenticated users visiting protected pages (`/`, `/orders`, `/orders/:id`, `/failures`) to `/login?redirect=...`.
    - Public pages (`/login`, `/signup`, `/privacy`, `/terms`, `/responsible-ai`, `/margin-policy`, `/security`) remain accessible.
    - **Merchant Account Nav Dropdown:** Displays store name (`Apex Electronics`), role (`OWNER`), email, merchant ID (`mch_apex_gear_001`), and a 1-click "Sign Out" button.
- **Unit Tests (`backend/test/auth.service.test.ts`):**
  - Added 4 new tests covering login verification, demo account retrieval, password checks, and merchant signup persistence.
  - 12/12 total Vitest unit tests passing (8 gate tests + 4 auth tests).
- All 25 Astro static pages compiled cleanly in 7.56s.

### [2026-09-05] - AI Provider Key Management, Merchant Settings & Production README
- **AI Key & Provider Management (BYOK):**
  - Dynamic API key setter added to `DecisionService` (`setApiKey()`) supporting live key updates.
  - Added `GET /api/settings`, `POST /api/settings`, and `POST /api/settings/test-key` endpoints to test and verify AI connectivity with Google Gemini (`gemini-1.5-flash`).
- **Dedicated Settings & Profile UI ([`dashboard/src/pages/settings.astro`](file:///C:/Users/javal/Videos/Razorpay-buildathon/dashboard/src/pages/settings.astro)):**
  - Interactive AI provider switcher (Google Gemini, OpenAI, Heuristic fallback).
  - Masked API key input with show/hide toggle, live key verification (`Test Key` button), and save persistence.
  - Razorpay Gateway credentials card with masked Key ID and HMAC-SHA256 status.
  - Deterministic Margin Shield parameter cards (displaying ≤15% hard cap and ≥60% confidence requirement).
  - Merchant store profile editor (Store Name, Tenant ID, Settlement Currency).
  - Integrated into main navigation and user dropdown menu.
- **Production-Grade README Overhaul:**
  - Rewrote [`README.md`](file:///C:/Users/javal/Videos/Razorpay-buildathon/README.md) into an enterprise fintech document with architectural diagrams, technology stack, REST API reference, and DPDP Act 2023 / NPCI UAP compliance details.
  - Completely removed all pitch video rehearsal scripts and timing tables from `README.md`.
- All 26 Astro static pages compiled cleanly in 4.33s. 12/12 Vitest unit tests passing.

### [2026-09-05] - GitHub Actions CI/CD Pipeline Implementation
- Created `.github/workflows/ci.yml` running on every commit (`push: main`), pull request (`pull_request: main`), and manual trigger (`workflow_dispatch`).
- **Automated Workflow Stages:**
  1. **Dependency Installation:** Monorepo package resolution and caching via Node 20.
  2. **TypeScript Compilation:** Strict typechecking of backend (`tsc`).
  3. **Unit Test Suite:** Automated execution of all 12 Vitest boundary and authentication tests.
  4. **Batch Pipeline Simulation:** Autonomous execution of the 15-order demonstration suite with mock environment keys.
  5. **Static Site Build Verification:** Astro production build validating all 26 static HTML pages.
  6. **Artifact Integrity Check:** Asserts that all core bundles and static routes exist in `dist/`.
- Added dynamic GitHub Actions CI/CD workflow status badge to `README.md`.

### [2026-09-05] - Open Source Governance & Security Policy Documents
- **`LICENSE`:** Standard MIT License granted to Ajay Kumar (AJAYMYTH) / RazorPulse AI.
- **`SECURITY.md`:** Production-grade vulnerability disclosure policy with 24-48h SLA, safe harbor guidelines, non-custodial scope, and PCI-DSS Level 1 / DPDP Act 2023 threat model.
- **`CODE_OF_CONDUCT.md`:** Contributor Covenant Code of Conduct v2.1.
- **`CONTRIBUTING.md`:** Development setup, testing requirements (`npm test`, `npm run batch`, `npm run build`), architectural invariants, and Conventional Commits format.
- Updated `README.md` with links to all governance documents.
