import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as XLSX from 'xlsx'

// Enhanced validation schemas for upload wizard
const UploadSessionSchema = z.object({
  sessionId: z.string().min(1),
  supplierId: z.string().min(1),
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
  tags: z.string().optional(),
  notes: z.string().optional()
})

const ConflictResolutionSchema = z.object({
  strategy: z.enum(['skip', 'update', 'merge', 'create_variant']),
  fields: z.array(z.string()).default([]),
  preserveFields: z.array(z.string()).default([])
})

const ProcessUploadSchema = z.object({
  sessionId: z.string().min(1),
  supplierId: z.string().min(1),
  fieldMappings: FieldMappingSchema,
  conflictResolution: ConflictResolutionSchema,
  validationOptions: z.object({
    skipEmptyRows: z.boolean().default(true),
    validateSkus: z.boolean().default(true),
    checkDuplicates: z.boolean().default(true),
    validatePrices: z.boolean().default(true),
    normalizeText: z.boolean().default(false),
    createBackup: z.boolean().default(true)
  }).default({}),
  dryRun: z.boolean().default(false)
})

const RollbackSchema = z.object({
  sessionId: z.string().min(1),
  rollbackId: z.string().min(1),
  reason: z.string().optional()
})

// Enhanced types for upload wizard
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
  rollbackId?: string
  fieldMappings?: Record<string, string>
  conflictResolution?: ConflictResolution
  validationResults?: ValidationResult
  backupId?: string
}

interface ConflictResolution {
  strategy: 'skip' | 'update' | 'merge' | 'create_variant'
  fields: string[]
  preserveFields?: string[]
}

interface ValidationIssue {
  row: number
  field: string
  value: any
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion?: string
  autoFixAvailable?: boolean
}

interface ProcessedRow {
  id: string
  rowNumber: number
  originalData: Record<string, any>
  mappedData: Record<string, any>
  status: 'valid' | 'warning' | 'error' | 'skipped'
  issues: ValidationIssue[]
  action: 'create' | 'update' | 'skip'
  existingRecord?: any
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
    categories: number
    brands: number
  }
  issues: ValidationIssue[]
  processedRows: ProcessedRow[]
  recommendations: string[]
  conflictReport: ConflictReport
}

interface ConflictReport {
  totalConflicts: number
  resolvedConflicts: number
  unresolvedConflicts: number
  conflictsByType: Record<string, number>
  resolutionStrategiesUsed: Record<string, number>
}

interface BackupRecord {
  id: string
  sessionId: string
  timestamp: Date
  affectedRecords: string[]
  originalData: any[]
  changesSummary: {
    created: number
    updated: number
    deleted: number
  }
  rollbackInstructions: any[]
}

// Mock storage for sessions and backups
const uploadSessions = new Map<string, UploadSession>()
const fileStorage = new Map<string, any[]>() // Raw data storage
const backupStorage = new Map<string, BackupRecord>()

// Mock existing inventory data for conflict detection
const mockInventoryData = [
  {
    id: 'inv_001',
    sku: 'EXISTING-001',
    name: 'Existing Product 1',
    category: 'Electronics',
    cost_price: 100.00,
    stock_qty: 50,
    supplier_id: 'sup_001'
  },
  {
    id: 'inv_002',
    sku: 'EXISTING-002',
    name: 'Existing Product 2',
    category: 'Office Supplies',
    cost_price: 25.50,
    stock_qty: 200,
    supplier_id: 'sup_002'
  }
]

// GET /api/suppliers/pricelists/upload - Get upload session status
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

    const session = uploadSessions.get(sessionId)
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Upload session not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: session
    })

  } catch (error) {
    console.error('Error retrieving upload session:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/suppliers/pricelists/upload - Create upload session or process upload
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
      error: 'Internal server error',
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
  const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']
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
    // Process file
    const arrayBuffer = await file.arrayBuffer()
    let data: any[][]
    let headers: string[]

    if (file.type === 'text/csv') {
      // Handle CSV
      const text = new TextDecoder().decode(arrayBuffer)
      const lines = text.split('\n').filter(line => line.trim())
      data = lines.map(line => line.split(',').map(cell => cell.trim().replace(/"/g, '')))
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
      data = jsonData.slice(1) as any[][]
    }

    // Create upload session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const session: UploadSession = {
      id: sessionId,
      supplierId,
      supplierName: 'Unknown Supplier', // Would fetch from database
      filename: file.name,
      fileSize: file.size,
      totalRows: data.length,
      processedRows: 0,
      validRows: 0,
      errorRows: 0,
      warningRows: 0,
      skippedRows: 0,
      status: 'uploading',
      progress: 100,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Store session and file data
    uploadSessions.set(sessionId, session)
    fileStorage.set(sessionId, { headers, data })

    // Generate automatic field mappings
    const autoMappings = generateAutoMappings(headers)

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        session,
        headers,
        sampleData: data.slice(0, 5), // First 5 rows for preview
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

  const session = uploadSessions.get(validatedData.sessionId)
  if (!session) {
    return NextResponse.json({
      success: false,
      error: 'Upload session not found'
    }, { status: 404 })
  }

  const fileData = fileStorage.get(validatedData.sessionId)
  if (!fileData) {
    return NextResponse.json({
      success: false,
      error: 'File data not found'
    }, { status: 404 })
  }

  try {
    // Update session status
    session.status = 'validating'
    session.progress = 10
    session.fieldMappings = validatedData.fieldMappings
    session.conflictResolution = validatedData.conflictResolution
    session.updatedAt = new Date()
    uploadSessions.set(validatedData.sessionId, session)

    // Process and validate data
    const validationResult = await processAndValidateData(
      fileData.data,
      fileData.headers,
      validatedData.fieldMappings,
      validatedData.conflictResolution,
      validatedData.validationOptions,
      session
    )

    // Update session with validation results
    session.validationResults = validationResult
    session.validRows = validationResult.summary.validRows
    session.errorRows = validationResult.summary.errorRows
    session.warningRows = validationResult.summary.warningRows
    session.skippedRows = validationResult.summary.skippedRows
    session.progress = 75
    session.status = 'importing'
    uploadSessions.set(validatedData.sessionId, session)

    // If dry run, return validation results without importing
    if (validatedData.dryRun) {
      session.status = 'validating'
      session.progress = 50
      uploadSessions.set(validatedData.sessionId, session)

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
      backupId = await createBackup(validatedData.sessionId, validationResult.processedRows)
      session.backupId = backupId
    }

    // Import data to inventory
    const importResult = await importToInventory(
      validationResult.processedRows,
      validatedData.conflictResolution,
      session
    )

    // Update session completion
    session.status = 'completed'
    session.progress = 100
    session.completedAt = new Date()
    session.rollbackId = backupId
    uploadSessions.set(validatedData.sessionId, session)

    return NextResponse.json({
      success: true,
      data: {
        sessionId: validatedData.sessionId,
        session,
        validationResult,
        importResult,
        backupId
      },
      message: `Import completed successfully. ${importResult.created} items created, ${importResult.updated} items updated.`
    })

  } catch (error) {
    console.error('Upload processing error:', error)

    // Update session with error status
    session.status = 'failed'
    session.progress = 0
    session.updatedAt = new Date()
    uploadSessions.set(validatedData.sessionId, session)

    return NextResponse.json({
      success: false,
      error: 'Upload processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/suppliers/pricelists/upload - Update upload session or rollback
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action

    if (action === 'rollback') {
      return handleRollback(body)
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Error in upload update:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Handle rollback operation
async function handleRollback(requestBody: any): Promise<NextResponse> {
  const validatedData = RollbackSchema.parse(requestBody)

  const session = uploadSessions.get(validatedData.sessionId)
  if (!session) {
    return NextResponse.json({
      success: false,
      error: 'Upload session not found'
    }, { status: 404 })
  }

  const backup = backupStorage.get(validatedData.rollbackId)
  if (!backup) {
    return NextResponse.json({
      success: false,
      error: 'Backup not found for rollback'
    }, { status: 404 })
  }

  try {
    // Update session status
    session.status = 'rollback'
    session.progress = 10
    session.updatedAt = new Date()
    uploadSessions.set(validatedData.sessionId, session)

    // Execute rollback
    const rollbackResult = await executeRollback(backup)

    // Update session
    session.status = 'completed'
    session.progress = 100
    session.completedAt = new Date()
    uploadSessions.set(validatedData.sessionId, session)

    return NextResponse.json({
      success: true,
      data: {
        sessionId: validatedData.sessionId,
        rollbackResult,
        reason: validatedData.reason
      },
      message: 'Rollback completed successfully'
    })

  } catch (error) {
    console.error('Rollback error:', error)

    session.status = 'failed'
    session.updatedAt = new Date()
    uploadSessions.set(validatedData.sessionId, session)

    return NextResponse.json({
      success: false,
      error: 'Rollback failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/suppliers/pricelists/upload - Cancel upload session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 })
    }

    const session = uploadSessions.get(sessionId)
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Upload session not found'
      }, { status: 404 })
    }

    // Check if session can be cancelled
    if (['completed', 'failed'].includes(session.status)) {
      return NextResponse.json({
        success: false,
        error: 'Cannot cancel completed or failed session'
      }, { status: 409 })
    }

    // Clean up session data
    uploadSessions.delete(sessionId)
    fileStorage.delete(sessionId)

    return NextResponse.json({
      success: true,
      message: 'Upload session cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling upload session:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper functions

function generateAutoMappings(headers: string[]): Record<string, string> {
  const mappings: Record<string, string> = {}
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))

  const fieldPatterns = {
    sku: ['sku', 'item_code', 'product_code', 'part_number'],
    name: ['name', 'product_name', 'item_name', 'description'],
    description: ['description', 'details', 'product_description'],
    category: ['category', 'type', 'group', 'class'],
    brand: ['brand', 'make', 'manufacturer'],
    cost_price: ['cost', 'price', 'cost_price', 'unit_price'],
    stock_qty: ['stock', 'quantity', 'qty', 'inventory'],
    supplier_sku: ['supplier_sku', 'vendor_sku', 'supplier_code']
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

    if (bestMatch.confidence > 0.5) {
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
  data: any[][],
  headers: string[],
  fieldMappings: Record<string, string>,
  conflictResolution: ConflictResolution,
  validationOptions: any,
  session: UploadSession
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = []
  const processedRows: ProcessedRow[] = []
  const categories = new Set<string>()
  const brands = new Set<string>()
  let totalValue = 0
  let conflictsResolved = 0
  let conflictsByType: Record<string, number> = {}

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNumber = i + 2 // Account for header row and 1-based indexing

    // Skip empty rows if configured
    if (validationOptions.skipEmptyRows && row.every((cell: any) => !cell || cell.toString().trim() === '')) {
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
      const existingRecord = mockInventoryData.find(item => item.sku === processedRow.mappedData.sku)
      if (existingRecord) {
        processedRow.existingRecord = existingRecord
        const conflictResult = resolveConflict(processedRow, existingRecord, conflictResolution)
        processedRow.action = conflictResult.action
        processedRow.resolvedConflicts = conflictResult.resolvedFields

        if (conflictResult.action !== 'skip') {
          conflictsResolved++
        }

        conflictsByType[conflictResult.conflictType] = (conflictsByType[conflictResult.conflictType] || 0) + 1
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
    if (processedRow.mappedData.cost_price) totalValue += parseFloat(processedRow.mappedData.cost_price) || 0

    processedRows.push(processedRow)

    // Update session progress periodically
    if (i % 100 === 0) {
      session.progress = 10 + (i / data.length) * 60
      uploadSessions.set(session.id, session)
    }
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
    categories: categories.size,
    brands: brands.size
  }

  // Generate recommendations
  const recommendations = generateRecommendations(summary, processedRows)

  // Generate conflict report
  const conflictReport: ConflictReport = {
    totalConflicts: processedRows.filter(r => r.existingRecord).length,
    resolvedConflicts: conflictsResolved,
    unresolvedConflicts: processedRows.filter(r => r.action === 'skip').length,
    conflictsByType,
    resolutionStrategiesUsed: { [conflictResolution.strategy]: conflictsResolved }
  }

  return {
    isValid: summary.errorRows === 0,
    summary,
    issues,
    processedRows,
    recommendations,
    conflictReport
  }
}

function transformAndValidateField(
  fieldName: string,
  value: any,
  issues: ValidationIssue[],
  rowNumber: number,
  validationOptions: any
): any {
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
    case 'sku':
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

    case 'cost_price':
    case 'sale_price':
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

    case 'stock_qty':
    case 'reorder_point':
    case 'max_stock':
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

    case 'weight':
      const weight = parseFloat(value.toString())
      return isNaN(weight) ? null : weight

    default:
      const stringValue = value.toString().trim()
      if (validationOptions.normalizeText) {
        return stringValue.toLowerCase().replace(/\s+/g, ' ')
      }
      return stringValue
  }
}

function resolveConflict(
  processedRow: ProcessedRow,
  existingRecord: any,
  conflictResolution: ConflictResolution
): { action: 'create' | 'update' | 'skip', conflictType: string, resolvedFields: string[] } {
  const resolvedFields: string[] = []

  switch (conflictResolution.strategy) {
    case 'skip':
      return { action: 'skip', conflictType: 'duplicate_sku', resolvedFields: [] }

    case 'update':
      // Update all fields with new values
      return { action: 'update', conflictType: 'update_existing', resolvedFields: Object.keys(processedRow.mappedData) }

    case 'merge':
      // Only update non-empty fields, preserve existing values for empty fields
      const mergeFields = Object.keys(processedRow.mappedData).filter(field => {
        const newValue = processedRow.mappedData[field]
        return newValue !== null && newValue !== undefined && newValue !== ''
      })
      return { action: 'update', conflictType: 'merge_fields', resolvedFields: mergeFields }

    case 'create_variant':
      // Create variant SKU
      processedRow.mappedData.sku = `${processedRow.mappedData.sku}-V${Date.now()}`
      return { action: 'create', conflictType: 'create_variant', resolvedFields: ['sku'] }

    default:
      return { action: 'skip', conflictType: 'unknown', resolvedFields: [] }
  }
}

async function createBackup(sessionId: string, processedRows: ProcessedRow[]): Promise<string> {
  const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Get existing records that will be affected
  const affectedSkus = processedRows
    .filter(row => row.action !== 'skip' && row.existingRecord)
    .map(row => row.mappedData.sku)

  const affectedRecords = mockInventoryData.filter(item => affectedSkus.includes(item.sku))

  const backup: BackupRecord = {
    id: backupId,
    sessionId,
    timestamp: new Date().toISOString(),
    affectedRecords: affectedSkus,
    originalData: JSON.parse(JSON.stringify(affectedRecords)), // Deep copy
    changesSummary: {
      created: processedRows.filter(row => row.action === 'create').length,
      updated: processedRows.filter(row => row.action === 'update').length,
      deleted: 0
    },
    rollbackInstructions: affectedRecords.map(record => ({
      action: 'restore',
      sku: record.sku,
      data: record
    }))
  }

  backupStorage.set(backupId, backup)
  return backupId
}

async function importToInventory(
  processedRows: ProcessedRow[],
  conflictResolution: ConflictResolution,
  session: UploadSession
): Promise<{ created: number, updated: number, skipped: number, errors: string[] }> {
  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of processedRows) {
    if (row.status === 'error') {
      skipped++
      continue
    }

    try {
      switch (row.action) {
        case 'create':
          // Create new inventory item
          const newItem = {
            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...row.mappedData,
            supplier_id: session.supplierId,
            created_at: new Date(),
            updated_at: new Date()
          }
          mockInventoryData.push(newItem)
          created++
          break

        case 'update':
          // Update existing inventory item
          const existingIndex = mockInventoryData.findIndex(item => item.sku === row.mappedData.sku)
          if (existingIndex >= 0) {
            const fieldsToUpdate = row.resolvedConflicts || Object.keys(row.mappedData)
            for (const field of fieldsToUpdate) {
              if (row.mappedData[field] !== null && row.mappedData[field] !== undefined) {
                mockInventoryData[existingIndex][field] = row.mappedData[field]
              }
            }
            mockInventoryData[existingIndex].updated_at = new Date()
            updated++
          }
          break

        case 'skip':
          skipped++
          break
      }
    } catch (error) {
      errors.push(`Row ${row.rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      skipped++
    }

    // Update progress
    session.progress = 75 + ((created + updated + skipped) / processedRows.length) * 20
    uploadSessions.set(session.id, session)
  }

  return { created, updated, skipped, errors }
}

async function executeRollback(backup: BackupRecord): Promise<{ restored: number, errors: string[] }> {
  let restored = 0
  const errors: string[] = []

  try {
    // Remove created items (those not in backup)
    const createdItems = mockInventoryData.filter(item =>
      !backup.originalData.some(orig => orig.sku === item.sku)
    )

    for (const item of createdItems) {
      const index = mockInventoryData.findIndex(inv => inv.id === item.id)
      if (index >= 0) {
        mockInventoryData.splice(index, 1)
        restored++
      }
    }

    // Restore original data for updated items
    for (const originalItem of backup.originalData) {
      const currentIndex = mockInventoryData.findIndex(item => item.sku === originalItem.sku)
      if (currentIndex >= 0) {
        mockInventoryData[currentIndex] = { ...originalItem }
        restored++
      }
    }

  } catch (error) {
    errors.push(`Rollback error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return { restored, errors }
}

function generateRecommendations(summary: any, processedRows: ProcessedRow[]): string[] {
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

  if (summary.categories > 20) {
    recommendations.push('Large number of categories - consider standardization')
  }

  if (summary.estimatedValue > 1000000) {
    recommendations.push('High-value import detected - ensure pricing accuracy before proceeding')
  }

  const skuPatterns = processedRows.map(r => r.mappedData.sku).filter(Boolean)
  const inconsistentSkus = skuPatterns.filter(sku => !/^[A-Z0-9-_]+$/i.test(sku))
  if (inconsistentSkus.length > 0) {
    recommendations.push('Some SKUs contain special characters - consider standardizing format')
  }

  return recommendations
}