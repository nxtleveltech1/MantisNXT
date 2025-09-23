# Enhanced Inventory Management System - Database Schema Documentation

## Overview

The Enhanced Inventory Management System provides a comprehensive, scalable database schema designed for modern supply chain operations. This system supports multi-supplier environments, versioned pricing, detailed stock tracking, and performance analytics.

## Core Architecture

### Design Principles

1. **Scalability**: Partitioned tables for high-volume data (stock movements, price history)
2. **Data Integrity**: Comprehensive constraints and triggers ensure data consistency
3. **Audit Trail**: Complete audit logging for all operations with user tracking
4. **Performance**: Optimized indexes for common query patterns
5. **Flexibility**: JSONB fields for extensible metadata and configurations

### Multi-tenancy

All tables include `org_id` for complete organization isolation:
- Row-level security (RLS) policies ensure data segregation
- Indexes optimized for organization-specific queries
- Audit trails maintain organizational boundaries

## Core Entities

### 1. Organizations & Users

```sql
organization
├── profile (users within organization)
└── audit_log (all organizational activities)
```

**Key Features:**
- Plan-based access control (starter, professional, enterprise)
- User role management with granular permissions
- Complete audit trail for compliance

### 2. Supplier Management

```sql
supplier
├── supplier_product (product-supplier relationships)
├── purchase_order
└── purchase_order_item
```

**Enhanced Features:**
- Performance tier tracking (platinum, gold, silver, bronze)
- Automated performance scoring based on delivery metrics
- Multi-currency support with conversion tracking
- Preferred supplier designation for automated sourcing

**Performance Metrics:**
- On-time delivery rate calculation
- Quality rating tracking
- Risk score assessment
- Lead time analysis

### 3. Inventory Core

```sql
inventory_item
├── brand (product branding)
├── stock_movement (all quantity changes)
├── stock_level (location-based inventory)
├── price_list_item (versioned pricing)
└── supplier_product (supplier relationships)
```

**Advanced Features:**
- Multi-location inventory tracking
- Batch, serial, and expiry date tracking
- Automated reorder point monitoring
- Multi-supplier cost comparison

### 4. Financial Management

```sql
price_list
├── price_list_item (versioned pricing)
└── price_change_history (audit trail)
```

**VAT Compliance:**
- South African VAT rate support (standard 15%, zero-rated, exempt)
- Automatic VAT calculations
- Multi-currency price lists
- Historical price tracking for compliance

## XLSX Converter Integration

The system fully supports the XLSX converter with mapped fields:

| XLSX Field | Database Mapping | Table.Column |
|------------|------------------|--------------|
| supplier_name | Supplier name | supplier.name |
| brand | Brand name | brand.name |
| category | Product category | inventory_item.category |
| sku | Stock keeping unit | inventory_item.sku |
| description | Product description | inventory_item.name |
| price | Unit price | inventory_item.unit_price |
| vat_rate | VAT rate percentage | inventory_item.default_vat_rate |
| stock_qty | Quantity on hand | inventory_item.quantity_on_hand |

### XLSX Views

**inventory_xlsx_view**: Complete export/import compatibility
```sql
SELECT
    supplier_name,
    brand,
    category,
    sku,
    description,
    price,
    vat_rate,
    stock_qty
FROM inventory_xlsx_view;
```

## Stock Movement Tracking

### Movement Types

The system tracks 14 different stock movement types:

1. **Inbound**: purchase_receipt, transfer_in, returned
2. **Outbound**: sale_shipment, transfer_out, manufacturing_use, sample, promotion
3. **Adjustments**: adjustment_positive, adjustment_negative, cycle_count
4. **Loss**: damaged, expired, stolen

### Automatic Stock Updates

Triggers automatically update inventory levels:
- Main inventory quantities
- Location-specific stock levels
- Reserved quantity tracking
- Available quantity calculations

### Batch and Serial Tracking

For items requiring traceability:
- Batch number tracking with expiry dates
- Serial number tracking for individual items
- Location-based batch management
- Automated expiry monitoring

## Performance Optimization

### Indexing Strategy

1. **Composite Indexes**: org_id + frequently queried fields
2. **Partial Indexes**: Active records only (WHERE is_active = true)
3. **GIN Indexes**: Full-text search on names and descriptions
4. **Functional Indexes**: Calculated fields like available quantity

### Query Patterns

Common queries are optimized with specific indexes:
- Low stock alerts: `idx_inventory_item_low_stock`
- Supplier performance: `idx_supplier_performance_score`
- Price history: `idx_price_change_item_date`
- Stock movements: `idx_stock_movement_org_date`

## Business Intelligence Views

### Supplier Performance Dashboard

```sql
supplier_performance_view
├── Performance tier and scoring
├── Order statistics and metrics
├── Financial data (spend, average order value)
└── Delivery performance tracking
```

### Inventory Alerts

```sql
low_stock_alert_view
├── Items below reorder point
├── Supplier information for reordering
├── Cost and lead time data
└── Quantity calculations for purchasing
```

### Stock Movement Analytics

```sql
stock_movement_summary_view
├── Movement history with context
├── User attribution for changes
├── Cost tracking for financial reporting
└── Location transfer tracking
```

## Security & Compliance

### Audit Trail

Every operation is logged with:
- User identification
- Timestamp precision
- Before/after state capture
- IP address and user agent tracking
- Organizational context

### Data Integrity

**Constraints ensure:**
- Positive quantities and prices
- Valid date relationships
- Proper foreign key relationships
- Currency format validation
- VAT rate limits (0-100%)

**Triggers provide:**
- Automatic timestamp updates
- Stock level synchronization
- Performance metric calculation
- Price change tracking

## Scalability Features

### Partitioned Tables

High-volume tables use time-based partitioning:
- `stock_movement`: Quarterly partitions
- `price_change_history`: Monthly partitions
- `audit_log`: Monthly partitions

### JSONB Flexibility

Extensible metadata storage:
- `supplier.address`: Complex address structures
- `inventory_item.dimensions_json`: Product dimensions
- `organization.settings`: Custom configurations

## Migration Strategy

### Zero-Downtime Deployment

1. **Schema Evolution**: Additive changes only
2. **Data Migration**: Bulk operations with progress tracking
3. **Index Creation**: Concurrent building to avoid locks
4. **Trigger Deployment**: Atomic updates for business logic

### Rollback Support

All migrations include:
- Complete rollback procedures
- Data preservation strategies
- Constraint recreation
- Index rebuilding

## Performance Benchmarks

### Expected Query Performance

| Operation | Expected Time | Optimization |
|-----------|---------------|--------------|
| Product lookup by SKU | <1ms | Unique index on (org_id, sku) |
| Low stock report | <10ms | Partial index on reorder conditions |
| Supplier performance | <50ms | Materialized view refresh |
| Stock movement history | <25ms | Partitioned table scanning |

### Storage Projections

| Table | 1M Records | 10M Records | Partition Strategy |
|-------|------------|-------------|-------------------|
| inventory_item | 200MB | 2GB | Single table |
| stock_movement | 500MB | 5GB | Quarterly partitions |
| price_change_history | 300MB | 3GB | Monthly partitions |

## Integration Points

### External Systems

The schema supports integration with:
1. **ERP Systems**: Standard purchase order and inventory formats
2. **Accounting Software**: VAT-compliant financial data
3. **E-commerce Platforms**: Real-time stock level synchronization
4. **Warehouse Management**: Location-based inventory tracking

### API Considerations

Database design supports RESTful API patterns:
- Resource-based table structure
- Consistent UUID primary keys
- Standardized timestamp fields
- JSONB for flexible metadata

## Maintenance Procedures

### Regular Maintenance

1. **Partition Management**: Automated creation/deletion of time-based partitions
2. **Index Maintenance**: Regular REINDEX for optimal performance
3. **Statistics Updates**: ANALYZE for query optimizer
4. **Cleanup Procedures**: Archive old audit logs and price history

### Monitoring

Key metrics to monitor:
- Table sizes and growth rates
- Index usage and effectiveness
- Query performance degradation
- Constraint violation rates

## Future Enhancements

### Planned Features

1. **Advanced Analytics**: Demand forecasting and trend analysis
2. **IoT Integration**: RFID and barcode scanning support
3. **Mobile Support**: Offline synchronization capabilities
4. **AI/ML Integration**: Automated reorder suggestions

### Schema Evolution

Design accommodates future growth:
- Extensible JSONB fields for new attributes
- Modular table structure for feature additions
- Standardized naming conventions for consistency
- Version-controlled migration procedures

---

This comprehensive inventory management system provides a solid foundation for modern supply chain operations while maintaining the flexibility to evolve with changing business requirements.