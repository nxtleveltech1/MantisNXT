# Index Maintenance

## Inventory of Performance Indexes

- `02_performance_indexes.sql` (baseline)
- `03_supplier_performance_indexes.sql`
  - Supplier search (GIN tsvector on name/code)
  - (active, name) composite for listing
  - contact_info JSONB GIN for email/phone
  - (active, created_at DESC) for recent active
- `04_inventory_performance_indexes.sql`
  - stock_on_hand (supplier_product_id, qty)
  - stock_on_hand qty partial index for low stock
  - supplier_product (supplier_id, supplier_sku)
  - supplier_product GIN tsvector on sku/name_from_supplier
  - supplier_product (category_id, supplier_sku)

## Maintenance Schedule
- REINDEX GIN indexes monthly.
- ANALYZE weekly to refresh statistics.
- Monitor index bloat quarterly.

## Deployment Instructions
- Use `CREATE INDEX CONCURRENTLY` in production.
- If creation fails, drop incomplete index and re-run.
- Validate usage with `EXPLAIN ANALYZE` on representative queries.

## Monitoring Usage
- Check execution plans to confirm index scans.
- Track index sizes and unused indexes.

See query patterns in `src/lib/services/UnifiedDataService.ts` that motivated these indexes.

