I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

I've completed a comprehensive audit of inventory CRUD operations, stock movements, and store operations. The analysis reveals **critical transactional integrity issues**, **a missing API endpoint**, **disconnected stock movement tracking**, and **15+ validation gaps** that create significant data corruption risks.

**Critical Issues Identified:**
1. **Missing Endpoint**: Store calls `/api/inventory/adjustments` but it doesn't exist (line 325 in store)
2. **Disconnected Operations**: Stock movements don't update `inventory_items.stock_qty` (POST in stock-movements route)
3. **No Transaction Linking**: Movement creation and inventory updates happen separately, risking inconsistency
4. **Partial Success Risk**: Batch operations continue after errors without rollback option
5. **No Negative Stock Prevention**: No validation preventing `stock_qty` from going negative
6. **Missing Audit Trail**: No tracking of who made changes or why
7. **Cascade Delete Risk**: Deleting inventory items orphans stock_movements records
8. **No Business Rule Validation**: `reserved_qty` can exceed `stock_qty`
9. **Computed Column Update**: PUT tries to update `available_qty` which is GENERATED ALWAYS (will fail)
10. **No Existence Checks**: Stock movements don't validate that item_id exists before insert

### Approach

I'll create a comprehensive Phase 5 review document that:

1. **Audits CRUD operations** - analyzing POST/PUT/DELETE in `/api/inventory/route.ts` for validation gaps, transaction safety, and business rule enforcement
2. **Reviews stock movements** - examining `/api/stock-movements/route.ts` and identifying the critical disconnect between movement creation and inventory updates
3. **Inspects store operations** - analyzing `inventory-store.ts` and discovering the missing `/api/inventory/adjustments` endpoint
4. **Documents risks** - cataloging 15+ critical risks including data integrity issues, missing validations, and transactional gaps
5. **Provides remediation plan** - with prioritized fixes, code examples, and implementation guidance for creating the missing adjustment endpoint and fixing transactional integrity

The review will include specific file paths, line numbers, code examples, risk assessments, and a complete implementation roadmap to fix all identified issues.

### Reasoning

I read the four files specified by the user: `/api/inventory/route.ts` (643 lines), `/api/stock-movements/route.ts` (428 lines), `inventory-store.ts` (384 lines), and `StockAdjustmentDialog.tsx` (357 lines). I examined the database schema in `setup-database.sql` to understand table structures and constraints. I used grep to search for the `/api/inventory/adjustments` endpoint and discovered it's referenced in the store but doesn't exist in the codebase. I analyzed the transaction patterns using `withTransaction` in the inventory route and compared them with the stock-movements route. I traced the data flow from the UI dialog through the store to the API endpoints and identified the critical gap where stock movements don't update inventory quantities.

## Mermaid Diagram

sequenceDiagram
    participant UI as StockAdjustmentDialog
    participant Store as InventoryStore
    participant API1 as /api/inventory/adjustments
    participant API2 as /api/stock-movements
    participant API3 as /api/inventory (PUT)
    participant DB as Database
    participant Items as inventory_items
    participant Movements as stock_movements
    
    Note over UI,Movements: CURRENT STATE (Broken)
    
    UI->>Store: adjustInventory(data)
    Store->>API1: POST /api/inventory/adjustments
    Note over API1: ❌ Endpoint doesn't exist!
    API1-->>Store: 404 Not Found
    Store-->>UI: ❌ Error: Failed to adjust inventory
    
    Note over UI: User sees error, no adjustment made
    
    rect rgb(255, 200, 200)
        Note over API2,Movements: Stock Movement Creation (Disconnected)
        UI->>API2: POST /api/stock-movements
        API2->>Movements: INSERT movement record
        Note over API2: ❌ Doesn't update inventory_items!
        Movements-->>API2: Movement created
        API2-->>UI: ✅ Success
        Note over Items: ⚠️ stock_qty unchanged!
        Note over Items,Movements: Movement and inventory OUT OF SYNC
    end
    
    rect rgb(255, 200, 200)
        Note over API3,Items: Batch Update (Partial Failures)
        UI->>API3: PUT /api/inventory (batch)
        API3->>Items: UPDATE item 1 ✅
        API3->>Items: UPDATE item 2 (tries to update available_qty)
        Note over Items: ❌ Error: Cannot update GENERATED column
        API3->>Items: UPDATE item 3 ✅
        Note over API3: ⚠️ Commits partial success
        API3-->>UI: Success: 2 items, Errors: 1 item
        Note over Items: Database in inconsistent state
    end
    
    Note over UI,Movements: FIXED STATE (After Remediation)
    
    UI->>Store: adjustInventory(data)
    Store->>API1: POST /api/inventory/adjustments
    Note over API1: ✅ Endpoint exists!
    
    API1->>DB: BEGIN TRANSACTION
    
    API1->>Items: SELECT * WHERE id = $1
    Items-->>API1: Current item state
    
    Note over API1: Validate adjustment is valid
    alt Decrease exceeds stock
        API1-->>Store: ❌ Error: Insufficient stock
        Store-->>UI: Show error message
    else Valid adjustment
        API1->>Items: UPDATE stock_qty = stock_qty + change
        Items-->>API1: Updated item
        
        API1->>Movements: INSERT movement record
        Movements-->>API1: Movement created
        
        API1->>DB: COMMIT TRANSACTION
        Note over Items,Movements: ✅ Both updated atomically
        
        API1-->>Store: ✅ Success with updated data
        Store->>Store: Refresh items and movements
        Store-->>UI: ✅ Success notification
    end
    
    rect rgb(200, 255, 200)
        Note over API2,Movements: Stock Movement Creation (Linked)
        UI->>API2: POST /api/stock-movements
        API2->>DB: BEGIN TRANSACTION
        
        API2->>Items: SELECT * WHERE id = $1
        Items-->>API2: Current item
        
        Note over API2: Validate movement is valid
        
        API2->>Movements: INSERT movement record
        Movements-->>API2: Movement created
        
        API2->>Items: UPDATE stock_qty based on movement type
        Items-->>API2: Updated item
        
        API2->>DB: COMMIT TRANSACTION
        Note over Items,Movements: ✅ Both updated atomically
        
        API2-->>UI: ✅ Success
        Note over Items,Movements: Movement and inventory IN SYNC
    end
    
    rect rgb(200, 255, 200)
        Note over API3,Items: Batch Update (All-or-Nothing)
        UI->>API3: PUT /api/inventory (batch, failFast=true)
        API3->>DB: BEGIN TRANSACTION
        
        loop For each item
            API3->>Items: Validate item exists
            Note over API3: Filter out computed columns
            API3->>Items: UPDATE (only valid columns)
            
            alt Stock quantity changed
                API3->>Movements: INSERT movement record
            end
        end
        
        alt All items succeeded
            API3->>DB: COMMIT TRANSACTION
            API3-->>UI: ✅ All items updated
        else Any item failed
            API3->>DB: ROLLBACK TRANSACTION
            API3-->>UI: ❌ Error: All changes rolled back
        end
        
        Note over Items: Database remains consistent
    end

## Proposed File Changes

### INVENTORY_OPERATIONS_REVIEW.md(NEW)

References: 

- src\app\api\inventory\route.ts
- src\app\api\stock-movements\route.ts
- src\lib\stores\inventory-store.ts
- src\components\inventory\StockAdjustmentDialog.tsx
- scripts\setup-database.sql
- INVENTORY_ALIGNMENT_REVIEW.md
- INVENTORY_CALCULATIONS_REVIEW.md
- INVENTORY_SUPPLIER_ALLOCATION_REVIEW.md
- INVENTORY_UI_DISPLAY_REVIEW.md

Create a comprehensive Phase 5 review document analyzing inventory CRUD operations, stock movements, store operations, and documenting all risks and validation gaps:

# Inventory Operations & Management Review
## Phase 5: CRUD/Batch Flows, Stock Movements, Store Operations

### Executive Summary

This review identifies **critical transactional integrity issues** and **missing functionality** in the inventory operations system. The most severe problem is that **stock movements are completely disconnected from inventory quantity updates**, meaning movement records are created but inventory quantities never change. Additionally, the **adjustment endpoint doesn't exist**, causing the UI to fail silently.

**Severity**: 🔴 **CRITICAL** - Data integrity at risk, core functionality broken

---

## 1. CRUD Operations Analysis

### 1.1 POST /api/inventory - Create Inventory Item

**File**: `src/app/api/inventory/route.ts` lines 333-476

#### Current Implementation

**Validation** (lines 336):
```typescript
const validatedData = CreateInventoryItemSchema.parse(body)
```

**Schema** (lines 17-38):
```typescript
const CreateInventoryItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  currentStock: z.number().min(0, 'Current stock must be non-negative'),
  reorderPoint: z.number().min(0, 'Reorder point must be non-negative'),
  maxStock: z.number().min(0, 'Max stock must be non-negative'),
  unitCost: z.number().min(0, 'Unit cost must be non-negative'),
  // ... other fields
})
```

**Duplicate Check** (lines 338-346):
```typescript
const existingResult = await pool.query('SELECT id FROM inventory_items WHERE sku = $1', [validatedData.sku])
if (existingResult.rows.length > 0) {
  return NextResponse.json({
    success: false,
    error: 'SKU already exists',
    details: { sku: validatedData.sku }
  }, { status: 409 })
}
```

**Insert Query** (lines 349-381):
```typescript
const insertQuery = `
  INSERT INTO inventory_items (
    sku, name, description, category, supplier_id, supplier_sku,
    cost_price, sale_price, currency, stock_qty, reserved_qty,
    reorder_point, max_stock, unit, location, tags, notes, status
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
  ) RETURNING *
`

const values = [
  validatedData.sku,
  validatedData.name,
  validatedData.description,
  validatedData.category,
  validatedData.supplierId,
  validatedData.supplierSku,
  validatedData.unitCost,
  validatedData.unitPrice,
  validatedData.currency || 'ZAR',
  validatedData.currentStock,
  0, // reserved_qty
  validatedData.reorderPoint,
  validatedData.maxStock,
  validatedData.unit,
  validatedData.primaryLocationId,
  validatedData.tags,
  validatedData.notes,
  validatedData.currentStock > 0 ? 'active' : 'out_of_stock'
]

const result = await pool.query(insertQuery, values)
```

#### Issues Identified

**Issue 1: No Transaction Wrapper**
- **Problem**: Insert happens without transaction
- **Risk**: If cache invalidation fails (line 450), item is created but cache is stale
- **Impact**: Users see outdated data

**Issue 2: No Initial Stock Movement**
- **Problem**: When `currentStock > 0`, no stock movement record is created
- **Risk**: Audit trail is incomplete - can't track where initial stock came from
- **Impact**: Compliance issues, can't trace inventory history

**Issue 3: Status Derivation Logic**
- **Code**: `validatedData.currentStock > 0 ? 'active' : 'out_of_stock'` (line 377)
- **Problem**: Doesn't consider `reorder_point` or `max_stock`
- **Should be**: 
  ```typescript
  const status = 
    currentStock === 0 ? 'out_of_stock' :
    currentStock <= reorderPoint ? 'low_stock' :
    maxStock > 0 && currentStock > maxStock ? 'overstocked' :
    'active'
  ```

**Issue 4: No Validation of Business Rules**
- **Missing**: Check that `reorderPoint <= maxStock`
- **Missing**: Check that `unitPrice >= unitCost` (prevent selling at loss)
- **Missing**: Check that `supplierId` exists if provided

**Issue 5: Reserved Quantity Hardcoded**
- **Code**: `0, // reserved_qty` (line 370)
- **Problem**: Always sets to 0, but what if creating from existing data?
- **Should**: Accept `reservedQty` from request and validate `reservedQty <= currentStock`

#### Recommendations

**Fix 1: Add Transaction Wrapper**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateInventoryItemSchema.parse(body)

    // Use transaction for atomicity
    const result = await withTransaction(async (client) => {
      // Check for duplicate SKU
      const existingResult = await client.query(
        'SELECT id FROM inventory_items WHERE sku = $1',
        [validatedData.sku]
      )
      if (existingResult.rows.length > 0) {
        throw new Error('SKU already exists')
      }

      // Validate supplier exists if provided
      if (validatedData.supplierId) {
        const supplierCheck = await client.query(
          'SELECT id FROM suppliers WHERE id = $1',
          [validatedData.supplierId]
        )
        if (supplierCheck.rows.length === 0) {
          throw new Error('Supplier not found')
        }
      }

      // Insert inventory item
      const insertResult = await client.query(insertQuery, values)
      const newItem = insertResult.rows[0]

      // Create initial stock movement if stock > 0
      if (validatedData.currentStock > 0) {
        await client.query(`
          INSERT INTO stock_movements (
            organization_id, item_id, movement_type, quantity,
            cost, reason, reference, created_at
          ) VALUES ($1, $2, 'IN', $3, $4, $5, $6, NOW())
        `, [
          newItem.organization_id,
          newItem.id,
          validatedData.currentStock,
          validatedData.unitCost,
          'Initial stock',
          'INITIAL_STOCK'
        ])
      }

      return newItem
    })

    // Invalidate cache after successful transaction
    CacheInvalidator.invalidateInventory(result.id, validatedData.supplierId)

    // ... rest of response
  } catch (error) {
    // ... error handling
  }
}
```

**Estimated Effort**: 2 hours

---

### 1.2 PUT /api/inventory - Batch Update

**File**: `src/app/api/inventory/route.ts` lines 479-579

#### Current Implementation

**Transaction Usage** (lines 495-557):
```typescript
await withTransaction(async (client) => {
  for (const updateData of items) {
    try {
      const validatedData = UpdateInventoryItemSchema.parse(updateData)

      if (!validatedData.id) {
        errors.push({ id: updateData.id, error: 'ID is required for updates' })
        continue
      }

      // Check if item exists
      const checkResult = await client.query(
        'SELECT * FROM inventory_items WHERE id = $1',
        [validatedData.id]
      )

      if (checkResult.rows.length === 0) {
        errors.push({ id: validatedData.id, error: 'Item not found' })
        continue
      }

      // Build dynamic update query
      const updateFields = []
      const updateValues = []
      let paramIndex = 1

      Object.entries(validatedData).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          // Convert camelCase to snake_case for database columns
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
          updateFields.push(`${dbKey} = ${paramIndex}`)
          updateValues.push(value)
          paramIndex++
        }
      })

      if (updateFields.length === 0) {
        errors.push({ id: validatedData.id, error: 'No valid fields to update' })
        continue
      }

      updateFields.push(`updated_at = ${paramIndex}`)
      updateValues.push(new Date())
      updateValues.push(validatedData.id) // for WHERE clause

      const updateQuery = `
        UPDATE inventory_items
        SET ${updateFields.join(', ')}
        WHERE id = ${paramIndex + 1}
        RETURNING *
      `

      const result = await client.query(updateQuery, updateValues)
      updatedItems.push(result.rows[0])

    } catch (error) {
      errors.push({
        id: updateData.id,
        error: error instanceof z.ZodError ? error.errors : 'Invalid data'
      })
    }
  }
})
```

#### Issues Identified

**Issue 1: Computed Column Update Attempt**
- **Problem**: If `availableStock` is in the update data, it tries to update `available_qty`
- **Database Schema** (setup-database.sql line 127):
  ```sql
  available_qty INTEGER GENERATED ALWAYS AS (stock_qty - reserved_qty) STORED
  ```
- **Error**: PostgreSQL will reject UPDATE on GENERATED ALWAYS column
- **Fix**: Filter out computed columns before building update query

**Issue 2: No Stock Movement Creation**
- **Problem**: When `stock_qty` changes, no movement record is created
- **Example**: User updates `currentStock` from 100 to 150
- **Result**: Inventory shows 150 but no movement record explains the +50
- **Impact**: Audit trail is broken

**Issue 3: No Validation of Stock Changes**
- **Problem**: Can update `stock_qty` to any value, even negative
- **Missing**: Check that new `stock_qty >= reserved_qty`
- **Missing**: Check that `stock_qty` change is reasonable (e.g., not -1000)
- **Risk**: Data corruption

**Issue 4: Partial Success Without Rollback Option**
- **Behavior**: If 5 out of 10 items fail, the 5 successful ones are committed
- **Problem**: No way to require all-or-nothing
- **Use Case**: User wants to update 100 items atomically
- **Current**: Some succeed, some fail, database is in inconsistent state

**Issue 5: No Optimistic Locking**
- **Problem**: No version checking
- **Scenario**: 
  1. User A reads item (stock_qty = 100)
  2. User B reads item (stock_qty = 100)
  3. User A updates to 150
  4. User B updates to 80
  5. Result: User A's change is lost
- **Fix**: Add `version` column and check in WHERE clause

**Issue 6: CamelCase to Snake_Case Conversion**
- **Code**: `const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()` (line 524)
- **Problem**: Naive conversion doesn't handle all cases
- **Example**: `unitCost` → `unit_cost` ✅
- **Example**: `costPerUnitZAR` → `cost_per_unit_z_a_r` ❌ (should be `cost_per_unit_zar`)
- **Fix**: Use explicit field mapping

#### Recommendations

**Fix 1: Filter Computed Columns**
```typescript
const COMPUTED_COLUMNS = ['availableStock', 'available_stock', 'available_qty']
const READ_ONLY_COLUMNS = ['id', 'created_at', 'organization_id']

Object.entries(validatedData).forEach(([key, value]) => {
  if (key !== 'id' && value !== undefined) {
    const dbKey = camelToSnakeCase(key)
    
    // Skip computed and read-only columns
    if (COMPUTED_COLUMNS.includes(dbKey) || READ_ONLY_COLUMNS.includes(dbKey)) {
      return
    }
    
    updateFields.push(`${dbKey} = ${paramIndex}`)
    updateValues.push(value)
    paramIndex++
  }
})
```

**Fix 2: Create Stock Movement on Quantity Change**
```typescript
// Before update, get current stock_qty
const oldItem = checkResult.rows[0]
const oldStockQty = oldItem.stock_qty

// After update
const newItem = result.rows[0]
const newStockQty = newItem.stock_qty

// If stock quantity changed, create movement
if (newStockQty !== oldStockQty) {
  const quantityChange = newStockQty - oldStockQty
  const movementType = quantityChange > 0 ? 'IN' : 'OUT'
  
  await client.query(`
    INSERT INTO stock_movements (
      organization_id, item_id, movement_type, quantity,
      cost, reason, reference, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
  `, [
    newItem.organization_id,
    newItem.id,
    movementType,
    Math.abs(quantityChange),
    newItem.cost_price,
    'Inventory adjustment via batch update',
    `BATCH_UPDATE_${Date.now()}`
  ])
}
```

**Fix 3: Add Validation**
```typescript
// Validate stock quantity changes
if (validatedData.currentStock !== undefined) {
  const newStockQty = validatedData.currentStock
  const reservedQty = validatedData.reservedStock ?? oldItem.reserved_qty
  
  if (newStockQty < 0) {
    throw new Error('Stock quantity cannot be negative')
  }
  
  if (newStockQty < reservedQty) {
    throw new Error(`Stock quantity (${newStockQty}) cannot be less than reserved quantity (${reservedQty})`)
  }
}

// Validate reserved quantity changes
if (validatedData.reservedStock !== undefined) {
  const newReservedQty = validatedData.reservedStock
  const stockQty = validatedData.currentStock ?? oldItem.stock_qty
  
  if (newReservedQty < 0) {
    throw new Error('Reserved quantity cannot be negative')
  }
  
  if (newReservedQty > stockQty) {
    throw new Error(`Reserved quantity (${newReservedQty}) cannot exceed stock quantity (${stockQty})`)
  }
}
```

**Fix 4: Add Fail-Fast Option**
```typescript
const { items, failFast = false } = body

await withTransaction(async (client) => {
  for (const updateData of items) {
    try {
      // ... update logic
    } catch (error) {
      errors.push({ id: updateData.id, error: error.message })
      
      if (failFast) {
        throw error  // Abort entire transaction
      }
    }
  }
})
```

**Estimated Effort**: 4 hours

---

### 1.3 DELETE /api/inventory - Batch Delete

**File**: `src/app/api/inventory/route.ts` lines 582-643

#### Current Implementation

**Transaction Usage** (lines 598-621):
```typescript
await withTransaction(async (client) => {
  for (const id of ids) {
    // Check if item exists and get its data before deletion
    const checkResult = await client.query(
      'SELECT * FROM inventory_items WHERE id = $1',
      [id]
    )

    if (checkResult.rows.length === 0) {
      notFoundIds.push(id)
      continue
    }

    // Delete the item
    const deleteResult = await client.query(
      'DELETE FROM inventory_items WHERE id = $1 RETURNING *',
      [id]
    )

    if (deleteResult.rows.length > 0) {
      deletedItems.push(deleteResult.rows[0])
    }
  }
})
```

#### Issues Identified

**Issue 1: No Cascade Validation**
- **Problem**: Doesn't check if item is referenced by other tables
- **Risk**: Deleting item that's in active orders causes foreign key violations
- **Tables to Check**:
  - `sales_order_items` (line 285 in setup-database.sql)
  - `purchase_order_items` (line 319 in setup-database.sql)
  - `stock_movements` (line 152 in setup-database.sql)

**Issue 2: Hard Delete Instead of Soft Delete**
- **Problem**: Permanently removes data
- **Risk**: Can't recover accidentally deleted items
- **Risk**: Historical reports break (e.g., "What was our inventory in January?")
- **Best Practice**: Add `deleted_at` column and set it instead of DELETE

**Issue 3: No Stock Movement Record**
- **Problem**: When item with stock is deleted, no movement record is created
- **Example**: Item has 100 units, user deletes it
- **Result**: 100 units disappear from inventory with no audit trail
- **Fix**: Create "write-off" movement before delete

**Issue 4: Orphaned Stock Movements**
- **Database Schema** (setup-database.sql line 152):
  ```sql
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE
  ```
- **Good**: Foreign key has ON DELETE CASCADE
- **Problem**: Stock movements are deleted too, losing audit trail
- **Better**: Keep movements, set item_id to NULL or use soft delete

**Issue 5: No Permission Check**
- **Problem**: Any authenticated user can delete inventory
- **Risk**: Accidental or malicious deletion
- **Fix**: Check user has 'inventory.delete' permission

#### Recommendations

**Fix 1: Add Cascade Validation**
```typescript
for (const id of ids) {
  // Check if item exists
  const checkResult = await client.query(
    'SELECT * FROM inventory_items WHERE id = $1',
    [id]
  )

  if (checkResult.rows.length === 0) {
    notFoundIds.push(id)
    continue
  }

  const item = checkResult.rows[0]

  // Check for active references
  const referencesCheck = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM sales_order_items WHERE item_id = $1) as sales_orders,
      (SELECT COUNT(*) FROM purchase_order_items WHERE item_id = $1) as purchase_orders
  `, [id])

  const refs = referencesCheck.rows[0]
  if (refs.sales_orders > 0 || refs.purchase_orders > 0) {
    errors.push({
      id,
      error: `Cannot delete item: referenced by ${refs.sales_orders} sales orders and ${refs.purchase_orders} purchase orders`
    })
    continue
  }

  // Create write-off movement if item has stock
  if (item.stock_qty > 0) {
    await client.query(`
      INSERT INTO stock_movements (
        organization_id, item_id, movement_type, quantity,
        cost, reason, reference, created_at
      ) VALUES ($1, $2, 'OUT', $3, $4, $5, $6, NOW())
    `, [
      item.organization_id,
      item.id,
      item.stock_qty,
      item.cost_price,
      'Item deleted - stock written off',
      `DELETE_${Date.now()}`
    ])
  }

  // Delete the item
  const deleteResult = await client.query(
    'DELETE FROM inventory_items WHERE id = $1 RETURNING *',
    [id]
  )

  if (deleteResult.rows.length > 0) {
    deletedItems.push(deleteResult.rows[0])
  }
}
```

**Fix 2: Implement Soft Delete**

**Add column to schema**:
```sql
ALTER TABLE inventory_items ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX idx_inventory_deleted ON inventory_items(deleted_at) WHERE deleted_at IS NULL;
```

**Update DELETE endpoint**:
```typescript
// Soft delete instead of hard delete
const deleteResult = await client.query(`
  UPDATE inventory_items
  SET deleted_at = NOW(), status = 'deleted'
  WHERE id = $1 AND deleted_at IS NULL
  RETURNING *
`, [id])
```

**Update GET endpoint** to filter out deleted:
```typescript
WHERE 1=1 AND i.deleted_at IS NULL
```

**Estimated Effort**: 3 hours

---

## 2. Stock Movements Analysis

### 2.1 GET /api/stock-movements - List Movements

**File**: `src/app/api/stock-movements/route.ts` lines 230-358

#### Current Implementation

**Query** (lines 91-117):
```typescript
const query = `
  SELECT
    sm.id,
    sm.item_id,
    ii.name as item_name,
    ii.sku as item_sku,
    sm.movement_type as type,
    sm.type as sub_type,
    sm.quantity,
    sm.reason,
    sm.location_from,
    sm.location_to,
    sm.batch_id,
    sm.expiry_date,
    sm.reference as reference_number,
    sm.cost as unit_cost,
    (sm.cost * sm.quantity) as total_value,
    sm.user_id as performed_by,
    sm.timestamp,
    sm.notes,
    sm.created_at
  FROM stock_movements sm
  LEFT JOIN inventory_items ii ON sm.item_id = ii.id
  WHERE ${whereClauses.join(' AND ')}
  ORDER BY sm.timestamp DESC
  LIMIT ${paramIndex++} OFFSET ${paramIndex++}
`
```

**Analysis**:
- ✅ Proper filtering and pagination
- ✅ Joins with inventory_items for item details
- ✅ Calculates total_value
- ⚠️ Uses `sm.timestamp` but schema has `created_at` (line 164 in setup-database.sql)
- ⚠️ Uses `sm.type` but schema has `movement_type` (line 154 in setup-database.sql)

**Schema Mismatch**:

**Database Schema** (setup-database.sql lines 149-165):
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
    location_from VARCHAR(100),
    location_to VARCHAR(100),
    batch_id VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**API Query Uses**:
- `sm.timestamp` ❌ (doesn't exist, should be `sm.created_at`)
- `sm.type` ❌ (doesn't exist, should be `sm.movement_type`)

**Fix Required**:
```typescript
const query = `
  SELECT
    sm.id,
    sm.item_id,
    ii.name as item_name,
    ii.sku as item_sku,
    sm.movement_type as type,  -- Fixed
    sm.quantity,
    sm.reason,
    sm.location_from,
    sm.location_to,
    sm.batch_id,
    sm.expiry_date,
    sm.reference as reference_number,
    sm.cost as unit_cost,
    (sm.cost * sm.quantity) as total_value,
    sm.user_id as performed_by,
    sm.created_at as timestamp,  -- Fixed
    sm.notes,
    sm.created_at
  FROM stock_movements sm
  LEFT JOIN inventory_items ii ON sm.item_id = ii.id
  WHERE ${whereClauses.join(' AND ')}
  ORDER BY sm.created_at DESC  -- Fixed
  LIMIT ${paramIndex++} OFFSET ${paramIndex++}
`
```

**Estimated Effort**: 30 minutes

---

### 2.2 POST /api/stock-movements - Create Movement

**File**: `src/app/api/stock-movements/route.ts` lines 361-428

#### Current Implementation

**Insert Query** (lines 367-387):
```typescript
const result = await pool.query(`
  INSERT INTO stock_movements (
    item_id, movement_type, quantity, reason, reference,
    location_from, location_to, batch_id, expiry_date,
    cost, notes, user_id, timestamp
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
  RETURNING *
`, [
  validatedData.itemId,
  validatedData.type.toUpperCase(),
  validatedData.quantity,
  validatedData.reason,
  validatedData.referenceNumber,
  validatedData.fromLocationId,
  validatedData.toLocationId,
  validatedData.batchNumber,
  validatedData.expiryDate,
  validatedData.unitCost || 0,
  validatedData.notes,
  validatedData.performedBy
])
```

#### CRITICAL ISSUE: Disconnected from Inventory Updates

**Problem**: Movement is created but `inventory_items.stock_qty` is NEVER updated

**Example Scenario**:
1. User creates movement: type='IN', quantity=100, itemId='abc-123'
2. Movement record is inserted into `stock_movements` table
3. `inventory_items` table is NOT updated
4. Result: Movement shows +100 but inventory quantity stays the same

**Impact**:
- **Data Integrity**: Movements and inventory are out of sync
- **Audit Trail**: Movements exist but don't reflect in inventory
- **Business Logic**: Stock levels are incorrect
- **Reporting**: Movement reports don't match inventory reports

**Root Cause**: No transaction linking movement creation to inventory update

#### Recommendations

**Fix: Link Movement to Inventory Update**

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateStockMovementSchema.parse(body)

    // Use transaction to ensure atomicity
    const result = await withTransaction(async (client) => {
      // Validate item exists
      const itemCheck = await client.query(
        'SELECT * FROM inventory_items WHERE id = $1',
        [validatedData.itemId]
      )

      if (itemCheck.rows.length === 0) {
        throw new Error(`Item ${validatedData.itemId} not found`)
      }

      const item = itemCheck.rows[0]

      // Calculate quantity change based on movement type
      let quantityChange = 0
      switch (validatedData.type) {
        case 'inbound':
          quantityChange = validatedData.quantity
          break
        case 'outbound':
          quantityChange = -validatedData.quantity
          // Validate sufficient stock
          if (item.stock_qty < validatedData.quantity) {
            throw new Error(`Insufficient stock. Available: ${item.stock_qty}, Requested: ${validatedData.quantity}`)
          }
          break
        case 'adjustment':
          // For adjustments, quantity can be positive or negative
          quantityChange = validatedData.quantity
          // Validate won't go negative
          if (item.stock_qty + quantityChange < 0) {
            throw new Error(`Adjustment would result in negative stock: ${item.stock_qty} + ${quantityChange} = ${item.stock_qty + quantityChange}`)
          }
          break
        case 'transfer':
          // Transfer doesn't change total quantity, just location
          quantityChange = 0
          break
      }

      // Insert movement record
      const movementResult = await client.query(`
        INSERT INTO stock_movements (
          organization_id, item_id, movement_type, quantity, reason, reference,
          location_from, location_to, batch_id, expiry_date,
          cost, notes, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        RETURNING *
      `, [
        item.organization_id,
        validatedData.itemId,
        validatedData.type.toUpperCase(),
        validatedData.quantity,
        validatedData.reason,
        validatedData.referenceNumber,
        validatedData.fromLocationId,
        validatedData.toLocationId,
        validatedData.batchNumber,
        validatedData.expiryDate,
        validatedData.unitCost || item.cost_price,
        validatedData.notes,
        validatedData.performedBy
      ])

      // Update inventory quantity if needed
      if (quantityChange !== 0) {
        const updateResult = await client.query(`
          UPDATE inventory_items
          SET stock_qty = stock_qty + $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING *
        `, [quantityChange, validatedData.itemId])

        // Validate update succeeded
        if (updateResult.rows.length === 0) {
          throw new Error('Failed to update inventory quantity')
        }

        // Check for negative stock (shouldn't happen due to validation, but double-check)
        const updatedItem = updateResult.rows[0]
        if (updatedItem.stock_qty < 0) {
          throw new Error(`Update resulted in negative stock: ${updatedItem.stock_qty}`)
        }
      }

      return movementResult.rows[0]
    })

    console.log(`📦 Created stock movement and updated inventory: ${result.id}`)

    // Invalidate cache
    CacheInvalidator.invalidateStockMovements(validatedData.itemId)
    CacheInvalidator.invalidateInventory(validatedData.itemId)

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        itemId: result.item_id,
        type: mapMovementType(result.movement_type),
        quantity: result.quantity,
        reason: result.reason,
        timestamp: serializeTimestamp(result.created_at),
        reference: result.reference,
        notes: result.notes
      },
      message: 'Stock movement created and inventory updated successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('❌ Error creating stock movement:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

**Estimated Effort**: 3 hours

---

## 3. Store Operations Analysis

### 3.1 adjustInventory - Missing Endpoint

**File**: `src/lib/stores/inventory-store.ts` lines 322-346

#### Current Implementation

```typescript
adjustInventory: async (adjustment: InventoryAdjustmentFormData) => {
  set({ loading: true, error: null })
  try {
    const response = await fetch('/api/inventory/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adjustment)
    })

    if (!response.ok) throw new Error('Failed to adjust inventory')

    // Refresh items and movements after adjustment
    await Promise.all([
      get().fetchItems(),
      get().fetchMovements()
    ])

    set({ loading: false })
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      loading: false
    })
  }
}
```

#### CRITICAL ISSUE: Endpoint Doesn't Exist

**Problem**: Store calls `/api/inventory/adjustments` but this endpoint is NOT implemented

**Evidence**: Grep search found no file at `src/app/api/inventory/adjustments/route.ts`

**Impact**:
- **UI Fails**: StockAdjustmentDialog calls this function (line 90)
- **User Experience**: Users click "Apply Adjustment" and get 404 error
- **Data Loss**: Adjustments are never saved
- **Silent Failure**: Error is caught but user may not see it

**Used By**:
- `StockAdjustmentDialog.tsx` line 90
- Any other component calling `useInventoryStore().adjustInventory()`

#### Recommendations

**Create Missing Endpoint**

**Create**: `src/app/api/inventory/adjustments/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withTransaction } from '@/lib/database/unified-connection'
import { CacheInvalidator } from '@/lib/cache/invalidation'

// Validation schema
const AdjustmentSchema = z.object({
  inventory_item_id: z.string().uuid('Invalid item ID'),
  adjustment_type: z.enum(['increase', 'decrease'], {
    required_error: 'Adjustment type is required'
  }),
  quantity: z.number().positive('Quantity must be positive'),
  reason_code: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
  unit_cost_zar: z.number().positive().optional(),
  user_id: z.string().uuid().optional()
})

// POST /api/inventory/adjustments - Create inventory adjustment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = AdjustmentSchema.parse(body)

    // Use transaction for atomicity
    const result = await withTransaction(async (client) => {
      // Get current item state
      const itemResult = await client.query(
        'SELECT * FROM inventory_items WHERE id = $1',
        [validatedData.inventory_item_id]
      )

      if (itemResult.rows.length === 0) {
        throw new Error('Inventory item not found')
      }

      const item = itemResult.rows[0]
      const currentStock = item.stock_qty
      const unitCost = validatedData.unit_cost_zar || item.cost_price

      // Calculate new stock quantity
      let newStock: number
      let quantityChange: number
      let movementType: string

      if (validatedData.adjustment_type === 'increase') {
        newStock = currentStock + validatedData.quantity
        quantityChange = validatedData.quantity
        movementType = 'IN'
      } else {
        newStock = currentStock - validatedData.quantity
        quantityChange = -validatedData.quantity
        movementType = 'OUT'

        // Validate sufficient stock for decrease
        if (newStock < 0) {
          throw new Error(
            `Insufficient stock. Current: ${currentStock}, Requested decrease: ${validatedData.quantity}`
          )
        }

        // Validate won't go below reserved quantity
        if (newStock < item.reserved_qty) {
          throw new Error(
            `Cannot decrease stock below reserved quantity. Reserved: ${item.reserved_qty}, New stock would be: ${newStock}`
          )
        }
      }

      // Update inventory quantity
      const updateResult = await client.query(`
        UPDATE inventory_items
        SET stock_qty = $1,
            cost_price = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [newStock, unitCost, validatedData.inventory_item_id])

      const updatedItem = updateResult.rows[0]

      // Create stock movement record
      const movementResult = await client.query(`
        INSERT INTO stock_movements (
          organization_id, item_id, movement_type, quantity,
          cost, reason, reference, notes, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `, [
        item.organization_id,
        validatedData.inventory_item_id,
        movementType,
        Math.abs(quantityChange),
        unitCost,
        validatedData.reason_code,
        `ADJ_${Date.now()}`,
        validatedData.notes,
        validatedData.user_id
      ])

      return {
        item: updatedItem,
        movement: movementResult.rows[0],
        oldStock: currentStock,
        newStock: newStock,
        quantityChange: quantityChange
      }
    })

    console.log(`📊 Inventory adjusted: ${result.item.name} (${result.oldStock} → ${result.newStock})`)

    // Invalidate cache
    CacheInvalidator.invalidateInventory(validatedData.inventory_item_id)
    CacheInvalidator.invalidateStockMovements(validatedData.inventory_item_id)

    return NextResponse.json({
      success: true,
      data: {
        item: {
          id: result.item.id,
          sku: result.item.sku,
          name: result.item.name,
          currentStock: result.item.stock_qty,
          reservedStock: result.item.reserved_qty,
          availableStock: result.item.available_qty,
          unitCost: parseFloat(result.item.cost_price),
          totalValue: result.item.stock_qty * parseFloat(result.item.cost_price),
          status: result.item.status,
          updatedAt: result.item.updated_at
        },
        movement: {
          id: result.movement.id,
          type: result.movement.movement_type,
          quantity: result.movement.quantity,
          reason: result.movement.reason,
          reference: result.movement.reference,
          createdAt: result.movement.created_at
        },
        summary: {
          oldStock: result.oldStock,
          newStock: result.newStock,
          quantityChange: result.quantityChange,
          adjustmentType: validatedData.adjustment_type
        }
      },
      message: `Inventory adjusted successfully: ${validatedData.adjustment_type === 'increase' ? '+' : ''}${result.quantityChange} units`
    }, { status: 200 })

  } catch (error) {
    console.error('❌ Error adjusting inventory:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to adjust inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

**Estimated Effort**: 3 hours

---

### 3.2 fetchMovements - Wrong Endpoint

**File**: `src/lib/stores/inventory-store.ts` lines 197-215

#### Current Implementation

```typescript
fetchMovements: async (itemId?: string) => {
  set({ loading: true, error: null })
  try {
    const url = itemId
      ? `/api/inventory/movements?item_id=${itemId}`
      : '/api/inventory/movements'

    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch stock movements')

    const data = await response.json()
    set({ movements: data.data, loading: false })
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      loading: false
    })
  }
}
```

#### Issue: Wrong Endpoint Path

**Problem**: Store calls `/api/inventory/movements` but endpoint is at `/api/stock-movements`

**Evidence**: 
- Endpoint file: `src/app/api/stock-movements/route.ts`
- Store calls: `/api/inventory/movements`

**Impact**: 404 error when fetching movements

**Fix**:
```typescript
fetchMovements: async (itemId?: string) => {
  set({ loading: true, error: null })
  try {
    const url = itemId
      ? `/api/stock-movements?itemId=${itemId}`  // Fixed path and param name
      : '/api/stock-movements'  // Fixed path

    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch stock movements')

    const data = await response.json()
    set({ movements: data.data, loading: false })
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      loading: false
    })
  }
}
```

**Estimated Effort**: 15 minutes

---

## 4. UI Component Analysis

### 4.1 StockAdjustmentDialog

**File**: `src/components/inventory/StockAdjustmentDialog.tsx` lines 88-105

#### Current Implementation

```typescript
const onSubmit = async (data: InventoryAdjustmentFormData) => {
  try {
    await adjustInventory(data)
    addNotification({
      type: 'success',
      title: 'Stock adjusted',
      message: `Stock for ${product?.name} has been successfully adjusted`
    })
    form.reset()
    onOpenChange(false)
  } catch (error) {
    addNotification({
      type: 'error',
      title: 'Failed to adjust stock',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}
```

#### Issues Identified

**Issue 1: No Validation of Decrease Amount**
- **Code**: Lines 82-84
  ```typescript
  const newStock = adjustmentType === 'increase'
    ? inventoryItem.current_stock + quantity
    : Math.max(0, inventoryItem.current_stock - quantity)
  ```
- **Problem**: Uses `Math.max(0, ...)` which silently caps at 0
- **Example**: Current stock = 50, user enters decrease of 100
- **Result**: Shows newStock = 0 but doesn't warn user
- **Fix**: Validate and show error

**Issue 2: No Confirmation for Large Adjustments**
- **Problem**: No confirmation dialog for significant changes
- **Example**: User accidentally enters 1000 instead of 100
- **Risk**: Large mistakes are easy to make
- **Fix**: Add confirmation for adjustments > 10% of current stock

**Issue 3: No Batch Adjustment Support**
- **Problem**: Can only adjust one item at a time
- **Use Case**: User needs to adjust 50 items after physical count
- **Current**: Must open dialog 50 times
- **Fix**: Add batch adjustment feature

#### Recommendations

**Fix 1: Add Validation**
```typescript
const onSubmit = async (data: InventoryAdjustmentFormData) => {
  try {
    // Validate decrease doesn't exceed current stock
    if (data.adjustment_type === 'decrease') {
      if (data.quantity > inventoryItem.current_stock) {
        addNotification({
          type: 'error',
          title: 'Invalid adjustment',
          message: `Cannot decrease by ${data.quantity}. Current stock is only ${inventoryItem.current_stock}.`
        })
        return
      }

      // Validate won't go below reserved quantity
      const newStock = inventoryItem.current_stock - data.quantity
      if (newStock < inventoryItem.reserved_stock) {
        addNotification({
          type: 'error',
          title: 'Invalid adjustment',
          message: `Cannot decrease stock below reserved quantity (${inventoryItem.reserved_stock}). New stock would be ${newStock}.`
        })
        return
      }
    }

    // Check for large adjustments (> 50% change)
    const percentChange = (data.quantity / inventoryItem.current_stock) * 100
    if (percentChange > 50) {
      const confirmed = await confirmDialog({
        title: 'Large adjustment detected',
        message: `This will ${data.adjustment_type} stock by ${percentChange.toFixed(0)}%. Are you sure?`,
        confirmText: 'Yes, proceed',
        cancelText: 'Cancel'
      })

      if (!confirmed) return
    }

    await adjustInventory(data)
    addNotification({
      type: 'success',
      title: 'Stock adjusted',
      message: `Stock for ${product?.name} has been successfully adjusted`
    })
    form.reset()
    onOpenChange(false)
  } catch (error) {
    addNotification({
      type: 'error',
      title: 'Failed to adjust stock',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}
```

**Fix 2: Update Preview Calculation**
```typescript
const newStock = adjustmentType === 'increase'
  ? inventoryItem.current_stock + quantity
  : inventoryItem.current_stock - quantity  // Remove Math.max

// Show error if would go negative
const isInvalid = newStock < 0 || newStock < inventoryItem.reserved_stock

// In preview section
{isInvalid && (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      {newStock < 0 
        ? `Invalid: Stock cannot be negative (would be ${newStock})`
        : `Invalid: Stock cannot go below reserved quantity (${inventoryItem.reserved_stock})`
      }
    </AlertDescription>
  </Alert>
)}

// Disable submit if invalid
<Button type="submit" disabled={loading || isInvalid}>
  {loading ? 'Adjusting Stock...' : 'Apply Adjustment'}
</Button>
```

**Estimated Effort**: 2 hours

---

## 5. Risk Assessment

### 5.1 Critical Risks (Fix Immediately)

**Risk 1: Stock Movements Don't Update Inventory**
- **Severity**: 🔴 CRITICAL
- **Impact**: Data integrity compromised, movements and inventory out of sync
- **Likelihood**: 100% (happens every time)
- **Mitigation**: Implement transactional linking (Section 2.2)
- **Effort**: 3 hours

**Risk 2: Missing Adjustment Endpoint**
- **Severity**: 🔴 CRITICAL
- **Impact**: UI feature completely broken, users can't adjust stock
- **Likelihood**: 100% (endpoint doesn't exist)
- **Mitigation**: Create endpoint (Section 3.1)
- **Effort**: 3 hours

**Risk 3: No Negative Stock Prevention**
- **Severity**: 🔴 CRITICAL
- **Impact**: Database can have negative stock quantities
- **Likelihood**: High (no validation)
- **Mitigation**: Add validation and database constraint
- **Effort**: 1 hour

**Risk 4: Computed Column Update Failure**
- **Severity**: 🔴 CRITICAL
- **Impact**: Batch updates fail with PostgreSQL error
- **Likelihood**: High (if availableStock is in update data)
- **Mitigation**: Filter computed columns (Section 1.2)
- **Effort**: 1 hour

**Risk 5: No Transaction on Create**
- **Severity**: 🟠 HIGH
- **Impact**: Partial failures leave database inconsistent
- **Likelihood**: Medium (if cache invalidation fails)
- **Mitigation**: Add transaction wrapper (Section 1.1)
- **Effort**: 2 hours

---

### 5.2 High Risks (Fix This Sprint)

**Risk 6: Cascade Delete Without Validation**
- **Severity**: 🟠 HIGH
- **Impact**: Deleting items in active orders causes data loss
- **Likelihood**: Medium (depends on user behavior)
- **Mitigation**: Add cascade validation (Section 1.3)
- **Effort**: 3 hours

**Risk 7: No Audit Trail for Changes**
- **Severity**: 🟠 HIGH
- **Impact**: Can't track who made changes or why
- **Likelihood**: 100% (no user_id tracking)
- **Mitigation**: Add user_id to all operations
- **Effort**: 2 hours

**Risk 8: Partial Success Without Rollback**
- **Severity**: 🟠 HIGH
- **Impact**: Batch operations leave database in inconsistent state
- **Likelihood**: Medium (if some items fail)
- **Mitigation**: Add failFast option (Section 1.2)
- **Effort**: 1 hour

**Risk 9: Reserved Quantity Can Exceed Stock**
- **Severity**: 🟠 HIGH
- **Impact**: Business logic broken, can reserve more than available
- **Likelihood**: High (no validation)
- **Mitigation**: Add validation (Section 1.2)
- **Effort**: 1 hour

**Risk 10: Schema Mismatch in Stock Movements**
- **Severity**: 🟠 HIGH
- **Impact**: Queries fail or return wrong data
- **Likelihood**: 100% (timestamp vs created_at)
- **Mitigation**: Fix column names (Section 2.1)
- **Effort**: 30 minutes

---

### 5.3 Medium Risks (Next Sprint)

**Risk 11: No Optimistic Locking**
- **Severity**: 🟡 MEDIUM
- **Impact**: Concurrent updates can overwrite each other
- **Likelihood**: Low (depends on concurrent users)
- **Mitigation**: Add version column
- **Effort**: 3 hours

**Risk 12: Hard Delete Instead of Soft Delete**
- **Severity**: 🟡 MEDIUM
- **Impact**: Can't recover deleted items, historical reports break
- **Likelihood**: Medium (accidental deletes)
- **Mitigation**: Implement soft delete (Section 1.3)
- **Effort**: 3 hours

**Risk 13: No Permission Checks**
- **Severity**: 🟡 MEDIUM
- **Impact**: Any user can delete inventory
- **Likelihood**: Low (depends on auth setup)
- **Mitigation**: Add permission checks
- **Effort**: 2 hours

**Risk 14: Wrong Endpoint Path in Store**
- **Severity**: 🟡 MEDIUM
- **Impact**: Movements fetch fails with 404
- **Likelihood**: 100% (wrong path)
- **Mitigation**: Fix path (Section 3.2)
- **Effort**: 15 minutes

**Risk 15: No Large Adjustment Confirmation**
- **Severity**: 🟡 MEDIUM
- **Impact**: Easy to make large mistakes
- **Likelihood**: Medium (user error)
- **Mitigation**: Add confirmation dialog (Section 4.1)
- **Effort**: 2 hours

---

## 6. Validation Gaps

### 6.1 Missing Database Constraints

**Add to schema**:
```sql
-- Prevent negative stock
ALTER TABLE inventory_items
ADD CONSTRAINT chk_stock_qty_non_negative
CHECK (stock_qty >= 0);

-- Prevent reserved exceeding stock
ALTER TABLE inventory_items
ADD CONSTRAINT chk_reserved_qty_valid
CHECK (reserved_qty >= 0 AND reserved_qty <= stock_qty);

-- Prevent negative reorder point
ALTER TABLE inventory_items
ADD CONSTRAINT chk_reorder_point_non_negative
CHECK (reorder_point >= 0);

-- Ensure reorder point <= max stock
ALTER TABLE inventory_items
ADD CONSTRAINT chk_reorder_point_valid
CHECK (max_stock IS NULL OR reorder_point <= max_stock);

-- Prevent negative cost
ALTER TABLE inventory_items
ADD CONSTRAINT chk_cost_price_non_negative
CHECK (cost_price >= 0);

-- Prevent negative movement quantity
ALTER TABLE stock_movements
ADD CONSTRAINT chk_quantity_positive
CHECK (quantity > 0);
```

**Estimated Effort**: 1 hour

---

### 6.2 Missing Application Validations

**Create validation utility**: `src/lib/utils/inventory-validations.ts`

```typescript
export interface InventoryValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateInventoryItem(data: any): InventoryValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Stock quantity validations
  if (data.currentStock < 0) {
    errors.push('Stock quantity cannot be negative')
  }

  if (data.reservedStock < 0) {
    errors.push('Reserved quantity cannot be negative')
  }

  if (data.reservedStock > data.currentStock) {
    errors.push(`Reserved quantity (${data.reservedStock}) cannot exceed stock quantity (${data.currentStock})`)
  }

  // Reorder point validations
  if (data.reorderPoint < 0) {
    errors.push('Reorder point cannot be negative')
  }

  if (data.maxStock && data.reorderPoint > data.maxStock) {
    errors.push(`Reorder point (${data.reorderPoint}) cannot exceed max stock (${data.maxStock})`)
  }

  // Cost validations
  if (data.unitCost < 0) {
    errors.push('Unit cost cannot be negative')
  }

  if (data.unitPrice && data.unitPrice < data.unitCost) {
    warnings.push(`Unit price (${data.unitPrice}) is less than unit cost (${data.unitCost}). This will result in a loss.`)
  }

  // SKU validation
  if (!data.sku || data.sku.trim() === '') {
    errors.push('SKU is required')
  }

  // Name validation
  if (!data.name || data.name.trim() === '') {
    errors.push('Name is required')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateStockAdjustment(
  currentStock: number,
  reservedStock: number,
  adjustmentType: 'increase' | 'decrease',
  quantity: number
): InventoryValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (quantity <= 0) {
    errors.push('Adjustment quantity must be positive')
  }

  if (adjustmentType === 'decrease') {
    const newStock = currentStock - quantity

    if (newStock < 0) {
      errors.push(`Cannot decrease by ${quantity}. Current stock is only ${currentStock}.`)
    }

    if (newStock < reservedStock) {
      errors.push(`Cannot decrease stock below reserved quantity (${reservedStock}). New stock would be ${newStock}.`)
    }

    // Warn if large decrease
    const percentDecrease = (quantity / currentStock) * 100
    if (percentDecrease > 50) {
      warnings.push(`Large decrease detected: ${percentDecrease.toFixed(0)}% of current stock`)
    }
  }

  if (adjustmentType === 'increase') {
    // Warn if very large increase
    const percentIncrease = (quantity / (currentStock || 1)) * 100
    if (percentIncrease > 200) {
      warnings.push(`Very large increase detected: ${percentIncrease.toFixed(0)}% of current stock`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

export function validateStockMovement(
  item: any,
  movementType: string,
  quantity: number
): InventoryValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (quantity <= 0) {
    errors.push('Movement quantity must be positive')
  }

  if (movementType === 'outbound' || movementType === 'OUT') {
    if (quantity > item.stock_qty) {
      errors.push(`Insufficient stock. Available: ${item.stock_qty}, Requested: ${quantity}`)
    }

    const remainingStock = item.stock_qty - quantity
    if (remainingStock < item.reserved_qty) {
      errors.push(`Movement would leave stock (${remainingStock}) below reserved quantity (${item.reserved_qty})`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
```

**Use in endpoints**:
```typescript
// In POST /api/inventory
const validation = validateInventoryItem(validatedData)
if (!validation.valid) {
  return NextResponse.json({
    success: false,
    error: 'Validation failed',
    details: validation.errors
  }, { status: 400 })
}

if (validation.warnings.length > 0) {
  console.warn('Inventory item warnings:', validation.warnings)
}
```

**Estimated Effort**: 2 hours

---

## 7. Transactional Integrity

### 7.1 Current Transaction Usage

**Good Examples**:
- ✅ PUT /api/inventory uses `withTransaction` (line 495)
- ✅ DELETE /api/inventory uses `withTransaction` (line 598)

**Missing Transactions**:
- ❌ POST /api/inventory doesn't use transaction
- ❌ POST /api/stock-movements doesn't use transaction
- ❌ No transaction linking movements to inventory updates

### 7.2 Transaction Best Practices

**Pattern 1: Single Operation with Side Effects**
```typescript
const result = await withTransaction(async (client) => {
  // Main operation
  const item = await client.query('INSERT INTO inventory_items ...')
  
  // Side effects within same transaction
  await client.query('INSERT INTO stock_movements ...')
  await client.query('UPDATE supplier_metrics ...')
  
  return item.rows[0]
})

// Cache invalidation AFTER transaction commits
CacheInvalidator.invalidateInventory(result.id)
```

**Pattern 2: Batch Operations with Partial Success**
```typescript
const results = { success: [], errors: [] }

await withTransaction(async (client) => {
  for (const item of items) {
    try {
      const result = await client.query('UPDATE ...')
      results.success.push(result.rows[0])
    } catch (error) {
      results.errors.push({ item, error })
      
      if (failFast) {
        throw error  // Rollback entire transaction
      }
    }
  }
})

// All successful items are committed
// Failed items are in results.errors
```

**Pattern 3: Validation Before Transaction**
```typescript
// Validate BEFORE starting transaction
const validation = validateInventoryItem(data)
if (!validation.valid) {
  return error response
}

// Only start transaction if validation passes
const result = await withTransaction(async (client) => {
  // ... operations
})
```

### 7.3 Recommended Transaction Boundaries

**Operation 1: Create Inventory Item**
```
BEGIN TRANSACTION
  1. Check SKU doesn't exist
  2. Validate supplier exists (if provided)
  3. Insert inventory_items
  4. Insert stock_movements (if initial stock > 0)
  5. Update supplier metrics
COMMIT
Invalidate cache
```

**Operation 2: Adjust Inventory**
```
BEGIN TRANSACTION
  1. Get current item state
  2. Validate adjustment is valid
  3. Update inventory_items.stock_qty
  4. Insert stock_movements
  5. Update inventory analytics
COMMIT
Invalidate cache
```

**Operation 3: Create Stock Movement**
```
BEGIN TRANSACTION
  1. Validate item exists
  2. Validate movement is valid (sufficient stock for OUT)
  3. Insert stock_movements
  4. Update inventory_items.stock_qty
  5. Update reserved_qty if needed
COMMIT
Invalidate cache
```

**Operation 4: Batch Update**
```
BEGIN TRANSACTION
  FOR EACH item:
    1. Validate item exists
    2. Validate changes are valid
    3. Update inventory_items
    4. Insert stock_movements (if stock_qty changed)
  END FOR
COMMIT (or ROLLBACK if failFast and any error)
Invalidate cache
```

**Operation 5: Delete Inventory Item**
```
BEGIN TRANSACTION
  1. Validate item exists
  2. Check for active references (orders, etc.)
  3. Create write-off movement (if stock > 0)
  4. Soft delete OR hard delete inventory_items
COMMIT
Invalidate cache
```

---

## 8. Priority Recommendations

### Critical (Fix Immediately - Week 1)

**1. Create Missing Adjustment Endpoint** (Section 3.1)
- **File**: Create `src/app/api/inventory/adjustments/route.ts`
- **Effort**: 3 hours
- **Impact**: Fixes broken UI feature

**2. Link Stock Movements to Inventory Updates** (Section 2.2)
- **File**: `src/app/api/stock-movements/route.ts`
- **Effort**: 3 hours
- **Impact**: Fixes data integrity issue

**3. Add Negative Stock Prevention** (Section 6.1)
- **File**: Database migration
- **Effort**: 1 hour
- **Impact**: Prevents data corruption

**4. Filter Computed Columns in Batch Update** (Section 1.2)
- **File**: `src/app/api/inventory/route.ts`
- **Effort**: 1 hour
- **Impact**: Prevents update failures

**5. Fix Schema Mismatch in Stock Movements** (Section 2.1)
- **File**: `src/app/api/stock-movements/route.ts`
- **Effort**: 30 minutes
- **Impact**: Fixes query errors

**Total Week 1**: 8.5 hours (~1 day)

---

### High Priority (Fix This Sprint - Week 2)

**6. Add Transaction to Create Inventory** (Section 1.1)
- **File**: `src/app/api/inventory/route.ts`
- **Effort**: 2 hours
- **Impact**: Ensures atomicity

**7. Add Cascade Validation to Delete** (Section 1.3)
- **File**: `src/app/api/inventory/route.ts`
- **Effort**: 3 hours
- **Impact**: Prevents data loss

**8. Add Stock Movement on Quantity Change** (Section 1.2)
- **File**: `src/app/api/inventory/route.ts`
- **Effort**: 2 hours
- **Impact**: Maintains audit trail

**9. Add Business Rule Validations** (Section 1.2)
- **File**: `src/app/api/inventory/route.ts`
- **Effort**: 2 hours
- **Impact**: Prevents invalid data

**10. Fix Store Endpoint Path** (Section 3.2)
- **File**: `src/lib/stores/inventory-store.ts`
- **Effort**: 15 minutes
- **Impact**: Fixes movements fetch

**11. Add Validation to UI Dialog** (Section 4.1)
- **File**: `src/components/inventory/StockAdjustmentDialog.tsx`
- **Effort**: 2 hours
- **Impact**: Better UX, prevents errors

**Total Week 2**: 11.25 hours (~1.5 days)

---

### Medium Priority (Next Sprint - Week 3)

**12. Implement Soft Delete** (Section 1.3)
- **Effort**: 3 hours
- **Impact**: Data recovery capability

**13. Add Fail-Fast Option** (Section 1.2)
- **Effort**: 1 hour
- **Impact**: Better batch operation control

**14. Create Validation Utilities** (Section 6.2)
- **Effort**: 2 hours
- **Impact**: Reusable validation logic

**15. Add User Tracking** (Section 5.2)
- **Effort**: 2 hours
- **Impact**: Complete audit trail

**16. Add Optimistic Locking** (Section 5.3)
- **Effort**: 3 hours
- **Impact**: Prevents concurrent update issues

**Total Week 3**: 11 hours (~1.5 days)

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Test validation functions**:
```typescript
// src/lib/utils/inventory-validations.test.ts
describe('validateInventoryItem', () => {
  it('should reject negative stock', () => {
    const result = validateInventoryItem({ currentStock: -10 })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Stock quantity cannot be negative')
  })

  it('should reject reserved > stock', () => {
    const result = validateInventoryItem({ currentStock: 100, reservedStock: 150 })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Reserved quantity')
  })

  it('should warn if price < cost', () => {
    const result = validateInventoryItem({ unitCost: 100, unitPrice: 80 })
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

describe('validateStockAdjustment', () => {
  it('should reject decrease exceeding stock', () => {
    const result = validateStockAdjustment(100, 0, 'decrease', 150)
    expect(result.valid).toBe(false)
  })

  it('should reject decrease below reserved', () => {
    const result = validateStockAdjustment(100, 30, 'decrease', 80)
    expect(result.valid).toBe(false)
  })

  it('should warn on large adjustments', () => {
    const result = validateStockAdjustment(100, 0, 'decrease', 60)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
```

---

### 9.2 Integration Tests

**Test transactional integrity**:
```typescript
// tests/api/inventory-transactions.test.ts
describe('Inventory Transactions', () => {
  it('should rollback on error', async () => {
    // Create item with invalid data that will fail mid-transaction
    const response = await fetch('/api/inventory', {
      method: 'POST',
      body: JSON.stringify({
        sku: 'TEST-001',
        name: 'Test Item',
        currentStock: 100,
        supplierId: 'invalid-uuid'  // Will fail supplier check
      })
    })

    expect(response.status).toBe(400)

    // Verify item was NOT created
    const checkResponse = await fetch('/api/inventory?query=TEST-001')
    const data = await checkResponse.json()
    expect(data.data.length).toBe(0)
  })

  it('should create movement when creating item with stock', async () => {
    const response = await fetch('/api/inventory', {
      method: 'POST',
      body: JSON.stringify({
        sku: 'TEST-002',
        name: 'Test Item',
        currentStock: 100,
        unitCost: 50
      })
    })

    const data = await response.json()
    const itemId = data.data.id

    // Verify movement was created
    const movementsResponse = await fetch(`/api/stock-movements?itemId=${itemId}`)
    const movementsData = await movementsResponse.json()
    
    expect(movementsData.data.length).toBe(1)
    expect(movementsData.data[0].type).toBe('inbound')
    expect(movementsData.data[0].quantity).toBe(100)
  })

  it('should update inventory when creating movement', async () => {
    // Create item with 100 stock
    const createResponse = await fetch('/api/inventory', {
      method: 'POST',
      body: JSON.stringify({
        sku: 'TEST-003',
        name: 'Test Item',
        currentStock: 100
      })
    })
    const item = (await createResponse.json()).data

    // Create outbound movement for 30 units
    await fetch('/api/stock-movements', {
      method: 'POST',
      body: JSON.stringify({
        itemId: item.id,
        type: 'outbound',
        quantity: 30,
        reason: 'Test sale'
      })
    })

    // Verify inventory was updated
    const inventoryResponse = await fetch(`/api/inventory?query=${item.sku}`)
    const inventoryData = await inventoryResponse.json()
    
    expect(inventoryData.data[0].currentStock).toBe(70)
  })
})
```

---

### 9.3 End-to-End Tests

**Test complete adjustment flow**:
```typescript
// tests/e2e/stock-adjustment.test.ts
describe('Stock Adjustment Flow', () => {
  it('should adjust stock from UI', async () => {
    // Navigate to inventory page
    await page.goto('/inventory')

    // Find item and click adjust
    await page.click('[data-testid="adjust-stock-TEST-001"]')

    // Fill adjustment form
    await page.selectOption('[name="adjustment_type"]', 'increase')
    await page.fill('[name="quantity"]', '50')
    await page.selectOption('[name="reason_code"]', 'receiving')
    await page.fill('[name="notes"]', 'Test adjustment')

    // Submit
    await page.click('button[type="submit"]')

    // Wait for success notification
    await page.waitForSelector('.notification-success')

    // Verify stock was updated
    const stockElement = await page.textContent('[data-testid="stock-TEST-001"]')
    expect(stockElement).toContain('150')  // Was 100, increased by 50
  })

  it('should prevent invalid adjustments', async () => {
    await page.goto('/inventory')
    await page.click('[data-testid="adjust-stock-TEST-001"]')

    // Try to decrease more than available
    await page.selectOption('[name="adjustment_type"]', 'decrease')
    await page.fill('[name="quantity"]', '200')  // Only 100 available

    // Submit button should be disabled
    const submitButton = await page.$('button[type="submit"]')
    expect(await submitButton?.isDisabled()).toBe(true)

    // Error message should be shown
    await page.waitForSelector('.alert-destructive')
  })
})
```

---

## 10. Migration Checklist

### Phase 5A: Critical Fixes (Week 1)

- [ ] Create `/api/inventory/adjustments` endpoint
- [ ] Add transaction linking in stock movements POST
- [ ] Add database constraints for negative stock prevention
- [ ] Filter computed columns in batch update
- [ ] Fix schema mismatch (timestamp → created_at)
- [ ] Test all critical fixes on staging
- [ ] Deploy to production
- [ ] Monitor for errors

### Phase 5B: High Priority (Week 2)

- [ ] Add transaction wrapper to inventory POST
- [ ] Add cascade validation to DELETE
- [ ] Create stock movements on quantity changes
- [ ] Add business rule validations
- [ ] Fix store endpoint path
- [ ] Add UI validation to adjustment dialog
- [ ] Create integration tests
- [ ] Deploy to production

### Phase 5C: Medium Priority (Week 3)

- [ ] Implement soft delete
- [ ] Add fail-fast option to batch operations
- [ ] Create validation utility functions
- [ ] Add user tracking to all operations
- [ ] Implement optimistic locking
- [ ] Create comprehensive test suite
- [ ] Update documentation
- [ ] Deploy to production

---

## 11. Success Metrics

### Before Fixes

- ❌ Stock movements don't update inventory
- ❌ Adjustment endpoint doesn't exist (404)
- ❌ No validation preventing negative stock
- ❌ Batch updates can fail on computed columns
- ❌ No transaction on inventory creation
- ❌ No audit trail for quantity changes
- ❌ Can delete items in active orders
- ❌ Reserved quantity can exceed stock

### After Fixes

- ✅ Stock movements update inventory atomically
- ✅ Adjustment endpoint works correctly
- ✅ Database constraints prevent negative stock
- ✅ Batch updates filter computed columns
- ✅ All operations use transactions
- ✅ Complete audit trail via stock movements
- ✅ Cascade validation prevents orphaned references
- ✅ Business rules enforced at all layers

### KPIs

- **Data Integrity**: 100% of movements reflected in inventory
- **Transaction Success**: 0 partial failures
- **Validation Coverage**: 100% of business rules enforced
- **Audit Trail**: 100% of quantity changes tracked
- **Error Rate**: < 0.1% of operations fail
- **User Satisfaction**: Measured via feedback

---

## 12. Conclusion

The inventory operations system has **critical transactional integrity issues** that make it unsuitable for production use. The most severe problems are:

1. **Stock movements are disconnected from inventory updates** - movements are recorded but inventory quantities never change
2. **Missing adjustment endpoint** - UI feature is completely broken
3. **No validation preventing negative stock** - data corruption is possible
4. **No transaction linking** - operations can fail partially, leaving database inconsistent

**Immediate Actions Required**:
1. Create adjustment endpoint (3 hours)
2. Link movements to inventory updates (3 hours)
3. Add negative stock prevention (1 hour)
4. Filter computed columns (1 hour)
5. Fix schema mismatch (30 minutes)

**Total Critical Effort**: 8.5 hours (1 day)

**Full Remediation Effort**: 30.75 hours (4 days)

**Business Impact**:
- **Before**: Data integrity at risk, core features broken, no audit trail
- **After**: Transactionally safe, fully functional, complete audit trail

**Recommendation**: Prioritize Week 1 critical fixes for immediate deployment. These fixes address the most severe data integrity and functionality issues. Then proceed with high and medium priority fixes over the following 2 weeks.

Refer to specific file paths, line numbers, and code examples throughout this document when implementing fixes.