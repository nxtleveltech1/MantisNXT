import { describe, it, expect } from '@jest/globals'
import { validateRows } from '@/app/api/spp/agent/route'

describe('Agent Route Validation', () => {
  describe('validateRows', () => {
    it('should validate canonical schema requirements', async () => {
      const rows = [
        {
          supplier_sku: 'SKU001',
          name: 'Product 1',
          cost_price_ex_vat: 100.00,
          category_raw: 'Category A',
          stock_on_hand: 50,
          vat_rate: 0.15
        },
        {
          supplier_sku: '', // Missing SKU
          name: 'Product 2',
          cost_price_ex_vat: 200.00
        },
        {
          supplier_sku: 'SKU003',
          name: '', // Missing name
          cost_price_ex_vat: 300.00
        },
        {
          supplier_sku: 'SKU004',
          name: 'Product 4',
          cost_price_ex_vat: 0 // Invalid price
        },
        {
          supplier_sku: 'SKU005',
          name: 'Product 5',
          cost_price_ex_vat: 500.00,
          category_raw: '', // Missing category (warning)
          stock_on_hand: null, // Missing stock (warning)
          vat_rate: null // Missing VAT (warning)
        }
      ]

      const result = await validateRows(rows, 'supplier-123', 'upload-456')
      
      expect(result.valid).toHaveLength(1) // Only first row is valid
      expect(result.errors).toHaveLength(3) // Rows 2, 3, 4 have errors
      expect(result.warnings).toHaveLength(3) // Row 5 has warnings

      // Check specific errors
      expect(result.errors).toContainEqual({
        row_num: 2,
        field: 'multiple',
        reason: 'Missing supplier_sku',
        proposed_fix: 'Check required fields'
      })

      expect(result.errors).toContainEqual({
        row_num: 3,
        field: 'multiple',
        reason: 'Missing name',
        proposed_fix: 'Check required fields'
      })

      expect(result.errors).toContainEqual({
        row_num: 4,
        field: 'multiple',
        reason: 'Missing or invalid cost_price_ex_vat',
        proposed_fix: 'Check required fields'
      })

      // Check warnings
      expect(result.warnings).toContainEqual({
        row_num: 5,
        message: 'Missing category_raw'
      })

      expect(result.warnings).toContainEqual({
        row_num: 5,
        message: 'Missing stock_on_hand'
      })

      expect(result.warnings).toContainEqual({
        row_num: 5,
        message: 'Missing vat_rate'
      })
    })

    it('should apply supplier validation rules', async () => {
      // Mock the database query for validation rules
      const mockQuery = jest.fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              rule_type: 'validation',
              rule_config: {
                field: 'barcode',
                required: true,
                warning_message: 'Barcode is required for this supplier'
              },
              is_blocking: true
            },
            {
              id: 2,
              rule_type: 'validation',
              rule_config: {
                field: 'brand',
                required: true,
                warning_message: 'Brand is recommended'
              },
              is_blocking: false
            }
          ]
        })
        .mockResolvedValueOnce({ rows: [] }) // No rules for other calls

      const originalQuery = require('@/lib/database').query
      require('@/lib/database').query = mockQuery

      const rows = [
        {
          supplier_sku: 'SKU001',
          name: 'Product 1',
          cost_price_ex_vat: 100.00,
          barcode: '1234567890123',
          brand: 'Brand A'
        },
        {
          supplier_sku: 'SKU002',
          name: 'Product 2',
          cost_price_ex_vat: 200.00,
          barcode: '', // Missing barcode (error)
          brand: 'Brand B'
        },
        {
          supplier_sku: 'SKU003',
          name: 'Product 3',
          cost_price_ex_vat: 300.00,
          barcode: '9876543210987',
          // Missing brand (warning)
        }
      ]

      const result = await validateRows(rows, 'supplier-123', 'upload-456')
      
      expect(result.valid).toHaveLength(1) // Only first row is valid
      expect(result.errors).toHaveLength(1) // Row 2 has blocking error
      expect(result.warnings).toHaveLength(1) // Row 3 has non-blocking warning

      expect(result.errors[0].reason).toContain('Barcode is required for this supplier')
      expect(result.warnings[0].message).toBe('Brand is recommended')

      require('@/lib/database').query = originalQuery
    })

    it('should handle empty input gracefully', async () => {
      const result = await validateRows([], 'supplier-123', 'upload-456')
      
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should handle database errors gracefully', async () => {
      const mockQuery = jest.fn().mockRejectedValue(new Error('Database connection failed'))
      
      const originalQuery = require('@/lib/database').query
      require('@/lib/database').query = mockQuery

      const rows = [
        {
          supplier_sku: 'SKU001',
          name: 'Product 1',
          cost_price_ex_vat: 100.00
        }
      ]

      // Should not throw, but return validation based on canonical schema only
      const result = await validateRows(rows, 'supplier-123', 'upload-456')
      
      expect(result.valid).toHaveLength(1) // Should still validate canonical schema
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)

      require('@/lib/database').query = originalQuery
    })
  })
})