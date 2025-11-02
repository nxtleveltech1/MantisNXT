# Pricing & Optimization System - Database Documentation

## Overview

**Migration:** `0013_pricing_optimization.sql`
**Purpose:** Production-ready pricing intelligence and optimization system with AI-powered recommendations
**Dependencies:** Requires migrations 0001-0012, especially 0011 (inventory system) and 0004 (customer operations)

## Architecture

### Multi-Tenant Design
- All tables include `org_id` for organization-level isolation
- RLS policies enforce data separation between tenants
- Supports multiple pricing strategies per organization

### Core Components

1. **Pricing Rules Engine** - Automated price calculation
2. **Price History** - Complete audit trail
3. **Optimization Engine** - AI-powered analysis
4. **Recommendations** - ML-driven price suggestions
5. **Competitor Intelligence** - Market price tracking
6. **Elasticity Analysis** - Demand forecasting
7. **Tiered Pricing** - Customer & volume-based pricing

---

## Database Objects

### Enums

#### `pricing_strategy`
Defines pricing calculation methods:
- `cost_plus` - Base cost + fixed markup percentage
- `market_based` - Pricing based on market conditions
- `value_based` - Pricing based on perceived customer value
- `competitive` - Match or beat competitor pricing
- `dynamic` - Real-time algorithmic adjustment using elasticity
- `tiered` - Volume or customer tier-based pricing

#### `price_tier`
Customer pricing tier levels:
- `standard` - Default retail pricing
- `wholesale` - Bulk/wholesale pricing
- `retail` - Standard retail markup
- `vip` - Premium customer pricing
- `promotional` - Limited-time promotional pricing

#### `optimization_status`
Status of optimization analysis runs:
- `pending` - Queued for analysis
- `analyzing` - Analysis in progress
- `completed` - Analysis finished
- `applied` - Recommendations applied to products
- `rejected` - Recommendations rejected by user

#### `recommendation_type`
Types of pricing recommendations:
- `price_increase` - Suggest raising price
- `price_decrease` - Suggest lowering price
- `bundle` - Product bundling opportunity
- `promotion` - Promotional campaign suggestion
- `clearance` - Clearance/liquidation pricing

---

## Tables

### 1. `pricing_rule`

**Purpose:** Configurable rules for automated price calculation

**Key Columns:**
- `id` - Primary key (UUID)
- `org_id` - Organization (multi-tenant)
- `name` - Rule name
- `strategy` - Pricing strategy (enum)
- `inventory_item_id` - Specific product (nullable)
- `category_id` - Category-wide rule (nullable)
- `brand_id` - Brand-wide rule (nullable)
- `supplier_id` - Supplier-wide rule (nullable)
- `base_cost` - Override cost if specified
- `markup_percentage` - Percentage markup on cost
- `fixed_margin` - Fixed profit margin amount
- `min_price` / `max_price` - Price constraints
- `tier` - Price tier (standard/wholesale/etc.)
- `conditions` - JSONB for advanced conditions
- `is_active` - Rule activation status
- `priority` - Rule precedence (higher = applied first)
- `valid_from` / `valid_until` - Validity period

**Constraints:**
- At least one scope (product, category, brand, or supplier) required
- Markup/margin must be positive
- Min price ≤ Max price
- Valid date ranges

**Indexes:**
- `idx_pricing_rule_active` - Active rules by priority
- `idx_pricing_rule_product` - Product lookups
- `idx_pricing_rule_category` - Category lookups
- `idx_pricing_rule_brand` - Brand lookups
- `idx_pricing_rule_validity` - Date range queries

**Example Conditions JSON:**
```json
{
  "min_quantity": 10,
  "customer_segment": "wholesale",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "exclude_brands": ["brand-uuid-1", "brand-uuid-2"]
}
```

---

### 2. `price_history`

**Purpose:** Complete audit trail of all price changes

**Key Columns:**
- `id` - Primary key
- `org_id` - Organization
- `inventory_item_id` - Product reference
- `old_price` / `new_price` - Price change details
- `currency` - Currency code (3-letter ISO)
- `reason` - Human-readable reason for change
- `pricing_rule_id` - Link to rule if auto-applied
- `optimization_id` - Link to recommendation if AI-generated
- `changed_by` - User who made the change
- `effective_date` - When price became effective
- `created_at` - Record creation timestamp

**Indexes:**
- `idx_price_history_product` - Product + date (DESC)
- `idx_price_history_org` - Organization + date (DESC)
- `idx_price_history_date` - Time-series queries

**Auto-Population:**
- Trigger `track_inventory_item_price_changes` automatically creates history records when `inventory_item.price` changes

---

### 3. `pricing_optimization`

**Purpose:** Optimization analysis run metadata

**Key Columns:**
- `id` - Primary key
- `org_id` - Organization
- `name` - Analysis name
- `description` - Analysis description
- `status` - Current status (enum)
- `analysis_period_start` / `analysis_period_end` - Time range analyzed
- `target_categories` / `target_brands` / `target_suppliers` - JSONB arrays of scope filters
- `products_analyzed` - Count of products analyzed
- `recommendations_generated` - Count of recommendations created
- `potential_revenue_impact` - Projected revenue change
- `potential_margin_impact` - Projected margin change
- `analysis_data` - JSONB with detailed metrics
- `optimization_config` - JSONB with algorithm parameters
- `created_by` - User who initiated analysis
- `started_at` / `completed_at` - Execution timestamps
- `error_message` - Error details if failed

**Indexes:**
- `idx_pricing_optimization_org_status` - Status filtering
- `idx_pricing_optimization_dates` - Date range queries

**Example Analysis Data JSON:**
```json
{
  "metrics": {
    "avg_margin_percentage": 32.5,
    "price_volatility": 8.2,
    "competitor_coverage": 78
  },
  "trends": {
    "price_trending_up": 45,
    "price_trending_down": 23,
    "price_stable": 32
  },
  "categories_analyzed": ["electronics", "appliances"],
  "algorithm_version": "v2.1.0"
}
```

---

### 4. `pricing_recommendation`

**Purpose:** AI-generated pricing recommendations with impact analysis

**Key Columns:**
- `id` - Primary key
- `org_id` - Organization
- `optimization_id` - Parent optimization run
- `inventory_item_id` - Product
- `current_price` - Current product price
- `recommended_price` - AI-recommended price
- `type` - Recommendation type (enum)
- `confidence_score` - Confidence level (0-100)
- `reasoning` - AI-generated explanation
- `data_points` - JSONB with supporting data
- `estimated_revenue_impact` - Expected revenue change
- `estimated_margin_impact` - Expected margin change
- `estimated_volume_impact` - Expected volume change (%)
- `risk_level` - Risk assessment (low/medium/high)
- `status` - Workflow status (pending/approved/rejected/applied/expired)
- `reviewed_by` / `reviewed_at` - Review tracking
- `review_notes` - Reviewer comments
- `applied_at` - When recommendation was applied

**Constraints:**
- Prices must be positive
- Confidence score 0-100
- Risk level in (low, medium, high)
- Status in (pending, approved, rejected, applied, expired)
- Review fields null/not-null consistency

**Indexes:**
- `idx_pricing_recommendation_optimization` - Parent lookup
- `idx_pricing_recommendation_product` - Product + status
- `idx_pricing_recommendation_status` - Status filtering
- `idx_pricing_recommendation_confidence` - High-confidence pending

**Example Data Points JSON:**
```json
{
  "price_diff_percentage": 12.5,
  "elasticity_coefficient": 1.8,
  "competitor_avg_price": 299.99,
  "cost_price": 200.00,
  "current_margin": 33.3,
  "projected_margin": 40.0,
  "sales_velocity_30d": 156,
  "stock_level": "high",
  "seasonality_factor": 1.15
}
```

---

### 5. `competitor_pricing`

**Purpose:** Competitor price tracking and market intelligence

**Key Columns:**
- `id` - Primary key
- `org_id` - Organization
- `inventory_item_id` - Matching product
- `competitor_name` - Competitor identifier
- `competitor_sku` - Competitor's SKU
- `competitor_price` - Competitor's price
- `currency` - Currency code
- `source_url` - URL where price was found
- `source_type` - Source (manual/scraper/api/feed)
- `scraping_config` - JSONB with scraper settings
- `scraped_at` - Data collection timestamp
- `verified_at` / `verified_by` - Manual verification
- `is_active` - Whether data is current
- `in_stock` - Availability status
- `stock_level` - Stock level (low/medium/high/out_of_stock)
- `metadata` - JSONB for additional data

**Constraints:**
- Competitor name required
- Price must be positive
- Stock level enum validation
- URL format validation

**Indexes:**
- `idx_competitor_pricing_product` - Product + active
- `idx_competitor_pricing_competitor` - Competitor grouping
- `idx_competitor_pricing_freshness` - Recent data

**Example Metadata JSON:**
```json
{
  "shipping_cost": 15.00,
  "free_shipping_threshold": 500.00,
  "customer_rating": 4.5,
  "review_count": 234,
  "delivery_days": 3,
  "warranty_months": 12,
  "promotional_badge": "Sale -20%"
}
```

---

### 6. `price_elasticity`

**Purpose:** Price elasticity coefficients for demand forecasting

**Key Columns:**
- `id` - Primary key
- `org_id` - Organization
- `inventory_item_id` - Product
- `price_point` - Price at which data was collected
- `quantity_sold` - Quantity sold at this price
- `revenue_generated` - Total revenue at this price
- `date_range_start` / `date_range_end` - Analysis period
- `elasticity_coefficient` - Calculated elasticity
- `confidence_level` - Statistical confidence (0-100)
- `sample_size` - Number of transactions
- `seasonal_factor` - Seasonality adjustment
- `promotional_active` - Whether promotion was running
- `competitor_price_avg` - Average competitor price during period
- `calculation_method` - Method used (linear_regression, etc.)
- `statistical_metrics` - JSONB with R², p-value, etc.
- `calculated_at` - Calculation timestamp

**Constraints:**
- Price point must be positive
- Quantity/revenue non-negative
- Valid date ranges
- Confidence level 0-100
- Sample size positive

**Indexes:**
- `idx_price_elasticity_product` - Product + date (DESC)
- `idx_price_elasticity_date_range` - Period queries
- `idx_price_elasticity_confidence` - High-confidence data

**Elasticity Interpretation:**
- `> 1.0` - Elastic (price-sensitive, lower price increases revenue)
- `< 1.0` - Inelastic (price-insensitive, can raise price)
- `= 1.0` - Unitary (proportional relationship)

**Example Statistical Metrics JSON:**
```json
{
  "r_squared": 0.87,
  "p_value": 0.001,
  "std_error": 0.12,
  "degrees_of_freedom": 28,
  "confidence_interval_95": [1.2, 2.1],
  "outliers_removed": 3,
  "data_quality_score": 92
}
```

---

### 7. `customer_pricing_tier`

**Purpose:** Customer-specific pricing tiers and discount levels

**Key Columns:**
- `id` - Primary key
- `org_id` - Organization
- `customer_id` - Customer reference
- `tier` - Price tier (enum)
- `discount_percentage` - Overall discount (0-100)
- `minimum_order_value` - Minimum order for tier
- `qualification_criteria` - JSONB with tier requirements
- `is_active` - Tier activation status
- `valid_from` / `valid_until` - Validity period
- `created_by` - User who assigned tier

**Constraints:**
- Discount percentage 0-99%
- Minimum order value positive
- Valid date ranges

**Indexes:**
- `idx_customer_pricing_tier_customer` - Customer + active
- `idx_customer_pricing_tier_tier` - Tier grouping

**Example Qualification Criteria JSON:**
```json
{
  "min_annual_volume": 100000,
  "min_relationship_months": 12,
  "min_order_frequency_per_month": 4,
  "payment_terms": "net30",
  "credit_rating": "A",
  "auto_renewal": true
}
```

---

### 8. `volume_pricing_tier`

**Purpose:** Volume-based pricing tiers for quantity discounts

**Key Columns:**
- `id` - Primary key
- `org_id` - Organization
- `inventory_item_id` - Product
- `tier_name` - Tier identifier
- `min_quantity` - Minimum quantity for tier
- `max_quantity` - Maximum quantity (null = unlimited)
- `unit_price` - Price per unit at this tier
- `discount_percentage` - Discount from base price
- `is_active` - Tier activation status

**Constraints:**
- Tier name required
- Min quantity positive
- Max quantity > min quantity
- Unit price positive
- Discount percentage 0-99%

**Indexes:**
- `idx_volume_pricing_tier_product` - Product + active + quantity

**Example:**
```
Product: Widget A (base price: $10)
Tier 1: 1-9 units   → $10.00 (0% discount)
Tier 2: 10-49 units → $9.50 (5% discount)
Tier 3: 50-99 units → $9.00 (10% discount)
Tier 4: 100+ units  → $8.50 (15% discount)
```

---

## Views

### `pricing_performance_summary`

**Purpose:** Consolidated pricing performance metrics per product

**Columns:**
- `inventory_item_id` - Product ID
- `org_id` - Organization
- `sku` - Product SKU
- `name` - Product name
- `category` - Product category
- `current_price` - Current selling price
- `cost_price` - Product cost
- `margin` - Absolute margin (price - cost)
- `margin_percentage` - Margin as percentage
- `price_changes_90d` - Price changes in last 90 days
- `last_price_change` - Most recent price
- `avg_competitor_price` - Average competitor price
- `min_competitor_price` - Lowest competitor price
- `pending_recommendations` - Count of pending recommendations
- `latest_elasticity` - Most recent elasticity coefficient

**Use Cases:**
- Dashboard summary views
- Price performance reports
- Competitive analysis
- Quick optimization candidates

---

## Functions

### 1. `calculate_optimal_price()`

**Signature:**
```sql
calculate_optimal_price(
    p_inventory_item_id uuid,
    p_strategy pricing_strategy DEFAULT 'cost_plus',
    p_constraints jsonb DEFAULT '{}'
) RETURNS numeric
```

**Purpose:** Calculate optimal price based on strategy and constraints

**Strategies:**

#### Cost Plus
- Formula: `cost_price * (1 + markup_percentage / 100)`
- Uses markup from pricing rule or defaults to 30%
- Simple, predictable pricing

#### Market Based
- Formula: `avg_competitor_price * 0.98`
- Prices just below market average
- Falls back to cost_plus if no competitor data

#### Competitive
- Formula: `min_competitor_price`
- Matches lowest competitor
- Falls back to cost_plus if no competitor data

#### Dynamic
- Uses elasticity coefficient
- Formula: `cost_price * (1 + (50 / elasticity) / 100)`
- If elastic (>1): lower price
- If inelastic (<1): higher price
- Falls back to cost_plus if no elasticity data

**Constraints Applied:**
1. Pricing rule min/max prices
2. JSON constraint: `min_margin_percentage`

**Returns:** Calculated price (rounded to 2 decimals)

**Example:**
```sql
-- Calculate dynamic price for product
SELECT calculate_optimal_price(
    'a1b2c3d4-...',
    'dynamic',
    '{"min_margin_percentage": 25}'::jsonb
);
-- Returns: 299.99
```

---

### 2. `get_price_for_customer()`

**Signature:**
```sql
get_price_for_customer(
    p_inventory_item_id uuid,
    p_customer_id uuid,
    p_quantity integer DEFAULT 1
) RETURNS numeric
```

**Purpose:** Get final price for customer considering tiers and volume

**Logic:**
1. Get base product price
2. Check customer pricing tier → apply tier discount
3. Check volume pricing tier → use volume price if available
4. Apply tier discount to final price
5. Return rounded price

**Precedence:**
- Volume pricing overrides base price
- Customer tier discount applies after volume pricing

**Example:**
```sql
-- Get price for VIP customer ordering 50 units
SELECT get_price_for_customer(
    'product-uuid',
    'customer-uuid',
    50
);
-- Base: $10, Volume (50): $9, VIP (10% off): $8.10
-- Returns: 8.10
```

---

### 3. `analyze_price_performance()`

**Signature:**
```sql
analyze_price_performance(
    p_inventory_item_id uuid,
    p_period_days integer DEFAULT 30
) RETURNS jsonb
```

**Purpose:** Analyze price performance over a period

**Returns JSON:**
```json
{
  "current_price": 299.99,
  "avg_price": 289.50,
  "price_changes": 3,
  "price_volatility": 12.45,
  "competitor_avg_price": 310.00,
  "competitor_position": "below_market",
  "period_days": 30,
  "analysis_timestamp": "2025-01-15T10:30:00Z"
}
```

**Competitor Positions:**
- `below_market` - Price < 90% of competitor avg
- `at_market` - Price within 90-110% of competitor avg
- `above_market` - Price > 110% of competitor avg
- `no_data` - No competitor data available

**Example:**
```sql
-- Analyze last 60 days
SELECT analyze_price_performance('product-uuid', 60);
```

---

### 4. `generate_pricing_recommendations()`

**Signature:**
```sql
generate_pricing_recommendations(
    p_org_id uuid,
    p_optimization_id uuid,
    p_params jsonb DEFAULT '{}'
) RETURNS integer
```

**Purpose:** Batch generate AI-powered pricing recommendations

**Algorithm:**
1. Loop through all active products in organization
2. Calculate optimal price using dynamic strategy
3. Calculate price difference percentage
4. Skip if change < 2% (minimal impact)
5. Determine recommendation type (increase/decrease)
6. Calculate confidence score (base 60 + bonuses):
   - +15 if elasticity data exists
   - +15 if competitor data exists
   - +10 if price history exists
7. Build reasoning text
8. Calculate risk level based on price change magnitude
9. Insert recommendation
10. Update optimization summary

**Returns:** Count of recommendations generated

**Risk Levels:**
- `high` - Price change > 15%
- `medium` - Price change > 8%
- `low` - Price change ≤ 8%

**Example:**
```sql
-- Generate recommendations for optimization run
SELECT generate_pricing_recommendations(
    'org-uuid',
    'optimization-uuid',
    '{}'::jsonb
);
-- Returns: 47 (47 recommendations created)
```

---

## Triggers

### 1. `update_*_updated_at`

**Tables:** All pricing tables
**Timing:** BEFORE UPDATE
**Function:** `update_updated_at_column()`
**Purpose:** Auto-update `updated_at` timestamp on row changes

### 2. `track_inventory_item_price_changes`

**Table:** `inventory_item`
**Timing:** AFTER UPDATE
**Function:** `track_price_changes()`
**Purpose:** Auto-create price history record when product price changes

**Logic:**
- Fires when `inventory_item.price` changes
- Creates `price_history` record with old/new prices
- Records change timestamp and user

### 3. Audit Triggers

**Tables:** `pricing_rule`, `pricing_optimization`, `pricing_recommendation`
**Timing:** AFTER INSERT/UPDATE/DELETE
**Function:** `audit_trigger_function()`
**Purpose:** Complete audit trail in `audit_log` table

---

## RLS Policies

### Required Policies (to be added to 0007_rls_policies.sql or new migration)

```sql
-- Enable RLS
ALTER TABLE pricing_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_optimization ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_recommendation ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_elasticity ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_pricing_tier ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_pricing_tier ENABLE ROW LEVEL SECURITY;

-- Organization isolation policy (same for all tables)
CREATE POLICY "pricing_org_isolation" ON pricing_rule
    FOR ALL USING (org_id = auth.user_org_id());

CREATE POLICY "price_history_org_isolation" ON price_history
    FOR ALL USING (org_id = auth.user_org_id());

-- (Repeat for all pricing tables)

-- Read-only access for non-admin roles
CREATE POLICY "pricing_recommendation_read" ON pricing_recommendation
    FOR SELECT USING (org_id = auth.user_org_id());

-- Admin/ops_manager can modify
CREATE POLICY "pricing_recommendation_write" ON pricing_recommendation
    FOR INSERT WITH CHECK (
        org_id = auth.user_org_id() AND
        auth.has_role(ARRAY['admin', 'ops_manager'])
    );
```

---

## Index Strategy

### Performance Optimization

1. **Lookup Indexes** - Fast single-record retrieval
   - Product ID lookups
   - Customer ID lookups
   - Organization scoping

2. **Range Indexes** - Time-series queries
   - Price history by date
   - Optimization runs by date
   - Validity period queries

3. **Filtering Indexes** - Common WHERE clause patterns
   - Active status filtering
   - Pending recommendations
   - High confidence scores

4. **Composite Indexes** - Multi-column queries
   - (org_id, is_active, priority)
   - (inventory_item_id, status)
   - (customer_id, is_active)

### Index Maintenance

```sql
-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'pricing%'
ORDER BY idx_scan DESC;

-- Rebuild indexes if needed
REINDEX TABLE pricing_rule;
REINDEX TABLE pricing_recommendation;
```

---

## Usage Examples

### Example 1: Create Cost-Plus Pricing Rule

```sql
INSERT INTO pricing_rule (
    org_id,
    name,
    strategy,
    category_id,
    markup_percentage,
    min_price,
    tier,
    is_active,
    priority,
    created_by
) VALUES (
    'org-uuid',
    'Electronics Standard Markup',
    'cost_plus',
    'electronics-category-uuid',
    35.00,  -- 35% markup
    10.00,  -- Minimum $10
    'standard',
    true,
    100,
    auth.uid()
);
```

### Example 2: Run Pricing Optimization

```sql
-- 1. Create optimization run
INSERT INTO pricing_optimization (
    org_id,
    name,
    description,
    analysis_period_start,
    analysis_period_end,
    target_categories,
    created_by
) VALUES (
    'org-uuid',
    'Q1 2025 Price Optimization',
    'Optimize pricing for all electronics based on Q4 2024 sales data',
    '2024-10-01',
    '2024-12-31',
    '["electronics-uuid", "appliances-uuid"]'::jsonb,
    auth.uid()
)
RETURNING id;

-- 2. Generate recommendations
SELECT generate_pricing_recommendations(
    'org-uuid',
    'optimization-id-from-above',
    '{}'::jsonb
);

-- 3. Review high-confidence recommendations
SELECT
    pr.id,
    ii.sku,
    ii.name,
    pr.current_price,
    pr.recommended_price,
    pr.type,
    pr.confidence_score,
    pr.reasoning,
    pr.estimated_margin_impact
FROM pricing_recommendation pr
JOIN inventory_item ii ON pr.inventory_item_id = ii.id
WHERE pr.optimization_id = 'optimization-id'
AND pr.confidence_score >= 80
AND pr.status = 'pending'
ORDER BY pr.confidence_score DESC, ABS(pr.estimated_margin_impact) DESC;

-- 4. Approve and apply recommendations
UPDATE pricing_recommendation
SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
WHERE id = 'recommendation-id';

-- Apply to product
UPDATE inventory_item
SET price = (SELECT recommended_price FROM pricing_recommendation WHERE id = 'recommendation-id')
WHERE id = (SELECT inventory_item_id FROM pricing_recommendation WHERE id = 'recommendation-id');

-- Mark as applied
UPDATE pricing_recommendation
SET status = 'applied', applied_at = now()
WHERE id = 'recommendation-id';
```

### Example 3: Add Competitor Pricing

```sql
INSERT INTO competitor_pricing (
    org_id,
    inventory_item_id,
    competitor_name,
    competitor_sku,
    competitor_price,
    source_url,
    source_type,
    in_stock,
    stock_level,
    metadata
) VALUES (
    'org-uuid',
    'product-uuid',
    'CompetitorCo',
    'COMP-SKU-123',
    289.99,
    'https://competitor.com/product/123',
    'scraper',
    true,
    'high',
    '{
        "shipping_cost": 15.00,
        "customer_rating": 4.3,
        "review_count": 156,
        "delivery_days": 2
    }'::jsonb
);
```

### Example 4: Calculate Customer Price

```sql
-- Add customer to VIP tier
INSERT INTO customer_pricing_tier (
    org_id,
    customer_id,
    tier,
    discount_percentage,
    is_active,
    created_by
) VALUES (
    'org-uuid',
    'customer-uuid',
    'vip',
    10.00,  -- 10% discount
    true,
    auth.uid()
);

-- Get price for 100 units
SELECT get_price_for_customer(
    'product-uuid',
    'customer-uuid',
    100
);
```

### Example 5: Price Performance Dashboard Query

```sql
SELECT
    pps.sku,
    pps.name,
    pps.current_price,
    pps.cost_price,
    pps.margin_percentage,
    pps.avg_competitor_price,
    CASE
        WHEN pps.current_price < pps.avg_competitor_price * 0.9 THEN 'Underpriced'
        WHEN pps.current_price > pps.avg_competitor_price * 1.1 THEN 'Overpriced'
        ELSE 'Competitive'
    END AS pricing_position,
    pps.price_changes_90d,
    pps.pending_recommendations,
    pps.latest_elasticity
FROM pricing_performance_summary pps
WHERE pps.org_id = 'org-uuid'
ORDER BY pps.margin_percentage ASC;
```

---

## Migration Deployment

### Prerequisites
- Migrations 0001-0012 must be applied
- PostgreSQL 12+ with uuid-ossp extension
- `inventory_item`, `customer`, `brand`, `supplier` tables must exist

### Deployment Steps

1. **Backup Database**
```bash
pg_dump -h localhost -U postgres -d mantis_db > backup_pre_pricing.sql
```

2. **Apply Migration**
```bash
psql -h localhost -U postgres -d mantis_db -f migrations/0013_pricing_optimization.sql
```

3. **Verify Tables Created**
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%pricing%'
ORDER BY tablename;
```

Expected output:
- competitor_pricing
- customer_pricing_tier
- price_elasticity
- price_history
- pricing_optimization
- pricing_recommendation
- pricing_rule
- volume_pricing_tier

4. **Verify Functions Created**
```sql
SELECT proname FROM pg_proc
WHERE proname LIKE '%pric%'
ORDER BY proname;
```

Expected output:
- analyze_price_performance
- calculate_optimal_price
- generate_pricing_recommendations
- get_price_for_customer
- track_price_changes

5. **Test Basic Functionality**
```sql
-- Test calculate_optimal_price
SELECT calculate_optimal_price(
    (SELECT id FROM inventory_item LIMIT 1),
    'cost_plus'
);

-- Should return a numeric price
```

### Rollback

```bash
# Run the down migration (at end of file)
psql -h localhost -U postgres -d mantis_db <<EOF
-- Copy "down" section from migration file
EOF
```

---

## Performance Considerations

### Query Optimization

1. **Always Use Indexes**
   - Filter by org_id first
   - Use indexed columns in WHERE clauses
   - Avoid functions on indexed columns

2. **Batch Operations**
   - Use `generate_pricing_recommendations()` for bulk analysis
   - Insert multiple recommendations in single transaction

3. **Partitioning** (Future Enhancement)
   - Consider partitioning `price_history` by date
   - Partition `pricing_recommendation` by optimization_id

### Monitoring Queries

```sql
-- Slow queries on pricing tables
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%pricing%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%pricing%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Security Considerations

1. **RLS Policies** - Must be added (see RLS Policies section)
2. **Function Security** - All functions are `SECURITY DEFINER` where needed
3. **Audit Logging** - All modifications logged to `audit_log`
4. **Data Encryption** - Sensitive fields should use application-level encryption
5. **API Access Control** - Implement role-based access in application layer

---

## Future Enhancements

### Phase 2 Features

1. **ML Model Integration**
   - Store trained model artifacts in `analysis_data` JSONB
   - Version control for ML models
   - A/B testing framework for pricing strategies

2. **Real-Time Pricing**
   - WebSocket triggers for price updates
   - Redis caching layer for high-frequency lookups
   - Event-driven price adjustments

3. **Advanced Analytics**
   - Market basket analysis for bundling
   - Customer lifetime value-based pricing
   - Demand forecasting integration

4. **Automation**
   - Scheduled optimization runs (cron jobs)
   - Auto-apply recommendations above confidence threshold
   - Price monitoring alerts

5. **Competitor Intelligence**
   - Automated web scraping framework
   - API integrations with price comparison services
   - Price change notifications

---

## Support & Maintenance

### Common Issues

**Issue:** Recommendations not generating
**Solution:** Check that products have valid cost_price and current price

**Issue:** Slow optimization runs
**Solution:** Add indexes on inventory_item filters, consider batching

**Issue:** Prices not respecting constraints
**Solution:** Verify pricing_rule priority and validity dates

### Maintenance Tasks

```sql
-- Weekly: Cleanup old recommendations
DELETE FROM pricing_recommendation
WHERE status IN ('rejected', 'expired')
AND created_at < now() - interval '90 days';

-- Monthly: Archive old price history
-- (Move to archive table or S3 for compliance)

-- Quarterly: Recalculate elasticity coefficients
-- (Run analysis jobs on historical sales data)

-- As needed: Refresh materialized views (if created)
REFRESH MATERIALIZED VIEW pricing_performance_summary_mv;
```

---

## Contact & Contributing

For issues, questions, or contributions related to this pricing system:
- Database Team: database@mantis.com
- Pricing Product Owner: pricing@mantis.com
- GitHub: https://github.com/mantis/pricing-optimization

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0
**Authors:** Data Oracle Team
**License:** Proprietary
