// @ts-nocheck

/**
 * COMPREHENSIVE PRICE LIST DATA VALIDATION FRAMEWORK
 *
 * This framework provides robust validation for supplier price list data
 * Handles validation for 761,991+ product records from 28 suppliers
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  qualityScore: number;
  stats: ValidationStats;
}

export interface ValidationError {
  type: string;
  field: string;
  value: unknown;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rowIndex?: number;
  suggestions?: string[];
}

export interface ValidationWarning {
  type: string;
  field: string;
  value: unknown;
  message: string;
  suggestions?: string[];
}

export interface ValidationStats {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warningRecords: number;
  duplicateRecords: number;
  missingRequiredFields: number;
  priceValidationErrors: number;
  skuValidationErrors: number;
}

export interface ProductRecord {
  sku?: string;
  supplierSku?: string;
  name?: string;
  description?: string;
  brand?: string;
  category?: string;
  costPrice?: number | string;
  retailPrice?: number | string;
  wholesalePrice?: number | string;
  currency?: string;
  stockStatus?: string;
  weight?: number | string;
  dimensions?: string;
  barcode?: string;
  supplierName?: string;
  sourceSheet?: string;
  sourceRow?: number;
}

export interface ValidationConfig {
  requireSku: boolean;
  requireName: boolean;
  requirePrice: boolean;
  minPrice: number;
  maxPrice: number;
  allowedCurrencies: string[];
  skuPattern?: RegExp;
  autoGenerateSku: boolean;
  duplicateHandling: 'error' | 'warning' | 'ignore';
  priceMultiplier: number;
  defaultCurrency: string;
}

export class PriceListValidator {
  private config: ValidationConfig;
  private skuRegistry: Set<string> = new Set();
  private duplicateRegistry: Map<string, ProductRecord[]> = new Map();

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      requireSku: true,
      requireName: true,
      requirePrice: true,
      minPrice: 0.01,
      maxPrice: 1000000,
      allowedCurrencies: ['ZAR', 'USD', 'EUR', 'GBP'],
      autoGenerateSku: false,
      duplicateHandling: 'warning',
      priceMultiplier: 1.0,
      defaultCurrency: 'ZAR',
      ...config,
    };
  }

  /**
   * Validate a complete price list dataset
   */
  public async validatePriceList(
    records: ProductRecord[],
    supplierName: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let validRecords = 0;
    let invalidRecords = 0;
    let warningRecords = 0;
    let duplicateRecords = 0;
    let missingRequiredFields = 0;
    let priceValidationErrors = 0;
    let skuValidationErrors = 0;

    // Reset registries
    this.skuRegistry.clear();
    this.duplicateRegistry.clear();

    for (let index = 0; index < records.length; index++) {
      const record = records[index];
      const recordErrors: ValidationError[] = [];
      const recordWarnings: ValidationWarning[] = [];

      // Validate individual record
      const recordValidation = this.validateRecord(record, index, supplierName);
      recordErrors.push(...recordValidation.errors);
      recordWarnings.push(...recordValidation.warnings);

      // Track statistics
      if (recordValidation.errors.length > 0) {
        invalidRecords++;

        recordValidation.errors.forEach(error => {
          if (error.type.includes('required')) missingRequiredFields++;
          if (error.type.includes('price')) priceValidationErrors++;
          if (error.type.includes('sku')) skuValidationErrors++;
        });
      } else {
        validRecords++;
      }

      if (recordValidation.warnings.length > 0) {
        warningRecords++;
      }

      errors.push(...recordErrors);
      warnings.push(...recordWarnings);
    }

    // Check for duplicates across the entire dataset
    const duplicateValidation = this.validateDuplicates();
    errors.push(...duplicateValidation.errors);
    warnings.push(...duplicateValidation.warnings);
    duplicateRecords = duplicateValidation.duplicateCount;

    const qualityScore = this.calculateQualityScore(
      validRecords,
      records.length,
      errors.length,
      warnings.length
    );

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      qualityScore,
      stats: {
        totalRecords: records.length,
        validRecords,
        invalidRecords,
        warningRecords,
        duplicateRecords,
        missingRequiredFields,
        priceValidationErrors,
        skuValidationErrors,
      },
    };
  }

  /**
   * Validate individual product record
   */
  private validateRecord(
    record: ProductRecord,
    rowIndex: number,
    supplierName: string
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // SKU Validation
    const skuValidation = this.validateSku(record, rowIndex);
    errors.push(...skuValidation.errors);
    warnings.push(...skuValidation.warnings);

    // Name Validation
    const nameValidation = this.validateName(record, rowIndex);
    errors.push(...nameValidation.errors);
    warnings.push(...nameValidation.warnings);

    // Price Validation
    const priceValidation = this.validatePrices(record, rowIndex);
    errors.push(...priceValidation.errors);
    warnings.push(...priceValidation.warnings);

    // Currency Validation
    const currencyValidation = this.validateCurrency(record, rowIndex);
    errors.push(...currencyValidation.errors);
    warnings.push(...currencyValidation.warnings);

    // Brand & Category Validation
    const brandCategoryValidation = this.validateBrandAndCategory(record, rowIndex);
    warnings.push(...brandCategoryValidation.warnings);

    // Description Validation
    const descriptionValidation = this.validateDescription(record, rowIndex);
    warnings.push(...descriptionValidation.warnings);

    // Barcode Validation
    const barcodeValidation = this.validateBarcode(record, rowIndex);
    warnings.push(...barcodeValidation.warnings);

    return { errors, warnings };
  }

  /**
   * SKU Validation
   */
  private validateSku(record: ProductRecord, rowIndex: number) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!record.sku || record.sku.toString().trim() === '') {
      if (this.config.requireSku) {
        if (this.config.autoGenerateSku) {
          warnings.push({
            type: 'sku_missing_auto_generated',
            field: 'sku',
            value: record.sku,
            message: 'SKU missing, will be auto-generated',
            suggestions: ['SKU will be generated based on supplier name and row index'],
          });
        } else {
          errors.push({
            type: 'sku_required',
            field: 'sku',
            value: record.sku,
            message: 'SKU is required',
            severity: 'error',
            rowIndex,
            suggestions: ['Provide a unique product SKU', 'Enable auto-generation of SKUs'],
          });
        }
      }
    } else {
      const sku = record.sku.toString().trim();

      // SKU format validation
      if (this.config.skuPattern && !this.config.skuPattern.test(sku)) {
        errors.push({
          type: 'sku_invalid_format',
          field: 'sku',
          value: sku,
          message: `SKU format invalid: ${sku}`,
          severity: 'error',
          rowIndex,
          suggestions: ['Ensure SKU matches the required pattern'],
        });
      }

      // SKU length validation
      if (sku.length > 100) {
        warnings.push({
          type: 'sku_too_long',
          field: 'sku',
          value: sku,
          message: 'SKU exceeds 100 characters, will be truncated',
          suggestions: ['Shorten SKU to under 100 characters'],
        });
      }

      // Track for duplicate detection
      if (this.skuRegistry.has(sku)) {
        const existing = this.duplicateRegistry.get(sku) || [];
        existing.push(record);
        this.duplicateRegistry.set(sku, existing);
      } else {
        this.skuRegistry.add(sku);
        this.duplicateRegistry.set(sku, [record]);
      }
    }

    return { errors, warnings };
  }

  /**
   * Product Name Validation
   */
  private validateName(record: ProductRecord, rowIndex: number) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!record.name || record.name.toString().trim() === '') {
      if (this.config.requireName) {
        errors.push({
          type: 'name_required',
          field: 'name',
          value: record.name,
          message: 'Product name is required',
          severity: 'error',
          rowIndex,
          suggestions: ['Provide a descriptive product name'],
        });
      }
    } else {
      const name = record.name.toString().trim();

      if (name.length < 3) {
        warnings.push({
          type: 'name_too_short',
          field: 'name',
          value: name,
          message: 'Product name is very short',
          suggestions: ['Provide a more descriptive product name'],
        });
      }

      if (name.length > 500) {
        warnings.push({
          type: 'name_too_long',
          field: 'name',
          value: name,
          message: 'Product name exceeds 500 characters, will be truncated',
          suggestions: ['Shorten product name to under 500 characters'],
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Price Validation
   */
  private validatePrices(record: ProductRecord, rowIndex: number) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const prices = {
      costPrice: this.parsePrice(record.costPrice),
      retailPrice: this.parsePrice(record.retailPrice),
      wholesalePrice: this.parsePrice(record.wholesalePrice),
    };

    // Cost price validation (required)
    if (prices.costPrice === null || prices.costPrice === undefined) {
      if (this.config.requirePrice) {
        errors.push({
          type: 'cost_price_required',
          field: 'costPrice',
          value: record.costPrice,
          message: 'Cost price is required',
          severity: 'error',
          rowIndex,
          suggestions: ['Provide a valid numeric cost price'],
        });
      }
    } else {
      // Apply price multiplier
      const adjustedPrice = prices.costPrice * this.config.priceMultiplier;

      if (adjustedPrice < this.config.minPrice) {
        errors.push({
          type: 'cost_price_too_low',
          field: 'costPrice',
          value: prices.costPrice,
          message: `Cost price ${adjustedPrice} is below minimum ${this.config.minPrice}`,
          severity: 'error',
          rowIndex,
          suggestions: [`Set cost price above ${this.config.minPrice}`],
        });
      }

      if (adjustedPrice > this.config.maxPrice) {
        warnings.push({
          type: 'cost_price_very_high',
          field: 'costPrice',
          value: adjustedPrice,
          message: `Cost price ${adjustedPrice} is unusually high`,
          suggestions: ['Verify the cost price is correct'],
        });
      }
    }

    // Retail price validation
    if (prices.retailPrice !== null && prices.retailPrice !== undefined) {
      if (prices.costPrice !== null && prices.retailPrice < prices.costPrice) {
        warnings.push({
          type: 'retail_price_below_cost',
          field: 'retailPrice',
          value: prices.retailPrice,
          message: 'Retail price is below cost price',
          suggestions: ['Review pricing to ensure profitability'],
        });
      }
    }

    // Wholesale price validation
    if (prices.wholesalePrice !== null && prices.wholesalePrice !== undefined) {
      if (prices.costPrice !== null && prices.wholesalePrice < prices.costPrice) {
        warnings.push({
          type: 'wholesale_price_below_cost',
          field: 'wholesalePrice',
          value: prices.wholesalePrice,
          message: 'Wholesale price is below cost price',
          suggestions: ['Review pricing to ensure profitability'],
        });
      }

      if (prices.retailPrice !== null && prices.wholesalePrice > prices.retailPrice) {
        warnings.push({
          type: 'wholesale_price_above_retail',
          field: 'wholesalePrice',
          value: prices.wholesalePrice,
          message: 'Wholesale price is above retail price',
          suggestions: ['Review pricing structure'],
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Currency Validation
   */
  private validateCurrency(record: ProductRecord, rowIndex: number) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const currency = record.currency || this.config.defaultCurrency;

    if (!this.config.allowedCurrencies.includes(currency)) {
      warnings.push({
        type: 'currency_not_supported',
        field: 'currency',
        value: currency,
        message: `Currency ${currency} not in allowed list, defaulting to ${this.config.defaultCurrency}`,
        suggestions: [`Use one of: ${this.config.allowedCurrencies.join(', ')}`],
      });
    }

    return { errors, warnings };
  }

  /**
   * Brand and Category Validation
   */
  private validateBrandAndCategory(record: ProductRecord, rowIndex: number) {
    const warnings: ValidationWarning[] = [];

    if (!record.brand || record.brand.toString().trim() === '') {
      warnings.push({
        type: 'brand_missing',
        field: 'brand',
        value: record.brand,
        message: 'Brand information missing',
        suggestions: ['Provide brand information for better categorization'],
      });
    }

    if (!record.category || record.category.toString().trim() === '') {
      warnings.push({
        type: 'category_missing',
        field: 'category',
        value: record.category,
        message: 'Category information missing',
        suggestions: ['Provide category information for better organization'],
      });
    }

    return { warnings };
  }

  /**
   * Description Validation
   */
  private validateDescription(record: ProductRecord, rowIndex: number) {
    const warnings: ValidationWarning[] = [];

    if (!record.description || record.description.toString().trim() === '') {
      warnings.push({
        type: 'description_missing',
        field: 'description',
        value: record.description,
        message: 'Product description missing',
        suggestions: ['Add product description for better searchability'],
      });
    } else if (record.description.toString().length < 10) {
      warnings.push({
        type: 'description_too_short',
        field: 'description',
        value: record.description,
        message: 'Product description is very brief',
        suggestions: ['Provide more detailed product description'],
      });
    }

    return { warnings };
  }

  /**
   * Barcode Validation
   */
  private validateBarcode(record: ProductRecord, rowIndex: number) {
    const warnings: ValidationWarning[] = [];

    if (record.barcode) {
      const barcode = record.barcode.toString().trim();

      // Basic barcode format validation
      if (!/^\d+$/.test(barcode)) {
        warnings.push({
          type: 'barcode_invalid_format',
          field: 'barcode',
          value: barcode,
          message: 'Barcode should contain only numbers',
          suggestions: ['Verify barcode format'],
        });
      }

      // UPC/EAN length validation
      if (![8, 12, 13, 14].includes(barcode.length)) {
        warnings.push({
          type: 'barcode_invalid_length',
          field: 'barcode',
          value: barcode,
          message: 'Barcode length should be 8, 12, 13, or 14 digits',
          suggestions: ['Verify barcode is complete'],
        });
      }
    }

    return { warnings };
  }

  /**
   * Validate duplicates across the dataset
   */
  private validateDuplicates() {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let duplicateCount = 0;

    this.duplicateRegistry.forEach((records, sku) => {
      if (records.length > 1) {
        duplicateCount += records.length - 1;

        const message = `Duplicate SKU found: ${sku} (${records.length} occurrences)`;
        const duplicateInfo = records.map(
          (r, i) => `Row ${r.sourceRow || i}: ${r.name || 'No name'}`
        );

        if (this.config.duplicateHandling === 'error') {
          errors.push({
            type: 'duplicate_sku',
            field: 'sku',
            value: sku,
            message,
            severity: 'error',
            suggestions: [
              'Make SKUs unique across all records',
              'Consider adding supplier prefix to SKUs',
              ...duplicateInfo,
            ],
          });
        } else if (this.config.duplicateHandling === 'warning') {
          warnings.push({
            type: 'duplicate_sku',
            field: 'sku',
            value: sku,
            message,
            suggestions: [
              'Review duplicate records - only the first will be imported',
              ...duplicateInfo,
            ],
          });
        }
      }
    });

    return { errors, warnings, duplicateCount };
  }

  /**
   * Parse price from string or number
   */
  private parsePrice(price: unknown): number | null {
    if (price === null || price === undefined || price === '') {
      return null;
    }

    if (typeof price === 'number') {
      return isNaN(price) ? null : price;
    }

    if (typeof price === 'string') {
      // Remove currency symbols and spaces
      const cleanPrice = price.replace(/[^\d.,]/g, '');
      const parsed = parseFloat(cleanPrice.replace(',', '.'));
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  /**
   * Calculate overall quality score (0-100)
   */
  private calculateQualityScore(
    validRecords: number,
    totalRecords: number,
    errorCount: number,
    warningCount: number
  ): number {
    if (totalRecords === 0) return 0;

    const validityScore = (validRecords / totalRecords) * 60;
    const errorPenalty = Math.min((errorCount / totalRecords) * 30, 30);
    const warningPenalty = Math.min((warningCount / totalRecords) * 10, 10);

    const score = Math.max(0, validityScore - errorPenalty - warningPenalty);
    return Math.round(score);
  }

  /**
   * Generate validation report
   */
  public generateValidationReport(result: ValidationResult, supplierName: string): string {
    const { stats, errors, warnings, qualityScore } = result;

    let report = `# Price List Validation Report: ${supplierName}\n\n`;
    report += `**Analysis Date:** ${new Date().toISOString()}\n`;
    report += `**Quality Score:** ${qualityScore}/100\n\n`;

    report += `## Summary Statistics\n`;
    report += `- **Total Records:** ${stats.totalRecords.toLocaleString()}\n`;
    report += `- **Valid Records:** ${stats.validRecords.toLocaleString()} (${Math.round((stats.validRecords / stats.totalRecords) * 100)}%)\n`;
    report += `- **Invalid Records:** ${stats.invalidRecords.toLocaleString()} (${Math.round((stats.invalidRecords / stats.totalRecords) * 100)}%)\n`;
    report += `- **Records with Warnings:** ${stats.warningRecords.toLocaleString()}\n`;
    report += `- **Duplicate Records:** ${stats.duplicateRecords.toLocaleString()}\n\n`;

    if (errors.length > 0) {
      report += `## Validation Errors (${errors.length})\n`;
      const errorGroups = this.groupErrorsByType(errors);
      Object.entries(errorGroups).forEach(([type, typeErrors]) => {
        report += `\n### ${type.replace(/_/g, ' ').toUpperCase()} (${typeErrors.length})\n`;
        typeErrors.slice(0, 10).forEach(error => {
          report += `- Row ${error.rowIndex}: ${error.message}\n`;
        });
        if (typeErrors.length > 10) {
          report += `- ... and ${typeErrors.length - 10} more similar errors\n`;
        }
      });
    }

    if (warnings.length > 0) {
      report += `\n## Validation Warnings (${warnings.length})\n`;
      const warningGroups = this.groupWarningsByType(warnings);
      Object.entries(warningGroups).forEach(([type, typeWarnings]) => {
        report += `\n### ${type.replace(/_/g, ' ').toUpperCase()} (${typeWarnings.length})\n`;
        if (typeWarnings.length <= 5) {
          typeWarnings.forEach(warning => {
            report += `- ${warning.message}\n`;
          });
        } else {
          report += `- ${typeWarnings.length} records affected\n`;
          report += `- Example: ${typeWarnings[0].message}\n`;
        }
      });
    }

    report += `\n## Recommendations\n`;
    if (qualityScore >= 80) {
      report += `✅ **Excellent quality** - Ready for import with minimal cleanup\n`;
    } else if (qualityScore >= 60) {
      report += `⚠️ **Good quality** - Minor issues to address before import\n`;
    } else if (qualityScore >= 40) {
      report += `⚠️ **Fair quality** - Several issues need attention\n`;
    } else {
      report += `❌ **Poor quality** - Significant cleanup required before import\n`;
    }

    return report;
  }

  private groupErrorsByType(errors: ValidationError[]) {
    return errors.reduce(
      (groups, error) => {
        if (!groups[error.type]) groups[error.type] = [];
        groups[error.type].push(error);
        return groups;
      },
      {} as Record<string, ValidationError[]>
    );
  }

  private groupWarningsByType(warnings: ValidationWarning[]) {
    return warnings.reduce(
      (groups, warning) => {
        if (!groups[warning.type]) groups[warning.type] = [];
        groups[warning.type].push(warning);
        return groups;
      },
      {} as Record<string, ValidationWarning[]>
    );
  }
}
