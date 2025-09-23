import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as XLSX from 'xlsx'
import { UploadErrorManager, ErrorSeverity, ErrorCategory, createErrorResponse, createSuccessResponse, ERROR_CODES } from '@/lib/error-handling/upload-error-manager'
import { createClient } from '@/lib/supabase/server'
import { InventoryValidator } from '@/lib/validation/inventory-validator'
import { PricelistIntegrationService } from '@/lib/integrations/inventory-integration'

// Enhanced validation schemas with error handling
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

// Enhanced session interface with error management
interface EnhancedUploadSession {
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
  conflictResolution?: any
  validationResults?: any
  backupId?: string
  errorManager: UploadErrorManager
  data?: any[]
}

// Enhanced storage with error tracking
const uploadSessions = new Map<string, EnhancedUploadSession>()
const fileStorage = new Map<string, any[]>()
const backupStorage = new Map<string, any>()

/**
 * Main API route handler with comprehensive error management
 */
export async function POST(request: NextRequest) {
  const correlationId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const contentType = request.headers.get('content-type')

    // Route to appropriate handler
    if (contentType?.includes('multipart/form-data')) {
      return await handleFileUpload(request, correlationId)
    }

    // Parse JSON body for processing requests
    const body = await request.json()

    if (body.action === 'process') {
      return await handleUploadProcessing(request, correlationId, body)
    }

    if (body.action === 'rollback') {
      return await handleRollback(request, correlationId, body)
    }

    if (body.action === 'status') {
      return await handleStatusCheck(request, correlationId, body)
    }

    // Unknown action
    const errorManager = new UploadErrorManager('unknown', correlationId)
    const error = errorManager.recordError(
      ERROR_CODES.VALIDATION_INVALID_FORMAT,
      'Unknown action requested',
      ErrorSeverity.ERROR,
      ErrorCategory.VALIDATION,
      { originalValue: body.action || 'missing' },
      'Valid actions: process, rollback, status'
    )
    return createErrorResponse(errorManager, [error])

  } catch (error) {
    console.error('Upload API error:', error)

    const errorManager = new UploadErrorManager('unknown', correlationId)
    const systemError = errorManager.recordError(
      ERROR_CODES.SYSTEM_UNAVAILABLE,
      error instanceof Error ? error.message : 'Unknown system error',
      ErrorSeverity.CRITICAL,
      ErrorCategory.SYSTEM,
      { stackTrace: error instanceof Error ? error.stack : undefined }
    )

    return createErrorResponse(errorManager, [systemError], 500)
  }
}

/**
 * Handle file upload with enhanced validation and error tracking
 */
async function handleFileUpload(request: NextRequest, correlationId: string) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const errorManager = new UploadErrorManager(sessionId, correlationId)

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const supplierId = formData.get('supplierId') as string

    // Comprehensive input validation
    const validationErrors = []

    if (!file) {
      validationErrors.push(errorManager.recordError(
        ERROR_CODES.VALIDATION_REQUIRED_FIELD_MISSING,
        'File is required for upload',
        ErrorSeverity.ERROR,
        ErrorCategory.VALIDATION,
        { fieldName: 'file' },
        'Please select a valid Excel file (.xlsx) to upload'
      ))
    }

    if (!supplierId) {
      validationErrors.push(errorManager.recordError(
        ERROR_CODES.VALIDATION_REQUIRED_FIELD_MISSING,
        'Supplier ID is required',
        ErrorSeverity.ERROR,
        ErrorCategory.VALIDATION,
        { fieldName: 'supplierId' },
        'Please select a supplier before uploading'
      ))
    }

    if (validationErrors.length > 0) {
      return createErrorResponse(errorManager, validationErrors)
    }

    // Enhanced file validation
    const validExtensions = ['.xlsx', '.xls']
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    const maxFileSize = 10 * 1024 * 1024 // 10MB limit

    if (!validExtensions.includes(fileExtension)) {
      const error = errorManager.recordError(
        ERROR_CODES.FILE_INVALID_FORMAT,
        `Invalid file format: ${fileExtension}`,
        ErrorSeverity.ERROR,
        ErrorCategory.FILE_PROCESSING,
        { originalValue: file.name, expectedType: '.xlsx or .xls' },
        'Please upload a valid Excel file (.xlsx or .xls format)'
      )
      return createErrorResponse(errorManager, [error])
    }

    if (file.size > maxFileSize) {
      const error = errorManager.recordError(
        ERROR_CODES.FILE_TOO_LARGE,
        `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 10MB limit`,
        ErrorSeverity.ERROR,
        ErrorCategory.FILE_PROCESSING,
        { originalValue: file.size, expectedType: 'max 10MB' },
        'Please reduce file size or split into smaller files'
      )
      return createErrorResponse(errorManager, [error])
    }

    if (file.size === 0) {
      const error = errorManager.recordError(
        ERROR_CODES.FILE_EMPTY,
        'Uploaded file is empty',
        ErrorSeverity.ERROR,
        ErrorCategory.FILE_PROCESSING,
        {},
        'Please upload a file with data'
      )
      return createErrorResponse(errorManager, [error])
    }

    // Verify supplier exists
    let supplierName = 'Unknown Supplier'
    try {
      const supabase = createClient()
      const { data: supplier, error: supplierError } = await supabase
        .from('supplier')
        .select('name')
        .eq('id', supplierId)
        .single()

      if (supplierError || !supplier) {
        const error = errorManager.recordError(
          ERROR_CODES.BUSINESS_INVALID_SUPPLIER,
          'Supplier not found or access denied',
          ErrorSeverity.ERROR,
          ErrorCategory.BUSINESS_LOGIC,
          { supplierId },
          'Please select a valid supplier from the list'
        )
        return createErrorResponse(errorManager, [error])
      }

      supplierName = supplier.name
    } catch (dbError) {
      const error = errorManager.recordDatabaseError(
        'SELECT',
        'supplier',
        dbError as Error,
        { supplierId }
      )
      return createErrorResponse(errorManager, [error])
    }

    // Enhanced Excel file parsing with error handling
    let workbook: XLSX.WorkBook
    let jsonData: any[][]

    try {
      const buffer = await file.arrayBuffer()
      workbook = XLSX.read(buffer, { type: 'buffer' })

      if (workbook.SheetNames.length === 0) {
        const error = errorManager.recordError(
          ERROR_CODES.FILE_CORRUPTED,
          'Excel file contains no worksheets',
          ErrorSeverity.ERROR,
          ErrorCategory.FILE_PROCESSING,
          {},
          'Please check if the file is corrupted and try again'
        )
        return createErrorResponse(errorManager, [error])
      }

      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    } catch (parseError) {
      const error = errorManager.recordError(
        ERROR_CODES.FILE_CORRUPTED,
        `Failed to parse Excel file: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        ErrorSeverity.CRITICAL,
        ErrorCategory.FILE_PROCESSING,
        { stackTrace: parseError instanceof Error ? parseError.stack : undefined },
        'File may be corrupted or in an unsupported format'
      )
      return createErrorResponse(errorManager, [error])
    }

    if (jsonData.length === 0) {
      const error = errorManager.recordError(
        ERROR_CODES.FILE_EMPTY,
        'Excel file contains no data rows',
        ErrorSeverity.ERROR,
        ErrorCategory.FILE_PROCESSING,
        {},
        'Please ensure the file contains data in the first worksheet'
      )
      return createErrorResponse(errorManager, [error])
    }

    if (jsonData.length === 1) {
      const error = errorManager.recordError(
        ERROR_CODES.FILE_EMPTY,
        'Excel file contains only header row',
        ErrorSeverity.ERROR,
        ErrorCategory.FILE_PROCESSING,
        {},
        'Please ensure the file contains data rows below the header'
      )
      return createErrorResponse(errorManager, [error])
    }

    // Store session data with error manager
    const session: EnhancedUploadSession = {
      id: sessionId,
      supplierId,
      supplierName,
      filename: file.name,
      fileSize: file.size,
      totalRows: jsonData.length - 1, // Exclude header
      processedRows: 0,
      validRows: 0,
      errorRows: 0,
      warningRows: 0,
      skippedRows: 0,
      status: 'uploading',
      progress: 0,
      data: jsonData,
      errorManager,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    uploadSessions.set(sessionId, session)
    fileStorage.set(sessionId, jsonData)

    // Initialize session in database
    try {
      const supabase = createClient()
      await supabase.rpc('initialize_pricelist_upload_session', {
        p_supplier_id: supplierId,
        p_filename: file.name,
        p_file_size: file.size,
        p_total_records: jsonData.length - 1
      })
    } catch (dbError) {
      console.warn('Failed to initialize database session:', dbError)
      // Continue without database tracking - non-critical
    }

    return createSuccessResponse({
      sessionId,
      supplierName,
      filename: file.name,
      fileSize: file.size,
      totalRows: jsonData.length - 1,
      headers: jsonData[0] || [],
      preview: jsonData.slice(1, 6), // First 5 data rows for preview
      correlationId,
      status: 'ready_for_mapping'
    })

  } catch (error) {
    console.error('File upload error:', error)
    const systemError = errorManager.recordError(
      ERROR_CODES.SYSTEM_UNAVAILABLE,
      error instanceof Error ? error.message : 'Unknown file processing error',
      ErrorSeverity.CRITICAL,
      ErrorCategory.SYSTEM,
      { stackTrace: error instanceof Error ? error.stack : undefined }
    )
    return createErrorResponse(errorManager, [systemError], 500)
  }
}

/**
 * Handle upload processing with validation and conflict resolution
 */
async function handleUploadProcessing(request: NextRequest, correlationId: string, body: any) {
  try {
    // Validate request body
    const validatedData = ProcessUploadSchema.parse(body)
    const { sessionId, supplierId, fieldMappings, conflictResolution, validationOptions, dryRun } = validatedData

    // Get session
    const session = uploadSessions.get(sessionId)
    if (!session) {
      const errorManager = new UploadErrorManager(sessionId, correlationId)
      const error = errorManager.recordError(
        ERROR_CODES.VALIDATION_REQUIRED_FIELD_MISSING,
        'Upload session not found or expired',
        ErrorSeverity.ERROR,
        ErrorCategory.VALIDATION,
        { sessionId },
        'Please start a new upload session'
      )
      return createErrorResponse(errorManager, [error])
    }

    const errorManager = session.errorManager

    // Update session status
    session.status = 'validating'
    session.updatedAt = new Date()

    // Get raw data
    const rawData = fileStorage.get(sessionId)
    if (!rawData) {
      const error = errorManager.recordError(
        ERROR_CODES.FILE_EMPTY,
        'Upload data not found',
        ErrorSeverity.ERROR,
        ErrorCategory.FILE_PROCESSING,
        { sessionId },
        'Please re-upload the file'
      )
      return createErrorResponse(errorManager, [error])
    }

    // Process data with comprehensive validation
    const integrationService = new PricelistIntegrationService()

    try {
      const result = await integrationService.processAndImportPricelist(
        rawData.slice(1), // Skip header row
        supplierId,
        {
          fieldMappings,
          conflictResolution,
          validationOptions,
          dryRun,
          sessionId,
          errorManager
        }
      )

      // Update session with results
      session.processedRows = result.summary.processedRecords
      session.validRows = result.summary.successfulRecords
      session.errorRows = result.summary.failedRecords
      session.warningRows = result.summary.warningRecords || 0
      session.status = result.success ? 'completed' : 'failed'
      session.progress = 100
      session.validationResults = result
      session.completedAt = new Date()
      session.updatedAt = new Date()

      // Generate comprehensive feedback
      const allErrors = errorManager.exportErrors()
      const statistics = errorManager.generateStatistics()
      const feedback = errorManager.generateUserFeedback(allErrors.errors)

      return createSuccessResponse({
        sessionId,
        result,
        statistics,
        feedback,
        correlationId
      }, errorManager, allErrors.errors.filter(e => e.severity === ErrorSeverity.WARNING))

    } catch (processingError) {
      session.status = 'failed'
      session.updatedAt = new Date()

      const error = errorManager.recordError(
        ERROR_CODES.SYSTEM_UNAVAILABLE,
        processingError instanceof Error ? processingError.message : 'Processing failed',
        ErrorSeverity.CRITICAL,
        ErrorCategory.SYSTEM,
        { stackTrace: processingError instanceof Error ? processingError.stack : undefined }
      )
      return createErrorResponse(errorManager, [error], 500)
    }

  } catch (validationError) {
    const errorManager = new UploadErrorManager('unknown', correlationId)
    const error = errorManager.recordError(
      ERROR_CODES.VALIDATION_INVALID_FORMAT,
      validationError instanceof Error ? validationError.message : 'Invalid request format',
      ErrorSeverity.ERROR,
      ErrorCategory.VALIDATION,
      { stackTrace: validationError instanceof Error ? validationError.stack : undefined },
      'Please check the request format and try again'
    )
    return createErrorResponse(errorManager, [error])
  }
}

/**
 * Handle rollback operations
 */
async function handleRollback(request: NextRequest, correlationId: string, body: any) {
  try {
    const validatedData = RollbackSchema.parse(body)
    const { sessionId, rollbackId, reason } = validatedData

    const session = uploadSessions.get(sessionId)
    if (!session) {
      const errorManager = new UploadErrorManager(sessionId, correlationId)
      const error = errorManager.recordError(
        ERROR_CODES.VALIDATION_REQUIRED_FIELD_MISSING,
        'Upload session not found',
        ErrorSeverity.ERROR,
        ErrorCategory.VALIDATION,
        { sessionId },
        'Session may have expired'
      )
      return createErrorResponse(errorManager, [error])
    }

    const errorManager = session.errorManager

    // Execute rollback
    try {
      const integrationService = new PricelistIntegrationService()
      const rollbackResult = await integrationService.rollbackImport(rollbackId)

      session.status = 'rollback'
      session.rollbackId = rollbackId
      session.updatedAt = new Date()

      return createSuccessResponse({
        sessionId,
        rollbackResult,
        correlationId
      })

    } catch (rollbackError) {
      const error = errorManager.recordError(
        ERROR_CODES.DATABASE_OPERATION_FAILED,
        rollbackError instanceof Error ? rollbackError.message : 'Rollback failed',
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE,
        { rollbackId, reason }
      )
      return createErrorResponse(errorManager, [error], 500)
    }

  } catch (validationError) {
    const errorManager = new UploadErrorManager('unknown', correlationId)
    const error = errorManager.recordError(
      ERROR_CODES.VALIDATION_INVALID_FORMAT,
      validationError instanceof Error ? validationError.message : 'Invalid rollback request',
      ErrorSeverity.ERROR,
      ErrorCategory.VALIDATION
    )
    return createErrorResponse(errorManager, [error])
  }
}

/**
 * Handle status check requests
 */
async function handleStatusCheck(request: NextRequest, correlationId: string, body: any) {
  try {
    const { sessionId } = body

    if (!sessionId) {
      const errorManager = new UploadErrorManager('unknown', correlationId)
      const error = errorManager.recordError(
        ERROR_CODES.VALIDATION_REQUIRED_FIELD_MISSING,
        'Session ID is required',
        ErrorSeverity.ERROR,
        ErrorCategory.VALIDATION,
        { fieldName: 'sessionId' }
      )
      return createErrorResponse(errorManager, [error])
    }

    const session = uploadSessions.get(sessionId)
    if (!session) {
      const errorManager = new UploadErrorManager(sessionId, correlationId)
      const error = errorManager.recordError(
        ERROR_CODES.VALIDATION_REQUIRED_FIELD_MISSING,
        'Upload session not found',
        ErrorSeverity.ERROR,
        ErrorCategory.VALIDATION,
        { sessionId }
      )
      return createErrorResponse(errorManager, [error])
    }

    // Return current session status with statistics
    const statistics = session.errorManager.generateStatistics()
    const feedback = session.errorManager.generateUserFeedback(
      session.errorManager.exportErrors().errors
    )

    return createSuccessResponse({
      sessionId,
      status: session.status,
      progress: session.progress,
      statistics: {
        totalRows: session.totalRows,
        processedRows: session.processedRows,
        validRows: session.validRows,
        errorRows: session.errorRows,
        warningRows: session.warningRows,
        skippedRows: session.skippedRows
      },
      errorStatistics: statistics,
      feedback,
      correlationId
    })

  } catch (error) {
    const errorManager = new UploadErrorManager('unknown', correlationId)
    const systemError = errorManager.recordError(
      ERROR_CODES.SYSTEM_UNAVAILABLE,
      error instanceof Error ? error.message : 'Status check failed',
      ErrorSeverity.ERROR,
      ErrorCategory.SYSTEM
    )
    return createErrorResponse(errorManager, [systemError], 500)
  }
}

export async function GET(request: NextRequest) {
  const correlationId = `status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      const errorManager = new UploadErrorManager('unknown', correlationId)
      const error = errorManager.recordError(
        ERROR_CODES.VALIDATION_REQUIRED_FIELD_MISSING,
        'Session ID parameter is required',
        ErrorSeverity.ERROR,
        ErrorCategory.VALIDATION,
        { fieldName: 'sessionId' }
      )
      return createErrorResponse(errorManager, [error])
    }

    return await handleStatusCheck(request, correlationId, { sessionId })

  } catch (error) {
    const errorManager = new UploadErrorManager('unknown', correlationId)
    const systemError = errorManager.recordError(
      ERROR_CODES.SYSTEM_UNAVAILABLE,
      error instanceof Error ? error.message : 'GET request failed',
      ErrorSeverity.ERROR,
      ErrorCategory.SYSTEM
    )
    return createErrorResponse(errorManager, [systemError], 500)
  }
}