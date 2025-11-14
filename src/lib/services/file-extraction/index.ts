/**
 * File Extraction Engine - Public API
 *
 * Production-ready pricelist file extraction with intelligent parsing,
 * validation, and confidence scoring.
 *
 * @example
 * ```typescript
 * import { extractionEngine } from '@/lib/services/file-extraction';
 *
 * const result = await extractionEngine.extract(fileBuffer, 'pricelist.xlsx', {
 *   defaultCurrency: 'ZAR',
 *   skipInvalidRows: true,
 *   minConfidence: 0.6,
 * });
 *
 * if (result.success) {
 *   console.log(`Extracted ${result.rows.length} rows`);
 *   console.log(`Confidence: ${(result.metadata.extractionConfidence * 100).toFixed(1)}%`);
 * }
 * ```
 */

// Main engine
export { ExtractionEngine, extractionEngine } from './ExtractionEngine';

// Extractors
export { extractFromExcel, getWorkbookInfo } from './ExcelExtractor';
export { extractFromCSV } from './CSVExtractor';

// Utilities
export {
  mapColumns,
  validateMapping,
  fuzzyMatch,
  levenshteinDistance,
  COLUMN_ALIASES,
} from './ColumnMapper';

export {
  detectBrand,
  extractBrandFromFilename,
  extractBrandFromSheetName,
  extractBrandFromColumn,
  isSKULike,
} from './BrandDetector';

export {
  parsePrice,
  detectCurrency,
  formatPrice,
  normalizeCurrencyCode,
  isValidCurrencyCode,
} from './CurrencyNormalizer';

export { validateRow, validateRows, shouldProcessRow } from './ValidationEngine';

export {
  calculateRowConfidence,
  calculateMetadataConfidence,
  calculateOverallConfidence,
  getConfidenceLevel,
  getConfidenceReport,
} from './ConfidenceScorer';

// Types
export type {
  ExtractionConfig,
  ExtractionResult,
  ExtractionError,
  ExtractionWarning,
  ParsedRow,
  ColumnMapping,
  ColumnMappingWithConfidence,
  ExtractedMetadata,
  SheetData,
  CurrencyInfo,
  BrandDetectionResult,
  ValidationResult,
} from './types';

export { isParsedRow } from './types';
