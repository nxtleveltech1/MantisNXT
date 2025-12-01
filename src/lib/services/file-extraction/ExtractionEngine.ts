/**
 * ExtractionEngine - Main orchestrator for file extraction
 *
 * Coordinates extraction from Excel, CSV, and PDF files.
 * Handles format detection, validation, and result aggregation.
 */

import type {
  ExtractionConfig,
  ExtractionResult,
  ExtractionError,
  ExtractionWarning,
  SheetData,
  ParsedRow,
  ExtractedMetadata,
} from './types';
import { extractFromExcel } from './ExcelExtractor';
import { extractFromCSV } from './CSVExtractor';
import { mapColumns, validateMapping } from './ColumnMapper';
import { detectBrand } from './BrandDetector';
import { detectCurrency } from './CurrencyNormalizer';
import { calculateMetadataConfidence, calculateOverallConfidence } from './ConfidenceScorer';

/**
 * Detect file type from filename or content
 */
function detectFileType(
  filename: string,
  content: Buffer | string
): 'excel' | 'csv' | 'pdf' | null {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'xlsx' || ext === 'xls') {
    return 'excel';
  }

  if (ext === 'csv' || ext === 'txt') {
    return 'csv';
  }

  if (ext === 'pdf') {
    return 'pdf';
  }

  // Try content-based detection for buffers
  if (Buffer.isBuffer(content)) {
    // Excel files start with PK (ZIP signature)
    if (content[0] === 0x50 && content[1] === 0x4b) {
      return 'excel';
    }

    // PDF files start with %PDF
    if (content[0] === 0x25 && content[1] === 0x50 && content[2] === 0x44 && content[3] === 0x46) {
      return 'pdf';
    }

    // Assume CSV for text content
    const sample = content.toString('utf-8', 0, 1000);
    if (/^[\x20-\x7E\t\r\n]+$/.test(sample)) {
      return 'csv';
    }
  }

  return null;
}

/**
 * Main extraction engine class
 */
export class ExtractionEngine {
  /**
   * Extract data from file
   */
  async extract(
    file: Buffer | string,
    filename: string,
    config?: ExtractionConfig
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const errors: ExtractionError[] = [];
    const warnings: ExtractionWarning[] = [];

    try {
      // Detect file type
      const fileType = detectFileType(filename, file);

      if (!fileType) {
        errors.push({
          type: 'file',
          message: `Unable to detect file type for "${filename}"`,
        });

        return {
          success: false,
          metadata: this.createEmptyMetadata(filename, startTime),
          rows: [],
          errors,
          warnings,
        };
      }

      if (fileType === 'pdf') {
        errors.push({
          type: 'format',
          message: 'PDF extraction is not yet implemented',
        });

        return {
          success: false,
          metadata: this.createEmptyMetadata(filename, startTime),
          rows: [],
          errors,
          warnings,
        };
      }

      // Extract based on file type
      let sheetData: SheetData;
      let rows: ParsedRow[];

      if (fileType === 'excel') {
        if (typeof file === 'string') {
          errors.push({
            type: 'file',
            message: 'Excel files must be provided as Buffer, not string',
          });

          return {
            success: false,
            metadata: this.createEmptyMetadata(filename, startTime),
            rows: [],
            errors,
            warnings,
          };
        }

        const result = await extractFromExcel(file, filename, config);
        sheetData = result.sheetData;
        rows = result.rows;
      } else {
        // CSV
        const result = await extractFromCSV(file, filename, config);
        sheetData = result.sheetData;
        rows = result.rows;
      }

      // Validate column mappings
      const columnMappings = mapColumns(sheetData.headers);
      const mappingValidation = validateMapping(columnMappings);

      if (!mappingValidation.isValid) {
        for (const missing of mappingValidation.missing) {
          errors.push({
            type: 'validation',
            message: `Missing required column mapping: ${missing}`,
            field: missing,
          });
        }
      }

      // Add warnings for low-confidence mappings
      for (const { field, confidence } of mappingValidation.lowConfidence) {
        warnings.push({
          type: 'mapping',
          message: `Low confidence mapping for ${field} (${(confidence * 100).toFixed(0)}%)`,
          field,
          severity: confidence < 0.7 ? 'high' : 'medium',
        });
      }

      // Detect brand
      const brandColumnValues = columnMappings.mapping.brand
        ? rows.map(r => r.brand).filter(Boolean)
        : [];

      const brandDetection = detectBrand(filename, sheetData.sheetName, brandColumnValues);

      // Detect currency (from first valid row)
      const firstValidRow = rows.find(r => r.price > 0);
      const detectedCurrency = firstValidRow
        ? firstValidRow.currency
        : config?.defaultCurrency || 'ZAR';

      // Calculate confidence scores
      const metadataConfidence = calculateMetadataConfidence(columnMappings, brandDetection, rows);

      const extractionConfidence = calculateOverallConfidence(metadataConfidence, rows);

      // Collect row-level warnings
      for (const row of rows) {
        if (row.warnings.length > 0) {
          for (const warning of row.warnings) {
            warnings.push({
              type: 'data_quality',
              message: warning,
              rowNum: row.rowNum,
              severity: 'low',
            });
          }
        }
      }

      // Build metadata
      const metadata: ExtractedMetadata = {
        filename,
        fileType,
        sheetName: sheetData.sheetName,
        detectedBrand: brandDetection.brand || undefined,
        detectedCurrency,
        headerRow: 0, // Would need to track this from extractors
        totalRows: sheetData.totalRows,
        validRows: rows.filter(r => r.is_valid).length,
        invalidRows: rows.filter(r => !r.is_valid).length,
        columnMappings,
        extractionConfidence,
        processingTimeMs: Date.now() - startTime,
      };

      return {
        success: errors.length === 0,
        metadata,
        rows,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        type: 'system',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      });

      return {
        success: false,
        metadata: this.createEmptyMetadata(filename, startTime),
        rows: [],
        errors,
        warnings,
      };
    }
  }

  /**
   * Create empty metadata for error cases
   */
  private createEmptyMetadata(filename: string, startTime: number): ExtractedMetadata {
    return {
      filename,
      fileType: 'excel',
      headerRow: 0,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      columnMappings: {
        mapping: {
          supplier_sku: null,
          name: null,
          brand: null,
          price: null,
          uom: null,
          pack_size: null,
          barcode: null,
          category_raw: null,
          vat_code: null,
        },
        confidence: {
          supplier_sku: 0,
          name: 0,
          brand: 0,
          price: 0,
          uom: 0,
          pack_size: 0,
          barcode: 0,
          category_raw: 0,
          vat_code: 0,
        },
        unmappedHeaders: [],
      },
      extractionConfidence: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Validate file before extraction
   */
  async validateFile(
    file: Buffer | string,
    filename: string
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    const size = Buffer.isBuffer(file) ? file.length : file.length;
    const maxSize = 50 * 1024 * 1024; // 50 MB

    if (size === 0) {
      errors.push('File is empty');
    }

    if (size > maxSize) {
      errors.push(`File too large (${(size / 1024 / 1024).toFixed(2)} MB, max 50 MB)`);
    }

    // Check file type
    const fileType = detectFileType(filename, file);

    if (!fileType) {
      errors.push('Unsupported file type (must be .xlsx, .xls, or .csv)');
    }

    if (fileType === 'pdf') {
      warnings.push('PDF support is experimental');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return ['.xlsx', '.xls', '.csv'];
  }

  /**
   * Check if file is supported
   */
  isSupported(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return !!ext && ['xlsx', 'xls', 'csv'].includes(ext);
  }
}

// Export singleton instance
export const extractionEngine = new ExtractionEngine();
