# NXT-SPP-Supplier Inventory Portfolio System Architecture

## Overview

The NXT-SPP (Supplier Inventory Portfolio) system is a comprehensive three-layer architecture for managing supplier price lists, product catalogs, inventory selections, and stock on hand reporting.

## Architecture Layers

### 1. SPP (Staging/Isolation) Schema
**Purpose**: Price list upload quarantine and validation

- **Tables**:
  - `spp.pricelist_upload`: Metadata for file uploads
  - `spp.pricelist_row`: Individual rows from uploaded files

- **Responsibilities**:
  - Receive and store raw price list data
  - Validate data against business rules
  - Track upload status and errors
  - Prevent contamination of canonical data

### 2. CORE (Canonical) Schema
**Purpose**: Single source of truth for master data

- **Tables**:
  - `core.supplier`: Supplier master records
  - `core.category`: Product taxonomy
  - `core.product`: Internal product catalog
  - `core.supplier_product`: Supplier SKU mapping
  - `core.price_history`: SCD Type 2 price tracking
  - `core.inventory_selection`: Selection definitions (ISI)
  - `core.inventory_selected_item`: Selected items
  - `core.stock_location`: Physical/virtual locations
  - `core.stock_on_hand`: Stock snapshots

- **Responsibilities**:
  - Maintain normalized master data
  - Track price changes over time
  - Manage product-to-supplier mappings
  - Record inventory selections
  - Store stock snapshots

### 3. SERVE (Reporting) Schema
**Purpose**: Read-optimized views for UI and reporting

- **Views**:
  - `serve.v_product_table_by_supplier`: Selection UI data
  - `serve.v_selected_catalog`: Active selections
  - `serve.v_soh_by_supplier`: Stock by supplier
  - `serve.v_soh_rolled_up`: Aggregated stock
  - `serve.mv_current_prices`: Materialized current prices

- **Responsibilities**:
  - Provide pre-joined, optimized queries
  - Support fast UI rendering
  - Enable complex reporting without impacting core tables

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    1. UPLOAD                             │
│  User uploads price list → SPP Schema (quarantine)      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    2. VALIDATE                           │
│  Validation engine checks data quality and rules        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    3. MERGE                              │
│  Valid data merged into CORE schema:                    │
│  - Upsert supplier_product records                      │
│  - Close old price_history (SCD Type 2)                 │
│  - Insert new price_history records                     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    4. SELECT                             │
│  Users review products via serve.v_product_table        │
│  Select items for stocking → inventory_selected_item    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    5. STOCK                              │
│  Record stock snapshots → stock_on_hand                 │
│  Generate reports via serve.v_soh_by_supplier           │
└─────────────────────────────────────────────────────────┘
```

## API Endpoints

### SPP Layer

#### `POST /api/spp/upload`
Upload pricelist file
- **Request**: Multipart form with file and metadata
- **Response**: Upload record with validation option
- **Parameters**:
  - `file`: Excel/CSV file
  - `supplier_id`: UUID
  - `currency`: 3-letter code (default: ZAR)
  - `auto_validate`: boolean
  - `auto_merge`: boolean

#### `POST /api/spp/validate`
Validate uploaded pricelist
- **Request**: `{ upload_id: UUID }`
- **Response**: Validation result with errors/warnings

#### `POST /api/spp/merge`
Merge validated pricelist into CORE
- **Request**: `{ upload_id: UUID }`
- **Response**: Merge result with statistics

### CORE Layer

#### `GET /api/core/suppliers/products`
List supplier products with filters
- **Query Parameters**:
  - `supplier_id`: Filter by supplier
  - `is_new`: Filter new products
  - `is_active`: Filter active products
  - `is_mapped`: Filter mapped products
  - `search`: Full-text search
  - `limit`, `offset`: Pagination

#### `GET /api/core/suppliers/products/table`
Get product table view for selection UI
- **Query Parameters**:
  - `supplier_id`: Required
  - `include_inactive`: Include inactive products
  - `category_id`: Filter by category
  - `search`: Full-text search

#### `POST /api/core/selections`
Create inventory selection
- **Request**: Selection metadata
- **Response**: Created selection record

#### `POST /api/core/selections/workflow`
Execute selection workflow
- **Request**:
  ```json
  {
    "selection_id": "uuid",
    "supplier_product_ids": ["uuid", ...],
    "action": "select|deselect|approve",
    "selected_by": "uuid"
  }
  ```
- **Response**: Workflow result

#### `GET /api/core/selections/catalog`
Get selected catalog (active selections)
- **Query Parameters**:
  - `supplier_id`: Filter by supplier
  - `category_id`: Filter by category
  - `in_stock_only`: Only in-stock items
  - `search`: Full-text search

### SERVE Layer

#### `GET /api/serve/soh`
Stock on hand by supplier
- **Query Parameters**:
  - `supplier_ids`: Comma-separated UUIDs
  - `location_ids`: Comma-separated UUIDs
  - `product_ids`: Comma-separated UUIDs
  - `as_of_date`: Historical snapshot date
  - `include_zero_stock`: Include zero quantities
  - `selected_only`: Only selected items

#### `GET /api/serve/soh/rolled-up`
Rolled-up SOH (aggregated across suppliers)
- **Query Parameters**:
  - `product_ids`: Comma-separated UUIDs
  - `selected_only`: Only selected items

#### `GET /api/serve/soh/value`
Total inventory value calculation
- **Query Parameters**:
  - `supplier_ids`: Filter by supplier
  - `location_ids`: Filter by location
  - `selected_only`: Only selected items

#### `POST /api/serve/soh/import`
Bulk import stock snapshots
- **Request**: Array of stock records
- **Response**: Import statistics

## Service Layer

### PricelistService
- `createUpload()`: Create upload record
- `insertRows()`: Batch insert pricelist rows
- `validateUpload()`: Execute validation rules
- `mergePricelist()`: Merge into CORE schema
- `listUploads()`: Query upload history

### SupplierProductService
- `list()`: Query products with filters
- `getProductTable()`: Selection UI data
- `mapToProduct()`: Map supplier SKU to internal product
- `bulkMapProducts()`: Batch product mapping
- `assignCategory()`: Assign product category
- `markDiscontinued()`: Mark inactive products
- `getPriceHistory()`: Historical prices

### InventorySelectionService
- `createSelection()`: Create new selection
- `executeWorkflow()`: Select/deselect products
- `getSelectionItems()`: Query selected items
- `getSelectedCatalog()`: Active catalog view
- `updateSelectionStatus()`: Change selection status
- `archiveOldSelections()`: Cleanup old selections

### StockService
- `recordStock()`: Record stock snapshot
- `bulkImportStock()`: Batch import
- `getSohBySupplier()`: Supplier-specific report
- `getSohRolledUp()`: Aggregated report
- `getLatestStock()`: Current stock level
- `getStockHistory()`: Historical snapshots
- `getTotalInventoryValue()`: Value calculation

## Database Connection

### Neon Connection Manager
Located in `lib/database/neon-connection.ts`

**Features**:
- Connection pooling (min: 2, max: 10)
- Automatic error handling
- Transaction support
- Query performance monitoring
- Health check endpoint

**Usage**:
```typescript
import { neonDb, query, withTransaction } from '@/lib/database/neon-connection';

// Simple query
const result = await query('SELECT * FROM core.supplier WHERE active = $1', [true]);

// Transaction
await withTransaction(async (client) => {
  await client.query('INSERT INTO...');
  await client.query('UPDATE...');
});
```

## Type Safety

All types are defined in `src/types/nxt-spp.ts`:
- Database entity types (interfaces)
- Zod validation schemas
- API request/response types
- View types for SERVE layer

**Example**:
```typescript
import { SupplierProduct, SupplierProductSchema } from '@/types/nxt-spp';

// Runtime validation
const validated = SupplierProductSchema.parse(input);

// TypeScript type checking
const product: SupplierProduct = { ... };
```

## Deployment

### 1. Environment Setup
Copy `.env.neon.example` to `.env.local`:
```bash
cp .env.neon.example .env.local
```

Fill in Neon database credentials.

### 2. Database Migration
Run migrations in order:
```bash
psql $NEON_DATABASE_URL -f database/migrations/neon/001_create_spp_schema.sql
psql $NEON_DATABASE_URL -f database/migrations/neon/002_create_core_schema.sql
psql $NEON_DATABASE_URL -f database/migrations/neon/003_create_serve_schema.sql
```

### 3. Verify Connection
Test the database connection:
```bash
npm run dev
curl http://localhost:3000/api/health/database
```

### 4. Initial Data Load
1. Create supplier records
2. Upload initial price lists via `/api/spp/upload`
3. Validate and merge
4. Create inventory selections

## Performance Optimization

### Indexes
All critical paths have indexes:
- Supplier product lookups by SKU
- Price history current price queries
- Selection status filtering
- Stock location + product queries

### Materialized Views
`serve.mv_current_prices` is materialized for performance.

**Refresh after merge**:
```sql
SELECT serve.refresh_materialized_views();
```

### Query Optimization
- Use prepared statements
- Batch operations where possible
- Leverage connection pooling
- Monitor slow queries (> 1000ms logged)

## Security Considerations

1. **Input Validation**: All inputs validated with Zod schemas
2. **SQL Injection**: Parameterized queries only
3. **File Upload**: Size limits and type validation
4. **Authentication**: JWT-based (integrate with existing auth)
5. **Rate Limiting**: Configure per endpoint
6. **SSL**: Required for Neon connections

## Monitoring

### Health Checks
- `/api/health/database`: Database connectivity
- Connection pool status: `getPoolStatus()`
- Slow query logging

### Metrics to Track
- Upload success/failure rates
- Validation error rates
- Merge duration
- Query performance
- Stock value trends

## Troubleshooting

### Common Issues

**Connection Timeout**
- Check Neon database status
- Verify connection string
- Increase `NEON_POOL_CONNECTION_TIMEOUT`

**Upload Fails**
- Check file format (Excel/CSV)
- Verify column mappings
- Review validation errors in `errors_json`

**Merge Errors**
- Ensure data validated first
- Check for duplicate SKUs
- Verify foreign key constraints

**Slow Queries**
- Check index usage: `EXPLAIN ANALYZE`
- Refresh materialized views
- Review connection pool settings

## Future Enhancements

1. **Real-time Updates**: WebSocket for live price changes
2. **Advanced Analytics**: Predictive stock levels
3. **Supplier Portal**: Direct supplier data integration
4. **Multi-currency**: Real-time FX conversion
5. **Workflow Approval**: Multi-level selection approval
6. **Audit Trail**: Comprehensive change tracking
7. **Export**: Excel/PDF report generation
8. **API Versioning**: Support multiple API versions

## Support

For issues or questions:
1. Check this documentation
2. Review API endpoint responses for error details
3. Check database logs for query errors
4. Review service layer error handling

## License

Proprietary - MantisNXT Internal Use Only
