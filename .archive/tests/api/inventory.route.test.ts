// Jest test for /api/inventory route
import type { NextRequest } from 'next/server';
import { GET as inventoryGET } from '@/app/api/inventory/route';

// Mock the DB pool used by the route
const mockRows = [
  {
    id: '1',
    sku: 'SKU-1',
    stock_qty: 5,
    reserved_qty: 2,
    available_qty: 3,
    cost_price: 10.5,
    sale_price: 12,
    supplier_id: null,
    brand_id: null,
  },
];

jest.mock('@/lib/database/unified-connection', () => {
  const connect = async () => ({
    query: async () => ({ rows: mockRows }),
    release: () => {},
  });
  return { pool: { connect } };
});

function mockReq(url: string) {
  return { nextUrl: new URL(url) } as unknown as NextRequest;
}

describe('/api/inventory', () => {
  it('returns display format by default', async () => {
    const res: any = await inventoryGET(mockReq('https://x.local/api/inventory'));
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toMatchObject({ currentStock: 5, availableStock: 3 });
    expect((data[0] as any).stock_qty).toBeUndefined();
  });

  it('returns raw format when requested', async () => {
    const res: any = await inventoryGET(mockReq('https://x.local/api/inventory?format=raw'));
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toMatchObject({ stock_qty: 5, available_qty: 3 });
    expect((data[0] as any).currentStock).toBeUndefined();
  });
});
