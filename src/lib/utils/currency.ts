// South African Rand (ZAR) Currency Utilities

export interface ZARAmount {
  amount: number;
  currency: 'ZAR';
  formatted: string;
  includesVAT: boolean;
  vatAmount?: number;
  vatRate: number;
}

// Standard South African VAT rate (15%)
export const SA_VAT_RATE = 0.15;

// Currency formatting options for ZAR
const ZAR_FORMATTER = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ZAR_NUMBER_FORMATTER = new Intl.NumberFormat('en-ZA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format amount as ZAR currency
 * @param amount - Amount in ZAR
 * @param options - Formatting options
 * @returns Formatted ZAR string
 */
export function formatZAR(
  amount: number,
  options: {
    includeSymbol?: boolean;
    includeVAT?: boolean;
    vatRate?: number;
    showVATBreakdown?: boolean;
  } = {}
): string {
  const {
    includeSymbol = true,
    includeVAT = false,
    vatRate = SA_VAT_RATE,
    showVATBreakdown = false,
  } = options;

  let displayAmount = amount;
  let vatAmount = 0;

  if (includeVAT) {
    vatAmount = amount * vatRate;
    displayAmount = amount + vatAmount;
  }

  const formatted = includeSymbol
    ? ZAR_FORMATTER.format(displayAmount)
    : ZAR_NUMBER_FORMATTER.format(displayAmount);

  if (showVATBreakdown && includeVAT) {
    const vatFormatted = includeSymbol
      ? ZAR_FORMATTER.format(vatAmount)
      : ZAR_NUMBER_FORMATTER.format(vatAmount);

    return `${formatted} (incl. VAT ${vatFormatted})`;
  }

  return formatted;
}

/**
 * Create ZARAmount object with all calculations
 * @param amount - Base amount in ZAR
 * @param includesVAT - Whether the amount already includes VAT
 * @param vatRate - VAT rate (default: 15%)
 * @returns ZARAmount object
 */
export function createZARAmount(
  amount: number,
  includesVAT: boolean = false,
  vatRate: number = SA_VAT_RATE
): ZARAmount {
  let baseAmount = amount;
  let vatAmount = 0;

  if (includesVAT) {
    // Amount includes VAT, calculate exclusive amount
    baseAmount = amount / (1 + vatRate);
    vatAmount = amount - baseAmount;
  } else {
    // Amount is exclusive, calculate VAT
    vatAmount = amount * vatRate;
  }

  const totalAmount = baseAmount + vatAmount;

  return {
    amount: baseAmount,
    currency: 'ZAR',
    formatted: formatZAR(totalAmount),
    includesVAT: true, // Final amount always includes VAT
    vatAmount,
    vatRate,
  };
}

/**
 * Add VAT to an amount
 * @param amount - Exclusive amount
 * @param vatRate - VAT rate (default: 15%)
 * @returns Amount including VAT
 */
export function addVAT(amount: number, vatRate: number = SA_VAT_RATE): number {
  return amount * (1 + vatRate);
}

/**
 * Remove VAT from an amount
 * @param amount - Inclusive amount
 * @param vatRate - VAT rate (default: 15%)
 * @returns Amount excluding VAT
 */
export function removeVAT(amount: number, vatRate: number = SA_VAT_RATE): number {
  return amount / (1 + vatRate);
}

/**
 * Calculate VAT amount
 * @param amount - Base amount
 * @param vatRate - VAT rate (default: 15%)
 * @returns VAT amount
 */
export function calculateVAT(amount: number, vatRate: number = SA_VAT_RATE): number {
  return amount * vatRate;
}

/**
 * Parse ZAR string to number
 * @param zarString - Formatted ZAR string (e.g., "R 1,234.56")
 * @returns Numeric value
 */
export function parseZAR(zarString: string): number {
  // Remove currency symbol and spaces, replace commas
  const cleanString = zarString.replace(/R\s?/g, '').replace(/,/g, '').trim();

  const amount = parseFloat(cleanString);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Currency conversion utilities (for future use)
 */
export const CURRENCY_CONVERSIONS = {
  USD_TO_ZAR: 18.5, // Approximate rate, should be fetched from API
  EUR_TO_ZAR: 20.2,
  GBP_TO_ZAR: 23.1,
  ZAR_TO_USD: 1 / 18.5,
  ZAR_TO_EUR: 1 / 20.2,
  ZAR_TO_GBP: 1 / 23.1,
};

/**
 * Convert USD amounts to ZAR (for migration purposes)
 * @param usdAmount - Amount in USD
 * @param conversionRate - USD to ZAR rate
 * @returns Amount in ZAR
 */
export function convertUSDToZAR(
  usdAmount: number,
  conversionRate: number = CURRENCY_CONVERSIONS.USD_TO_ZAR
): number {
  return usdAmount * conversionRate;
}

/**
 * Convert any currency to ZAR
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code
 * @param toZAR - Conversion rate to ZAR
 * @returns Amount in ZAR
 */
export function convertToZAR(
  amount: number,
  fromCurrency: 'USD' | 'EUR' | 'GBP',
  conversionRate?: number
): number {
  const rate =
    conversionRate ||
    CURRENCY_CONVERSIONS[`${fromCurrency}_TO_ZAR` as keyof typeof CURRENCY_CONVERSIONS];
  return amount * rate;
}

/**
 * South African number formatting
 * @param value - Numeric value
 * @param options - Formatting options
 * @returns Formatted number string
 */
export function formatSANumber(
  value: number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
  } = {}
): string {
  const { minimumFractionDigits = 0, maximumFractionDigits = 2, useGrouping = true } = options;

  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping,
  }).format(value);
}

/**
 * Format percentage for South African context
 * @param value - Decimal value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatSAPercentage(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Business context formatting for invoices/quotes
 * @param amount - Amount in ZAR
 * @param includeVAT - Whether to include VAT
 * @param vatRate - VAT rate
 * @returns Business formatted amount with VAT details
 */
export function formatBusinessAmount(
  amount: number,
  includeVAT: boolean = true,
  vatRate: number = SA_VAT_RATE
): {
  exclusive: string;
  vat: string;
  inclusive: string;
  formatted: string;
} {
  const exclusiveAmount = includeVAT ? removeVAT(amount) : amount;
  const vatAmount = calculateVAT(exclusiveAmount, vatRate);
  const inclusiveAmount = exclusiveAmount + vatAmount;

  return {
    exclusive: formatZAR(exclusiveAmount),
    vat: formatZAR(vatAmount),
    inclusive: formatZAR(inclusiveAmount),
    formatted: `${formatZAR(inclusiveAmount)} (incl. VAT)`,
  };
}

/**
 * Default ZAR formatting for the application
 * @param amount - Amount to format
 * @param includeVAT - Whether amount includes VAT
 * @returns Formatted ZAR string
 */
export function formatAppCurrency(amount: number, includeVAT: boolean = true): string {
  return formatZAR(amount, { includeVAT, showVATBreakdown: false });
}

// Export constants for use throughout the app
export const DEFAULT_CURRENCY = 'ZAR' as const;
export const DEFAULT_VAT_RATE = SA_VAT_RATE;
export const CURRENCY_SYMBOL = 'R';
export const CURRENCY_CODE = 'ZAR';

// South African business context
export const SA_BUSINESS_CONTEXT = {
  currency: DEFAULT_CURRENCY,
  vatRate: DEFAULT_VAT_RATE,
  vatName: 'VAT', // Value Added Tax
  currencySymbol: CURRENCY_SYMBOL,
  locale: 'en-ZA',
  timezone: 'Africa/Johannesburg',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  fiscalYearStart: 'March', // South African tax year starts 1 March
  businessHours: {
    start: '08:00',
    end: '17:00',
    timezone: 'Africa/Johannesburg',
  },
};
