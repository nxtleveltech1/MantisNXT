import {
  MappedProductData,
  ImportConfiguration,
  PriceListRowExtended,
  ValidationError,
  ValidationWarning
} from '@/types/pricelist-upload';
import { DataCleaner } from './validator';

export class DataTransformer {

  /**
   * Transform raw data rows to mapped product data
   */
  static transformData(
    rawData: Record<string, any>[],
    config: ImportConfiguration
  ): PriceListRowExtended[] {
    return rawData.map((row, index) => {
      const mappedData = this.mapRowData(row, config);
      const transformedData = this.applyTransformRules(mappedData, config.transformRules);

      return {
        rowIndex: index + 1,
        originalData: row,
        mappedData: transformedData,
        validationStatus: 'valid', // Will be updated during validation
        validationErrors: [],
        validationWarnings: []
      };
    });
  }

  /**
   * Map raw row data to structured product data using column mapping
   */
  private static mapRowData(
    row: Record<string, any>,
    config: ImportConfiguration
  ): MappedProductData {
    const { columnMapping } = config;
    const mapped: MappedProductData = {};

    // Map basic fields
    if (columnMapping.sku && row[columnMapping.sku] !== undefined) {
      mapped.sku = DataCleaner.cleanSKU(row[columnMapping.sku]);
    }

    if (columnMapping.supplierPartNumber && row[columnMapping.supplierPartNumber] !== undefined) {
      mapped.supplierPartNumber = DataCleaner.cleanTextField(row[columnMapping.supplierPartNumber]);
    }

    if (columnMapping.productName && row[columnMapping.productName] !== undefined) {
      mapped.productName = DataCleaner.cleanTextField(row[columnMapping.productName]);
    }

    if (columnMapping.description && row[columnMapping.description] !== undefined) {
      mapped.description = DataCleaner.cleanTextField(row[columnMapping.description]);
    }

    if (columnMapping.category && row[columnMapping.category] !== undefined) {
      mapped.category = DataCleaner.cleanTextField(row[columnMapping.category]);
    }

    if (columnMapping.brand && row[columnMapping.brand] !== undefined) {
      mapped.brand = DataCleaner.cleanTextField(row[columnMapping.brand]);
    }

    // Map price fields
    const priceFields = [
      'unitPrice', 'listPrice', 'wholesalePrice', 'retailPrice'
    ] as const;

    priceFields.forEach(field => {
      if (columnMapping[field] && row[columnMapping[field]] !== undefined) {
        mapped[field] = DataCleaner.parseNumeric(row[columnMapping[field]]);
      }
    });

    // Map currency
    if (columnMapping.currency && row[columnMapping.currency] !== undefined) {
      mapped.currency = DataCleaner.normalizeCurrency(row[columnMapping.currency]);
    } else {
      mapped.currency = config.options.defaultCurrency;
    }

    // Map unit
    if (columnMapping.unit && row[columnMapping.unit] !== undefined) {
      mapped.unit = DataCleaner.cleanTextField(row[columnMapping.unit]);
    }

    // Map numeric fields
    if (columnMapping.minimumOrderQuantity && row[columnMapping.minimumOrderQuantity] !== undefined) {
      const value = DataCleaner.parseNumeric(row[columnMapping.minimumOrderQuantity]);
      if (value && Number.isInteger(value)) {
        mapped.minimumOrderQuantity = value;
      }
    }

    if (columnMapping.leadTime && row[columnMapping.leadTime] !== undefined) {
      const value = DataCleaner.parseNumeric(row[columnMapping.leadTime]);
      if (value && Number.isInteger(value)) {
        mapped.leadTime = value;
      }
    }

    if (columnMapping.weight && row[columnMapping.weight] !== undefined) {
      mapped.weight = DataCleaner.parseNumeric(row[columnMapping.weight]);
    }

    // Map availability
    if (columnMapping.availability && row[columnMapping.availability] !== undefined) {
      mapped.availability = this.normalizeAvailability(row[columnMapping.availability]);
    }

    // Map barcode
    if (columnMapping.barcode && row[columnMapping.barcode] !== undefined) {
      mapped.barcode = this.normalizeBarcode(row[columnMapping.barcode]);
    }

    // Map dimensions (assuming it's in a single field like "10x20x30 cm")
    if (columnMapping.dimensions && row[columnMapping.dimensions] !== undefined) {
      mapped.dimensions = this.parseDimensions(row[columnMapping.dimensions]);
    }

    // Set default status
    mapped.status = 'active';

    return mapped;
  }

  /**
   * Apply transformation rules to mapped data
   */
  private static applyTransformRules(
    data: MappedProductData,
    rules: ImportConfiguration['transformRules']
  ): MappedProductData {
    const transformed = { ...data };

    // Apply whitespace trimming (already done in DataCleaner)
    if (rules.trimWhitespace) {
      Object.keys(transformed).forEach(key => {
        const value = transformed[key as keyof MappedProductData];
        if (typeof value === 'string') {
          (transformed as any)[key] = value.trim();
        }
      });
    }

    // Apply uppercase transformation
    rules.convertToUpperCase.forEach(fieldName => {
      const value = transformed[fieldName as keyof MappedProductData];
      if (typeof value === 'string') {
        (transformed as any)[fieldName] = value.toUpperCase();
      }
    });

    // Apply lowercase transformation
    rules.convertToLowerCase.forEach(fieldName => {
      const value = transformed[fieldName as keyof MappedProductData];
      if (typeof value === 'string') {
        (transformed as any)[fieldName] = value.toLowerCase();
      }
    });

    // Remove special characters from specified fields
    rules.removeSpecialChars.forEach(fieldName => {
      const value = transformed[fieldName as keyof MappedProductData];
      if (typeof value === 'string') {
        (transformed as any)[fieldName] = value.replace(/[^a-zA-Z0-9\s\-_]/g, '');
      }
    });

    // Apply currency conversion
    if (rules.currencyConversion && transformed.currency === rules.currencyConversion.fromCurrency) {
      const rate = rules.currencyConversion.exchangeRate;

      if (transformed.unitPrice) transformed.unitPrice *= rate;
      if (transformed.listPrice) transformed.listPrice *= rate;
      if (transformed.wholesalePrice) transformed.wholesalePrice *= rate;
      if (transformed.retailPrice) transformed.retailPrice *= rate;

      transformed.currency = rules.currencyConversion.toCurrency;
    }

    return transformed;
  }

  /**
   * Normalize availability values
   */
  private static normalizeAvailability(value: any): string {
    if (!value || typeof value !== 'string') return 'available';

    const normalized = value.toLowerCase().trim();

    const availabilityMap: Record<string, string> = {
      'yes': 'available',
      'true': 'available',
      'in stock': 'available',
      'available': 'available',
      'active': 'available',
      'no': 'discontinued',
      'false': 'discontinued',
      'discontinued': 'discontinued',
      'inactive': 'discontinued',
      'limited': 'limited',
      'low stock': 'limited',
      'seasonal': 'seasonal'
    };

    return availabilityMap[normalized] || 'available';
  }

  /**
   * Normalize and validate barcode
   */
  private static normalizeBarcode(value: any): string | undefined {
    if (!value || typeof value !== 'string') return undefined;

    // Remove all non-numeric characters
    const cleaned = value.replace(/[^0-9]/g, '');

    // Return undefined if not a valid length
    if (cleaned.length < 8 || cleaned.length > 14) {
      return undefined;
    }

    return cleaned;
  }

  /**
   * Parse dimensions from various formats
   */
  private static parseDimensions(value: any): MappedProductData['dimensions'] | undefined {
    if (!value || typeof value !== 'string') return undefined;

    const cleaned = value.toLowerCase().replace(/[^0-9.,x× ]/g, '');

    // Try to match patterns like "10x20x30", "10 x 20 x 30", "10,20,30"
    const patterns = [
      /(\d+(?:\.\d+)?)[x×](\d+(?:\.\d+)?)[x×](\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        const [, length, width, height] = match;
        return {
          length: parseFloat(length),
          width: parseFloat(width),
          height: parseFloat(height),
          unit: this.detectDimensionUnit(value)
        };
      }
    }

    return undefined;
  }

  /**
   * Detect dimension unit from string
   */
  private static detectDimensionUnit(value: string): string {
    const lowerValue = value.toLowerCase();

    if (lowerValue.includes('cm') || lowerValue.includes('centimeter')) return 'cm';
    if (lowerValue.includes('mm') || lowerValue.includes('millimeter')) return 'mm';
    if (lowerValue.includes('m') && !lowerValue.includes('mm') && !lowerValue.includes('cm')) return 'm';
    if (lowerValue.includes('in') || lowerValue.includes('inch')) return 'in';
    if (lowerValue.includes('ft') || lowerValue.includes('feet') || lowerValue.includes('foot')) return 'ft';

    return 'cm'; // default
  }

  /**
   * Create smart column mapping suggestions based on data analysis
   */
  static suggestColumnMapping(
    sampleData: Record<string, any>[],
    headers: string[]
  ): ImportConfiguration['columnMapping'] {
    const mapping: ImportConfiguration['columnMapping'] = {};

    headers.forEach(header => {
      const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      const columnData = sampleData.map(row => row[header]).filter(val => val != null && val !== '');

      // SKU detection
      if (headerLower.includes('sku') || headerLower.includes('itemcode') || headerLower.includes('productcode')) {
        mapping.sku = header;
      }
      // Product name detection
      else if (headerLower.includes('name') || headerLower.includes('title') || headerLower.includes('product')) {
        mapping.productName = header;
      }
      // Price detection
      else if (headerLower.includes('price') || headerLower.includes('cost')) {
        if (headerLower.includes('unit')) {
          mapping.unitPrice = header;
        } else if (headerLower.includes('list')) {
          mapping.listPrice = header;
        } else if (headerLower.includes('wholesale')) {
          mapping.wholesalePrice = header;
        } else if (headerLower.includes('retail')) {
          mapping.retailPrice = header;
        } else {
          // Default to unit price if no specific type found
          mapping.unitPrice = header;
        }
      }
      // Description detection
      else if (headerLower.includes('description') || headerLower.includes('desc')) {
        mapping.description = header;
      }
      // Category detection
      else if (headerLower.includes('category') || headerLower.includes('group')) {
        mapping.category = header;
      }
      // Brand detection
      else if (headerLower.includes('brand') || headerLower.includes('manufacturer') || headerLower.includes('make')) {
        mapping.brand = header;
      }
      // Currency detection
      else if (headerLower.includes('currency') || headerLower.includes('curr')) {
        mapping.currency = header;
      }
      // Unit detection
      else if (headerLower.includes('unit') && !headerLower.includes('price')) {
        mapping.unit = header;
      }
      // Part number detection
      else if (headerLower.includes('part') || headerLower.includes('supplier')) {
        mapping.supplierPartNumber = header;
      }
      // Quantity detection
      else if (headerLower.includes('qty') || headerLower.includes('quantity') || headerLower.includes('moq')) {
        mapping.minimumOrderQuantity = header;
      }
      // Lead time detection
      else if (headerLower.includes('lead') || headerLower.includes('time')) {
        mapping.leadTime = header;
      }
      // Weight detection
      else if (headerLower.includes('weight') || headerLower.includes('mass')) {
        mapping.weight = header;
      }
      // Barcode detection
      else if (headerLower.includes('barcode') || headerLower.includes('upc') || headerLower.includes('ean')) {
        mapping.barcode = header;
      }
      // Availability detection
      else if (headerLower.includes('available') || headerLower.includes('stock') || headerLower.includes('status')) {
        mapping.availability = header;
      }
      // Dimensions detection
      else if (headerLower.includes('dimension') || headerLower.includes('size')) {
        mapping.dimensions = header;
      }
    });

    return mapping;
  }

  /**
   * Create default import configuration
   */
  static createDefaultConfig(
    mapping?: Partial<ImportConfiguration['columnMapping']>
  ): ImportConfiguration {
    return {
      columnMapping: mapping || {},
      options: {
        skipDuplicates: false,
        updateExisting: true,
        requireSKU: true,
        requirePrice: true,
        validateProducts: true,
        autoCreateCategories: true,
        defaultCurrency: 'USD',
        priceColumn: 'unitPrice'
      },
      transformRules: {
        trimWhitespace: true,
        convertToUpperCase: ['sku'],
        convertToLowerCase: ['unit'],
        removeSpecialChars: []
      }
    };
  }

  /**
   * Validate and clean import configuration
   */
  static validateConfiguration(config: ImportConfiguration): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if at least one price column is mapped
    const priceColumns = ['unitPrice', 'listPrice', 'wholesalePrice', 'retailPrice'];
    const hasPriceColumn = priceColumns.some(col => config.columnMapping[col]);

    if (config.options.requirePrice && !hasPriceColumn) {
      errors.push('At least one price column must be mapped when price is required');
    }

    // Check if the selected price column is actually mapped
    if (config.options.requirePrice && !config.columnMapping[config.options.priceColumn]) {
      errors.push(`Selected price column '${config.options.priceColumn}' is not mapped to any input column`);
    }

    // Check if SKU column is mapped when required
    if (config.options.requireSKU && !config.columnMapping.sku) {
      errors.push('SKU column must be mapped when SKU is required');
    }

    // Validate currency code
    const validCurrencies = ['USD', 'EUR', 'GBP', 'ZAR', 'AUD', 'CAD', 'JPY', 'CNY', 'INR'];
    if (!validCurrencies.includes(config.options.defaultCurrency)) {
      errors.push(`Invalid default currency: ${config.options.defaultCurrency}`);
    }

    // Check transform rules
    const validFields = Object.keys(config.columnMapping);
    config.transformRules.convertToUpperCase.forEach(field => {
      if (!validFields.includes(field)) {
        errors.push(`Transform rule references unmapped field: ${field}`);
      }
    });

    config.transformRules.convertToLowerCase.forEach(field => {
      if (!validFields.includes(field)) {
        errors.push(`Transform rule references unmapped field: ${field}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}