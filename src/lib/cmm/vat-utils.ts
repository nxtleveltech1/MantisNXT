/**
 * VAT and Price Normalization Utilities
 * Handles deterministic VAT/price calculations per supplier rules
 */

export interface VatPolicy {
  rate: number;
  mode: 'ex' | 'inc' | 'detect';
  detect_keywords?: string[];
  ratio_tolerance?: number;
  currency?: string;
}

export interface PriceNormalizationResult {
  cost_price_ex_vat: number | null;
  price_incl_vat: number | null;
  vat_rate: number;
  price_source: 'explicit_ex' | 'explicit_inc' | 'derived_from_inc' | 'missing';
  warnings: string[];
}

/**
 * Normalize price and VAT data according to supplier rules
 * Preferred order: explicit EX VAT → explicit VAT% → derive from INCL price → null with warning
 */
export function normalizePriceAndVat(
  row: Record<string, any>,
  vatPolicy: VatPolicy = { rate: 0.15, mode: 'detect' }
): PriceNormalizationResult {
  const warnings: string[] = [];
  let cost_price_ex_vat: number | null = null;
  let price_incl_vat: number | null = null;
  let vat_rate: number = vatPolicy.rate;
  let price_source: PriceNormalizationResult['price_source'] = 'missing';

  // Extract price values from row
  const priceExVat = extractNumericValue(row, ['cost_price_ex_vat', 'price_ex_vat', 'nett_excl', 'dealer_ex', 'trade_ex']);
  const priceIncVat = extractNumericValue(row, ['price_incl_vat', 'price_inc_vat', 'retail_incl', 'rsp_incl', 'street_incl']);
  const vatRateFromRow = extractNumericValue(row, ['vat_rate', 'vat%', 'vat', 'tax_rate']);
  
  // Determine VAT rate
  if (vatRateFromRow !== null) {
    vat_rate = vatRateFromRow;
  }

  // Handle explicit EX VAT price
  if (priceExVat !== null && priceExVat > 0) {
    cost_price_ex_vat = priceExVat;
    price_source = 'explicit_ex';
    
    // Calculate inclusive price if we have VAT rate
    if (vat_rate > 0) {
      price_incl_vat = Number((priceExVat * (1 + vat_rate)).toFixed(2));
    }
  }
  // Handle explicit INCL VAT price
  else if (priceIncVat !== null && priceIncVat > 0) {
    price_incl_vat = priceIncVat;
    
    // Derive EX VAT price
    if (vat_rate > 0) {
      cost_price_ex_vat = Number((priceIncVat / (1 + vat_rate)).toFixed(2));
      price_source = 'derived_from_inc';
    } else {
      warnings.push('VAT rate is 0, cannot derive EX VAT from inclusive price');
    }
  }
  // Auto-detect mode
  else if (vatPolicy.mode === 'detect' && vatPolicy.detect_keywords) {
    const detectedPrices = detectPriceColumns(row, vatPolicy.detect_keywords);
    if (detectedPrices.ex) {
      cost_price_ex_vat = detectedPrices.ex;
      price_source = 'explicit_ex';
    } else if (detectedPrices.inc && vat_rate > 0) {
      price_incl_vat = detectedPrices.inc;
      cost_price_ex_vat = Number((detectedPrices.inc / (1 + vat_rate)).toFixed(2));
      price_source = 'derived_from_inc';
    }
  }

  // Validate VAT rate
  if (vat_rate < 0 || vat_rate > 1) {
    warnings.push(`Invalid VAT rate: ${vat_rate}, using default ${vatPolicy.rate}`);
    vat_rate = vatPolicy.rate;
  }

  // Final validation
  if (cost_price_ex_vat === null || cost_price_ex_vat <= 0) {
    warnings.push('No valid EX VAT price found');
  }

  return {
    cost_price_ex_vat,
    price_incl_vat,
    vat_rate,
    price_source,
    warnings
  };
}

/**
 * Extract numeric value from row using multiple possible column names
 */
function extractNumericValue(row: Record<string, any>, possibleKeys: string[]): number | null {
  for (const key of possibleKeys) {
    const value = row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
    if (value !== null && value !== undefined && value !== '') {
      const num = parseFloat(String(value).replace(/[^\d.-]/g, ''));
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }
  return null;
}

/**
 * Detect price columns based on keywords
 */
function detectPriceColumns(row: Record<string, any>, keywords: string[]): { ex?: number; inc?: number } {
  const result: { ex?: number; inc?: number } = {};
  
  for (const [key, value] of Object.entries(row)) {
    const lowerKey = key.toLowerCase();
    const numValue = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    
    if (isNaN(numValue) || numValue <= 0) continue;
    
    // Check for EX VAT indicators
    if (keywords.some(k => lowerKey.includes(k.toLowerCase()) && k.toLowerCase().includes('ex'))) {
      result.ex = numValue;
    }
    // Check for INCL VAT indicators  
    else if (keywords.some(k => lowerKey.includes(k.toLowerCase()) && k.toLowerCase().includes('inc'))) {
      result.inc = numValue;
    }
  }
  
  return result;
}

/**
 * Apply VAT policy to a batch of rows
 */
export function applyVatPolicyToRows(
  rows: Record<string, any>[],
  vatPolicyOrSupplierId: VatPolicy | string
): {
  rows: Array<Record<string, any> & { _vat_normalization: PriceNormalizationResult }>;
  warnings: Array<{ row_num?: number; message: string }>;
  priceSources: string[];
} {
  // Handle supplier_id string by using default VAT policy
  const vatPolicy: VatPolicy = typeof vatPolicyOrSupplierId === 'string'
    ? { rate: 0.15, mode: 'detect', detect_keywords: ['ex', 'inc', 'excl', 'incl', 'nett', 'retail'] }
    : vatPolicyOrSupplierId;

  const warnings: Array<{ row_num?: number; message: string }> = [];
  const priceSources: string[] = [];

  const processedRows = rows.map((row, idx) => {
    const normalization = normalizePriceAndVat(row, vatPolicy);
    
    // Collect warnings
    if (normalization.warnings.length > 0) {
      warnings.push(...normalization.warnings.map(w => ({
        row_num: idx + 1,
        message: w
      })));
    }

    // Track price sources
    if (normalization.price_source && !priceSources.includes(normalization.price_source)) {
      priceSources.push(normalization.price_source);
    }
    
    return {
      ...row,
      cost_price_ex_vat: normalization.cost_price_ex_vat,
      price_incl_vat: normalization.price_incl_vat,
      vat_rate: normalization.vat_rate,
      attrs_json: {
        ...(row.attrs_json || {}),
        price_source: normalization.price_source,
        vat_warnings: normalization.warnings
      },
      _vat_normalization: normalization
    };
  });

  return {
    rows: processedRows,
    warnings,
    priceSources
  };
}