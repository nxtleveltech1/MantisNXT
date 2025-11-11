import type { Pool } from 'pg'
import * as XLSX from 'xlsx'
import * as fs from 'fs/promises'
import * as path from 'path'
import { z } from 'zod'
import { pool } from '@/lib/database'
import { upsertSupplierProduct, setStock } from '@/services/ssot/inventoryService'

// ============================================================================
// COMPREHENSIVE PRICE LIST PROCESSING SERVICE
// Backend service for automated processing of supplier price list files
// ============================================================================

// Data validation schemas
const PriceListEntrySchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  supplier_sku: z.string().optional(),
  cost_price: z.number().min(0, 'Cost price must be non-negative'),
  sale_price: z.number().optional(),
  currency: z.string().default('ZAR'),
  stock_qty: z.number().min(0, 'Stock quantity must be non-negative'),
  unit: z.string().default('pcs'),
  weight: z.number().optional(),
  barcode: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

const ProcessingConfigSchema = z.object({
  supplierId: z.string().uuid(),
  filePath: z.string(),
  options: z.object({
    skipEmptyRows: z.boolean().default(true),
    validateData: z.boolean().default(true),
    createBackup: z.boolean().default(true),
    batchSize: z.number().min(1).max(1000).default(100),
    duplicateHandling: z.enum(['skip', 'update', 'create_variant']).default('update'),
    enableLogging: z.boolean().default(true),
  }).default({}),
})

// Types
interface ProcessingResult {
  success: boolean
  sessionId: string
  totalProcessed: number
  created: number
  updated: number
  skipped: number
  errors: ProcessingError[]
  summary: ProcessingSummary
  backupId?: string
  executionTime: number
}

interface ProcessingError {
  row: number
  field?: string
  message: string
  severity: 'warning' | 'error'
  data?: unknown
}

interface ProcessingSummary {
  fileInfo: {
    filename: string
    size: number
    format: string
    sheets?: string[]
  }
  dataQuality: {
    validRows: number
    invalidRows: number
    duplicates: number
    missingRequired: number
    priceInconsistencies: number
  }
  businessImpact: {
    totalValue: number
    newCategories: string[]
    newBrands: string[]
    priceChanges: number
    stockUpdates: number
  }
}

interface ParsedData {
  headers: string[]
  rows: unknown[][]
  metadata: {
    sheetName?: string
    totalRows: number
    format: string
  }
}

export class PriceListProcessor {
  private pool: Pool
  private processingSession: Map<string, unknown> = new Map()

  constructor(databasePool?: Pool) {
    this.pool = databasePool || pool
  }

  /**
   * Main entry point for processing price list files
   */
  async processFile(config: unknown): Promise<ProcessingResult> {
    const startTime = Date.now()
    const validatedConfig = ProcessingConfigSchema.parse(config)
    const sessionId = this.generateSessionId()

    console.log(`🚀 Starting price list processing - Session: ${sessionId}`)

    try {
      // Initialize processing session
      this.processingSession.set(sessionId, {
        config: validatedConfig,
        status: 'initializing',
        progress: 0,
        startTime,
      })

      // Step 1: Parse and validate file format
      const parsedData = await this.parseFile(validatedConfig.filePath)
      this.updateSession(sessionId, { status: 'parsing', progress: 10 })

      // Step 2: Auto-detect field mappings
      const fieldMappings = await this.detectFieldMappings(parsedData.headers)
      this.updateSession(sessionId, { status: 'mapping', progress: 20 })

      // Step 3: Transform and validate data
      const validatedData = await this.validateAndTransformData(
        parsedData,
        fieldMappings,
        validatedConfig
      )
      this.updateSession(sessionId, { status: 'validating', progress: 40 })

      // Step 4: Handle duplicates and conflicts
      const deduplicatedData = await this.handleDuplicates(
        validatedData,
        validatedConfig.options.duplicateHandling
      )
      this.updateSession(sessionId, { status: 'deduplicating', progress: 60 })

      // Step 5: Create backup if required
      let backupId: string | undefined
      if (validatedConfig.options.createBackup) {
        backupId = await this.createBackup(validatedConfig.supplierId, deduplicatedData.validEntries)
        this.updateSession(sessionId, { status: 'backup', progress: 70 })
      }

      // Step 6: Bulk import to database
      const importResult = await this.bulkImport(
        deduplicatedData.validEntries,
        validatedConfig.supplierId,
        validatedConfig.options.batchSize
      )
      this.updateSession(sessionId, { status: 'importing', progress: 90 })

      // Step 7: Generate comprehensive summary
      const summary = await this.generateSummary(
        parsedData,
        validatedData,
        importResult
      )
      this.updateSession(sessionId, { status: 'completed', progress: 100 })

      const executionTime = Date.now() - startTime

      console.log(`✅ Price list processing completed - Session: ${sessionId} (${executionTime}ms)`)

      return {
        success: true,
        sessionId,
        totalProcessed: importResult.totalProcessed,
        created: importResult.created,
        updated: importResult.updated,
        skipped: importResult.skipped,
        errors: [...validatedData.errors, ...importResult.errors],
        summary,
        backupId,
        executionTime,
      }

    } catch (error) {
      console.error(`❌ Price list processing failed - Session: ${sessionId}:`, error)

      this.updateSession(sessionId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw new Error(`Price list processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse various file formats (Excel, CSV, etc.)
   */
  private async parseFile(filePath: string): Promise<ParsedData> {
    const fileExtension = path.extname(filePath).toLowerCase()
    const fileStats = await fs.stat(filePath)

    console.log(`📄 Parsing file: ${path.basename(filePath)} (${fileStats.size} bytes)`)

    try {
      switch (fileExtension) {
        case '.xlsx':
        case '.xls':
          return this.parseExcelFile(filePath)
        case '.csv':
          return this.parseCSVFile(filePath)
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`)
      }
    } catch (error) {
      throw new Error(`File parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse Excel files with support for multiple sheets
   */
  private async parseExcelFile(filePath: string): Promise<ParsedData> {
    const workbook = XLSX.readFile(filePath)
    const sheetNames = workbook.SheetNames

    // Use first sheet or find the most likely data sheet
    const targetSheet = this.findDataSheet(workbook, sheetNames)
    const worksheet = workbook.Sheets[targetSheet]

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false,
    })

    if (jsonData.length < 2) {
      throw new Error('File must contain at least a header row and one data row')
    }

    const headers = jsonData[0] as string[]
    const rows = jsonData.slice(1) as unknown[][]

    // Clean headers
    const cleanHeaders = headers.map(h =>
      typeof h === 'string' ? h.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ') : String(h)
    )

    return {
      headers: cleanHeaders,
      rows: rows.filter(row => row.some(cell => cell !== null && cell !== '')),
      metadata: {
        sheetName: targetSheet,
        totalRows: rows.length,
        format: 'excel',
      },
    }
  }

  /**
   * Parse CSV files with automatic delimiter detection
   */
  private async parseCSVFile(filePath: string): Promise<ParsedData> {
    const fileContent = await fs.readFile(filePath, 'utf-8')

    // Detect delimiter
    const delimiter = this.detectCSVDelimiter(fileContent)

    const lines = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row')
    }

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/['"]/g, ''))
    const rows = lines.slice(1).map(line => {
      return line.split(delimiter).map(cell => {
        const cleaned = cell.trim().replace(/['"]/g, '')
        return cleaned === '' ? null : cleaned
      });
    })

    return {
      headers,
      rows: rows.filter(row => row.some(cell => cell !== null && cell !== '')),
      metadata: {
        totalRows: rows.length,
        format: 'csv',
      },
    }
  }

  /**
   * Auto-detect field mappings using intelligent pattern matching
   */
  private async detectFieldMappings(headers: string[]): Promise<Record<string, string>> {
    const mappings: Record<string, string> = {}
    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))

    const fieldPatterns = {
      sku: ['sku', 'item_code', 'product_code', 'part_number', 'model', 'code'],
      name: ['name', 'product_name', 'item_name', 'title', 'product'],
      description: ['description', 'details', 'product_description', 'desc', 'info'],
      category: ['category', 'type', 'group', 'class', 'division'],
      subcategory: ['subcategory', 'subtype', 'subgroup', 'subclass'],
      brand: ['brand', 'make', 'manufacturer', 'mfg', 'vendor'],
      supplier_sku: ['supplier_sku', 'vendor_sku', 'supplier_code', 'vendor_code'],
      cost_price: ['cost', 'price', 'cost_price', 'unit_price', 'buy_price', 'wholesale'],
      sale_price: ['sale_price', 'retail', 'sell_price', 'list_price', 'msrp'],
      currency: ['currency', 'curr', 'money'],
      stock_qty: ['stock', 'quantity', 'qty', 'inventory', 'on_hand', 'available'],
      unit: ['unit', 'uom', 'measure', 'per'],
      weight: ['weight', 'mass', 'kg', 'grams'],
      barcode: ['barcode', 'upc', 'ean', 'gtin'],
    }

    // Smart matching with confidence scoring
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      let bestMatch = { header: '', confidence: 0, index: -1 }

      normalizedHeaders.forEach((normalizedHeader, index) => {
        for (const pattern of patterns) {
          let confidence = 0

          if (normalizedHeader === pattern) {
            confidence = 1.0 // Perfect match
          } else if (normalizedHeader.includes(pattern)) {
            confidence = 0.8 // Contains pattern
          } else if (pattern.includes(normalizedHeader)) {
            confidence = 0.6 // Pattern contains header
          } else {
            // Fuzzy matching for common variations
            const similarity = this.calculateStringSimilarity(normalizedHeader, pattern)
            if (similarity > 0.5) {
              confidence = similarity * 0.7
            }
          }

          if (confidence > bestMatch.confidence) {
            bestMatch = { header: headers[index], confidence, index }
          }
        }
      })

      // Only use mappings with reasonable confidence
      if (bestMatch.confidence >= 0.5) {
        mappings[field] = bestMatch.header
      }
    }

    console.log(`🎯 Field mapping confidence: ${Object.keys(mappings).length}/${Object.keys(fieldPatterns).length} fields mapped`)

    return mappings
  }

  /**
   * Validate and transform data with comprehensive error checking
   */
  private async validateAndTransformData(
    parsedData: ParsedData,
    fieldMappings: Record<string, string>,
    config: unknown
  ): Promise<{
    validEntries: unknown[]
    invalidEntries: unknown[]
    errors: ProcessingError[]
    stats: unknown
  }> {
    const validEntries: unknown[] = []
    const invalidEntries: unknown[] = []
    const errors: ProcessingError[] = []
    const stats = {
      totalRows: parsedData.rows.length,
      processedRows: 0,
      validRows: 0,
      invalidRows: 0,
    }

    console.log(`🔍 Validating ${parsedData.rows.length} data rows`)

    for (let rowIndex = 0; rowIndex < parsedData.rows.length; rowIndex++) {
      const row = parsedData.rows[rowIndex]
      const rowNumber = rowIndex + 2 // Account for header row and 1-based indexing

      // Skip empty rows if configured
      if (config.options.skipEmptyRows && row.every((cell: unknown) => !cell || cell.toString().trim() === '')) {
        continue
      }

      const transformedEntry: unknown = {}
      let hasErrors = false
      const rowErrors: ProcessingError[] = []

      // Map and validate each field
      for (const [targetField, sourceHeader] of Object.entries(fieldMappings)) {
        if (!sourceHeader) continue

        const sourceIndex = parsedData.headers.indexOf(sourceHeader)
        if (sourceIndex === -1) continue

        const cellValue = row[sourceIndex]

        try {
          const transformedValue = this.transformFieldValue(targetField, cellValue, rowNumber)
          if (transformedValue !== null) {
            transformedEntry[targetField] = transformedValue
          }
        } catch (error) {
          hasErrors = true
          rowErrors.push({
            row: rowNumber,
            field: targetField,
            message: error instanceof Error ? error.message : 'Transformation failed',
            severity: 'error',
            data: cellValue,
          })
        }
      }

      // Validate required fields
      const requiredFields = ['sku', 'name', 'category', 'cost_price']
      for (const requiredField of requiredFields) {
        if (!transformedEntry[requiredField]) {
          hasErrors = true
          rowErrors.push({
            row: rowNumber,
            field: requiredField,
            message: `Required field '${requiredField}' is missing or invalid`,
            severity: 'error',
          })
        }
      }

      // Additional business logic validation
      if (transformedEntry.cost_price && transformedEntry.sale_price) {
        if (transformedEntry.cost_price > transformedEntry.sale_price) {
          rowErrors.push({
            row: rowNumber,
            field: 'sale_price',
            message: 'Sale price is lower than cost price',
            severity: 'warning',
          })
        }
      }

      if (hasErrors) {
        invalidEntries.push({ ...transformedEntry, _rowNumber: rowNumber, _errors: rowErrors })
        stats.invalidRows++
      } else {
        validEntries.push(transformedEntry)
        stats.validRows++
      }

      errors.push(...rowErrors)
      stats.processedRows++

      // Progress logging
      if (stats.processedRows % 1000 === 0) {
        console.log(`📊 Progress: ${stats.processedRows}/${stats.totalRows} rows processed`)
      }
    }

    console.log(`✅ Data validation completed: ${stats.validRows} valid, ${stats.invalidRows} invalid`)

    return { validEntries, invalidEntries, errors, stats }
  }

  /**
   * Handle duplicate entries with configurable strategies
   */
  private async handleDuplicates(
    validatedData: unknown,
    duplicateHandling: 'skip' | 'update' | 'create_variant'
  ): Promise<unknown> {
    const { validEntries } = validatedData
    const processedEntries: unknown[] = []
    const skippedEntries: unknown[] = []
    const duplicateMap = new Map<string, unknown[]>()

    // Group entries by SKU
    for (const entry of validEntries) {
      const sku = entry.sku.toUpperCase()
      if (!duplicateMap.has(sku)) {
        duplicateMap.set(sku, [])
      }
      duplicateMap.get(sku)!.push(entry)
    }

    // Check against existing database records
    const existingSkus = await this.getExistingSKUs([...duplicateMap.keys()])

    for (const [sku, entries] of duplicateMap) {
      const hasExistingRecord = existingSkus.has(sku)

      if (entries.length === 1 && !hasExistingRecord) {
        // No duplicates, add as-is
        processedEntries.push(entries[0])
      } else {
        // Handle duplicates based on strategy
        switch (duplicateHandling) {
          case 'skip':
            if (hasExistingRecord) {
              skippedEntries.push(...entries)
            } else {
              processedEntries.push(entries[0])
              skippedEntries.push(...entries.slice(1))
            }
            break

          case 'update':
            const mergedEntry = this.mergeEntries(entries)
            mergedEntry._isUpdate = hasExistingRecord
            processedEntries.push(mergedEntry)
            break

          case 'create_variant':
            for (let i = 0; i < entries.length; i++) {
              const entry = { ...entries[i] }
              if (i > 0 || hasExistingRecord) {
                entry.sku = `${sku}-V${Date.now()}-${i}`
              }
              processedEntries.push(entry)
            }
            break
        }
      }
    }

    console.log(`🔀 Duplicate handling: ${processedEntries.length} to process, ${skippedEntries.length} skipped`)

    return {
      ...validatedData,
      validEntries: processedEntries,
      skippedEntries,
    }
  }

  /**
   * Bulk import data to database with optimized batch processing
   */
  private async bulkImport(
    entries: unknown[],
    supplierId: string,
    batchSize: number
  ): Promise<{
    totalProcessed: number
    created: number
    updated: number
    skipped: number
    errors: ProcessingError[]
  }> {
    const result = {
      totalProcessed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as ProcessingError[],
    }

    const batches = this.createBatches(entries, batchSize)

    console.log(`💾 Starting bulk import: ${entries.length} entries in ${batches.length} batches`)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`)

      try {
        const batchResult = await this.processBatch(batch, supplierId)
        result.created += batchResult.created
        result.updated += batchResult.updated
        result.skipped += batchResult.skipped
        result.errors.push(...batchResult.errors)
      } catch (error) {
        result.errors.push({
          row: -1,
          message: `Batch ${batchIndex + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error',
        })
      }

      result.totalProcessed += batch.length
    }

    console.log(`✅ Bulk import completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`)

    return result
  }

  // Helper methods continue below...

  private generateSessionId(): string {
    return `pricelist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private updateSession(sessionId: string, updates: unknown): void {
    const current = this.processingSession.get(sessionId) || {}
    this.processingSession.set(sessionId, { ...current, ...updates, updatedAt: new Date() })
  }

  private findDataSheet(workbook: XLSX.WorkBook, sheetNames: string[]): string {
    // Look for sheets with common data indicators
    const dataIndicators = ['price', 'product', 'inventory', 'stock', 'item']

    for (const name of sheetNames) {
      const lowerName = name.toLowerCase()
      if (dataIndicators.some(indicator => lowerName.includes(indicator))) {
        return name
      }
    }

    // Fall back to first sheet
    return sheetNames[0]
  }

  private detectCSVDelimiter(content: string): string {
    const delimiters = [',', ';', '\t', '|']
    const sampleLines = content.split('\n').slice(0, 5)

    let bestDelimiter = ','
    let maxColumns = 0

    for (const delimiter of delimiters) {
      const avgColumns = sampleLines.reduce((sum, line) => {
        return sum + line.split(delimiter).length
      }, 0) / sampleLines.length

      if (avgColumns > maxColumns) {
        maxColumns = avgColumns
        bestDelimiter = delimiter
      }
    }

    return bestDelimiter
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  private transformFieldValue(fieldName: string, value: unknown, rowNumber: number): unknown {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const stringValue = value.toString().trim()
    if (!stringValue) return null

    switch (fieldName) {
      case 'sku':
        return stringValue.toUpperCase().replace(/[^\w\-_.]/g, '');

      case 'cost_price':
      case 'sale_price':
        const numValue = parseFloat(stringValue.replace(/[^\d.-]/g, ''))
        if (isNaN(numValue) || numValue < 0) {
          throw new Error(`Invalid ${fieldName}: must be a non-negative number`)
        }
        return numValue

      case 'stock_qty':
        const qty = parseInt(stringValue.replace(/[^\d.-]/g, ''))
        if (isNaN(qty) || qty < 0) {
          throw new Error('Invalid stock quantity: must be a non-negative integer')
        }
        return qty

      case 'weight':
        const weight = parseFloat(stringValue.replace(/[^\d.-]/g, ''))
        return isNaN(weight) ? null : weight

      case 'currency':
        const curr = stringValue.toUpperCase()
        if (!['USD', 'EUR', 'GBP', 'ZAR', 'CAD', 'AUD'].includes(curr)) {
          return 'ZAR' // Default currency
        }
        return curr

      case 'tags':
        if (Array.isArray(value)) return value
        return stringValue.split(/[,;|]/).map(tag => tag.trim()).filter(Boolean);

      default:
        return stringValue
    }
  }

  private async getExistingSKUs(skus: string[]): Promise<Set<string>> {
    if (skus.length === 0) return new Set()

    try {
      const query = 'SELECT sku FROM public.inventory_items WHERE sku = ANY($1)'
      const result = await this.pool.query(query, [skus])
      return new Set(result.rows.map(row => row.sku))
    } catch (error) {
      console.error('Error fetching existing SKUs:', error)
      return new Set()
    }
  }

  private mergeEntries(entries: unknown[]): unknown {
    if (entries.length === 1) return entries[0]

    const merged = { ...entries[0] }

    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i]

      // Use the highest price
      if (entry.cost_price && (!merged.cost_price || entry.cost_price > merged.cost_price)) {
        merged.cost_price = entry.cost_price
      }

      if (entry.sale_price && (!merged.sale_price || entry.sale_price > merged.sale_price)) {
        merged.sale_price = entry.sale_price
      }

      // Sum stock quantities
      if (entry.stock_qty) {
        merged.stock_qty = (merged.stock_qty || 0) + entry.stock_qty
      }

      // Merge tags
      if (entry.tags && Array.isArray(entry.tags)) {
        merged.tags = [...new Set([...(merged.tags || []), ...entry.tags])]
      }

      // Use the most complete description
      if (entry.description && (!merged.description || entry.description.length > merged.description.length)) {
        merged.description = entry.description
      }
    }

    return merged
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private async processBatch(batch: unknown[], supplierId: string): Promise<{
    created: number
    updated: number
    skipped: number
    errors: ProcessingError[]
  }> {
    const result = { created: 0, updated: 0, skipped: 0, errors: [] as ProcessingError[] }

    for (const entry of batch) {
      try {
        if (entry._isUpdate) {
          await this.updateInventoryItem(entry)
          result.updated++
        } else {
          await this.createInventoryItem(entry, supplierId)
          result.created++
        }
      } catch (error) {
        result.skipped++
        result.errors.push({
          row: entry._rowNumber || -1,
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error',
          data: entry,
        })
      }
    }

    return result
  }

  private async createInventoryItem(entry: unknown, supplierId: string): Promise<void> {
    const spSku = entry.supplier_sku || entry.sku
    await upsertSupplierProduct({ supplierId, sku: spSku, name: entry.name })
    await setStock({
      supplierId,
      sku: spSku,
      quantity: entry.stock_qty || 0,
      unitCost: entry.cost_price,
      reason: 'Pricelist import'
    })
  }

  private async updateInventoryItem(entry: unknown): Promise<void> {
    const spSku = entry.supplier_sku || entry.sku
    if (entry.stock_qty !== undefined) {
      await setStock({
        supplierId: entry.supplier_id,
        sku: spSku,
        quantity: entry.stock_qty,
        unitCost: entry.cost_price,
        reason: 'Pricelist update'
      })
    }
  }

  private async createBackup(supplierId: string, entries: unknown[]): Promise<string> {
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const query = `
      INSERT INTO price_list_backups (
        id, supplier_id, backup_data, entry_count, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `

    await this.pool.query(query, [
      backupId,
      supplierId,
      JSON.stringify(entries),
      entries.length,
    ])

    return backupId
  }

  private async generateSummary(
    parsedData: ParsedData,
    validatedData: unknown,
    importResult: unknown
  ): Promise<ProcessingSummary> {
    const categories = new Set<string>()
    const brands = new Set<string>()
    let totalValue = 0

    for (const entry of validatedData.validEntries) {
      if (entry.category) categories.add(entry.category)
      if (entry.brand) brands.add(entry.brand)
      if (entry.cost_price && entry.stock_qty) {
        totalValue += entry.cost_price * entry.stock_qty
      }
    }

    return {
      fileInfo: {
        filename: parsedData.metadata.sheetName || 'unknown',
        size: 0, // Would be filled from file stats
        format: parsedData.metadata.format,
        sheets: parsedData.metadata.sheetName ? [parsedData.metadata.sheetName] : undefined,
      },
      dataQuality: {
        validRows: validatedData.stats.validRows,
        invalidRows: validatedData.stats.invalidRows,
        duplicates: validatedData.validEntries.length - validatedData.stats.validRows,
        missingRequired: validatedData.errors.filter(e => e.message.includes('required')).length,
        priceInconsistencies: validatedData.errors.filter(e => e.message.includes('price')).length,
      },
      businessImpact: {
        totalValue,
        newCategories: Array.from(categories),
        newBrands: Array.from(brands),
        priceChanges: importResult.updated,
        stockUpdates: importResult.created + importResult.updated,
      },
    }
  }

  // Public methods for session management

  getSession(sessionId: string): unknown {
    return this.processingSession.get(sessionId)
  }

  clearSession(sessionId: string): boolean {
    return this.processingSession.delete(sessionId)
  }

  getActiveSessionIds(): string[] {
    return Array.from(this.processingSession.keys())
  }
}

export default PriceListProcessor
