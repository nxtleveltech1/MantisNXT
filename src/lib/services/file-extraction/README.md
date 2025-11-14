# File Extraction Engine

Production-ready pricelist file extraction with intelligent parsing, validation, and confidence scoring.

## Overview

The File Extraction Engine provides comprehensive support for extracting supplier pricelist data from Excel and CSV files. It features:

- **Intelligent Column Mapping**: Auto-detects column mappings using 100+ aliases per field with fuzzy matching
- **Brand Detection**: 9 SKU pattern-matching algorithms to prevent brand contamination
- **Multi-Currency Support**: Handles different decimal/thousand separators and currency symbols
- **Validation Engine**: Row-level validation with configurable strictness
- **Confidence Scoring**: Provides extraction quality metrics at row and metadata levels
- **Error Recovery**: Graceful degradation with partial row extraction

## Quick Start

```typescript
import { extractionEngine } from '@/lib/services/file-extraction';

// Extract from file
const result = await extractionEngine.extract(fileBuffer, 'pricelist.xlsx', {
  defaultCurrency: 'ZAR',
  skipInvalidRows: true,
  minConfidence: 0.6,
});

if (result.success) {
  console.log(`Extracted ${result.rows.length} rows`);
  console.log(`Confidence: ${(result.metadata.extractionConfidence * 100).toFixed(1)}%`);

  // Process rows
  for (const row of result.rows) {
    console.log(`${row.supplier_sku}: ${row.name} - ${row.currency} ${row.price}`);
  }
}
```

## Features

### 1. Column Mapping

Auto-detects column mappings using comprehensive alias lists:

```typescript
import { mapColumns, COLUMN_ALIASES } from '@/lib/services/file-extraction';

const headers = ['SKU', 'Product Name', 'Unit Price', 'UOM'];
const mappingResult = mapColumns(headers);

console.log(mappingResult.mapping);
// {
//   supplier_sku: 'SKU',
//   name: 'Product Name',
//   price: 'Unit Price',
//   uom: 'UOM',
//   ...
// }

console.log(mappingResult.confidence);
// { supplier_sku: 1.0, name: 1.0, price: 1.0, uom: 1.0, ... }
```

**Supported Aliases:**
- **supplier_sku**: sku, code, item code, article, part number, material, ref, etc. (30+ variations)
- **name**: product, description, item, title, artikel naam, etc. (25+ variations)
- **brand**: brand, manufacturer, make, merk, marca, marque, etc. (15+ variations)
- **price**: price, cost, rrp, nett, dealer, prijs, precio, etc. (40+ variations)
- **uom**: uom, unit, um, eenheid, unidad, etc. (20+ variations)
- Plus: pack_size, barcode, category_raw, vat_code

### 2. Brand Detection

Prevents SKU contamination using 9 pattern-matching algorithms:

```typescript
import { detectBrand, isSKULike } from '@/lib/services/file-extraction';

// Check if value is SKU-like
console.log(isSKULike('AMPAUD028')); // true
console.log(isSKULike('SKU-12345')); // true
console.log(isSKULike('Bosch')); // false

// Detect brand from multiple sources
const brandResult = detectBrand(
  'Bosch_Pricelist_2024.xlsx',
  'Bosch Products',
  ['Bosch', 'Bosch', 'Bosch']
);

console.log(brandResult);
// { brand: 'Bosch', confidence: 0.95, source: 'column' }
```

**SKU Detection Algorithms:**
1. All caps with numbers (AMPAUD028)
2. Prefix patterns (SKU-12345, ITEM-789)
3. High numeric ratio (>60%)
4. Common SKU prefixes (AMP, SPE, PRO, etc.)
5. Contains separators with numbers
6. Alphanumeric no-space
7. Known SKU prefix
8. Too short with numbers (2-3 chars)
9. Version indicators (V1, R2)

### 3. Currency Normalization

Handles multi-currency with different formats:

```typescript
import { parsePrice, detectCurrency } from '@/lib/services/file-extraction';

// Parse different formats
console.log(parsePrice('R 1,234.56')); // 1234.56
console.log(parsePrice('1.234,56')); // 1234.56 (European)
console.log(parsePrice('$1,234.56')); // 1234.56
console.log(parsePrice('€ 1 234,56')); // 1234.56

// Detect currency
const currencyInfo = detectCurrency('R 1,234.56');
console.log(currencyInfo);
// { currency: 'ZAR', symbol: 'R', confidence: 0.95 }
```

**Supported Formats:**
- Decimal separators: `.` or `,`
- Thousand separators: `,`, `.`, `'`, or space
- Currency symbols: R, $, €, £, ¥, ₹, etc.
- Multiple regional formats (US, European, Swiss, etc.)

### 4. Validation Engine

Row-level validation with comprehensive checks:

```typescript
import { validateRow } from '@/lib/services/file-extraction';

const row = {
  supplier_sku: 'ITEM-123',
  name: 'Product Name',
  uom: 'EACH',
  price: 99.99,
  currency: 'ZAR',
};

const validation = validateRow(row, {
  strictMode: false,
  skipInvalidRows: false,
});

console.log(validation);
// {
//   is_valid: true,
//   warnings: [],
//   confidence: 1.0
// }
```

**Validation Checks:**
- Required fields present
- SKU format and length
- Name length and quality
- UOM validity
- Price range and format
- Currency code format
- Barcode format (EAN-13, UPC)
- Data type consistency

### 5. Confidence Scoring

Provides quality metrics at multiple levels:

```typescript
import {
  calculateRowConfidence,
  calculateMetadataConfidence,
  getConfidenceReport,
} from '@/lib/services/file-extraction';

// Row-level confidence
const rowConfidence = calculateRowConfidence(row);
console.log(rowConfidence); // 0.95

// Metadata-level confidence
const metadataConfidence = calculateMetadataConfidence(
  columnMappings,
  brandDetection,
  rows
);
console.log(metadataConfidence); // 0.88

// Get confidence report
const report = getConfidenceReport(0.88);
console.log(report);
// {
//   level: 'good',
//   color: 'green',
//   recommendation: 'Data quality is good with minor issues'
// }
```

**Confidence Levels:**
- **Excellent** (≥90%): High quality, ready to process
- **Good** (≥75%): Good quality with minor issues
- **Fair** (≥60%): Review warnings before processing
- **Low** (≥40%): Significant issues, review carefully
- **Very Low** (<40%): Poor quality, manual review required

## Configuration Options

```typescript
interface ExtractionConfig {
  /** Supplier ID for brand/metadata enrichment */
  supplierId?: string;

  /** Currency to use if not detected */
  defaultCurrency?: string;

  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;

  /** Skip rows with missing required fields */
  skipInvalidRows?: boolean;

  /** Maximum rows to process */
  maxRows?: number;

  /** Custom column mappings (override auto-detection) */
  columnMappings?: Partial<ColumnMapping>;

  /** Enable strict validation (fail on warnings) */
  strictMode?: boolean;
}
```

## Extraction Result

```typescript
interface ExtractionResult {
  success: boolean;
  metadata: ExtractedMetadata;
  rows: ParsedRow[];
  errors: ExtractionError[];
  warnings: ExtractionWarning[];
}

interface ParsedRow {
  rowNum: number;
  supplier_sku: string;
  name: string;
  brand?: string;
  uom: string;
  pack_size?: string;
  price: number;
  currency: string;
  category_raw?: string;
  vat_code?: string;
  barcode?: string;
  attrs_json?: Record<string, unknown>;

  // Metadata
  confidence: number;
  warnings: string[];
  is_valid: boolean;
}
```

## Supported File Formats

- **Excel**: `.xlsx`, `.xls`
- **CSV**: `.csv` (with auto-delimiter detection)
- **PDF**: Not yet implemented

## Advanced Usage

### Custom Column Mappings

Override auto-detection with custom mappings:

```typescript
const result = await extractionEngine.extract(fileBuffer, 'pricelist.xlsx', {
  columnMappings: {
    supplier_sku: 'Custom SKU Column',
    price: 'Net Price',
    brand: 'Manufacturer',
  },
});
```

### Strict Mode

Fail extraction if any warnings are present:

```typescript
const result = await extractionEngine.extract(fileBuffer, 'pricelist.xlsx', {
  strictMode: true,
});

if (!result.success) {
  console.error('Extraction failed due to validation warnings');
}
```

### Confidence Filtering

Only process high-confidence rows:

```typescript
const result = await extractionEngine.extract(fileBuffer, 'pricelist.xlsx', {
  minConfidence: 0.8,
  skipInvalidRows: true,
});

const highQualityRows = result.rows.filter(r => r.confidence >= 0.8);
```

## Error Handling

```typescript
try {
  const result = await extractionEngine.extract(fileBuffer, 'pricelist.xlsx');

  if (!result.success) {
    console.error('Extraction errors:', result.errors);
    console.warn('Extraction warnings:', result.warnings);
    return;
  }

  // Process successful result
  console.log(`Extracted ${result.rows.length} rows`);

} catch (error) {
  console.error('Fatal extraction error:', error);
}
```

## Integration with PricelistService

```typescript
import { extractionEngine } from '@/lib/services/file-extraction';
import { pricelistService } from '@/lib/services/PricelistService';

async function uploadPricelist(file: Buffer, filename: string, supplierId: string) {
  // Extract data
  const extraction = await extractionEngine.extract(file, filename, {
    supplierId,
    defaultCurrency: 'ZAR',
    skipInvalidRows: true,
  });

  if (!extraction.success) {
    throw new Error('Extraction failed');
  }

  // Create upload record
  const upload = await pricelistService.createUpload({
    supplier_id: supplierId,
    filename,
    currency: extraction.metadata.detectedCurrency || 'ZAR',
    valid_from: new Date(),
  });

  // Insert rows
  const pricelistRows = extraction.rows.map(row => ({
    upload_id: upload.upload_id,
    supplier_sku: row.supplier_sku,
    name: row.name,
    brand: row.brand,
    uom: row.uom,
    pack_size: row.pack_size,
    price: row.price,
    currency: row.currency,
    category_raw: row.category_raw,
    vat_code: row.vat_code,
    barcode: row.barcode,
    attrs_json: row.attrs_json,
  }));

  await pricelistService.insertRows(upload.upload_id, pricelistRows);

  return upload;
}
```

## Performance

- **File Size**: Handles files up to 50 MB
- **Row Count**: Optimized for 10K+ rows
- **Batch Processing**: Rows processed in batches of 100
- **Memory**: Efficient streaming for large files

## Testing

```typescript
import { extractionEngine } from '@/lib/services/file-extraction';
import { readFileSync } from 'fs';

describe('ExtractionEngine', () => {
  it('should extract valid pricelist', async () => {
    const buffer = readFileSync('test/fixtures/pricelist.xlsx');
    const result = await extractionEngine.extract(buffer, 'pricelist.xlsx');

    expect(result.success).toBe(true);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.metadata.extractionConfidence).toBeGreaterThan(0.7);
  });
});
```

## Ported from PriceData

This extraction engine ports proven logic from the PriceData project:
- **Column Aliases**: 100+ aliases per field based on real supplier data
- **SKU Detection**: 9 battle-tested pattern-matching algorithms
- **Brand Extraction**: Intelligent filtering to prevent contamination
- **Currency Parsing**: Handles all common regional formats
- **Fuzzy Matching**: Full Levenshtein distance implementation

## License

MantisNXT - Internal Use Only
