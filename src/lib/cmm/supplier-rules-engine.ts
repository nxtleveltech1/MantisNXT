// @ts-nocheck

import { query } from "@/lib/database"
import * as XLSX from 'xlsx'

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
    if (norm(headers[i]) === target) return i
  }
  return -1
}

export async function applyPricelistRulesToExcel(
  filePath: string,
  supplierId: string
): Promise<Record<string, unknown>[]> {
  const rules = await getSupplierRules(supplierId, 'pricelist_upload')
  const transform = rules.find(r => r.ruleType === 'transformation' && (r.ruleConfig as any)?.join_sheets)
  if (!transform) return []

  const cfg = (transform.ruleConfig as any).join_sheets
  const buffer = await (await import('fs/promises')).readFile(filePath)
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: false, cellText: false })

  function lev(a: string, b: string): number {
    const s = a, t = b
    const m = s.length, n = t.length
    const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) d[i][0] = i
    for (let j = 0; j <= n; j++) d[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      }
    }
    return d[m][n]
  }
  function fuzzyFind(nameLike: string): string | null {
    const thresh = typeof cfg.sheet_matcher?.threshold === 'number' ? cfg.sheet_matcher.threshold : 0.6
    const target = norm(nameLike)
    let best: { name: string; score: number } | null = null
    for (const n of wb.SheetNames) {
      const nn = norm(n)
      const dist = lev(target, nn)
      const maxLen = Math.max(target.length, nn.length) || 1
      const score = 1 - dist / maxLen
      if (!best || score > best.score) best = { name: n, score }
    }
    if (best && best.score >= thresh) return best.name
    return null
  }

  function pickSheet(nameLike: string): { name: string; rows: unknown[][] } | null {
    const mode = cfg.sheet_matcher?.type || 'includes'
    let name: string | null = null
    if (mode === 'exact') {
      name = wb.SheetNames.find(s => norm(s) === norm(nameLike)) || null
    } else if (mode === 'includes') {
      name = wb.SheetNames.find(s => norm(s).includes(norm(nameLike))) || null
    } else {
      name = fuzzyFind(nameLike)
    }
    if (!name) return null
    const ws = wb.Sheets[name]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false }) as unknown[][]
    return { name, rows: data }
  }

  const left = pickSheet(cfg.left_sheet)
  const right = pickSheet(cfg.right_sheet)
  if (!left || !right || left.rows.length === 0 || right.rows.length === 0) return []

  const leftHeaders = left.rows[0] as unknown[]
  const rightHeaders = right.rows[0] as unknown[]
  const li = {
    joinKey: headerIndex(leftHeaders, cfg.join_on?.left),
    part: headerIndex(leftHeaders, (cfg.output_map?.sku?.column) || 'Part#'),
    title: headerIndex(leftHeaders, (cfg.output_map?.description?.column) || 'Product Title'),
    materials: headerIndex(leftHeaders, (cfg.output_map?.category?.column) || 'Materials'),
  }
  const ri = {
    joinKey: headerIndex(rightHeaders, cfg.join_on?.right),
    nettExcl: headerIndex(rightHeaders, (cfg.output_map?.priceExVat?.column) || 'NETT EXCL'),
  }

  if (li.joinKey < 0 || ri.joinKey < 0) return []

  const rightMap = new Map<string, unknown[]>()
  for (let i = 1; i < right.rows.length; i++) {
    const row = right.rows[i]
    if (!row || !Array.isArray(row)) continue
    const key = norm((row as unknown[])[ri.joinKey])
    if (key) rightMap.set(key, row as unknown[])
  }

  const brandName = ((): string => {
    const n = left.name.trim()
    const m = n.match(/^(.+?)\s+product\s+list/i)
    if (m && m[1]) return m[1].trim()
    return n
  })()

  const out: Record<string, unknown>[] = []
  for (let i = 1; i < left.rows.length; i++) {
    const lrow = left.rows[i] as unknown[]
    if (!lrow || lrow.every(c => c == null || c === '')) continue
    const lk = norm(lrow[li.joinKey])
    if (!lk) continue
    const rrow = rightMap.get(lk)
    if (!rrow) continue

    const sku = li.part >= 0 ? lrow[li.part] : undefined
    const title = li.title >= 0 ? lrow[li.title] : undefined
    const materials = li.materials >= 0 ? lrow[li.materials] : undefined
    const nett = ri.nettExcl >= 0 ? rrow[ri.nettExcl] : undefined

    const rec: Record<string, unknown> = {}
    rec['sku'] = sku
    rec['description'] = title
    rec['brand'] = brandName
    rec['priceExVat'] = nett
    if (materials !== undefined && materials !== null && String(materials).trim() !== '') {
      rec['category'] = materials
    }
    out.push(rec)
  }

  return out
}

export async function createDecksaverJoinRule(supplierId: string): Promise<void> {
  const cfg = {
    join_sheets: {
      left_sheet: 'Decksaver product list',
      right_sheet: 'Decksaver price list',
      join_on: { left: 'Product Title', right: 'Description' },
      drop_right: ['sku'],
      output_map: {
        sku: { sheet: 'left', column: 'Part#' },
        description: { sheet: 'left', column: 'Product Title' },
        priceExVat: { sheet: 'right', column: 'NETT EXCL' },
        brand: { source: 'sheet_name' },
        category: { sheet: 'left', column: 'Materials' }
      }
    }
  }
  await query(
    `INSERT INTO public.supplier_rules (
      supplier_id, rule_name, rule_type, trigger_event, execution_order, rule_config, is_blocking, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
    ON CONFLICT DO NOTHING`,
    [supplierId, 'Decksaver join sheets', 'transformation', 'pricelist_upload', 1, JSON.stringify(cfg), false, true]
  )
}

/**
 * Get all active rules for a supplier and operation type
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
    FROM supplier_rules
    WHERE supplier_id = $1
      AND (trigger_event = $2 OR trigger_event = 'all')
      AND is_active = true
    ORDER BY execution_order ASC, id ASC
  `, [supplierId, triggerEvent])
  return result.rows
}

/**
 * Get supplier profile
 */
export async function getSupplierProfile(
  supplierId: string,
  profileName: string = "default"
): Promise<SupplierProfile | null> {
  const result = await query<{
    supplierId: string
    profileName: string
    guidelines: unknown
    processingConfig: unknown
    qualityStandards: unknown
    complianceRules: unknown
  }>(`
    SELECT 
      supplier_id as "supplierId",
      profile_name as "profileName",
      guidelines,
      processing_config as "processingConfig",
      quality_standards as "qualityStandards",
      compliance_rules as "complianceRules"
    FROM supplier_profiles
    WHERE supplier_id = $1
      AND profile_name = $2
      AND is_active = true
    LIMIT 1
  `, [supplierId, profileName])
  return result.rows[0] || null
}

/**
 * Execute a single rule against data
 */
function executeRule(
  rule: SupplierRule,
  data: Record<string, unknown>,
  context?: Record<string, unknown>
): RuleExecutionResult {
  const startTime = Date.now()
  const result: RuleExecutionResult = {
    ruleId: rule.id,
    ruleName: rule.ruleName,
    ruleType: rule.ruleType,
    passed: false,
    blocked: false,
    executionTimeMs: 0,
    executionResult: {},
  }

  try {
    switch (rule.ruleType) {
      case "validation":
        result.passed = executeValidationRule(rule, data, result)
        break

      case "transformation":
        result.transformedData = executeTransformationRule(rule, data, result)
        result.passed = true
        break

      case "approval":
        result.passed = executeApprovalRule(rule, data, context, result)
        break

      case "notification":
        result.passed = executeNotificationRule(rule, data, result)
        break

      case "enforcement":
        result.passed = executeEnforcementRule(rule, data, result)
        break

      default:
        result.passed = false
        result.errorMessage = `Unknown rule type: ${rule.ruleType}`
    }

    if (!result.passed && rule.isBlocking) {
      result.blocked = true
    }
  } catch (error) {
    result.passed = false
    result.errorMessage =
      error instanceof Error ? error.message : "Rule execution failed"
    if (rule.isBlocking) {
      result.blocked = true
    }
  }

  result.executionTimeMs = Date.now() - startTime
  return result
}

/**
 * Execute validation rule
 */
function executeValidationRule(
  rule: SupplierRule,
  data: Record<string, unknown>,
  result: RuleExecutionResult
): boolean {
  const config = rule.ruleConfig
  const field = config.field

  if (!field) {
    result.errorMessage = "Validation rule missing field configuration"
    return false
  }

  const value = data[field]

  // Required check
  if (
    config.required &&
    (value === undefined || value === null || value === "")
  ) {
    result.errorMessage =
      rule.errorMessageTemplate || `Field ${field} is required`
    result.executionResult = { field, reason: "required", value }
    return false
  }

  // Pattern validation
  if (config.pattern && value) {
    const regex = new RegExp(config.pattern)
    if (!regex.test(String(value))) {
      result.errorMessage =
        rule.errorMessageTemplate ||
        `Field ${field} does not match required pattern`
      result.executionResult = { field, pattern: config.pattern, value }
      return false
    }
  }

  // Value range validation
  if (config.min !== undefined || config.max !== undefined) {
    const numValue = Number(value)
    if (!isNaN(numValue)) {
      if (config.min !== undefined && numValue < config.min) {
        result.errorMessage =
          rule.errorMessageTemplate ||
          `Field ${field} must be at least ${config.min}`
        result.executionResult = { field, min: config.min, value: numValue }
        return false
      }
      if (config.max !== undefined && numValue > config.max) {
        result.errorMessage =
          rule.errorMessageTemplate ||
          `Field ${field} must be at most ${config.max}`
        result.executionResult = { field, max: config.max, value: numValue }
        return false
      }
    }
  }

  // Allowed values check
  if (config.allowed_values && Array.isArray(config.allowed_values)) {
    if (!config.allowed_values.includes(value)) {
      result.errorMessage =
        rule.errorMessageTemplate ||
        `Field ${field} must be one of: ${config.allowed_values.join(", ")}`
      result.executionResult = {
        field,
        allowedValues: config.allowed_values,
        value,
      }
      return false
    }
  }

  // Price variance check
  if (config.max_variance_percent && config.compare_field) {
    const price = Number(data[config.field])
    const cost = Number(data[config.compare_field])
    if (!isNaN(price) && !isNaN(cost) && cost > 0) {
      const variance = ((price - cost) / cost) * 100
      if (Math.abs(variance) > config.max_variance_percent) {
        result.errorMessage =
          rule.errorMessageTemplate ||
          `Price variance ${variance.toFixed(2)}% exceeds maximum ${
            config.max_variance_percent
          }%`
        result.executionResult = {
          field,
          variance,
          maxVariance: config.max_variance_percent,
          price,
          cost,
        }
        // Only fail if not requiring approval (approval rules handle this separately)
        if (!config.require_approval) {
          return false
        }
      }
    }
  }

  result.executionResult = { field, value, validated: true }
  return true
}

/**
 * Execute transformation rule
 */
function executeTransformationRule(
  rule: SupplierRule,
  data: Record<string, unknown>,
  result: RuleExecutionResult
): Record<string, unknown> {
  const config = rule.ruleConfig
  const transformed = { ...data }

  // Default currency transformation
  if (config.default_currency && !transformed.currency) {
    transformed.currency = config.default_currency
  }

  // Field mapping transformation
  if (config.field_mapping) {
    Object.entries(config.field_mapping).forEach(([target, source]) => {
      if (transformed[source as string] !== undefined) {
        transformed[target] = transformed[source as string]
      }
    })
  }

  // Value transformation
  if (config.transformations) {
    config.transformations.forEach((transform: unknown) => {
      if (transform.field && transformed[transform.field] !== undefined) {
        if (transform.type === "uppercase") {
          transformed[transform.field] = String(
            transformed[transform.field]
          ).toUpperCase()
        } else if (transform.type === "lowercase") {
          transformed[transform.field] = String(
            transformed[transform.field]
          ).toLowerCase()
        } else if (transform.type === "trim") {
          transformed[transform.field] = String(
            transformed[transform.field]
          ).trim()
        }
      }
    })
  }

  result.executionResult = { transformed: true }
  return transformed
}

/**
 * Execute approval rule
 */
function executeApprovalRule(
  rule: SupplierRule,
  data: Record<string, unknown>,
  context?: Record<string, unknown>,
  result?: RuleExecutionResult
): boolean {
  const config = rule.ruleConfig

  // Price threshold approval
  if (config.price_threshold) {
    const price = Number(data.price || data[config.field])
    if (!isNaN(price) && price >= config.price_threshold) {
      if (result) {
        result.errorMessage =
          rule.errorMessageTemplate ||
          `Price ${price} exceeds threshold ${config.price_threshold}. Approval required.`
        result.executionResult = {
          requiresApproval: true,
          price,
          threshold: config.price_threshold,
        }
      }
      // Check if approval is present in context
      if (context?.approved_by && context?.approver_role) {
        if (config.require_approver_role) {
          if (context.approver_role === config.require_approver_role) {
            return true
          }
        } else {
          return true
        }
      }
      return false
    }
  }

  // Variance approval
  if (config.variance_percent && data.price && data.cost) {
    const price = Number(data.price)
    const cost = Number(data.cost)
    if (!isNaN(price) && !isNaN(cost) && cost > 0) {
      const variance = ((price - cost) / cost) * 100
      if (Math.abs(variance) > config.variance_percent) {
        if (result) {
          result.errorMessage =
            rule.errorMessageTemplate ||
            `Variance ${variance.toFixed(2)}% exceeds ${
              config.variance_percent
            }%. Approval required.`
          result.executionResult = {
            requiresApproval: true,
            variance,
            maxVariance: config.variance_percent,
          }
        }
        // Check if approval is present
        if (context?.approved_by) {
          return true
        }
        return false
      }
    }
  }

  return true
}

/**
 * Execute notification rule
 */
function executeNotificationRule(
  rule: SupplierRule,
  data: Record<string, unknown>,
  result: RuleExecutionResult
): boolean {
  // Notification rules typically just log, they don't block
  result.executionResult = { notified: true }
  return true
}

/**
 * Execute enforcement rule
 */
function executeEnforcementRule(
  rule: SupplierRule,
  data: Record<string, unknown>,
  result: RuleExecutionResult
): boolean {
  // Enforcement rules are similar to validation but stricter
  return executeValidationRule(rule, data, result)
}

/**
 * Main rule engine - execute all rules for a supplier operation
 */
export async function executeSupplierRules(
  supplierId: string,
  triggerEvent: string,
  data: Record<string, unknown>,
  context?: Record<string, unknown>
): Promise<RuleEngineResult> {
  const rules = await getSupplierRules(supplierId, triggerEvent)
  const results: RuleExecutionResult[] = []
  const errors: string[] = []
  const warnings: string[] = []
  let transformedData: Record<string, unknown> | undefined = { ...data }
  let blocked = false

  // Execute rules in order
  for (const rule of rules) {
    const ruleResult = executeRule(rule, transformedData || data, context)

    // Apply transformations
    if (ruleResult.transformedData) {
      transformedData = { ...transformedData, ...ruleResult.transformedData }
    }

    results.push(ruleResult)

    if (!ruleResult.passed) {
      if (ruleResult.errorMessage) {
        if (ruleResult.blocked) {
          errors.push(ruleResult.errorMessage)
        } else {
          warnings.push(ruleResult.errorMessage)
        }
      }
      if (ruleResult.blocked) {
        blocked = true
      }
    }
  }

  // Record executions
  await recordRuleExecutions(supplierId, triggerEvent, data, results)

  return {
    passed: !blocked && errors.length === 0,
    blocked,
    results,
    errors,
    warnings,
    transformedData: transformedData !== data ? transformedData : undefined,
  }
}

/**
 * Record rule executions to database
 */
async function recordRuleExecutions(
  supplierId: string,
  operationType: string,
  data: Record<string, unknown>,
  results: RuleExecutionResult[]
): Promise<void> {
  const timestamp = new Date()

  for (const result of results) {
    await query(`
      INSERT INTO supplier_rule_executions (
        supplier_id, rule_id, operation_type, operation_id, sku,
        rule_name, rule_type, execution_status, execution_result,
        error_message, execution_time_ms, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12
      )
    `, [
      supplierId,
      result.ruleId,
      operationType,
      data.operation_id || null,
      data.sku || null,
      result.ruleName,
      result.ruleType,
      result.blocked ? "blocked" : result.passed ? "passed" : "failed",
      JSON.stringify(result.executionResult),
      result.errorMessage || null,
      result.executionTimeMs,
      timestamp,
    ])
  }
}

/**
 * Check if operation is allowed based on supplier profile and rules
 */
export async function checkSupplierOperationAllowed(
  supplierId: string,
  operationType: string
): Promise<{ allowed: boolean; reason?: string }> {
  const profile = await getSupplierProfile(supplierId)
  if (!profile) {
    return { allowed: true } // No profile means no restrictions
  }

  // Check if supplier is active
  // Add any profile-level checks here

  return { allowed: true }
}

export function applyJoinSheetsConfigFromBuffer(
  buffer: Buffer,
  cfg: any
): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: false, cellText: false })

  function lev(a: string, b: string): number {
    const m = a.length, n = b.length
    const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) d[i][0] = i
    for (let j = 0; j <= n; j++) d[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      }
    }
    return d[m][n]
  }
  function pickName(nameLike: string): string | null {
    const mode = cfg.sheet_matcher?.type || 'includes'
    const target = norm(nameLike)
    if (mode === 'exact') {
      return wb.SheetNames.find(n => norm(n) === target) || null
    }
    if (mode === 'includes') {
      return wb.SheetNames.find(n => norm(n).includes(target)) || null
    }
    const thresh = typeof cfg.sheet_matcher?.threshold === 'number' ? cfg.sheet_matcher.threshold : 0.6
    let best: { name: string; score: number } | null = null
    for (const n of wb.SheetNames) {
      const nn = norm(n)
      const dist = lev(target, nn)
      const maxLen = Math.max(target.length, nn.length) || 1
      const score = 1 - dist / maxLen
      if (!best || score > best.score) best = { name: n, score }
    }
    return best && best.score >= thresh ? best.name : null
  }

  function pickSheet(nameLike: string): { name: string; rows: unknown[][] } | null {
    const name = pickName(nameLike)
    if (!name) return null
    const ws = wb.Sheets[name]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false }) as unknown[][]
    return { name, rows: data }
  }

  const left = pickSheet(cfg.left_sheet)
  const right = pickSheet(cfg.right_sheet)
  if (!left || !right || left.rows.length === 0 || right.rows.length === 0) return []

  const leftHeaders = left.rows[0] as unknown[]
  const rightHeaders = right.rows[0] as unknown[]
  const li = {
    joinKey: headerIndex(leftHeaders, cfg.join_on?.left),
    part: headerIndex(leftHeaders, (cfg.output_map?.sku?.column) || 'Part#'),
    title: headerIndex(leftHeaders, (cfg.output_map?.description?.column) || 'Product Title'),
    materials: headerIndex(leftHeaders, (cfg.output_map?.category?.column) || 'Materials'),
  }
  const ri = {
    joinKey: headerIndex(rightHeaders, cfg.join_on?.right),
    nettExcl: headerIndex(rightHeaders, (cfg.output_map?.priceExVat?.column) || 'NETT EXCL'),
  }
  if (li.joinKey < 0 || ri.joinKey < 0) return []

  const rightMap = new Map<string, unknown[]>()
  for (let i = 1; i < right.rows.length; i++) {
    const row = right.rows[i]
    if (!row || !Array.isArray(row)) continue
    const key = norm((row as unknown[])[ri.joinKey])
    if (key) rightMap.set(key, row as unknown[])
  }
  const brandName = ((): string => {
    const n = left.name.trim()
    const m = n.match(/^(.+?)\s+product\s+list/i)
    return m && m[1] ? m[1].trim() : n
  })()

  const out: Record<string, unknown>[] = []
  for (let i = 1; i < left.rows.length; i++) {
    const lrow = left.rows[i] as unknown[]
    if (!lrow || lrow.every(c => c == null || c === '')) continue
    const lk = norm(lrow[li.joinKey])
    if (!lk) continue
    const rrow = rightMap.get(lk)
    if (!rrow) continue
    const sku = li.part >= 0 ? lrow[li.part] : undefined
    const title = li.title >= 0 ? lrow[li.title] : undefined
    const materials = li.materials >= 0 ? lrow[li.materials] : undefined
    const nett = ri.nettExcl >= 0 ? rrow[ri.nettExcl] : undefined
    const rec: Record<string, unknown> = {}
    rec['sku'] = sku
    rec['description'] = title
    rec['brand'] = brandName
    rec['priceExVat'] = nett
    if (materials !== undefined && materials !== null && String(materials).trim() !== '') {
      rec['category'] = materials
    }
    out.push(rec)
  }
  return out
}

