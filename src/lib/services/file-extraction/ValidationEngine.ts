/**
 * ValidationEngine - Row-level validation with comprehensive checks
 *
 * Validates extracted rows against schema, performs range checks,
 * and generates actionable warnings. Supports both strict and lenient modes.
 */

import type { ParsedRow, ValidationResult, ExtractionConfig } from './types';

/**
 * UOM (Unit of Measure) whitelist
 * Common units across industries
 */
const VALID_UOMS = [
  'EACH',
  'EA',
  'PC',
  'PCS',
  'PIECE',
  'UNIT',
  'BOX',
  'CARTON',
  'CTN',
  'PACK',
  'PKG',
  'BAG',
  'KG',
  'G',
  'GRAM',
  'L',
  'ML',
  'LITRE',
  'M',
  'CM',
  'MM',
  'METER',
  'ROLL',
  'SHEET',
  'SET',
  'PAIR',
  'DOZEN',
  'DOZ',
  'CASE',
  'PALLET',
  'BOTTLE',
  'BTL',
  'CAN',
  'JAR',
  'TIN',
  'TUBE',
  'STRIP',
  'PAD',
  'REAM',
];

/**
 * Price range checks (configurable by currency)
 */
const PRICE_RANGES: Record<string, { min: number; max: number; warn_below: number }> = {
  ZAR: { min: 0.01, max: 1_000_000, warn_below: 1.0 },
  USD: { min: 0.01, max: 100_000, warn_below: 0.1 },
  EUR: { min: 0.01, max: 100_000, warn_below: 0.1 },
  GBP: { min: 0.01, max: 100_000, warn_below: 0.1 },
};

/**
 * Validate required fields are present and non-empty
 */
function validateRequiredFields(row: Partial<ParsedRow>): string[] {
  const warnings: string[] = [];

  if (!row.supplier_sku || row.supplier_sku.trim().length === 0) {
    warnings.push('Missing required field: supplier_sku');
  }

  if (!row.name || row.name.trim().length === 0) {
    warnings.push('Missing required field: name');
  }

  if (!row.uom || row.uom.trim().length === 0) {
    warnings.push('Missing required field: uom');
  }

  if (row.price == null || row.price <= 0) {
    warnings.push('Missing or invalid required field: price');
  }

  if (!row.currency || row.currency.trim().length === 0) {
    warnings.push('Missing required field: currency');
  }

  return warnings;
}

/**
 * Validate SKU format and length
 */
function validateSKU(sku: string): string[] {
  const warnings: string[] = [];

  if (sku.length > 100) {
    warnings.push(`SKU too long (${sku.length} chars, max 100)`);
  }

  if (sku.length < 2) {
    warnings.push('SKU too short (min 2 chars)');
  }

  // Check for suspicious characters
  if (/[<>{}[\]\\|`~]/.test(sku)) {
    warnings.push('SKU contains suspicious characters');
  }

  return warnings;
}

/**
 * Validate product name
 */
function validateName(name: string): string[] {
  const warnings: string[] = [];

  if (name.length > 500) {
    warnings.push(`Name too long (${name.length} chars, max 500)`);
  }

  if (name.length < 3) {
    warnings.push('Name too short (min 3 chars)');
  }

  // Check for placeholder values
  const placeholders = ['test', 'sample', 'example', 'xxx', 'tbd', 'n/a', 'null', 'none'];
  if (placeholders.includes(name.toLowerCase().trim())) {
    warnings.push('Name appears to be a placeholder value');
  }

  return warnings;
}

/**
 * Validate UOM (Unit of Measure)
 */
function validateUOM(uom: string): string[] {
  const warnings: string[] = [];

  const normalized = uom.toUpperCase().trim();

  if (normalized.length === 0) {
    warnings.push('UOM is empty');
    return warnings;
  }

  if (normalized.length > 50) {
    warnings.push(`UOM too long (${normalized.length} chars, max 50)`);
  }

  // Check against whitelist (lenient - only warn)
  if (!VALID_UOMS.includes(normalized)) {
    warnings.push(`Uncommon UOM: "${uom}" (consider standardizing)`);
  }

  return warnings;
}

/**
 * Validate price and currency
 */
function validatePrice(price: number, currency: string): string[] {
  const warnings: string[] = [];

  if (price <= 0) {
    warnings.push('Price must be positive');
    return warnings;
  }

  const range = PRICE_RANGES[currency.toUpperCase()] || PRICE_RANGES['ZAR'];

  if (price < range.min) {
    warnings.push(`Price ${price} below minimum ${range.min} ${currency}`);
  }

  if (price > range.max) {
    warnings.push(`Price ${price} above maximum ${range.max} ${currency} (possible error)`);
  }

  if (price < range.warn_below) {
    warnings.push(`Unusually low price: ${price} ${currency}`);
  }

  // Check for suspicious decimal precision
  const decimalPlaces = (price.toString().split('.')[1] || '').length;
  if (decimalPlaces > 4) {
    warnings.push(`Price has unusual precision (${decimalPlaces} decimal places)`);
  }

  return warnings;
}

/**
 * Validate currency code
 */
function validateCurrency(currency: string): string[] {
  const warnings: string[] = [];

  if (currency.length !== 3) {
    warnings.push(`Invalid currency code length: "${currency}" (must be 3 chars)`);
  }

  if (!/^[A-Z]{3}$/.test(currency.toUpperCase())) {
    warnings.push(`Invalid currency code format: "${currency}" (must be 3 uppercase letters)`);
  }

  // Check against known currencies
  const knownCurrencies = ['ZAR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'];
  if (!knownCurrencies.includes(currency.toUpperCase())) {
    warnings.push(`Unknown currency code: "${currency}"`);
  }

  return warnings;
}

/**
 * Validate optional fields
 */
function validateOptionalFields(row: ParsedRow): string[] {
  const warnings: string[] = [];

  // Validate barcode if present
  if (row.barcode) {
    if (row.barcode.length > 50) {
      warnings.push(`Barcode too long (${row.barcode.length} chars, max 50)`);
    }

    // Check for valid barcode formats (EAN-13, UPC, etc.)
    const isNumeric = /^\d+$/.test(row.barcode);
    if (isNumeric) {
      const len = row.barcode.length;
      if (![8, 12, 13, 14].includes(len)) {
        warnings.push(`Barcode length ${len} is unusual (expected 8, 12, 13, or 14 digits)`);
      }
    }
  }

  // Validate pack_size if present
  if (row.pack_size) {
    if (row.pack_size.length > 50) {
      warnings.push(`Pack size too long (${row.pack_size.length} chars, max 50)`);
    }
  }

  // Validate category if present
  if (row.category_raw) {
    if (row.category_raw.length > 200) {
      warnings.push(`Category too long (${row.category_raw.length} chars, max 200)`);
    }
  }

  // Validate VAT code if present
  if (row.vat_code) {
    if (row.vat_code.length > 20) {
      warnings.push(`VAT code too long (${row.vat_code.length} chars, max 20)`);
    }
  }

  return warnings;
}

/**
 * Validate a single row
 * Returns validation result with is_valid flag and warnings
 */
export function validateRow(
  row: Partial<ParsedRow>,
  config?: ExtractionConfig
): ValidationResult {
  const warnings: string[] = [];

  // Check required fields
  const requiredWarnings = validateRequiredFields(row);
  warnings.push(...requiredWarnings);

  // If missing required fields, mark as invalid
  if (requiredWarnings.length > 0) {
    return {
      is_valid: config?.strictMode ? false : config?.skipInvalidRows ? false : true,
      warnings,
      confidence: 0,
    };
  }

  // Validate individual fields
  if (row.supplier_sku) {
    warnings.push(...validateSKU(row.supplier_sku));
  }

  if (row.name) {
    warnings.push(...validateName(row.name));
  }

  if (row.uom) {
    warnings.push(...validateUOM(row.uom));
  }

  if (row.price != null && row.currency) {
    warnings.push(...validatePrice(row.price, row.currency));
  }

  if (row.currency) {
    warnings.push(...validateCurrency(row.currency));
  }

  // Validate optional fields if present
  if (row as ParsedRow) {
    warnings.push(...validateOptionalFields(row as ParsedRow));
  }

  // Calculate confidence based on warnings
  const errorCount = warnings.filter((w) =>
    w.toLowerCase().includes('missing') || w.toLowerCase().includes('invalid')
  ).length;

  const warningCount = warnings.length - errorCount;

  let confidence = 1.0;
  confidence -= errorCount * 0.3; // Errors reduce confidence significantly
  confidence -= warningCount * 0.05; // Warnings reduce slightly

  confidence = Math.max(0, Math.min(1, confidence));

  // Determine validity
  const is_valid = config?.strictMode
    ? warnings.length === 0
    : errorCount === 0;

  return {
    is_valid,
    warnings,
    confidence,
  };
}

/**
 * Validate batch of rows
 */
export function validateRows(
  rows: Array<Partial<ParsedRow>>,
  config?: ExtractionConfig
): {
  validRows: number;
  invalidRows: number;
  warnings: Array<{ rowNum: number; warnings: string[] }>;
  overallConfidence: number;
} {
  let validRows = 0;
  let invalidRows = 0;
  const warnings: Array<{ rowNum: number; warnings: string[] }> = [];
  let totalConfidence = 0;

  for (const row of rows) {
    const result = validateRow(row, config);

    if (result.is_valid) {
      validRows++;
    } else {
      invalidRows++;
    }

    if (result.warnings.length > 0) {
      warnings.push({
        rowNum: (row as ParsedRow).rowNum || 0,
        warnings: result.warnings,
      });
    }

    totalConfidence += result.confidence;
  }

  const overallConfidence = rows.length > 0 ? totalConfidence / rows.length : 0;

  return {
    validRows,
    invalidRows,
    warnings,
    overallConfidence,
  };
}

/**
 * Check if configuration allows processing despite validation warnings
 */
export function shouldProcessRow(
  validationResult: ValidationResult,
  config?: ExtractionConfig
): boolean {
  // Strict mode: no warnings allowed
  if (config?.strictMode) {
    return validationResult.warnings.length === 0;
  }

  // Skip invalid rows mode: only skip if explicitly invalid
  if (config?.skipInvalidRows) {
    return validationResult.is_valid;
  }

  // Confidence threshold
  const minConfidence = config?.minConfidence || 0.5;
  return validationResult.confidence >= minConfidence;
}
