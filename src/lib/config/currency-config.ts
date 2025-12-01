// @ts-nocheck
// Comprehensive Currency Configuration System for MantisNXT

export interface CurrencyConfig {
  primary: string;
  symbol: string;
  locale: string;
  vatRate: number;
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  position: 'before' | 'after';
  showVATBreakdown: boolean;
  enableMultiCurrency: boolean;
  supportedCurrencies: string[];
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: Date;
  source: string;
}

export interface CurrencySettings {
  config: CurrencyConfig;
  exchangeRates: ExchangeRate[];
  autoUpdateRates: boolean;
  rateUpdateInterval: number; // hours
  fallbackRates: Record<string, number>;
}

// Default South African configuration
export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  primary: 'ZAR',
  symbol: 'R',
  locale: 'en-ZA',
  vatRate: 0.15, // 15% SA VAT
  decimalPlaces: 2,
  thousandsSeparator: ',',
  decimalSeparator: '.',
  position: 'before', // R 1,000.00
  showVATBreakdown: true,
  enableMultiCurrency: false,
  supportedCurrencies: ['ZAR', 'USD', 'EUR', 'GBP'],
};

// Supported currency definitions
export const CURRENCY_DEFINITIONS = {
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    locale: 'en-ZA',
    decimalPlaces: 2,
    country: 'South Africa',
    region: 'Africa',
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    locale: 'en-US',
    decimalPlaces: 2,
    country: 'United States',
    region: 'North America',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    locale: 'en-EU',
    decimalPlaces: 2,
    country: 'European Union',
    region: 'Europe',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    locale: 'en-GB',
    decimalPlaces: 2,
    country: 'United Kingdom',
    region: 'Europe',
  },
} as const;

// VAT rates by country/region
export const VAT_RATES = {
  ZAR: { rate: 0.15, name: 'VAT', fullName: 'Value Added Tax' },
  USD: { rate: 0.0, name: 'Tax', fullName: 'Sales Tax' }, // Varies by state
  EUR: { rate: 0.2, name: 'VAT', fullName: 'Value Added Tax' }, // Average EU rate
  GBP: { rate: 0.2, name: 'VAT', fullName: 'Value Added Tax' },
} as const;

// Currency configuration class
export class CurrencyManager {
  private config: CurrencyConfig;
  private exchangeRates: Map<string, ExchangeRate> = new Map();

  constructor(config: CurrencyConfig = DEFAULT_CURRENCY_CONFIG) {
    this.config = config;
    this.initializeDefaultRates();
  }

  // Initialize with fallback exchange rates
  private initializeDefaultRates() {
    const defaultRates = [
      { from: 'USD', to: 'ZAR', rate: 18.5, source: 'fallback' },
      { from: 'EUR', to: 'ZAR', rate: 20.2, source: 'fallback' },
      { from: 'GBP', to: 'ZAR', rate: 23.1, source: 'fallback' },
      { from: 'ZAR', to: 'USD', rate: 0.054, source: 'fallback' },
      { from: 'ZAR', to: 'EUR', rate: 0.049, source: 'fallback' },
      { from: 'ZAR', to: 'GBP', rate: 0.043, source: 'fallback' },
    ];

    defaultRates.forEach(rate => {
      this.exchangeRates.set(`${rate.from}_${rate.to}`, {
        ...rate,
        lastUpdated: new Date(),
      });
    });
  }

  // Format currency amount
  formatCurrency(
    amount: number,
    currency?: string,
    options: {
      includeVAT?: boolean;
      showVATBreakdown?: boolean;
      forceShowSymbol?: boolean;
    } = {}
  ): string {
    const targetCurrency = currency || this.config.primary;
    const currencyDef = CURRENCY_DEFINITIONS[targetCurrency as keyof typeof CURRENCY_DEFINITIONS];

    if (!currencyDef) {
      throw new Error(`Unsupported currency: ${targetCurrency}`);
    }

    const {
      includeVAT = false,
      showVATBreakdown = this.config.showVATBreakdown,
      forceShowSymbol = true,
    } = options;

    let displayAmount = amount;
    let vatAmount = 0;

    if (includeVAT) {
      const vatRate = VAT_RATES[targetCurrency as keyof typeof VAT_RATES]?.rate || 0;
      vatAmount = amount * vatRate;
      displayAmount = amount + vatAmount;
    }

    const formatter = new Intl.NumberFormat(currencyDef.locale, {
      style: forceShowSymbol ? 'currency' : 'decimal',
      currency: targetCurrency,
      minimumFractionDigits: currencyDef.decimalPlaces,
      maximumFractionDigits: currencyDef.decimalPlaces,
    });

    const formatted = formatter.format(displayAmount);

    if (showVATBreakdown && includeVAT && vatAmount > 0) {
      const vatFormatted = formatter.format(vatAmount);
      const vatInfo = VAT_RATES[targetCurrency as keyof typeof VAT_RATES];
      return `${formatted} (incl. ${vatInfo?.name || 'VAT'} ${vatFormatted})`;
    }

    return formatted;
  }

  // Convert between currencies
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return amount;

    const rateKey = `${fromCurrency}_${toCurrency}`;
    const rate = this.exchangeRates.get(rateKey);

    if (!rate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
    }

    return amount * rate.rate;
  }

  // Update exchange rate
  updateExchangeRate(rate: Omit<ExchangeRate, 'lastUpdated'>): void {
    const rateKey = `${rate.from}_${rate.to}`;
    this.exchangeRates.set(rateKey, {
      ...rate,
      lastUpdated: new Date(),
    });
  }

  // Get current configuration
  getConfig(): CurrencyConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(updates: Partial<CurrencyConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Get supported currencies
  getSupportedCurrencies() {
    return this.config.supportedCurrencies.map(code => ({
      code,
      ...CURRENCY_DEFINITIONS[code as keyof typeof CURRENCY_DEFINITIONS],
    }));
  }

  // Get VAT information
  getVATInfo(currency?: string) {
    const targetCurrency = currency || this.config.primary;
    return (
      VAT_RATES[targetCurrency as keyof typeof VAT_RATES] || {
        rate: 0,
        name: 'Tax',
        fullName: 'Tax',
      }
    );
  }

  // Calculate VAT
  calculateVAT(
    amount: number,
    currency?: string
  ): {
    exclusive: number;
    vat: number;
    inclusive: number;
    rate: number;
  } {
    const vatInfo = this.getVATInfo(currency);
    const exclusive = amount;
    const vat = amount * vatInfo.rate;
    const inclusive = exclusive + vat;

    return {
      exclusive,
      vat,
      inclusive,
      rate: vatInfo.rate,
    };
  }

  // Format business amount with VAT breakdown
  formatBusinessAmount(
    amount: number,
    currency?: string,
    includeVAT: boolean = true
  ): {
    exclusive: string;
    vat: string;
    inclusive: string;
    formatted: string;
  } {
    const calculation = this.calculateVAT(amount, currency);
    const targetCurrency = currency || this.config.primary;

    return {
      exclusive: this.formatCurrency(calculation.exclusive, targetCurrency, { includeVAT: false }),
      vat: this.formatCurrency(calculation.vat, targetCurrency, { includeVAT: false }),
      inclusive: this.formatCurrency(calculation.inclusive, targetCurrency, { includeVAT: false }),
      formatted: this.formatCurrency(calculation.inclusive, targetCurrency, {
        includeVAT: false,
        showVATBreakdown: includeVAT,
      }),
    };
  }

  // Export configuration for storage
  exportConfig(): CurrencySettings {
    return {
      config: this.config,
      exchangeRates: Array.from(this.exchangeRates.values()),
      autoUpdateRates: true,
      rateUpdateInterval: 24,
      fallbackRates: Object.fromEntries(this.exchangeRates),
    };
  }

  // Import configuration from storage
  importConfig(settings: CurrencySettings): void {
    this.config = settings.config;
    this.exchangeRates.clear();

    settings.exchangeRates.forEach(rate => {
      const key = `${rate.from}_${rate.to}`;
      this.exchangeRates.set(key, rate);
    });
  }
}

// Singleton instance for the application
export const currencyManager = new CurrencyManager();

// Convenience functions for common operations
export const formatZAR = (
  amount: number,
  options?: { includeVAT?: boolean; showVATBreakdown?: boolean }
) => currencyManager.formatCurrency(amount, 'ZAR', options);

export const formatAppCurrency = (
  amount: number,
  options?: { includeVAT?: boolean; showVATBreakdown?: boolean }
) => currencyManager.formatCurrency(amount, undefined, options);

export const calculateSAVAT = (amount: number) => currencyManager.calculateVAT(amount, 'ZAR');

export const formatBusinessZAR = (amount: number, includeVAT?: boolean) =>
  currencyManager.formatBusinessAmount(amount, 'ZAR', includeVAT);

// React hook for currency configuration
export const useCurrencyConfig = () => {
  return {
    config: currencyManager.getConfig(),
    updateConfig: (updates: Partial<CurrencyConfig>) => currencyManager.updateConfig(updates),
    formatCurrency: currencyManager.formatCurrency.bind(currencyManager),
    convertCurrency: currencyManager.convertCurrency.bind(currencyManager),
    getSupportedCurrencies: currencyManager.getSupportedCurrencies.bind(currencyManager),
    getVATInfo: currencyManager.getVATInfo.bind(currencyManager),
    calculateVAT: currencyManager.calculateVAT.bind(currencyManager),
    formatBusinessAmount: currencyManager.formatBusinessAmount.bind(currencyManager),
  };
};
