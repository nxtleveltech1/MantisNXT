/**
 * Inventory File Upload API v2 - XLSX/CSV import with validation and bulk operations
 */

import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { ApiMiddleware, RequestContext } from '@/lib/api/middleware'
import { CreateInventoryItemSchema, EnhancedInventoryItem } from '@/lib/api/validation'

// Import XLSX converter utilities from existing component
type SupplierDataRow = {
  supplier_name: string
  brand: string
  category: string
  sku: string
  description: string
  price: number
  vat_rate: number
  stock_qty: number
  [key: string]: string | number | boolean | undefined
}

interface FileProcessingResult {
  success: boolean
  data: EnhancedInventoryItem[]
  errors: Array<{
    row: number
    field: string
    value: any
    message: string
    severity: 'error' | 'warning'
  }>
  warnings: Array<{
    row: number
    field: string
    value: any
    message: string
    suggestion?: string
  }>
  summary: {
    totalRows: number
    processedRows: number
    createdItems: number
    updatedItems: number
    skippedRows: number
    duplicates: number
    errors: number
    warnings: number
  }
  mapping: Record<string, string>
}

// Semantic field mapping for automatic column detection
class SemanticMapper {
  private static fieldPatterns: Record<string, string[]> = {
    sku: ['sku', 'item_code', 'product_code', 'part_number', 'item_id', 'product_id', 'code'],
    name: ['name', 'product_name', 'item_name', 'title', 'product_title', 'description'],
    description: ['description', 'product_description', 'item_description', 'details'],
    category: ['category', 'type', 'class', 'group', 'product_category', 'item_category'],
    subcategory: ['subcategory', 'subtype', 'subclass', 'sub_category', 'product_type'],
    currentStock: ['stock', 'quantity', 'qty', 'current_stock', 'on_hand', 'inventory'],
    unitCost: ['cost', 'unit_cost', 'cost_price', 'purchase_price'],
    unitPrice: ['price', 'unit_price', 'selling_price', 'retail_price', 'list_price'],
    reorderPoint: ['reorder_point', 'min_level', 'minimum_stock', 'reorder_level'],
    maxStock: ['max_stock', 'maximum_stock', 'max_level', 'max_quantity'],
    minStock: ['min_stock', 'minimum_stock', 'min_level', 'min_quantity'],
    supplierId: ['supplier_id', 'vendor_id', 'supplier_code'],
    supplierName: ['supplier', 'vendor', 'supplier_name', 'vendor_name'],
    supplierSku: ['supplier_sku', 'vendor_sku', 'supplier_code'],
    unit: ['unit', 'uom', 'unit_of_measure', 'measurement_unit'],
    weight: ['weight', 'mass'],
    currency: ['currency', 'curr'],
    tags: ['tags', 'keywords', 'labels'],
    notes: ['notes', 'comments', 'remarks']
  }

  static generateMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {}
    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))

    for (const [targetField, patterns] of Object.entries(this.fieldPatterns)) {
      let bestMatch = { header: '', confidence: 0, index: -1 }

      normalizedHeaders.forEach((header, index) => {
        const confidence = this.calculateConfidence(header, patterns)
        if (confidence > bestMatch.confidence) {
          bestMatch = { header: headers[index], confidence, index }
        }
      })

      if (bestMatch.confidence > 0.5) {
        mapping[targetField] = bestMatch.header
      }
    }

    return mapping
  }

  private static calculateConfidence(header: string, patterns: string[]): number {
    const headerNorm = header.toLowerCase()

    // Exact match
    if (patterns.includes(headerNorm)) return 1.0

    // Partial match scoring
    let maxScore = 0
    for (const pattern of patterns) {
      if (headerNorm.includes(pattern) || pattern.includes(headerNorm)) {
        const score = Math.max(
          pattern.length / headerNorm.length,
          headerNorm.length / pattern.length
        ) * 0.8
        maxScore = Math.max(maxScore, score)
      }
    }

    return maxScore
  }
}

function processExcelData(
  data: any[][],
  headers: string[],
  mapping: Record<string, string>,
  options: {
    hasHeaders?: boolean
    skipEmptyRows?: boolean
    validateData?: boolean
    updateExisting?: boolean
    supplierFilter?: string
  } = {}
): FileProcessingResult {
  const errors: FileProcessingResult['errors'] = []
  const warnings: FileProcessingResult['warnings'] = []
  const processedItems: EnhancedInventoryItem[] = []
  const seenSkus = new Set<string>()
  let duplicates = 0
  let skippedRows = 0

  // Skip header row if present
  const dataRows = options.hasHeaders ? data.slice(1) : data

  dataRows.forEach((row, index) => {
    const rowNum = index + (options.hasHeaders ? 2 : 1) // +1 for 1-based indexing, +1 more if headers

    // Skip empty rows
    if (options.skipEmptyRows && row.every(cell => !cell || cell.toString().trim() === '')) {
      skippedRows++
      return
    }

    try {
      // Map row data to inventory item fields
      const itemData: Partial<EnhancedInventoryItem> = {}
      const rowErrors: typeof errors = []

      // Process each mapped field
      for (const [targetField, sourceHeader] of Object.entries(mapping)) {
        const colIndex = headers.indexOf(sourceHeader)
        if (colIndex === -1) continue

        const cellValue = row[colIndex]
        if (cellValue === undefined || cellValue === null || cellValue === '') continue

        try {
          switch (targetField) {
            case 'sku':
              itemData.sku = cellValue.toString().trim().toUpperCase()
              break
            case 'name':
              itemData.name = cellValue.toString().trim()
              break
            case 'description':
              itemData.description = cellValue.toString().trim()
              break
            case 'category':
              itemData.category = cellValue.toString().trim()
              break
            case 'subcategory':
              itemData.subcategory = cellValue.toString().trim()
              break
            case 'currentStock':
              const stock = Number(cellValue)
              if (isNaN(stock) || stock < 0) {
                rowErrors.push({
                  row: rowNum,
                  field: 'currentStock',
                  value: cellValue,
                  message: 'Invalid stock quantity',
                  severity: 'error'
                })
              } else {
                itemData.currentStock = Math.floor(stock)
              }
              break
            case 'unitCost':
              const cost = Number(cellValue.toString().replace(/[^\d.-]/g, ''))
              if (isNaN(cost) || cost < 0) {
                rowErrors.push({
                  row: rowNum,
                  field: 'unitCost',
                  value: cellValue,
                  message: 'Invalid unit cost',
                  severity: 'error'
                })
              } else {
                itemData.unitCost = cost
              }
              break
            case 'unitPrice':
              const price = Number(cellValue.toString().replace(/[^\d.-]/g, ''))
              if (isNaN(price) || price < 0) {
                rowErrors.push({
                  row: rowNum,
                  field: 'unitPrice',
                  value: cellValue,
                  message: 'Invalid unit price',
                  severity: 'error'
                })
              } else {
                itemData.unitPrice = price
              }
              break
            case 'reorderPoint':
            case 'maxStock':
            case 'minStock':
              const num = Number(cellValue)
              if (isNaN(num) || num < 0) {
                warnings.push({
                  row: rowNum,
                  field: targetField,
                  value: cellValue,
                  message: `Invalid ${targetField} value, using default`,
                  suggestion: 'Ensure numeric values are provided'
                })
                itemData[targetField] = 0
              } else {
                itemData[targetField] = Math.floor(num)
              }
              break
            case 'supplierName':
              itemData.supplierName = cellValue.toString().trim()
              break
            case 'supplierSku':
              itemData.supplierSku = cellValue.toString().trim()
              break
            case 'unit':
              itemData.unit = cellValue.toString().trim() || 'pcs'
              break
            case 'currency':
              const curr = cellValue.toString().trim().toUpperCase()
              if (curr.length === 3) {
                itemData.currency = curr
              } else {
                warnings.push({
                  row: rowNum,
                  field: 'currency',
                  value: cellValue,
                  message: 'Invalid currency format, using USD',
                  suggestion: 'Use 3-letter currency codes (e.g., USD, EUR)'
                })
                itemData.currency = 'USD'
              }
              break
            case 'weight':
              const weight = Number(cellValue)
              if (!isNaN(weight) && weight >= 0) {
                itemData.weight = weight
              }
              break
            case 'tags':
              if (typeof cellValue === 'string') {
                itemData.tags = cellValue.split(',').map(tag => tag.trim()).filter(Boolean)
              }
              break
            case 'notes':
              itemData.notes = cellValue.toString().trim()
              break
          }
        } catch (fieldError) {
          rowErrors.push({
            row: rowNum,
            field: targetField,
            value: cellValue,
            message: `Processing error: ${fieldError instanceof Error ? fieldError.message : 'Unknown error'}`,
            severity: 'error'
          })
        }
      }

      // Add row errors to main errors array
      errors.push(...rowErrors)

      // Skip row if critical errors
      if (rowErrors.some(e => e.severity === 'error')) {
        return
      }

      // Apply supplier filter if provided
      if (options.supplierFilter && itemData.supplierName?.toLowerCase() !== options.supplierFilter.toLowerCase()) {
        skippedRows++
        return
      }

      // Validate required fields
      if (!itemData.sku) {
        errors.push({
          row: rowNum,
          field: 'sku',
          value: '',
          message: 'SKU is required',
          severity: 'error'
        })
        return
      }

      if (!itemData.name) {
        errors.push({
          row: rowNum,
          field: 'name',
          value: '',
          message: 'Name is required',
          severity: 'error'
        })
        return
      }

      // Check for duplicate SKUs within file
      if (seenSkus.has(itemData.sku)) {
        duplicates++
        warnings.push({
          row: rowNum,
          field: 'sku',
          value: itemData.sku,
          message: 'Duplicate SKU found in file',
          suggestion: 'Only the first occurrence will be processed'
        })
        return
      }
      seenSkus.add(itemData.sku)

      // Set defaults for missing fields
      const newItem: EnhancedInventoryItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sku: itemData.sku,
        name: itemData.name,
        description: itemData.description || '',
        category: itemData.category || 'General',
        subcategory: itemData.subcategory,
        currentStock: itemData.currentStock || 0,
        reservedStock: 0,
        reorderPoint: itemData.reorderPoint || 0,
        maxStock: itemData.maxStock || 999999,
        minStock: itemData.minStock || 0,
        unitCost: itemData.unitCost || 0,
        unitPrice: itemData.unitPrice || 0,
        currency: itemData.currency || 'USD',
        unit: itemData.unit || 'pcs',
        weight: itemData.weight,
        supplierId: itemData.supplierId,
        supplierName: itemData.supplierName,
        supplierSku: itemData.supplierSku,
        primaryLocationId: 'loc_default',
        locations: [{
          id: 'loc_default',
          warehouseId: 'wh_default',
          warehouseName: 'Default Warehouse',
          locationCode: 'DEFAULT',
          quantity: itemData.currentStock || 0,
          reservedQuantity: 0,
          isDefault: true,
          isPrimary: true
        }],
        batchTracking: false,
        serialTracking: false,
        expirationTracking: false,
        lots: [],
        tags: itemData.tags || [],
        notes: itemData.notes,
        customFields: {},
        status: (itemData.currentStock || 0) > 0 ? 'active' : 'out_of_stock',
        isActive: true,
        lastStockUpdate: new Date().toISOString(),
        createdBy: 'system_import',
        updatedBy: 'system_import'
      }

      // Validate the complete item
      if (options.validateData) {
        try {
          CreateInventoryItemSchema.parse(newItem)
        } catch (validationError) {
          errors.push({
            row: rowNum,
            field: 'validation',
            value: '',
            message: `Validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`,
            severity: 'error'
          })
          return
        }
      }

      processedItems.push(newItem)

    } catch (rowError) {
      errors.push({
        row: rowNum,
        field: 'general',
        value: '',
        message: `Row processing error: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`,
        severity: 'error'
      })
    }
  })

  return {
    success: errors.filter(e => e.severity === 'error').length === 0,
    data: processedItems,
    errors,
    warnings,
    summary: {
      totalRows: dataRows.length,
      processedRows: processedItems.length,
      createdItems: processedItems.length, // Would differentiate between created/updated in real implementation
      updatedItems: 0,
      skippedRows,
      duplicates,
      errors: errors.filter(e => e.severity === 'error').length,
      warnings: warnings.length
    },
    mapping
  }
}

// POST /api/v2/inventory/upload - Upload and process XLSX/CSV files
export const POST = ApiMiddleware.withFileUpload({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ],
  maxFiles: 1
})(async (request: NextRequest, context: RequestContext, files: File[]) => {
  try {
    const file = files[0]

    // Parse form data for additional options
    const formData = await request.formData()
    const options = {
      hasHeaders: formData.get('hasHeaders') !== 'false',
      skipEmptyRows: formData.get('skipEmptyRows') !== 'false',
      validateData: formData.get('validateData') !== 'false',
      updateExisting: formData.get('updateExisting') === 'true',
      supplierFilter: formData.get('supplierFilter')?.toString(),
      autoMapping: formData.get('autoMapping') !== 'false'
    }

    // Custom field mapping if provided
    let customMapping: Record<string, string> = {}
    const mappingData = formData.get('mapping')
    if (mappingData) {
      try {
        customMapping = JSON.parse(mappingData.toString())
      } catch (e) {
        return ApiMiddleware.createErrorResponse(
          'Invalid mapping JSON format',
          400
        )
      }
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer()
    let workbook: XLSX.WorkBook
    let headers: string[] = []
    let data: any[][] = []

    try {
      if (file.type === 'text/csv') {
        // Handle CSV files
        const text = new TextDecoder().decode(arrayBuffer)
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length < 1) {
          throw new Error('File appears to be empty')
        }

        headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
        data = lines.map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')))
      } else {
        // Handle Excel files
        workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const worksheetName = workbook.SheetNames[0]

        if (!worksheetName) {
          throw new Error('No worksheets found in file')
        }

        const worksheet = workbook.Sheets[worksheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length < 1) {
          throw new Error('Worksheet appears to be empty')
        }

        data = jsonData as any[][]
        headers = options.hasHeaders ? (data[0] as string[]) : []
      }

      if (headers.length === 0) {
        return ApiMiddleware.createErrorResponse(
          'No headers found in file',
          400,
          { suggestion: 'Ensure the file has a header row with column names' }
        )
      }

      // Generate field mapping
      let mapping = customMapping
      if (options.autoMapping && Object.keys(customMapping).length === 0) {
        mapping = SemanticMapper.generateMapping(headers)
      }

      if (Object.keys(mapping).length === 0) {
        return ApiMiddleware.createErrorResponse(
          'No field mappings could be determined',
          400,
          {
            availableHeaders: headers,
            suggestion: 'Provide custom field mapping or ensure headers match expected patterns'
          }
        )
      }

      // Process the data
      const result = processExcelData(data, headers, mapping, options)

      // If validation enabled and errors found, return errors without saving
      if (options.validateData && !result.success) {
        return ApiMiddleware.createSuccessResponse(
          {
            processed: false,
            preview: result.data.slice(0, 10), // Show first 10 items as preview
            ...result
          },
          'File processed with errors - review and retry',
          { processingTime: Date.now() - Date.now() }
        )
      }

      // Save processed items to database (mock implementation)
      // In production, this would be a database transaction
      let createdCount = 0
      let updatedCount = 0
      const saveErrors: Array<{ sku: string; error: string }> = []

      for (const item of result.data) {
        try {
          // Check if item already exists
          const existingIndex = mockInventoryData.findIndex(existing => existing.sku === item.sku)

          if (existingIndex >= 0) {
            if (options.updateExisting) {
              // Update existing item
              mockInventoryData[existingIndex] = {
                ...mockInventoryData[existingIndex],
                ...item,
                id: mockInventoryData[existingIndex].id, // Keep original ID
                updatedBy: context.user?.email,
                updatedAt: new Date().toISOString()
              }
              updatedCount++
            } else {
              saveErrors.push({
                sku: item.sku,
                error: 'SKU already exists (set updateExisting=true to update)'
              })
            }
          } else {
            // Create new item
            item.createdBy = context.user?.email
            item.updatedBy = context.user?.email
            mockInventoryData.push(item)
            createdCount++
          }
        } catch (saveError) {
          saveErrors.push({
            sku: item.sku,
            error: saveError instanceof Error ? saveError.message : 'Unknown save error'
          })
        }
      }

      const finalResult = {
        ...result,
        summary: {
          ...result.summary,
          createdItems: createdCount,
          updatedItems: updatedCount,
          saveErrors: saveErrors.length
        },
        saveErrors: saveErrors.length > 0 ? saveErrors : undefined,
        processed: true
      }

      return ApiMiddleware.createSuccessResponse(
        finalResult,
        `File processed successfully: ${createdCount} created, ${updatedCount} updated`
      )

    } catch (fileError) {
      return ApiMiddleware.createErrorResponse(
        'File processing failed',
        400,
        {
          error: fileError instanceof Error ? fileError.message : 'Unknown file error',
          fileInfo: {
            name: file.name,
            size: file.size,
            type: file.type
          }
        }
      )
    }

  } catch (error) {
    console.error('Upload processing error:', error)
    throw error
  }
})

// GET /api/v2/inventory/upload/template - Download import template
export const GET = ApiMiddleware.withAuth(
  async (request: NextRequest, context: RequestContext) => {
    try {
      const { searchParams } = new URL(request.url)
      const format = searchParams.get('format') || 'xlsx'

      // Define template structure
      const templateHeaders = [
        'sku',
        'name',
        'description',
        'category',
        'subcategory',
        'currentStock',
        'reorderPoint',
        'maxStock',
        'minStock',
        'unitCost',
        'unitPrice',
        'currency',
        'unit',
        'supplierName',
        'supplierSku',
        'weight',
        'tags',
        'notes'
      ]

      // Sample data
      const sampleData = [
        [
          'SAMPLE-001',
          'Sample Product 1',
          'This is a sample product for demonstration',
          'Electronics',
          'Components',
          100,
          20,
          500,
          10,
          15.99,
          24.99,
          'USD',
          'pcs',
          'Sample Supplier',
          'SUPP-SAMPLE-001',
          0.5,
          'sample,demo,test',
          'Sample notes'
        ],
        [
          'SAMPLE-002',
          'Sample Product 2',
          'Another sample product',
          'Office Supplies',
          'Stationery',
          50,
          10,
          200,
          5,
          5.50,
          9.99,
          'USD',
          'pcs',
          'Office Supplies Inc',
          'OSI-SAMPLE-002',
          0.1,
          'office,supplies',
          'Keep in dry storage'
        ]
      ]

      if (format === 'csv') {
        // Generate CSV
        const csvContent = [
          templateHeaders.join(','),
          ...sampleData.map(row => row.join(','))
        ].join('\n')

        return new Response(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="inventory_import_template.csv"'
          }
        })
      } else {
        // Generate Excel file
        const workbook = XLSX.utils.book_new()
        const worksheet = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleData])

        // Set column widths
        const columnWidths = templateHeaders.map(header => ({ width: Math.max(header.length, 15) }))
        worksheet['!cols'] = columnWidths

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Import')

        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        return new Response(excelBuffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="inventory_import_template.xlsx"'
          }
        })
      }

    } catch (error) {
      console.error('Template generation error:', error)
      throw error
    }
  },
  { requiredPermissions: ['read'] }
)

// Make mock data available for other modules
export const mockInventoryData: EnhancedInventoryItem[] = []
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Deprecated. Use /api/inventory/products or /api/upload/xlsx', deprecated: true, redirectTo: '/api/upload/xlsx' },
    { status: 410 }
  )
}
