# Pricelist Extraction Operational Rules

## Core Principles

### Platform Columns Are Immutable
**CRITICAL RULE:** Platform column names must NEVER be changed to match source data. Source data must always be mapped to existing platform columns.

### Source Data Mapping
All extracted data from pricelist files must be mapped to existing platform columns. The extraction process should intelligently detect and map source columns to platform fields.

## Column Mapping Rules

### Required Fields
- **SKU**: Minimum required field. Products without SKU will be skipped with a warning.
- **Price**: Either "Cost Excluding" or "Cost Including" must be present. If both are missing, the product will be skipped with a warning.

### Price Column Mappings

#### Cost Excluding
- **Source column names**: "Cost Excluding", "COST EXCLUDING", "Cost Ex VAT", "COST EX VAT", "Price Ex", "Ex VAT", "Exclusive"
- **Platform storage**: `attrs_json.cost_excluding`
- **Required if**: Cost Including is not present

#### Cost Including
- **Source column names**: "Cost Including", "COST INCLUDING", "Cost Inc VAT", "COST INC VAT", "Price Inc", "Inc VAT", "Inclusive"
- **Platform storage**: `attrs_json.cost_including`
- **Required if**: Cost Excluding is not present

#### Recommended Retail Price (RSP)
- **Source column names**: "Recommended Retail Price", "RECOMMENDED RETAIL PRICE", "Recommended Selling Price", "RSP", "RRP"
- **Platform storage**: `attrs_json.rsp`
- **Status**: Optional - missing values should not block uploads

### Calculation Fallbacks

When only one price value is available, the system will automatically calculate the missing value:

#### If Only Cost Excluding Present
```
Cost Including = Cost Excluding × (1 + VAT rate)
```

#### If Only Cost Including Present
```
Cost Excluding = Cost Including ÷ (1 + VAT rate)
```

**Default VAT Rate**: 15% (0.15)

**Note**: Calculations are only performed when one value is missing. If both values are provided, no recalculation occurs.

## Error Handling

### Graceful Degradation
- **Missing optional columns**: Should log warnings but NOT fail extraction
- **Missing SKU**: Product is skipped with warning (critical field)
- **Missing both price columns**: Product is skipped with warning (critical for pricing)
- **Missing other optional fields**: Product Description, Brand, Category, etc. - missing values should not block upload

### Upload Behavior
- Uploads should NEVER fail due to missing optional columns
- Individual products may be skipped with warnings, but the upload process continues
- Batch processing continues even if some products have missing optional data

## Performance Priority

### Fastest Upload Speed
- Prioritize speed over completeness
- Skip complex validations for optional fields
- Use calculated values only when source data is missing (don't recalculate if both provided)
- Batch processing should continue even if some products have missing optional data

## Data Preservation

### attrs_json Storage
All extracted and calculated values must be preserved in `attrs_json`:

```json
{
  "cost_excluding": 2694.78,
  "cost_including": 3099.00,
  "rsp": 3879.00,
  "description": "Product description text",
  "brand": "Brand Name",
  // ... other optional fields
}
```

### Value Preservation Rules
- Extracted values are always stored in `attrs_json` even when used for calculations
- Calculated values are also stored in `attrs_json` for consistency
- Missing optional fields should not prevent `attrs_json` from being created

## Table Display Rules

### Column Labels (Immutable)
- "Product Description" (NOT "Description (Product Description)")
- "RSP" (NOT "RSP (Recommended Selling Price)")
- "Cost ExVAT" (for cost_excluding)
- "Cost IncVAT" (for cost_including)
- "Total Cost Inc VAT" (moved to last column position)

### Column Order
1. Select
2. SKU
3. Product Name
4. Product Description
5. Supplier
6. Brand
7. Category
8. Cost Price
9. Cost ExVAT
10. Cost IncVAT
11. RSP
12. Price Change (hidden by default)
13. Status
14. Stock (hidden by default)
15. First Seen (hidden by default)
16. Total Cost Inc VAT (last)
17. Actions

## Extraction Flow

1. **Column Detection**: Auto-detect columns using intelligent matching with aliases
2. **Value Extraction**: Extract values from detected columns
3. **Calculation**: Calculate missing values when possible
4. **Storage**: Store all values (extracted and calculated) in `attrs_json`
5. **Validation**: Validate required fields (SKU, Price)
6. **Error Handling**: Skip invalid products with warnings, continue processing

## Examples

### Example 1: Full Data Available
**Source columns**: SKU, Product Name, Cost Excluding, Cost Including, Recommended Retail Price

**Result**:
- All values extracted and stored in `attrs_json`
- No calculations needed
- Product created successfully

### Example 2: Missing Cost Including
**Source columns**: SKU, Product Name, Cost Excluding

**Result**:
- `cost_excluding` extracted from source
- `cost_including` calculated: `cost_excluding × 1.15`
- Both values stored in `attrs_json`
- Product created successfully

### Example 3: Missing Cost Excluding
**Source columns**: SKU, Product Name, Cost Including

**Result**:
- `cost_including` extracted from source
- `cost_excluding` calculated: `cost_including ÷ 1.15`
- Both values stored in `attrs_json`
- Product created successfully

### Example 4: Missing Optional Fields
**Source columns**: SKU, Cost Excluding

**Result**:
- `cost_excluding` extracted
- `cost_including` calculated
- Product Name defaults to SKU (with warning)
- Missing Brand, Category, RSP logged as warnings but don't block upload
- Product created successfully

### Example 5: Missing SKU
**Source columns**: Product Name, Cost Excluding

**Result**:
- Product skipped with warning: "Missing SKU, skipping product"
- Upload continues with remaining products

## Implementation Notes

### ExtractionWorker.ts
- Column aliases include variations of "Cost Excluding", "Cost Including", "Recommended Retail Price"
- Values stored in `raw_data._cost_excluding`, `raw_data._cost_including`, `raw_data._rsp` for API route processing
- Graceful error handling with warnings for missing optional fields

### API Route (spp/agent/route.ts)
- Extracts values from `raw_data._*` fields
- Also checks direct column mappings as fallback
- Calculates missing values using VAT rate
- Populates `attrs_json` with all values

### Table Component (SupplierProductDataTable.tsx)
- Displays `attrs_json.cost_excluding` in "Cost ExVAT" column
- Displays `attrs_json.cost_including` in "Cost IncVAT" column
- Displays `attrs_json.rsp` in "RSP" column
- "Total Cost Inc VAT" column moved to last position

## Maintenance

This document should be updated whenever:
- New column mappings are added
- Calculation logic changes
- Error handling behavior changes
- Table display rules change

