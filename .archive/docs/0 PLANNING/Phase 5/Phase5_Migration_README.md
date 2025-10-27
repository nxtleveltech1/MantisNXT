
# Phase 5 — Migration & Implementation Notes

**DB Flavor**: PostgreSQL 13+ assumed.
If you use a different DB or an existing `movement_type` enum, adapt the migration accordingly.

## Order of Ops
1. Run migration `migrations/20251003_phase5_inventory.sql`
2. Deploy API endpoints (see `api_samples/`)
3. If relying on API-only transactions, comment out the `trg_apply_movement_to_inventory` section.
4. Run Phase 5 tests

## Rollback Plan
- Wrap migration in a transaction (done)
- To rollback: `ROLLBACK` during apply; otherwise create a `down` migration to drop new objects:
  - Drop triggers & functions created in sections 6–8
  - Drop `inventory_allocations`
  - Remove new constraints and columns (if safe)
