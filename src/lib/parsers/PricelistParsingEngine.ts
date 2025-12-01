// @ts-nocheck

/**
 * =====================================================
 * AUTOMATED EXCEL PRICELIST PARSING ENGINE
 * =====================================================
 *
 * Intelligent parser that automatically detects and processes
 * heterogeneous supplier Excel pricelist formats using
 * pattern recognition, AI-enhanced column mapping, and
 * adaptive parsing strategies.
 *
 * Author: Data Oracle
 * =====================================================
 */

import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';
import { basename } from 'path';
import { createHash } from 'crypto';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface ParsedPricelistData {
  metadata: {
    fileName: string;
    filePath: string;
    fileSize: number;
    fileHash: string;
    sheetName: string;
    totalRows: number;
    headerRow: number;
    dataStartRow: number;
    columnMapping: ColumnMapping;
    confidence: number;
    parsingStrategy: string;
  };
  items: PricelistItem[];
  errors: ParsingError[];
  warnings: ParsingWarning[];
}

export interface PricelistItem {
  rowNumber: number;
  sku?: string;
  supplierSku?: string;
  productName?: string;
  description?: string;
  brand?: string;
  manufacturer?: string;
  model?: string;
  category?: string;
  subcategory?: string;
  unitPrice?: number;
  costPrice?: number;
  listPrice?: number;
  wholesalePrice?: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  leadTimeDays?: number;
  unitOfMeasure?: string;
  stockStatus?: string;
  availability?: string;
  weight?: number;
  dimensionsL?: number;
  dimensionsW?: number;
  dimensionsH?: number;
  upcBarcode?: string;
  eanBarcode?: string;
  rawData: { [key: string]: unknown };
}

export interface ColumnMapping {
  [fieldName: string]: {
    columnIndex: number;
    columnName: string;
    confidence: number;
    transformFunction?: string;
  };
}

export interface ParsingError {
  row: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
  rawValue?: unknown;
}

export interface ParsingWarning {
  row: number;
  column: string;
  message: string;
  suggestion: string;
  rawValue?: unknown;
}

// =====================================================
// COLUMN PATTERN DEFINITIONS
// =====================================================

const COLUMN_PATTERNS = {
  sku: {
    keywords: [
      'sku',
      'code',
      'part',
      'product code',
      'item code',
      'part number',
      'p/n',
      'partno',
      'item no',
    ],
    patterns: [/^sku/i, /code$/i, /part.*no/i, /item.*no/i],
    priority: 1,
  },
  supplierSku: {
    keywords: [
      'supplier sku',
      'vendor code',
      'supplier code',
      'mfg code',
      'manufacturer code',
      'vendor part',
    ],
    patterns: [/supplier.*sku/i, /vendor.*code/i, /mfg.*code/i],
    priority: 2,
  },
  productName: {
    keywords: [
      'name',
      'title',
      'product',
      'description',
      'item',
      'product name',
      'item name',
      'desc',
    ],
    patterns: [/^name$/i, /product.*name/i, /item.*name/i, /^desc$/i, /description/i],
    priority: 1,
  },
  brand: {
    keywords: ['brand', 'make', 'manufacturer brand', 'mfg'],
    patterns: [/^brand$/i, /^make$/i, /^mfg$/i],
    priority: 3,
  },
  manufacturer: {
    keywords: ['manufacturer', 'mfr', 'maker', 'oem'],
    patterns: [/manufacturer/i, /^mfr$/i, /^maker$/i, /^oem$/i],
    priority: 3,
  },
  unitPrice: {
    keywords: [
      'price',
      'cost',
      'unit price',
      'retail',
      'selling price',
      'dealer price',
      'list price',
      'amount',
    ],
    patterns: [/price/i, /cost/i, /retail/i, /selling/i, /dealer/i, /amount/i],
    priority: 1,
  },
  costPrice: {
    keywords: ['cost', 'cost price', 'wholesale', 'dealer cost', 'buy price', 'purchase price'],
    patterns: [/cost.*price/i, /wholesale/i, /dealer.*cost/i, /buy.*price/i],
    priority: 2,
  },
  listPrice: {
    keywords: ['list price', 'msrp', 'rrp', 'retail price', 'suggested price'],
    patterns: [/list.*price/i, /msrp/i, /rrp/i, /retail.*price/i, /suggested/i],
    priority: 2,
  },
  category: {
    keywords: ['category', 'cat', 'type', 'class', 'group', 'family'],
    patterns: [/category/i, /^cat$/i, /^type$/i, /^class$/i, /^group$/i],
    priority: 3,
  },
  stockStatus: {
    keywords: ['stock', 'status', 'availability', 'qty', 'quantity', 'stock status', 'available'],
    patterns: [/stock/i, /status/i, /availability/i, /qty/i, /quantity/i],
    priority: 4,
  },
  minimumQuantity: {
    keywords: ['min qty', 'minimum', 'min order', 'moq'],
    patterns: [/min.*qty/i, /minimum/i, /min.*order/i, /moq/i],
    priority: 4,
  },
  weight: {
    keywords: ['weight', 'wt', 'mass', 'kg', 'lb'],
    patterns: [/weight/i, /^wt$/i, /mass/i, /\bkg\b/i, /\blb\b/i],
    priority: 5,
  },
  upcBarcode: {
    keywords: ['upc', 'barcode', 'universal product code'],
    patterns: [/upc/i, /barcode/i, /universal.*product/i],
    priority: 4,
  },
  eanBarcode: {
    keywords: ['ean', 'ean13', 'european article number'],
    patterns: [/ean/i, /ean13/i, /european.*article/i],
    priority: 4,
  },
};

// =====================================================
// MAIN PARSING ENGINE CLASS
// =====================================================

export class PricelistParsingEngine {
  private debug: boolean = false;

  constructor(debug: boolean = false) {
    this.debug = debug;
  }

  /**
   * Main entry point for parsing Excel files
   */
  public async parseExcelFile(filePath: string, supplierId?: string): Promise<ParsedPricelistData> {
    try {
      // Read and validate file
      const fileBuffer = await readFile(filePath);
      const fileSize = fileBuffer.length;
      const fileHash = this.generateFileHash(fileBuffer);
      const fileName = basename(filePath);

      this.debugLog(`Parsing file: ${fileName} (${fileSize} bytes)`);

      // Parse Excel workbook
      const workbook = XLSX.read(fileBuffer, {
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      // Find best sheet to parse
      const bestSheet = this.findBestSheet(workbook);
      this.debugLog(`Selected sheet: ${bestSheet.name} (${bestSheet.rows} rows)`);

      // Detect structure and create column mapping
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[bestSheet.name], {
        header: 1,
        raw: false,
        defval: null,
      }) as unknown[][];

      const structure = this.detectSheetStructure(sheetData);
      const columnMapping = this.createColumnMapping(structure.headers);

      this.debugLog(
        `Detected structure: headerRow=${structure.headerRow}, dataStart=${structure.dataStartRow}`
      );
      this.debugLog(`Column mapping confidence: ${this.calculateOverallConfidence(columnMapping)}`);

      // Parse data rows
      const { items, errors, warnings } = this.parseDataRows(sheetData, structure, columnMapping);

      return {
        metadata: {
          fileName,
          filePath,
          fileSize,
          fileHash,
          sheetName: bestSheet.name,
          totalRows: sheetData.length,
          headerRow: structure.headerRow,
          dataStartRow: structure.dataStartRow,
          columnMapping,
          confidence: this.calculateOverallConfidence(columnMapping),
          parsingStrategy: 'intelligent_pattern_matching',
        },
        items,
        errors,
        warnings,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate SHA-256 hash of file for duplicate detection
   */
  private generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Find the best sheet to parse from workbook
   */
  private findBestSheet(workbook: XLSX.WorkBook): { name: string; rows: number; score: number } {
    const sheetNames = workbook.SheetNames;
    let bestSheet = { name: sheetNames[0], rows: 0, score: 0 };

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

      // Score based on data characteristics
      let score = 0;
      const rows = sheetData.length;

      // Prefer sheets with more data rows
      score += Math.min(rows / 100, 5);

      // Prefer sheets with recognizable price list keywords
      const sheetText = sheetData.flat().join(' ').toLowerCase();
      if (sheetText.includes('price')) score += 3;
      if (sheetText.includes('sku')) score += 3;
      if (sheetText.includes('product')) score += 2;
      if (sheetText.includes('cost')) score += 2;

      // Penalty for very short sheets (likely metadata)
      if (rows < 5) score -= 5;

      // Penalty for sheets with suspicious names
      if (/^(front|cover|info|readme|instructions)/i.test(sheetName)) score -= 3;

      this.debugLog(`Sheet "${sheetName}": ${rows} rows, score: ${score}`);

      if (score > bestSheet.score) {
        bestSheet = { name: sheetName, rows, score };
      }
    }

    return bestSheet;
  }

  /**
   * Detect the structure of the sheet (header location, data start, etc.)
   */
  private detectSheetStructure(sheetData: unknown[][]): {
    headerRow: number;
    dataStartRow: number;
    headers: string[];
    totalRows: number;
  } {
    let headerRow = -1;
    let dataStartRow = -1;
    let headers: string[] = [];

    // Look for header row - typically contains the most recognizable column names
    for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
      const row = sheetData[i];
      if (!row || row.length === 0) continue;

      let recognizedColumns = 0;
      const rowHeaders: string[] = [];

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim();
        rowHeaders.push(cell);

        if (cell && this.isLikelyHeaderCell(cell)) {
          recognizedColumns++;
        }
      }

      // Header row should have at least 3 recognized columns
      if (recognizedColumns >= 3 && recognizedColumns >= row.filter(cell => cell).length * 0.3) {
        headerRow = i;
        headers = rowHeaders;
        dataStartRow = i + 1;
        break;
      }
    }

    // Fallback: assume first non-empty row is header
    if (headerRow === -1) {
      for (let i = 0; i < Math.min(sheetData.length, 5); i++) {
        const row = sheetData[i];
        if (row && row.some(cell => cell)) {
          headerRow = i;
          headers = row.map(cell => String(cell || '').trim());
          dataStartRow = i + 1;
          break;
        }
      }
    }

    return {
      headerRow,
      dataStartRow,
      headers,
      totalRows: sheetData.length,
    };
  }

  /**
   * Check if a cell value looks like a column header
   */
  private isLikelyHeaderCell(value: string): boolean {
    const lowerValue = value.toLowerCase();

    // Check against all known patterns
    for (const fieldPatterns of Object.values(COLUMN_PATTERNS)) {
      // Check keywords
      if (fieldPatterns.keywords.some(keyword => lowerValue.includes(keyword))) {
        return true;
      }

      // Check regex patterns
      if (fieldPatterns.patterns.some(pattern => pattern.test(value))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create intelligent column mapping using pattern matching
   */
  private createColumnMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (!header || header.trim() === '') continue;

      const bestMatch = this.findBestColumnMatch(header);
      if (bestMatch) {
        mapping[bestMatch.field] = {
          columnIndex: i,
          columnName: header,
          confidence: bestMatch.confidence,
          transformFunction: bestMatch.transformFunction,
        };
      }
    }

    this.debugLog('Column mapping created:', mapping);
    return mapping;
  }

  /**
   * Find the best field match for a column header
   */
  private findBestColumnMatch(header: string): {
    field: string;
    confidence: number;
    transformFunction?: string;
  } | null {
    const lowerHeader = header.toLowerCase().trim();
    let bestMatch: { field: string; confidence: number; transformFunction?: string } | null = null;
    let bestScore = 0;

    for (const [fieldName, patterns] of Object.entries(COLUMN_PATTERNS)) {
      let score = 0;

      // Check exact keyword matches
      for (const keyword of patterns.keywords) {
        if (lowerHeader === keyword) {
          score = 100; // Perfect match
          break;
        } else if (lowerHeader.includes(keyword)) {
          score = Math.max(score, 80 + (keyword.length / lowerHeader.length) * 20);
        }
      }

      // Check regex patterns
      for (const pattern of patterns.patterns) {
        if (pattern.test(header)) {
          score = Math.max(score, 75);
        }
      }

      // Apply priority weighting
      score = score * (1 + (patterns.priority - 1) * 0.1);

      if (score > bestScore && score >= 50) {
        // Minimum confidence threshold
        bestScore = score;
        bestMatch = {
          field: fieldName,
          confidence: Math.min(score, 100),
          transformFunction: this.getTransformFunction(fieldName),
        };
      }
    }

    return bestMatch;
  }

  /**
   * Get appropriate transform function for field type
   */
  private getTransformFunction(fieldName: string): string | undefined {
    const transforms: { [key: string]: string } = {
      unitPrice: 'parsePrice',
      costPrice: 'parsePrice',
      listPrice: 'parsePrice',
      wholesalePrice: 'parsePrice',
      minimumQuantity: 'parseInt',
      maximumQuantity: 'parseInt',
      leadTimeDays: 'parseInt',
      weight: 'parseFloat',
      dimensionsL: 'parseFloat',
      dimensionsW: 'parseFloat',
      dimensionsH: 'parseFloat',
      upcBarcode: 'parseBarcode',
      eanBarcode: 'parseBarcode',
    };

    return transforms[fieldName];
  }

  /**
   * Parse data rows using the column mapping
   */
  private parseDataRows(
    sheetData: unknown[][],
    structure: { headerRow: number; dataStartRow: number; headers: string[] },
    columnMapping: ColumnMapping
  ): {
    items: PricelistItem[];
    errors: ParsingError[];
    warnings: ParsingWarning[];
  } {
    const items: PricelistItem[] = [];
    const errors: ParsingError[] = [];
    const warnings: ParsingWarning[] = [];

    for (let i = structure.dataStartRow; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row || this.isEmptyRow(row)) continue;

      try {
        const item = this.parseRow(row, i + 1, columnMapping, structure.headers);

        // Validate critical fields
        const validation = this.validateItem(item, i + 1);
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);

        if (item.sku && item.productName && item.unitPrice !== undefined) {
          items.push(item);
        } else {
          errors.push({
            row: i + 1,
            message: 'Missing critical fields (SKU, product name, or unit price)',
            severity: 'error',
          });
        }
      } catch (error) {
        errors.push({
          row: i + 1,
          message: `Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
        });
      }
    }

    return { items, errors, warnings };
  }

  /**
   * Check if a row is effectively empty
   */
  private isEmptyRow(row: unknown[]): boolean {
    return !row || row.every(cell => !cell || String(cell).trim() === '');
  }

  /**
   * Parse a single data row
   */
  private parseRow(
    row: unknown[],
    rowNumber: number,
    columnMapping: ColumnMapping,
    headers: string[]
  ): PricelistItem {
    const item: PricelistItem = {
      rowNumber,
      rawData: {},
    };

    // Store raw data for debugging
    headers.forEach((header, index) => {
      if (header && row[index] !== undefined) {
        item.rawData[header] = row[index];
      }
    });

    // Apply column mapping
    for (const [fieldName, mapping] of Object.entries(columnMapping)) {
      const rawValue = row[mapping.columnIndex];
      if (rawValue === null || rawValue === undefined) continue;

      try {
        const transformedValue = this.transformValue(
          rawValue,
          fieldName,
          mapping.transformFunction
        );

        // Map to item fields
        (item as unknown)[this.camelCase(fieldName)] = transformedValue;
      } catch (error) {
        // Store raw value if transformation fails
        (item as unknown)[this.camelCase(fieldName)] = rawValue;
      }
    }

    return item;
  }

  /**
   * Transform raw cell value based on field type
   */
  private transformValue(
    rawValue: unknown,
    fieldName: string,
    transformFunction?: string
  ): unknown {
    if (rawValue === null || rawValue === undefined || rawValue === '') return undefined;

    const stringValue = String(rawValue).trim();

    switch (transformFunction) {
      case 'parsePrice':
        return this.parsePrice(stringValue);
      case 'parseInt':
        return this.parseInteger(stringValue);
      case 'parseFloat':
        return this.parseFloat(stringValue);
      case 'parseBarcode':
        return this.parseBarcode(stringValue);
      default:
        return this.parseString(stringValue);
    }
  }

  /**
   * Parse price values (handles currency symbols, commas, etc.)
   */
  private parsePrice(value: string): number | undefined {
    if (!value) return undefined;

    // Remove currency symbols and common formatting
    const cleaned = value.replace(/[^\d.,-]/g, '');
    if (!cleaned) return undefined;

    // Handle different decimal separators
    const normalized = cleaned.replace(/,(?=\d{3})/g, ''); // Remove thousands separators
    const parsed = parseFloat(normalized.replace(',', '.'));

    return isNaN(parsed) ? undefined : Math.max(0, parsed);
  }

  /**
   * Parse integer values
   */
  private parseInteger(value: string): number | undefined {
    if (!value) return undefined;

    const cleaned = value.replace(/[^\d-]/g, '');
    const parsed = parseInt(cleaned, 10);

    return isNaN(parsed) ? undefined : Math.max(0, parsed);
  }

  /**
   * Parse float values
   */
  private parseFloat(value: string): number | undefined {
    if (!value) return undefined;

    const cleaned = value.replace(/[^\d.,-]/g, '');
    const parsed = parseFloat(cleaned.replace(',', '.'));

    return isNaN(parsed) ? undefined : Math.max(0, parsed);
  }

  /**
   * Parse barcode values (digits only)
   */
  private parseBarcode(value: string): string | undefined {
    if (!value) return undefined;

    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned.length >= 8 ? cleaned : undefined; // Minimum barcode length
  }

  /**
   * Parse string values (trim and validate)
   */
  private parseString(value: string): string | undefined {
    if (!value) return undefined;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  /**
   * Validate parsed item
   */
  private validateItem(
    item: PricelistItem,
    rowNumber: number
  ): {
    errors: ParsingError[];
    warnings: ParsingWarning[];
  } {
    const errors: ParsingError[] = [];
    const warnings: ParsingWarning[] = [];

    // Price validation
    if (item.unitPrice !== undefined) {
      if (item.unitPrice <= 0) {
        errors.push({
          row: rowNumber,
          column: 'unitPrice',
          message: 'Unit price must be greater than 0',
          severity: 'error',
          rawValue: item.unitPrice,
        });
      } else if (item.unitPrice > 1000000) {
        warnings.push({
          row: rowNumber,
          column: 'unitPrice',
          message: 'Unit price seems unusually high',
          suggestion: 'Verify price is correct',
          rawValue: item.unitPrice,
        });
      }
    }

    // SKU validation
    if (item.sku && item.sku.length < 2) {
      warnings.push({
        row: rowNumber,
        column: 'sku',
        message: 'SKU seems too short',
        suggestion: 'Verify SKU is complete',
        rawValue: item.sku,
      });
    }

    // Product name validation
    if (item.productName && item.productName.length < 3) {
      warnings.push({
        row: rowNumber,
        column: 'productName',
        message: 'Product name seems too short',
        suggestion: 'Verify product name is complete',
        rawValue: item.productName,
      });
    }

    return { errors, warnings };
  }

  /**
   * Calculate overall confidence score for column mapping
   */
  private calculateOverallConfidence(mapping: ColumnMapping): number {
    const mappings = Object.values(mapping);
    if (mappings.length === 0) return 0;

    const totalConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0);
    const avgConfidence = totalConfidence / mappings.length;

    // Bonus for having critical fields mapped
    const criticalFields = ['sku', 'productName', 'unitPrice'];
    const criticalMapped = criticalFields.filter(field => mapping[field]).length;
    const criticalBonus = (criticalMapped / criticalFields.length) * 20;

    return Math.min(100, avgConfidence + criticalBonus);
  }

  /**
   * Convert field name to camelCase
   */
  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Debug logging helper
   */
  private debugLog(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[PricelistParser] ${message}`, data || '');
    }
  }

  /**
   * Get parsing statistics for monitoring
   */
  public getParsingStatistics(result: ParsedPricelistData): {
    totalRows: number;
    successfulParsing: number;
    errorRate: number;
    warningRate: number;
    confidence: number;
    criticalFieldsCoverage: number;
  } {
    const criticalFields = ['sku', 'productName', 'unitPrice'];
    const mappedCriticalFields = criticalFields.filter(
      field => result.metadata.columnMapping[field]
    ).length;

    return {
      totalRows: result.metadata.totalRows,
      successfulParsing: result.items.length,
      errorRate: (result.errors.length / Math.max(result.metadata.totalRows, 1)) * 100,
      warningRate: (result.warnings.length / Math.max(result.metadata.totalRows, 1)) * 100,
      confidence: result.metadata.confidence,
      criticalFieldsCoverage: (mappedCriticalFields / criticalFields.length) * 100,
    };
  }
}
