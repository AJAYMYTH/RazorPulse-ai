# Security Policy & Vulnerability Disclosure

**Project:** UpsellX AI — Autonomous Upsell & Cross-Sell Engine for Razorpay  
**Effective Date:** September 2026  
**Security Desk:** [security@upsellx.ai](mailto:security@upsellx.ai)  

---

## 1. Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported | Security Maintenance |
|---|---|---|
| `1.0.x` (Production / Current) | :white_check_mark: Yes | Active security patches and vulnerability resolution |
| `< 1.0.0` | :x: No | Prototype and pre-release builds |

---

## 2. Reporting a Vulnerability

We take the security of automated financial agents, merchant funds, and customer transaction signals seriously. If you identify a security vulnerability or architectural flaw, please report it responsibly:

### How to Report
- **Do NOT create public GitHub issues** for security vulnerabilities or suspected exploits.
- Send an encrypted email to **`security@upsellx.ai`** or reach out via private repository vulnerability reporting on GitHub.
- If necessary, request our PGP public key for encrypting sensitive exploit payloads or proof-of-concept scripts.

### What to Include
To help us triage and resolve the issue quickly, please provide:
1. **Vulnerability Type:** (e.g., Prompt Injection bypass of Gate bounds, Authentication token forgery, RLS tenant leakage, Replay/Idempotency bypass).
2. **Steps to Reproduce:** Clear, minimal instructions or curl commands to reproduce the behavior.
3. **Potential Impact:** What an attacker could achieve if the vulnerability were exploited.
4. **Suggested Mitigation:** If known, code-level or architectural recommendations.

### Response SLA
- **Initial Acknowledgment:** Within **24 to 48 hours**.
- **Triage & Validation:** Within **72 hours**.
- **Patch & Public Disclosure:** Coordinated release within **14 business days** or upon merchant patch deployment.

---

## 3. Core Security & Threat Model Invariants

UpsellX AI is architected with defense-in-depth principles specifically designed for agentic commerce:

### A. Non-Custodial Direct Settlement
- UpsellX AI **never handles, captures, transmits, or stores card numbers, CVVs, UPI MPINs, or bank net-banking passwords**.
- All checkout operations occur exclusively on official Razorpay-hosted payment pages (`https://rzp.io/...`), certified under Razorpay's **PCI-DSS Level 1 Service Provider** infrastructure.
- 100% of customer funds settle directly into the merchant's official Razorpay account with zero intermediary escrow or custody.

### B. Separation of Intelligence & Authority
- Artificial intelligence models (Google Gemini / OpenAI) are treated as **untrusted advisory systems**.
- No LLM has direct execution permissions to any financial creation API.
- All proposals must pass a deterministic, pure TypeScript gate function (`evaluateGate()`) that enforces immutable commercial bounds (e.g., hard $\le 15\%$ discount cap, single-offer idempotency, catalog existence). Prompt injection attacks cannot force discounts exceeding the code-level threshold.

### C. Zero LLM Model Training on Merchant Data
- Merchant catalogs, order totals, and customer profile signals are transmitted exclusively through enterprise endpoints with explicit zero-data-retention guarantees.
- Merchant commercial data is **never used to train, fine-tune, or improve third-party foundation models**.

### D. Multi-Tenant Database Isolation
- In cloud deployments, PostgreSQL **Row-Level Security (RLS)** policies enforce cryptographic tenant boundaries at the database engine level based on `merchant_id`.
- Cross-tenant data leakage is prevented under all application query conditions.

### E. Anti-Retry-Storm Resilience
- Expired or failed payment links enter an immutable terminal state in the append-only `decisions` ledger.
- The pipeline executes **exactly zero retries**, completely preventing infinite retry loops, gateway rate-limiting, or consumer spam.

---

## 4. Safe Harbor Policy

We consider ethical security research conducted in good faith to be authorized and beneficial. We will not pursue legal action against security researchers who:
- Make a good faith effort to avoid privacy violations, data destruction, and service degradation.
- Give us reasonable time to remediate the vulnerability before public disclosure.
- Do not access, modify, or retain customer or merchant production transaction records.

Thank you for helping keep UpsellX AI safe and reliable!
