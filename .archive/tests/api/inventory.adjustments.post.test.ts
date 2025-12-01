import { describe, it, expect, jest } from '@jest/globals';
import { POST as postAdjust } from '@/app/api/inventory/adjustments/route';

jest.mock('@/lib/database', () => {
  return {
    withTransaction: async (cb: any) => {
      const client = {
        query: jest
          .fn()
          .mockImplementationOnce(async () => ({
            rowCount: 1,
            rows: [{ stock_qty: 5, reserved_qty: 0 }],
          }))
          .mockImplementationOnce(async () => ({ rowCount: 1 }))
          .mockImplementationOnce(async () => ({ rowCount: 1 })),
      };
      return cb(client);
    },
  };
});

function mockReq(body: any) {
  return { json: async () => body } as any;
}

describe('POST /api/inventory/adjustments', () => {
  it('adjusts stock by delta and records movement', async () => {
    const res: any = await postAdjust(
      mockReq({ inventoryItemId: 'it1', delta: 3, reason: 'audit' })
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
