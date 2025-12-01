/**
 * CurrencyNormalizer - Multi-currency price parsing
 *
 * Handles different decimal/thousand separators, currency symbols,
 * and regional number formats. Normalizes to numeric values.
 */

import type { CurrencyInfo } from './types';

/**
 * Currency symbol to code mapping
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  R: 'ZAR',
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  A$: 'AUD',
  C$: 'CAD',
  kr: 'SEK',
  Fr: 'CHF',
  zł: 'PLN',
  '₽': 'RUB',
  '₩': 'KRW',
  '฿': 'THB',
  '₪': 'ILS',
  '₦': 'NGN',
  '₵': 'GHS',
};

/**
 * Currency code to symbol mapping (reverse lookup)
 */
const CURRENCY_CODES: Record<string, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  SEK: 'kr',
  CHF: 'Fr',
  PLN: 'zł',
  RUB: '₽',
  KRW: '₩',
  THB: '฿',
  ILS: '₪',
  NGN: '₦',
  GHS: '₵',
};

/**
 * Detect currency from value string
 */
export function detectCurrency(value: string | number | null | undefined): CurrencyInfo {
  if (value == null) {
    return { currency: 'ZAR', symbol: 'R', confidence: 0 };
  }

  const str = String(value).trim();

  // Check for currency symbols
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (str.includes(symbol)) {
      return { currency: code, symbol, confidence: 0.95 };
    }
  }

  // Check for currency codes (ZAR, USD, etc.)
  for (const [code, symbol] of Object.entries(CURRENCY_CODES)) {
    if (str.toUpperCase().includes(code)) {
      return { currency: code, symbol, confidence: 0.9 };
    }
  }

  // Default to ZAR (South African context)
  return { currency: 'ZAR', symbol: 'R', confidence: 0.5 };
}

/**
 * Parse price from various formats
 *
 * Handles:
 * - Different decimal separators (. or ,)
 * - Different thousand separators (. , ' or space)
 * - Currency symbols and codes
 * - Negative numbers
 * - Parentheses for negative (accounting format)
 */
export function parsePrice(
  value: string | number | null | undefined,
  currencyHint?: string
): number | null {
  if (value == null) return null;

  // Already a number
  if (typeof value === 'number') {
    return value > 0 ? value : null;
  }

  let str = String(value).trim();

  // Handle empty or invalid
  if (!str || str === '-' || str.toLowerCase() === 'n/a') {
    return null;
  }

  // Handle negative (accounting format with parentheses)
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Remove currency symbols and codes
  str = str.replace(/[R$€£¥₹₽₩฿₪₦₵]/g, '');
  str = str.replace(
    /\b(ZAR|USD|EUR|GBP|JPY|INR|AUD|CAD|SEK|CHF|PLN|RUB|KRW|THB|ILS|NGN|GHS)\b/gi,
    ''
  );
  str = str.trim();

  // Determine format by analyzing separators
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  const hasSpace = str.includes(' ');
  const hasApostrophe = str.includes("'");

  let normalized = str;

  // Case 1: European format (1.234,56)
  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');

    if (lastComma > lastDot) {
      // Format: 1.234,56 (European)
      normalized = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Format: 1,234.56 (US)
      normalized = str.replace(/,/g, '');
    }
  }
  // Case 2: Only comma (could be decimal or thousand separator)
  else if (hasComma && !hasDot) {
    const commaCount = (str.match(/,/g) || []).length;
    const lastCommaIndex = str.lastIndexOf(',');
    const digitsAfterLastComma = str.length - lastCommaIndex - 1;

    if (commaCount === 1 && digitsAfterLastComma === 2) {
      // Likely decimal: 1234,56 -> 1234.56
      normalized = str.replace(',', '.');
    } else {
      // Likely thousand separator: 1,234 -> 1234
      normalized = str.replace(/,/g, '');
    }
  }
  // Case 3: Only dot (could be decimal or thousand separator)
  else if (hasDot && !hasComma) {
    const dotCount = (str.match(/\./g) || []).length;
    const lastDotIndex = str.lastIndexOf('.');
    const digitsAfterLastDot = str.length - lastDotIndex - 1;

    if (dotCount === 1 && digitsAfterLastDot <= 3) {
      // Likely decimal: 1234.56 -> 1234.56
      normalized = str;
    } else if (dotCount > 1) {
      // Thousand separator: 1.234.567 -> 1234567
      normalized = str.replace(/\./g, '');
    } else {
      normalized = str;
    }
  }
  // Case 4: Space as thousand separator
  else if (hasSpace) {
    // Format: 1 234 567.89 or 1 234 567,89
    normalized = str.replace(/\s/g, '').replace(',', '.');
  }
  // Case 5: Apostrophe as thousand separator (Swiss)
  else if (hasApostrophe) {
    // Format: 1'234'567.89
    normalized = str.replace(/'/g, '');
  }

  // Parse to number
  const parsed = parseFloat(normalized);

  if (isNaN(parsed)) {
    return null;
  }

  const result = isNegative ? -parsed : parsed;

  // Price sanity check (must be positive for pricelists)
  return result > 0 ? result : null;
}

/**
 * Format price for display
 */
export function formatPrice(
  value: number,
  currency: string = 'ZAR',
  locale: string = 'en-ZA'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback if currency not supported
    const symbol = CURRENCY_CODES[currency] || currency;
    return `${symbol} ${value.toFixed(2)}`;
  }
}

/**
 * Normalize currency code to ISO 4217 standard
 */
export function normalizeCurrencyCode(code: string | null | undefined): string {
  if (!code) return 'ZAR';

  const upper = code.toUpperCase().trim();

  // Already a valid code
  if (CURRENCY_CODES[upper]) {
    return upper;
  }

  // Try to map from symbol
  const fromSymbol = CURRENCY_SYMBOLS[code];
  if (fromSymbol) {
    return fromSymbol;
  }

  // Default
  return 'ZAR';
}

/**
 * Validate currency code
 */
export function isValidCurrencyCode(code: string): boolean {
  return code.length === 3 && !!CURRENCY_CODES[code.toUpperCase()];
}
