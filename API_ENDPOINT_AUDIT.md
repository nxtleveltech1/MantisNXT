# API Endpoint Audit - Complete Analysis

## Executive Summary

Found **8 API endpoints** with significant duplication and inconsistencies:
- **3 duplicate supplier endpoints** (2 correct, 1 mock data, 2 wrong schema)
- **3 duplicate inventory endpoints** (1 correct, 2 wrong schema)
- **Multiple response formats** causing frontend data transformation issues
- **Emergency endpoints using incorrect database schema**

---

## Supplier Endpoints

### 1. `/api/suppliers/route.ts` ✅ PRODUCTION
**Status**: Primary production endpoint
**Database**: Uses `core.supplier` table (correct schema)
**Features**:
- Advanced filtering (search, status, pagination)
- Cursor-based pagination support
- Performance monitoring
- Zod validation
- Response format: `{success, data, pagination}`

**Queries**:
```sql
SELECT supplier_id as id, name, code, active, contact_info, default_currency as currency
FROM core.supplier
```

---

### 2. `/api/core/suppliers/route.ts` ✅ PRODUCTION DUPLICATE
**Status**: **DUPLICATE** of `/api/suppliers`
**Database**: Uses `core.supplier` table (correct schema)
**Features**:
- Basic filtering (active only)
- Simple pagination
- Response format: `{success, data, count}`

**Queries**: Same table as `/api/suppliers`
```sql
SELECT supplier_id as id, name, code, active, contact_info
FROM core.supplier
```

**Recommendation**: **DELETE** - consolidate into `/api/suppliers`

---

### 3. `/api/v2/suppliers/route.ts` ⚠️ MOCK DATA
**Status**: **WRONG** - Returns hardcoded mock data
**Database**: Uses in-memory `mockSupplierData` array
**Features**:
- Comprehensive validation with Zod
- Advanced filtering
- Batch operations (PUT/DELETE)
- Response format: `{success, data: {suppliers, metrics}, pagination}`

**Data Source**:
```typescript
let mockSupplierData: EnhancedSupplier[] = [/* hardcoded data */]
```

**Recommendation**: **DELETE** or **CONVERT** to use real database

---

### 4. `/api/suppliers-emergency/route.ts` ❌ WRONG SCHEMA
**Status**: **WRONG** - Queries non-existent table
**Database**: Tries to use `suppliers` table (should be `core.supplier`)
**Features**:
- Emergency direct pool creation
- Response format: `{success, data: {suppliers, pagination}}`

**Queries**:
```sql
SELECT id, name, email, phone FROM suppliers  -- ❌ WRONG TABLE NAME
```

**Recommendation**: **DELETE** - uses incorrect schema, creates new pool each request (inefficient)

---

### 5. `/api/supplier-products/route.ts` ✅ PRODUCTION
**Status**: Correct - handles supplier products (different purpose)
**Database**: Uses `core.supplier_product` + joins
**Features**:
- Supplier product listing
- Advanced filtering
- Joins with `core.stock_on_hand`

**Recommendation**: **KEEP** - serves different purpose (product-level data)

---

## Inventory Endpoints

### 1. `/api/inventory/route.ts` ✅ PRODUCTION
**Status**: Primary production endpoint
**Database**: Uses `core.stock_on_hand` + `core.supplier_product` (correct schema)
**Features**:
- Advanced filtering
- Cursor and offset pagination
- Performance monitoring
- Slow query logging
- Response format: `{items, nextCursor}`

**Queries**:
```sql
SELECT soh.soh_id as id, sp.supplier_sku as sku, soh.qty as stock_qty
FROM core.stock_on_hand AS soh
JOIN core.supplier_product AS sp ON sp.supplier_product_id = soh.supplier_product_id
```

---

### 2. `/api/inventory-emergency/route.ts` ❌ WRONG SCHEMA
**Status**: **WRONG** - Queries non-existent table
**Database**: Tries to use `inventory_items` table (should be `core.stock_on_hand`)
**Features**:
- Emergency direct pool creation
- Response format: `{success, data: {inventory, summary, pagination}}`

**Queries**:
```sql
SELECT id, name, sku, stock_qty FROM inventory_items  -- ❌ WRONG TABLE NAME
```

**Recommendation**: **DELETE** - uses incorrect schema, creates new pool each request

---

### 3. `/api/inventory_items/route.ts` ❌ WRONG SCHEMA
**Status**: **WRONG** - Queries non-existent table
**Database**: Tries to use `inventory_items` + `suppliers` tables (should be `core.*`)
**Features**:
- Full CRUD operations (GET, POST, PUT)
- Comprehensive Zod validation
- Response format: `{success, data, pagination, summary}`

**Queries**:
```sql
SELECT i.*, s.name as supplier_name
FROM inventory_items i  -- ❌ WRONG TABLE NAME
LEFT JOIN suppliers s ON i.supplier_id = s.id  -- ❌ WRONG TABLE NAME
```

**Recommendation**: **DELETE** or **CONVERT** to use correct `core.*` schema

---

## Response Format Inconsistencies

### Current Formats Found:

1. **Format A** (used by `/api/suppliers`, `/api/core/suppliers`):
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 315,
    "totalPages": 7,
    "hasNext": true,
    "hasPrev": false
  }
}
```

2. **Format B** (used by `/api/inventory`):
```json
{
  "items": [...],
  "nextCursor": "sku|id"
}
```

3. **Format C** (used by `/api/v2/suppliers`):
```json
{
  "success": true,
  "data": {
    "suppliers": [...],
    "metrics": {...}
  },
  "pagination": {...}
}
```

4. **Format D** (used by emergency endpoints):
```json
{
  "success": true,
  "data": {
    "suppliers": [...],
    "pagination": {...}
  },
  "timestamp": "2025-01-13T..."
}
```

---

## Root Cause of Data Consistency Issues

### Issue 1: Multiple Response Formats
- Frontend components expect different formats per endpoint
- `EnhancedInventoryDashboard.tsx` had to handle 3+ different formats
- Led to "0 items" bug when format didn't match expectations

### Issue 2: Wrong Table Names
- Emergency endpoints query non-existent tables
- `suppliers` vs `core.supplier`
- `inventory_items` vs `core.stock_on_hand`

### Issue 3: Field Name Mismatches
- Database: `supplier_id` (UUID)
- Some APIs return: `id`
- Frontend expects: varies by component

---

## Recommended Actions

### Phase 1: Delete Wrong Endpoints (Immediate)
1. **DELETE** `/api/suppliers-emergency/route.ts` - wrong schema
2. **DELETE** `/api/inventory-emergency/route.ts` - wrong schema
3. **DELETE** `/api/inventory_items/route.ts` - wrong schema
4. **DELETE** `/api/v2/suppliers/route.ts` - mock data only

### Phase 2: Consolidate Duplicates
1. **DELETE** `/api/core/suppliers/route.ts` - duplicate of `/api/suppliers`
2. **KEEP** `/api/suppliers/route.ts` - primary endpoint
3. **KEEP** `/api/inventory/route.ts` - primary endpoint
4. **KEEP** `/api/supplier-products/route.ts` - unique purpose

### Phase 3: Create Unified Data Service
Create `src/lib/services/UnifiedDataService.ts` with:
- Single source of truth for all queries
- Standardized response format
- Centralized field mapping (snake_case → camelCase)
- Consistent pagination handling

### Phase 4: Standardize Response Format
**Recommended Standard Format:**
```typescript
{
  success: boolean;
  data: T | T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    cursor?: string;
  };
  meta?: {
    queryTime: number;
    filters: Record<string, any>;
  };
  error?: string;
  details?: string;
}
```

---

## Impact Assessment

### Files to Delete (4 files)
- `src/app/api/suppliers-emergency/route.ts`
- `src/app/api/inventory-emergency/route.ts`
- `src/app/api/inventory_items/route.ts`
- `src/app/api/v2/suppliers/route.ts`

### Files to Keep & Enhance (3 files)
- `src/app/api/suppliers/route.ts` - make primary
- `src/app/api/inventory/route.ts` - make primary
- `src/app/api/supplier-products/route.ts` - keep as-is

### Files to Create (1 file)
- `src/lib/services/UnifiedDataService.ts` - new service layer

### Frontend Files to Update (estimated 10-15 files)
- `src/components/inventory/EnhancedInventoryDashboard.tsx`
- `src/components/supplier-portfolio/EnhancedPricelistUpload.tsx`
- `src/lib/stores/inventory-store.ts`
- `src/lib/stores/supplier-store.ts`
- All components consuming these APIs

---

## Database Schema Reference

### Correct Production Schema:
```
core.supplier
  ├── supplier_id (uuid, PK)
  ├── name (text)
  ├── code (text)
  ├── active (boolean)
  ├── contact_info (jsonb)
  ├── default_currency (text)
  ├── payment_terms (text)
  └── tax_number (text)

core.supplier_product
  ├── supplier_product_id (uuid, PK)
  ├── supplier_id (uuid, FK → core.supplier)
  ├── product_id (uuid, FK → core.product)
  ├── supplier_sku (text)
  ├── name_from_supplier (text)
  └── pack_size (numeric)

core.stock_on_hand
  ├── soh_id (uuid, PK)
  ├── supplier_product_id (uuid, FK → core.supplier_product)
  ├── qty (numeric)
  └── unit_cost (numeric)
```

### ❌ Incorrect Tables (do not exist):
- `suppliers` - should be `core.supplier`
- `inventory_items` - should be `core.stock_on_hand`
- `mockSupplierData` - should query database

---

## Next Steps

1. ✅ Complete audit documentation
2. ⏳ Create unified data service
3. ⏳ Delete incorrect endpoints
4. ⏳ Update frontend components
5. ⏳ Test all changes
6. ⏳ Update API documentation
