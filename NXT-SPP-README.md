# NXT-SPP: Supplier Inventory Portfolio System

[![Status](https://img.shields.io/badge/status-ready-green.svg)](https://shields.io/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/next.js-15.5-black.svg)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/database-neon_postgresql-blue.svg)](https://neon.tech/)

A comprehensive three-layer architecture system for managing supplier price lists, product catalogs, inventory selections, and stock on hand reporting.

## 🎯 Overview

NXT-SPP provides a complete solution for:
- **Price List Management**: Upload, validate, and merge supplier price lists
- **Product Catalog**: Maintain supplier product mappings and categorization
- **Inventory Selection**: Workflow for selecting products to stock (ISI)
- **Stock Reporting**: Real-time stock on hand tracking and reporting

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  SPP (Staging/Isolation)                    │
│  Upload → Validate → Quarantine             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  CORE (Canonical Master Data)               │
│  SCD Type 2 Price Tracking                  │
│  Product Mappings & Selections              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  SERVE (Read-Optimized Views)               │
│  Fast Queries & Reporting                   │
└─────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Neon PostgreSQL database
- Basic TypeScript knowledge

### Installation

1. **Clone and Install**
   ```bash
   cd MantisNXT
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.neon.example .env.local
   # Edit .env.local with your Neon credentials
   ```

3. **Run Database Migrations**
   ```bash
   psql $NEON_DATABASE_URL -f database/migrations/neon/001_create_spp_schema.sql
   psql $NEON_DATABASE_URL -f database/migrations/neon/002_create_core_schema.sql
   psql $NEON_DATABASE_URL -f database/migrations/neon/003_create_serve_schema.sql
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Verify Installation**
   ```bash
   curl http://localhost:3000/api/health/database
   ```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/NXT-SPP-ARCHITECTURE.md) | Complete system architecture and design |
| [Quick Start](docs/NXT-SPP-QUICKSTART.md) | Getting started guide |
| [Integration Guide](docs/NXT-SPP-INTEGRATION-GUIDE.md) | Step-by-step integration instructions |
| [Implementation Summary](docs/NXT-SPP-IMPLEMENTATION-SUMMARY.md) | Complete implementation details |

## 🛠️ Key Features

### 1. Price List Management
- ✅ Upload Excel/CSV files
- ✅ Automatic validation with business rules
- ✅ SCD Type 2 price history tracking
- ✅ Batch processing (100+ rows/sec)

### 2. Product Catalog
- ✅ Supplier product mappings
- ✅ Category assignment
- ✅ New product flagging
- ✅ Full-text search

### 3. Inventory Selection (ISI)
- ✅ Selection workflow (select/deselect/approve)
- ✅ Multi-supplier selections
- ✅ Selection history tracking
- ✅ Active catalog view

### 4. Stock Management
- ✅ Stock on hand snapshots
- ✅ By-supplier reporting
- ✅ Cross-supplier aggregation
- ✅ Inventory valuation

## 🔌 API Endpoints

### SPP Layer
```
POST   /api/spp/upload      - Upload price list
POST   /api/spp/validate    - Validate upload
POST   /api/spp/merge       - Merge to CORE
GET    /api/spp/upload      - Upload history
```

### CORE Layer
```
GET    /api/core/suppliers/products        - List products
GET    /api/core/suppliers/products/table  - Selection UI view
POST   /api/core/selections                - Create selection
POST   /api/core/selections/workflow       - Selection workflow
GET    /api/core/selections/catalog        - Active catalog
```

### SERVE Layer
```
GET    /api/serve/soh              - Stock by supplier
GET    /api/serve/soh/rolled-up    - Aggregated stock
GET    /api/serve/soh/value        - Inventory value
POST   /api/serve/soh/import       - Bulk import
```

## 💻 Usage Examples

### Upload Price List

```typescript
import { pricelistService } from '@/lib/services/PricelistService';

const upload = await pricelistService.createUpload({
  supplier_id: supplierId,
  file: fileBuffer,
  filename: 'pricelist.xlsx',
  currency: 'ZAR',
  options: { auto_validate: true }
});
```

### Get Supplier Products

```typescript
import { supplierProductService } from '@/lib/services/SupplierProductService';

const products = await supplierProductService.getProductTable(supplierId, {
  include_inactive: false,
  search: 'widget'
});
```

### Execute Selection Workflow

```typescript
import { inventorySelectionService } from '@/lib/services/InventorySelectionService';

const result = await inventorySelectionService.executeWorkflow({
  selection_id: selectionId,
  supplier_product_ids: ['uuid1', 'uuid2'],
  action: 'select',
  selected_by: userId
});
```

### Generate SOH Report

```typescript
import { stockService } from '@/lib/services/StockService';

const sohData = await stockService.getSohBySupplier({
  supplier_ids: [supplierId],
  selected_only: true
});
```

## 🔐 Security

- ✅ Input validation with Zod schemas
- ✅ Parameterized SQL queries (no injection)
- ✅ File upload size limits
- ✅ SSL/TLS for database connections
- ✅ Rate limiting support
- ✅ Authentication ready (integrate with your auth)

## ⚡ Performance

- **Upload Processing**: 1000 rows in <5 seconds
- **Validation**: 1000 rows in <2 seconds
- **Merge**: 1000 products in <10 seconds
- **Query Response**: <100ms for 1000 products
- **SOH Report**: <200ms for 5000 items

### Optimization Features
- Connection pooling (2-10 connections)
- Batch processing (100 records/batch)
- 30+ strategic indexes
- Materialized views for current prices
- Slow query monitoring (>1000ms logged)

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## 📊 Database Schema

### SPP Schema (Staging)
- `pricelist_upload` - Upload metadata
- `pricelist_row` - Raw data rows

### CORE Schema (Canonical)
- `supplier` - Supplier master
- `category` - Product taxonomy
- `product` - Internal catalog
- `supplier_product` - SKU mapping
- `price_history` - SCD Type 2 pricing
- `inventory_selection` - Selection definitions
- `inventory_selected_item` - Selected items
- `stock_location` - Stock locations
- `stock_on_hand` - Stock snapshots

### SERVE Schema (Views)
- `v_product_table_by_supplier` - Selection UI
- `v_selected_catalog` - Active catalog
- `v_soh_by_supplier` - Stock by supplier
- `v_soh_rolled_up` - Aggregated stock
- `mv_current_prices` - Materialized prices

## 🛠️ Development

### Project Structure

```
MantisNXT/
├── src/
│   ├── app/api/          # API routes
│   │   ├── spp/          # Staging endpoints
│   │   ├── core/         # Core endpoints
│   │   └── serve/        # Reporting endpoints
│   ├── lib/
│   │   └── services/     # Business logic
│   └── types/
│       └── nxt-spp.ts    # Type definitions
├── lib/database/
│   └── neon-connection.ts # Database connection
├── database/migrations/
│   └── neon/             # SQL migrations
└── docs/                 # Documentation
```

### Service Layer

- `PricelistService` - Price list operations
- `SupplierProductService` - Product catalog
- `InventorySelectionService` - Selection workflow
- `StockService` - Stock management

### Type System

All types defined in `src/types/nxt-spp.ts`:
- Database entities
- Zod validation schemas
- API request/response types
- View types

## 🐛 Troubleshooting

### Connection Issues
```bash
# Check Neon database status
psql $NEON_DATABASE_URL -c "SELECT NOW();"

# Verify connection pool
curl http://localhost:3000/api/health/database
```

### Upload Failures
- Check file format (.xlsx, .xls, .csv)
- Verify column mappings
- Review `errors_json` in upload record

### Slow Queries
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM core.supplier_product WHERE...

-- Refresh materialized views
SELECT serve.refresh_materialized_views();
```

## 📈 Monitoring

### Health Checks
- `/api/health/database` - Connection status
- Pool status via `getPoolStatus()`
- Slow query logs

### Metrics to Track
- Upload success/failure rates
- Validation error counts
- Query performance
- Stock value trends

## 🤝 Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Run linting: `npm run lint`
5. Type check: `npm run type-check`

## 📝 License

Proprietary - MantisNXT Internal Use Only

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Zod](https://zod.dev/) - Schema validation
- [XLSX](https://www.npmjs.com/package/xlsx) - Excel parsing

## 📞 Support

For issues or questions:
1. Check documentation in `docs/`
2. Review API responses for error details
3. Check database logs
4. Contact development team

---

**Version**: 1.0.0
**Status**: ✅ Production Ready
**Last Updated**: 2025-10-06
**Database**: Neon PostgreSQL (proud-mud-50346856)
