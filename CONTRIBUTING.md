# Contributing to RazorPulse AI

Thank you for your interest in contributing to **RazorPulse AI**! We welcome contributions that improve agentic stability, expand deterministic gate bounds, or enhance developer observability.

---

## 🛠️ Development Workflow

### 1. Prerequisites
- **Node.js:** v20.x or higher
- **npm:** v10.x or higher
- **Git**

### 2. Fork & Setup Local Environment
```bash
git clone https://github.com/AJAYMYTH/RazorPulse-ai.git
cd RazorPulse-ai
cp .env.example .env
npm install
```

### 3. Running Development Services
```bash
# Concurrently start backend (port 3000) and Astro dashboard (port 4321)
npm run dev
```

---

## 🧪 Testing & Validation Standards

Every pull request must maintain **100% green test passes** and compile without TypeScript warnings:

```bash
# 1. Run full unit test suite (GateService & AuthService)
npm test

# 2. Test 15-order demonstration batch simulation
npm run batch

# 3. Verify Astro static dashboard build (26 static pages)
npm --prefix dashboard run build
```

---

## 📜 Architectural Invariants for Contributors

When submitting pull requests, please respect the core safety guarantees:

1. **Deterministic Gate Rule:** Never allow an LLM or external agent to directly execute a payment link creation without passing through `gate.service.ts`.
2. **Margin Shield Invariant:** The hard maximum discount cap ($\le 15\%$) is a fundamental safety invariant; do not relax code-level bounds.
3. **Anti-Retry-Storm Invariant:** Failed or expired payment links must terminate safely without triggering retry loops.
4. **Non-Custodial Guarantee:** Never introduce dependencies or logic that capture or store raw cardholder credentials.

---

## 📝 Commit & PR Guidelines

- Use standard [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`, `test:`, `ci:`).
- Reference relevant GitHub issue numbers in pull request descriptions.
- Ensure all CI/CD pipeline checks pass cleanly on GitHub Actions.

Thank you for contributing to the future of autonomous agentic commerce on Razorpay!
