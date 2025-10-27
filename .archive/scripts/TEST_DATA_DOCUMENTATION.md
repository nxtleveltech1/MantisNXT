# MantisNXT Test Data Generation Documentation

## Overview

This documentation covers the comprehensive test data generation system for MantisNXT, creating **22 realistic suppliers** with **22 products** (1 per supplier) for testing and development purposes.

## Files Created

### 1. SQL Script: `generate_test_data_22_suppliers_products.sql`
- **Purpose**: Direct SQL approach for maximum compatibility
- **Target Schema**: Uses migration schema (supplier + inventory_item tables)
- **Features**: 
  - Organization setup with proper foreign keys
  - Complete data cleanup before insertion
  - Comprehensive verification queries
  - Built-in reporting

### 2. Node.js Script: `generate_22_suppliers_22_products.js`
- **Purpose**: Smart multi-schema approach with error handling
- **Target Schema**: Adaptive - tries multiple table structures
- **Features**:
  - Database connection management
  - Schema detection and adaptation
  - Detailed progress reporting
  - Comprehensive error handling
  - Statistics and validation

## Test Data Composition

### 22 Suppliers Across 9 Industries

#### Technology & Electronics (5 suppliers)
1. **Alpha Technologies (Pty) Ltd** - IT Hardware & Software
2. **BK Electronics & Computing** - Consumer Electronics  
3. **Sonic Pro Audio Solutions** - Professional Audio
4. **TechVision Systems** - Security Systems
5. **DataFlow Networks** - Network Equipment

#### Manufacturing & Industrial (4 suppliers)
6. **Precision Manufacturing Works** - Precision Engineering
7. **Industrial Components & Supplies** - Mechanical Components
8. **PowerTech Engineering** - Power Systems
9. **MetalWorks Fabrication** - Steel & Metal

#### Construction & Building (3 suppliers)
10. **BuildMaster Construction Supplies** - Building Materials
11. **RoofTech Solutions** - Roofing Systems
12. **Concrete Solutions SA** - Concrete Products

#### Automotive & Transport (3 suppliers)
13. **AutoParts Direct SA** - Auto Parts
14. **Fleet Solutions & Logistics** - Fleet Management
15. **TruckParts Warehouse** - Heavy Vehicle Parts

#### Healthcare & Medical (2 suppliers)
16. **MediSupply Healthcare Solutions** - Medical Equipment
17. **PharmaLogistics (Pty) Ltd** - Pharmaceutical

#### Food & Beverage (2 suppliers)
18. **FreshProduce Distributors** - Fresh Produce
19. **Beverage Solutions SA** - Beverages

#### Energy & Utilities (2 suppliers)
20. **Solar Power Solutions** - Renewable Energy
21. **Electrical Contractors Supply** - Electrical Components

#### Office & Stationery (1 supplier)
22. **Office Depot SA** - Office Supplies

### 22 Products (1 per supplier)

Each supplier has one representative product that showcases their primary offering:

| Supplier | Product | Category | Price Range |
|----------|---------|----------|-------------|
| Alpha Technologies | Dell Latitude 5530 Business Laptop | Technology | R18,500 |
| BK Electronics | Samsung 32" 4K Professional Monitor | Electronics | R8,750 |
| Sonic Pro Audio | Yamaha MG16XU Mixing Console | Audio | R12,500 |
| TechVision Systems | IP Security Camera 4K | Security | R3,250 |
| DataFlow Networks | Cisco 48-Port Gigabit Switch | Network | R15,750 |
| Precision Manufacturing | CNC Machined Aluminum Housing | Components | R850 |
| Industrial Components | SKF Deep Groove Ball Bearing | Mechanical | R165 |
| PowerTech Engineering | Diesel Generator 50kW | Power | R185,000 |
| MetalWorks Fabrication | Structural Steel I-Beam | Materials | R2,850 |
| BuildMaster Construction | PPC Cement 42.5N (50kg) | Construction | R85 |
| RoofTech Solutions | Clay Roof Tiles (per m²) | Roofing | R125 |
| Concrete Solutions | Concrete Building Blocks | Construction | R12.50 |
| AutoParts Direct | Toyota Hilux Brake Disc Set | Automotive | R1,250 |
| Fleet Solutions | Vehicle Tracking System 4G | Fleet | R2,850 |
| TruckParts Warehouse | Commercial Truck Tire | Transport | R4,250 |
| MediSupply Healthcare | Patient Vital Signs Monitor | Medical | R45,000 |
| PharmaLogistics | Pharmaceutical Cold Storage | Healthcare | R28,500 |
| FreshProduce Distributors | Organic Fuji Apples (10kg) | Food | R125 |
| Beverage Solutions | Premium Orange Juice (1L) | Beverage | R35 |
| Solar Power Solutions | Monocrystalline Solar Panel 400W | Energy | R2,850 |
| Electrical Contractors | PVC Copper Cable 2.5mm² | Electrical | R28.50/m |
| Office Depot SA | Ergonomic Office Chair | Office | R1,850 |

## Data Quality Features

### Realistic Business Profiles
- **South African Context**: All suppliers are SA-based with realistic addresses
- **Industry Diversity**: 9 different industries represented
- **B-BBEE Compliance**: Includes B-BBEE levels (Level 1-4)
- **Local Content**: Realistic local content percentages (15-100%)
- **Payment Terms**: Varied terms (Net 7, Net 30, Net 45, Net 60)
- **Lead Times**: Industry-appropriate lead times (1-35 days)
- **Risk Scores**: Realistic risk assessments (10-45)

### Complete Contact Information
- **Valid Email Addresses**: Industry-appropriate email domains
- **Phone Numbers**: South African format (+27)
- **Physical Addresses**: Real South African cities and regions
- **Contact Persons**: Realistic names reflecting SA demographics
- **Websites**: Consistent domain naming

### Product Specifications
- **Realistic SKUs**: Industry-standard SKU formats
- **Accurate Descriptions**: Detailed product specifications
- **Market Pricing**: Realistic ZAR pricing for South African market
- **Stock Levels**: Appropriate inventory quantities
- **Barcodes**: Valid barcode formats
- **Categories**: Proper inventory categories (raw_materials, components, finished_goods, consumables)

## Database Schema Compatibility

### Migration Schema (Primary)
- `organization` table for multi-tenancy
- `supplier` table with JSONB address field
- `inventory_item` table for products
- Full foreign key relationships

### Enhanced Schema (Alternative)
- `suppliers` table with expanded fields
- `supplier_products` table for detailed product catalog
- Additional performance and contact tables

### Automatic Detection
The Node.js script automatically detects available tables and adapts:
1. Tries migration schema first
2. Falls back to enhanced schema
3. Provides detailed error reporting for troubleshooting

## Usage Instructions

### Option 1: SQL Script (Recommended for consistency)
```bash
# Connect to PostgreSQL and run the SQL script
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 -f generate_test_data_22_suppliers_products.sql
```

### Option 2: Node.js Script (Recommended for flexibility)
```bash
# Ensure you're in the scripts directory
cd /mnt/k/00Project/MantisNXT/scripts

# Install dependencies if needed
npm install pg

# Run the generator
node generate_22_suppliers_22_products.js
```

### Option 3: Existing Script (Limited)
```bash
# The existing script has only 22 suppliers, no products
node insert_22_suppliers.js
```

## Pre-Cleanup Phase Requirements

### Database Validation
Before running cleanup, ensure:

1. **Backup Current Data**
   ```sql
   -- Export current suppliers
   COPY supplier TO '/backup/suppliers_backup.csv' CSV HEADER;
   COPY inventory_item TO '/backup/products_backup.csv' CSV HEADER;
   ```

2. **Verify Foreign Key Dependencies**
   ```sql
   -- Check for dependent records
   SELECT COUNT(*) FROM purchase_order WHERE supplier_id IN (SELECT id FROM supplier);
   SELECT COUNT(*) FROM purchase_order_item WHERE inventory_item_id IN (SELECT id FROM inventory_item);
   ```

3. **Test Environment Confirmation**
   ```sql
   -- Confirm this is test environment
   SELECT name, slug FROM organization WHERE slug = 'mantisnxt-test';
   ```

### Clean Insertion Strategy
The scripts use a safe insertion approach:
1. **Organization Verification**: Ensures test organization exists
2. **Dependency-Safe Cleanup**: Removes records in proper order
3. **Constraint Validation**: Respects all foreign key constraints
4. **Rollback Capability**: All operations are transactional

## Verification Queries

### Supplier Verification
```sql
-- Supplier summary
SELECT 
    status,
    COUNT(*) as count,
    ROUND(AVG(risk_score), 1) as avg_risk,
    ROUND(AVG(lead_time_days), 1) as avg_lead_time
FROM supplier 
WHERE org_id = '00000000-0000-0000-0000-000000000001'
GROUP BY status;
```

### Product Verification
```sql
-- Product summary by category
SELECT 
    category,
    COUNT(*) as products,
    ROUND(AVG(unit_price), 2) as avg_price,
    SUM(quantity_on_hand) as total_stock
FROM inventory_item 
WHERE org_id = '00000000-0000-0000-0000-000000000001'
GROUP BY category;
```

### Relationship Verification
```sql
-- Supplier-Product mapping
SELECT 
    s.name as supplier_name,
    i.name as product_name,
    i.sku,
    i.unit_price,
    s.lead_time_days
FROM supplier s
JOIN inventory_item i ON s.id = i.supplier_id
WHERE s.org_id = '00000000-0000-0000-0000-000000000001'
ORDER BY s.name;
```

## Benefits for Testing

### Realistic Data Scenarios
- **Multi-Industry Testing**: Covers diverse business scenarios
- **Price Range Variety**: From R12.50 to R185,000
- **Volume Testing**: Different stock levels and order quantities
- **Performance Testing**: Realistic data volumes for load testing

### Business Logic Validation
- **Payment Terms**: Various payment cycles for financial testing
- **Risk Assessment**: Different risk profiles for supplier evaluation
- **Lead Time Planning**: Realistic delivery scenarios
- **Inventory Management**: Proper stock levels and reorder points

### UI/UX Testing
- **Search Functionality**: Diverse names and categories for search testing
- **Filtering**: Multiple attributes for filter testing
- **Sorting**: Varied data for sort function validation
- **Reporting**: Rich data for dashboard and report testing

## Maintenance and Updates

### Adding More Suppliers
To expand beyond 22 suppliers:
1. Add new entries to the `suppliers` array in the Node.js script
2. Ensure unique codes and realistic data
3. Include corresponding products
4. Update documentation

### Modifying Existing Data
To update supplier or product information:
1. Edit the data arrays in the scripts
2. Re-run the generation script
3. Verify changes with validation queries

### Schema Evolution
If database schema changes:
1. Update the SQL script with new table structures
2. Modify the Node.js script detection logic
3. Test with new schema requirements
4. Update this documentation

## Troubleshooting

### Common Issues

#### "Table does not exist" errors
- **Cause**: Missing database migrations
- **Solution**: Run all migrations first, then test data generation

#### Foreign key constraint errors
- **Cause**: Organization not found or missing dependencies
- **Solution**: Ensure organization table exists and has required record

#### Duplicate key errors
- **Cause**: Data already exists or script run multiple times
- **Solution**: Scripts include cleanup - check for manual data conflicts

#### Permission errors
- **Cause**: Database user lacks required permissions
- **Solution**: Ensure database user has INSERT, UPDATE, DELETE permissions

### Debug Mode
For detailed debugging, modify the Node.js script:
```javascript
// Add this at the top of the file
const DEBUG = true;

// Add debug logging throughout
if (DEBUG) console.log('Debug: Current operation...', data);
```

## Security Considerations

### Test Data Safety
- All data is clearly marked as test data
- No real business information included
- Safe to delete and regenerate
- Isolated to test organization

### Data Privacy
- No personal information used
- Fictitious contact details
- Generic business names
- No sensitive financial data

## Conclusion

This test data generation system provides a comprehensive, realistic dataset for MantisNXT development and testing. The dual approach (SQL + Node.js) ensures compatibility across different schema versions while providing detailed reporting and error handling.

The data represents real-world business scenarios with proper South African context, making it ideal for:
- Feature development and testing
- Performance optimization
- User acceptance testing
- Training and demonstrations
- Quality assurance validation

All foreign key relationships are properly established, ensuring data integrity and realistic business workflows for comprehensive system testing.