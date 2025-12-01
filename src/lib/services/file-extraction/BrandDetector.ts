/**
 * BrandDetector - Intelligent brand extraction from supplier data
 *
 * Ported from PriceData with 9 SKU pattern-matching algorithms to prevent
 * brand contamination. Extracts brands from filenames, sheet names, and columns.
 */

import type { BrandDetectionResult } from './types';

/**
 * Common SKU prefixes used by suppliers
 * These help identify SKU-like values that should NOT be treated as brands
 */
const COMMON_SKU_PREFIXES = [
  'AMP',
  'SPE',
  'PRO',
  'COM',
  'HOR',
  'DRI',
  'FRA',
  'REB',
  'SKU',
  'ITEM',
  'PROD',
  'PART',
  'MAT',
  'ART',
  'REF',
];

/**
 * Known brand names (extend as needed)
 * Used for positive brand detection
 */
const KNOWN_BRANDS = [
  // Audio brands
  'AMPAUD',
  'SPEAUD',
  'PROAUD',
  // Automotive
  'BOSCH',
  'NGK',
  'CASTROL',
  // Electronics
  'SAMSUNG',
  'LG',
  'SONY',
  // Generic
  'GENERIC',
  'UNBRANDED',
  'OEM',
];

/**
 * Check if a value looks like a SKU using 9 pattern-matching algorithms
 *
 * Algorithm 1: All caps with numbers (e.g., AMPAUD028, PROAUD002)
 * Algorithm 2: Prefix patterns (SKU-12345, ITEM-789)
 * Algorithm 3: High numeric ratio (>60% numbers)
 * Algorithm 4: Common SKU prefixes
 * Algorithm 5: Contains common separators (-, _, /)
 * Algorithm 6: Alphanumeric with no spaces
 * Algorithm 7: Starts with known SKU prefix
 * Algorithm 8: Too short to be brand name (2-3 chars with numbers)
 * Algorithm 9: Contains version/revision indicators (V1, R2, etc.)
 */
export function isSKULike(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  // Algorithm 1: All caps with numbers
  const hasUppercase = /[A-Z]/.test(trimmed);
  const hasNumbers = /\d/.test(trimmed);
  const isAllUpperOrNumber = /^[A-Z0-9\-_/\s]+$/.test(trimmed);

  if (hasUppercase && hasNumbers && isAllUpperOrNumber) {
    return true;
  }

  // Algorithm 2: Prefix patterns (SKU-12345, ITEM-789, P-123)
  if (/^(SKU|ITEM|PART|PROD|MAT|ART|REF|CODE|P|I|M|A|R|C)[-_]/i.test(trimmed)) {
    return true;
  }

  // Algorithm 3: High numeric ratio (>60%)
  const numDigits = (trimmed.match(/\d/g) || []).length;
  const numericRatio = numDigits / trimmed.length;
  if (numericRatio > 0.6) {
    return true;
  }

  // Algorithm 4: Common SKU prefixes
  for (const prefix of COMMON_SKU_PREFIXES) {
    if (trimmed.toUpperCase().startsWith(prefix)) {
      return true;
    }
  }

  // Algorithm 5: Contains common separators (-, _, /)
  const hasSeparators = /[-_/]/.test(trimmed);
  if (hasSeparators && hasNumbers) {
    return true;
  }

  // Algorithm 6: Alphanumeric with no spaces
  const isAlphanumericNoSpace = /^[A-Z0-9]+$/i.test(trimmed);
  if (isAlphanumericNoSpace && hasNumbers && trimmed.length > 5) {
    return true;
  }

  // Algorithm 7: Starts with known SKU prefix
  if (COMMON_SKU_PREFIXES.some(p => trimmed.startsWith(p))) {
    return true;
  }

  // Algorithm 8: Too short with numbers (2-3 chars)
  if (trimmed.length <= 3 && hasNumbers) {
    return true;
  }

  // Algorithm 9: Version/revision indicators
  if (/[VvRr]\d+/.test(trimmed) || /v\d+\.\d+/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Extract brand from sheet name
 * Handles common patterns like "Brand - Products", "Products_Brand", etc.
 */
export function extractBrandFromSheetName(sheetName: string): BrandDetectionResult {
  if (!sheetName) {
    return { brand: null, confidence: 0, source: 'sheet_name' };
  }

  const cleaned = sheetName.trim();

  // Check if it's a SKU-like value (not a brand)
  if (isSKULike(cleaned)) {
    return { brand: null, confidence: 0, source: 'sheet_name' };
  }

  // Pattern 1: "Brand - Products" or "Brand_Products"
  const dashPattern = /^([^-_]+)[-_]/;
  const dashMatch = cleaned.match(dashPattern);
  if (dashMatch) {
    const potential = dashMatch[1].trim();
    if (!isSKULike(potential) && potential.length > 2) {
      return { brand: potential, confidence: 0.8, source: 'sheet_name' };
    }
  }

  // Pattern 2: "Products - Brand" or "Products_Brand"
  const reverseDashPattern = /[-_]([^-_]+)$/;
  const reverseMatch = cleaned.match(reverseDashPattern);
  if (reverseMatch) {
    const potential = reverseMatch[1].trim();
    if (!isSKULike(potential) && potential.length > 2) {
      return { brand: potential, confidence: 0.7, source: 'sheet_name' };
    }
  }

  // Pattern 3: Check against known brands
  const upperCleaned = cleaned.toUpperCase();
  for (const knownBrand of KNOWN_BRANDS) {
    if (upperCleaned.includes(knownBrand)) {
      return { brand: knownBrand, confidence: 0.9, source: 'sheet_name' };
    }
  }

  // Pattern 4: Single word sheet name (if not generic)
  if (
    !cleaned.includes(' ') &&
    !isSKULike(cleaned) &&
    cleaned.length > 3 &&
    !['SHEET', 'DATA', 'PRODUCTS', 'ITEMS', 'PRICELIST'].includes(upperCleaned)
  ) {
    return { brand: cleaned, confidence: 0.6, source: 'sheet_name' };
  }

  return { brand: null, confidence: 0, source: 'sheet_name' };
}

/**
 * Extract brand from column value
 * Applies SKU filtering to prevent contamination
 */
export function extractBrandFromColumn(value: unknown, columnName?: string): BrandDetectionResult {
  if (!value || typeof value !== 'string') {
    return { brand: null, confidence: 0, source: 'column' };
  }

  const cleaned = value.trim();

  // Skip empty or SKU-like values
  if (!cleaned || isSKULike(cleaned)) {
    return { brand: null, confidence: 0, source: 'column' };
  }

  // Skip generic values
  const upperCleaned = cleaned.toUpperCase();
  if (['N/A', 'NA', 'NONE', 'NULL', 'UNKNOWN', '-', ''].includes(upperCleaned)) {
    return { brand: null, confidence: 0, source: 'column' };
  }

  // Check against known brands
  for (const knownBrand of KNOWN_BRANDS) {
    if (upperCleaned === knownBrand) {
      return { brand: knownBrand, confidence: 0.95, source: 'column' };
    }
    if (upperCleaned.includes(knownBrand)) {
      return { brand: knownBrand, confidence: 0.85, source: 'column' };
    }
  }

  // Higher confidence if column is explicitly named "brand" or similar
  const confidence = columnName && /brand|make|manufacturer|merk/i.test(columnName) ? 0.9 : 0.7;

  return { brand: cleaned, confidence, source: 'column' };
}

/**
 * Extract brand from filename
 * Handles common patterns like "Brand_Pricelist_2024.xlsx"
 */
export function extractBrandFromFilename(filename: string): BrandDetectionResult {
  if (!filename) {
    return { brand: null, confidence: 0, source: 'filename' };
  }

  // Remove extension
  const withoutExt = filename.replace(/\.(xlsx?|csv|pdf)$/i, '');

  // Remove common suffixes
  const cleaned = withoutExt
    .replace(/[-_](pricelist|price|list|products|items|catalog|catalogue)/gi, '')
    .replace(/[-_]\d{4}[-_]\d{2}[-_]\d{2}/g, '') // Remove dates
    .replace(/[-_]\d{8}/g, '') // Remove dates (compact)
    .replace(/[-_]\d{4}/g, '') // Remove years
    .trim();

  if (isSKULike(cleaned)) {
    return { brand: null, confidence: 0, source: 'filename' };
  }

  // Check against known brands
  const upperCleaned = cleaned.toUpperCase();
  for (const knownBrand of KNOWN_BRANDS) {
    if (upperCleaned.includes(knownBrand)) {
      return { brand: knownBrand, confidence: 0.85, source: 'filename' };
    }
  }

  // Extract first part before separator
  const parts = cleaned.split(/[-_\s]/);
  if (parts.length > 0) {
    const firstPart = parts[0].trim();
    if (!isSKULike(firstPart) && firstPart.length > 2) {
      return { brand: firstPart, confidence: 0.7, source: 'filename' };
    }
  }

  return { brand: null, confidence: 0, source: 'filename' };
}

/**
 * Detect brand from multiple sources and return best match
 */
export function detectBrand(
  filename: string,
  sheetName?: string,
  brandColumnValues?: Array<unknown>
): BrandDetectionResult {
  const results: BrandDetectionResult[] = [];

  // Try filename
  results.push(extractBrandFromFilename(filename));

  // Try sheet name
  if (sheetName) {
    results.push(extractBrandFromSheetName(sheetName));
  }

  // Try brand column values (use most common non-SKU value)
  if (brandColumnValues && brandColumnValues.length > 0) {
    const brandCounts = new Map<string, number>();

    for (const val of brandColumnValues) {
      const result = extractBrandFromColumn(val);
      if (result.brand && result.confidence > 0) {
        const count = brandCounts.get(result.brand) || 0;
        brandCounts.set(result.brand, count + 1);
      }
    }

    // Get most common brand
    let maxCount = 0;
    let mostCommon: string | null = null;
    const entries = Array.from(brandCounts.entries());
    for (const [brand, count] of entries) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = brand;
      }
    }

    if (mostCommon) {
      // Higher confidence if brand appears in >50% of rows
      const confidence = maxCount / brandColumnValues.length > 0.5 ? 0.95 : 0.8;
      results.push({ brand: mostCommon, confidence, source: 'column' });
    }
  }

  // Return result with highest confidence
  const best = results.reduce((prev, curr) => (curr.confidence > prev.confidence ? curr : prev));

  return best.confidence > 0 ? best : { brand: null, confidence: 0, source: 'pattern' };
}
