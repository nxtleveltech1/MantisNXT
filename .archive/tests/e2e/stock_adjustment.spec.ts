import { test, expect } from '@playwright/test';

// Lightweight e2e using request context; ensures endpoint exists and basic guardrails work
test('adjustments endpoint rejects invalid payload', async ({ request }) => {
  const res = await request.post('/api/inventory/adjustments', {
    data: { inventoryItemId: 'non-existent', delta: -999999, reason: 'bad' }
  });
  expect([400, 500]).toContain(res.status());
});

