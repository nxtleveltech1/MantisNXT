/**
 * Live Database XLSX Upload Route
 * Real-time integration with PostgreSQL for supplier price lists
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { z } from 'zod'
import * as XLSX from 'xlsx'
import { query, withTransaction } from '@/lib/database'
import { upsertSupplierProduct, setStock } from '@/services/ssot/inventoryService'

type InventorySummaryRow = {
  sku: string;
  id: string;
  name: string;
  cost_price: number | null;
  stock_qty: number | null;
};

type CategoryRow = { category: string | null };
type BrandRow = { brand: string | null };

// Enhanced validation schemas
const UploadSessionSchema = z.object({
  sessionId: z.string().min(1),
  supplierId: z.string().uuid(),
  filename: z.string().min(1),
  fileSize: z.number().min(1),
  totalRows: z.number().min(1)
})

const FieldMappingSchema = z.object({
  sku: z.string().min(1, 'SKU mapping is required'),
  name: z.string().min(1, 'Product name mapping is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category mapping is required'),
  brand: z.string().optional(),
  supplier_sku: z.string().optional(),
  cost_price: z.string().min(1, 'Cost price mapping is required'),
  sale_price: z.string().optional(),
  currency: z.string().optional(),
  stock_qty: z.string().min(1, 'Stock quantity mapping is required'),
  reorder_point: z.string().optional(),
  max_stock: z.string().optional(),
  unit: z.string().optional(),
  weight: z.string().optional(),
  barcode: z.string().optional(),
  location: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional()
})

const ProcessUploadSchema = z.object({
  sessionId: z.string().min(1),
  supplierId: z.string().uuid(),
  fieldMappings: FieldMappingSchema,
  conflictResolution: z.object({
    strategy: z.enum(['skip', 'update', 'merge', 'create_variant']),
    updateFields: z.array(z.string()).default([]),
    preserveFields: z.array(z.string()).default([])
  }),
  validationOptions: z.object({
    skipEmptyRows: z.boolean().default(true),
    validateSkus: z.boolean().default(true),
    checkDuplicates: z.boolean().default(true),
    validatePrices: z.boolean().default(true),
    normalizeText: z.boolean().default(true),
    createBackup: z.boolean().default(true)
  }).default({}),
  dryRun: z.boolean().default(false)
})

interface UploadSession {
  id: string
  supplierId: string
  supplierName: string
  filename: string
  fileSize: number
  totalRows: number
  processedRows: number
  validRows: number
  errorRows: number
  warningRows: number
  skippedRows: number
  status: 'uploading' | 'mapping' | 'validating' | 'importing' | 'completed' | 'failed' | 'rollback'
  progress: number
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  backupId?: string
  fieldMappings?: Record<string, string>
  validationResults?: ValidationResult
  importResults?: ImportResult
}

interface ValidationIssue {
  row: number
  field: string
  value: unknown
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion?: string
  autoFixAvailable?: boolean
}

interface ProcessedRow {
  id: string
  rowNumber: number
  originalData: Record<string, unknown>
  mappedData: Record<string, unknown>
  status: 'valid' | 'warning' | 'error' | 'skipped'
  issues: ValidationIssue[]
  action: 'create' | 'update' | 'skip'
  existingRecord?: unknown
  resolvedConflicts?: string[]
}

interface ValidationResult {
  isValid: boolean
  summary: {
    totalRows: number
    validRows: number
    errorRows: number
    warningRows: number
    skippedRows: number
    duplicatesFound: number
    conflictsResolved: number
    estimatedValue: number
    categories: Set<string>
    brands: Set<string>
  }
  issues: ValidationIssue[]
  processedRows: ProcessedRow[]
  recommendations: string[]
}

interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
  backupId?: string
  summary: {
    totalValue: number
    newCategories: number
    newBrands: number
    affectedSuppliers: number
  }
}

// GET /api/suppliers/pricelists/upload/live-route - Get upload session status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 })
    }

    // Get session from database
    const sessionResult = await query(`
      SELECT * FROM upload_sessions WHERE id = $1
    `, [sessionId])

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Upload session not found'
      }, { status: 404 })
    }

    const session = sessionResult.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        fieldMappings: session.field_mappings,
        validationResults: session.validation_results,
        importResults: session.import_results
      }
    })

  } catch (error) {
    console.error('Error retrieving upload session:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/suppliers/pricelists/upload/live-route - Create upload session or process upload
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')

    // Handle file upload (multipart/form-data)
    if (contentType?.includes('multipart/form-data')) {
      return handleFileUpload(request)
    }

    // Handle upload processing (application/json)
    return handleUploadProcessing(request)

  } catch (error) {
    console.error('Error in upload handler:', error)
    return NextResponse.json({
      success: false,
      error: 'Upload operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle file upload and create session
async function handleFileUpload(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const supplierId = formData.get('supplierId') as string

  if (!file || !supplierId) {
    return NextResponse.json({
      success: false,
      error: 'File and supplier ID are required'
    }, { status: 400 })
  }

  // Validate file type and size
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({
      success: false,
      error: 'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV files only'
    }, { status: 400 })
  }

  const maxSize = 25 * 1024 * 1024 // 25MB
  if (file.size > maxSize) {
    return NextResponse.json({
      success: false,
      error: 'File size exceeds 25MB limit'
    }, { status: 400 })
  }

  try {
    // Get supplier information
    const supplierResult = await query(
      'SELECT name, email FROM public.suppliers WHERE id = $1',
      [supplierId]
    )

    if (supplierResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Supplier not found'
      }, { status: 404 })
    }

    const supplier = supplierResult.rows[0]

    // Process file
    const arrayBuffer = await file.arrayBuffer()
    let data: unknown[][]
    let headers: string[]

    if (file.type === 'text/csv') {
      // Handle CSV
      const text = new TextDecoder().decode(arrayBuffer)
      const lines = text.split('\n').filter(line => line.trim())
      data = lines.map(line =>
        line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''))
      )
      headers = data[0]
      data = data.slice(1)
    } else {
      // Handle Excel
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      if (jsonData.length < 2) {
        return NextResponse.json({
          success: false,
          error: 'File must contain at least a header row and one data row'
        }, { status: 400 })
      }

      headers = jsonData[0] as string[]
      data = jsonData
        .slice(1)
        .filter((row): row is unknown[] => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map(row => row as unknown[])
    }

    // Create upload session in database
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await query(`
      INSERT INTO upload_sessions (
        id, supplier_id, supplier_name, filename, file_size, total_rows,
        status, progress, headers, sample_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'uploading', 100, $7, $8, NOW(), NOW())
    `, [
      sessionId,
      supplierId,
      supplier.name,
      file.name,
      file.size,
      data.length,
      JSON.stringify(headers),
      JSON.stringify(data.slice(0, 5)) // First 5 rows for preview
    ])

    // Store complete file data temporarily
    await query(`
      INSERT INTO upload_temp_data (session_id, data, created_at)
      VALUES ($1, $2, NOW())
    `, [sessionId, JSON.stringify({ headers, data })])

    // Generate automatic field mappings
    const autoMappings = generateAutoMappings(headers)

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        supplier: {
          id: supplierId,
          name: supplier.name,
          email: supplier.email
        },
        file: {
          name: file.name,
          size: file.size,
          totalRows: data.length
        },
        headers,
        sampleData: data.slice(0, 5),
        autoMappings,
        mappingConfidence: calculateMappingConfidence(autoMappings, headers)
      },
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('File processing error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 })
  }
}

// Handle upload processing with validation and conflict resolution
async function handleUploadProcessing(request: NextRequest): Promise<NextResponse> {
  const body = await request.json()
  const validatedData = ProcessUploadSchema.parse(body)

  return await withTransaction(async (client) => {
    // Get session from database
    const sessionResult = await client.query(
      'SELECT * FROM upload_sessions WHERE id = $1',
      [validatedData.sessionId]
    )

    if (sessionResult.rows.length === 0) {
      throw new Error('Upload session not found')
    }

    const session = sessionResult.rows[0]

    // Get file data
    const fileDataResult = await client.query(
      'SELECT data FROM upload_temp_data WHERE session_id = $1',
      [validatedData.sessionId]
    )

    if (fileDataResult.rows.length === 0) {
      throw new Error('File data not found')
    }

    const fileData = JSON.parse(fileDataResult.rows[0].data)

    // Update session status
    await client.query(`
      UPDATE upload_sessions
      SET status = 'validating', progress = 10, field_mappings = $2, updated_at = NOW()
      WHERE id = $1
    `, [validatedData.sessionId, JSON.stringify(validatedData.fieldMappings)])

    // Process and validate data
    const validationResult = await processAndValidateData(
      fileData.data,
      fileData.headers,
      validatedData.fieldMappings,
      validatedData.conflictResolution,
      validatedData.validationOptions,
      client
    )

    // Update session with validation results
    await client.query(`
      UPDATE upload_sessions
      SET validation_results = $2, valid_rows = $3, error_rows = $4,
          warning_rows = $5, skipped_rows = $6, progress = 75, status = 'importing', updated_at = NOW()
      WHERE id = $1
    `, [
      validatedData.sessionId,
      JSON.stringify(validationResult),
      validationResult.summary.validRows,
      validationResult.summary.errorRows,
      validationResult.summary.warningRows,
      validationResult.summary.skippedRows
    ])

    // If dry run, return validation results without importing
    if (validatedData.dryRun) {
      await client.query(`
        UPDATE upload_sessions SET status = 'validating', progress = 50, updated_at = NOW() WHERE id = $1
      `, [validatedData.sessionId])

      return NextResponse.json({
        success: true,
        data: {
          sessionId: validatedData.sessionId,
          validationResult,
          dryRun: true
        },
        message: 'Validation completed (dry run)'
      })
    }

    // Create backup before importing
    let backupId: string | undefined
    if (validatedData.validationOptions.createBackup) {
      backupId = await createBackup(client, validatedData.sessionId, validationResult.processedRows)
    }

    // Import data to inventory
    const importResult = await importToInventory(
      client,
      validationResult.processedRows,
      validatedData.conflictResolution,
      validatedData.supplierId
    )

    // Update session completion
    await client.query(`
      UPDATE upload_sessions
      SET status = 'completed', progress = 100, completed_at = NOW(),
          backup_id = $2, import_results = $3, updated_at = NOW()
      WHERE id = $1
    `, [
      validatedData.sessionId,
      backupId,
      JSON.stringify(importResult)
    ])

    // Clean up temporary data
    await client.query('DELETE FROM upload_temp_data WHERE session_id = $1', [validatedData.sessionId])

    return NextResponse.json({
      success: true,
      data: {
        sessionId: validatedData.sessionId,
        validationResult,
        importResult,
        backupId
      },
      message: `Import completed successfully. ${importResult.created} items created, ${importResult.updated} items updated.`
    })
  })
}

// Helper functions for processing and validation
function generateAutoMappings(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {}
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))

  const fieldPatterns = {
    sku: ['sku', 'item_code', 'product_code', 'part_number', 'part_no'],
    name: ['name', 'product_name', 'item_name', 'description', 'product_description'],
    description: ['description', 'details', 'product_details', 'long_description'],
    category: ['category', 'type', 'group', 'class', 'product_type'],
    brand: ['brand', 'make', 'manufacturer', 'vendor'],
    supplier_sku: ['supplier_sku', 'vendor_sku', 'supplier_code', 'vendor_code'],
    cost_price: ['cost', 'price', 'cost_price', 'unit_price', 'wholesale_price'],
    sale_price: ['sale_price', 'retail_price', 'selling_price', 'list_price'],
    stock_qty: ['stock', 'quantity', 'qty', 'inventory', 'on_hand'],
    reorder_point: ['reorder', 'min_stock', 'minimum', 'reorder_point'],
    max_stock: ['max_stock', 'maximum', 'max_quantity', 'max_qty'],
    unit: ['unit', 'uom', 'unit_of_measure'],
    weight: ['weight', 'mass', 'kg', 'grams'],
    barcode: ['barcode', 'ean', 'upc', 'gtin'],
    location: ['location', 'bin', 'warehouse', 'shelf'],
    currency: ['currency', 'curr']
  }

  for (const [field, patterns] of Object.entries(fieldPatterns)) {
    let bestMatch = { header: '', confidence: 0 }

    normalizedHeaders.forEach((header, index) => {
      for (const pattern of patterns) {
        if (header.includes(pattern)) {
          const confidence = pattern.length / header.length
          if (confidence > bestMatch.confidence) {
            bestMatch = { header: headers[index], confidence }
          }
        }
      }
    })

    if (bestMatch.confidence > 0.4) {
      mappings[field] = bestMatch.header
    }
  }

  return mappings
}

function calculateMappingConfidence(mappings: Record<string, string>, headers: string[]): number {
  const requiredFields = ['sku', 'name', 'category', 'cost_price', 'stock_qty']
  const mappedRequired = requiredFields.filter(field => mappings[field])
  return mappedRequired.length / requiredFields.length
}

async function processAndValidateData(
  data: unknown[][],
  headers: string[],
  fieldMappings: Record<string, string>,
  conflictResolution: unknown,
  validationOptions: unknown,
  client: unknown
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []
  const processedRows: ProcessedRow[] = []
  const categories = new Set<string>()
  const brands = new Set<string>()
  let totalValue = 0
  let conflictsResolved = 0

  // Get existing inventory for conflict detection
  const existingInventoryResult = await client.query(`
    SELECT sku, id, name, cost_price, stock_qty FROM public.inventory_items
  `)
  const existingInventory = new Map<string, InventorySummaryRow>(
    existingInventoryResult.rows.map((item: InventorySummaryRow) => [item.sku, item])
  )

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNumber = i + 2 // Account for header row and 1-based indexing

    // Skip empty rows if configured
    if (validationOptions.skipEmptyRows &&
        row.every((cell: unknown) => !cell || cell.toString().trim() === '')) {
      continue
    }

    const processedRow: ProcessedRow = {
      id: `row_${i}`,
      rowNumber,
      originalData: {},
      mappedData: {},
      status: 'valid',
      issues: [],
      action: 'create'
    }

    // Build original data object
    headers.forEach((header, index) => {
      processedRow.originalData[header] = row[index]
    })

    // Apply field mappings and validate
    for (const [targetField, sourceField] of Object.entries(fieldMappings)) {
      if (!sourceField || !headers.includes(sourceField)) continue

      const sourceIndex = headers.indexOf(sourceField)
      const value = row[sourceIndex]

      processedRow.mappedData[targetField] = transformAndValidateField(
        targetField,
        value,
        processedRow.issues,
        rowNumber,
        validationOptions
      )
    }

    // Check for existing records and handle conflicts
    if (processedRow.mappedData.sku) {
      const existingRecord = existingInventory.get(processedRow.mappedData.sku)
      if (existingRecord) {
        processedRow.existingRecord = existingRecord
        const conflictResult = resolveConflict(processedRow, existingRecord, conflictResolution)
        processedRow.action = conflictResult.action
        processedRow.resolvedConflicts = conflictResult.resolvedFields

        if (conflictResult.action !== 'skip') {
          conflictsResolved++
        }
      }
    }

    // Set final status based on issues
    if (processedRow.issues.some(issue => issue.severity === 'error')) {
      processedRow.status = 'error'
    } else if (processedRow.issues.length > 0) {
      processedRow.status = 'warning'
    }

    // Update statistics
    if (processedRow.mappedData.category) categories.add(processedRow.mappedData.category)
    if (processedRow.mappedData.brand) brands.add(processedRow.mappedData.brand)
    if (processedRow.mappedData.cost_price) {
      totalValue += (parseFloat(processedRow.mappedData.cost_price) || 0) *
                   (parseInt(processedRow.mappedData.stock_qty) || 0)
    }

    processedRows.push(processedRow)
  }

  // Calculate summary statistics
  const summary = {
    totalRows: processedRows.length,
    validRows: processedRows.filter(r => r.status === 'valid').length,
    errorRows: processedRows.filter(r => r.status === 'error').length,
    warningRows: processedRows.filter(r => r.status === 'warning').length,
    skippedRows: processedRows.filter(r => r.action === 'skip').length,
    duplicatesFound: processedRows.filter(r => r.existingRecord).length,
    conflictsResolved,
    estimatedValue: totalValue,
    categories,
    brands
  }

  // Generate recommendations
  const recommendations = generateRecommendations(summary, processedRows)

  return {
    isValid: summary.errorRows === 0,
    summary,
    issues,
    processedRows,
    recommendations
  }
}

function transformAndValidateField(
  fieldName: string,
  value: unknown,
  issues: ValidationIssue[],
  rowNumber: number,
  validationOptions: unknown
): unknown {
  if (value === null || value === undefined || value === '') {
    // Check if field is required
    const requiredFields = ['sku', 'name', 'category', 'cost_price', 'stock_qty']
    if (requiredFields.includes(fieldName)) {
      issues.push({
        row: rowNumber,
        field: fieldName,
        value,
        severity: 'error',
        message: `Required field '${fieldName}' is empty`
      })
    }
    return null
  }

  switch (fieldName) {
    case 'sku': {
      const sku = value.toString().trim().toUpperCase()
      if (validationOptions.validateSkus && !/^[A-Z0-9-_]+$/i.test(sku)) {
        issues.push({
          row: rowNumber,
          field: fieldName,
          value,
          severity: 'warning',
          message: 'SKU contains special characters',
          suggestion: 'Use only alphanumeric characters, hyphens, and underscores'
        })
      }
      return sku
    }

    case 'cost_price':
    case 'sale_price': {
      const price = parseFloat(value.toString().replace(/[^\d.-]/g, ''))
      if (isNaN(price) || price < 0) {
        issues.push({
          row: rowNumber,
          field: fieldName,
          value,
          severity: 'error',
          message: `Invalid ${fieldName} value`
        })
        return null
      }
      return price
    }

    case 'stock_qty':
    case 'reorder_point':
    case 'max_stock': {
      const quantity = parseInt(value.toString())
      if (isNaN(quantity) || quantity < 0) {
        issues.push({
          row: rowNumber,
          field: fieldName,
          value,
          severity: 'warning',
          message: `Invalid ${fieldName} value, using 0`,
          autoFixAvailable: true
        })
        return 0
      }
      return quantity
    }

    case 'weight': {
      const weight = parseFloat(value.toString())
      return isNaN(weight) ? null : weight
    }

    default: {
      const stringValue = value.toString().trim()
      if (validationOptions.normalizeText) {
        return stringValue.toLowerCase().replace(/\s+/g, ' ');
      }
      return stringValue
    }
  }
}

function resolveConflict(
  processedRow: ProcessedRow,
  existingRecord: unknown,
  conflictResolution: unknown
): { action: 'create' | 'update' | 'skip', resolvedFields: string[] } {
  const resolvedFields: string[] = []

  switch (conflictResolution.strategy) {
    case 'skip':
      return { action: 'skip', resolvedFields: [] }

    case 'update':
      return { action: 'update', resolvedFields: Object.keys(processedRow.mappedData) }

    case 'merge': {
      const mergeFields = Object.keys(processedRow.mappedData).filter(field => {
        const newValue = processedRow.mappedData[field]
        return newValue !== null && newValue !== undefined && newValue !== ''
      })
      return { action: 'update', resolvedFields: mergeFields }
    }

    case 'create_variant':
      processedRow.mappedData.sku = `${processedRow.mappedData.sku}-V${Date.now()}`
      return { action: 'create', resolvedFields: ['sku'] }

    default:
      return { action: 'skip', resolvedFields: [] }
  }
}

async function createBackup(client: unknown, sessionId: string, processedRows: ProcessedRow[]): Promise<string> {
  const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Get existing records that will be affected
  const affectedSkus = processedRows
    .filter(row => row.action !== 'skip' && row.existingRecord)
    .map(row => row.mappedData.sku)
    .filter((sku): sku is string => typeof sku === 'string' && sku.length > 0)

  if (affectedSkus.length > 0) {
    const affectedRecordsResult = await client.query(`
      SELECT * FROM public.inventory_items WHERE sku = ANY($1)
    `, [affectedSkus])

    // Store backup
    await client.query(`
      INSERT INTO upload_backups (
        id, session_id, affected_records, original_data, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [
      backupId,
      sessionId,
      JSON.stringify(affectedSkus),
      JSON.stringify(affectedRecordsResult.rows)
    ])
  }

  return backupId
}

async function importToInventory(
  client: unknown,
  processedRows: ProcessedRow[],
  conflictResolution: unknown,
  supplierId: string
): Promise<ImportResult> {
  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []
  let totalValue = 0
  const newCategories = new Set<string>()
  const newBrands = new Set<string>()

  // Get existing categories and brands
  const existingCategoriesResult = await client.query('SELECT DISTINCT category FROM public.inventory_items')
  const existingBrandsResult = await client.query('SELECT DISTINCT brand FROM public.inventory_items WHERE brand IS NOT NULL')

  const existingCategories = new Set<string>(
    existingCategoriesResult.rows
      .map((r: CategoryRow) => r.category)
      .filter((value: string | null): value is string => typeof value === 'string' && value.length > 0)
  )
  const existingBrands = new Set<string>(
    existingBrandsResult.rows
      .map((r: BrandRow) => r.brand)
      .filter((value: string | null): value is string => typeof value === 'string' && value.length > 0)
  )

  for (const row of processedRows) {
    if (row.status === 'error') {
      skipped++
      continue
    }

    try {
      switch (row.action) {
        case 'create':
          // Create new inventory item
          const spSku = row.mappedData.supplier_sku || row.mappedData.sku
          await upsertSupplierProduct({ supplierId, sku: spSku, name: row.mappedData.name })
          await setStock({
            supplierId,
            sku: spSku,
            quantity: row.mappedData.stock_qty || 0,
            unitCost: row.mappedData.cost_price,
            reason: `Upload session: ${row.id}`
          })

          created++
          totalValue += (row.mappedData.cost_price || 0) * (row.mappedData.stock_qty || 0)

          // Track new categories and brands
          if (row.mappedData.category && !existingCategories.has(row.mappedData.category)) {
            newCategories.add(row.mappedData.category)
          }
          if (row.mappedData.brand && !existingBrands.has(row.mappedData.brand)) {
            newBrands.add(row.mappedData.brand)
          }
          break

        case 'update':
          const spSkuUpd = row.mappedData.supplier_sku || row.mappedData.sku
          if (row.mappedData.stock_qty !== undefined) {
            await setStock({
              supplierId,
              sku: spSkuUpd,
              quantity: row.mappedData.stock_qty,
              unitCost: row.mappedData.cost_price,
              reason: `Upload session update: ${row.id}`
            })
          }
          updated++
          break

        case 'skip':
          skipped++
          break
      }
    } catch (error) {
      errors.push(`Row ${row.rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      skipped++
    }
  }

  return {
    created,
    updated,
    skipped,
    errors,
    summary: {
      totalValue,
      newCategories: newCategories.size,
      newBrands: newBrands.size,
      affectedSuppliers: 1
    }
  }
}

function generateRecommendations(summary: unknown, processedRows: ProcessedRow[]): string[] {
  const recommendations: string[] = []

  if (summary.errorRows > 0) {
    recommendations.push(`${summary.errorRows} rows have errors that need to be resolved before import`)
  }

  if (summary.warningRows > summary.validRows * 0.2) {
    recommendations.push('High number of warnings detected - review data quality')
  }

  if (summary.duplicatesFound > 0) {
    recommendations.push(`${summary.duplicatesFound} duplicate SKUs found - consider conflict resolution strategy`)
  }

  if (summary.categories.size > 20) {
    recommendations.push('Large number of categories - consider standardization')
  }

  if (summary.estimatedValue > 1000000) {
    recommendations.push('High-value import detected - ensure pricing accuracy before proceeding')
  }

  return recommendations
}
