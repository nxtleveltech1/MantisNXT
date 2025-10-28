# MantisNXT Pre-Production Remediation Project Plan

**Project Goal:** Achieve a stable, secure, and seamless platform experience for final pre-production readiness by resolving all identified critical flaws, technical debt, and misalignments.

**Reference Document:** MantisNXT Comprehensive Assessment and Readiness Report (October 27, 2025)

---

## Executive Summary: Project Timeline and Resource Allocation

The remediation effort is structured into three sequential phases, estimated to take **24 working days** (approximately 5 weeks) with dedicated resources.

| Phase | Goal | Duration (Working Days) | Key Resources |
| :--- | :--- | :--- | :--- |
| **A: Stabilization** | Resolve all critical, production-blocking security and data integrity issues. | 4 Days | SDE, DBA, SecOps |
| **B: Consolidation** | Eliminate redundancy in UI components and API versions for a seamless experience. | 10 Days | SDE, FE |
| **C: Architectural Hardening** | Optimize performance, harden security, and clean up architectural debt. | 10 Days | SDE, SecOps, DBA |
| **Total Estimated Duration** | | **24 Working Days** | |

---

## 1. Resource Allocation

The plan assumes the availability of three key roles, with the Senior Developer/Engineer (SDE) serving as the primary resource across all phases.

| Role | Responsibility | Allocation (FTE) |
| :--- | :--- | :--- |
| **SDE (Senior Developer/Engineer)** | Primary owner of all code fixes, API unification, and architectural abstraction. | 1.0 |
| **DBA (Database Engineer)** | Owner of all schema fixes, data integrity migrations, and RLS verification. | 0.5 |
| **FE (Frontend Engineer)** | Owner of component consolidation, UI standardization, and error state cleanup. | 0.5 |
| **SecOps (Security/DevOps Engineer)** | Owner of security fixes (JWT), deployment complexity, and performance monitoring. | 0.5 |

---

## 2. Detailed Project Phases and Timeline

### Phase A: Stabilization (Estimated Duration: 4 Days)

**Goal:** Resolve all critical, production-blocking security and data integrity issues.

| Step | Task Description | Priority | Primary Role | Est. Days |
| :--- | :--- | :--- | :--- | :--- |
| **A.1** | **Fix Critical JWT Secret Fallback (S-1):** Remove hardcoded fallback secret from `auth.ts` and `multi-tenant-auth.ts`. | CRITICAL | SecOps | 1 |
| **A.2** | **Fix Schema Mismatch (D-1):** Add `contact_person` column to `core.supplier` table and update the affected `/api/inventory/complete` route. | HIGH | DBA / SDE | 2 |
| **A.3** | **Deploy Analytics Migration (D-2):** Execute `005_fix_analytics_sequences.sql` to ensure data integrity for analytics tables. | HIGH | DBA | 0.5 |
| **A.4** | **Resolve Zod Dependency Conflict (I-1):** Upgrade AI SDK or consolidate the Zod version to remove the fragile `legacy-peer-deps` workaround. | HIGH | SDE | 0.5 |

### Phase B: Consolidation and Unification (Estimated Duration: 10 Days)

**Goal:** Eliminate redundancy and fragmentation to ensure a consistent, seamless user and developer experience.

| Step | Task Description | Priority | Primary Role | Est. Days |
| :--- | :--- | :--- | :--- | :--- |
| **B.1** | **Unify Dashboard Components (UI-1):** Consolidate all dashboard implementations into a single, optimized component. Deprecate and remove all others. | MEDIUM | FE / SDE | 3 |
| **B.2** | **Unify Supplier Forms (UI-2):** Consolidate multiple supplier form versions into one final, robust form component. | MEDIUM | FE | 2 |
| **B.3** | **Standardize Error/Loading States (UI-2):** Implement a single, unified error and loading state strategy across all components. | MEDIUM | FE | 2 |
| **B.4** | **Unify Core APIs (API-1):** Merge logic from all versioned API routes (`/v2`, `/v3`, `enhanced`) into a single, stable API version. | MEDIUM | SDE | 2.5 |
| **B.5** | **Consolidate Health Checks (API-2):** Consolidate all `/api/health/*` routes into a single, comprehensive health endpoint. | LOW | SDE | 0.5 |

### Phase C: Architectural Hardening and Final Checks (Estimated Duration: 10 Days)

**Goal:** Optimize performance, harden security, and clean up architectural debt for long-term maintainability.

| Step | Task Description | Priority | Primary Role | Est. Days |
| :--- | :--- | :--- | :--- | :--- |
| **C.1** | **Implement AI Caching Strategy (P-1):** Implement aggressive caching and asynchronous processing for all AI-driven features (e.g., Redis caching for AI responses). | LOW | SDE / SecOps | 3 |
| **C.2** | **Abstract Database Layer (A-1):** Refactor all explicit `Neon`-specific code references to use generic database service abstractions. | LOW | SDE | 2 |
| **C.3** | **Enforce Global Authorization (A-2):** Implement a global authorization check in `src/middleware.ts` to enforce a default "deny all" policy for API routes. | LOW | SecOps | 1.5 |
| **C.4** | **Verify RLS Implementation (C.4):** Audit and verify that Row-Level Security (RLS) is correctly configured and enforced for multi-tenancy. | LOW | DBA | 1.5 |
| **C.5** | **Final Deployment Checklist Review (A-3):** Document all system dependencies (`puppeteer`) and finalize the production `.env` configuration template. | LOW | SecOps | 2 |

---

## 3. Key Deliverables and Success Metrics

| Deliverable | Success Metric | Phase |
| :--- | :--- | :--- |
| **Security Patch** | JWT Secret fallback removed; application fails to start without `JWT_SECRET`. | A |
| **Data Integrity** | All core business processes (e.g., inventory completion) execute without database errors. | A |
| **Code Consolidation** | All redundant UI components and API versions are removed from the codebase. | B |
| **Seamless Experience** | User flows are consistent, and all error/loading states are standardized. | B |
| **Performance Hardening** | AI-driven features do not block core user workflows (e.g., latency under 500ms for non-AI features). | C |
| **Architectural Abstraction** | No explicit vendor-specific references in core service files. | C |
| **Final Codebase** | All tests pass, and the application is ready for the final pre-production deployment. | C |

---

## 4. Risks and Mitigation

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Scope Creep** | Project extends beyond the 24-day timeline. | Strict adherence to the prioritized list. New features are deferred to a post-production backlog. |
| **Deep Dependency Issues** | Resolving the Zod conflict (A.4) requires a major refactor. | SDE allocates a dedicated half-day. If unresolved, temporarily revert to the stable dependency version and document for future resolution. |
| **Regression** | Fixing one issue breaks existing, working functionality. | Mandatory unit and integration tests must pass for every commit. Dedicated FE/SDE time for post-consolidation testing (Phase B). |
| **Resource Availability** | Key resources (DBA, SecOps) are not fully available. | SDE is cross-trained to handle most tasks; tasks are scheduled to minimize resource contention. |

---

## 5. Phase Exit Criteria

- Phase A — Stabilization
  - A.1 JWT fallback removed from `src/middleware/auth.ts` and `src/lib/auth/multi-tenant-auth.ts`; app fails fast without `JWT_SECRET`.
  - A.2 `core.supplier.contact_person` added; `/api/inventory/complete` runs without DB errors and returns 2xx.
  - A.3 `database/migrations/005_fix_analytics_sequences.sql` applied; analytics inserts succeed; no sequence errors in logs.
  - A.4 Build runs without `legacy-peer-deps`; single `zod` version resolved.
- Phase B — Consolidation
  - B.1 One dashboard component exported; all others removed; routes/pages use the unified component.
  - B.2 One supplier form implementation; deprecated variants removed; form validation consistent.
  - B.3 Unified loading/error UI across app; no custom ad‑hoc spinners/boundaries remain.
  - B.4 One stable API for suppliers/inventory; older versions return 410 Gone with deprecation notice.
  - B.5 Single `/api/health` aggregates DB/AI/Redis statuses.
- Phase C — Hardening
  - C.1 AI calls cached/async; non‑AI requests under 500ms P95 in staging.
  - C.2 DB layer abstracted; no vendor‑specific imports in core services.
  - C.3 Global authorization enforced; deny‑by‑default for API routes.
  - C.4 RLS verified for multi‑tenant tables; negative tests confirm isolation.
  - C.5 Deployment checklist approved; `.env` template complete; dependencies documented.

---

## 6. Validation & Acceptance Checklist

- Security
  - `JWT_SECRET` required in production; startup aborts if missing.
  - No fallback secrets present in codebase.
- Data integrity
  - All migrations applied; schema matches application expectations.
  - Inventory completion workflow fully green in staging.
- UX consistency
  - One dashboard; one supplier form; unified error/loading components.
  - No orphaned/unused UI components remain after tree‑shaking.
- API hygiene
  - Unified routes documented; deprecated versions removed or return 410.
- Performance
  - Non‑AI endpoints P95 ≤ 500ms; AI endpoints non‑blocking with caching.
- Observability
  - Health endpoint covers DB/AI/Redis; error logs noise reduced ≤ 2% of requests.
- Tests
  - `npm run test:ci` passes; key e2e flows green.

---

## 7. Communication & Governance

- Daily stand‑up (15m) focused on blockers across A/B/C phases.
- Twice‑weekly stakeholder sync for scope control and demos.
- Change control: any scope addition requires written approval and moves to post‑prod backlog unless risk‑reducing.
- Code reviews: mandatory for all PRs; include test evidence and acceptance checks.

---

## 8. Environment & Deployment Prerequisites

- Node 18+; PNPM/NPM aligned with project lockfile.
- Required services: PostgreSQL (Neon), Redis, SMTP (for `nodemailer`), Chrome dependencies for `puppeteer`.
- Required env vars (non‑exhaustive): `JWT_SECRET`, `NEON_SPP_DATABASE_URL`, `REDIS_URL`, SMTP credentials.
- Migrations
  - Apply all in `database/migrations/`; verify `005_fix_analytics_sequences.sql`.
  - Run `npm run db:migrate` followed by `npm run db:validate`.

---

## 9. Milestones & Sign‑off

- M1: Phase A complete — sign‑off: SDE + SecOps + DBA
- M2: Phase B complete — sign‑off: SDE + FE
- M3: Phase C complete — sign‑off: SDE + SecOps
- Final Go/No‑Go: All checklists green; `test:ci` + e2e pass in staging.

---

## Appendix A — Quick Verification Commands

- Search for fallback secret:
  - `rg -n "your-secret-key" src/middleware/auth.ts src/lib/auth/multi-tenant-auth.ts`
- Run migrations and validate:
  - `npm run db:migrate && npm run db:validate`
  - `psql $NEON_SPP_DATABASE_URL -f database/migrations/005_fix_analytics_sequences.sql`
- Run tests:
  - `npm run test:ci` or `npm run test:all`
- Validate APIs and health:
  - `npm run validate:api`
  - `curl -s http://localhost:3000/api/health | jq`
