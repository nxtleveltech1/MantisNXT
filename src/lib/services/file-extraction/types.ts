/**
 * File Extraction Engine - Type Definitions
 *
 * Production-ready types for pricelist file extraction with comprehensive
 * confidence scoring, validation, and metadata tracking.
 */

export interface ExtractionConfig {
  /** Supplier ID for brand/metadata enrichment */
  supplierId?: string;

  /** Currency to use if not detected */
  defaultCurrency?: string;

  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;

  /** Skip rows with missing required fields */
  skipInvalidRows?: boolean;

  /** Maximum rows to process */
  maxRows?: number;

  /** Custom column mappings (override auto-detection) */
  columnMappings?: Partial<ColumnMapping>;

  /** Enable strict validation (fail on warnings) */
  strictMode?: boolean;
}

export interface ColumnMapping {
  supplier_sku: string | null;
  name: string | null;
  brand: string | null;
  price: string | null;
  uom: string | null;
  pack_size: string | null;
  barcode: string | null;
  category_raw: string | null;
  vat_code: string | null;
}

export interface ColumnMappingWithConfidence {
  mapping: ColumnMapping;
  confidence: Record<keyof ColumnMapping, number>;
  unmappedHeaders: string[];
}

export interface ParsedRow {
  rowNum: number;
  supplier_sku: string;
  name: string;
  brand?: string;
  uom: string;
  pack_size?: string;
  price: number;
  currency: string;
  category_raw?: string;
  vat_code?: string;
  barcode?: string;
  attrs_json?: Record<string, unknown>;

  // Metadata
  confidence: number;
  warnings: string[];
  is_valid: boolean;
}

export interface ExtractedMetadata {
  filename: string;
  fileType: 'excel' | 'csv' | 'pdf';
  sheetName?: string;
  detectedBrand?: string;
  detectedCurrency?: string;
  headerRow: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columnMappings: ColumnMappingWithConfidence;
  extractionConfidence: number;
  processingTimeMs: number;
}

export interface ExtractionResult {
  success: boolean;
  metadata: ExtractedMetadata;
  rows: ParsedRow[];
  errors: ExtractionError[];
  warnings: ExtractionWarning[];
}

export interface ExtractionError {
  type: 'file' | 'format' | 'validation' | 'system';
  message: string;
  rowNum?: number;
  field?: string;
  details?: unknown;
}

export interface ExtractionWarning {
  type: 'missing_field' | 'low_confidence' | 'data_quality' | 'mapping';
  message: string;
  rowNum?: number;
  field?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SheetData {
  sheetName: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  totalRows: number;
}

export interface CurrencyInfo {
  currency: string;
  symbol: string;
  confidence: number;
}

export interface BrandDetectionResult {
  brand: string | null;
  confidence: number;
  source: 'filename' | 'sheet_name' | 'column' | 'pattern';
}

export interface ValidationResult {
  is_valid: boolean;
  warnings: string[];
  confidence: number;
}

/**
 * Type guard to check if a value is a valid ParsedRow
 */
export function isParsedRow(row: unknown): row is ParsedRow {
  if (!row || typeof row !== 'object') return false;

  const r = row as Partial<ParsedRow>;
  return !!(
    typeof r.rowNum === 'number' &&
    typeof r.supplier_sku === 'string' &&
    typeof r.name === 'string' &&
    typeof r.uom === 'string' &&
    typeof r.price === 'number' &&
    typeof r.currency === 'string' &&
    typeof r.is_valid === 'boolean'
  );
}
