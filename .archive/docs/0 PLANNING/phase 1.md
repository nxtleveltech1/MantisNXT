I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

I've completed a comprehensive audit of the inventory system's data alignment, schema consistency, API endpoints, and integration flows. The analysis reveals **critical schema fragmentation**, **API endpoint duplication**, **field naming inconsistencies**, and **integration layer mismatches** that require immediate attention.

**Key Issues Identified:**
1. **Schema Chaos**: `inventory_items` (plural) vs `inventory_item` (singular), missing tables referenced by integration layer
2. **Dual APIs**: `/api/inventory` and `/api/inventory/items` doing similar work with different transformations
3. **Field Name Anarchy**: snake_case, camelCase, and multiple aliases for same fields
4. **Broken Integration**: `inventory-integration.ts` expects tables that don't exist
5. **No Allocation Mechanism**: Only supplier ownership via foreign key, no explicit allocation
6. **Computed Field Drift**: `available_qty` computed in DB vs manually calculated in store


### Approach

I'll create a comprehensive review document that:

1. **Maps the current schema landscape** - documenting all table variations and their locations
2. **Traces data flow** - from supplier uploads through to inventory display
3. **Identifies inconsistencies** - between schema files, migrations, API routes, and integration layers
4. **Documents field name variations** - cataloging all aliases and transformations
5. **Analyzes supplier-inventory linkage** - current implementation vs expected behavior
6. **Proposes normalization strategy** - concrete steps to consolidate and align the system

The review will be structured as a detailed markdown document with sections for each major finding, including code references, impact analysis, and prioritized recommendations.


### Reasoning

I explored the repository structure comprehensively, reading the database setup script (`setup-database.sql`), migration files (`0002_supply_chain_corrected.sql`, `0011_enhanced_inventory_system.sql`), API route handlers (`/api/inventory/route.ts`, `/api/inventory/items/route.ts`), the inventory store (`inventory-store.ts`), and the integration layer (`inventory-integration.ts`). I searched for all references to inventory tables across the codebase using grep patterns, discovering widespread use of `inventory_items` (plural) in API routes while migrations define `inventory_item` (singular). I traced database connection patterns and identified multiple schema definitions in different directories that don't align with each other.


## Proposed File Changes

### INVENTORY_ALIGNMENT_REVIEW.md(NEW)

References: 

- scripts\setup-database.sql
- migrations\0002_supply_chain_corrected.sql
- migrations\0011_enhanced_inventory_system.sql
- src\lib\stores\inventory-store.ts
- src\app\api\inventory\route.ts
- src\app\api\inventory\items\route.ts
- src\lib\integrations\inventory-integration.ts

Create a comprehensive inventory system review document with the following structure:

# Inventory System Alignment Review
## Phase 1: Data Alignment & Source of Truth

### Executive Summary
Document critical findings about schema fragmentation, API duplication, and integration mismatches.

### 1. Schema Landscape Analysis

#### 1.1 Table Name Inconsistency
- **Finding**: `inventory_items` (plural) used in `scripts/setup-database.sql` and most API routes
- **Finding**: `inventory_item` (singular) defined in `migrations/0002_supply_chain_corrected.sql` and `migrations/0011_enhanced_inventory_system.sql`
- **Impact**: Queries will fail if migrations are run but APIs expect plural table name
- **Evidence**: Reference `scripts/setup-database.sql` line 112, `migrations/0002_supply_chain_corrected.sql` line 85, and 50+ API route queries

#### 1.2 Missing Tables Referenced by Integration Layer
- **Finding**: `src/lib/integrations/inventory-integration.ts` expects tables that don't exist:
  - `products` table (lines 294, 318) - not in setup-database.sql or migrations
  - `categories` table (lines 83, 109) - not in any migration
  - `brands` table (lines 139, 162) - exists in migration 0011 as `brand` (singular) but not in setup-database.sql
  - `inventory_balances` table (lines 454, 456) - not in any schema
  - `inventory_movements` table (line 423) - exists as `stock_movements` in setup-database.sql
- **Impact**: Integration layer will fail completely if used
- **Root Cause**: Integration layer was built for a different schema version

#### 1.3 Schema Version Fragmentation
Document three competing schema versions:
1. **`scripts/setup-database.sql`**: Simple schema with `inventory_items`, `suppliers`, `stock_movements`
2. **Migration files**: Enhanced schema with `inventory_item`, `brand`, `supplier_product`, `stock_level`, `price_list`
3. **`database/schema/` files**: References `products` table and different structure entirely

**Recommendation**: Determine which schema is actually deployed in production and deprecate others.

### 2. Supplier → Product → Inventory Linkage

#### 2.1 Current Implementation
- **Direct Foreign Key**: `inventory_items.supplier_id → suppliers.id` (setup-database.sql line 120)
- **One-to-Many**: Each inventory item belongs to ONE supplier
- **No Allocation**: Supplier owns the inventory item, no separate allocation mechanism

#### 2.2 Enhanced Schema (Migration 0011)
- **Many-to-Many**: `supplier_product` table (lines 282-306) allows multiple suppliers per item
- **Fields**: supplier_sku, cost_price, lead_time_days, minimum_order_quantity, is_preferred
- **Status**: Table defined but NOT used by any API routes

#### 2.3 Data Flow Gaps
- **Supplier Upload**: Files uploaded via `/api/suppliers/pricelists/import`
- **Processing**: Multiple processors exist (`BulkPriceListProcessor.ts`, `PriceListProcessor.ts`)
- **Destination**: Unclear - some reference `products` table, others `inventory_items`
- **Gap**: No clear pipeline from supplier pricelist → inventory_items

**Recommendation**: Define explicit data flow and implement missing pipeline steps.

### 3. API Endpoint Inconsistencies

#### 3.1 Duplicate Endpoints
**`/api/inventory` (route.ts)**:
- Queries: `SELECT i.*, s.name as supplier_name FROM inventory_items i LEFT JOIN suppliers s`
- Returns: Transformed data with `currentStock`, `reservedStock`, `availableStock` (camelCase)
- Calculates: Metrics (total_value, low_stock_items, out_of_stock_items)
- Response structure: Complex nested objects with locations array

**`/api/inventory/items` (items/route.ts)**:
- Queries: Same query structure `SELECT i.*, s.name as supplier_name FROM inventory_items i LEFT JOIN suppliers s`
- Returns: Different transformation with `current_stock`, `reserved_stock`, `available_stock` (snake_case)
- Response structure: Flatter structure with product and supplier objects

**Issue**: Both endpoints do similar work but return different formats, causing confusion.

**Recommendation**: 
- Merge into single endpoint with format parameter, OR
- Clearly separate: `/api/inventory` for UI display, `/api/inventory/items` for raw data access

#### 3.2 Field Name Transformation Chaos

**Database Schema** (setup-database.sql):
```sql
stock_qty INTEGER
reserved_qty INTEGER
available_qty INTEGER GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED
cost_price DECIMAL(15,2)
sale_price DECIMAL(15,2)
```

**API Route `/api/inventory`** transforms to:
```typescript
currentStock: item.stock_qty
reservedStock: item.reserved_qty
availableStock: item.available_qty
unitCost: item.cost_price
unitPrice: item.sale_price
```

**API Route `/api/inventory/items`** transforms to:
```typescript
current_stock: currentStock
reserved_stock: reservedStock
available_stock: availableStock
cost_per_unit_zar: costPerUnit
```

**Inventory Store** (`inventory-store.ts`) normalizes BOTH:
```typescript
const currentStock = toNumber(row.current_stock ?? row.currentStock ?? row.stock_qty)
const reservedStock = toNumber(row.reserved_stock ?? row.reservedStock ?? row.reserved_qty)
const costPerUnit = toNumber(row.cost_per_unit_zar ?? row.costPerUnitZar ?? row.cost_price ?? row.unit_cost_zar)
```

**Impact**: 
- Complex normalization logic required in store (lines 32-111)
- High risk of bugs when adding new fields
- Difficult to maintain and debug

**Recommendation**: Standardize on snake_case in database, transform to camelCase at API boundary ONCE.

### 4. Inventory Calculation Issues

#### 4.1 Available Quantity Computation

**Database (setup-database.sql line 127)**:
```sql
available_qty INTEGER GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED
```
- Computed column, always accurate
- Automatically updated when stock_qty or reserved_qty changes

**BUT Migration 0002 (line 85-116)** does NOT have this computed column:
```sql
quantity_on_hand integer DEFAULT 0,
quantity_reserved integer DEFAULT 0,
-- No computed available quantity!
```

**Store Calculation** (inventory-store.ts line 39):
```typescript
const availableStock = toNumber(row.available_stock ?? row.availableStock ?? row.available_qty ?? currentStock - reservedStock)
```
- Falls back to manual calculation if DB column missing
- Risk of calculation drift

**Recommendation**: Use DB computed columns consistently OR remove from DB and always calculate in application.

#### 4.2 Stock Status Derivation

**Store Logic** (inventory-store.ts lines 25-30):
```typescript
const deriveStockStatus = (current: number, reorder: number, max: number) => {
  if (current <= 0) return 'out_of_stock';
  if (reorder > 0 && current <= reorder) return 'low_stock';
  if (max > 0 && current > max) return 'overstocked';
  return 'in_stock';
};
```

**API Route `/api/inventory`** (route.ts lines 171-196):
- Sorts by stock status but doesn't derive it
- Relies on database `status` field

**API Route `/api/inventory/items`** (items/route.ts lines 12-17):
- Has same derivation logic
- Duplicated code

**Recommendation**: Create shared utility function or use database view/function for consistent status calculation.

### 5. Integration Layer Analysis

#### 5.1 Supabase vs Pool Connection

**Integration Layer** (`inventory-integration.ts` line 65):
```typescript
this.supabase = createClient()
```
- Uses Supabase client
- Expects Supabase-specific table structure
- References tables: `categories`, `brands`, `products`, `inventory_balances`, `inventory_movements`, `supplier_product`

**API Routes** (e.g., `inventory/route.ts` line 2):
```typescript
import { pool } from '@/lib/database/unified-connection'
```
- Use PostgreSQL pool directly
- Query `inventory_items`, `suppliers`, `stock_movements`

**Mismatch**: Integration layer and API routes expect completely different schemas.

**Recommendation**: Rebuild integration layer to match actual database schema or migrate database to match integration layer expectations.

#### 5.2 Unused Integration Functions

The following functions in `inventory-integration.ts` will fail:
- `findOrCreateCategory()` - `categories` table doesn't exist
- `findOrCreateBrand()` - `brands` table doesn't exist (only `brand` in migration 0011)
- `createInventoryItem()` - calls RPC `create_inventory_item_with_balance` that doesn't exist
- `getInventoryItemBySku()` - queries `products` table that doesn't exist
- `bulkUpsertInventoryItems()` - would fail due to schema mismatch

**Impact**: Any code calling these functions will fail.

**Recommendation**: Audit all callers of integration layer functions and either fix or remove.

### 6. Supplier Allocation Design

#### 6.1 Current State: No Allocation Mechanism

**What Exists**:
- `inventory_items.supplier_id` foreign key (ownership)
- Each item belongs to ONE supplier
- No concept of "allocating" inventory TO a supplier

**What's Missing**:
- No way to reserve inventory for specific supplier orders
- No way to track which supplier will fulfill which customer order
- No consignment inventory tracking

#### 6.2 Potential Allocation Models

**Option A: Reservation System**
- Add `allocated_to_supplier_id` and `allocated_qty` to `inventory_items`
- Track which supplier has reserved quantities
- Use case: Multi-supplier fulfillment

**Option B: Consignment Tracking**
- Add `ownership_type` ENUM ('owned', 'consignment')
- Track supplier-owned inventory in your warehouse
- Use case: Supplier consignment stock

**Option C: Supplier Product Mapping** (Already in Migration 0011)
- Use existing `supplier_product` table
- Track which suppliers can supply which items
- Add `allocated_qty` to track allocations
- Use case: Multi-sourcing strategy

**Recommendation**: Clarify business requirements for "allocation" before implementing.

### 7. Normalization & Deduplication Strategy

#### 7.1 Schema Consolidation Plan

**Step 1: Determine Production Schema**
- Query production database to see which tables actually exist
- Check if `inventory_items` (plural) or `inventory_item` (singular)
- Document actual column names and types

**Step 2: Choose Target Schema**
- **Option A**: Keep `setup-database.sql` as source of truth (simpler)
- **Option B**: Migrate to enhanced schema from migration 0011 (more features)
- **Recommendation**: Option B for long-term scalability

**Step 3: Create Migration Path**
- If using `inventory_items` (plural), create migration to rename to `inventory_item` (singular)
- Add missing tables from migration 0011: `brand`, `supplier_product`, `stock_level`, `price_list`
- Migrate data from old structure to new

**Step 4: Update All Code References**
- Update all API routes to use singular `inventory_item`
- Update integration layer to match actual schema
- Remove references to non-existent tables

#### 7.2 API Endpoint Consolidation

**Merge `/api/inventory` and `/api/inventory/items`**:

```typescript
// Single endpoint with format parameter
GET /api/inventory?format=display  // Returns camelCase for UI
GET /api/inventory?format=raw      // Returns snake_case for integrations
```

**OR Separate Clearly**:
```typescript
GET /api/inventory              // UI-optimized, transformed data
GET /api/inventory/raw          // Raw database format
GET /api/inventory/analytics    // Aggregated metrics
```

#### 7.3 Field Name Standardization

**Database Layer**: Always snake_case
```sql
stock_qty, reserved_qty, cost_price, sale_price
```

**API Response Layer**: Transform to camelCase at boundary
```typescript
// In api-helpers.ts
export function transformInventoryItem(dbRow: DatabaseInventoryItem): InventoryItem {
  return {
    id: dbRow.id,
    sku: dbRow.sku,
    currentStock: dbRow.stock_qty,
    reservedStock: dbRow.reserved_qty,
    availableStock: dbRow.available_qty,
    costPrice: dbRow.cost_price,
    salePrice: dbRow.sale_price,
    // ... etc
  };
}
```

**Store Layer**: Remove normalization logic, expect consistent format
```typescript
// No more: row.current_stock ?? row.currentStock ?? row.stock_qty
// Just: item.currentStock (always camelCase from API)
```

### 8. Priority Recommendations

#### Critical (Fix Immediately)
1. **Resolve table name conflict**: Determine if production uses `inventory_items` or `inventory_item`
2. **Fix integration layer**: Update to match actual schema or mark as deprecated
3. **Document actual data flow**: Map supplier upload → inventory pipeline

#### High Priority (Fix This Sprint)
4. **Merge duplicate API endpoints**: Consolidate `/api/inventory` and `/api/inventory/items`
5. **Standardize field names**: Implement consistent transformation layer
6. **Add computed column**: Ensure `available_qty` is computed in DB everywhere

#### Medium Priority (Next Sprint)
7. **Implement supplier allocation**: Define requirements and implement chosen model
8. **Migrate to enhanced schema**: Use migration 0011 as target
9. **Create integration tests**: Verify schema consistency across layers

#### Low Priority (Backlog)
10. **Remove orphaned schemas**: Delete unused schema files in `database/schema/`
11. **Add schema documentation**: Generate ERD and maintain in docs
12. **Implement schema versioning**: Track which version is deployed

### 9. Testing Recommendations

#### Schema Validation Tests
```typescript
// Test that all API routes query existing tables
// Test that all foreign keys are valid
// Test that computed columns work correctly
```

#### Integration Tests
```typescript
// Test supplier upload → inventory creation flow
// Test inventory calculations (available_qty)
// Test stock status derivation consistency
```

#### Data Consistency Tests
```typescript
// Test that both API endpoints return same underlying data
// Test that store normalization handles all field variations
// Test that integration layer functions work with actual schema
```

### 10. Migration Checklist

- [ ] Audit production database schema
- [ ] Choose target schema (setup-database.sql vs migration 0011)
- [ ] Create migration script for table renames
- [ ] Update all API routes to use consistent table names
- [ ] Implement field name transformation layer
- [ ] Merge duplicate API endpoints
- [ ] Fix or remove integration layer
- [ ] Add computed columns consistently
- [ ] Implement supplier allocation (if required)
- [ ] Create integration tests
- [ ] Update documentation
- [ ] Deploy and verify

### Conclusion

The inventory system suffers from **schema fragmentation**, **API duplication**, and **integration layer mismatches** that create significant technical debt and risk. The root cause is incomplete migrations and parallel development on different schema versions.

**Immediate Action Required**: Determine which schema is in production and align all code to that schema. Then plan migration to enhanced schema if needed.

**Estimated Effort**: 2-3 sprints to fully resolve all issues.

Refer to the specific file paths and line numbers throughout this document when implementing fixes.