# ExtractionWorker Upgrade - Intelligent Column Detection

## Overview

Ported working extraction logic from `K:\00Project\PriceData\multi-supplier-app.html` to `src/lib/services/ExtractionWorker.ts`.

## Key Features Added

### 1. **Intelligent Column Detection**
- Auto-detects headers in first 80 rows
- Fuzzy matching with extensive alias support
- Detects SKU + (Description OR Price) to identify header row
- Falls back gracefully when columns aren't found

### 2. **CSV Auto-Delimiter Detection**
- Analyzes first 1KB of file
- Counts comma, semicolon, and tab occurrences
- Auto-selects most likely delimiter
- Supports: `,` `;` and `\t` (TAB)

### 3. **Extensive Column Aliases**
```typescript
COLUMN_ALIASES = {
  sku: ['sku', 'stockcode', 'itemcode', 'productcode', 'productid', 'part', 'partno', 'itemno', 'model', 'catalog', 'catalogue', 'material'],
  description: ['description', 'product', 'itemdescription', 'longdescription', 'details', 'desc', 'name'],
  brand: ['brand', 'manufacturer', 'manuf', 'suppliername', 'vendor', 'make'],
  dealer: ['dealer', 'costprice', 'nett', 'netprice', 'buy', 'purchase', 'wholesale', 'unitcost', 'baseprice', 'import', 'landed', 'selling', 'retail', 'rrp', 'listprice', 'unitprice', 'sellprice', 'priceincl', 'priceinc', 'price', 'cost'],
  priceEx: ['priceex', 'exvat', 'exclusive', 'priceexc', 'excl'],
  priceInc: ['priceinc', 'inclvat', 'inclusive', 'grossprice', 'incl'],
  // ... and more
}
```

### 4. **Smart Price Handling**
- Detects price columns (Ex-VAT, Inc-VAT, dealer cost, retail, etc.)
- Auto-calculates Ex-VAT from Inc-VAT using 15% VAT rate
- Handles multiple price formats

### 5. **Robust Error Handling**
- Skips invalid rows (missing SKU/name/price)
- Validates required fields
- Lenient mode: includes products with validation errors
- Strict mode: skips invalid products

## Technical Implementation

### Column Detection Algorithm

```typescript
// 1. Normalize header values (lowercase, remove special chars)
normalizedHeader = header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

// 2. Match against aliases
if (columnMatches(normalized, COLUMN_ALIASES.sku)) {
  columnMap.push({ field: 'sku', index, header });
}

// 3. Fallback to positional mapping
if (no SKU found) {
  columnMap.push({ field: 'sku', index: 0, header: headers[0] });
}
```

### CSV Delimiter Detection

```typescript
// Read first 1KB
const sample = buffer.toString('utf-8').slice(0, 1024);

// Count delimiters
const commaCount = (sample.match(/,/g) || []).length;
const semicolonCount = (sample.match(/;/g) || []).length;
const tabCount = (sample.match(/\t/g) || []).length;

// Pick winner
if (tabCount > commaCount && tabCount > semicolonCount) {
  delimiter = '\t';
} else if (semicolonCount > commaCount) {
  delimiter = ';';
} else {
  delimiter = ',';
}
```

### Header Row Detection

```typescript
// Scan first 80 rows
for (let i = 0; i < Math.min(rows.length, 80); i++) {
  const row = rows[i];
  const normalized = row.map(normalizeHeaderValue);
  const nonEmpty = normalized.filter(Boolean);

  // Check for key columns
  const hasSku = nonEmpty.some(v => columnMatches(v, COLUMN_ALIASES.sku));
  const hasDesc = nonEmpty.some(v => columnMatches(v, COLUMN_ALIASES.description));
  const hasPrice = nonEmpty.some(v => columnMatches(v, COLUMN_ALIASES.dealer) || v.includes('price'));

  // Valid header if has SKU + (Description OR Price)
  if ((hasSku && hasDesc) || (hasSku && hasPrice) || nonEmpty.length >= 3) {
    return { rowIndex: i, headers: row };
  }
}
```

## Before vs After

### BEFORE (stub logic)
```typescript
mappedData.supplier_sku = this.extractField(row, 'sku', []);
mappedData.name = this.extractField(row, 'name', []);
mappedData.price = this.parseNumber(this.extractField(row, 'price', []));
```

### AFTER (intelligent detection)
```typescript
// Auto-detect column map from headers
const columnMap = this.buildColumnMap(headers);

// Extract using detected columns
columnMap.forEach(({ field, header }) => {
  const value = row[header];

  switch (field) {
    case 'sku':
      mappedData.supplier_sku = this.sanitizeText(value);
      break;
    case 'description':
      mappedData.name = this.sanitizeText(value);
      break;
    case 'price':
      mappedData.price = this.parseNumber(value);
      break;
    // ... handles priceEx, priceInc, brand, etc.
  }
});
```

## Usage

The worker now automatically detects columns when `auto_detect_columns` is not disabled:

```typescript
const job = {
  job_id: 'abc-123',
  upload_id: 'upload-456',
  config: {
    supplier_id: 'supplier-789',
    auto_detect_columns: true, // Enable intelligent detection (default)
    currency_default: 'ZAR',
    vat_rate: 0.15
  }
};

const worker = new ExtractionWorker();
const result = await worker.execute(job);

// result.products contains extracted products with:
// - Automatically detected columns
// - Auto-calculated VAT prices
// - Validated required fields
// - Duplicate detection
```

## Progress Events

The worker emits detailed progress:

```
✓ Auto-detected CSV delimiter: ,
✓ Auto-detected 8 columns: sku="Stock Code", description="Product Name", price="Unit Price", brand="Brand", ...
✓ Parsed 1000 rows
✓ Processed 500/1000 rows
✓ Extraction completed
```

## Edge Cases Handled

1. **No header row found** → Uses first row as headers
2. **Missing SKU column** → Uses first column as SKU
3. **Missing description** → Uses second column as description
4. **Price Inc-VAT only** → Calculates Ex-VAT using 15% VAT rate
5. **Empty cells** → Sanitizes to empty strings
6. **Malformed numbers** → Strips currency symbols and thousand separators
7. **Duplicate SKUs** → Marks with validation warning
8. **Invalid rows** → Skips or includes with validation errors (configurable)

## Testing Recommendations

1. **CSV with comma delimiter**
   - Standard product list
   - Expected: Auto-detect `,` delimiter

2. **CSV with semicolon delimiter**
   - European format (common in Excel exports)
   - Expected: Auto-detect `;` delimiter

3. **Excel with headers in row 3**
   - Skip first 2 metadata rows
   - Expected: Detect header at row 3

4. **Mixed case column names**
   - "Stock Code", "PRODUCT_ID", "Unit Price"
   - Expected: Match to sku, price fields

5. **Price Inc-VAT only**
   - Column "Total Incl. VAT"
   - Expected: Calculate Ex-VAT (price / 1.15)

## Files Changed

- `src/lib/services/ExtractionWorker.ts` - Enhanced with intelligent detection

## Source Reference

Ported from: `K:\00Project\PriceData\multi-supplier-app.html`
- Lines 1894-2127: Column aliases and detection
- Lines 2129-2146: Header row detection
- Lines 2054-2127: Column mapping algorithm
- Lines 3061-3099: CSV parsing with PapaParse
- Lines 4556-4642: Excel parsing with SheetJS

---

**Ready for testing with real supplier files!**
