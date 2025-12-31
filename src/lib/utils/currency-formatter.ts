/**
 * Unified Currency Formatter
 * 
 * Single source of truth for currency formatting across the platform.
 * Wraps CurrencyManager to provide consistent, backward-compatible APIs.
 * 
 * Author: Aster
 * Date: 2025-01-27
 */

import { currencyManager, type CurrencyConfig } from '@/lib/config/currency-config';

/**
 * Format currency amount with proper locale and symbol
 * 
 * @param value - Amount to format (number, string, null, or undefined)
 * @param currency - Currency code (defaults to 'ZAR')
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = 'ZAR',
  options?: {
    includeVAT?: boolean;
    showVATBreakdown?: boolean;
    forceShowSymbol?: boolean;
  }
): string {
  // Handle null/undefined/empty string
  if (value === null || value === undefined || value === '') {
    return currencyManager.formatCurrency(0, currency, options || {});
  }

  // Convert string to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle NaN
  if (isNaN(numValue)) {
    return currencyManager.formatCurrency(0, currency, options || {});
  }

  // Format using CurrencyManager
  return currencyManager.formatCurrency(numValue, currency, options || {});
}

/**
 * Format ZAR currency (convenience function)
 * 
 * @param amount - Amount to format
 * @param options - Formatting options
 * @returns Formatted ZAR string
 */
export function formatZAR(
  amount: number | string | null | undefined,
  options?: {
    includeVAT?: boolean;
    showVATBreakdown?: boolean;
    includeSymbol?: boolean;
  }
): string {
  return formatCurrency(amount, 'ZAR', options);
}

/**
 * Format price (alias for formatCurrency for backward compatibility)
 * 
 * @param value - Amount to format
 * @param currency - Currency code (defaults to 'ZAR')
 * @param locale - Locale (ignored, uses currency-specific locale)
 * @returns Formatted currency string
 */
export function formatPrice(
  value: number | string | null | undefined,
  currency: string = 'ZAR',
  locale?: string // Kept for backward compatibility but ignored
): string {
  return formatCurrency(value, currency);
}

/**
 * Format cost amount (alias for formatCurrency)
 * 
 * @param value - Amount to format
 * @returns Formatted currency string
 */
export function formatCostAmount(value: number | string | null | undefined): string {
  return formatCurrency(value);
}

/**
 * Get currency symbol for a given currency code
 * 
 * @param currency - Currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string = 'ZAR'): string {
  const currencyDef = currencyManager.getSupportedCurrencies().find(c => c.code === currency);
  return currencyDef?.symbol || 'R';
}

/**
 * Format currency with custom options
 * 
 * @param amount - Amount to format
 * @param currency - Currency code
 * @param includeVAT - Whether to include VAT
 * @param showVATBreakdown - Whether to show VAT breakdown
 * @returns Formatted currency string
 */
export function formatCurrencyWithOptions(
  amount: number,
  currency: string = 'ZAR',
  includeVAT: boolean = false,
  showVATBreakdown: boolean = false
): string {
  return currencyManager.formatCurrency(amount, currency, {
    includeVAT,
    showVATBreakdown,
  });
}

/**
 * Calculate VAT for an amount
 * 
 * @param amount - Base amount
 * @param currency - Currency code
 * @returns VAT calculation object
 */
export function calculateVAT(amount: number, currency: string = 'ZAR') {
  return currencyManager.calculateVAT(amount, currency);
}

/**
 * Convert currency between two currencies
 * 
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  return currencyManager.convertCurrency(amount, fromCurrency, toCurrency);
}

/**
 * Get default currency from config
 * 
 * @returns Default currency code
 */
export function getDefaultCurrency(): string {
  return currencyManager.getConfig().primary;
}

/**
 * Check if currency is supported
 * 
 * @param currency - Currency code to check
 * @returns True if supported
 */
export function isCurrencySupported(currency: string): boolean {
  return currencyManager.getSupportedCurrencies().some(c => c.code === currency);
}

// Re-export CurrencyManager for advanced use cases
export { currencyManager } from '@/lib/config/currency-config';
export type { CurrencyConfig } from '@/lib/config/currency-config';

