import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import PriceListProcessor from '@/lib/services/PriceListProcessor'
import { query } from '@/lib/database'
import * as fs from 'fs/promises'
import * as path from 'path'

// ============================================================================
// PRICE LIST PROCESSING API ENDPOINTS
// Real backend API for processing supplier price list files
// ============================================================================

// Validation schemas
const ProcessFileSchema = z.object({
  filePath: z.string().min(1, 'File path is required'),
  supplierId: z.string().uuid('Valid supplier ID is required'),
  options: z.object({
    skipEmptyRows: z.boolean().default(true),
    validateData: z.boolean().default(true),
    createBackup: z.boolean().default(true),
    batchSize: z.number().min(1).max(1000).default(100),
    duplicateHandling: z.enum(['skip', 'update', 'create_variant']).default('update'),
    enableLogging: z.boolean().default(true),
  }).optional(),
})

const BatchProcessSchema = z.object({
  uploadDirectory: z.string().min(1, 'Upload directory is required'),
  supplierMappings: z.record(z.string().uuid()),
  globalOptions: z.object({
    skipEmptyRows: z.boolean().default(true),
    validateData: z.boolean().default(true),
    createBackup: z.boolean().default(true),
    batchSize: z.number().min(1).max(1000).default(100),
    duplicateHandling: z.enum(['skip', 'update', 'create_variant']).default('update'),
    enableLogging: z.boolean().default(true),
    concurrentProcesses: z.number().min(1).max(5).default(2),
  }).optional(),
})

// Initialize the processor
const processor = new PriceListProcessor()

/**
 * POST /api/pricelists/process - Process a single price list file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = ProcessFileSchema.parse(body)

    console.log(`🚀 Processing price list file: ${validatedData.filePath}`)

    // Verify file exists
    try {
      await fs.access(validatedData.filePath)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'File not found',
        details: `Cannot access file: ${validatedData.filePath}`
      }, { status: 404 })
    }

    // Verify supplier exists
    const supplierCheck = await query(
      'SELECT id, name, status FROM suppliers WHERE id = $1',
      [validatedData.supplierId]
    )

    if (supplierCheck.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Supplier not found',
        details: `Supplier ID ${validatedData.supplierId} does not exist`
      }, { status: 404 })
    }

    const supplier = supplierCheck.rows[0]
    if (supplier.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Supplier is not active',
        details: `Supplier ${supplier.name} status: ${supplier.status}`
      }, { status: 400 })
    }

    // Process the file
    const result = await processor.processFile({
      filePath: validatedData.filePath,
      supplierId: validatedData.supplierId,
      options: validatedData.options || {},
    })

    // Log the processing result
    await logProcessingResult(result, validatedData.supplierId, validatedData.filePath)

    // Update supplier last import date
    await query(
      'UPDATE suppliers SET last_import_date = NOW(), updated_at = NOW() WHERE id = $1',
      [validatedData.supplierId]
    )

    console.log(`✅ Price list processing completed: ${result.sessionId}`)

    return NextResponse.json({
      success: true,
      data: result,
      message: `Processing completed: ${result.created} items created, ${result.updated} items updated`
    })

  } catch (error) {
    console.error('Price list processing error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/pricelists/process/batch - Process multiple price list files
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = BatchProcessSchema.parse(body)

    console.log(`🚀 Starting batch price list processing: ${validatedData.uploadDirectory}`)

    // Verify upload directory exists
    try {
      await fs.access(validatedData.uploadDirectory)
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Upload directory not found',
        details: `Cannot access directory: ${validatedData.uploadDirectory}`
      }, { status: 404 })
    }

    // Get all files in the upload directory
    const files = await fs.readdir(validatedData.uploadDirectory)
    const priceListFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase()
      return ['.xlsx', '.xls', '.csv'].includes(ext)
    })

    if (priceListFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No price list files found',
        details: `No Excel or CSV files found in ${validatedData.uploadDirectory}`
      }, { status: 404 })
    }

    console.log(`📁 Found ${priceListFiles.length} price list files to process`)

    // Process files in batches
    const batchResults: any[] = []
    const concurrency = validatedData.globalOptions?.concurrentProcesses || 2
    const batches = createFileBatches(priceListFiles, concurrency)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`📦 Processing file batch ${batchIndex + 1}/${batches.length}`)

      const batchPromises = batch.map(async (filename) => {
        const filePath = path.join(validatedData.uploadDirectory, filename)
        const supplierId = await determineSupplierId(filename, validatedData.supplierMappings)

        if (!supplierId) {
          return {
            filename,
            success: false,
            error: 'No supplier mapping found',
            details: `Could not determine supplier for file: ${filename}`
          }
        }

        try {
          const result = await processor.processFile({
            filePath,
            supplierId,
            options: validatedData.globalOptions || {},
          })

          // Log processing result
          await logProcessingResult(result, supplierId, filePath)

          return {
            filename,
            supplierId,
            ...result
          }

        } catch (error) {
          console.error(`Error processing ${filename}:`, error)
          return {
            filename,
            supplierId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const batchResult = await Promise.allSettled(batchPromises)
      batchResults.push(...batchResult.map(result =>
        result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
      ))
    }

    // Calculate summary statistics
    const summary = {
      totalFiles: priceListFiles.length,
      successful: batchResults.filter(r => r.success).length,
      failed: batchResults.filter(r => !r.success).length,
      totalCreated: batchResults.reduce((sum, r) => sum + (r.created || 0), 0),
      totalUpdated: batchResults.reduce((sum, r) => sum + (r.updated || 0), 0),
      totalErrors: batchResults.reduce((sum, r) => sum + (r.errors?.length || 0), 0),
    }

    console.log(`✅ Batch processing completed:`, summary)

    return NextResponse.json({
      success: true,
      data: {
        results: batchResults,
        summary
      },
      message: `Batch processing completed: ${summary.successful}/${summary.totalFiles} files processed successfully`
    })

  } catch (error) {
    console.error('Batch processing error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Batch processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/pricelists/process - Get processing session status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      // Return all active sessions
      const activeSessionIds = processor.getActiveSessionIds()
      const sessions = activeSessionIds.map(id => ({
        sessionId: id,
        ...processor.getSession(id)
      }))

      return NextResponse.json({
        success: true,
        data: {
          activeSessions: sessions.length,
          sessions
        }
      })
    }

    const session = processor.getSession(sessionId)
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found',
        details: `Processing session ${sessionId} not found`
      }, { status: 404 })
    }

    // Get processing history from database
    const historyQuery = `
      SELECT * FROM price_list_processing_history
      WHERE session_id = $1
      ORDER BY created_at DESC
    `
    const historyResult = await query(historyQuery, [sessionId])

    return NextResponse.json({
      success: true,
      data: {
        session,
        history: historyResult.rows
      }
    })

  } catch (error) {
    console.error('Error fetching processing status:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch processing status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/pricelists/process - Cancel processing session
 */
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

    const session = processor.getSession(sessionId)
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 })
    }

    if (session.status === 'completed') {
      return NextResponse.json({
        success: false,
        error: 'Cannot cancel completed session'
      }, { status: 400 })
    }

    // Clear the session
    const cleared = processor.clearSession(sessionId)

    if (cleared) {
      // Log cancellation
      await query(
        `INSERT INTO price_list_processing_history (
          session_id, status, message, created_at
        ) VALUES ($1, $2, $3, NOW())`,
        [sessionId, 'cancelled', 'Session cancelled by user request']
      )

      return NextResponse.json({
        success: true,
        message: `Processing session ${sessionId} cancelled successfully`
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to cancel session'
    }, { status: 500 })

  } catch (error) {
    console.error('Error cancelling processing session:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to cancel session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions

async function logProcessingResult(
  result: any,
  supplierId: string,
  filePath: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO price_list_processing_history (
        session_id, supplier_id, file_path, status, total_processed,
        created_count, updated_count, skipped_count, error_count,
        execution_time_ms, backup_id, summary_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        result.sessionId,
        supplierId,
        filePath,
        result.success ? 'completed' : 'failed',
        result.totalProcessed,
        result.created,
        result.updated,
        result.skipped,
        result.errors?.length || 0,
        result.executionTime,
        result.backupId,
        JSON.stringify(result.summary)
      ]
    )
  } catch (error) {
    console.error('Error logging processing result:', error)
  }
}

async function determineSupplierId(
  filename: string,
  supplierMappings: Record<string, string>
): Promise<string | null> {
  // First, check explicit mappings
  if (supplierMappings[filename]) {
    return supplierMappings[filename]
  }

  // Try to match by filename patterns
  const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, '')

  // Get all suppliers and try to match
  const suppliersResult = await query(
    'SELECT id, name FROM suppliers WHERE status = $1',
    ['active']
  )

  for (const supplier of suppliersResult.rows) {
    const cleanSupplierName = supplier.name.toLowerCase().replace(/[^a-z0-9]/g, '')

    if (cleanFilename.includes(cleanSupplierName) || cleanSupplierName.includes(cleanFilename)) {
      return supplier.id
    }
  }

  return null
}

function createFileBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }
  return batches
}