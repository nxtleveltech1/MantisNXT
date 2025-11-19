import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { 
  applyPricelistRulesToExcel,
  getSupplierRules,
  logRuleExecution,
  extractBrandFromSheetName,
  applyJoinSheetsConfig,
  applySheetLoopConfig,
  applyVatPolicyConfig,
  normalizeHeadersWithAliases
} from '@/lib/cmm/supplier-rules-engine-enhanced'
import * as XLSX from 'xlsx'
import { query } from '@/lib/database'

// Mock dependencies
jest.mock('@/lib/database')
jest.mock('xlsx')

describe('Supplier Rules Engine', () => {
  const mockQuery = query as jest.MockedFunction<typeof query>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSupplierRules', () => {
    it('should fetch rules for supplier and trigger event', async () => {
      const mockRules = [
        {
          id: 1,
          supplier_id: 'supplier-123',
          rule_name: 'Test Rule',
          rule_type: 'transformation',
          trigger_event: 'pricelist_upload',
          execution_order: 1,
          is_blocking: false,
          rule_config: { test: 'config' }
        }
      ]

      mockQuery.mockResolvedValueOnce({ rows: mockRules } as any)

      const result = await getSupplierRules('supplier-123', 'pricelist_upload')

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM supplier_rules'),
        ['supplier-123', 'pricelist_upload']
      )
      expect(result).toEqual(mockRules)
    })

    it('should return empty array when no rules found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any)

      const result = await getSupplierRules('supplier-456', 'pricelist_upload')

      expect(result).toEqual([])
    })
  })

  describe('extractBrandFromSheetName', () => {
    it('should extract brand from sheet name', () => {
      expect(extractBrandFromSheetName('BrandName_Pricelist_Q1')).toBe('BrandName')
      expect(extractBrandFromSheetName('DECKSAVER_2024')).toBe('DECKSAVER')
      expect(extractBrandFromSheetName('Brand-Name-Products')).toBe('Brand-Name')
    })

    it('should return null for generic sheet names', () => {
      expect(extractBrandFromSheetName('Sheet1')).toBeNull()
      expect(extractBrandFromSheetName('Data')).toBeNull()
      expect(extractBrandFromSheetName('')).toBeNull()
    })
  })

  describe('normalizeHeadersWithAliases', () => {
    it('should normalize headers using aliases mapping', () => {
      const headers = ['SKU / MODEL', 'Product Description', 'COST  EX VAT', 'BRAND']
      const result = normalizeHeadersWithAliases(headers)

      expect(result).toEqual({
        'SKU / MODEL': 'supplier_sku',
        'Product Description': 'name',
        'COST  EX VAT': 'cost_price_ex_vat',
        'BRAND': 'brand'
      })
    })

    it('should handle case-insensitive matching', () => {
      const headers = ['sku', 'description', 'price', 'category']
      const result = normalizeHeadersWithAliases(headers)

      expect(result).toEqual({
        'sku': 'supplier_sku',
        'description': 'name',
        'price': 'cost_price_ex_vat',
        'category': 'category_raw'
      })
    })
  })

  describe('applyJoinSheetsConfig', () => {
    it('should join sheets according to configuration', () => {
      const workbook = {
        SheetNames: ['Products', 'Prices', 'Stock'],
        Sheets: {
          'Products': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name', 'Category'],
            ['SKU001', 'Product 1', 'Cat A'],
            ['SKU002', 'Product 2', 'Cat B']
          ]),
          'Prices': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Price', 'Currency'],
            ['SKU001', '100.00', 'ZAR'],
            ['SKU002', '200.00', 'ZAR']
          ]),
          'Stock': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Stock'],
            ['SKU001', '50'],
            ['SKU002', '25']
          ])
        }
      }

      const config = {
        left_sheet: 'Products',
        right_sheet: 'Prices',
        left_key: 'SKU',
        right_key: 'SKU',
        right_columns: ['Price', 'Currency']
      }

      const result = applyJoinSheetsConfig(workbook as any, config)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        SKU: 'SKU001',
        Name: 'Product 1',
        Category: 'Cat A',
        Price: '100.00',
        Currency: 'ZAR'
      })
    })

    it('should handle missing sheets gracefully', () => {
      const workbook = {
        SheetNames: ['Products'],
        Sheets: {
          'Products': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name'],
            ['SKU001', 'Product 1']
          ])
        }
      }

      const config = {
        left_sheet: 'Products',
        right_sheet: 'MissingSheet',
        left_key: 'SKU',
        right_key: 'SKU',
        right_columns: ['Price']
      }

      const result = applyJoinSheetsConfig(workbook as any, config)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        SKU: 'SKU001',
        Name: 'Product 1'
      })
    })
  })

  describe('applySheetLoopConfig', () => {
    it('should process multiple sheets with loop configuration', () => {
      const workbook = {
        SheetNames: ['Brand1', 'Brand2', 'Brand3'],
        Sheets: {
          'Brand1': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name', 'Price'],
            ['SKU001', 'Product 1', '100.00']
          ]),
          'Brand2': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name', 'Price'],
            ['SKU002', 'Product 2', '200.00']
          ]),
          'Brand3': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name', 'Price'],
            ['SKU003', 'Product 3', '300.00']
          ])
        }
      }

      const config = {
        sheet_pattern: 'Brand*',
        brand_from_sheet_name: true,
        mappings: {
          SKU: 'supplier_sku',
          Name: 'name',
          Price: 'cost_price_ex_vat'
        }
      }

      const result = applySheetLoopConfig(workbook as any, config)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        supplier_sku: 'SKU001',
        name: 'Product 1',
        cost_price_ex_vat: '100.00',
        brand: 'Brand1'
      })
      expect(result[1]).toEqual({
        supplier_sku: 'SKU002',
        name: 'Product 2',
        cost_price_ex_vat: '200.00',
        brand: 'Brand2'
      })
    })

    it('should handle drop_right configuration', () => {
      const workbook = {
        SheetNames: ['Sheet1', 'Sheet2', 'Sheet3', 'Sheet4'],
        Sheets: {
          'Sheet1': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name'],
            ['SKU001', 'Product 1']
          ]),
          'Sheet2': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name'],
            ['SKU002', 'Product 2']
          ]),
          'Sheet3': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name'],
            ['SKU003', 'Product 3']
          ]),
          'Sheet4': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name'],
            ['SKU004', 'Product 4']
          ])
        }
      }

      const config = {
        sheet_pattern: 'Sheet*',
        drop_right: 1, // Drop the last sheet
        mappings: {
          SKU: 'supplier_sku',
          Name: 'name'
        }
      }

      const result = applySheetLoopConfig(workbook as any, config)

      expect(result).toHaveLength(3) // Should exclude Sheet4
      expect(result.map(r => r.supplier_sku)).toEqual(['SKU001', 'SKU002', 'SKU003'])
    })
  })

  describe('applyVatPolicyConfig', () => {
    it('should apply VAT policy to rows', () => {
      const rows = [
        { supplier_sku: 'SKU001', name: 'Product 1', cost_price_ex_vat: 100.00 },
        { supplier_sku: 'SKU002', name: 'Product 2', price_incl_vat: 230.00 },
        { supplier_sku: 'SKU003', name: 'Product 3' } // No price
      ]

      const config = {
        rate: 0.15,
        mode: 'detect' as const
      }

      const result = applyVatPolicyConfig(rows, config)

      expect(result.rows).toHaveLength(3)
      expect(result.rows[0].cost_price_ex_vat).toBe(100.00)
      expect(result.rows[0].price_incl_vat).toBe(115.00)
      expect(result.rows[0].vat_rate).toBe(0.15)
      
      expect(result.rows[1].cost_price_ex_vat).toBe(200.00) // Derived
      expect(result.rows[1].price_incl_vat).toBe(230.00)
      expect(result.rows[1].vat_rate).toBe(0.15)
      
      expect(result.rows[2].cost_price_ex_vat).toBeNull()
      expect(result.warnings).toHaveLength(1)
    })
  })

  describe('applyPricelistRulesToExcel', () => {
    it('should apply transformation rules to Excel workbook', async () => {
      const mockBuffer = Buffer.from('mock excel data')
      const mockSupplierId = 'supplier-123'

      // Mock supplier rules
      const mockRules = [
        {
          id: 1,
          supplier_id: mockSupplierId,
          rule_name: 'Join Products and Prices',
          rule_type: 'transformation' as const,
          trigger_event: 'pricelist_upload',
          execution_order: 1,
          is_blocking: false,
          rule_config: {
            type: 'join_sheets',
            config: {
              left_sheet: 'Products',
              right_sheet: 'Prices',
              left_key: 'SKU',
              right_key: 'SKU',
              right_columns: ['Price', 'Currency']
            }
          }
        },
        {
          id: 2,
          supplier_id: mockSupplierId,
          rule_name: 'Apply VAT Policy',
          rule_type: 'transformation' as const,
          trigger_event: 'pricelist_upload',
          execution_order: 2,
          is_blocking: false,
          rule_config: {
            type: 'vat_policy',
            config: {
              rate: 0.15,
              mode: 'detect'
            }
          }
        }
      ]

      // Mock XLSX reading
      const mockWorkbook = {
        SheetNames: ['Products', 'Prices'],
        Sheets: {
          'Products': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name', 'Category'],
            ['SKU001', 'Product 1', 'Cat A'],
            ['SKU002', 'Product 2', 'Cat B']
          ]),
          'Prices': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Price', 'Currency'],
            ['SKU001', '100.00', 'ZAR'],
            ['SKU002', '200.00', 'ZAR']
          ])
        }
      }

      jest.spyOn(XLSX, 'read').mockReturnValue(mockWorkbook as any)
      mockQuery.mockResolvedValueOnce({ rows: mockRules } as any)

      const result = await applyPricelistRulesToExcel(mockBuffer, mockSupplierId)

      expect(result.rows).toHaveLength(2)
      expect(result.executionLog).toHaveLength(2)
      expect(result.executionLog[0]).toMatchObject({
        ruleId: 1,
        ruleName: 'Join Products and Prices',
        ruleType: 'transformation',
        passed: true,
        blocked: false
      })
      expect(result.executionLog[1]).toMatchObject({
        ruleId: 2,
        ruleName: 'Apply VAT Policy',
        ruleType: 'transformation',
        passed: true,
        blocked: false
      })
    })

    it('should handle sheet_loop transformation', async () => {
      const mockBuffer = Buffer.from('mock excel data')
      const mockSupplierId = 'supplier-456'

      const mockRules = [
        {
          id: 1,
          supplier_id: mockSupplierId,
          rule_name: 'Process Brand Sheets',
          rule_type: 'transformation' as const,
          trigger_event: 'pricelist_upload',
          execution_order: 1,
          is_blocking: false,
          rule_config: {
            type: 'sheet_loop',
            config: {
              sheet_pattern: 'Brand*',
              brand_from_sheet_name: true,
              mappings: {
                SKU: 'supplier_sku',
                Name: 'name',
                Price: 'cost_price_ex_vat'
              }
            }
          }
        }
      ]

      const mockWorkbook = {
        SheetNames: ['Brand1', 'Brand2'],
        Sheets: {
          'Brand1': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name', 'Price'],
            ['SKU001', 'Product 1', '100.00']
          ]),
          'Brand2': XLSX.utils.aoa_to_sheet([
            ['SKU', 'Name', 'Price'],
            ['SKU002', 'Product 2', '200.00']
          ])
        }
      }

      jest.spyOn(XLSX, 'read').mockReturnValue(mockWorkbook as any)
      mockQuery.mockResolvedValueOnce({ rows: mockRules } as any)

      const result = await applyPricelistRulesToExcel(mockBuffer, mockSupplierId)

      expect(result.rows).toHaveLength(2)
      expect(result.rows[0].brand).toBe('Brand1')
      expect(result.rows[1].brand).toBe('Brand2')
      expect(result.executionLog[0].passed).toBe(true)
    })

    it('should handle blocking rules that fail', async () => {
      const mockBuffer = Buffer.from('mock excel data')
      const mockSupplierId = 'supplier-789'

      const mockRules = [
        {
          id: 1,
          supplier_id: mockSupplierId,
          rule_name: 'Validation Rule',
          rule_type: 'validation' as const,
          trigger_event: 'pricelist_upload',
          execution_order: 1,
          is_blocking: true,
          rule_config: {
            type: 'validation',
            config: {
              field: 'supplier_sku',
              required: true,
              warning_message: 'SKU is required'
            }
          }
        }
      ]

      const mockWorkbook = {
        SheetNames: ['Products'],
        Sheets: {
          'Products': XLSX.utils.aoa_to_sheet([
            ['Name', 'Price'], // Missing SKU column
            ['Product 1', '100.00']
          ])
        }
      }

      jest.spyOn(XLSX, 'read').mockReturnValue(mockWorkbook as any)
      mockQuery.mockResolvedValueOnce({ rows: mockRules } as any)

      const result = await applyPricelistRulesToExcel(mockBuffer, mockSupplierId)

      expect(result.executionLog[0].passed).toBe(false)
      expect(result.executionLog[0].blocked).toBe(true)
      expect(result.executionLog[0].errorMessage).toContain('SKU is required')
    })
  })

  describe('logRuleExecution', () => {
    it('should log rule execution to database', async () => {
      const mockRule = {
        id: 1,
        ruleName: 'Test Rule',
        ruleType: 'transformation' as const,
        executionOrder: 1,
        supplierId: 'supplier-123',
        triggerEvent: 'pricelist_upload' as const,
        ruleConfig: {},
        isBlocking: false
      }

      const executionResult = {
        ruleId: 1,
        ruleName: 'Test Rule',
        ruleType: 'transformation',
        passed: true,
        blocked: false,
        executionTimeMs: 150,
        transformedData: { test: 'data' },
        errorMessage: null
      }

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'exec-123' }] } as any)

      await logRuleExecution('supplier-123', 'upload-456', mockRule, executionResult)

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO supplier_rule_executions'),
        expect.arrayContaining([
          'supplier-123',
          'upload-456',
          1,
          'Test Rule',
          'transformation',
          1,
          true,
          false,
          null,
          JSON.stringify({ test: 'data' }),
          150
        ])
      )
    })
  })
})