import { query } from "@/lib/database"

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

