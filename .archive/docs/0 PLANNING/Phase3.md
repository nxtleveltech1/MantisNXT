I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

I've completed a comprehensive audit of supplier inventory allocation coverage, bulk operations, and UI flows. The analysis reveals **a complete absence of supplier-specific allocation/reservation mechanisms** despite the existence of generic `reserved_qty` fields.

**Critical Findings:**
1. **No Allocation System**: No tables, fields, or code linking `reserved_qty` to specific suppliers
2. **Limited Bulk Operations**: Only adjustments, reorder points, and locations - no allocation operations
3. **Read-Only UI**: SupplierInventoryView displays data but has no allocation controls
4. **Relationship Gap**: `suppliers → products → inventory_items` via SKU, but no allocation link
5. **Business Logic Missing**: No consignment tracking, multi-supplier allocation, or reservation audit trail

The system tracks **product ownership** (which supplier supplies a product) but not **inventory allocation** (which supplier has reserved/allocated quantities).

### Approach

I'll create a comprehensive Phase 3 review document that:

1. **Audits current allocation coverage** - documenting the complete absence of supplier-specific allocation/reservation mechanisms
2. **Reviews bulk operations** - analyzing the POST handler's three operations (stock_adjustment, reorder_point_update, location_update) and identifying missing allocation operations
3. **Inspects UI flows** - examining SupplierInventoryView.tsx to document the read-only nature and lack of allocation features
4. **Recommends allocation/reservation design** - proposing four distinct allocation models with detailed technical specifications, database schemas, API designs, and UI requirements
5. **Provides implementation roadmap** - with prioritized phases, effort estimates, and migration strategies

The review will include specific code references, database schema proposals, API endpoint specifications, and UI mockup descriptions to enable immediate implementation.

### Reasoning

I read the three files specified by the user: the supplier inventory API route (`/api/suppliers/[id]/inventory/route.ts`), the UI component (`SupplierInventoryView.tsx`), and the inventory store (`inventory-store.ts`). I then examined the database schema in `setup-database.sql` to understand the current table structure. I used grep to search for allocation-related code across SQL and TypeScript files, discovering that `reserved_qty` exists but isn't linked to suppliers, and that references to `quantity_allocated` only exist in unused migration files. I analyzed the API endpoint's GET handler (lines 49-410) which provides read-only supplier inventory views, and the POST handler (lines 413-525) which supports only three bulk operations. I examined the UI component structure and confirmed it's display-only with no allocation features.

## Mermaid Diagram

sequenceDiagram
    participant User as User/UI
    participant API as Supplier Inventory API
    participant DB as Database
    participant Alloc as inventory_allocations
    participant Items as inventory_items
    
    Note over User,Items: CURRENT STATE (No Allocation)
    
    User->>API: GET /api/suppliers/[id]/inventory
    API->>DB: Query inventory_items + products + suppliers
    Note over DB: JOIN via SKU matching
    DB-->>API: Return inventory with reserved_qty
    Note over API: ❌ reserved_qty not linked to supplier
    API-->>User: Show inventory (generic reservations)
    
    User->>API: POST bulk operation (stock_adjustment)
    API->>Items: UPDATE stock_qty
    Note over Items: ❌ No allocation tracking
    Items-->>API: Success
    API-->>User: Confirmation
    
    Note over User,Items: PROPOSED STATE (With Allocation)
    
    User->>API: POST allocate_to_supplier
    API->>Items: Check available_qty
    Items-->>API: Available: 500 units
    
    alt Sufficient Quantity
        API->>Alloc: INSERT allocation record
        Note over Alloc: supplier_id, item_id, qty=100<br/>reference, expires_at
        Alloc-->>API: Allocation created
        
        API->>Items: Trigger updates allocated_qty
        Note over Items: allocated_qty += 100<br/>available_qty recalculated
        Items-->>API: Updated
        
        API-->>User: ✅ Allocation successful
    else Insufficient Quantity
        API-->>User: ❌ Error: Insufficient quantity
    end
    
    User->>API: GET /api/inventory/allocations?supplier_id=X
    API->>Alloc: Query allocations
    Alloc-->>API: Return allocation history
    API-->>User: Show allocation audit trail
    
    User->>API: POST deallocate_from_supplier
    API->>Alloc: UPDATE status = 'released'
    Alloc-->>API: Released
    
    API->>Items: Trigger updates allocated_qty
    Note over Items: allocated_qty -= 100<br/>available_qty recalculated
    Items-->>API: Updated
    
    API-->>User: ✅ Deallocation successful
    
    Note over User,Items: Automatic Expiration
    
    loop Daily Cron Job
        API->>Alloc: Find expired allocations
        Alloc-->>API: Expired allocations list
        API->>Alloc: UPDATE status = 'expired'
        API->>Items: Trigger updates allocated_qty
        Note over Items: Release expired allocations
    end

## Proposed File Changes

### INVENTORY_SUPPLIER_ALLOCATION_REVIEW.md(NEW)

References: 

- src\app\api\suppliers\[id]\inventory\route.ts
- src\components\inventory\SupplierInventoryView.tsx
- src\lib\stores\inventory-store.ts
- scripts\setup-database.sql
- migrations\0011_enhanced_inventory_system.sql
- INVENTORY_ALIGNMENT_REVIEW.md
- INVENTORY_CALCULATIONS_REVIEW.md

Create a comprehensive Phase 3 review document analyzing supplier inventory allocation coverage, bulk operations, UI flows, and providing detailed allocation/reservation system design recommendations:

# Inventory Supplier Allocation Review
## Phase 3: Supplier Allocation & Inventory Association

### Executive Summary

This review identifies a **critical gap in the inventory system**: there is **NO supplier-specific allocation or reservation mechanism**. While the system tracks which supplier supplies which products, it does not track which supplier has allocated or reserved specific inventory quantities.

**Current State**: Product ownership only (supplier → product relationship)
**Missing**: Inventory allocation (supplier → inventory quantity relationship)

**Severity**: 🟡 **MEDIUM** - System functions but lacks advanced supplier inventory management

---

## 1. Current Implementation Analysis

### 1.1 Database Schema Review

#### Current Relationships

**From** `scripts/setup-database.sql`:

```sql
-- Suppliers table (lines 82-106)
CREATE TABLE suppliers (
  id UUID PRIMARY KEY,
  organization_id UUID,
  name VARCHAR(255),
  -- ... other fields
  status VARCHAR(50) DEFAULT 'active'
);

-- Inventory items table (lines 112-143)
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY,
  organization_id UUID,
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),  -- Line 120: Direct supplier link
  stock_qty INTEGER DEFAULT 0,                -- Line 125: Total stock
  reserved_qty INTEGER DEFAULT 0,             -- Line 126: Generic reservation
  available_qty INTEGER GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED,  -- Line 127: Computed
  -- ... other fields
);
```

**What Exists**:
- ✅ `inventory_items.supplier_id` - Links item to ONE supplier (product ownership)
- ✅ `inventory_items.reserved_qty` - Generic reservation quantity
- ✅ `inventory_items.available_qty` - Computed as `stock_qty - reserved_qty`

**What's Missing**:
- ❌ No link between `reserved_qty` and specific suppliers
- ❌ No `inventory_allocations` table
- ❌ No `supplier_allocations` table
- ❌ No `consignment_inventory` table
- ❌ No audit trail for who reserved what

#### Relationship Model

```
suppliers (id)
    ↓ (via supplier_id)
products (supplier_id, sku)
    ↓ (via SKU matching)
inventory_items (sku, supplier_id)
```

**Problem**: This model only tracks **product ownership**, not **inventory allocation**.

**Example Scenario**:
- Supplier A supplies Product X
- Inventory has 100 units of Product X
- 20 units are reserved (`reserved_qty = 20`)
- **Question**: Who reserved those 20 units? Supplier A? A customer? Another supplier?
- **Answer**: Unknown - no tracking mechanism exists

---

### 1.2 API Endpoint Analysis

#### GET `/api/suppliers/[id]/inventory` (Lines 49-410)

**Purpose**: Retrieve supplier-specific inventory view

**Query Structure** (lines 92-140):
```sql
WITH supplier_inventory AS (
  SELECT
    i.id,
    i.sku,
    i.stock_qty as current_stock,
    i.reserved_qty as reserved_stock,
    i.available_qty as available_stock,
    -- ... other fields
  FROM inventory_items i
  LEFT JOIN products p ON i.sku = p.sku
  LEFT JOIN suppliers s ON p.supplier_id = s.id
  WHERE s.id = $1  -- Filter by supplier
)
```

**What It Does**:
- ✅ Shows all inventory items supplied by a specific supplier
- ✅ Displays stock quantities (current, reserved, available)
- ✅ Calculates metrics (total value, low stock count, etc.)
- ✅ Provides stock alerts
- ✅ Optionally includes recent movements

**What It Doesn't Do**:
- ❌ Doesn't show supplier-specific allocations
- ❌ Doesn't track which supplier reserved quantities
- ❌ Doesn't support consignment inventory
- ❌ Doesn't show multi-supplier scenarios

**Response Structure** (lines 234-261):
```typescript
interface SupplierInventoryItem {
  id: string
  sku: string
  product: { ... }
  inventory: {
    currentStock: number
    reservedStock: number      // Generic - not supplier-specific
    availableStock: number
    reorderPoint: number
    // ... other fields
  }
  supplier: {
    leadTimeDays: number
    minimumOrderQuantity: number
    unitPrice: number
  }
}
```

**Gap**: `reservedStock` is shown but there's no indication of:
- Who reserved it (supplier, customer, internal)
- When it was reserved
- For what purpose (order, consignment, allocation)
- Expiration date of reservation

---

#### POST `/api/suppliers/[id]/inventory` (Lines 413-525)

**Purpose**: Bulk inventory operations for supplier-specific items

**Supported Operations** (lines 442-486):

**1. Stock Adjustment** (lines 443-456):
```typescript
case 'stock_adjustment':
  await client.query(
    `UPDATE inventory_items
     SET stock_qty = stock_qty + $1,
         available_qty = available_qty + $1,
         updated_at = NOW()
     WHERE id = $2 AND EXISTS (
       SELECT 1 FROM products p
       WHERE p.sku = inventory_items.sku
       AND p.supplier_id = $3
     )`,
    [item.adjustment, item.itemId, supplierId]
  )
  break
```

**Analysis**:
- ✅ Adjusts stock quantity
- ✅ Verifies supplier ownership via subquery
- ✅ Updates `available_qty` automatically (computed column)
- ⚠️ Doesn't create stock movement record
- ❌ Doesn't support allocation-specific adjustments

**2. Reorder Point Update** (lines 458-469):
```typescript
case 'reorder_point_update':
  await client.query(
    `UPDATE inventory_items
     SET reorder_point = $1, updated_at = NOW()
     WHERE id = $2 AND EXISTS (...)
    `,
    [item.reorderPoint, item.itemId, supplierId]
  )
  break
```

**Analysis**:
- ✅ Updates reorder threshold
- ✅ Verifies supplier ownership
- ✅ Simple and safe operation

**3. Location Update** (lines 471-482):
```typescript
case 'location_update':
  await client.query(
    `UPDATE inventory_items
     SET location = $1, updated_at = NOW()
     WHERE id = $2 AND EXISTS (...)
    `,
    [item.location, item.itemId, supplierId]
  )
  break
```

**Analysis**:
- ✅ Updates warehouse location
- ✅ Verifies supplier ownership
- ⚠️ Single location only (no multi-location support)

**Missing Operations**:
- ❌ `allocate_to_supplier` - Reserve quantity for specific supplier
- ❌ `deallocate_from_supplier` - Release supplier allocation
- ❌ `transfer_allocation` - Move allocation between suppliers
- ❌ `consignment_in` - Receive consignment inventory
- ❌ `consignment_out` - Return consignment inventory
- ❌ `reserve_for_order` - Reserve for supplier purchase order

**Transaction Safety** (lines 432, 505, 514):
```typescript
await client.query('BEGIN')      // Line 432
// ... operations ...
await client.query('COMMIT')     // Line 505
// OR
await client.query('ROLLBACK')   // Line 514 on error
```

**Analysis**:
- ✅ Uses transactions for atomicity
- ✅ Rolls back on error
- ✅ Processes items in loop with individual error handling
- ⚠️ Continues processing after individual item errors (doesn't fail fast)

**Validation Issues**:

1. **No Quantity Validation** (line 444):
```typescript
SET stock_qty = stock_qty + $1  // What if this goes negative?
```
- Missing: `CHECK (stock_qty >= 0)` enforcement
- Missing: Validation that adjustment doesn't create negative stock

2. **No Allocation Validation**:
- Missing: Check if allocated quantity exceeds available stock
- Missing: Check if deallocation would make reserved_qty negative

3. **No Audit Trail**:
- Missing: Record of who made the change
- Missing: Reason for adjustment
- Missing: Reference to source document (PO, SO, etc.)

---

### 1.3 UI Component Analysis

#### SupplierInventoryView Component

**File**: `src/components/inventory/SupplierInventoryView.tsx`

**Component Structure**:

**State Management** (lines 143-149):
```typescript
const [selectedSupplier, setSelectedSupplier] = useState<string>('')
const [searchTerm, setSearchTerm] = useState('')
const [categoryFilter, setCategoryFilter] = useState<string>('all_categories')
const [statusFilter, setStatusFilter] = useState<string>('all_statuses')
const [showAddToInventory, setShowAddToInventory] = useState(false)
const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
```

**Analysis**:
- ✅ Manages supplier selection
- ✅ Supports filtering and search
- ✅ Tracks product selection for bulk actions
- ❌ No allocation-related state
- ❌ No reservation tracking state
- ❌ No consignment state

**Data Enrichment** (lines 167-213):
```typescript
const supplierInventoryData = useMemo(() => {
  const data: SupplierInventoryData[] = suppliers.map(supplier => {
    const supplierProducts = products.filter(p => p.supplier_id === supplier.id)
    const enrichedProducts: EnrichedProduct[] = supplierProducts.map(product => {
      const inventoryItem = items.find(item => item.product_id === product.id)
      const totalStockValue = inventoryItem ?
        inventoryItem.current_stock * inventoryItem.cost_per_unit_zar : 0
      
      let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked' = 'in_stock'
      // ... status derivation ...
      
      return {
        ...product,
        inventoryItem,
        totalStockValue,
        stockStatus,
        supplierInfo: supplier
      }
    })
    // ... metrics calculation ...
  })
})
```

**Analysis**:
- ✅ Enriches products with inventory data
- ✅ Calculates stock status
- ✅ Computes metrics (total value, low stock count)
- ❌ Doesn't calculate allocated quantities
- ❌ Doesn't show reservation details
- ❌ Doesn't distinguish between owned vs consignment inventory

**UI Features**:

**What Exists**:
- ✅ Supplier list with summary cards
- ✅ Product table with stock levels
- ✅ Search and filtering
- ✅ Stock status badges
- ✅ Add to inventory dialog
- ✅ Import/export buttons (placeholders)

**What's Missing**:
- ❌ Allocation controls (allocate/deallocate buttons)
- ❌ Reservation management UI
- ❌ Consignment inventory indicators
- ❌ Allocation history/audit trail
- ❌ Multi-supplier allocation view
- ❌ Reservation expiration warnings
- ❌ Allocation conflict resolution

**Action Handler** (lines 259-276):
```typescript
const handleAddToInventory = async (productIds: string[]) => {
  try {
    // Implementation would depend on your backend API
    addNotification({
      type: 'success',
      title: 'Products added to inventory',
      message: `${productIds.length} products added successfully`
    })
    setSelectedProducts(new Set())
    setShowAddToInventory(false)
  } catch (error) {
    // ... error handling ...
  }
}
```

**Analysis**:
- ⚠️ Placeholder implementation (comment on line 261)
- ❌ No actual API call
- ❌ No allocation logic

---

## 2. Allocation Coverage Assessment

### 2.1 What "Allocation" Could Mean

Before designing a solution, we need to clarify what "allocation to supplier" means in the business context:

#### Scenario A: Supplier Consignment Inventory

**Business Case**: Supplier owns inventory stored in your warehouse

**Example**:
- Supplier A delivers 500 units to your warehouse
- You don't pay until you sell/use them
- Inventory is "allocated" to Supplier A (they own it)
- When you use 100 units, you pay Supplier A and transfer ownership

**Current Support**: ❌ None

**Required**:
- Track ownership (your inventory vs supplier's inventory)
- Track usage/consumption
- Generate payment obligations when consumed
- Separate reporting for owned vs consignment inventory

---

#### Scenario B: Multi-Supplier Sourcing

**Business Case**: Same product available from multiple suppliers

**Example**:
- Product X can be supplied by Supplier A, B, or C
- You have 1000 units of Product X in stock
- 300 units came from Supplier A (allocated to A)
- 400 units came from Supplier B (allocated to B)
- 300 units came from Supplier C (allocated to C)
- Need to track which supplier supplied which batch

**Current Support**: ❌ None (only tracks ONE supplier per item)

**Required**:
- Many-to-many relationship: products ↔ suppliers
- Batch/lot tracking by supplier
- Supplier-specific costing
- Supplier performance by batch

---

#### Scenario C: Reserved Inventory for Supplier Orders

**Business Case**: Reserve inventory for incoming supplier purchase orders

**Example**:
- Supplier A has a standing order for 200 units/month
- You reserve 200 units for Supplier A's next delivery
- Other customers can't purchase those 200 units
- When Supplier A's PO arrives, reserved units are allocated

**Current Support**: ⚠️ Partial (`reserved_qty` exists but not supplier-specific)

**Required**:
- Link `reserved_qty` to specific supplier
- Link to purchase order
- Reservation expiration dates
- Automatic deallocation if PO cancelled

---

#### Scenario D: Supplier Allocation for Fulfillment

**Business Case**: Allocate inventory to supplier for customer order fulfillment

**Example**:
- Customer orders 50 units
- You allocate 50 units to Supplier A to fulfill
- Supplier A ships directly to customer (drop shipping)
- Inventory is "allocated" to Supplier A for this order

**Current Support**: ❌ None

**Required**:
- Allocate inventory to supplier for specific order
- Track fulfillment status
- Deallocate if supplier can't fulfill
- Reallocate to different supplier if needed

---

#### Scenario E: Supplier Inventory Reservation for Production

**Business Case**: Reserve raw materials from supplier for production run

**Example**:
- Production order requires 1000 units of Component X
- Reserve 1000 units from Supplier A's inventory
- Lock those units until production completes
- Release reservation after production

**Current Support**: ❌ None

**Required**:
- Reserve inventory for production orders
- Link to work orders/production schedules
- Automatic release on completion
- Supplier notification of reservation

---

### 2.2 Current System Capabilities

**What the System CAN Do**:

1. ✅ **Track Product Ownership**
   - Each product linked to ONE supplier via `products.supplier_id`
   - Can query all products from a specific supplier
   - Can view inventory for supplier's products

2. ✅ **Generic Reservations**
   - `inventory_items.reserved_qty` tracks total reserved quantity
   - `available_qty` computed as `stock_qty - reserved_qty`
   - Prevents overselling

3. ✅ **Supplier-Filtered Views**
   - API endpoint provides supplier-specific inventory view
   - Shows all inventory for supplier's products
   - Calculates supplier-specific metrics

4. ✅ **Bulk Operations**
   - Adjust stock for supplier's products
   - Update reorder points
   - Update locations
   - Transaction-safe processing

**What the System CANNOT Do**:

1. ❌ **Supplier-Specific Allocations**
   - Can't allocate specific quantities to specific suppliers
   - Can't track which supplier reserved which quantities
   - Can't manage consignment inventory

2. ❌ **Multi-Supplier Products**
   - Each product can only have ONE supplier
   - Can't track same product from multiple suppliers
   - Can't compare supplier pricing/performance for same product

3. ❌ **Allocation Audit Trail**
   - No history of allocations/deallocations
   - No record of who made allocation changes
   - No reason/reference tracking

4. ❌ **Reservation Management**
   - Can't set reservation expiration dates
   - Can't link reservations to orders/suppliers
   - Can't automatically release expired reservations

5. ❌ **Consignment Tracking**
   - Can't distinguish owned vs consignment inventory
   - Can't track supplier-owned inventory in your warehouse
   - Can't generate payment obligations on consumption

---

## 3. Bulk Operations Review

### 3.1 Current Operations Deep Dive

#### Operation 1: Stock Adjustment

**Code** (lines 443-456 in `route.ts`):
```typescript
case 'stock_adjustment':
  await client.query(
    `UPDATE inventory_items
     SET stock_qty = stock_qty + $1,
         available_qty = available_qty + $1,
         updated_at = NOW()
     WHERE id = $2 AND EXISTS (
       SELECT 1 FROM products p
       WHERE p.sku = inventory_items.sku
       AND p.supplier_id = $3
     )`,
    [item.adjustment, item.itemId, supplierId]
  )
  break
```

**Request Format**:
```json
{
  "operation": "stock_adjustment",
  "items": [
    {
      "itemId": "uuid",
      "adjustment": 100  // Can be positive or negative
    }
  ],
  "reason": "Received shipment",
  "reference": "PO-12345"
}
```

**Strengths**:
- ✅ Atomic operation (within transaction)
- ✅ Verifies supplier ownership before adjustment
- ✅ Updates both `stock_qty` and `available_qty`
- ✅ Supports positive and negative adjustments

**Weaknesses**:
- ❌ Doesn't create `stock_movements` record
- ❌ Doesn't validate against negative stock
- ❌ Doesn't use `reason` or `reference` parameters
- ❌ Doesn't track user who made adjustment
- ❌ Updates `available_qty` directly (should be computed)

**Issue**: Line 447 updates `available_qty` but it's defined as a computed column in schema:
```sql
available_qty INTEGER GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED
```

**This will fail!** You cannot UPDATE a GENERATED ALWAYS column.

**Fix Required**:
```typescript
case 'stock_adjustment':
  // Remove available_qty from UPDATE
  await client.query(
    `UPDATE inventory_items
     SET stock_qty = stock_qty + $1,
         updated_at = NOW()
     WHERE id = $2 AND EXISTS (...)
       AND (stock_qty + $1) >= 0  -- Prevent negative stock
    `,
    [item.adjustment, item.itemId, supplierId]
  )
  
  // Create stock movement record
  await client.query(
    `INSERT INTO stock_movements (
       organization_id, item_id, user_id, movement_type,
       quantity, reason, reference, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `,
    [orgId, item.itemId, userId, 'adjustment', item.adjustment, reason, reference]
  )
  break
```

---

#### Operation 2: Reorder Point Update

**Code** (lines 458-469):
```typescript
case 'reorder_point_update':
  await client.query(
    `UPDATE inventory_items
     SET reorder_point = $1, updated_at = NOW()
     WHERE id = $2 AND EXISTS (
       SELECT 1 FROM products p
       WHERE p.sku = inventory_items.sku
       AND p.supplier_id = $3
     )`,
    [item.reorderPoint, item.itemId, supplierId]
  )
  break
```

**Request Format**:
```json
{
  "operation": "reorder_point_update",
  "items": [
    {
      "itemId": "uuid",
      "reorderPoint": 50
    }
  ]
}
```

**Strengths**:
- ✅ Simple and safe operation
- ✅ Verifies supplier ownership
- ✅ No side effects

**Weaknesses**:
- ❌ Doesn't validate reorder point is positive
- ❌ Doesn't validate reorder point < max_stock
- ❌ Doesn't log the change

**Improvement**:
```typescript
case 'reorder_point_update':
  await client.query(
    `UPDATE inventory_items
     SET reorder_point = $1, updated_at = NOW()
     WHERE id = $2 AND EXISTS (...)
       AND $1 >= 0  -- Must be non-negative
       AND (max_stock IS NULL OR $1 <= max_stock)  -- Must be <= max_stock
    `,
    [item.reorderPoint, item.itemId, supplierId]
  )
  break
```

---

#### Operation 3: Location Update

**Code** (lines 471-482):
```typescript
case 'location_update':
  await client.query(
    `UPDATE inventory_items
     SET location = $1, updated_at = NOW()
     WHERE id = $2 AND EXISTS (
       SELECT 1 FROM products p
       WHERE p.sku = inventory_items.sku
       AND p.supplier_id = $3
     )`,
    [item.location, item.itemId, supplierId]
  )
  break
```

**Request Format**:
```json
{
  "operation": "location_update",
  "items": [
    {
      "itemId": "uuid",
      "location": "Warehouse A - Aisle 3 - Shelf 2"
    }
  ]
}
```

**Strengths**:
- ✅ Simple operation
- ✅ Verifies supplier ownership

**Weaknesses**:
- ❌ No validation of location format
- ❌ No check if location exists
- ❌ Single location only (no multi-location support)
- ❌ Doesn't create movement record for location transfer

**Note**: Schema has single `location` field (line 134 in setup-database.sql), but migration 0011 has `stock_level` table for multi-location support. This is another schema inconsistency.

---

### 3.2 Missing Allocation Operations

#### Operation 4: Allocate to Supplier (MISSING)

**Purpose**: Reserve specific quantity for a supplier

**Use Case**: Supplier A has a purchase order for 200 units, reserve them

**Proposed Implementation**:
```typescript
case 'allocate_to_supplier':
  // Validate available quantity
  const checkResult = await client.query(
    `SELECT stock_qty, reserved_qty, available_qty
     FROM inventory_items
     WHERE id = $1`,
    [item.itemId]
  )
  
  if (checkResult.rows[0].available_qty < item.quantity) {
    throw new Error('Insufficient available quantity')
  }
  
  // Create allocation record
  await client.query(
    `INSERT INTO inventory_allocations (
       organization_id, item_id, supplier_id, allocated_qty,
       allocation_type, reference, expires_at, created_by, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `,
    [orgId, item.itemId, supplierId, item.quantity, 'supplier_order', reference, expiresAt, userId]
  )
  
  // Update reserved quantity
  await client.query(
    `UPDATE inventory_items
     SET reserved_qty = reserved_qty + $1
     WHERE id = $2`,
    [item.quantity, item.itemId]
  )
  break
```

**Request Format**:
```json
{
  "operation": "allocate_to_supplier",
  "items": [
    {
      "itemId": "uuid",
      "quantity": 200,
      "reference": "PO-12345",
      "expiresAt": "2024-12-31T23:59:59Z"
    }
  ],
  "reason": "Purchase order allocation"
}
```

---

#### Operation 5: Deallocate from Supplier (MISSING)

**Purpose**: Release supplier allocation

**Use Case**: Purchase order cancelled, release reserved inventory

**Proposed Implementation**:
```typescript
case 'deallocate_from_supplier':
  // Get allocation details
  const allocation = await client.query(
    `SELECT allocated_qty FROM inventory_allocations
     WHERE id = $1 AND supplier_id = $2`,
    [item.allocationId, supplierId]
  )
  
  if (allocation.rows.length === 0) {
    throw new Error('Allocation not found')
  }
  
  const allocatedQty = allocation.rows[0].allocated_qty
  
  // Delete allocation record
  await client.query(
    `DELETE FROM inventory_allocations WHERE id = $1`,
    [item.allocationId]
  )
  
  // Update reserved quantity
  await client.query(
    `UPDATE inventory_items
     SET reserved_qty = reserved_qty - $1
     WHERE id = $2`,
    [allocatedQty, item.itemId]
  )
  break
```

**Request Format**:
```json
{
  "operation": "deallocate_from_supplier",
  "items": [
    {
      "itemId": "uuid",
      "allocationId": "uuid"
    }
  ],
  "reason": "Purchase order cancelled"
}
```

---

#### Operation 6: Transfer Allocation (MISSING)

**Purpose**: Move allocation from one supplier to another

**Use Case**: Supplier A can't fulfill, transfer to Supplier B

**Proposed Implementation**:
```typescript
case 'transfer_allocation':
  // Update allocation record
  await client.query(
    `UPDATE inventory_allocations
     SET supplier_id = $1,
         updated_at = NOW(),
         updated_by = $2,
         notes = COALESCE(notes, '') || '\nTransferred from supplier ' || $3
     WHERE id = $4 AND supplier_id = $3`,
    [item.toSupplierId, userId, supplierId, item.allocationId]
  )
  break
```

**Request Format**:
```json
{
  "operation": "transfer_allocation",
  "items": [
    {
      "allocationId": "uuid",
      "toSupplierId": "uuid"
    }
  ],
  "reason": "Supplier unable to fulfill"
}
```

---

#### Operation 7: Consignment In (MISSING)

**Purpose**: Receive consignment inventory from supplier

**Use Case**: Supplier delivers inventory they still own

**Proposed Implementation**:
```typescript
case 'consignment_in':
  // Create consignment record
  await client.query(
    `INSERT INTO consignment_inventory (
       organization_id, item_id, supplier_id, quantity,
       unit_cost, consignment_date, reference, created_at
     ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW())
    `,
    [orgId, item.itemId, supplierId, item.quantity, item.unitCost, reference]
  )
  
  // Update stock quantity (but not owned)
  await client.query(
    `UPDATE inventory_items
     SET stock_qty = stock_qty + $1
     WHERE id = $2`,
    [item.quantity, item.itemId]
  )
  
  // Create stock movement
  await client.query(
    `INSERT INTO stock_movements (
       organization_id, item_id, movement_type, quantity,
       reason, reference, created_at
     ) VALUES ($1, $2, 'consignment_in', $3, $4, $5, NOW())
    `,
    [orgId, item.itemId, item.quantity, reason, reference]
  )
  break
```

**Request Format**:
```json
{
  "operation": "consignment_in",
  "items": [
    {
      "itemId": "uuid",
      "quantity": 500,
      "unitCost": 25.50,
      "reference": "CONSIGN-12345"
    }
  ],
  "reason": "Consignment delivery from supplier"
}
```

---

### 3.3 Transaction Safety Analysis

**Current Implementation** (lines 432-524):

```typescript
try {
  await client.query('BEGIN')  // Line 432
  
  let results = {
    processed: 0,
    errors: [] as string[],
    details: [] as any[]
  }
  
  for (const item of items) {
    try {
      switch (operation) {
        case 'stock_adjustment':
          // ... operation ...
          break
        // ... other operations ...
      }
      
      results.processed++
      results.details.push({ itemId: item.itemId, status: 'success' })
      
    } catch (itemError) {
      results.errors.push(`Item ${item.itemId}: ${itemError.message}`)
      results.details.push({ itemId: item.itemId, status: 'error' })
    }
  }
  
  await client.query('COMMIT')  // Line 505
  
} catch (error) {
  await client.query('ROLLBACK')  // Line 514
}
```

**Analysis**:

**Strengths**:
- ✅ Uses database transactions
- ✅ Rolls back on outer error
- ✅ Tracks individual item success/failure
- ✅ Returns detailed results

**Weaknesses**:
- ⚠️ **Continues processing after item errors** - If item 1 fails, items 2-10 still process
- ⚠️ **Commits partial results** - If 5 out of 10 items fail, the 5 successful ones are committed
- ❌ **No all-or-nothing option** - Can't require all items to succeed

**Recommendation**: Add `failFast` option:

```typescript
const { operation, items, reason, reference, failFast = false } = body

for (const item of items) {
  try {
    // ... operation ...
  } catch (itemError) {
    results.errors.push(`Item ${item.itemId}: ${itemError.message}`)
    
    if (failFast) {
      throw itemError  // Abort entire transaction
    }
  }
}
```

**Request Format**:
```json
{
  "operation": "stock_adjustment",
  "items": [...],
  "failFast": true  // Rollback if ANY item fails
}
```

---

### 3.4 Validation Gaps

#### Gap 1: No Stock Quantity Validation

**Current Code** (line 444):
```typescript
SET stock_qty = stock_qty + $1
```

**Problem**: If `$1 = -1000` and `stock_qty = 100`, result is `-900` (invalid)

**Fix**:
```typescript
SET stock_qty = stock_qty + $1
WHERE id = $2
  AND (stock_qty + $1) >= 0  -- Prevent negative stock
```

**Better**: Add database constraint:
```sql
ALTER TABLE inventory_items
ADD CONSTRAINT chk_stock_qty_non_negative
CHECK (stock_qty >= 0);
```

---

#### Gap 2: No Reserved Quantity Validation

**Problem**: `reserved_qty` can exceed `stock_qty`

**Example**:
- `stock_qty = 100`
- `reserved_qty = 150` (invalid - can't reserve more than you have)

**Fix**: Add database constraint:
```sql
ALTER TABLE inventory_items
ADD CONSTRAINT chk_reserved_qty_valid
CHECK (reserved_qty >= 0 AND reserved_qty <= stock_qty);
```

---

#### Gap 3: No Supplier Ownership Validation

**Current Code** (lines 449-453):
```typescript
WHERE id = $2 AND EXISTS (
  SELECT 1 FROM products p
  WHERE p.sku = inventory_items.sku
  AND p.supplier_id = $3
)
```

**Problem**: If no matching product exists, UPDATE silently does nothing

**Fix**: Check affected rows:
```typescript
const result = await client.query(
  `UPDATE inventory_items SET ... WHERE id = $2 AND EXISTS (...)`,
  [item.adjustment, item.itemId, supplierId]
)

if (result.rowCount === 0) {
  throw new Error(`Item ${item.itemId} not found or not owned by supplier ${supplierId}`)
}
```

---

#### Gap 4: No Audit Trail

**Problem**: No record of:
- Who made the change
- When it was made
- Why it was made
- What the previous value was

**Fix**: Create audit log:
```typescript
await client.query(
  `INSERT INTO inventory_audit_log (
     organization_id, item_id, user_id, action,
     old_value, new_value, reason, reference, created_at
   ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  `,
  [orgId, item.itemId, userId, 'stock_adjustment', oldQty, newQty, reason, reference]
)
```

---

## 4. UI Flow Inspection

### 4.1 Current UI Capabilities

#### Component: SupplierInventoryView

**File**: `src/components/inventory/SupplierInventoryView.tsx`

**Features**:

1. **Supplier Selection** (lines 143, 215-217):
   - Dropdown to select supplier
   - Shows supplier list with summary cards
   - Displays supplier details (contact, performance)

2. **Inventory Display** (lines 220-234):
   - Table view of supplier's products
   - Shows stock levels (current, reserved, available)
   - Stock status badges (in stock, low stock, out of stock)
   - Category filtering
   - Search functionality

3. **Metrics Dashboard** (lines 264-272):
   - Total inventory value
   - Total items count
   - Low stock count
   - Out of stock count
   - Stock alerts

4. **Product Selection** (lines 148, 259-276):
   - Checkbox selection for bulk actions
   - "Add to Inventory" dialog
   - Placeholder implementation (no actual API call)

**What Users Can Do**:
- ✅ View supplier inventory
- ✅ Search and filter products
- ✅ See stock levels and status
- ✅ View supplier metrics
- ✅ Select products for bulk actions

**What Users Cannot Do**:
- ❌ Allocate inventory to supplier
- ❌ Reserve quantities for supplier orders
- ❌ Manage consignment inventory
- ❌ View allocation history
- ❌ Set allocation expiration dates
- ❌ Transfer allocations between suppliers
- ❌ View multi-supplier scenarios

---

### 4.2 Missing UI Components

#### Component 1: Allocation Management Panel (MISSING)

**Purpose**: Allocate/deallocate inventory to suppliers

**Proposed UI**:

```tsx
// Allocation Panel Component
function AllocationPanel({ item, supplier }) {
  const [allocationQty, setAllocationQty] = useState(0)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [reference, setReference] = useState('')
  
  const handleAllocate = async () => {
    await fetch(`/api/suppliers/${supplier.id}/inventory`, {
      method: 'POST',
      body: JSON.stringify({
        operation: 'allocate_to_supplier',
        items: [{
          itemId: item.id,
          quantity: allocationQty,
          reference,
          expiresAt
        }]
      })
    })
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocate to {supplier.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Available Quantity</Label>
            <div className="text-2xl font-bold">{item.availableStock}</div>
          </div>
          
          <div>
            <Label>Quantity to Allocate</Label>
            <Input
              type="number"
              value={allocationQty}
              onChange={(e) => setAllocationQty(Number(e.target.value))}
              max={item.availableStock}
            />
          </div>
          
          <div>
            <Label>Reference (PO Number)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="PO-12345"
            />
          </div>
          
          <div>
            <Label>Expires At (Optional)</Label>
            <DatePicker
              selected={expiresAt}
              onChange={setExpiresAt}
            />
          </div>
          
          <Button onClick={handleAllocate} disabled={allocationQty === 0}>
            Allocate {allocationQty} Units
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Where to Add**: As a dialog or side panel in SupplierInventoryView

---

#### Component 2: Allocation History Table (MISSING)

**Purpose**: Show allocation audit trail

**Proposed UI**:

```tsx
function AllocationHistory({ itemId, supplierId }) {
  const [allocations, setAllocations] = useState([])
  
  useEffect(() => {
    fetch(`/api/inventory/${itemId}/allocations?supplier_id=${supplierId}`)
      .then(res => res.json())
      .then(data => setAllocations(data.allocations))
  }, [itemId, supplierId])
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {allocations.map(allocation => (
          <TableRow key={allocation.id}>
            <TableCell>{format(new Date(allocation.createdAt), 'PPp')}</TableCell>
            <TableCell>
              <Badge variant={allocation.action === 'allocate' ? 'default' : 'secondary'}>
                {allocation.action}
              </Badge>
            </TableCell>
            <TableCell>{allocation.quantity}</TableCell>
            <TableCell>{allocation.reference}</TableCell>
            <TableCell>
              {allocation.expiresAt ? format(new Date(allocation.expiresAt), 'PP') : 'Never'}
            </TableCell>
            <TableCell>
              {allocation.status === 'active' ? (
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="secondary">Released</Badge>
              )}
            </TableCell>
            <TableCell>
              {allocation.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeallocate(allocation.id)}
                >
                  Release
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

**Where to Add**: As a tab in SupplierInventoryView or expandable row in product table

---

#### Component 3: Consignment Inventory Indicator (MISSING)

**Purpose**: Distinguish owned vs consignment inventory

**Proposed UI**:

```tsx
function StockQuantityCell({ item }) {
  const ownedQty = item.currentStock - (item.consignmentQty || 0)
  const consignmentQty = item.consignmentQty || 0
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{item.currentStock}</span>
        <span className="text-sm text-muted-foreground">total</span>
      </div>
      
      {consignmentQty > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="text-xs">
            <Package className="w-3 h-3 mr-1" />
            {ownedQty} owned
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <Truck className="w-3 h-3 mr-1" />
            {consignmentQty} consignment
          </Badge>
        </div>
      )}
    </div>
  )
}
```

**Where to Add**: Replace simple stock quantity display in product table

---

#### Component 4: Multi-Supplier Allocation View (MISSING)

**Purpose**: Show same product from multiple suppliers

**Proposed UI**:

```tsx
function MultiSupplierView({ product }) {
  const [suppliers, setSuppliers] = useState([])
  
  useEffect(() => {
    fetch(`/api/products/${product.id}/suppliers`)
      .then(res => res.json())
      .then(data => setSuppliers(data.suppliers))
  }, [product.id])
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.name} - Supplier Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Stock Allocated</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map(supplier => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>{supplier.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{supplier.name}</div>
                      {supplier.isPreferred && (
                        <Badge variant="default" className="text-xs">Preferred</Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(supplier.unitCost)}</TableCell>
                <TableCell>{supplier.leadTimeDays} days</TableCell>
                <TableCell>{supplier.allocatedQty}</TableCell>
                <TableCell>{supplier.availableQty}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAllocate(supplier.id)}
                  >
                    Allocate
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

**Where to Add**: As a modal dialog when clicking on a product

---

#### Component 5: Allocation Expiration Warnings (MISSING)

**Purpose**: Alert users to expiring allocations

**Proposed UI**:

```tsx
function AllocationExpirationAlerts({ supplierId }) {
  const [expiringAllocations, setExpiringAllocations] = useState([])
  
  useEffect(() => {
    fetch(`/api/suppliers/${supplierId}/allocations/expiring`)
      .then(res => res.json())
      .then(data => setExpiringAllocations(data.allocations))
  }, [supplierId])
  
  if (expiringAllocations.length === 0) return null
  
  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="font-semibold mb-2">
          {expiringAllocations.length} allocations expiring soon
        </div>
        <div className="space-y-1">
          {expiringAllocations.map(allocation => (
            <div key={allocation.id} className="flex items-center justify-between text-sm">
              <span>
                {allocation.itemName} - {allocation.quantity} units
              </span>
              <span className="text-muted-foreground">
                Expires {format(new Date(allocation.expiresAt), 'PP')}
              </span>
              <Button variant="link" size="sm" onClick={() => handleExtend(allocation.id)}>
                Extend
              </Button>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  )
}
```

**Where to Add**: At the top of SupplierInventoryView, above the product table

---

### 4.3 UX Flow Improvements

#### Current Flow: View Supplier Inventory

```
1. User selects supplier from dropdown
2. System loads supplier's products
3. User sees product table with stock levels
4. User can search/filter products
5. User can select products (but no action available)
```

**Issues**:
- ❌ No clear call-to-action
- ❌ Product selection doesn't do anything useful
- ❌ No way to take action on inventory

---

#### Proposed Flow: Allocate Inventory to Supplier

```
1. User selects supplier from dropdown
2. System loads supplier's products with allocation status
3. User sees:
   - Total stock
   - Allocated to this supplier
   - Allocated to other suppliers
   - Available for allocation
4. User clicks "Allocate" button on a product
5. Allocation dialog opens:
   - Shows available quantity
   - Input for quantity to allocate
   - Input for reference (PO number)
   - Optional expiration date
6. User enters details and clicks "Allocate"
7. System:
   - Validates available quantity
   - Creates allocation record
   - Updates reserved_qty
   - Shows success notification
8. Table updates to show new allocation
9. User can view allocation history
10. User can release allocation if needed
```

**Benefits**:
- ✅ Clear purpose and workflow
- ✅ Immediate feedback
- ✅ Audit trail visible
- ✅ Easy to undo/modify

---

#### Proposed Flow: Manage Consignment Inventory

```
1. User selects supplier from dropdown
2. System shows two tabs:
   - "Owned Inventory" (your inventory)
   - "Consignment Inventory" (supplier's inventory in your warehouse)
3. In Consignment tab:
   - Shows consignment items with supplier ownership
   - Shows quantity, value, consignment date
   - Shows consumption history
4. User clicks "Receive Consignment" button
5. Dialog opens:
   - Select product
   - Enter quantity
   - Enter unit cost
   - Enter reference (consignment agreement number)
6. User submits
7. System:
   - Creates consignment record
   - Increases stock_qty (but marks as consignment)
   - Creates stock movement
   - Shows success notification
8. When user consumes consignment inventory:
   - System tracks consumption
   - Generates payment obligation
   - Transfers ownership from supplier to you
9. User can view consignment report:
   - Total consignment value
   - Consumption rate
   - Payment obligations
```

**Benefits**:
- ✅ Clear separation of owned vs consignment
- ✅ Automatic payment tracking
- ✅ Supplier transparency
- ✅ Better cash flow management

---

## 5. Allocation/Reservation Design Recommendations

### 5.1 Design Option A: Simple Supplier Reservation

**Concept**: Link `reserved_qty` to suppliers without new tables

**Implementation**:

**Add field to inventory_items**:
```sql
ALTER TABLE inventory_items
ADD COLUMN reserved_for_supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN reservation_reference VARCHAR(255),
ADD COLUMN reservation_expires_at TIMESTAMP WITH TIME ZONE;
```

**Pros**:
- ✅ Simple implementation
- ✅ No new tables
- ✅ Minimal code changes
- ✅ Fast queries

**Cons**:
- ❌ Only ONE supplier can reserve per item
- ❌ No partial allocations (all or nothing)
- ❌ No allocation history
- ❌ Can't track multiple reservations
- ❌ Limited audit trail

**Use Case**: Simple scenarios where each item is reserved for only one supplier at a time

**Recommendation**: ❌ **Not Recommended** - Too limited for real-world scenarios

---

### 5.2 Design Option B: Advanced Allocation Table (RECOMMENDED)

**Concept**: Separate table for allocations with full audit trail

**Implementation**:

**Create allocation table**:
```sql
CREATE TABLE inventory_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What is allocated
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  allocated_qty INTEGER NOT NULL CHECK (allocated_qty > 0),
  
  -- Who it's allocated to
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Why it's allocated
  allocation_type VARCHAR(50) NOT NULL CHECK (allocation_type IN (
    'supplier_order',      -- Reserved for supplier purchase order
    'consignment',         -- Consignment inventory
    'production',          -- Reserved for production
    'transfer',            -- In-transit between locations
    'quality_hold',        -- On hold for quality inspection
    'customer_order',      -- Reserved for customer order (supplier fulfillment)
    'other'
  )),
  
  -- Reference information
  reference VARCHAR(255),           -- PO number, SO number, etc.
  notes TEXT,
  
  -- Temporal information
  allocated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',      -- Currently allocated
    'released',    -- Manually released
    'expired',     -- Expired automatically
    'fulfilled',   -- Allocation fulfilled (order completed)
    'cancelled'    -- Allocation cancelled
  )),
  
  -- Audit trail
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT fk_allocation_item FOREIGN KEY (item_id) REFERENCES inventory_items(id),
  CONSTRAINT fk_allocation_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Indexes for performance
CREATE INDEX idx_allocations_item ON inventory_allocations(item_id) WHERE status = 'active';
CREATE INDEX idx_allocations_supplier ON inventory_allocations(supplier_id) WHERE status = 'active';
CREATE INDEX idx_allocations_expires ON inventory_allocations(expires_at) WHERE status = 'active' AND expires_at IS NOT NULL;
CREATE INDEX idx_allocations_type ON inventory_allocations(allocation_type, status);

-- Trigger to update updated_at
CREATE TRIGGER update_allocations_updated_at
BEFORE UPDATE ON inventory_allocations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Update inventory_items to track total allocated**:
```sql
-- Add computed column for total allocated quantity
ALTER TABLE inventory_items
ADD COLUMN allocated_qty INTEGER DEFAULT 0;

-- Create function to calculate allocated quantity
CREATE OR REPLACE FUNCTION calculate_allocated_qty(p_item_id UUID)
RETURNS INTEGER AS $
BEGIN
  RETURN COALESCE(
    (SELECT SUM(allocated_qty)
     FROM inventory_allocations
     WHERE item_id = p_item_id
       AND status = 'active'),
    0
  );
END;
$ LANGUAGE plpgsql;

-- Create trigger to update allocated_qty when allocations change
CREATE OR REPLACE FUNCTION update_item_allocated_qty()
RETURNS TRIGGER AS $
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE inventory_items
    SET allocated_qty = calculate_allocated_qty(NEW.item_id)
    WHERE id = NEW.item_id;
  END IF;
  
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE inventory_items
    SET allocated_qty = calculate_allocated_qty(OLD.item_id)
    WHERE id = OLD.item_id;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_allocated_qty_on_allocation_change
AFTER INSERT OR UPDATE OR DELETE ON inventory_allocations
FOR EACH ROW
EXECUTE FUNCTION update_item_allocated_qty();
```

**Update available_qty calculation**:
```sql
-- Drop existing computed column
ALTER TABLE inventory_items
DROP COLUMN available_qty;

-- Recreate with allocation consideration
ALTER TABLE inventory_items
ADD COLUMN available_qty INTEGER GENERATED ALWAYS AS (
  stock_qty - COALESCE(reserved_qty, 0) - COALESCE(allocated_qty, 0)
) STORED;
```

**Create view for allocation summary**:
```sql
CREATE VIEW inventory_allocation_summary AS
SELECT
  i.id as item_id,
  i.sku,
  i.name,
  i.stock_qty,
  i.reserved_qty,
  i.allocated_qty,
  i.available_qty,
  
  -- Allocation breakdown by type
  COALESCE(SUM(CASE WHEN a.allocation_type = 'supplier_order' THEN a.allocated_qty ELSE 0 END), 0) as allocated_supplier_orders,
  COALESCE(SUM(CASE WHEN a.allocation_type = 'consignment' THEN a.allocated_qty ELSE 0 END), 0) as allocated_consignment,
  COALESCE(SUM(CASE WHEN a.allocation_type = 'production' THEN a.allocated_qty ELSE 0 END), 0) as allocated_production,
  COALESCE(SUM(CASE WHEN a.allocation_type = 'customer_order' THEN a.allocated_qty ELSE 0 END), 0) as allocated_customer_orders,
  
  -- Allocation breakdown by supplier
  json_agg(
    json_build_object(
      'supplier_id', s.id,
      'supplier_name', s.name,
      'allocated_qty', a.allocated_qty,
      'allocation_type', a.allocation_type,
      'reference', a.reference,
      'expires_at', a.expires_at
    )
  ) FILTER (WHERE a.id IS NOT NULL) as allocations_by_supplier
  
FROM inventory_items i
LEFT JOIN inventory_allocations a ON i.id = a.item_id AND a.status = 'active'
LEFT JOIN suppliers s ON a.supplier_id = s.id
GROUP BY i.id, i.sku, i.name, i.stock_qty, i.reserved_qty, i.allocated_qty, i.available_qty;
```

**Pros**:
- ✅ **Full audit trail** - Every allocation tracked
- ✅ **Multiple allocations** - Multiple suppliers can have allocations on same item
- ✅ **Flexible allocation types** - Supports various business scenarios
- ✅ **Expiration support** - Automatic release of expired allocations
- ✅ **Status tracking** - Know if allocation is active, fulfilled, cancelled
- ✅ **Reference linking** - Link to POs, SOs, production orders
- ✅ **User tracking** - Know who created/modified allocations
- ✅ **Reporting friendly** - Easy to generate allocation reports

**Cons**:
- ⚠️ More complex implementation
- ⚠️ Additional table to maintain
- ⚠️ Slightly slower queries (need joins)
- ⚠️ Requires trigger maintenance

**Use Case**: Production systems requiring full allocation tracking and audit trail

**Recommendation**: ✅ **HIGHLY RECOMMENDED** - Most flexible and auditable

---

### 5.3 Design Option C: Consignment Inventory Tracking

**Concept**: Separate table for supplier-owned inventory in your warehouse

**Implementation**:

**Create consignment table**:
```sql
CREATE TABLE consignment_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What inventory
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  
  -- Who owns it
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Quantities
  consignment_qty INTEGER NOT NULL CHECK (consignment_qty > 0),
  consumed_qty INTEGER NOT NULL DEFAULT 0 CHECK (consumed_qty >= 0),
  remaining_qty INTEGER GENERATED ALWAYS AS (consignment_qty - consumed_qty) STORED,
  
  -- Pricing
  unit_cost DECIMAL(15,2) NOT NULL CHECK (unit_cost >= 0),
  currency VARCHAR(3) DEFAULT 'ZAR',
  total_value DECIMAL(15,2) GENERATED ALWAYS AS (remaining_qty * unit_cost) STORED,
  
  -- Dates
  consignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  agreement_reference VARCHAR(255),
  payment_terms VARCHAR(100),
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',      -- Currently in warehouse
    'consumed',    -- Fully consumed
    'returned',    -- Returned to supplier
    'expired'      -- Agreement expired
  )),
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_consumed_not_exceed_consignment CHECK (consumed_qty <= consignment_qty)
);

-- Indexes
CREATE INDEX idx_consignment_item ON consignment_inventory(item_id) WHERE status = 'active';
CREATE INDEX idx_consignment_supplier ON consignment_inventory(supplier_id) WHERE status = 'active';
CREATE INDEX idx_consignment_status ON consignment_inventory(status);

-- Trigger for updated_at
CREATE TRIGGER update_consignment_updated_at
BEFORE UPDATE ON consignment_inventory
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Create consumption tracking table**:
```sql
CREATE TABLE consignment_consumption (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What was consumed
  consignment_id UUID NOT NULL REFERENCES consignment_inventory(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Consumption details
  consumed_qty INTEGER NOT NULL CHECK (consumed_qty > 0),
  unit_cost DECIMAL(15,2) NOT NULL,
  total_cost DECIMAL(15,2) GENERATED ALWAYS AS (consumed_qty * unit_cost) STORED,
  
  -- Reference
  consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference VARCHAR(255),  -- Sales order, production order, etc.
  reason TEXT,
  
  -- Payment obligation
  payment_due_date DATE,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
    'pending',
    'invoiced',
    'paid',
    'disputed'
  )),
  invoice_id UUID,  -- Link to invoice when created
  
  -- Audit
  consumed_by UUID REFERENCES users(id),
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_consumption_consignment ON consignment_consumption(consignment_id);
CREATE INDEX idx_consumption_supplier ON consignment_consumption(supplier_id);
CREATE INDEX idx_consumption_payment_status ON consignment_consumption(payment_status) WHERE payment_status = 'pending';
```

**Create trigger to update consignment quantities**:
```sql
CREATE OR REPLACE FUNCTION update_consignment_consumed_qty()
RETURNS TRIGGER AS $
BEGIN
  -- Update consignment record
  UPDATE consignment_inventory
  SET consumed_qty = consumed_qty + NEW.consumed_qty,
      status = CASE
        WHEN (consumed_qty + NEW.consumed_qty) >= consignment_qty THEN 'consumed'
        ELSE status
      END
  WHERE id = NEW.consignment_id;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_consignment_on_consumption
AFTER INSERT ON consignment_consumption
FOR EACH ROW
EXECUTE FUNCTION update_consignment_consumed_qty();
```

**Add consignment tracking to inventory_items**:
```sql
ALTER TABLE inventory_items
ADD COLUMN consignment_qty INTEGER DEFAULT 0,
ADD COLUMN owned_qty INTEGER GENERATED ALWAYS AS (stock_qty - COALESCE(consignment_qty, 0)) STORED;

-- Create function to calculate consignment quantity
CREATE OR REPLACE FUNCTION calculate_consignment_qty(p_item_id UUID)
RETURNS INTEGER AS $
BEGIN
  RETURN COALESCE(
    (SELECT SUM(remaining_qty)
     FROM consignment_inventory
     WHERE item_id = p_item_id
       AND status = 'active'),
    0
  );
END;
$ LANGUAGE plpgsql;

-- Create trigger to update consignment_qty
CREATE OR REPLACE FUNCTION update_item_consignment_qty()
RETURNS TRIGGER AS $
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE inventory_items
    SET consignment_qty = calculate_consignment_qty(NEW.item_id)
    WHERE id = NEW.item_id;
  END IF;
  
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE inventory_items
    SET consignment_qty = calculate_consignment_qty(OLD.item_id)
    WHERE id = OLD.item_id;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_consignment_qty_on_change
AFTER INSERT OR UPDATE OR DELETE ON consignment_inventory
FOR EACH ROW
EXECUTE FUNCTION update_item_consignment_qty();
```

**Create view for consignment summary**:
```sql
CREATE VIEW consignment_summary AS
SELECT
  s.id as supplier_id,
  s.name as supplier_name,
  COUNT(DISTINCT ci.item_id) as consignment_items_count,
  SUM(ci.remaining_qty) as total_consignment_qty,
  SUM(ci.total_value) as total_consignment_value,
  SUM(ci.consumed_qty) as total_consumed_qty,
  SUM(cc.total_cost) FILTER (WHERE cc.payment_status = 'pending') as pending_payment_amount,
  json_agg(
    json_build_object(
      'item_id', i.id,
      'item_name', i.name,
      'sku', i.sku,
      'consignment_qty', ci.remaining_qty,
      'unit_cost', ci.unit_cost,
      'total_value', ci.total_value,
      'consignment_date', ci.consignment_date
    )
  ) as consignment_items
FROM suppliers s
JOIN consignment_inventory ci ON s.id = ci.supplier_id AND ci.status = 'active'
JOIN inventory_items i ON ci.item_id = i.id
LEFT JOIN consignment_consumption cc ON ci.id = cc.consignment_id
GROUP BY s.id, s.name;
```

**Pros**:
- ✅ **Clear ownership tracking** - Know what's yours vs supplier's
- ✅ **Automatic payment obligations** - Track what you owe when consumed
- ✅ **Cash flow benefits** - Don't pay until you use
- ✅ **Supplier transparency** - Suppliers can see their inventory
- ✅ **Consumption tracking** - Full audit trail of usage
- ✅ **Invoice generation** - Easy to create invoices from consumption

**Cons**:
- ⚠️ Complex implementation
- ⚠️ Multiple tables to maintain
- ⚠️ Requires integration with invoicing system
- ⚠️ Need supplier portal for visibility

**Use Case**: Businesses with consignment agreements with suppliers

**Recommendation**: ✅ **Recommended** if consignment inventory is a business requirement

---

### 5.4 Design Option D: Multi-Supplier Product Sourcing

**Concept**: Allow same product to be sourced from multiple suppliers

**Implementation**:

**Create supplier_product junction table** (already exists in migration 0011):
```sql
CREATE TABLE supplier_product (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Relationships
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Supplier-specific details
  supplier_sku VARCHAR(100),
  supplier_product_name VARCHAR(255),
  
  -- Pricing
  cost_price DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'ZAR',
  price_valid_from DATE,
  price_valid_to DATE,
  
  -- Lead time and MOQ
  lead_time_days INTEGER DEFAULT 14,
  minimum_order_quantity INTEGER DEFAULT 1,
  
  -- Preferences
  is_preferred BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,  -- Lower number = higher priority
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_supplier_product UNIQUE(supplier_id, product_id)
);

-- Indexes
CREATE INDEX idx_supplier_product_supplier ON supplier_product(supplier_id) WHERE status = 'active';
CREATE INDEX idx_supplier_product_product ON supplier_product(product_id) WHERE status = 'active';
CREATE INDEX idx_supplier_product_preferred ON supplier_product(is_preferred) WHERE is_preferred = true;
```

**Create batch/lot tracking table**:
```sql
CREATE TABLE inventory_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- What batch
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  batch_number VARCHAR(100) NOT NULL,
  
  -- From which supplier
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_product_id UUID REFERENCES supplier_product(id),
  
  -- Quantities
  received_qty INTEGER NOT NULL CHECK (received_qty > 0),
  current_qty INTEGER NOT NULL CHECK (current_qty >= 0),
  allocated_qty INTEGER DEFAULT 0 CHECK (allocated_qty >= 0),
  available_qty INTEGER GENERATED ALWAYS AS (current_qty - allocated_qty) STORED,
  
  -- Costing
  unit_cost DECIMAL(15,2) NOT NULL,
  total_cost DECIMAL(15,2) GENERATED ALWAYS AS (current_qty * unit_cost) STORED,
  
  -- Dates
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  manufacture_date DATE,
  expiry_date DATE,
  
  -- Location
  location VARCHAR(100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'active',
    'depleted',
    'expired',
    'quarantine',
    'returned'
  )),
  
  -- Reference
  purchase_order_id UUID,
  reference VARCHAR(255),
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_batch_current_not_exceed_received CHECK (current_qty <= received_qty),
  CONSTRAINT chk_batch_allocated_not_exceed_current CHECK (allocated_qty <= current_qty)
);

-- Indexes
CREATE INDEX idx_batches_item ON inventory_batches(item_id) WHERE status = 'active';
CREATE INDEX idx_batches_supplier ON inventory_batches(supplier_id);
CREATE INDEX idx_batches_batch_number ON inventory_batches(batch_number);
CREATE INDEX idx_batches_expiry ON inventory_batches(expiry_date) WHERE expiry_date IS NOT NULL AND status = 'active';
```

**Create view for multi-supplier product comparison**:
```sql
CREATE VIEW product_supplier_comparison AS
SELECT
  p.id as product_id,
  p.name as product_name,
  p.sku,
  
  -- Supplier details
  s.id as supplier_id,
  s.name as supplier_name,
  sp.supplier_sku,
  sp.cost_price,
  sp.lead_time_days,
  sp.minimum_order_quantity,
  sp.is_preferred,
  sp.priority,
  
  -- Current inventory from this supplier
  COALESCE(SUM(ib.current_qty), 0) as current_stock_from_supplier,
  COALESCE(SUM(ib.available_qty), 0) as available_stock_from_supplier,
  
  -- Performance metrics
  COUNT(DISTINCT ib.id) as batch_count,
  AVG(ib.unit_cost) as avg_unit_cost,
  MIN(ib.received_date) as first_received_date,
  MAX(ib.received_date) as last_received_date
  
FROM products p
JOIN supplier_product sp ON p.id = sp.product_id AND sp.status = 'active'
JOIN suppliers s ON sp.supplier_id = s.id AND s.status = 'active'
LEFT JOIN inventory_batches ib ON p.id = ib.item_id AND ib.supplier_id = s.id AND ib.status = 'active'
GROUP BY p.id, p.name, p.sku, s.id, s.name, sp.supplier_sku, sp.cost_price, sp.lead_time_days, sp.minimum_order_quantity, sp.is_preferred, sp.priority;
```

**Pros**:
- ✅ **Multi-sourcing support** - Same product from multiple suppliers
- ✅ **Supplier comparison** - Easy to compare pricing and lead times
- ✅ **Batch tracking** - Know which supplier supplied which batch
- ✅ **FIFO/LIFO support** - Can implement inventory valuation methods
- ✅ **Supplier performance** - Track quality and delivery by supplier
- ✅ **Risk mitigation** - Don't depend on single supplier

**Cons**:
- ⚠️ Very complex implementation
- ⚠️ Many tables and relationships
- ⚠️ Requires batch/lot tracking
- ⚠️ More complex inventory management
- ⚠️ Harder to maintain data integrity

**Use Case**: Manufacturing or distribution businesses with multiple suppliers for same products

**Recommendation**: ⚠️ **Consider carefully** - Only if multi-sourcing is critical business requirement

---

## 6. Recommended Implementation Approach

### 6.1 Phased Implementation Strategy

#### Phase 1: Foundation (Week 1-2)

**Goal**: Implement basic allocation table and API

**Tasks**:
1. Create `inventory_allocations` table (Option B)
2. Add `allocated_qty` field to `inventory_items`
3. Create triggers to maintain `allocated_qty`
4. Update `available_qty` calculation to include allocations
5. Create allocation views and indexes

**Deliverables**:
- Database migration script
- Updated schema documentation
- Basic allocation queries tested

**Effort**: 16 hours

---

#### Phase 2: API Endpoints (Week 2-3)

**Goal**: Create allocation management API

**Tasks**:
1. Add allocation operations to POST `/api/suppliers/[id]/inventory`:
   - `allocate_to_supplier`
   - `deallocate_from_supplier`
   - `transfer_allocation`
2. Create GET `/api/inventory/allocations` endpoint
3. Create GET `/api/suppliers/[id]/allocations` endpoint
4. Add allocation data to existing GET `/api/suppliers/[id]/inventory`
5. Create allocation expiration job (cron)

**Deliverables**:
- API endpoints implemented
- API documentation
- Postman collection
- Unit tests

**Effort**: 24 hours

---

#### Phase 3: UI Components (Week 3-4)

**Goal**: Build allocation management UI

**Tasks**:
1. Add allocation panel to SupplierInventoryView
2. Create AllocationDialog component
3. Create AllocationHistory component
4. Add allocation indicators to product table
5. Create allocation expiration alerts
6. Update inventory store to handle allocations

**Deliverables**:
- UI components
- Updated SupplierInventoryView
- User documentation
- UI tests

**Effort**: 32 hours

---

#### Phase 4: Reporting & Analytics (Week 4-5)

**Goal**: Allocation reporting and insights

**Tasks**:
1. Create allocation summary dashboard
2. Add allocation metrics to inventory analytics
3. Create allocation aging report
4. Add allocation trends to inventory trends
5. Create supplier allocation comparison report

**Deliverables**:
- Allocation reports
- Updated analytics dashboard
- Report documentation

**Effort**: 20 hours

---

#### Phase 5: Consignment (Optional - Week 5-7)

**Goal**: Add consignment inventory tracking

**Tasks**:
1. Create consignment tables (Option C)
2. Create consignment API endpoints
3. Build consignment UI components
4. Integrate with invoicing system
5. Create consignment reports

**Deliverables**:
- Consignment system
- Supplier portal (optional)
- Consignment reports

**Effort**: 40 hours

---

### 6.2 Total Effort Estimate

**Core Implementation (Phases 1-4)**:
- Phase 1: 16 hours
- Phase 2: 24 hours
- Phase 3: 32 hours
- Phase 4: 20 hours
- **Total: 92 hours (~12 days)**

**With Consignment (Phases 1-5)**:
- Core: 92 hours
- Phase 5: 40 hours
- **Total: 132 hours (~17 days)**

---

### 6.3 Migration Strategy

#### Step 1: Database Migration

**Create migration file**: `migrations/006_inventory_allocations.sql`

```sql
-- =====================================================
-- INVENTORY ALLOCATIONS SYSTEM
-- Migration 006: Add supplier allocation tracking
-- =====================================================

BEGIN;

-- Create allocations table
CREATE TABLE inventory_allocations (
  -- ... (full schema from Option B)
);

-- Add allocated_qty to inventory_items
ALTER TABLE inventory_items
ADD COLUMN allocated_qty INTEGER DEFAULT 0 CHECK (allocated_qty >= 0);

-- Update available_qty calculation
ALTER TABLE inventory_items
DROP COLUMN available_qty;

ALTER TABLE inventory_items
ADD COLUMN available_qty INTEGER GENERATED ALWAYS AS (
  stock_qty - COALESCE(reserved_qty, 0) - COALESCE(allocated_qty, 0)
) STORED;

-- Create functions and triggers
-- ... (from Option B)

-- Create views
-- ... (from Option B)

-- Create indexes
-- ... (from Option B)

COMMIT;
```

**Run migration**:
```bash
psql -U postgres -d mantisnxt -f migrations/006_inventory_allocations.sql
```

---

#### Step 2: API Implementation

**Update** `src/app/api/suppliers/[id]/inventory/route.ts`:

**Add to POST handler** (after line 486):

```typescript
case 'allocate_to_supplier':
  // Validate available quantity
  const checkResult = await client.query(
    `SELECT stock_qty, reserved_qty, allocated_qty, available_qty
     FROM inventory_items
     WHERE id = $1`,
    [item.itemId]
  )
  
  if (checkResult.rows.length === 0) {
    throw new Error(`Item ${item.itemId} not found`)
  }
  
  const availableQty = checkResult.rows[0].available_qty
  if (availableQty < item.quantity) {
    throw new Error(`Insufficient available quantity. Available: ${availableQty}, Requested: ${item.quantity}`)
  }
  
  // Create allocation record
  await client.query(
    `INSERT INTO inventory_allocations (
       organization_id, item_id, supplier_id, allocated_qty,
       allocation_type, reference, expires_at, created_by, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `,
    [
      orgId,
      item.itemId,
      supplierId,
      item.quantity,
      item.allocationType || 'supplier_order',
      item.reference,
      item.expiresAt,
      userId
    ]
  )
  
  results.processed++
  results.details.push({
    itemId: item.itemId,
    status: 'success',
    operation: 'allocate_to_supplier',
    allocatedQty: item.quantity
  })
  break

case 'deallocate_from_supplier':
  // Get allocation details
  const allocation = await client.query(
    `SELECT id, allocated_qty, item_id
     FROM inventory_allocations
     WHERE id = $1 AND supplier_id = $2 AND status = 'active'`,
    [item.allocationId, supplierId]
  )
  
  if (allocation.rows.length === 0) {
    throw new Error(`Allocation ${item.allocationId} not found or not active`)
  }
  
  const allocatedQty = allocation.rows[0].allocated_qty
  const itemId = allocation.rows[0].item_id
  
  // Update allocation status
  await client.query(
    `UPDATE inventory_allocations
     SET status = 'released',
         released_at = NOW(),
         updated_by = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [userId, item.allocationId]
  )
  
  results.processed++
  results.details.push({
    itemId: itemId,
    status: 'success',
    operation: 'deallocate_from_supplier',
    releasedQty: allocatedQty
  })
  break
```

**Create new endpoint**: `src/app/api/inventory/allocations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database'

// GET /api/inventory/allocations - List all allocations
export async function GET(request: NextRequest) {
  const client = await pool.connect()
  
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('item_id')
    const supplierId = searchParams.get('supplier_id')
    const status = searchParams.get('status') || 'active'
    
    let query = `
      SELECT
        a.*,
        i.sku,
        i.name as item_name,
        s.name as supplier_name,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM inventory_allocations a
      JOIN inventory_items i ON a.item_id = i.id
      JOIN suppliers s ON a.supplier_id = s.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramIndex = 1
    
    if (itemId) {
      query += ` AND a.item_id = ${paramIndex}`
      params.push(itemId)
      paramIndex++
    }
    
    if (supplierId) {
      query += ` AND a.supplier_id = ${paramIndex}`
      params.push(supplierId)
      paramIndex++
    }
    
    if (status !== 'all') {
      query += ` AND a.status = ${paramIndex}`
      params.push(status)
      paramIndex++
    }
    
    query += ` ORDER BY a.created_at DESC`
    
    const result = await client.query(query, params)
    
    return NextResponse.json({
      success: true,
      data: {
        allocations: result.rows,
        total: result.rows.length
      }
    })
    
  } catch (error) {
    console.error('Error fetching allocations:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch allocations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    client.release()
  }
}
```

---

#### Step 3: UI Implementation

**Update** `src/components/inventory/SupplierInventoryView.tsx`:

**Add allocation state** (after line 149):
```typescript
const [showAllocationDialog, setShowAllocationDialog] = useState(false)
const [selectedItemForAllocation, setSelectedItemForAllocation] = useState<EnrichedProduct | null>(null)
const [allocationQty, setAllocationQty] = useState(0)
const [allocationReference, setAllocationReference] = useState('')
const [allocationExpiresAt, setAllocationExpiresAt] = useState<Date | null>(null)
```

**Add allocation handler**:
```typescript
const handleAllocate = async () => {
  if (!selectedItemForAllocation || !selectedSupplier) return
  
  try {
    const response = await fetch(`/api/suppliers/${selectedSupplier}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'allocate_to_supplier',
        items: [{
          itemId: selectedItemForAllocation.inventoryItem?.id,
          quantity: allocationQty,
          reference: allocationReference,
          expiresAt: allocationExpiresAt?.toISOString()
        }],
        reason: 'Manual allocation from UI'
      })
    })
    
    if (!response.ok) throw new Error('Allocation failed')
    
    addNotification({
      type: 'success',
      title: 'Allocation successful',
      message: `Allocated ${allocationQty} units to supplier`
    })
    
    setShowAllocationDialog(false)
    setAllocationQty(0)
    setAllocationReference('')
    setAllocationExpiresAt(null)
    
    // Refresh data
    await fetchItems()
    
  } catch (error) {
    addNotification({
      type: 'error',
      title: 'Allocation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
```

**Add allocation button to product table** (in table actions column):
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    setSelectedItemForAllocation(product)
    setShowAllocationDialog(true)
  }}
  disabled={!product.inventoryItem || product.inventoryItem.available_stock <= 0}
>
  <Package className="w-4 h-4 mr-1" />
  Allocate
</Button>
```

**Add allocation dialog** (before closing component):
```tsx
<Dialog open={showAllocationDialog} onOpenChange={setShowAllocationDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Allocate Inventory to Supplier</DialogTitle>
      <DialogDescription>
        Allocate {selectedItemForAllocation?.name} to {selectedSupplierData?.supplier.name}
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Available Quantity</label>
        <div className="text-2xl font-bold">
          {selectedItemForAllocation?.inventoryItem?.available_stock || 0}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium">Quantity to Allocate</label>
        <Input
          type="number"
          value={allocationQty}
          onChange={(e) => setAllocationQty(Number(e.target.value))}
          max={selectedItemForAllocation?.inventoryItem?.available_stock || 0}
          min={0}
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Reference (PO Number)</label>
        <Input
          value={allocationReference}
          onChange={(e) => setAllocationReference(e.target.value)}
          placeholder="PO-12345"
        />
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowAllocationDialog(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleAllocate}
          disabled={allocationQty === 0 || allocationQty > (selectedItemForAllocation?.inventoryItem?.available_stock || 0)}
        >
          Allocate {allocationQty} Units
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## 7. Testing Strategy

### 7.1 Database Tests

**Test allocation triggers**:
```sql
-- Test 1: Allocation increases allocated_qty
BEGIN;

INSERT INTO inventory_allocations (
  organization_id, item_id, supplier_id, allocated_qty,
  allocation_type, reference
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-item-id',
  'test-supplier-id',
  100,
  'supplier_order',
  'TEST-PO-001'
);

SELECT allocated_qty FROM inventory_items WHERE id = 'test-item-id';
-- Expected: 100

ROLLBACK;

-- Test 2: Multiple allocations sum correctly
BEGIN;

INSERT INTO inventory_allocations (organization_id, item_id, supplier_id, allocated_qty, allocation_type)
VALUES
  ('org-id', 'item-id', 'supplier-1', 50, 'supplier_order'),
  ('org-id', 'item-id', 'supplier-2', 30, 'supplier_order');

SELECT allocated_qty FROM inventory_items WHERE id = 'item-id';
-- Expected: 80

ROLLBACK;

-- Test 3: Deallocation decreases allocated_qty
BEGIN;

INSERT INTO inventory_allocations (id, organization_id, item_id, supplier_id, allocated_qty, allocation_type)
VALUES ('alloc-id', 'org-id', 'item-id', 'supplier-id', 100, 'supplier_order');

UPDATE inventory_allocations SET status = 'released' WHERE id = 'alloc-id';

SELECT allocated_qty FROM inventory_items WHERE id = 'item-id';
-- Expected: 0

ROLLBACK;

-- Test 4: Available quantity calculation
BEGIN;

UPDATE inventory_items SET stock_qty = 1000, reserved_qty = 200 WHERE id = 'item-id';

INSERT INTO inventory_allocations (organization_id, item_id, supplier_id, allocated_qty, allocation_type)
VALUES ('org-id', 'item-id', 'supplier-id', 300, 'supplier_order');

SELECT stock_qty, reserved_qty, allocated_qty, available_qty FROM inventory_items WHERE id = 'item-id';
-- Expected: stock_qty=1000, reserved_qty=200, allocated_qty=300, available_qty=500

ROLLBACK;
```

---

### 7.2 API Tests

**Test allocation endpoint**:
```typescript
// Test 1: Successful allocation
const response = await fetch('/api/suppliers/supplier-id/inventory', {
  method: 'POST',
  body: JSON.stringify({
    operation: 'allocate_to_supplier',
    items: [{
      itemId: 'item-id',
      quantity: 100,
      reference: 'PO-12345',
      expiresAt: '2024-12-31T23:59:59Z'
    }],
    reason: 'Test allocation'
  })
})

expect(response.status).toBe(200)
const data = await response.json()
expect(data.success).toBe(true)
expect(data.data.processed).toBe(1)

// Test 2: Insufficient quantity
const response = await fetch('/api/suppliers/supplier-id/inventory', {
  method: 'POST',
  body: JSON.stringify({
    operation: 'allocate_to_supplier',
    items: [{
      itemId: 'item-id',
      quantity: 99999,  // More than available
      reference: 'PO-12345'
    }]
  })
})

expect(response.status).toBe(200)
const data = await response.json()
expect(data.data.errors.length).toBeGreaterThan(0)
expect(data.data.errors[0]).toContain('Insufficient available quantity')

// Test 3: Deallocation
const response = await fetch('/api/suppliers/supplier-id/inventory', {
  method: 'POST',
  body: JSON.stringify({
    operation: 'deallocate_from_supplier',
    items: [{
      allocationId: 'allocation-id'
    }],
    reason: 'Test deallocation'
  })
})

expect(response.status).toBe(200)
const data = await response.json()
expect(data.success).toBe(true)
```

---

### 7.3 UI Tests

**Test allocation dialog**:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SupplierInventoryView from './SupplierInventoryView'

test('opens allocation dialog when allocate button clicked', async () => {
  render(<SupplierInventoryView />)
  
  // Wait for data to load
  await waitFor(() => screen.getByText('Product Name'))
  
  // Click allocate button
  const allocateButton = screen.getByText('Allocate')
  fireEvent.click(allocateButton)
  
  // Dialog should open
  expect(screen.getByText('Allocate Inventory to Supplier')).toBeInTheDocument()
})

test('validates allocation quantity', async () => {
  render(<SupplierInventoryView />)
  
  // Open dialog
  fireEvent.click(screen.getByText('Allocate'))
  
  // Enter quantity greater than available
  const input = screen.getByLabelText('Quantity to Allocate')
  fireEvent.change(input, { target: { value: '99999' } })
  
  // Allocate button should be disabled
  const allocateButton = screen.getByText(/Allocate \d+ Units/)
  expect(allocateButton).toBeDisabled()
})

test('submits allocation successfully', async () => {
  const mockFetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { processed: 1 } })
    })
  )
  global.fetch = mockFetch as any
  
  render(<SupplierInventoryView />)
  
  // Open dialog and fill form
  fireEvent.click(screen.getByText('Allocate'))
  fireEvent.change(screen.getByLabelText('Quantity to Allocate'), { target: { value: '100' } })
  fireEvent.change(screen.getByLabelText('Reference (PO Number)'), { target: { value: 'PO-12345' } })
  
  // Submit
  fireEvent.click(screen.getByText(/Allocate \d+ Units/))
  
  // Should call API
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/suppliers/'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('allocate_to_supplier')
      })
    )
  })
  
  // Should show success notification
  expect(screen.getByText('Allocation successful')).toBeInTheDocument()
})
```

---

## 8. Documentation Requirements

### 8.1 API Documentation

**Create**: `docs/api/inventory-allocations.md`

```markdown
# Inventory Allocations API

## Overview

The Inventory Allocations API allows you to allocate inventory quantities to specific suppliers, track allocation history, and manage supplier-specific inventory reservations.

## Endpoints

### POST /api/suppliers/[id]/inventory

Perform bulk inventory operations including allocations.

#### Allocate to Supplier

**Operation**: `allocate_to_supplier`

**Request**:
```json
{
  "operation": "allocate_to_supplier",
  "items": [
    {
      "itemId": "uuid",
      "quantity": 100,
      "reference": "PO-12345",
      "expiresAt": "2024-12-31T23:59:59Z",
      "allocationType": "supplier_order"
    }
  ],
  "reason": "Purchase order allocation"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "processed": 1,
    "errors": [],
    "details": [
      {
        "itemId": "uuid",
        "status": "success",
        "operation": "allocate_to_supplier",
        "allocatedQty": 100
      }
    ]
  },
  "message": "Bulk operation completed. 1 items processed successfully."
}
```

#### Deallocate from Supplier

**Operation**: `deallocate_from_supplier`

**Request**:
```json
{
  "operation": "deallocate_from_supplier",
  "items": [
    {
      "allocationId": "uuid"
    }
  ],
  "reason": "Purchase order cancelled"
}
```

### GET /api/inventory/allocations

Retrieve allocation records.

**Query Parameters**:
- `item_id` (optional): Filter by inventory item
- `supplier_id` (optional): Filter by supplier
- `status` (optional): Filter by status (active, released, expired, fulfilled, cancelled)

**Response**:
```json
{
  "success": true,
  "data": {
    "allocations": [
      {
        "id": "uuid",
        "item_id": "uuid",
        "supplier_id": "uuid",
        "allocated_qty": 100,
        "allocation_type": "supplier_order",
        "reference": "PO-12345",
        "status": "active",
        "allocated_at": "2024-01-15T10:30:00Z",
        "expires_at": "2024-12-31T23:59:59Z",
        "item_name": "Product Name",
        "supplier_name": "Supplier Name"
      }
    ],
    "total": 1
  }
}
```

## Allocation Types

- `supplier_order`: Reserved for supplier purchase order
- `consignment`: Consignment inventory
- `production`: Reserved for production
- `transfer`: In-transit between locations
- `quality_hold`: On hold for quality inspection
- `customer_order`: Reserved for customer order (supplier fulfillment)
- `other`: Other allocation types

## Allocation Status

- `active`: Currently allocated
- `released`: Manually released
- `expired`: Expired automatically
- `fulfilled`: Allocation fulfilled (order completed)
- `cancelled`: Allocation cancelled

## Business Rules

1. **Available Quantity Check**: Cannot allocate more than available quantity
2. **Automatic Expiration**: Allocations with `expires_at` are automatically released when expired
3. **Supplier Ownership**: Can only allocate items that belong to the supplier
4. **Audit Trail**: All allocations are logged with user, timestamp, and reason
5. **Status Transitions**: Active → Released/Expired/Fulfilled/Cancelled (one-way)

## Error Codes

- `400`: Invalid request (missing parameters, invalid format)
- `404`: Supplier or item not found
- `409`: Insufficient available quantity
- `500`: Server error
```

---

### 8.2 User Documentation

**Create**: `docs/user-guide/supplier-inventory-allocation.md`

```markdown
# Supplier Inventory Allocation Guide

## Overview

Inventory allocation allows you to reserve specific quantities of inventory for suppliers. This is useful for:

- Reserving inventory for supplier purchase orders
- Managing consignment inventory
- Tracking supplier-specific stock
- Preventing overselling

## How to Allocate Inventory

### Step 1: Select Supplier

1. Navigate to **Inventory > Supplier Inventory**
2. Select a supplier from the dropdown
3. The system displays all inventory items for that supplier

### Step 2: Allocate Inventory

1. Find the product you want to allocate
2. Click the **Allocate** button in the Actions column
3. The Allocation Dialog opens

### Step 3: Enter Allocation Details

1. **Quantity**: Enter the quantity to allocate (cannot exceed available quantity)
2. **Reference**: Enter a reference number (e.g., PO-12345)
3. **Expires At** (optional): Set an expiration date for the allocation
4. Click **Allocate** to confirm

### Step 4: Verify Allocation

1. The product table updates to show the new allocation
2. Available quantity decreases by the allocated amount
3. You can view allocation history by clicking the product row

## How to Release Allocation

1. Navigate to the product with active allocation
2. Click **View Allocations** to see allocation history
3. Find the allocation you want to release
4. Click **Release** button
5. Confirm the release
6. Available quantity increases by the released amount

## Allocation Expiration

Allocations with expiration dates are automatically released when they expire. You'll receive a notification when allocations are about to expire.

## Best Practices

1. **Always add a reference**: Link allocations to purchase orders or other documents
2. **Set expiration dates**: Prevent allocations from staying active indefinitely
3. **Review regularly**: Check allocation reports to identify unused allocations
4. **Release promptly**: Release allocations when orders are cancelled or fulfilled

## Troubleshooting

**Q: Why can't I allocate inventory?**
A: Check that:
- The item has sufficient available quantity
- You have permission to allocate inventory
- The supplier owns the product

**Q: What happens when allocation expires?**
A: The allocation is automatically released and the quantity becomes available again.

**Q: Can I allocate to multiple suppliers?**
A: Yes, if the same product is available from multiple suppliers, you can allocate to each supplier separately.
```

---

## 9. Success Metrics

### 9.1 Before Implementation

- ❌ No supplier-specific allocation tracking
- ❌ No way to reserve inventory for supplier orders
- ❌ No allocation audit trail
- ❌ No consignment inventory support
- ❌ No multi-supplier allocation
- ❌ Generic `reserved_qty` without context

### 9.2 After Implementation

- ✅ Full supplier allocation tracking
- ✅ Reserve inventory for specific suppliers
- ✅ Complete allocation audit trail
- ✅ Consignment inventory support (optional)
- ✅ Multi-supplier allocation support
- ✅ Contextual reservations with references

### 9.3 KPIs

**Operational Metrics**:
- **Allocation Accuracy**: 100% of allocations tracked with supplier link
- **Audit Completeness**: 100% of allocations have user, timestamp, and reason
- **Expiration Management**: Automatic release of expired allocations
- **API Response Time**: < 200ms for allocation operations

**Business Metrics**:
- **Inventory Visibility**: Clear view of allocated vs available inventory
- **Supplier Transparency**: Suppliers can see their allocated inventory
- **Overselling Prevention**: Zero overselling due to allocation tracking
- **Cash Flow Improvement**: Better consignment inventory management

---

## 10. Risk Assessment

### 10.1 High Risk

**Risk**: Data migration breaks existing inventory calculations
- **Impact**: Incorrect available quantity, overselling
- **Mitigation**: 
  - Test migration on staging environment
  - Backup production database before migration
  - Run validation queries after migration
  - Monitor available_qty calculations for 48 hours
- **Contingency**: Rollback migration, restore from backup

**Risk**: Trigger performance issues on high-volume systems
- **Impact**: Slow inventory updates, API timeouts
- **Mitigation**:
  - Use indexed queries in triggers
  - Test with production-scale data
  - Monitor query performance
  - Consider async updates for non-critical calculations
- **Contingency**: Disable triggers, use scheduled batch updates

### 10.2 Medium Risk

**Risk**: UI complexity confuses users
- **Impact**: User errors, incorrect allocations
- **Mitigation**:
  - User testing before rollout
  - Clear documentation and training
  - Validation and confirmation dialogs
  - Undo/release functionality
- **Contingency**: Simplify UI, add more guidance

**Risk**: Integration with existing workflows breaks
- **Impact**: Purchase orders, sales orders fail
- **Mitigation**:
  - Audit all code that updates `reserved_qty`
  - Update to use allocation API
  - Test all integration points
  - Gradual rollout by module
- **Contingency**: Feature flag to disable allocations

### 10.3 Low Risk

**Risk**: Allocation expiration job fails
- **Impact**: Expired allocations not released
- **Mitigation**:
  - Monitoring and alerting on job failures
  - Manual release option in UI
  - Retry logic in job
- **Contingency**: Manual cleanup script

---

## 11. Conclusion

The current inventory system **lacks supplier-specific allocation and reservation mechanisms**. While it tracks product ownership (which supplier supplies which product), it does not track inventory allocation (which supplier has reserved which quantities).

**Immediate Actions Required**:
1. Decide on allocation model (Recommended: Option B - Advanced Allocation Table)
2. Create database migration for allocation tables
3. Implement allocation API endpoints
4. Build allocation UI components
5. Create allocation reports

**Recommended Approach**: **Option B (Advanced Allocation Table)** provides the most flexibility and auditability while supporting multiple business scenarios.

**Total Implementation Effort**: 
- Core allocation system: 92 hours (~12 days)
- With consignment: 132 hours (~17 days)

**Business Impact**:
- **Before**: No supplier allocation tracking, risk of overselling, no consignment support
- **After**: Full allocation tracking, supplier transparency, consignment support, better inventory control

**Next Steps**:
1. Review this document with stakeholders
2. Clarify business requirements for allocation scenarios
3. Approve recommended design (Option B)
4. Schedule implementation (Phases 1-4)
5. Plan user training and rollout

Refer to specific file paths, line numbers, and code examples throughout this document when implementing the allocation system.