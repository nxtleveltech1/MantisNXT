// @ts-nocheck

import type {
  PriceListCsvRowRaw,
  PriceListRow,
  PriceListMapping,
  PriceListValidationError,
  PriceListParseResult,
  PriceListBuildResult,
  PriceListField,
} from '@/types/pricelist';

const requiredFields: PriceListField[] = ['sku', 'unitCost'];

const numeric = (v: unknown): number | undefined => {
  if (v == null) return undefined;
  if (typeof v === 'number') return isFinite(v) ? v : undefined;
  const s = String(v).replace(/[,\s]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const parseDate = (v: unknown): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? undefined : d;
};

export function detectHeaders(fileText: string): PriceListParseResult {
  const [headerLine, ...bodyLines] = fileText.split(/\r?\n/).filter(l => l.trim().length > 0);
  const headers = headerLine.split(',').map(h => h.trim());
  const rowsRaw: PriceListCsvRowRaw[] = bodyLines.map(line => {
    const values = line.split(',');
    const row: PriceListCsvRowRaw = {};
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim();
    });
    return row;
  });

  const lower = headers.map(h => h.toLowerCase());
  const mappingGuess: Partial<PriceListMapping> = {
    sku:
      headers[lower.findIndex(h => ['sku', 'item_sku', 'product_sku'].includes(h))] ?? headers[0],
    unitCost:
      headers[lower.findIndex(h => ['unitcost', 'cost', 'price', 'unit_cost'].includes(h))] ??
      headers[1],
    supplierSku:
      headers[lower.findIndex(h => ['suppliersku', 'vendor_sku', 'supplier_sku'].includes(h))],
    supplierId:
      headers[lower.findIndex(h => ['supplierid', 'vendor_id', 'supplier_id'].includes(h))],
    supplierName:
      headers[
        lower.findIndex(h => ['supplier', 'suppliername', 'vendor', 'vendor_name'].includes(h))
      ],
    currency: headers[lower.findIndex(h => ['currency', 'curr'].includes(h))],
    unit: headers[lower.findIndex(h => ['unit', 'uom'].includes(h))],
    minQty: headers[lower.findIndex(h => ['minqty', 'min_qty', 'moq'].includes(h))],
    effectiveDate:
      headers[lower.findIndex(h => ['effectivedate', 'effective_date', 'start_date'].includes(h))],
    notes: headers[lower.findIndex(h => ['notes', 'comment', 'remarks'].includes(h))],
  };

  return { headers, mapping: mappingGuess, rowsRaw };
}

export function buildPriceList(
  rowsRaw: PriceListCsvRowRaw[],
  mapping: PriceListMapping
): PriceListBuildResult {
  const errors: PriceListValidationError[] = [];
  const rows: PriceListRow[] = [];

  rowsRaw.forEach((raw, idx) => {
    const rowIndex = idx + 1;
    const get = (k?: string) => (k ? raw[k] : undefined);

    const sku = String(get(mapping.sku) ?? '').trim();
    const unitCostVal = numeric(get(mapping.unitCost));

    if (!sku) {
      errors.push({ rowIndex, field: 'sku', error: 'Missing SKU' });
    }
    if (unitCostVal == null) {
      errors.push({
        rowIndex,
        field: 'unitCost',
        value: String(get(mapping.unitCost) ?? ''),
        error: 'Invalid unit cost',
      });
    }

    const row: PriceListRow = {
      supplierId: String(get(mapping.supplierId) ?? '').trim() || undefined,
      supplierName: String(get(mapping.supplierName) ?? '').trim() || undefined,
      sku,
      supplierSku: String(get(mapping.supplierSku) ?? '').trim() || undefined,
      unitCost: unitCostVal ?? 0,
      currency: String(get(mapping.currency) ?? '').trim() || undefined,
      unit: String(get(mapping.unit) ?? '').trim() || undefined,
      minQty: numeric(get(mapping.minQty)),
      effectiveDate: parseDate(get(mapping.effectiveDate)),
      notes: String(get(mapping.notes) ?? '').trim() || undefined,
    };

    rows.push(row);
  });

  const invalidSet = new Set(errors.map(e => e.rowIndex));
  const valid = rowsRaw.length - invalidSet.size;

  return {
    rows,
    errors,
    total: rowsRaw.length,
    valid,
    invalid: invalidSet.size,
  };
}
