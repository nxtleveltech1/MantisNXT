import {
  MappedProductData,
  ValidationError,
  ValidationWarning,
  ImportConfiguration,
  ValidationResponse
} from '@/types/pricelist-upload';

export class DataValidator {

  /**
   * Validate processed price list data
   */
  static validatePriceListData(
    mappedData: MappedProductData[],
    config: ImportConfiguration
  ): ValidationResponse {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const processedSKUs = new Set<string>();
    const processedSupplierParts = new Set<string>();

    mappedData.forEach((row, index) => {
      const rowIndex = index + 1;

      // Validate required fields
      this.validateRequiredFields(row, rowIndex, config, errors);

      // Validate data formats
      this.validateDataFormats(row, rowIndex, errors, warnings);

      // Validate business rules
      this.validateBusinessRules(row, rowIndex, config, errors, warnings);

      // Check for duplicates
      this.checkDuplicates(row, rowIndex, processedSKUs, processedSupplierParts, errors, warnings);

      // Add to processed sets
      if (row.sku) processedSKUs.add(row.sku);
      if (row.supplierPartNumber) processedSupplierParts.add(row.supplierPartNumber);
    });

    // Generate summary
    const validRows = mappedData.length - errors.filter(e => e.severity === 'error').length;
    const invalidRows = errors.filter(e => e.severity === 'error').length;
    const warningRows = warnings.length;

    const recommendations = this.generateRecommendations(errors, warnings, mappedData, config);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRows: mappedData.length,
        validRows,
        invalidRows,
        warningRows
      },
      recommendations
    };
  }

  /**
   * Validate required fields based on configuration
   */
  private static validateRequiredFields(
    row: MappedProductData,
    rowIndex: number,
    config: ImportConfiguration,
    errors: ValidationError[]
  ) {
    // SKU validation
    if (config.options.requireSKU && !row.sku?.trim()) {
      errors.push({
        rowIndex,
        field: 'sku',
        value: row.sku,
        errorType: 'missing_required',
        message: 'SKU is required but missing or empty',
        severity: 'error'
      });
    }

    // Price validation
    if (config.options.requirePrice) {
      const priceField = config.options.priceColumn;
      const priceValue = row[priceField];

      if (priceValue === undefined || priceValue === null || priceValue <= 0) {
        errors.push({
          rowIndex,
          field: priceField,
          value: priceValue,
          errorType: 'missing_required',
          message: `${priceField} is required but missing or invalid`,
          severity: 'error'
        });
      }
    }

    // Product name validation
    if (!row.productName?.trim()) {
      errors.push({
        rowIndex,
        field: 'productName',
        value: row.productName,
        errorType: 'missing_required',
        message: 'Product name is required but missing or empty',
        severity: 'error'
      });
    }

    // Supplier part number validation
    if (!row.supplierPartNumber?.trim()) {
      errors.push({
        rowIndex,
        field: 'supplierPartNumber',
        value: row.supplierPartNumber,
        errorType: 'missing_required',
        message: 'Supplier part number is required but missing or empty',
        severity: 'error'
      });
    }
  }

  /**
   * Validate data formats and types
   */
  private static validateDataFormats(
    row: MappedProductData,
    rowIndex: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    // SKU format validation
    if (row.sku) {
      if (!/^[A-Za-z0-9\-_]+$/.test(row.sku)) {
        warnings.push({
          rowIndex,
          field: 'sku',
          value: row.sku,
          warningType: 'format_suggestion',
          message: 'SKU contains special characters - consider using only alphanumeric, hyphens, and underscores',
          severity: 'warning',
          suggestion: row.sku.replace(/[^A-Za-z0-9\-_]/g, '-')
        });
      }

      if (row.sku.length > 50) {
        errors.push({
          rowIndex,
          field: 'sku',
          value: row.sku,
          errorType: 'constraint_violation',
          message: 'SKU exceeds maximum length of 50 characters',
          severity: 'error'
        });
      }
    }

    // Price validation
    this.validatePriceFields(row, rowIndex, errors, warnings);

    // Currency validation
    if (row.currency) {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'ZAR', 'AUD', 'CAD', 'JPY'];
      if (!validCurrencies.includes(row.currency.toUpperCase())) {
        warnings.push({
          rowIndex,
          field: 'currency',
          value: row.currency,
          warningType: 'unusual_value',
          message: `Currency "${row.currency}" is not commonly supported`,
          severity: 'warning',
          suggestion: 'Consider using USD, EUR, GBP, ZAR, AUD, CAD, or JPY'
        });
      }
    }

    // Weight validation
    if (row.weight !== undefined) {
      if (row.weight <= 0) {
        errors.push({
          rowIndex,
          field: 'weight',
          value: row.weight,
          errorType: 'invalid_value',
          message: 'Weight must be greater than zero',
          severity: 'error'
        });
      }
    }

    // Minimum order quantity validation
    if (row.minimumOrderQuantity !== undefined) {
      if (row.minimumOrderQuantity <= 0 || !Number.isInteger(row.minimumOrderQuantity)) {
        errors.push({
          rowIndex,
          field: 'minimumOrderQuantity',
          value: row.minimumOrderQuantity,
          errorType: 'invalid_value',
          message: 'Minimum order quantity must be a positive integer',
          severity: 'error'
        });
      }
    }

    // Lead time validation
    if (row.leadTime !== undefined) {
      if (row.leadTime < 0 || !Number.isInteger(row.leadTime)) {
        errors.push({
          rowIndex,
          field: 'leadTime',
          value: row.leadTime,
          errorType: 'invalid_value',
          message: 'Lead time must be a non-negative integer (days)',
          severity: 'error'
        });
      }
    }

    // Barcode validation
    if (row.barcode) {
      // Basic barcode format validation
      if (!/^\d{8,14}$/.test(row.barcode.replace(/[^0-9]/g, ''))) {
        warnings.push({
          rowIndex,
          field: 'barcode',
          value: row.barcode,
          warningType: 'format_suggestion',
          message: 'Barcode should be 8-14 digits',
          severity: 'warning'
        });
      }
    }

    // Dimensions validation
    if (row.dimensions) {
      const { length, width, height, unit } = row.dimensions;
      if (length !== undefined && (length <= 0 || isNaN(length))) {
        errors.push({
          rowIndex,
          field: 'dimensions.length',
          value: length,
          errorType: 'invalid_value',
          message: 'Length must be a positive number',
          severity: 'error'
        });
      }
      if (width !== undefined && (width <= 0 || isNaN(width))) {
        errors.push({
          rowIndex,
          field: 'dimensions.width',
          value: width,
          errorType: 'invalid_value',
          message: 'Width must be a positive number',
          severity: 'error'
        });
      }
      if (height !== undefined && (height <= 0 || isNaN(height))) {
        errors.push({
          rowIndex,
          field: 'dimensions.height',
          value: height,
          errorType: 'invalid_value',
          message: 'Height must be a positive number',
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validate price fields
   */
  private static validatePriceFields(
    row: MappedProductData,
    rowIndex: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    const priceFields = ['unitPrice', 'listPrice', 'wholesalePrice', 'retailPrice'] as const;

    priceFields.forEach(field => {
      const price = row[field];
      if (price !== undefined) {
        if (price <= 0 || isNaN(price)) {
          errors.push({
            rowIndex,
            field,
            value: price,
            errorType: 'invalid_value',
            message: `${field} must be a positive number`,
            severity: 'error'
          });
        } else if (price > 1000000) {
          warnings.push({
            rowIndex,
            field,
            value: price,
            warningType: 'unusual_value',
            message: `${field} seems unusually high (${price})`,
            severity: 'warning'
          });
        } else if (price < 0.01) {
          warnings.push({
            rowIndex,
            field,
            value: price,
            warningType: 'unusual_value',
            message: `${field} seems unusually low (${price})`,
            severity: 'warning'
          });
        }
      }
    });

    // Cross-field price validation
    if (row.unitPrice && row.listPrice && row.unitPrice > row.listPrice) {
      warnings.push({
        rowIndex,
        field: 'unitPrice',
        value: row.unitPrice,
        warningType: 'unusual_value',
        message: 'Unit price is higher than list price',
        severity: 'warning'
      });
    }

    if (row.wholesalePrice && row.retailPrice && row.wholesalePrice > row.retailPrice) {
      warnings.push({
        rowIndex,
        field: 'wholesalePrice',
        value: row.wholesalePrice,
        warningType: 'unusual_value',
        message: 'Wholesale price is higher than retail price',
        severity: 'warning'
      });
    }
  }

  /**
   * Validate business rules
   */
  private static validateBusinessRules(
    row: MappedProductData,
    rowIndex: number,
    config: ImportConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    // Status validation
    if (row.status && !['active', 'inactive', 'discontinued'].includes(row.status)) {
      errors.push({
        rowIndex,
        field: 'status',
        value: row.status,
        errorType: 'invalid_value',
        message: 'Status must be one of: active, inactive, discontinued',
        severity: 'error'
      });
    }

    // Availability validation
    if (row.availability && !['available', 'limited', 'discontinued', 'seasonal'].includes(row.availability)) {
      errors.push({
        rowIndex,
        field: 'availability',
        value: row.availability,
        errorType: 'invalid_value',
        message: 'Availability must be one of: available, limited, discontinued, seasonal',
        severity: 'error'
      });
    }

    // Unit validation
    if (row.unit) {
      const validUnits = ['each', 'box', 'case', 'pack', 'kg', 'lb', 'liter', 'gallon', 'meter', 'foot'];
      if (!validUnits.includes(row.unit.toLowerCase())) {
        warnings.push({
          rowIndex,
          field: 'unit',
          value: row.unit,
          warningType: 'unusual_value',
          message: `Unit "${row.unit}" is not in common units list`,
          severity: 'warning',
          suggestion: 'Consider using: each, box, case, pack, kg, lb, liter, gallon, meter, foot'
        });
      }
    }

    // Product name length
    if (row.productName && row.productName.length > 200) {
      errors.push({
        rowIndex,
        field: 'productName',
        value: row.productName,
        errorType: 'constraint_violation',
        message: 'Product name exceeds maximum length of 200 characters',
        severity: 'error'
      });
    }

    // Category validation
    if (row.category && row.category.length < 2) {
      warnings.push({
        rowIndex,
        field: 'category',
        value: row.category,
        warningType: 'unusual_value',
        message: 'Category name seems too short',
        severity: 'warning'
      });
    }
  }

  /**
   * Check for duplicate values
   */
  private static checkDuplicates(
    row: MappedProductData,
    rowIndex: number,
    processedSKUs: Set<string>,
    processedSupplierParts: Set<string>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ) {
    // Check SKU duplicates
    if (row.sku && processedSKUs.has(row.sku)) {
      errors.push({
        rowIndex,
        field: 'sku',
        value: row.sku,
        errorType: 'duplicate',
        message: `SKU "${row.sku}" is duplicated in the file`,
        severity: 'error'
      });
    }

    // Check supplier part number duplicates
    if (row.supplierPartNumber && processedSupplierParts.has(row.supplierPartNumber)) {
      warnings.push({
        rowIndex,
        field: 'supplierPartNumber',
        value: row.supplierPartNumber,
        warningType: 'duplicate_suggestion',
        message: `Supplier part number "${row.supplierPartNumber}" is duplicated in the file`,
        severity: 'warning'
      });
    }
  }

  /**
   * Generate recommendations based on validation results
   */
  private static generateRecommendations(
    errors: ValidationError[],
    warnings: ValidationWarning[],
    data: MappedProductData[],
    config: ImportConfiguration
  ): string[] {
    const recommendations: string[] = [];

    // Error-based recommendations
    const errorTypes = errors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (errorTypes.missing_required > 0) {
      recommendations.push(`Fix ${errorTypes.missing_required} missing required field(s) before importing`);
    }

    if (errorTypes.invalid_format > 0) {
      recommendations.push(`Correct ${errorTypes.invalid_format} invalid format(s) to ensure data quality`);
    }

    if (errorTypes.duplicate > 0) {
      recommendations.push(`Remove or resolve ${errorTypes.duplicate} duplicate record(s)`);
    }

    // Warning-based recommendations
    if (warnings.length > 0) {
      recommendations.push(`Review ${warnings.length} warning(s) for potential data quality improvements`);
    }

    // Data quality recommendations
    const rowsWithoutCategory = data.filter(row => !row.category).length;
    if (rowsWithoutCategory > data.length * 0.5) {
      recommendations.push('Consider adding category information for better product organization');
    }

    const rowsWithoutDescription = data.filter(row => !row.description).length;
    if (rowsWithoutDescription > data.length * 0.7) {
      recommendations.push('Adding product descriptions will improve searchability and user experience');
    }

    // Currency consistency
    const currencies = new Set(data.map(row => row.currency).filter(Boolean));
    if (currencies.size > 1) {
      recommendations.push(`Multiple currencies detected (${Array.from(currencies).join(', ')}) - ensure consistency`);
    }

    // Price completeness
    const rowsWithAllPrices = data.filter(row =>
      row.unitPrice && row.listPrice && row.wholesalePrice
    ).length;
    if (rowsWithAllPrices < data.length * 0.3) {
      recommendations.push('Consider providing multiple price points (unit, list, wholesale) for better flexibility');
    }

    return recommendations;
  }
}

/**
 * Utility functions for data cleaning and transformation
 */
export class DataCleaner {

  /**
   * Clean and normalize text fields
   */
  static cleanTextField(value: any): string | undefined {
    if (!value || typeof value !== 'string') return undefined;

    return value
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[\r\n\t]/g, ' ') // Replace line breaks and tabs with spaces
      .trim();
  }

  /**
   * Parse numeric values from strings
   */
  static parseNumeric(value: any): number | undefined {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (!value || typeof value !== 'string') return undefined;

    // Remove currency symbols and formatting
    const cleaned = value
      .replace(/[$€£¥₹]/g, '')
      .replace(/,/g, '')
      .trim();

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Normalize currency codes
   */
  static normalizeCurrency(value: any): string | undefined {
    if (!value || typeof value !== 'string') return undefined;

    const normalized = value.toUpperCase().trim();

    // Handle common variations
    const currencyMap: Record<string, string> = {
      'DOLLAR': 'USD',
      'DOLLARS': 'USD',
      'US': 'USD',
      'EURO': 'EUR',
      'EUROS': 'EUR',
      'POUND': 'GBP',
      'POUNDS': 'GBP',
      'RAND': 'ZAR',
      'R': 'ZAR'
    };

    return currencyMap[normalized] || normalized;
  }

  /**
   * Clean and validate SKU
   */
  static cleanSKU(value: any): string | undefined {
    if (!value || typeof value !== 'string') return undefined;

    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\-_]/g, '-') // Replace invalid chars with dash
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
  }
}