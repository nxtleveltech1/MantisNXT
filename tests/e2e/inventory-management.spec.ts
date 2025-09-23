import { test, expect, Page } from '@playwright/test'
import { createTestXLSXBuffer, createBulkUploadScenario } from '../fixtures/factories'

// Test data setup
const testUser = {
  email: 'admin@test.com',
  password: 'password123',
  role: 'admin'
}

const testInventoryItem = {
  sku: 'E2E-TEST-001',
  name: 'E2E Test Item',
  description: 'Item created by E2E test',
  category: 'Electronics',
  currentStock: 25,
  reorderPoint: 10,
  maxStock: 100,
  minStock: 5,
  unitCost: 99.99,
  unitPrice: 149.99,
  currency: 'USD',
  unit: 'pcs'
}

// Helper functions
async function loginUser(page: Page) {
  await page.goto('/login')
  await page.fill('[data-testid="email-input"]', testUser.email)
  await page.fill('[data-testid="password-input"]', testUser.password)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL('/dashboard')
}

async function navigateToInventory(page: Page) {
  await page.click('[data-testid="nav-inventory"]')
  await page.waitForURL('/inventory')
  await page.waitForSelector('[data-testid="inventory-table"]')
}

async function createTestFile(type: 'valid' | 'invalid' | 'large' = 'valid'): Promise<Buffer> {
  switch (type) {
    case 'valid':
      return createBulkUploadScenario(10, false)
    case 'invalid':
      return createBulkUploadScenario(10, true) // Include errors
    case 'large':
      return createBulkUploadScenario(1000, false)
    default:
      return createBulkUploadScenario(10, false)
  }
}

test.describe('Inventory Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login and navigate to inventory
    await loginUser(page)
    await navigateToInventory(page)
  })

  test.describe('Basic Inventory Operations', () => {
    test('should display inventory items in table', async ({ page }) => {
      // Check that inventory table is displayed
      await expect(page.locator('[data-testid="inventory-table"]')).toBeVisible()

      // Check table headers
      await expect(page.locator('th:has-text("SKU")')).toBeVisible()
      await expect(page.locator('th:has-text("Name")')).toBeVisible()
      await expect(page.locator('th:has-text("Category")')).toBeVisible()
      await expect(page.locator('th:has-text("Stock")')).toBeVisible()
      await expect(page.locator('th:has-text("Status")')).toBeVisible()

      // Check that at least one item is displayed
      await expect(page.locator('[data-testid="inventory-row"]').first()).toBeVisible()
    })

    test('should create new inventory item', async ({ page }) => {
      // Click add item button
      await page.click('[data-testid="add-item-button"]')
      await page.waitForSelector('[data-testid="add-item-dialog"]')

      // Fill item details
      await page.fill('[data-testid="sku-input"]', testInventoryItem.sku)
      await page.fill('[data-testid="name-input"]', testInventoryItem.name)
      await page.fill('[data-testid="description-input"]', testInventoryItem.description)

      // Select category
      await page.click('[data-testid="category-select"]')
      await page.click(`[data-value="${testInventoryItem.category}"]`)

      // Fill stock information
      await page.fill('[data-testid="current-stock-input"]', testInventoryItem.currentStock.toString())
      await page.fill('[data-testid="reorder-point-input"]', testInventoryItem.reorderPoint.toString())
      await page.fill('[data-testid="max-stock-input"]', testInventoryItem.maxStock.toString())
      await page.fill('[data-testid="min-stock-input"]', testInventoryItem.minStock.toString())

      // Fill pricing
      await page.fill('[data-testid="unit-cost-input"]', testInventoryItem.unitCost.toString())
      await page.fill('[data-testid="unit-price-input"]', testInventoryItem.unitPrice.toString())

      // Submit form
      await page.click('[data-testid="save-item-button"]')

      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Item created successfully')

      // Verify item appears in table
      await expect(page.locator(`[data-testid="inventory-row"]:has-text("${testInventoryItem.sku}")`)).toBeVisible()
    })

    test('should edit existing inventory item', async ({ page }) => {
      // Find first item and click edit
      const firstRow = page.locator('[data-testid="inventory-row"]').first()
      await firstRow.locator('[data-testid="item-actions"]').click()
      await page.click('[data-testid="edit-item"]')

      await page.waitForSelector('[data-testid="edit-item-dialog"]')

      // Update name
      const newName = 'Updated Item Name'
      await page.fill('[data-testid="name-input"]', newName)

      // Update stock
      await page.fill('[data-testid="current-stock-input"]', '50')

      // Submit changes
      await page.click('[data-testid="save-item-button"]')

      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Item updated successfully')

      // Verify changes in table
      await expect(page.locator(`[data-testid="inventory-row"]:has-text("${newName}")`)).toBeVisible()
      await expect(page.locator(`[data-testid="inventory-row"]:has-text("50")`)).toBeVisible()
    })

    test('should delete inventory item', async ({ page }) => {
      // Get initial row count
      const initialCount = await page.locator('[data-testid="inventory-row"]').count()

      // Find first item and delete
      const firstRow = page.locator('[data-testid="inventory-row"]').first()
      const itemSku = await firstRow.locator('[data-testid="item-sku"]').textContent()

      await firstRow.locator('[data-testid="item-actions"]').click()
      await page.click('[data-testid="delete-item"]')

      // Confirm deletion
      await page.click('[data-testid="confirm-delete"]')

      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Item deleted successfully')

      // Verify item is removed from table
      await expect(page.locator(`[data-testid="inventory-row"]:has-text("${itemSku}")`)).not.toBeVisible()

      // Verify row count decreased
      await expect(page.locator('[data-testid="inventory-row"]')).toHaveCount(initialCount - 1)
    })
  })

  test.describe('Search and Filtering', () => {
    test('should search inventory items by name', async ({ page }) => {
      // Enter search query
      await page.fill('[data-testid="search-input"]', 'Test Item')
      await page.press('[data-testid="search-input"]', 'Enter')

      // Wait for results
      await page.waitForTimeout(1000)

      // Verify filtered results
      const rows = page.locator('[data-testid="inventory-row"]')
      const count = await rows.count()

      for (let i = 0; i < count; i++) {
        const rowText = await rows.nth(i).textContent()
        expect(rowText?.toLowerCase()).toContain('test item')
      }
    })

    test('should filter by category', async ({ page }) => {
      // Open category filter
      await page.click('[data-testid="category-filter"]')
      await page.click('[data-value="Electronics"]')

      // Wait for results
      await page.waitForTimeout(1000)

      // Verify all items are in Electronics category
      const categoryColumns = page.locator('[data-testid="item-category"]')
      const count = await categoryColumns.count()

      for (let i = 0; i < count; i++) {
        await expect(categoryColumns.nth(i)).toContainText('Electronics')
      }
    })

    test('should filter by stock status', async ({ page }) => {
      // Filter for low stock items
      await page.click('[data-testid="status-filter"]')
      await page.click('[data-value="low_stock"]')

      // Wait for results
      await page.waitForTimeout(1000)

      // Verify all items have low stock status
      const statusBadges = page.locator('[data-testid="item-status"]')
      const count = await statusBadges.count()

      for (let i = 0; i < count; i++) {
        await expect(statusBadges.nth(i)).toContainText('Low Stock')
      }
    })

    test('should combine multiple filters', async ({ page }) => {
      // Apply category filter
      await page.click('[data-testid="category-filter"]')
      await page.click('[data-value="Electronics"]')

      // Apply status filter
      await page.click('[data-testid="status-filter"]')
      await page.click('[data-value="active"]')

      // Add search term
      await page.fill('[data-testid="search-input"]', 'laptop')
      await page.press('[data-testid="search-input"]', 'Enter')

      // Wait for results
      await page.waitForTimeout(1000)

      // Verify combined filtering
      const rows = page.locator('[data-testid="inventory-row"]')
      const count = await rows.count()

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const row = rows.nth(i)
          await expect(row.locator('[data-testid="item-category"]')).toContainText('Electronics')
          await expect(row.locator('[data-testid="item-status"]')).toContainText('Active')

          const rowText = await row.textContent()
          expect(rowText?.toLowerCase()).toContain('laptop')
        }
      }
    })

    test('should clear all filters', async ({ page }) => {
      // Apply some filters
      await page.click('[data-testid="category-filter"]')
      await page.click('[data-value="Electronics"]')
      await page.fill('[data-testid="search-input"]', 'test')

      // Clear filters
      await page.click('[data-testid="clear-filters"]')

      // Verify filters are cleared
      await expect(page.locator('[data-testid="search-input"]')).toHaveValue('')
      await expect(page.locator('[data-testid="category-filter"]')).toContainText('All Categories')
      await expect(page.locator('[data-testid="status-filter"]')).toContainText('All Statuses')
    })
  })

  test.describe('Sorting and Pagination', () => {
    test('should sort by column headers', async ({ page }) => {
      // Click on Name column to sort
      await page.click('[data-testid="sort-name"]')

      // Wait for sorting to apply
      await page.waitForTimeout(1000)

      // Verify ascending sort indicator
      await expect(page.locator('[data-testid="sort-name"] [data-testid="sort-asc"]')).toBeVisible()

      // Get first few item names to verify sorting
      const names = await page.locator('[data-testid="item-name"]').allTextContents()
      const sortedNames = [...names].sort()
      expect(names.slice(0, 3)).toEqual(sortedNames.slice(0, 3))

      // Click again for descending sort
      await page.click('[data-testid="sort-name"]')
      await page.waitForTimeout(1000)

      // Verify descending sort indicator
      await expect(page.locator('[data-testid="sort-name"] [data-testid="sort-desc"]')).toBeVisible()
    })

    test('should navigate through pages', async ({ page }) => {
      // Check if pagination is visible (depends on data volume)
      const pagination = page.locator('[data-testid="pagination"]')

      if (await pagination.isVisible()) {
        // Check current page
        await expect(page.locator('[data-testid="current-page"]')).toContainText('1')

        // Go to next page if available
        const nextButton = page.locator('[data-testid="next-page"]')
        if (await nextButton.isEnabled()) {
          await nextButton.click()
          await page.waitForTimeout(1000)
          await expect(page.locator('[data-testid="current-page"]')).toContainText('2')

          // Go back to previous page
          await page.click('[data-testid="prev-page"]')
          await page.waitForTimeout(1000)
          await expect(page.locator('[data-testid="current-page"]')).toContainText('1')
        }
      }
    })

    test('should change items per page', async ({ page }) => {
      // Change page size
      await page.click('[data-testid="page-size-select"]')
      await page.click('[data-value="10"]')

      // Wait for table to update
      await page.waitForTimeout(1000)

      // Verify table shows max 10 items
      const rowCount = await page.locator('[data-testid="inventory-row"]').count()
      expect(rowCount).toBeLessThanOrEqual(10)
    })
  })

  test.describe('Bulk Upload Workflow', () => {
    test('should complete successful bulk upload', async ({ page }) => {
      // Open upload wizard
      await page.click('[data-testid="bulk-upload-button"]')
      await page.waitForSelector('[data-testid="upload-wizard"]')

      // Create and upload test file
      const testFile = await createTestFile('valid')

      // Set up file chooser handler
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('[data-testid="file-upload-button"]')
      const fileChooser = await fileChooserPromise

      // Create a temporary file for upload
      const path = require('path')
      const fs = require('fs')
      const tempFilePath = path.join(__dirname, 'temp-upload.xlsx')
      fs.writeFileSync(tempFilePath, testFile)

      await fileChooser.setFiles(tempFilePath)

      // Wait for file processing
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 })

      // Navigate to preview tab
      await page.click('[data-testid="tab-preview"]')
      await expect(page.locator('[data-testid="data-preview"]')).toBeVisible()

      // Verify data preview shows correct number of items
      const previewRows = await page.locator('[data-testid="preview-row"]').count()
      expect(previewRows).toBe(10)

      // Navigate to validation tab
      await page.click('[data-testid="tab-validation"]')
      await expect(page.locator('[data-testid="validation-results"]')).toBeVisible()
      await expect(page.locator('[data-testid="validation-success"]')).toContainText('All items valid')

      // Navigate to import tab and start import
      await page.click('[data-testid="tab-import"]')
      await page.click('[data-testid="start-import-button"]')

      // Wait for import completion
      await expect(page.locator('[data-testid="import-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 30000 })

      // Verify import results
      await expect(page.locator('[data-testid="import-summary"]')).toContainText('10 items imported')

      // Close wizard and verify items in table
      await page.click('[data-testid="close-wizard"]')
      await page.waitForTimeout(2000)

      // Clean up temporary file
      fs.unlinkSync(tempFilePath)
    })

    test('should handle upload validation errors', async ({ page }) => {
      // Open upload wizard
      await page.click('[data-testid="bulk-upload-button"]')
      await page.waitForSelector('[data-testid="upload-wizard"]')

      // Create file with validation errors
      const testFile = await createTestFile('invalid')

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('[data-testid="file-upload-button"]')
      const fileChooser = await fileChooserPromise

      const path = require('path')
      const fs = require('fs')
      const tempFilePath = path.join(__dirname, 'temp-upload-invalid.xlsx')
      fs.writeFileSync(tempFilePath, testFile)

      await fileChooser.setFiles(tempFilePath)

      // Wait for processing
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 })

      // Navigate to validation tab
      await page.click('[data-testid="tab-validation"]')
      await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible()

      // Verify error details are shown
      await expect(page.locator('[data-testid="error-count"]')).toContainText(/\d+ errors/)
      await expect(page.locator('[data-testid="error-list"]')).toBeVisible()

      // Try to fix errors
      await page.click('[data-testid="fix-errors-button"]')
      await expect(page.locator('[data-testid="error-editor"]')).toBeVisible()

      // Clean up
      await page.click('[data-testid="cancel-upload"]')
      fs.unlinkSync(tempFilePath)
    })

    test('should handle large file uploads', async ({ page }) => {
      // Set longer timeout for large file test
      test.setTimeout(60000)

      await page.click('[data-testid="bulk-upload-button"]')
      await page.waitForSelector('[data-testid="upload-wizard"]')

      // Create large test file
      const testFile = await createTestFile('large')

      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('[data-testid="file-upload-button"]')
      const fileChooser = await fileChooserPromise

      const path = require('path')
      const fs = require('fs')
      const tempFilePath = path.join(__dirname, 'temp-upload-large.xlsx')
      fs.writeFileSync(tempFilePath, testFile)

      await fileChooser.setFiles(tempFilePath)

      // Wait for processing with extended timeout
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 30000 })

      // Verify large dataset preview
      await page.click('[data-testid="tab-preview"]')
      await expect(page.locator('[data-testid="item-count"]')).toContainText('1000 items')

      // Cancel import for large file (to avoid test database pollution)
      await page.click('[data-testid="cancel-upload"]')
      fs.unlinkSync(tempFilePath)
    })
  })

  test.describe('Stock Management', () => {
    test('should adjust stock levels', async ({ page }) => {
      // Find item and open stock adjustment
      const firstRow = page.locator('[data-testid="inventory-row"]').first()
      const currentStock = await firstRow.locator('[data-testid="item-stock"]').textContent()
      const currentStockNum = parseInt(currentStock || '0')

      await firstRow.locator('[data-testid="item-actions"]').click()
      await page.click('[data-testid="adjust-stock"]')

      await page.waitForSelector('[data-testid="stock-adjustment-dialog"]')

      // Add 10 units
      await page.fill('[data-testid="adjustment-quantity"]', '10')
      await page.selectOption('[data-testid="adjustment-type"]', 'increase')
      await page.fill('[data-testid="adjustment-reason"]', 'E2E Test Adjustment')
      await page.fill('[data-testid="adjustment-notes"]', 'Testing stock adjustment functionality')

      // Submit adjustment
      await page.click('[data-testid="submit-adjustment"]')

      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Stock adjusted successfully')

      // Verify stock update in table
      await page.waitForTimeout(1000)
      const newStock = await firstRow.locator('[data-testid="item-stock"]').textContent()
      const newStockNum = parseInt(newStock || '0')
      expect(newStockNum).toBe(currentStockNum + 10)
    })

    test('should show stock alerts for low stock items', async ({ page }) => {
      // Check if alerts section is visible
      await expect(page.locator('[data-testid="stock-alerts"]')).toBeVisible()

      // Click on low stock filter to see low stock items
      await page.click('[data-testid="status-filter"]')
      await page.click('[data-value="low_stock"]')

      // Verify low stock items are displayed with warning indicators
      const lowStockRows = page.locator('[data-testid="inventory-row"][data-status="low_stock"]')
      const count = await lowStockRows.count()

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          await expect(lowStockRows.nth(i).locator('[data-testid="low-stock-indicator"]')).toBeVisible()
        }
      }
    })

    test('should display stock movement history', async ({ page }) => {
      // Click on first item to view details
      await page.locator('[data-testid="inventory-row"]').first().click()
      await page.waitForSelector('[data-testid="item-details-dialog"]')

      // Navigate to stock movements tab
      await page.click('[data-testid="tab-stock-movements"]')
      await expect(page.locator('[data-testid="stock-movements-table"]')).toBeVisible()

      // Verify movement columns
      await expect(page.locator('th:has-text("Date")')).toBeVisible()
      await expect(page.locator('th:has-text("Type")')).toBeVisible()
      await expect(page.locator('th:has-text("Quantity")')).toBeVisible()
      await expect(page.locator('th:has-text("Reason")')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error by intercepting requests
      await page.route('**/api/inventory', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        })
      })

      // Try to create new item
      await page.click('[data-testid="add-item-button"]')
      await page.waitForSelector('[data-testid="add-item-dialog"]')

      await page.fill('[data-testid="sku-input"]', 'ERROR-TEST-001')
      await page.fill('[data-testid="name-input"]', 'Error Test Item')
      await page.click('[data-testid="save-item-button"]')

      // Verify error message is displayed
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Server error occurred')
    })

    test('should handle network errors', async ({ page }) => {
      // Simulate network failure
      await page.context().setOffline(true)

      // Try to refresh inventory
      await page.click('[data-testid="refresh-inventory"]')

      // Verify offline error message
      await expect(page.locator('[data-testid="network-error"]')).toContainText('Network connection error')

      // Restore network
      await page.context().setOffline(false)
    })

    test('should validate form inputs', async ({ page }) => {
      await page.click('[data-testid="add-item-button"]')
      await page.waitForSelector('[data-testid="add-item-dialog"]')

      // Try to submit with invalid data
      await page.fill('[data-testid="sku-input"]', '') // Empty SKU
      await page.fill('[data-testid="current-stock-input"]', '-10') // Negative stock
      await page.fill('[data-testid="unit-cost-input"]', 'invalid') // Invalid price

      await page.click('[data-testid="save-item-button"]')

      // Verify validation errors
      await expect(page.locator('[data-testid="sku-error"]')).toContainText('SKU is required')
      await expect(page.locator('[data-testid="stock-error"]')).toContainText('Stock cannot be negative')
      await expect(page.locator('[data-testid="cost-error"]')).toContainText('Invalid price format')
    })
  })

  test.describe('Performance and Accessibility', () => {
    test('should load inventory page within performance budget', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/inventory')
      await page.waitForSelector('[data-testid="inventory-table"]')

      const loadTime = Date.now() - startTime

      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })

    test('should be keyboard accessible', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab') // Focus first interactive element
      await page.keyboard.press('Tab') // Navigate to next element

      // Verify focus is visible
      const focusedElement = await page.locator(':focus')
      await expect(focusedElement).toBeVisible()

      // Test Enter key on buttons
      await page.keyboard.press('Enter')

      // Test Escape key to close dialogs
      if (await page.locator('[role="dialog"]').isVisible()) {
        await page.keyboard.press('Escape')
        await expect(page.locator('[role="dialog"]')).not.toBeVisible()
      }
    })

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check table accessibility
      await expect(page.locator('[data-testid="inventory-table"]')).toHaveAttribute('role', 'table')

      // Check button accessibility
      const buttons = page.locator('button')
      const buttonCount = await buttons.count()

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i)
        const hasAriaLabel = await button.getAttribute('aria-label')
        const hasText = await button.textContent()

        // Button should have either aria-label or text content
        expect(hasAriaLabel || hasText).toBeTruthy()
      }
    })
  })
})