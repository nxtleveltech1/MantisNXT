import {
  assertCamelItem,
  deriveStockStatus,
  totalAvailable,
  bySku,
} from '@/lib/stores/inventory-store';

describe('inventory-store (camelCase only)', () => {
  const good = {
    id: '1',
    sku: 'SKU-1',
    currentStock: 10,
    reservedStock: 2,
    availableStock: 8,
    costPrice: 5.5,
    salePrice: 9.99,
    supplierId: null,
    brandId: null,
  };

  it('accepts valid camelCase shapes', () => {
    expect(() => assertCamelItem(good)).not.toThrow();
  });

  it('rejects snake_case shapes', () => {
    const bad = {
      id: '2',
      sku: 'SKU-2',
      current_stock: 10,
      reserved_stock: 2,
      available_stock: 8,
    } as any;
    expect(() => assertCamelItem(bad)).toThrow(/INVENTORY_SHAPE_ERROR/);
  });

  it('derives stock status', () => {
    expect(deriveStockStatus(0, 3, 10)).toBe('out_of_stock');
    expect(deriveStockStatus(2, 3, 10)).toBe('low_stock');
    expect(deriveStockStatus(12, 3, 10)).toBe('overstocked');
    expect(deriveStockStatus(5, 3, 10)).toBe('in_stock');
  });

  it('aggregations', () => {
    const total = totalAvailable([good, { ...good, id: '2', sku: 'SKU-2', availableStock: 1 }]);
    expect(total).toBe(9);
    const map = bySku([good as any]);
    expect(map['SKU-1'].id).toBe('1');
  });
});
