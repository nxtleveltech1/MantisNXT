/**
 * ExcelExtractor - Parse Excel files with intelligent header detection
 *
 * Handles:
 * - .xlsx and .xls files
 * - Multi-sheet workbooks
 * - Intelligent header row detection
 * - Auto-column mapping with fuzzy matching
 * - Brand extraction from sheet names and content
 * - Type conversion and formatting
 */

import * as XLSX from 'xlsx';
import type { SheetData, ExtractionConfig, ParsedRow } from './types';
import { mapColumns } from './ColumnMapper';
import { parsePrice, detectCurrency } from './CurrencyNormalizer';
import { validateRow } from './ValidationEngine';
import { extractBrandFromSheetName, extractBrandFromColumn, detectBrand } from './BrandDetector';

/**
 * Detect header row in worksheet
 * Looks for row with most non-numeric, non-empty values
 */
function detectHeaderRow(worksheet: XLSX.WorkSheet, maxRowsToCheck: number = 10): number {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  let bestRow = 0;
  let bestScore = 0;

  for (let row = range.s.r; row < Math.min(range.e.r, maxRowsToCheck); row++) {
    let score = 0;
    let nonEmptyCount = 0;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddr];

      if (!cell || !cell.v) continue;

      nonEmptyCount++;
      const value = String(cell.v).trim();

      // Score: non-empty, non-numeric values
      if (value.length > 0 && !/^\d+\.?\d*$/.test(value)) {
        score++;
      }

      // Bonus: common header keywords
      if (/^(sku|code|name|product|description|price|cost|uom|brand|category)/i.test(value)) {
        score += 2;
      }
    }

    // Penalize rows with too few values
    if (nonEmptyCount < 3) continue;

    if (score > bestScore) {
      bestScore = score;
      bestRow = row;
    }
  }

  return bestRow;
}

/**
 * Extract headers from worksheet at given row
 */
function extractHeaders(worksheet: XLSX.WorkSheet, headerRow: number): string[] {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const headers: string[] = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddr = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = worksheet[cellAddr];

    if (cell && cell.v) {
      headers.push(String(cell.v).trim());
    } else {
      headers.push(`Column_${col + 1}`);
    }
  }

  return headers;
}

/**
 * Extract cell value with type conversion
 */
function extractCellValue(cell: XLSX.CellObject | undefined): unknown {
  if (!cell) return '';

  // Handle different cell types
  switch (cell.t) {
    case 'n': // Number
      return cell.v;

    case 's': // String
      return String(cell.v).trim();

    case 'b': // Boolean
      return cell.v;

    case 'd': // Date
      return cell.v;

    case 'e': // Error
      return '';

    case 'z': // Blank
      return '';

    default:
      return String(cell.v || '').trim();
  }
}

/**
 * Parse worksheet to sheet data
 */
function parseWorksheet(worksheet: XLSX.WorkSheet, sheetName: string): SheetData {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // Detect header row
  const headerRowIndex = detectHeaderRow(worksheet);
  const headers = extractHeaders(worksheet, headerRowIndex);

  // Extract data rows
  const rows: Array<Record<string, unknown>> = [];

  for (let row = headerRowIndex + 1; row <= range.e.r; row++) {
    const rowData: Record<string, unknown> = {};
    let hasData = false;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddr];
      const header = headers[col - range.s.c] || `Column_${col + 1}`;
      const value = extractCellValue(cell);

      rowData[header] = value;

      if (value !== '' && value != null) {
        hasData = true;
      }
    }

    // Skip empty rows
    if (hasData) {
      rows.push(rowData);
    }
  }

  return {
    sheetName,
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Select best sheet from workbook
 * Prefers sheets with "price", "product", "list" in name
 * Falls back to first sheet with data
 */
function selectBestSheet(workbook: XLSX.WorkBook): string {
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('Workbook has no sheets');
  }

  // Priority keywords
  const keywords = ['price', 'product', 'list', 'catalog', 'catalogue', 'item'];

  for (const keyword of keywords) {
    const match = sheetNames.find(name => name.toLowerCase().includes(keyword));
    if (match) return match;
  }

  // Avoid sheets with "summary", "notes", "info"
  const filtered = sheetNames.filter(
    name => !/(summary|notes|info|instructions|help|template)/i.test(name)
  );

  // Return first non-filtered sheet with data
  for (const name of filtered.length > 0 ? filtered : sheetNames) {
    const sheet = workbook.Sheets[name];
    if (sheet && sheet['!ref']) {
      const range = XLSX.utils.decode_range(sheet['!ref']);
      const rowCount = range.e.r - range.s.r + 1;
      if (rowCount > 1) {
        return name;
      }
    }
  }

  // Fallback to first sheet
  return sheetNames[0];
}

/**
 * Extract rows from sheet data
 */
function extractRows(
  sheetData: SheetData,
  filename: string,
  config?: ExtractionConfig
): ParsedRow[] {
  const { mapping, confidence: mappingConfidence } = mapColumns(sheetData.headers);

  if (!mapping.supplier_sku || !mapping.name || !mapping.price || !mapping.uom) {
    throw new Error(
      `Missing required column mappings. Found: ${Object.entries(mapping)
        .filter(([_, v]) => v)
        .map(([k]) => k)
        .join(', ')}`
    );
  }

  const parsedRows: ParsedRow[] = [];
  const maxRows = config?.maxRows || Infinity;
  const defaultCurrency = config?.defaultCurrency || 'ZAR';

  // Collect brand column values for detection
  const brandColumnValues: unknown[] = [];
  if (mapping.brand) {
    for (const row of sheetData.rows) {
      brandColumnValues.push(row[mapping.brand]);
    }
  }

  // Detect brand from multiple sources
  const brandDetection = detectBrand(filename, sheetData.sheetName, brandColumnValues);

  for (let i = 0; i < Math.min(sheetData.rows.length, maxRows); i++) {
    const sourceRow = sheetData.rows[i];
    const rowNum = i + 1;

    try {
      // Extract required fields
      const supplier_sku = String(sourceRow[mapping.supplier_sku] || '').trim();
      const name = String(sourceRow[mapping.name] || '').trim();
      const uom = String(sourceRow[mapping.uom] || '').trim();

      // Parse price
      const priceValue = sourceRow[mapping.price] as string | number | null;
      const price = parsePrice(priceValue, defaultCurrency);

      if (price === null) {
        if (config?.skipInvalidRows) continue;
      }

      // Detect currency from price value
      const detectedCurrency =
        detectCurrency(priceValue as string | number).currency || defaultCurrency;

      // Extract optional fields
      let brand = mapping.brand
        ? String(sourceRow[mapping.brand] || '').trim() || undefined
        : undefined;

      // Use detected brand if no brand column or column is empty
      if (!brand && brandDetection.brand) {
        brand = brandDetection.brand;
      }

      // Filter brand if it looks like SKU
      if (brand) {
        const brandResult = extractBrandFromColumn(brand, mapping.brand || undefined);
        brand = brandResult.brand || brand;
      }

      const pack_size = mapping.pack_size
        ? String(sourceRow[mapping.pack_size] || '').trim() || undefined
        : undefined;

      const barcode = mapping.barcode
        ? String(sourceRow[mapping.barcode] || '').trim() || undefined
        : undefined;

      const category_raw = mapping.category_raw
        ? String(sourceRow[mapping.category_raw] || '').trim() || undefined
        : undefined;

      const vat_code = mapping.vat_code
        ? String(sourceRow[mapping.vat_code] || '').trim() || undefined
        : undefined;

      // Build parsed row
      const parsedRow: Partial<ParsedRow> = {
        rowNum,
        supplier_sku,
        name,
        brand,
        uom,
        pack_size,
        price: price || 0,
        currency: detectedCurrency,
        category_raw,
        vat_code,
        barcode,
      };

      // Validate
      const validation = validateRow(parsedRow, config);

      if (!validation.is_valid && config?.skipInvalidRows) {
        continue;
      }

      parsedRows.push({
        ...parsedRow,
        confidence: validation.confidence,
        warnings: validation.warnings,
        is_valid: validation.is_valid,
      } as ParsedRow);
    } catch (error) {
      // Row extraction error - skip if configured
      if (config?.skipInvalidRows) {
        continue;
      }

      // Otherwise add with error
      parsedRows.push({
        rowNum,
        supplier_sku: '',
        name: `Error parsing row ${rowNum}`,
        uom: 'EACH',
        price: 0,
        currency: defaultCurrency,
        confidence: 0,
        warnings: [error instanceof Error ? error.message : 'Unknown error'],
        is_valid: false,
      });
    }
  }

  return parsedRows;
}

/**
 * Extract data from Excel file
 */
export async function extractFromExcel(
  fileContent: Buffer,
  filename: string,
  config?: ExtractionConfig
): Promise<{ sheetData: SheetData; rows: ParsedRow[] }> {
  // Parse workbook
  const workbook = XLSX.read(fileContent, {
    type: 'buffer',
    cellDates: true,
    cellNF: true,
    cellText: false,
  });

  // Select best sheet
  const sheetName = selectBestSheet(workbook);
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  // Parse worksheet
  const sheetData = parseWorksheet(worksheet, sheetName);

  // Extract rows
  const rows = extractRows(sheetData, filename, config);

  return { sheetData, rows };
}

/**
 * Get workbook metadata
 */
export function getWorkbookInfo(fileContent: Buffer): {
  sheetNames: string[];
  totalSheets: number;
} {
  const workbook = XLSX.read(fileContent, { type: 'buffer', bookSheets: true });

  return {
    sheetNames: workbook.SheetNames,
    totalSheets: workbook.SheetNames.length,
  };
}
