# NXT-SPP Quick Reference Guide
**System**: Supplier Product Portfolio Management
**Version**: 1.0
**Last Updated**: 2025-10-06

## 🚀 Quick Start

```typescript
import { supplierPortfolioAPI } from '@/lib/api/supplier-portfolio-client-enhanced'
import { completePricelistWorkflow, completeISIWorkflow } from '@/lib/utils/nxt-spp-helpers'
```

---

## 📦 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      NXT-SPP SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────┐      ┌───────────┐      ┌───────────┐       │
│  │    SPP    │  →   │   CORE    │  →   │   SERVE   │       │
│  │ (Staging) │      │(Canonical)│      │  (Views)  │       │
│  └───────────┘      └───────────┘      └───────────┘       │
│                                                               │
│  Upload/Validate   Master Data      Read-Optimized          │
│                    + ISI            Reports                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Common Workflows

### 1. Pricelist Upload → Merge Workflow

```typescript
// One-liner complete workflow
const result = await completePricelistWorkflow(
  supplierPortfolioAPI,
  file,
  supplierId,
  {
    currency: 'ZAR',
    valid_from: new Date(),
    on_progress: (stage, data) => console.log(stage, data)
  }
)

// Manual step-by-step (if you need more control)
const upload = await supplierPortfolioAPI.uploadPricelist(file, supplierId, {
  auto_validate: false,
  auto_merge: false
})

const validation = await supplierPortfolioAPI.validateUpload(upload.data.upload_id)

if (validation.data?.status === 'valid') {
  const merge = await supplierPortfolioAPI.mergePricelist(upload.data.upload_id)
}
```

---

### 2. Product Selection (ISI) Workflow

```typescript
// One-liner complete workflow
const result = await completeISIWorkflow(
  supplierPortfolioAPI,
  'Q4 2024 Selection',
  selectedProductIds,
  userId,
  {
    description: 'Seasonal selection',
    on_progress: (stage, data) => console.log(stage, data)
  }
)

// Manual step-by-step
const selection = await supplierPortfolioAPI.createSelection(
  'Q4 2024 Selection',
  'Seasonal selection',
  userId
)

const workflow = await supplierPortfolioAPI.executeWorkflow({
  selection_id: selection.data.selection_id,
  supplier_product_ids: selectedProductIds,
  action: 'select',
  selected_by: userId
})

const activated = await supplierPortfolioAPI.activateSelection(
  selection.data.selection_id
)
```

---

### 3. SOH Reporting (CRITICAL: Always selected_only: true by default)

```typescript
// Get SOH by supplier (defaults to selected products only)
const soh = await supplierPortfolioAPI.getSohBySupplier({
  supplier_id: 'abc-123',
  selected_only: true  // Optional - defaults to true
})

// Get rolled-up SOH (cross-supplier aggregation)
const rolled = await supplierPortfolioAPI.getSohRolledUp({
  category_id: 'xyz-456',
  selected_only: true
})

// Get total inventory value
const value = await supplierPortfolioAPI.getInventoryValue(
  ['supplier-1', 'supplier-2'],
  true  // selectedOnly - defaults to true
)

// Export to Excel
const blob = await supplierPortfolioAPI.exportSohReport(
  {
    supplier_ids: ['abc-123'],
    selected_only: true,
    group_by: 'supplier'
  },
  'xlsx'
)
```

---

## 📊 API Methods Reference

### Upload Methods (SPP)

| Method | Purpose | Returns |
|--------|---------|---------|
| `uploadPricelist(file, supplierId, options)` | Upload pricelist file | Upload record |
| `validateUpload(uploadId)` | Validate upload | Validation result |
| `mergePricelist(uploadId)` | Merge to CORE | Merge result |
| `getUploadStatus(uploadId, maxAttempts, intervalMs)` | Poll status | Final status |
| `listUploads(supplierId, limit)` | List recent uploads | Upload list |

### Selection Methods (ISI - CORE)

| Method | Purpose | Returns |
|--------|---------|---------|
| `createSelection(name, description, createdBy)` | Create selection | Selection record |
| `executeWorkflow(request)` | Select/deselect products | Operation result |
| `getSelectionItems(selectionId, filters)` | List selected items | Item list |
| `activateSelection(selectionId)` | Activate selection | Updated selection |
| `getActiveCatalog(filters)` | Get active catalog | Product list |
| `getProductTableForISI(supplierId, filters)` | ISI wizard data | Product table |

### SOH Methods (SERVE)

| Method | Purpose | Returns |
|--------|---------|---------|
| `getSohBySupplier(filters)` | SOH by supplier | SOH data |
| `getSohRolledUp(filters)` | Rolled-up SOH | Aggregated SOH |
| `getInventoryValue(supplierIds, selectedOnly)` | Total value | Value data |
| `exportSohReport(request, format)` | Export report | Blob |

### Dashboard Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `getDashboardMetrics()` | Aggregate metrics | Metrics |
| `getRecentActivity(limit)` | Activity feed | Activities |
| `getPriceChangeAlerts(days, severity)` | Price alerts | Alerts |
| `getNewProductAlerts(days)` | New products | Alerts |

---

## 🛠️ Utility Helpers

### Query Builders

```typescript
import {
  buildSupplierProductQuery,
  buildSohQuery,
  buildPaginationQuery
} from '@/lib/utils/nxt-spp-helpers'

// Build type-safe query parameters
const params = buildSupplierProductQuery({
  supplier_id: 'abc-123',
  is_new: true,
  price_min: 100
})
```

### Data Transformations

```typescript
import {
  calculateInventoryValue,
  groupSohBySupplier,
  calculatePriceChangeStats,
  transformToISIWizardData
} from '@/lib/utils/nxt-spp-helpers'

// Calculate inventory value
const { total, by_supplier, by_location } = calculateInventoryValue(sohData)

// Group by supplier
const grouped = groupSohBySupplier(sohData)

// Price change statistics
const stats = calculatePriceChangeStats(products)

// Transform for ISI wizard
const wizardData = transformToISIWizardData(products)
```

### Validation Helpers

```typescript
import {
  validatePriceChange,
  isProductSelectableForISI
} from '@/lib/utils/nxt-spp-helpers'

// Validate price change
const validation = validatePriceChange(oldPrice, newPrice, 50, 30)
if (!validation.valid) {
  console.error(validation.message)
}

// Check if product is selectable
const { selectable, reasons } = isProductSelectableForISI(product)
if (!selectable) {
  console.error('Cannot select:', reasons)
}
```

### Export Helpers

```typescript
import {
  formatSohForExport,
  formatProductTableForExport
} from '@/lib/utils/nxt-spp-helpers'

// Format for Excel export
const excelData = formatSohForExport(sohData)
const productExcel = formatProductTableForExport(products)
```

---

## 🎯 Filter & Pagination Examples

### Product Filters

```typescript
const filters = {
  supplier_id: 'abc-123',
  category_id: 'xyz-456',
  brand: 'ACME',
  is_new: true,
  is_mapped: true,
  price_min: 100,
  price_max: 1000,
  has_price_change: true,
  price_change_direction: 'up',
  search: 'widget',
  is_selected: true,
  selection_id: 'sel-789'
}

const products = await supplierPortfolioAPI.getSupplierProducts(filters, {
  page: 1,
  page_size: 50,
  sort_by: 'current_price',
  sort_direction: 'desc'
})
```

### SOH Filters

```typescript
const filters = {
  supplier_id: 'abc-123',
  location_id: 'loc-456',
  category_id: 'cat-789',
  min_qty: 10,
  max_qty: 1000,
  min_value: 5000,
  search: 'widget',
  selected_only: true  // CRITICAL: Always true by default
}

const soh = await supplierPortfolioAPI.getSohBySupplier(filters)
```

---

## ⚠️ Important Conventions

### 1. **SOH: Always Filter to Selected Products**

```typescript
// ✅ CORRECT (defaults to selected_only: true)
const soh = await supplierPortfolioAPI.getSohBySupplier({
  supplier_id: 'abc-123'
})

// ✅ CORRECT (explicit)
const soh = await supplierPortfolioAPI.getSohBySupplier({
  supplier_id: 'abc-123',
  selected_only: true
})

// ❌ INCORRECT (includes unselected products)
const soh = await supplierPortfolioAPI.getSohBySupplier({
  supplier_id: 'abc-123',
  selected_only: false  // Only use if you REALLY need unselected products
})
```

**Why?** SOH reporting should reflect only selected inventory to prevent financial reporting errors.

---

### 2. **Batch Operations: Use Chunking for Large Datasets**

```typescript
// ✅ CORRECT (automatic chunking)
const result = await batchSelectProducts(
  supplierPortfolioAPI,
  selectionId,
  supplierProductIds,  // Can be 1000+ items
  userId,
  {
    chunk_size: 100,
    on_chunk_complete: (processed, total) => {
      console.log(`Progress: ${processed}/${total}`)
    }
  }
)

// ❌ INCORRECT (single request with 1000+ items)
const result = await supplierPortfolioAPI.executeWorkflow({
  selection_id: selectionId,
  supplier_product_ids: supplierProductIds,  // Too large!
  action: 'select',
  selected_by: userId
})
```

---

### 3. **Error Handling: Use Try-Catch with Retry Logic**

```typescript
// ✅ CORRECT (retry logic built-in)
try {
  const result = await supplierPortfolioAPI.uploadPricelist(file, supplierId)
  if (!result.success) {
    console.error('Upload failed:', result.error)
  }
} catch (error) {
  console.error('Unexpected error:', error)
}

// ℹ️ Automatic retry happens for:
// - Network errors
// - 408 Request Timeout
// - 429 Too Many Requests
// - 5xx Server Errors
```

---

## 🔍 Troubleshooting

### Upload Fails with "Invalid file format"
```typescript
// Check file type before upload
if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
  throw new Error('Only Excel (.xlsx) and CSV files are supported')
}
```

### Validation Returns "Unmapped categories"
```typescript
// Get unmapped categories
const unmapped = await supplierPortfolioAPI.getUnmappedCategories(supplierId)

// Map categories before merging
for (const item of unmapped) {
  await supplierPortfolioAPI.mapSupplierCategory(
    supplierId,
    item.category_raw,
    targetCategoryId
  )
}
```

### SOH Value is Zero
```typescript
// Check if selection is active
const selection = await supplierPortfolioAPI.getSelection(selectionId)
if (selection.data.status !== 'active') {
  console.error('Selection must be active for SOH reporting')
}

// Check if products are selected
const items = await supplierPortfolioAPI.getSelectionItems(selectionId)
if (items.data.length === 0) {
  console.error('No products selected')
}
```

---

## 📚 Type Definitions

All types are exported from `@/types/supplier-portfolio`:

```typescript
import type {
  SupplierProduct,
  ProductTableBySupplier,
  InventorySelection,
  InventorySelectedItem,
  SOHBySupplier,
  SOHRolledUp,
  SPPPricelistUpload,
  UploadValidationResult,
  DashboardMetrics,
  PriceChangeAlert,
  NewProductAlert,
  SelectionWorkflowRequest,
  BulkOperationResult,
  APIResponse
} from '@/types/supplier-portfolio'
```

---

## 🔗 API Endpoint Mapping

| Frontend Method | Backend Endpoint |
|----------------|------------------|
| `uploadPricelist()` | `POST /api/spp/upload` |
| `validateUpload()` | `POST /api/spp/validate` |
| `mergePricelist()` | `POST /api/spp/merge` |
| `listUploads()` | `GET /api/spp/upload` |
| `getSupplierProducts()` | `GET /api/core/suppliers/products` |
| `getProductTableForISI()` | `GET /api/core/suppliers/products/table` |
| `createSelection()` | `POST /api/core/selections` |
| `executeWorkflow()` | `POST /api/core/selections/workflow` |
| `getActiveCatalog()` | `GET /api/core/selections/catalog` |
| `getSohBySupplier()` | `GET /api/serve/soh` |
| `getSohRolledUp()` | `GET /api/serve/soh/rolled-up` |
| `getInventoryValue()` | `GET /api/serve/soh/value` |
| `exportSohReport()` | `GET /api/serve/soh/export` |

---

## 🎓 Next Steps

1. **Read the complete backend enhancement report**: `claudedocs/BACKEND_ENHANCEMENT_COMPLETE_REPORT.md`
2. **Review type definitions**: `src/types/supplier-portfolio.ts`
3. **Explore helper utilities**: `src/lib/utils/nxt-spp-helpers.ts`
4. **Check API client source**: `src/lib/api/supplier-portfolio-client-enhanced.ts`

---

**Quick Reference Version**: 1.0
**Last Updated**: 2025-10-06
**Maintained by**: ASTER FULLSTACK ARCHITECT
