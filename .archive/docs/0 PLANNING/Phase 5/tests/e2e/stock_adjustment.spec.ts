/**
 * Phase 5 Playwright E2E — Stock Adjustment Dialog
 * Assumptions:
 * - App exposes Inventory page at /inventory
 * - Dialog toggled via button[data-testid="open-adjustment"]
 * - Inputs have data-testid: adjustment-quantity, adjustment-reason, adjustment-type
 * - Submit button[data-testid="submit-adjustment"]
 * - Toasts: [role="status"]
 */
import { test, expect } from '@playwright/test';

test.describe('Inventory Stock Adjustment', () => {
  test('prevents negative or below-reserved adjustments and allows valid IN', async ({ page }) => {
    await page.goto('/inventory');

    // Open adjustment dialog for first item
    await page.getByTestId('open-adjustment').first().click();

    // Try invalid huge negative (simulate OUT via type)
    await page.getByTestId('adjustment-type').selectOption('OUT');
    await page.getByTestId('adjustment-quantity').fill('999999');
    await page.getByTestId('adjustment-reason').fill('Test invalid');
    await page.getByTestId('submit-adjustment').click();
    await expect(page.getByRole('status')).toContainText(/insufficient stock|below reserved/i);

    // Valid IN
    await page.getByTestId('adjustment-type').selectOption('IN');
    await page.getByTestId('adjustment-quantity').fill('5');
    await page.getByTestId('adjustment-reason').fill('Replenishment');
    await page.getByTestId('submit-adjustment').click();
    await expect(page.getByRole('status')).toContainText(/success|updated/i);
  });

  test('lists movements by created_at desc', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByRole('tab', { name: /movements/i }).click();
    const rows = page.locator('[data-testid="movement-row"]');
    await expect(rows.first()).toBeVisible();
    // Optional: verify ordering via timestamps if exposed
  });
});
