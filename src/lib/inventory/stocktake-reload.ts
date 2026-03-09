import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

export interface StockTakeInputRow {
  sku: string;
  productName: string;
  location: string;
  uom: string;
  qoh: number;
}

export interface StockTakeParseResult {
  rows: StockTakeInputRow[];
  totalRawRows: number;
  totalValidRows: number;
  totalAfterDedup: number;
  duplicatesResolved: number;
  uniqueSkuCount: number;
  locationBreakdown: Record<string, number>;
  headerMap: {
    skuHeader: string;
    nameHeader: string;
    locationHeader: string | null;
    uomHeader: string | null;
    qohHeader: string;
  };
}

export const STOCK_TAKE_LOCATION_MAP: Record<string, string> = {
  'NXT/NXT STOCK': 'NXT Main Stock',
  'NXT/NXT STOCK/Rental': 'NXT Rental',
  'NXT/NXT STOCK/Repairs': 'NXT Repairs',
  'NXT/NXT STOCK/Secondhand': 'NXT Secondhand',
  'NXT/NXT STOCK/Studio Rentals': 'NXT Studio Rentals',
};

function findHeader(headers: string[], patterns: string[]): string | undefined {
  return headers.find(header =>
    patterns.some(pattern => header.toLowerCase().includes(pattern.toLowerCase()))
  );
}

function normalizeQty(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0;
  const parsed = parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseStockTakeWorkbook(filePath: string): StockTakeParseResult {
  const workbook = XLSX.read(readFileSync(filePath), { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheets found in workbook');

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false });
  if (rawRows.length === 0) throw new Error('No data rows found in workbook');

  const headers = Object.keys(rawRows[0]);
  const skuHeader = findHeader(headers, ['SKU']);
  const nameHeader = findHeader(headers, ['Product Name', 'Description', 'Descirption']);
  const locationHeader = findHeader(headers, ['Location']) ?? null;
  const uomHeader = findHeader(headers, ['UOM']) ?? null;
  const qohHeader = findHeader(headers, ['QOH', 'Qty', 'Quantity', 'SOH']);

  if (!skuHeader || !nameHeader || !qohHeader) {
    throw new Error(
      `Required columns missing. Need SKU, product name/description, quantity/QOH. Found headers: ${headers.join(', ')}`
    );
  }

  const validRows: StockTakeInputRow[] = [];
  for (const row of rawRows) {
    const sku = String(row[skuHeader] ?? '').trim();
    const productName = String(row[nameHeader] ?? '').trim();
    const location = String(
      (locationHeader ? row[locationHeader] : 'NXT/NXT STOCK') ?? 'NXT/NXT STOCK'
    ).trim();
    const uom = String((uomHeader ? row[uomHeader] : 'Unit') ?? 'Unit').trim();
    const qoh = normalizeQty(row[qohHeader]);

    if (!sku || !productName || qoh <= 0) continue;
    validRows.push({ sku, productName, location: location || 'NXT/NXT STOCK', uom, qoh });
  }

  const dedupMap = new Map<string, StockTakeInputRow>();
  for (const row of validRows) {
    const key = `${row.sku}|||${row.location}`;
    const existing = dedupMap.get(key);
    if (!existing) {
      dedupMap.set(key, { ...row });
      continue;
    }
    existing.qoh += row.qoh;
  }

  const rows = Array.from(dedupMap.values()).sort((a, b) => {
    const skuCompare = a.sku.localeCompare(b.sku);
    if (skuCompare !== 0) return skuCompare;
    return a.location.localeCompare(b.location);
  });

  const locationBreakdown: Record<string, number> = {};
  for (const row of rows) {
    locationBreakdown[row.location] = (locationBreakdown[row.location] ?? 0) + 1;
  }

  return {
    rows,
    totalRawRows: rawRows.length,
    totalValidRows: validRows.length,
    totalAfterDedup: rows.length,
    duplicatesResolved: validRows.length - rows.length,
    uniqueSkuCount: new Set(rows.map(r => r.sku)).size,
    locationBreakdown,
    headerMap: {
      skuHeader,
      nameHeader,
      locationHeader,
      uomHeader,
      qohHeader,
    },
  };
}

export function sqlStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
