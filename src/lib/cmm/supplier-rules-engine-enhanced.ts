/**
 * Enhanced Supplier Rules Engine
 * Supports join_sheets, sheet_loop, VAT policies, and validation rules
 */

import { query } from "@/lib/database"
import * as XLSX from 'xlsx'
import { VatPolicy, normalizePriceAndVat, applyVatPolicyToRows } from './vat-utils'

export interface SupplierRule {
  id: number
  supplierId: string
  ruleName: string
  ruleType:
    | "validation"
    | "transformation"
    | "approval"
    | "notification"
    | "enforcement"
  triggerEvent: string
  executionOrder: number
  ruleConfig: Record<string, unknown>
  errorMessageTemplate?: string
  isBlocking: boolean
}

export interface SupplierProfile {
  supplierId: string
  profileName: string
  guidelines: Record<string, unknown>
  processingConfig: Record<string, unknown>
  qualityStandards: Record<string, unknown>
  complianceRules: Record<string, unknown>
}

export interface RuleExecutionResult {
  ruleId: number
  ruleName: string
  ruleType: string
  passed: boolean
  blocked: boolean
  errorMessage?: string
  transformedData?: Record<string, unknown>
  executionTimeMs: number
  executionResult: Record<string, unknown>
}

export interface RuleEngineResult {
  passed: boolean
  blocked: boolean
  results: RuleExecutionResult[]
  errors: string[]
  warnings: string[]
  transformedData?: Record<string, unknown>
}

export interface CanonicalRow {
  supplier: string
  supplier_sku: string
  name: string
  category_raw?: string
  stock_on_hand?: number
  stock_on_order?: number
  cost_price_ex_vat?: number
  vat_rate?: number
  currency?: string
  brand?: string
  uom?: string
  barcode?: string
  attrs_json?: Record<string, any>
}

function norm(v: unknown): string {
  return String(v || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function findSheet(workbook: XLSX.WorkBook, nameLike: string): { name: string; rows: unknown[][] } | null {
  const target = norm(nameLike)
  for (const n of workbook.SheetNames) {
    const nn = norm(n)
    if (nn.includes(target)) {
      const ws = workbook.Sheets[n]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false }) as unknown[][]
      return { name: n, rows: data }
    }
  }
  return null
}

function headerIndex(headers: unknown[], columnName: string): number {
  const target = norm(columnName)
  for (let i = 0; i < headers.length; i++) {
    if (norm(headers[i] as string) === target) return i
  }
  return -1
}

/**
 * Enhanced applyPricelistRulesToExcel - supports join_sheets and sheet_loop
 */
export async function applyPricelistRulesToExcel(
  buffer: Buffer,
  supplierId: string
): Promise<{ rows: Record<string, unknown>[]; executionLog: RuleExecutionResult[] }> {
  const rules = await getSupplierRules(supplierId, 'pricelist_upload')
  const executionLog: RuleExecutionResult[] = []
  let allRows: Record<string, unknown>[] = []

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: false, cellText: false })

  // Process transformation rules in order
  for (const rule of rules.filter(r => r.ruleType === 'transformation')) {
    const startTime = Date.now()
    const result: RuleExecutionResult = {
      ruleId: rule.id,
      ruleName: rule.ruleName,
      ruleType: rule.ruleType,
      passed: false,
      blocked: false,
      executionTimeMs: 0,
      executionResult: {}
    }

    try {
      const config = rule.ruleConfig as any

      if (config.join_sheets) {
        const joinResult = await processJoinSheets(wb, config.join_sheets, rule.ruleName)
        allRows = joinResult.rows
        result.executionResult = { 
          processedRows: allRows.length, 
          sheetsProcessed: joinResult.sheetsProcessed 
        }
      } else if (config.sheet_loop) {
        const loopResult = await processSheetLoop(wb, config.sheet_loop, rule.ruleName)
        allRows = loopResult.rows
        result.executionResult = { 
          processedRows: allRows.length, 
          sheetsProcessed: loopResult.sheetsProcessed 
        }
      }

      // Apply VAT policy if specified
      if (config.vat_policy && allRows.length > 0) {
        const vatPolicy = config.vat_policy as VatPolicy
        const vatResult = applyVatPolicyToRows(allRows, vatPolicy)
        allRows = vatResult
        result.executionResult.vatApplied = true
        result.executionResult.vatPolicy = vatPolicy
      }

      result.passed = true
      result.executionTimeMs = Date.now() - startTime
    } catch (error) {
      result.passed = false
      result.errorMessage = error instanceof Error ? error.message : String(error)
      result.blocked = rule.isBlocking
    }

    executionLog.push(result)
  }

  return { rows: allRows, executionLog }
}

/**
 * Process join_sheets transformation
 */
async function processJoinSheets(
  wb: XLSX.WorkBook,
  config: any,
  ruleName: string
): Promise<{ rows: Record<string, unknown>[]; sheetsProcessed: string[] }> {
  const leftSheet = findSheet(wb, config.left_sheet)
  const rightSheet = findSheet(wb, config.right_sheet)

  if (!leftSheet || !rightSheet) {
    throw new Error(`Could not find sheets for join: ${config.left_sheet} or ${config.right_sheet}`)
  }

  const leftHeaders = leftSheet.rows[0] as string[]
  const rightHeaders = rightSheet.rows[0] as string[]

  // Build column mappings
  const leftJoinIdx = headerIndex(leftHeaders, config.join_on.left)
  const rightJoinIdx = headerIndex(rightHeaders, config.join_on.right)

  if (leftJoinIdx < 0 || rightJoinIdx < 0) {
    throw new Error(`Join columns not found: ${config.join_on.left} or ${config.join_on.right}`)
  }

  // Build right side map
  const rightMap = new Map<string, unknown[]>()
  for (let i = 1; i < rightSheet.rows.length; i++) {
    const row = rightSheet.rows[i]
    const joinKey = norm(row[rightJoinIdx])
    if (joinKey) rightMap.set(joinKey, row)
  }

  const outputRows: Record<string, unknown>[] = []
  const brandName = extractBrandFromSheetName(leftSheet.name)

  for (let i = 1; i < leftSheet.rows.length; i++) {
    const leftRow = leftSheet.rows[i]
    const joinKey = norm(leftRow[leftJoinIdx])
    if (!joinKey) continue

    const rightRow = rightMap.get(joinKey)
    if (!rightRow) continue

    const outputRow: Record<string, unknown> = {}

    // Process output_map
    for (const [outputField, mapping] of Object.entries(config.output_map)) {
      if (mapping.source === 'sheet_name') {
        outputRow[outputField] = brandName
      } else if (mapping.sheet === 'left') {
        const colIdx = headerIndex(leftHeaders, mapping.column)
        if (colIdx >= 0) outputRow[outputField] = leftRow[colIdx]
      } else if (mapping.sheet === 'right') {
        const colIdx = headerIndex(rightHeaders, mapping.column)
        if (colIdx >= 0) outputRow[outputField] = rightRow[colIdx]
      }
    }

    outputRows.push(outputRow)
  }

  return { 
    rows: outputRows, 
    sheetsProcessed: [leftSheet.name, rightSheet.name] 
  }
}

/**
 * Process sheet_loop transformation
 */
async function processSheetLoop(
  wb: XLSX.WorkBook,
  config: any,
  ruleName: string
): Promise<{ rows: Record<string, unknown>[]; sheetsProcessed: string[] }> {
  const sheetsToProcess: string[] = []
  
  // Determine which sheets to process
  for (const sheetName of wb.SheetNames) {
    const shouldInclude = config.include?.some((pattern: string) => {
      if (pattern === '*') return true
      return norm(sheetName).includes(norm(pattern))
    }) ?? true

    const shouldExclude = config.exclude?.some((pattern: string) => {
      return norm(sheetName).includes(norm(pattern))
    }) ?? false

    if (shouldInclude && !shouldExclude) {
      sheetsToProcess.push(sheetName)
    }
  }

  const allRows: Record<string, unknown>[] = []

  for (const sheetName of sheetsToProcess) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false }) as unknown[][]
    
    if (rows.length < 2) continue // Need headers + data

    const headers = rows[0] as string[]
    const brandName = config.brand_source === 'sheet_name' ? extractBrandFromSheetName(sheetName) : undefined

    // Apply column aliases
    const columnMap = buildColumnMap(headers, config.column_aliases || {})

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.every(cell => cell == null || cell === '')) continue

      const outputRow: Record<string, unknown> = {
        supplier: sheetName,
        brand: brandName
      }

      // Map columns using aliases
      for (const [canonicalName, sourceColumns] of Object.entries(columnMap)) {
        const match = sourceColumns.find(col => row[col.index] != null)
        outputRow[canonicalName] = match ? row[match.index] : undefined
      }

      // Handle section headers as categories if enabled
      if (config.section_headers_as_category) {
        const category = extractCategoryFromSectionHeader(sheetName, i, rows)
        if (category) outputRow.category_raw = category
      }

      allRows.push(outputRow)
    }
  }

  return { rows: allRows, sheetsProcessed: sheetsToProcess }
}

/**
 * Build column mapping from aliases
 */
function buildColumnMap(headers: string[], aliases: Record<string, string[]>): Map<string, { index: number }[]> {
  const map = new Map<string, { index: number }[]>()

  for (const [canonicalName, aliasList] of Object.entries(aliases)) {
    const matches: { index: number }[] = []
    
    for (const alias of aliasList) {
      const idx = headerIndex(headers, alias)
      if (idx >= 0) {
        matches.push({ index: idx })
      }
    }
    
    if (matches.length > 0) {
      map.set(canonicalName, matches)
    }
  }
  
  return map
}

/**
 * Extract brand name from sheet name
 */
function extractBrandFromSheetName(sheetName: string): string {
  // Remove common suffixes and clean up
  let brand = sheetName
    .replace(/\s+(price\s*list|pricelist|stock|inventory|sheet)$/i, '')
    .replace(/\s+\d+$/i, '') // Remove trailing numbers
    .trim()
  
  // Title case
  return brand.split(/\s+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}

/**
 * Extract category from section headers (placeholder - implement based on specific needs)
 */
function extractCategoryFromSectionHeader(sheetName: string, rowIndex: number, allRows: unknown[][]): string | undefined {
  // This is a simplified implementation
  // In practice, you'd look for header rows, merged cells, etc.
  return undefined
}

/**
 * Get supplier rules from database
 */
export async function getSupplierRules(
  supplierId: string,
  triggerEvent: string
): Promise<SupplierRule[]> {
  const result = await query<SupplierRule>(`
    SELECT 
      id,
      supplier_id as "supplierId",
      rule_name as "ruleName",
      rule_type as "ruleType",
      trigger_event as "triggerEvent",
      execution_order as "executionOrder",
      rule_config as "ruleConfig",
      error_message_template as "errorMessageTemplate",
      is_blocking as "isBlocking"
    FROM spp.supplier_rules
    WHERE supplier_id = $1
      AND (trigger_event = $2 OR trigger_event = 'all')
      AND is_blocking = false  -- Only active rules
    ORDER BY execution_order ASC, id ASC
  `, [supplierId, triggerEvent])
  return result.rows
}

/**
 * Log rule execution for audit trail
 */
export async function logRuleExecution(
  supplierId: string,
  uploadId: string,
  rule: SupplierRule,
  result: RuleExecutionResult
): Promise<void> {
  await query(`
    INSERT INTO spp.supplier_rule_executions (
      supplier_id, upload_id, rule_id, rule_name, rule_type, 
      execution_order, passed, blocked, error_message, 
      transformed_data, execution_time_ms, execution_result
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12::jsonb)
  `, [
    supplierId,
    uploadId,
    rule.id,
    rule.ruleName,
    rule.ruleType,
    rule.executionOrder,
    result.passed,
    result.blocked,
    result.errorMessage,
    JSON.stringify(result.transformedData || {}),
    result.executionTimeMs,
    JSON.stringify(result.executionResult || {})
  ])
}