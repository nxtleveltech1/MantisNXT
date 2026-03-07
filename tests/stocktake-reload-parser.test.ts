import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import * as XLSX from 'xlsx';

import { parseStockTakeWorkbook } from '../src/lib/inventory/stocktake-reload';

function writeWorkbook(rows: Record<string, unknown>[]): string {
  const tmp = mkdtempSync(join(tmpdir(), 'stocktake-test-'));
  const file = join(tmp, 'input.xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, file);
  return file;
}

test('parseStockTakeWorkbook deduplicates SKU/location and sums quantity', () => {
  const file = writeWorkbook([
    {
      SKU: 'ABC-1',
      'Product Name - Descirption': 'Alpha',
      Location: 'NXT/NXT STOCK',
      UOM: 'Unit',
      QOH: '2',
    },
    {
      SKU: 'ABC-1',
      'Product Name - Descirption': 'Alpha',
      Location: 'NXT/NXT STOCK',
      UOM: 'Unit',
      QOH: '3',
    },
    {
      SKU: 'XYZ-2',
      'Product Name - Descirption': 'Beta',
      Location: 'NXT/NXT STOCK/Rental',
      UOM: 'Unit',
      QOH: '1',
    },
  ]);

  try {
    const result = parseStockTakeWorkbook(file);
    assert.equal(result.totalRawRows, 3);
    assert.equal(result.totalValidRows, 3);
    assert.equal(result.totalAfterDedup, 2);
    assert.equal(result.duplicatesResolved, 1);

    const abc = result.rows.find(r => r.sku === 'ABC-1' && r.location === 'NXT/NXT STOCK');
    assert.ok(abc);
    assert.equal(abc.qoh, 5);
  } finally {
    rmSync(file.replace(/input\.xlsx$/, ''), { recursive: true, force: true });
  }
});

test('parseStockTakeWorkbook ignores invalid rows and fails on missing required headers', () => {
  const file = writeWorkbook([
    { SKU: 'A', Description: 'Alpha', Qty: '0' },
    { SKU: '', Description: 'Blank SKU', Qty: '2' },
    { SKU: 'B', Description: '', Qty: '2' },
    { SKU: 'C', Description: 'Valid', Qty: '4' },
  ]);

  try {
    const result = parseStockTakeWorkbook(file);
    assert.equal(result.totalAfterDedup, 1);
    assert.equal(result.rows[0].sku, 'C');
    assert.equal(result.rows[0].qoh, 4);
  } finally {
    rmSync(file.replace(/input\.xlsx$/, ''), { recursive: true, force: true });
  }

  const badFile = writeWorkbook([{ Wrong: 'x', Columns: 'y' }]);
  try {
    assert.throws(() => parseStockTakeWorkbook(badFile), /Required columns missing/);
  } finally {
    rmSync(badFile.replace(/input\.xlsx$/, ''), { recursive: true, force: true });
  }
});
