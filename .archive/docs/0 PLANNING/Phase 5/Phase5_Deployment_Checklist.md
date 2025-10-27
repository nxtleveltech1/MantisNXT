
# Phase 5 Deployment Checklist

- [ ] Apply migration `20251003_phase5_inventory.sql` in a maintenance window
- [ ] Confirm enum creation or adapt to existing enum
- [ ] Backfill `deleted_at` = NULL for all items
- [ ] Verify constraints and triggers created successfully
- [ ] Feature flag: enable DB triggers only if API layer is not fully transactional yet
- [ ] Deploy API code (adjustments, movements, batch)
- [ ] Run unit/integration tests
- [ ] Smoke test in staging: IN/OUT/ADJUST/WRITE_OFF flows
- [ ] Monitor errors & DB for constraint violations
