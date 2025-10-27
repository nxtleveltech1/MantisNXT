# Two-Tier Inventory Database Architecture Implementation Prompt

## OBJECTIVE
Implement a complete two-tier inventory database architecture using Neon PostgreSQL for the MantisNXT system, consisting of:
1. **SPP Database** (Supplier Inventory Portfolio) - For supplier pricelist management
2. **IS-SOH Database** (Inventory Selected - Stock on Hand) - For operational inventory

## SYSTEM REQUIREMENTS

### Core Architecture
- **Technology Stack**: Next.js, TypeScript, Neon PostgreSQL with connection pooling
- **Database Strategy**: Two separate Neon database instances with inter-database communication
- **Performance Target**: Support 100,000+ products per supplier, 50+ suppliers
- **Compliance**: Full audit trail, price history, change tracking

### Business Logic Requirements
1. **Price Update Rule**: When existing product uploaded, only update price (preserve all other data)
2. **New Product Detection**: Flag products appearing for first time with "NEW" indicator
3. **Selection Workflow**: SPP → ISI (review) → IS-SOH with approval tracking
4. **Multi-Supplier Views**: Aggregate and supplier-specific views required
5. **Stock Tracking**: Track actual stock holdings by supplier in IS-SOH

## DATABASE #1: SPP (SUPPLIER INVENTORY PORTFOLIO)

### Purpose
Isolated database for ALL supplier pricelist uploads/imports, maintaining complete supplier catalogs.

### Schema Design Requirements

```sql
-- Core Tables Required:

1. suppliers
   - supplier_id (UUID, PK)
   - supplier_code (UNIQUE, NOT NULL)
   - supplier_name
   - status (active/inactive/suspended)
   - contact_info (JSONB)
   - payment_terms
   - currency_code
   - tax_registration
   - created_at, updated_at
   - metadata (JSONB)

2. supplier_products_{supplier_code} (Dynamic per supplier)
   - product_id (UUID, PK)
   - supplier_product_code (UNIQUE within supplier)
   - product_name
   - description
   - category_id (FK)
   - subcategory_id (FK)
   - brand
   - manufacturer
   - unit_of_measure
   - pack_size
   - current_price (DECIMAL(19,4))
   - currency_code
   - is_new (BOOLEAN, default true)
   - first_seen_date
   - last_updated
   - status (available/discontinued/pending)
   - specifications (JSONB)
   - created_at, updated_at

3. price_history
   - history_id (UUID, PK)
   - supplier_id (FK)
   - product_id
   - old_price
   - new_price
   - price_change_percentage
   - change_reason
   - upload_batch_id (FK)
   - changed_at
   - changed_by

4. upload_batches
   - batch_id (UUID, PK)
   - supplier_id (FK)
   - upload_date
   - file_name
   - file_hash
   - total_products
   - new_products_count
   - updated_products_count
   - failed_products_count
   - status (processing/completed/failed)
   - error_log (JSONB)
   - processed_by
   - processing_time_ms

5. categories
   - category_id (UUID, PK)
   - category_name
   - parent_category_id (self-referencing FK)
   - level
   - path (ltree for hierarchical queries)
   - is_active
   - sort_order

6. product_mappings
   - mapping_id (UUID, PK)
   - supplier_id (FK)
   - supplier_product_code
   - master_product_id
   - mapping_confidence (0-100)
   - mapping_method (manual/auto/ml)
   - verified_by
   - verified_at

7. upload_staging
   - staging_id (UUID, PK)
   - batch_id (FK)
   - row_number
   - raw_data (JSONB)
   - validation_status
   - validation_errors (JSONB)
   - processed_at
```

### Required Indexes
```sql
-- Performance-critical indexes:
CREATE INDEX idx_supplier_products_code ON supplier_products_{code} (supplier_product_code);
CREATE INDEX idx_supplier_products_category ON supplier_products_{code} (category_id, subcategory_id);
CREATE INDEX idx_supplier_products_new ON supplier_products_{code} (is_new) WHERE is_new = true;
CREATE INDEX idx_price_history_product ON price_history (supplier_id, product_id, changed_at DESC);
CREATE INDEX idx_upload_batches_status ON upload_batches (supplier_id, status, upload_date DESC);
CREATE INDEX idx_categories_path ON categories USING GIST (path);
```

### Required Views
```sql
1. v_all_supplier_products (Multi-supplier aggregated view)
   - Unions all supplier_products_{code} tables
   - Includes supplier name, last price change
   - Calculates days since last update

2. v_new_products_by_supplier
   - Shows only products with is_new = true
   - Groups by supplier with counts

3. v_price_change_summary
   - Recent price changes across all suppliers
   - Percentage changes, trending indicators

4. v_supplier_catalog_stats
   - Product counts, categories, price ranges per supplier
   - Upload frequency metrics
```

### Upload Processing Logic
```typescript
interface UploadProcessor {
  // 1. Validate and stage upload
  validatePricelist(file: File, supplierId: string): ValidationResult;

  // 2. Detect new vs existing products
  detectChanges(staged: StagedProduct[]): ChangeSet;

  // 3. Apply updates with history tracking
  applyUpdates(changes: ChangeSet): ProcessingResult;

  // 4. Mark new products
  flagNewProducts(products: Product[]): void;

  // 5. Generate upload report
  generateReport(batchId: string): UploadReport;
}
```

## DATABASE #2: IS-SOH (INVENTORY SELECTED - STOCK ON HAND)

### Purpose
Master operational database containing SELECTED products from SPP with actual stock holdings.

### Schema Design Requirements

```sql
-- Core Tables Required:

1. selected_products
   - product_id (UUID, PK)
   - spp_product_id (reference to SPP)
   - spp_supplier_id
   - internal_sku (UNIQUE)
   - product_name
   - description
   - category_id (FK)
   - brand
   - status (active/inactive/pending_review)
   - selection_date
   - selected_by
   - selection_reason
   - created_at, updated_at

2. stock_on_hand
   - soh_id (UUID, PK)
   - product_id (FK)
   - warehouse_id (FK)
   - quantity_on_hand (INTEGER)
   - quantity_reserved (INTEGER)
   - quantity_available (computed)
   - reorder_point
   - reorder_quantity
   - last_count_date
   - last_movement_date
   - updated_at

3. supplier_stock_holdings
   - holding_id (UUID, PK)
   - supplier_id
   - product_id (FK)
   - quantity_on_hand
   - quantity_on_order
   - last_purchase_price
   - average_cost
   - total_value (computed)

4. pricing_rules
   - rule_id (UUID, PK)
   - product_id (FK)
   - cost_price
   - markup_percentage
   - selling_price
   - minimum_price
   - maximum_price
   - pricing_tier_id (FK)
   - effective_from
   - effective_to
   - created_by

5. selection_queue (ISI - Inventory Selection Import)
   - queue_id (UUID, PK)
   - spp_product_id
   - spp_supplier_id
   - product_details (JSONB)
   - review_status (pending/approved/rejected/on_hold)
   - review_notes
   - reviewed_by
   - reviewed_at
   - auto_select_score (0-100)
   - selection_criteria (JSONB)

6. stock_movements
   - movement_id (UUID, PK)
   - product_id (FK)
   - movement_type (receipt/issue/adjustment/transfer)
   - quantity
   - from_location
   - to_location
   - reference_type (PO/SO/adjustment/transfer)
   - reference_id
   - movement_date
   - created_by

7. warehouses
   - warehouse_id (UUID, PK)
   - warehouse_code (UNIQUE)
   - warehouse_name
   - location_address (JSONB)
   - is_active
   - capacity_units
   - manager_id
```

### Required Indexes
```sql
CREATE INDEX idx_selected_products_sku ON selected_products (internal_sku);
CREATE INDEX idx_selected_products_supplier ON selected_products (spp_supplier_id);
CREATE INDEX idx_stock_on_hand_available ON stock_on_hand (product_id, quantity_available);
CREATE INDEX idx_selection_queue_status ON selection_queue (review_status, reviewed_at);
CREATE INDEX idx_stock_movements_date ON stock_movements (movement_date DESC, product_id);
CREATE INDEX idx_pricing_rules_effective ON pricing_rules (product_id, effective_from, effective_to);
```

### Required Views
```sql
1. v_stock_summary_by_supplier
   - Aggregated stock holdings grouped by supplier
   - Total value, quantity metrics

2. v_inventory_valuation
   - Current inventory value using various costing methods
   - FIFO, LIFO, Average cost calculations

3. v_reorder_alerts
   - Products below reorder point
   - Suggested order quantities

4. v_selection_pipeline
   - Products pending selection from SPP
   - Auto-selection candidates
```

## ISI (INVENTORY SELECTION IMPORT) WORKFLOW

### Selection Process Implementation
```typescript
interface SelectionWorkflow {
  // 1. Queue products for selection
  queueForSelection(criteria: SelectionCriteria): QueuedProduct[];

  // 2. Auto-scoring based on rules
  calculateSelectionScore(product: SPPProduct): number;

  // 3. Review interface
  getReviewQueue(filters: ReviewFilters): ReviewItem[];

  // 4. Approval process
  approveSelection(queueIds: string[], userId: string): ApprovalResult;

  // 5. Import to IS-SOH
  importToOperational(approved: ApprovedProduct[]): ImportResult;

  // 6. Sync pricing and stock data
  syncWithSPP(productIds: string[]): SyncResult;
}
```

### Selection Criteria Rules
```sql
-- Automated selection scoring based on:
1. Historical sales data (if exists)
2. Category demand metrics
3. Margin potential
4. Supplier reliability score
5. Minimum order quantities
6. Lead time requirements
```

## DATA SYNCHRONIZATION

### SPP → IS-SOH Sync Requirements
```typescript
interface DataSync {
  // Real-time price updates
  syncPriceChanges(interval: '1h' | '6h' | '24h'): void;

  // New product notifications
  notifyNewProducts(supplierId: string): Notification[];

  // Availability updates
  updateProductAvailability(products: ProductUpdate[]): void;

  // Bulk selection import
  bulkImportSelected(selectionBatch: SelectionBatch): ImportResult;
}
```

## MIGRATION SCRIPTS

### 1. Create SPP Database
```sql
-- migrations/001_create_spp_database.sql
CREATE SCHEMA IF NOT EXISTS spp;

-- Create tables in order of dependencies
-- Create all indexes
-- Create views
-- Create functions and triggers for:
  - Price history tracking
  - New product detection
  - Audit logging
```

### 2. Create IS-SOH Database
```sql
-- migrations/002_create_issoh_database.sql
CREATE SCHEMA IF NOT EXISTS issoh;

-- Create operational tables
-- Create indexes
-- Create views
-- Create synchronization functions
```

### 3. Setup Cross-Database Communication
```sql
-- migrations/003_setup_dblink.sql
-- Configure foreign data wrapper for SPP → IS-SOH communication
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create foreign server connection
-- Create user mappings
-- Import foreign schemas
```

## PERFORMANCE OPTIMIZATION

### Required Optimizations
1. **Partitioning**: Partition price_history and stock_movements by date
2. **Materialized Views**: For expensive aggregations (refresh hourly)
3. **Connection Pooling**: Configure Neon pooler for 100+ concurrent connections
4. **Batch Processing**: Process uploads in 1000-record chunks
5. **Async Processing**: Queue large uploads for background processing
6. **Caching Strategy**: Redis for frequently accessed catalog data
7. **Index Maintenance**: Weekly VACUUM ANALYZE, monthly REINDEX

### Query Optimization Patterns
```sql
-- Use CTEs for complex supplier aggregations
WITH supplier_metrics AS (
  SELECT ... FROM supplier_products_acme
  UNION ALL
  SELECT ... FROM supplier_products_beta
)

-- Optimize new product detection
CREATE INDEX CONCURRENTLY idx_first_seen
ON supplier_products_{code} (first_seen_date)
WHERE is_new = true;

-- Use partial indexes for status filters
CREATE INDEX idx_active_products
ON selected_products (product_id)
WHERE status = 'active';
```

## API ENDPOINTS REQUIRED

### SPP Database APIs
```typescript
POST   /api/spp/upload/{supplierId}
GET    /api/spp/products/{supplierId}?new=true
GET    /api/spp/products/all?view=multi_supplier
GET    /api/spp/price-history/{productId}
POST   /api/spp/categories/assign
GET    /api/spp/reports/upload/{batchId}
```

### IS-SOH Database APIs
```typescript
POST   /api/issoh/selection/queue
GET    /api/issoh/selection/pending
POST   /api/issoh/selection/approve
GET    /api/issoh/stock/by-supplier/{supplierId}
POST   /api/issoh/stock/movement
GET    /api/issoh/stock/reorder-alerts
PUT    /api/issoh/pricing/{productId}
```

### ISI Workflow APIs
```typescript
POST   /api/isi/review/start
GET    /api/isi/review/queue?status=pending
POST   /api/isi/review/score
POST   /api/isi/import/execute
GET    /api/isi/import/status/{jobId}
```

## IMPLEMENTATION CHECKLIST

### Phase 1: SPP Database (Week 1-2)
- [ ] Create Neon database instance for SPP
- [ ] Implement core schema with all tables
- [ ] Create dynamic supplier product tables
- [ ] Implement price history tracking
- [ ] Build upload processing pipeline
- [ ] Create all required views
- [ ] Implement new product detection
- [ ] Build upload validation system
- [ ] Create test data generators
- [ ] Performance test with 100k products

### Phase 2: IS-SOH Database (Week 2-3)
- [ ] Create Neon database instance for IS-SOH
- [ ] Implement operational schema
- [ ] Create stock tracking tables
- [ ] Build pricing rule engine
- [ ] Implement warehouse management
- [ ] Create stock movement tracking
- [ ] Build all required views
- [ ] Implement audit trails
- [ ] Create reporting queries
- [ ] Load test operational queries

### Phase 3: ISI Integration (Week 3-4)
- [ ] Build selection queue mechanism
- [ ] Implement auto-scoring algorithm
- [ ] Create review workflow UI
- [ ] Build approval process
- [ ] Implement SPP → IS-SOH sync
- [ ] Create monitoring dashboard
- [ ] Build error recovery system
- [ ] Implement rollback procedures
- [ ] End-to-end testing
- [ ] Performance optimization

### Phase 4: Production Deployment (Week 4)
- [ ] Configure production Neon instances
- [ ] Setup connection pooling
- [ ] Deploy migration scripts
- [ ] Configure monitoring/alerting
- [ ] Implement backup strategy
- [ ] Create operation runbooks
- [ ] Train users on ISI workflow
- [ ] Go-live checklist
- [ ] Post-deployment validation
- [ ] Performance monitoring

## ERROR HANDLING & RECOVERY

### Required Error Handlers
1. **Upload Failures**: Automatic retry with exponential backoff
2. **Data Validation**: Quarantine invalid records for manual review
3. **Sync Failures**: Queue for retry, alert on repeated failures
4. **Selection Conflicts**: Locking mechanism to prevent double selection
5. **Price Update Conflicts**: Last-write-wins with full audit trail

## MONITORING & ALERTING

### Key Metrics to Track
- Upload success/failure rates
- New product detection accuracy
- Selection approval turnaround time
- Stock discrepancy alerts
- Price change volatility
- Database performance metrics
- Sync lag between SPP and IS-SOH

## SECURITY REQUIREMENTS

1. **Row-Level Security**: Implement RLS for supplier isolation
2. **Audit Logging**: Complete audit trail for all changes
3. **Encryption**: Encrypt sensitive pricing data at rest
4. **Access Control**: Role-based permissions for ISI workflow
5. **Data Validation**: Input sanitization for upload processing

## SUCCESS CRITERIA

The implementation is complete when:
1. SPP successfully processes 100k+ product uploads in <5 minutes
2. Price history tracking captures all changes with <1s latency
3. New product detection achieves 100% accuracy
4. ISI workflow supports 1000+ selections/day
5. IS-SOH maintains real-time stock accuracy
6. All views return results in <500ms
7. System handles 50+ concurrent suppliers
8. Full audit trail available for compliance
9. Automated tests achieve >90% coverage
10. Production deployment completes with zero downtime

## DELIVERABLES

1. **Database Schemas**: Complete DDL scripts for both databases
2. **Migration Scripts**: Numbered, idempotent migration files
3. **API Implementation**: TypeScript/Next.js API routes
4. **Type Definitions**: Full TypeScript interfaces
5. **Test Suite**: Unit, integration, and load tests
6. **Documentation**: API docs, workflow guides, ERD diagrams
7. **Monitoring Setup**: Dashboards and alert configurations
8. **Deployment Scripts**: CI/CD pipeline configuration
9. **Backup Procedures**: Automated backup and restore scripts
10. **Operation Manual**: Runbooks for common operations

---

## EXECUTION NOTES

This prompt provides a complete blueprint for implementing the two-tier inventory architecture. Execute in phases, validating each component before proceeding. Use Neon's branching feature for safe testing. Implement comprehensive error handling and monitoring from day one. Prioritize data integrity and performance optimization throughout.