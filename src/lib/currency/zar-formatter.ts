/**
 * South African Rand (ZAR) currency formatting utilities
 * Includes VAT calculations and South African business context
 */

// South African VAT rate (15%)
export const VAT_RATE = 0.15;

// Exchange rate helper (for import tracking)
export const DEFAULT_USD_TO_ZAR_RATE = 18.75; // Approximate rate - should be fetched from API in production

/**
 * Format amount as South African Rand currency
 */
export const formatZAR = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format large amounts with compact notation (K, M notation)
 */
export const formatCompactZAR = (amount: number): string => {
  if (amount >= 1000000) {
    return `R${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `R${(amount / 1000).toFixed(1)}K`;
  }
  return formatZAR(amount);
};

/**
 * Format ZAR without currency symbol (for inputs)
 */
export const formatZARNumber = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Calculate VAT amount
 */
export const calculateVAT = (amount: number): number => {
  return amount * VAT_RATE;
};

/**
 * Add VAT to amount (VAT inclusive)
 */
export const addVAT = (amount: number): number => {
  return amount * (1 + VAT_RATE);
};

/**
 * Remove VAT from amount (extract VAT exclusive amount)
 */
export const removeVAT = (amountIncVAT: number): number => {
  return amountIncVAT / (1 + VAT_RATE);
};

/**
 * Format amount with VAT breakdown
 */
export const formatZARWithVAT = (
  amount: number,
  isVATInclusive: boolean = true
): {
  total: string;
  vatExclusive: string;
  vatAmount: string;
  vatInclusive: string;
} => {
  if (isVATInclusive) {
    const vatExclusive = removeVAT(amount);
    const vatAmount = amount - vatExclusive;
    return {
      total: formatZAR(amount),
      vatExclusive: formatZAR(vatExclusive),
      vatAmount: formatZAR(vatAmount),
      vatInclusive: formatZAR(amount),
    };
  } else {
    const vatAmount = calculateVAT(amount);
    const vatInclusive = amount + vatAmount;
    return {
      total: formatZAR(vatInclusive),
      vatExclusive: formatZAR(amount),
      vatAmount: formatZAR(vatAmount),
      vatInclusive: formatZAR(vatInclusive),
    };
  }
};

/**
 * Convert USD to ZAR (for import tracking)
 */
export const convertUSDToZAR = (
  usdAmount: number,
  exchangeRate: number = DEFAULT_USD_TO_ZAR_RATE
): number => {
  return usdAmount * exchangeRate;
};

/**
 * Format South African date (DD/MM/YYYY)
 */
export const formatSADate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format South African date and time
 */
export const formatSADateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Check if date is within South African financial year (1 March - 28 February)
 */
export const isCurrentSAFinancialYear = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const currentYear = new Date().getFullYear();

  // SA financial year runs from 1 March to 28/29 February
  const currentFYStart = new Date(currentYear, 2, 1); // March 1st
  const currentFYEnd = new Date(currentYear + 1, 1, 28); // February 28th next year

  return dateObj >= currentFYStart && dateObj <= currentFYEnd;
};

/**
 * Get current South African financial year string
 */
export const getCurrentSAFinancialYear = (): string => {
  const now = new Date();
  const currentYear = now.getFullYear();

  // If we're in Jan/Feb, we're in the FY that started previous March
  const fyStartYear = now.getMonth() < 2 ? currentYear - 1 : currentYear;
  const fyEndYear = fyStartYear + 1;

  return `${fyStartYear}/${fyEndYear.toString().slice(-2)}`;
};

/**
 * BEE (Black Economic Empowerment) spend categories
 */
export enum BEECategory {
  BEE_COMPLIANT = 'bee_compliant',
  BLACK_OWNED = 'black_owned',
  WOMEN_OWNED = 'women_owned',
  YOUTH_OWNED = 'youth_owned',
  LOCAL_SUPPLIER = 'local_supplier',
  INTERNATIONAL = 'international',
}

/**
 * Get BEE category display name
 */
export const getBEECategoryName = (category: BEECategory): string => {
  const names: Record<BEECategory, string> = {
    [BEECategory.BEE_COMPLIANT]: 'BEE Compliant',
    [BEECategory.BLACK_OWNED]: 'Black Owned',
    [BEECategory.WOMEN_OWNED]: 'Women Owned',
    [BEECategory.YOUTH_OWNED]: 'Youth Owned',
    [BEECategory.LOCAL_SUPPLIER]: 'Local Supplier',
    [BEECategory.INTERNATIONAL]: 'International',
  };
  return names[category];
};

/**
 * South African provinces for spend distribution
 */
export enum SAProvince {
  GAUTENG = 'GP',
  WESTERN_CAPE = 'WC',
  KWAZULU_NATAL = 'KZN',
  EASTERN_CAPE = 'EC',
  LIMPOPO = 'LP',
  MPUMALANGA = 'MP',
  NORTH_WEST = 'NW',
  FREE_STATE = 'FS',
  NORTHERN_CAPE = 'NC',
}

/**
 * Get province full name
 */
export const getProvinceName = (province: SAProvince): string => {
  const names: Record<SAProvince, string> = {
    [SAProvince.GAUTENG]: 'Gauteng',
    [SAProvince.WESTERN_CAPE]: 'Western Cape',
    [SAProvince.KWAZULU_NATAL]: 'KwaZulu-Natal',
    [SAProvince.EASTERN_CAPE]: 'Eastern Cape',
    [SAProvince.LIMPOPO]: 'Limpopo',
    [SAProvince.MPUMALANGA]: 'Mpumalanga',
    [SAProvince.NORTH_WEST]: 'North West',
    [SAProvince.FREE_STATE]: 'Free State',
    [SAProvince.NORTHERN_CAPE]: 'Northern Cape',
  };
  return names[province];
};
