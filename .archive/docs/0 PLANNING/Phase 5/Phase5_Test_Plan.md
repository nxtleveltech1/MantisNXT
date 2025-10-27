
# Phase 5 Test Plan — Inventory Operations

## 1. Unit Tests
- **Validation**: `assertSaneQuantities`, `validateAdjustment`
  - Cases: negative inputs, reserved > stock, delta drives stock < 0

## 2. Integration Tests (DB + API)
- **POST /api/stock-movements**
  - IN increases stock; OUT decreases stock; cannot go below 0 or below reserved
  - TRANSFER emits OUT (source) and IN (target) pair
- **POST /api/inventory/adjustments**
  - ADJUST +10, WRITE_OFF 5; guardrails enforced
- **PUT /api/inventory (batch)**
  - Ignores computed columns; optional movement generation; failFast on/off

## 3. Triggers (if enabled)
- Inserting movement updates `inventory_items.stock_qty` and rejects invalid states
- Soft-delete sets `deleted_at` and auto WRITE_OFF remaining stock

## 4. E2E (UI)
- StockAdjustmentDialog prevents invalid entries; warns on large changes
- Movements tab lists by `created_at` desc; shows movement types

## 5. Regression
- Phase 2 metrics still correct post schema changes
- Phase 3 allocations CRUD + expiry unaffected
