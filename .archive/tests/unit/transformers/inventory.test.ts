import { toDisplay, type DbInventoryRow } from '@/lib/utils/transformers/inventory';

describe('inventory transformer', () => {
  it('maps snake_case DB row to camelCase display model', () => {
    const row: DbInventoryRow = {
      id: 'x',
      sku: 'ABC-123',
      stock_qty: 10,
      reserved_qty: 4,
      available_qty: 6,
      cost_price: 12.5,
      sale_price: 20,
      supplier_id: 'sup-1',
      brand_id: null,
    };
    const out = toDisplay(row);
    expect(out).toEqual({
      id: 'x',
      sku: 'ABC-123',
      currentStock: 10,
      reservedStock: 4,
      availableStock: 6,
      costPrice: 12.5,
      salePrice: 20,
      supplierId: 'sup-1',
      brandId: null,
    });
  });
});
