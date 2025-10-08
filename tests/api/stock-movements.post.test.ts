import { describe, it, expect, jest } from '@jest/globals';
import { POST as postMovement } from '@/app/api/stock-movements/route';

jest.mock('@/lib/cache/invalidation', () => ({ CacheInvalidator: { invalidateStockMovements: () => {} } }));
jest.mock('@/lib/database', () => {
  return {
    withTransaction: async (cb: any) => {
      const client = {
        query: jest.fn()
          .mockImplementationOnce(async () => ({ rowCount: 1, rows: [{ stock_qty: 10, reserved_qty: 0 }] }))
          .mockImplementationOnce(async () => ({ rows: [{ id: 'mv1', item_id: 'it1', movement_type: 'OUTBOUND', quantity: 2, reason: 'test', created_at: new Date().toISOString() }] }))
          .mockImplementationOnce(async () => ({ rowCount: 1 }))
      };
      return cb(client);
    },
  };
});

function mockReq(body: any) {
  return { json: async () => body } as any;
}

describe('POST /api/stock-movements', () => {
  it('creates outbound movement and updates stock atomically', async () => {
    const res: any = await postMovement(mockReq({ itemId: 'it1', type: 'outbound', quantity: 2, reason: 'test' }));
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
  });
});
