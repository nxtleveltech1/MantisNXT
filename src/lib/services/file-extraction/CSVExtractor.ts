/**
 * CSVExtractor - Parse CSV files with auto-delimiter detection
 *
 * Handles:
 * - Auto-delimiter detection (comma, semicolon, tab, pipe)
 * - Quoted fields and escaping
 * - Header row detection
 * - Column mapping
 * - Row extraction with validation
 */

import type { SheetData, ExtractionConfig, ParsedRow } from './types';
import { mapColumns } from './ColumnMapper';
import { parsePrice, detectCurrency } from './CurrencyNormalizer';
import { validateRow } from './ValidationEngine';
import { extractBrandFromColumn } from './BrandDetector';

/**
 * Detect CSV delimiter from sample data
 */
function detectDelimiter(sample: string): string {
  const delimiters = [',', ';', '\t', '|'];
  const counts: Record<string, number> = {};

  // Count occurrences of each delimiter in first few lines
  const lines = sample.split('\n').slice(0, 5);

  for (const delim of delimiters) {
    let total = 0;
    const lineCounts: number[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const count = (line.match(new RegExp(`\\${delim}`, 'g')) || []).length;
      lineCounts.push(count);
      total += count;
    }

    // Check consistency - delimiter should appear same number of times per line
    const avg = total / lineCounts.length;
    const variance =
      lineCounts.reduce((sum, count) => sum + Math.abs(count - avg), 0) /
      lineCounts.length;

    // Prefer delimiter with high count and low variance
    counts[delim] = variance < 1 ? total : 0;
  }

  // Return delimiter with highest count
  let maxDelim = ',';
  let maxCount = 0;

  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxDelim = delim;
    }
  }

  return maxDelim;
}

/**
 * Parse CSV line respecting quotes and escaping
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Push last field
  result.push(current.trim());

  return result;
}

/**
 * Detect header row index
 * Looks for row with most non-numeric, non-empty values
 */
function detectHeaderRow(lines: string[], delimiter: string): number {
  let bestIndex = 0;
  let bestScore = 0;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = parseCSVLine(line, delimiter);
    if (fields.length < 2) continue;

    // Score: non-empty, non-numeric fields
    let score = 0;
    for (const field of fields) {
      if (field.length === 0) continue;
      if (!/^\d+\.?\d*$/.test(field)) score++;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Parse CSV content to sheet data
 */
function parseCSVContent(content: string): SheetData {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Detect delimiter
  const sample = lines.slice(0, 5).join('\n');
  const delimiter = detectDelimiter(sample);

  // Detect header row
  const headerIndex = detectHeaderRow(lines, delimiter);
  const headerLine = lines[headerIndex];
  const headers = parseCSVLine(headerLine, delimiter);

  // Parse data rows
  const rows: Array<Record<string, unknown>> = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line, delimiter);
    const row: Record<string, unknown> = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = values[j] || '';
      row[header] = value;
    }

    rows.push(row);
  }

  return {
    sheetName: 'CSV',
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Extract rows from sheet data
 */
function extractRows(
  sheetData: SheetData,
  config?: ExtractionConfig
): ParsedRow[] {
  const { mapping, confidence } = mapColumns(sheetData.headers);

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
      const detectedCurrency = detectCurrency(priceValue as string | number).currency || defaultCurrency;

      // Extract optional fields
      const brand = mapping.brand
        ? String(sourceRow[mapping.brand] || '').trim() || undefined
        : undefined;

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

      // Filter brand if it looks like SKU
      let filteredBrand = brand;
      if (brand) {
        const brandResult = extractBrandFromColumn(brand, mapping.brand || undefined);
        filteredBrand = brandResult.brand || undefined;
      }

      // Build parsed row
      const parsedRow: Partial<ParsedRow> = {
        rowNum,
        supplier_sku,
        name,
        brand: filteredBrand,
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
 * Extract data from CSV file
 */
export async function extractFromCSV(
  fileContent: string | Buffer,
  filename: string,
  config?: ExtractionConfig
): Promise<{ sheetData: SheetData; rows: ParsedRow[] }> {
  const content =
    typeof fileContent === 'string'
      ? fileContent
      : fileContent.toString('utf-8');

  const sheetData = parseCSVContent(content);
  const rows = extractRows(sheetData, config);

  return { sheetData, rows };
}
