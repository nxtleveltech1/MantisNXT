# MantisNXT Pre-Production Comprehensive Assessment and Readiness Report

## Phase A — Stabilization Adjustments

### Analytics Migration Decision

**Status:** ✅ Complete

**Decision:** Analytics tables use UUID/identity-based primary keys depending on the schema version.

**Migration History:**
- `database/migrations/010_create_core_analytics_minimal_bigint.sql`: Creates analytics tables (`core.analytics_anomalies`, `core.analytics_predictions`) with BIGINT identity keys using `GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
- `database/migrations/012_create_core_analytics_full_uuid.sql`: Creates UUID-based tables (`core.purchase_orders`, `core.purchase_order_items`) using `UUID PRIMARY KEY DEFAULT gen_random_uuid()`

**Migration 005 Superseded:**
- `database/migrations/005_fix_analytics_sequences.sql` is **superseded** and no longer needed
- Migration 005 was designed to fix sequence issues for BIGINT identity columns
- With migration 010 using `GENERATED ALWAYS AS IDENTITY`, sequences are automatically managed by PostgreSQL
- For UUID-based tables in migration 012, sequences are not used

**Current Schema Strategy:**
- BIGINT identity: Used for analytics tables (`analytics_anomalies`, `analytics_predictions`) via `GENERATED ALWAYS AS IDENTITY`
- UUID: Used for transactional tables (`purchase_orders`, `purchase_order_items`) via `gen_random_uuid()`

**Recommendation:** 
- Migration 005 can be safely ignored or archived
- Future analytics tables should follow the pattern established in migration 010 (BIGINT identity) or 012 (UUID) depending on use case
- No migration adjustments needed if BIGINT+sequence compliance is required - use migration 010 pattern

---

## Phase B — Consolidation & Unification

### Status: In Progress

See remediation plan for detailed status of:
- Dashboard component consolidation
- Supplier form unification
- Inventory API unification
- Health endpoint consolidation

---

## Phase C — Architectural Hardening

### Status: In Progress

See remediation plan for detailed status of:
- Global authorization enforcement
- AI caching & async strategy
- Database abstraction cleanup
- RLS verification
- Supplier performance data alignment

---

*Last Updated: 2025-10-28*
