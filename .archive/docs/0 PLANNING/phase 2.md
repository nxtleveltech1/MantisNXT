I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

I've completed a comprehensive audit of inventory calculations, metrics, and data flows across all API endpoints and the frontend hook. The analysis reveals **critical inconsistencies in turnover calculations**, **missing API endpoints**, **unused database tables**, and **duplicate business logic** scattered across multiple files.

**Critical Issues:**
1. **Hardcoded Turnover**: Analytics endpoint returns `avgTurnover = 4.2` (hardcoded)
2. **Mock Data**: Analytics endpoint mocks stock movements from `inventory_items.updated_at` instead of using `stock_movements` table
3. **Inconsistent Formulas**: Three different turnover calculation methods across endpoints
4. **Missing Endpoint**: Store expects `/api/inventory/movements` but it doesn't exist
5. **Wrong Endpoint Usage**: Store still uses deprecated `/api/inventory/items`
6. **Duplicate Logic**: Stock status derived in 4+ different places
7. **Unused Table**: `stock_movements` table exists but isn't used by analytics/trends endpoints

### Approach

I'll create a comprehensive Phase 2 review document that:

1. **Audits metric computations** in analytics and trends endpoints, documenting hardcoded values, mock data, and formula inconsistencies
2. **Verifies stock status and totals** in the main inventory route, comparing with analytics endpoint calculations
3. **Cross-checks store-derived values** in the useInventory hook, identifying normalization complexity and fallback logic
4. **Flags critical gaps** including missing endpoints, unused tables, no COGS tracking, and inconsistent calculations
5. **Provides remediation steps** with prioritized action items, code consolidation strategies, and proper turnover tracking implementation

The review will include specific file paths, line numbers, code examples, impact analysis, and a detailed migration plan to fix all identified issues.

### Reasoning

I read the four files specified by the user: `/api/inventory/analytics/route.ts`, `/api/inventory/trends/route.ts`, `/api/inventory/route.ts`, and `/hooks/useInventory.ts`. I then searched for references to `stock_movements` table across SQL files, read the database schema in `setup-database.sql`, examined the inventory store in `inventory-store.ts`, and discovered the detailed inventory endpoint at `/api/inventory/detailed/[itemId]/route.ts`. I used grep to find turnover/velocity calculations and traced the usage of `/api/inventory/items` endpoint. This comprehensive exploration revealed the full scope of calculation inconsistencies and architectural issues.

## Mermaid Diagram

sequenceDiagram
    participant UI as Dashboard UI
    participant Hook as useInventory Hook
    participant Store as Inventory Store
    participant API1 as /api/inventory
    participant API2 as /api/inventory/analytics
    participant API3 as /api/inventory/trends
    participant DB as Database
    participant SM as stock_movements table

    Note over UI,SM: CURRENT STATE (Broken)
    
    UI->>Hook: Request inventory data
    Hook->>API1: GET /api/inventory
    API1->>DB: Query inventory_items
    DB-->>API1: Return items
    API1-->>Hook: ✅ Real data
    
    UI->>Hook: Request metrics
    Hook->>API2: GET /api/inventory/analytics
    API2->>DB: Query inventory_items
    Note over API2: ❌ Hardcoded turnover = 4.2
    Note over API2: ❌ Mock movements from updated_at
    DB-->>API2: Return items
    API2-->>Hook: ❌ Fake turnover, mock movements
    
    UI->>Hook: Request trends
    Hook->>API3: GET /api/inventory/trends
    API3->>DB: Query inventory_items
    Note over API3: ❌ Formula: (itemCount/avgStock)*10
    Note over API3: ❌ Doesn't use stock_movements
    DB-->>API3: Return items
    API3-->>Hook: ❌ Wrong velocity calculation
    
    Note over SM: ⚠️ Table exists but unused!
    
    Note over UI,SM: FIXED STATE (After Remediation)
    
    UI->>Hook: Request inventory data
    Hook->>API1: GET /api/inventory
    API1->>DB: Query inventory_items
    DB-->>API1: Return items
    API1-->>Hook: ✅ Real data
    
    UI->>Hook: Request metrics
    Hook->>API2: GET /api/inventory/analytics
    API2->>DB: Query inventory_items
    API2->>SM: Query stock_movements
    Note over API2: ✅ Calculate real turnover from COGS
    SM-->>API2: Return movements
    DB-->>API2: Return items
    API2-->>Hook: ✅ Real turnover, real movements
    
    UI->>Hook: Request trends
    Hook->>API3: GET /api/inventory/trends
    API3->>DB: Query inventory_items
    API3->>SM: Query stock_movements
    Note over API3: ✅ Calculate velocity from consumption
    SM-->>API3: Return movements
    DB-->>API3: Return items
    API3-->>Hook: ✅ Accurate velocity & trends
    
    Note over SM: ✅ Table used for all calculations!

## Proposed File Changes

### INVENTORY_CALCULATIONS_REVIEW.md(NEW)

References: 

- src\app\api\inventory\analytics\route.ts
- src\app\api\inventory\trends\route.ts
- src\app\api\inventory\route.ts
- src\hooks\useInventory.ts
- src\lib\stores\inventory-store.ts
- src\app\api\inventory\detailed\[itemId]\route.ts
- scripts\setup-database.sql
- src\lib\cache\invalidation.ts
- INVENTORY_ALIGNMENT_REVIEW.md

Create a comprehensive Phase 2 review document analyzing inventory calculations, metrics, and data consistency:

# Inventory Calculations & Metrics Review
## Phase 2: Evaluate Inventory Calculations & Metrics

### Executive Summary

This review identifies **critical calculation inconsistencies**, **hardcoded metrics**, **unused database infrastructure**, and **duplicate business logic** across the inventory system. The most severe issue is that **turnover calculations are either hardcoded or use incorrect formulas**, making inventory analytics unreliable for business decisions.

**Severity**: 🔴 **CRITICAL** - Analytics data is not trustworthy

---

## 1. Metric Computation Analysis

### 1.1 Analytics Endpoint (`/api/inventory/analytics/route.ts`)

#### Issue 1: Hardcoded Turnover Rate

**Location**: `src/app/api/inventory/analytics/route.ts` line 62

```typescript
// Calculate average turnover (mock calculation based on data)
const avgTurnover = 4.2
```

**Impact**: 
- **CRITICAL**: All dashboard analytics show fake turnover data
- Business decisions based on this metric are invalid
- No way to track actual inventory performance
- Misleads stakeholders about inventory efficiency

**Root Cause**: No COGS (Cost of Goods Sold) tracking in the system

**Correct Formula**: `Turnover Rate = Annual COGS / Average Inventory Value`

---

#### Issue 2: Mock Stock Movements

**Location**: `src/app/api/inventory/analytics/route.ts` lines 33-46

```typescript
// Get recent stock movements (mock data since we don't have stock_movements table populated)
const recentMovementsQuery = `
  SELECT
    i.name as product_name,
    i.sku,
    i.stock_qty,
    i.updated_at as last_update,
    s.name as supplier_name,
    i.status
  FROM inventory_items i
  LEFT JOIN suppliers s ON i.supplier_id = s.id
  ORDER BY i.updated_at DESC
  LIMIT 10
`
```

**Problem**: 
- Queries `inventory_items.updated_at` instead of actual `stock_movements` table
- Shows "recent updates" not "recent movements"
- Doesn't show movement type (in/out/adjustment)
- Doesn't show quantity changes
- Comment admits it's mock data

**Evidence**: `stock_movements` table EXISTS in `scripts/setup-database.sql` lines 149-165 with proper structure:
```sql
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'transfer', 'adjustment'
    quantity INTEGER NOT NULL,
    cost DECIMAL(15,2),
    reason VARCHAR(255) NOT NULL,
    reference VARCHAR(255),
    ...
)
```

**Impact**:
- Users see fake "movement" data
- Can't track actual stock ins/outs
- Audit trail is incomplete
- Compliance issues for inventory tracking

---

#### Issue 3: Correct Metrics Calculation

**What Works Well**: Lines 7-17 calculate real metrics from database:

```typescript
SELECT
  COUNT(*) as total_items,
  COALESCE(SUM(stock_qty * cost_price), 0) as total_value,
  COUNT(*) FILTER (WHERE stock_qty <= reorder_point AND stock_qty > 0) as low_stock_count,
  COUNT(*) FILTER (WHERE stock_qty = 0) as out_of_stock_count,
  AVG(stock_qty * cost_price) as avg_item_value,
  COUNT(*) FILTER (WHERE status = 'active') as active_items,
  COUNT(*) FILTER (WHERE status != 'active') as inactive_items
FROM inventory_items
```

**These metrics are ACCURATE**:
- ✅ Total value calculation: `SUM(stock_qty * cost_price)`
- ✅ Low stock count: Uses `reorder_point` correctly
- ✅ Out of stock count: `stock_qty = 0`
- ✅ Active/inactive items: Based on status field

**Recommendation**: Keep this query structure, add turnover calculation

---

### 1.2 Trends Endpoint (`/api/inventory/trends/route.ts`)

#### Issue 4: Nonsensical Velocity Formula

**Location**: `src/app/api/inventory/trends/route.ts` lines 124-129

```typescript
// Calculate velocity trends (mock data based on stock levels)
const velocityTrends = categoryTrends.map(cat => ({
  category: cat.category,
  velocity: cat.avgStock > 100 ? 'high' : cat.avgStock > 50 ? 'medium' : cat.avgStock > 0 ? 'low' : 'dead',
  turnoverRate: cat.avgStock > 0 ? Math.min(100, (cat.itemCount / cat.avgStock) * 10) : 0,
  daysInStock: cat.avgStock > 0 ? Math.round(cat.totalStock / Math.max(1, cat.itemCount / 30)) : 0
}))
```

**Problems**:

1. **Velocity based on stock level**: `avgStock > 100 ? 'high'`
   - **WRONG**: High stock doesn't mean high velocity
   - Should be based on sales rate, not quantity on hand
   - Overstocked slow-moving items would show as "high velocity"

2. **Turnover formula is nonsense**: `(cat.itemCount / cat.avgStock) * 10`
   - Divides number of SKUs by average stock quantity
   - Multiplies by arbitrary constant 10
   - No relationship to actual turnover definition
   - Units don't make sense (SKUs per unit?)

3. **Days in stock calculation**: `totalStock / (cat.itemCount / 30)`
   - Assumes each item sells once per 30 days
   - No basis in actual sales data
   - Would be same for all categories

**Correct Formulas**:
```typescript
// Velocity should be based on consumption rate
velocity: dailySalesRate > threshold ? 'high' : 'medium' : 'low'

// Turnover should be annualized COGS / Avg Inventory
turnoverRate: (annualCOGS / avgInventoryValue)

// Days in stock should be from actual movement data
daysInStock: avgInventoryValue / (annualCOGS / 365)
```

---

#### Issue 5: Trend Calculations Without Historical Data

**Location**: `src/app/api/inventory/trends/route.ts` lines 8-20

```typescript
const stockLevelsResult = await query(`
  SELECT
    DATE(updated_at) as date,
    COUNT(*) as total_items,
    AVG(stock_qty) as avg_stock,
    SUM(CASE WHEN stock_qty = 0 THEN 1 ELSE 0 END) as out_of_stock,
    SUM(CASE WHEN stock_qty <= reorder_point THEN 1 ELSE 0 END) as low_stock
  FROM inventory_items
  WHERE updated_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(updated_at)
  ORDER BY date DESC
  LIMIT 30
`, [])
```

**Problem**: 
- Groups by `updated_at` date
- Only shows days when items were UPDATED, not actual daily snapshots
- If no items updated on a day, that day is missing from trends
- Doesn't show true daily inventory levels

**Fallback Logic** (lines 61-83): If no recent updates, creates single snapshot
- Better than nothing, but still not true trend data

**Correct Approach**: 
- Create daily snapshot table OR
- Calculate from `stock_movements` table OR
- Use time-series aggregation with window functions

---

### 1.3 Detailed Endpoint (`/api/inventory/detailed/[itemId]/route.ts`)

#### ✅ Issue 6: CORRECT Turnover Calculation (But Not Used Elsewhere)

**Location**: `src/app/api/inventory/detailed/[itemId]/route.ts` lines 298-299

```typescript
turnoverRate: totalConsumed > 0 && item.totalValue > 0 ?
  (totalConsumed * item.unitCost * 12) / item.totalValue : 0
```

**This is CORRECT**:
- Calculates annual COGS: `totalConsumed * item.unitCost * 12`
- Divides by current inventory value: `item.totalValue`
- Returns 0 if no consumption data

**Consumption Query** (lines 265-274):
```typescript
SELECT
  SUM(CASE WHEN movement_type IN ('sale', 'consumption', 'adjustment_out') THEN ABS(quantity) ELSE 0 END) as total_consumed,
  COUNT(CASE WHEN movement_type IN ('sale', 'consumption', 'adjustment_out') THEN 1 END) as consumption_transactions,
  AVG(CASE WHEN movement_type IN ('sale', 'consumption', 'adjustment_out') THEN ABS(quantity) END) as avg_consumption
FROM stock_movements
WHERE inventory_item_id = $1
  AND created_at >= $2
  AND movement_type IN ('sale', 'consumption', 'adjustment_out')
```

**This endpoint DOES use `stock_movements` table correctly!**

**Problem**: This correct calculation is ONLY in detailed endpoint, not in analytics/trends

**Recommendation**: Extract this logic to shared utility and use everywhere

---

## 2. Stock Status & Totals Verification

### 2.1 Main Inventory Route (`/api/inventory/route.ts`)

#### ✅ Metrics Query is Accurate

**Location**: `src/app/api/inventory/route.ts` lines 263-274

```typescript
const metricsQuery = `
  SELECT
    COUNT(*) as total_items,
    SUM(stock_qty * cost_price) as total_value,
    COUNT(*) FILTER (WHERE stock_qty <= reorder_point AND stock_qty > 0) as low_stock_items,
    COUNT(*) FILTER (WHERE stock_qty = 0) as out_of_stock_items,
    AVG(stock_qty * cost_price) as average_value
  FROM inventory_items
  WHERE status = 'active'
`
```

**Verification**: ✅ All calculations are correct
- Total value: Correctly multiplies quantity by cost
- Low stock: Correctly uses reorder point threshold
- Out of stock: Correctly checks for zero quantity
- Average value: Correctly averages item values

**Consistency Check**: Compare with analytics endpoint (lines 7-17)
- ✅ Same query structure
- ✅ Same calculation logic
- ✅ Both use `inventory_items` table
- ⚠️ Main route filters by `status = 'active'`, analytics doesn't

**Minor Inconsistency**: 
- Main route: `WHERE status = 'active'` (line 271)
- Analytics: No status filter
- **Impact**: Analytics includes inactive items in totals
- **Fix**: Add status filter to analytics query

---

#### Issue 7: Stock Status Derivation Duplicated

**Location 1**: `src/app/api/inventory/route.ts` line 377 (in POST handler)
```typescript
validatedData.currentStock > 0 ? 'active' : 'out_of_stock'
```

**Location 2**: `src/lib/stores/inventory-store.ts` lines 25-30
```typescript
const deriveStockStatus = (current: number, reorder: number, max: number) => {
  if (current <= 0) return 'out_of_stock';
  if (reorder > 0 && current <= reorder) return 'low_stock';
  if (max > 0 && current > max) return 'overstocked';
  return 'in_stock';
};
```

**Location 3**: `src/app/api/inventory/trends/route.ts` line 93 (health score calculation)
```typescript
healthScore: Math.max(0, 100 - (parseInt(row.low_stock_items) / parseInt(row.item_count)) * 100)
```

**Location 4**: `src/app/api/inventory/detailed/[itemId]/route.ts` lines 130-135
```typescript
CASE
  WHEN i.stock_qty = 0 THEN 'out_of_stock'
  WHEN i.stock_qty <= i.reorder_point THEN 'low_stock'
  WHEN i.max_stock > 0 AND i.stock_qty > i.max_stock THEN 'overstocked'
  ELSE 'in_stock'
END as stock_status
```

**Problem**: Same business logic implemented 4+ times
- Risk of inconsistency if one is updated
- Harder to maintain
- No single source of truth

**Recommendation**: Create shared utility function or database function

---

### 2.2 Available Stock Calculation

#### ✅ Database Computed Column

**Location**: `scripts/setup-database.sql` line 127

```sql
available_qty INTEGER GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED,
```

**This is CORRECT**: 
- ✅ Computed column automatically updates
- ✅ Always consistent with stock_qty and reserved_qty
- ✅ Stored (not virtual) so it's indexed and fast

**Verification**: Used correctly in main route (line 221)
```typescript
availableStock: item.available_qty,
```

---

#### ⚠️ Fallback Calculation in Store

**Location**: `src/lib/stores/inventory-store.ts` line 39

```typescript
const availableStock = toNumber(
  row.available_stock ?? 
  row.availableStock ?? 
  row.available_qty ?? 
  currentStock - reservedStock  // Fallback calculation
);
```

**Analysis**:
- Has fallback to manual calculation
- Needed because of field name inconsistencies (see Phase 1 review)
- Should not be necessary if API returns consistent format

**Recommendation**: Remove fallback once field names are standardized

---

## 3. Store-Derived Values Cross-Check

### 3.1 Hook Analysis (`src/hooks/useInventory.ts`)

#### Issue 8: Uses Wrong Endpoint

**Location**: `src/lib/stores/inventory-store.ts` line 151

```typescript
const response = await fetch(`/api/inventory/items?${params.toString()}`)
```

**Problem**: 
- Uses `/api/inventory/items` endpoint
- This endpoint was supposed to be merged with `/api/inventory` (per Phase 1 review)
- Creates confusion about which endpoint to use
- Both endpoints exist and return slightly different formats

**Evidence from Phase 1**: 
- `INVENTORY_ALIGNMENT_REVIEW.md` Section 3.1 documented this duplication
- Recommended merging into single endpoint

**Impact**:
- Developers don't know which endpoint to use
- Cache invalidation must target both endpoints (see `src/lib/cache/invalidation.ts` line 87)
- Double maintenance burden

**Fix**: Update store to use `/api/inventory` and deprecate `/api/inventory/items`

---

#### Issue 9: Complex Field Normalization

**Location**: `src/lib/stores/inventory-store.ts` lines 32-111

**The `normalizeInventoryRecord` function handles multiple field name variations**:

```typescript
const currentStock = toNumber(row.current_stock ?? row.currentStock ?? row.stock_qty);
const reservedStock = toNumber(row.reserved_stock ?? row.reservedStock ?? row.reserved_qty);
const costPerUnit = toNumber(
  row.cost_per_unit_zar ?? 
  row.costPerUnitZar ?? 
  row.cost_price ?? 
  row.unit_cost_zar
);
```

**Why This Exists**: 
- Different API endpoints return different field names
- `/api/inventory` returns camelCase
- `/api/inventory/items` returns snake_case
- Database uses snake_case
- Some fields have multiple aliases

**Problem**: 
- 80 lines of normalization code
- High complexity and maintenance burden
- Fragile - breaks if new field name added
- Performance overhead checking multiple properties

**Root Cause**: Inconsistent API response formats (documented in Phase 1)

**Recommendation**: 
- Standardize API responses to single format (camelCase)
- Remove normalization logic from store
- Store should receive clean, consistent data

---

#### Issue 10: Duplicate Stock Status Logic

**Location**: `src/lib/stores/inventory-store.ts` lines 25-30

```typescript
const deriveStockStatus = (current: number, reorder: number, max: number) => {
  if (current <= 0) return 'out_of_stock';
  if (reorder > 0 && current <= reorder) return 'low_stock';
  if (max > 0 && current > max) return 'overstocked';
  return 'in_stock';
};
```

**Then used in normalization** (line 98):
```typescript
stock_status: row.stock_status ?? deriveStockStatus(currentStock, reorderPoint, maxStock),
```

**Problem**: 
- Same logic as in detailed endpoint (SQL CASE statement)
- Frontend shouldn't derive business logic
- Should come from API
- Creates inconsistency risk

**Recommendation**: 
- API should always return `stock_status`
- Remove derivation from store
- If API doesn't return it, fix API not store

---

### 3.2 Hook Metrics Fetching

#### Issue 11: Separate Metrics Hook

**Location**: `src/hooks/useInventory.ts` lines 250-292

```typescript
export function useInventoryMetrics() {
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null)
  // ...
  const response = await fetch('/api/inventory/analytics')
  // ...
}
```

**Analysis**:
- Separate hook for metrics
- Fetches from `/api/inventory/analytics`
- Main hook also receives metrics in response (line 108-110)

**Potential Issue**: 
- Two sources of metrics data
- Could be out of sync
- Unclear which to use

**Recommendation**: 
- Use metrics from main inventory response
- Only use separate hook if metrics needed without full inventory list
- Document when to use which

---

## 4. Critical Gaps & Missing Functionality

### Gap 1: Missing Stock Movements API Endpoint

**Expected**: `/api/inventory/movements` or `/api/stock-movements`

**Evidence**: 
- Store tries to fetch from `/api/inventory/movements` (line 201 in `inventory-store.ts`)
- No such route exists in codebase
- `stock_movements` table exists in database
- Detailed endpoint queries table directly

**Impact**:
- Can't view stock movement history in UI
- No audit trail for inventory changes
- Compliance issues
- Can't track who made adjustments

**Required Functionality**:
```typescript
GET /api/stock-movements
  ?item_id=uuid          // Filter by item
  ?movement_type=in|out  // Filter by type
  ?date_from=date        // Date range
  ?date_to=date
  ?limit=20
  ?offset=0

POST /api/stock-movements
  // Create new movement (adjustment, transfer, etc.)

GET /api/stock-movements/[id]
  // Get single movement details
```

**Recommendation**: Create this endpoint in next sprint

---

### Gap 2: No COGS Tracking

**Problem**: System doesn't track Cost of Goods Sold

**Evidence**:
- No `sales` or `cogs` fields in `inventory_items` table
- No integration with `sales_order_items` table
- Turnover calculation requires COGS but it's not tracked
- Analytics endpoint hardcodes turnover because real data doesn't exist

**What's Missing**:
1. Link between `sales_order_items` and `stock_movements`
2. Automatic COGS calculation when items are sold
3. Historical COGS tracking for trend analysis
4. COGS by category/supplier reporting

**Current Workaround**: Detailed endpoint uses `stock_movements` with type 'sale' or 'consumption'
- This works IF movements are created when sales happen
- No evidence this integration exists

**Recommendation**: 
- Add trigger: When `sales_order_item` created → create `stock_movement` with type 'sale'
- Add COGS calculation to `inventory_items` or create `inventory_analytics` table
- Track monthly COGS for trend analysis

---

### Gap 3: Stock Movements Table Not Used by Analytics

**Evidence**:
- Analytics endpoint: Mocks movements from `inventory_items.updated_at` (line 33-46)
- Trends endpoint: Doesn't query `stock_movements` at all
- Only detailed endpoint uses it correctly (lines 216-254)

**Impact**:
- Analytics show fake data
- Can't calculate real velocity
- Can't calculate real turnover
- Can't show consumption trends

**Why This Happened**: 
- Comment in analytics endpoint: "mock data since we don't have stock_movements table populated"
- Table exists but might be empty
- No integration to populate it

**Recommendation**:
1. Verify if `stock_movements` table has data
2. If empty, create data population mechanism
3. Update analytics endpoint to use real movements
4. Update trends endpoint to calculate from movements

---

### Gap 4: No Daily Inventory Snapshots

**Problem**: Trends endpoint can't show true daily inventory levels

**Current Approach**: Groups by `updated_at` date
- Only shows days when items were updated
- Missing days have no data
- Can't show true trend over time

**Solutions**:

**Option A**: Create `inventory_snapshots` table
```sql
CREATE TABLE inventory_snapshots (
  id UUID PRIMARY KEY,
  item_id UUID REFERENCES inventory_items(id),
  snapshot_date DATE NOT NULL,
  stock_qty INTEGER,
  reserved_qty INTEGER,
  available_qty INTEGER,
  cost_price DECIMAL(15,2),
  total_value DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(item_id, snapshot_date)
);
```
- Run daily job to snapshot all inventory
- Query this table for trends

**Option B**: Calculate from `stock_movements`
```sql
-- Reconstruct inventory level at any date
SELECT 
  item_id,
  SUM(CASE 
    WHEN movement_type IN ('in', 'purchase') THEN quantity
    WHEN movement_type IN ('out', 'sale') THEN -quantity
    ELSE 0
  END) as stock_qty
FROM stock_movements
WHERE created_at <= '2024-01-01'
GROUP BY item_id
```
- More accurate
- No additional storage
- Slower query performance

**Recommendation**: Implement Option A for performance

---

### Gap 5: Inconsistent Calculation Methods

**Summary of Inconsistencies**:

| Metric | Analytics Endpoint | Trends Endpoint | Detailed Endpoint | Correct? |
|--------|-------------------|-----------------|-------------------|----------|
| **Turnover Rate** | Hardcoded `4.2` | `(itemCount/avgStock)*10` | `(COGS*12)/avgValue` | ✅ Detailed |
| **Stock Status** | Not calculated | Health score formula | SQL CASE statement | ✅ Detailed |
| **Velocity** | Not calculated | Based on stock level | Based on consumption | ✅ Detailed |
| **Movements** | Mock from updated_at | Not used | Real from table | ✅ Detailed |
| **Days in Stock** | Not calculated | Mock formula | From consumption rate | ✅ Detailed |

**Pattern**: Detailed endpoint has correct implementations, others don't

**Root Cause**: 
- Detailed endpoint was built later with proper design
- Analytics/trends endpoints built earlier with shortcuts
- No refactoring to align them

**Recommendation**: Extract logic from detailed endpoint to shared utilities

---

## 5. Remediation Plan

### Priority 1: CRITICAL (Fix Immediately)

#### Action 1.1: Remove Hardcoded Turnover

**File**: `src/app/api/inventory/analytics/route.ts`

**Change**: Replace line 62
```typescript
// OLD
const avgTurnover = 4.2

// NEW
const avgTurnover = await calculateAverageTurnover(pool)
```

**Create utility**: `src/lib/utils/inventory-calculations.ts`
```typescript
export async function calculateAverageTurnover(pool: Pool): Promise<number> {
  const query = `
    SELECT 
      COALESCE(
        SUM(sm.quantity * sm.cost) * 12 / NULLIF(SUM(i.stock_qty * i.cost_price), 0),
        0
      ) as avg_turnover
    FROM inventory_items i
    LEFT JOIN stock_movements sm ON sm.item_id = i.id
      AND sm.movement_type IN ('sale', 'consumption')
      AND sm.created_at >= NOW() - INTERVAL '30 days'
    WHERE i.status = 'active'
  `
  const result = await pool.query(query)
  return parseFloat(result.rows[0].avg_turnover || '0')
}
```

**Estimated Effort**: 2 hours

---

#### Action 1.2: Use Real Stock Movements

**File**: `src/app/api/inventory/analytics/route.ts`

**Change**: Replace lines 33-46
```typescript
// OLD: Mock movements from inventory_items
const recentMovementsQuery = `
  SELECT i.name, i.updated_at as last_update
  FROM inventory_items i
  ORDER BY i.updated_at DESC
  LIMIT 10
`

// NEW: Real movements from stock_movements table
const recentMovementsQuery = `
  SELECT
    sm.id,
    sm.movement_type,
    sm.quantity,
    sm.created_at,
    i.name as product_name,
    i.sku,
    s.name as supplier_name,
    u.first_name || ' ' || u.last_name as user_name
  FROM stock_movements sm
  JOIN inventory_items i ON sm.item_id = i.id
  LEFT JOIN suppliers s ON i.supplier_id = s.id
  LEFT JOIN users u ON sm.user_id = u.id
  ORDER BY sm.created_at DESC
  LIMIT 10
`
```

**Update response mapping**: Lines 79-87
```typescript
recentMovements: recentMovementsResult.rows.map(row => ({
  id: row.id,
  date: row.created_at,
  type: row.movement_type,
  quantity: row.quantity,
  product: row.product_name,
  sku: row.sku,
  supplier: row.supplier_name,
  user: row.user_name
}))
```

**Estimated Effort**: 1 hour

---

#### Action 1.3: Fix Velocity Calculation

**File**: `src/app/api/inventory/trends/route.ts`

**Change**: Replace lines 124-129
```typescript
// OLD: Nonsensical formula
const velocityTrends = categoryTrends.map(cat => ({
  velocity: cat.avgStock > 100 ? 'high' : 'medium',
  turnoverRate: (cat.itemCount / cat.avgStock) * 10,
  daysInStock: cat.totalStock / (cat.itemCount / 30)
}))

// NEW: Based on actual consumption
const velocityQuery = `
  SELECT
    i.category,
    SUM(sm.quantity) as total_consumed,
    AVG(i.stock_qty * i.cost_price) as avg_inventory_value,
    CASE
      WHEN SUM(sm.quantity) * i.cost_price * 12 / NULLIF(AVG(i.stock_qty * i.cost_price), 0) > 8 THEN 'high'
      WHEN SUM(sm.quantity) * i.cost_price * 12 / NULLIF(AVG(i.stock_qty * i.cost_price), 0) > 4 THEN 'medium'
      WHEN SUM(sm.quantity) * i.cost_price * 12 / NULLIF(AVG(i.stock_qty * i.cost_price), 0) > 0 THEN 'low'
      ELSE 'dead'
    END as velocity,
    (SUM(sm.quantity) * i.cost_price * 12) / NULLIF(AVG(i.stock_qty * i.cost_price), 0) as turnover_rate,
    AVG(i.stock_qty * i.cost_price) / NULLIF((SUM(sm.quantity) * i.cost_price / 30), 0) as days_in_stock
  FROM inventory_items i
  LEFT JOIN stock_movements sm ON sm.item_id = i.id
    AND sm.movement_type IN ('sale', 'consumption')
    AND sm.created_at >= NOW() - INTERVAL '30 days'
  WHERE i.category IS NOT NULL
  GROUP BY i.category
`
```

**Estimated Effort**: 3 hours

---

### Priority 2: HIGH (Fix This Sprint)

#### Action 2.1: Create Stock Movements API Endpoint

**Create**: `src/app/api/stock-movements/route.ts`

Refer to `src/app/api/inventory/detailed/[itemId]/route.ts` lines 216-254 for query structure.

**Implement**:
- GET: List movements with filters (item_id, type, date range)
- POST: Create new movement (adjustments, transfers)
- Include pagination
- Include user tracking

**Estimated Effort**: 4 hours

---

#### Action 2.2: Create Shared Calculation Utilities

**Create**: `src/lib/utils/inventory-calculations.ts`

**Extract from** `src/app/api/inventory/detailed/[itemId]/route.ts`:
- `calculateTurnoverRate()` (lines 298-299)
- `calculateConsumptionRate()` (lines 265-280)
- `calculateStockoutRisk()` (lines 296-297)
- `deriveStockStatus()` (lines 130-135)

**Use in**:
- Analytics endpoint
- Trends endpoint
- Main inventory route
- Remove from store

**Estimated Effort**: 3 hours

---

#### Action 2.3: Fix Store to Use Correct Endpoint

**File**: `src/lib/stores/inventory-store.ts`

**Change**: Line 151
```typescript
// OLD
const response = await fetch(`/api/inventory/items?${params.toString()}`)

// NEW
const response = await fetch(`/api/inventory?${params.toString()}`)
```

**Then deprecate**: `src/app/api/inventory/items/route.ts`
- Add deprecation warning
- Update all references
- Remove in next major version

**Estimated Effort**: 2 hours

---

#### Action 2.4: Add Status Filter to Analytics

**File**: `src/app/api/inventory/analytics/route.ts`

**Change**: Line 16
```typescript
// Add WHERE clause
FROM inventory_items
WHERE status = 'active'  -- Add this line
```

**Reason**: Consistency with main inventory route (line 271 in `route.ts`)

**Estimated Effort**: 15 minutes

---

### Priority 3: MEDIUM (Next Sprint)

#### Action 3.1: Implement COGS Tracking

**Create trigger**: `database/migrations/003_cogs_tracking.sql`

```sql
-- Add COGS fields to inventory_items
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cogs_last_30_days DECIMAL(15,2) DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cogs_last_12_months DECIMAL(15,2) DEFAULT 0;

-- Create function to update COGS
CREATE OR REPLACE FUNCTION update_inventory_cogs()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.movement_type IN ('sale', 'consumption') THEN
    UPDATE inventory_items
    SET 
      cogs_last_30_days = (
        SELECT COALESCE(SUM(quantity * cost), 0)
        FROM stock_movements
        WHERE item_id = NEW.item_id
          AND movement_type IN ('sale', 'consumption')
          AND created_at >= NOW() - INTERVAL '30 days'
      ),
      cogs_last_12_months = (
        SELECT COALESCE(SUM(quantity * cost), 0)
        FROM stock_movements
        WHERE item_id = NEW.item_id
          AND movement_type IN ('sale', 'consumption')
          AND created_at >= NOW() - INTERVAL '12 months'
      )
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_cogs_on_movement
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_inventory_cogs();
```

**Estimated Effort**: 4 hours

---

#### Action 3.2: Create Daily Inventory Snapshots

**Create table**: `database/migrations/004_inventory_snapshots.sql`

```sql
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  stock_qty INTEGER NOT NULL,
  reserved_qty INTEGER NOT NULL,
  available_qty INTEGER NOT NULL,
  cost_price DECIMAL(15,2) NOT NULL,
  total_value DECIMAL(15,2) NOT NULL,
  stock_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id, snapshot_date)
);

CREATE INDEX idx_snapshots_date ON inventory_snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshots_item_date ON inventory_snapshots(item_id, snapshot_date DESC);
```

**Create cron job**: `scripts/daily-inventory-snapshot.js`

```javascript
// Run daily at midnight
const snapshotQuery = `
  INSERT INTO inventory_snapshots (
    organization_id, item_id, snapshot_date,
    stock_qty, reserved_qty, available_qty,
    cost_price, total_value, stock_status
  )
  SELECT
    organization_id, id, CURRENT_DATE,
    stock_qty, reserved_qty, available_qty,
    cost_price, stock_qty * cost_price,
    status
  FROM inventory_items
  WHERE status = 'active'
  ON CONFLICT (item_id, snapshot_date) DO UPDATE
  SET
    stock_qty = EXCLUDED.stock_qty,
    reserved_qty = EXCLUDED.reserved_qty,
    available_qty = EXCLUDED.available_qty,
    cost_price = EXCLUDED.cost_price,
    total_value = EXCLUDED.total_value,
    stock_status = EXCLUDED.stock_status
`
```

**Update trends endpoint** to query snapshots instead of inventory_items

**Estimated Effort**: 6 hours

---

#### Action 3.3: Consolidate Stock Status Logic

**Create database function**: `database/migrations/005_stock_status_function.sql`

```sql
CREATE OR REPLACE FUNCTION calculate_stock_status(
  p_stock_qty INTEGER,
  p_reorder_point INTEGER,
  p_max_stock INTEGER
) RETURNS VARCHAR(50) AS $
BEGIN
  IF p_stock_qty <= 0 THEN
    RETURN 'out_of_stock';
  ELSIF p_reorder_point > 0 AND p_stock_qty <= p_reorder_point THEN
    RETURN 'low_stock';
  ELSIF p_max_stock > 0 AND p_stock_qty > p_max_stock THEN
    RETURN 'overstocked';
  ELSE
    RETURN 'in_stock';
  END IF;
END;
$ LANGUAGE plpgsql IMMUTABLE;
```

**Update all queries** to use this function:
```sql
SELECT
  *,
  calculate_stock_status(stock_qty, reorder_point, max_stock) as stock_status
FROM inventory_items
```

**Remove from**:
- `src/lib/stores/inventory-store.ts` lines 25-30
- `src/app/api/inventory/route.ts` line 377
- `src/app/api/inventory/detailed/[itemId]/route.ts` lines 130-135

**Estimated Effort**: 3 hours

---

### Priority 4: LOW (Backlog)

#### Action 4.1: Simplify Store Normalization

Once API responses are standardized (from Phase 1), remove complex normalization logic from `inventory-store.ts` lines 32-111.

**Estimated Effort**: 2 hours

---

#### Action 4.2: Add Integration Tests

Create tests to verify:
- Turnover calculations match across endpoints
- Stock status derivation is consistent
- Metrics totals are accurate
- Movements are tracked correctly

**Estimated Effort**: 4 hours

---

## 6. Testing Strategy

### Unit Tests

**Test**: `src/lib/utils/inventory-calculations.test.ts`

```typescript
describe('calculateTurnoverRate', () => {
  it('should calculate correct turnover rate', () => {
    const cogs = 120000 // Annual COGS
    const avgInventoryValue = 30000
    const turnover = calculateTurnoverRate(cogs, avgInventoryValue)
    expect(turnover).toBe(4.0) // 120000 / 30000 = 4x per year
  })

  it('should return 0 when inventory value is 0', () => {
    const turnover = calculateTurnoverRate(120000, 0)
    expect(turnover).toBe(0)
  })
})

describe('deriveStockStatus', () => {
  it('should return out_of_stock when quantity is 0', () => {
    expect(deriveStockStatus(0, 10, 100)).toBe('out_of_stock')
  })

  it('should return low_stock when at reorder point', () => {
    expect(deriveStockStatus(10, 10, 100)).toBe('low_stock')
  })

  it('should return overstocked when above max', () => {
    expect(deriveStockStatus(150, 10, 100)).toBe('overstocked')
  })

  it('should return in_stock for normal levels', () => {
    expect(deriveStockStatus(50, 10, 100)).toBe('in_stock')
  })
})
```

---

### Integration Tests

**Test**: `tests/api/inventory-calculations.test.ts`

```typescript
describe('Inventory Calculations Consistency', () => {
  it('should return same metrics from /api/inventory and /api/inventory/analytics', async () => {
    const inventoryResponse = await fetch('/api/inventory')
    const inventoryData = await inventoryResponse.json()

    const analyticsResponse = await fetch('/api/inventory/analytics')
    const analyticsData = await analyticsResponse.json()

    // Compare metrics
    expect(inventoryData.metrics.totalValue).toBeCloseTo(analyticsData.data.totalValue, 2)
    expect(inventoryData.metrics.lowStockItems).toBe(analyticsData.data.lowStockCount)
    expect(inventoryData.metrics.outOfStockItems).toBe(analyticsData.data.outOfStockCount)
  })

  it('should calculate turnover consistently across endpoints', async () => {
    const analyticsResponse = await fetch('/api/inventory/analytics')
    const analyticsData = await analyticsResponse.json()

    const detailedResponse = await fetch('/api/inventory/detailed/[itemId]')
    const detailedData = await detailedResponse.json()

    // Both should use same calculation method
    expect(typeof analyticsData.data.avgTurnover).toBe('number')
    expect(typeof detailedData.data.predictiveAnalytics.turnoverRate).toBe('number')
    expect(analyticsData.data.avgTurnover).toBeGreaterThan(0)
  })
})
```

---

## 7. Migration Checklist

### Phase 2A: Fix Critical Calculations (Week 1)

- [ ] Create `src/lib/utils/inventory-calculations.ts` utility file
- [ ] Extract turnover calculation from detailed endpoint
- [ ] Extract stock status logic to database function
- [ ] Update analytics endpoint to use real turnover calculation
- [ ] Update analytics endpoint to use real stock movements
- [ ] Add status filter to analytics query
- [ ] Test analytics endpoint returns accurate data
- [ ] Deploy to staging
- [ ] Verify dashboard shows real metrics

### Phase 2B: Fix Trends & Velocity (Week 2)

- [ ] Update trends endpoint velocity calculation
- [ ] Update trends endpoint to use stock_movements table
- [ ] Test trends endpoint with real data
- [ ] Update frontend charts to handle new data format
- [ ] Deploy to staging
- [ ] Verify trend charts show accurate data

### Phase 2C: Create Missing Endpoints (Week 3)

- [ ] Create `/api/stock-movements` route
- [ ] Implement GET with filters
- [ ] Implement POST for creating movements
- [ ] Add pagination support
- [ ] Update store to use new endpoint
- [ ] Test movement tracking in UI
- [ ] Deploy to staging

### Phase 2D: COGS Tracking (Week 4)

- [ ] Create migration for COGS fields
- [ ] Create trigger to update COGS on movements
- [ ] Backfill historical COGS data
- [ ] Update analytics to use real COGS
- [ ] Test turnover calculations with real COGS
- [ ] Deploy to staging
- [ ] Monitor COGS accuracy

### Phase 2E: Daily Snapshots (Week 5)

- [ ] Create inventory_snapshots table
- [ ] Create daily snapshot cron job
- [ ] Backfill 30 days of snapshots
- [ ] Update trends endpoint to use snapshots
- [ ] Test trend accuracy
- [ ] Deploy to production
- [ ] Monitor snapshot job

---

## 8. Success Metrics

### Before Fix

- ❌ Turnover rate: Hardcoded `4.2`
- ❌ Stock movements: Mock data from updated_at
- ❌ Velocity: Based on stock level (wrong)
- ❌ Trends: Missing days, incomplete data
- ❌ Calculations: Inconsistent across endpoints

### After Fix

- ✅ Turnover rate: Calculated from real COGS
- ✅ Stock movements: Real data from stock_movements table
- ✅ Velocity: Based on consumption rate
- ✅ Trends: Complete daily data from snapshots
- ✅ Calculations: Consistent, using shared utilities

### KPIs

- **Data Accuracy**: 100% of metrics calculated from real data
- **Calculation Consistency**: Same formula used across all endpoints
- **Code Duplication**: Reduce from 4+ implementations to 1 shared utility
- **API Response Time**: < 200ms for analytics endpoint
- **Trend Completeness**: 100% of days in 30-day period have data

---

## 9. Risk Assessment

### High Risk

**Risk**: `stock_movements` table is empty
- **Impact**: Can't calculate real turnover/velocity
- **Mitigation**: Check table, create data population mechanism
- **Contingency**: Keep fallback calculations until data exists

**Risk**: COGS tracking breaks existing workflows
- **Impact**: Sales orders might fail
- **Mitigation**: Thorough testing, gradual rollout
- **Contingency**: Feature flag to disable COGS tracking

### Medium Risk

**Risk**: Performance degradation from complex queries
- **Impact**: Slow dashboard load times
- **Mitigation**: Add indexes, use snapshots table
- **Contingency**: Cache results, optimize queries

**Risk**: Frontend breaks when API format changes
- **Impact**: Dashboard shows errors
- **Mitigation**: Maintain backward compatibility
- **Contingency**: Version API endpoints

### Low Risk

**Risk**: Historical data inconsistency
- **Impact**: Trends show gaps
- **Mitigation**: Backfill snapshots
- **Contingency**: Show "data unavailable" message

---

## 10. Conclusion

The inventory calculation system has **critical reliability issues** that make analytics data untrustworthy. The hardcoded turnover rate and mock movement data mean that business decisions are being made on fake metrics.

**Immediate Actions Required**:
1. Remove hardcoded turnover (2 hours)
2. Use real stock movements (1 hour)
3. Fix velocity calculation (3 hours)

**Total Immediate Effort**: 6 hours (1 day)

**Full Remediation Effort**: 31 hours (4 days)

**Business Impact**: 
- **Before**: Analytics show fake data, can't trust inventory metrics
- **After**: Real-time accurate analytics, reliable business intelligence

**Recommendation**: Prioritize Phase 2A (Critical Calculations) for immediate deployment, then proceed with remaining phases over next 4 weeks.

Refer to specific file paths and line numbers throughout this document when implementing fixes.