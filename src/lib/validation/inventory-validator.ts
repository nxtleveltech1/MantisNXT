import { z } from 'zod'

// Database schema interfaces based on existing schema
export interface InventoryItem {
  id: string
  sku: string
  name: string
  description?: string
  category_id: string
  brand_id?: string
  unit_of_measure: string
  base_cost?: number
  sale_price?: number
  weight_kg?: number
  dimensions_cm?: string
  barcode?: string
  is_active: boolean
  is_serialized: boolean
  reorder_level: number
  max_stock_level?: number
  created_at: Date
  updated_at: Date
  created_by: string
  updated_by: string
}

export interface Category {
  id: string
  name: string
  parent_id?: string
  path: string
  level: number
  sort_order: number
  is_active: boolean
  created_at: Date
}

export interface Brand {
  id: string
  name: string
  code?: string
  is_active: boolean
  created_at: Date
}

export interface Supplier {
  id: string
  name: string
  status: 'active' | 'inactive' | 'suspended' | 'pending_approval' | 'blocked' | 'under_review'
  performance_tier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'unrated'
  preferred_supplier: boolean
  contact_email?: string
  risk_score?: number
  lead_time_days?: number
  performance_score?: number
  on_time_delivery_rate?: number
  quality_rating?: number
  currency_code: string
  org_id: string
}

export interface SupplierProduct {
  id: string
  supplier_id: string
  inventory_item_id: string
  supplier_sku?: string
  supplier_name?: string
  supplier_description?: string
  cost_price: number
  currency_code: string
  lead_time_days: number
  minimum_order_quantity: number
  pack_size: number
  is_preferred: boolean
  is_active: boolean
  last_cost_update_date?: Date
}

// Validation schemas
export const InventoryItemValidationSchema = z.object({
  sku: z.string()
    .min(1, 'SKU is required')
    .max(100, 'SKU cannot exceed 100 characters')
    .regex(/^[A-Z0-9-_]+$/i, 'SKU can only contain alphanumeric characters, hyphens, and underscores'),

  name: z.string()
    .min(1, 'Product name is required')
    .max(500, 'Product name cannot exceed 500 characters'),

  description: z.string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),

  category: z.string()
    .min(1, 'Category is required'),

  brand: z.string()
    .max(200, 'Brand name cannot exceed 200 characters')
    .optional(),

  unit_of_measure: z.string()
    .max(20, 'Unit of measure cannot exceed 20 characters')
    .default('EACH'),

  base_cost: z.number()
    .min(0, 'Base cost must be non-negative')
    .multipleOf(0.01, 'Base cost must have at most 2 decimal places')
    .optional(),

  sale_price: z.number()
    .min(0, 'Sale price must be non-negative')
    .multipleOf(0.01, 'Sale price must have at most 2 decimal places')
    .optional(),

  weight_kg: z.number()
    .min(0, 'Weight must be non-negative')
    .max(999999.999, 'Weight cannot exceed 999,999.999 kg')
    .multipleOf(0.001, 'Weight must have at most 3 decimal places')
    .optional(),

  dimensions_cm: z.string()
    .regex(/^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/, 'Dimensions must be in format "LxWxH" (e.g., "10.5x20x30")')
    .optional(),

  barcode: z.string()
    .max(100, 'Barcode cannot exceed 100 characters')
    .optional(),

  reorder_level: z.number()
    .int('Reorder level must be an integer')
    .min(0, 'Reorder level must be non-negative')
    .default(0),

  max_stock_level: z.number()
    .int('Max stock level must be an integer')
    .min(0, 'Max stock level must be non-negative')
    .optional(),

  is_serialized: z.boolean().default(false),

  supplier_id: z.string().optional(),
  supplier_sku: z.string().optional(),
  currency_code: z.string()
    .length(3, 'Currency code must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters')
    .default('USD')
})

// Extended validation for supplier products
export const SupplierProductValidationSchema = z.object({
  supplier_sku: z.string()
    .max(100, 'Supplier SKU cannot exceed 100 characters')
    .optional(),

  cost_price: z.number()
    .min(0.01, 'Cost price must be greater than 0')
    .multipleOf(0.01, 'Cost price must have at most 2 decimal places'),

  lead_time_days: z.number()
    .int('Lead time must be an integer')
    .min(0, 'Lead time must be non-negative')
    .max(365, 'Lead time cannot exceed 365 days'),

  minimum_order_quantity: z.number()
    .int('Minimum order quantity must be an integer')
    .min(1, 'Minimum order quantity must be at least 1'),

  pack_size: z.number()
    .int('Pack size must be an integer')
    .min(1, 'Pack size must be at least 1')
    .default(1),

  currency_code: z.string()
    .length(3, 'Currency code must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters')
})

// Validation result types
export interface ValidationIssue {
  field: string
  value: any
  severity: 'error' | 'warning' | 'info'
  message: string
  suggestion?: string
  code: string
  row?: number
}

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  transformedData: any
  metadata: {
    validatedFields: string[]
    appliedTransformations: string[]
    validationTimestamp: Date
  }
}

export interface BulkValidationResult {
  isValid: boolean
  totalItems: number
  validItems: number
  errorItems: number
  warningItems: number
  issues: ValidationIssue[]
  transformedData: any[]
  metadata: {
    processingTime: number
    validationRules: string[]
    dataQualityScore: number
  }
}

// Core validation engine
export class InventoryValidator {
  private static readonly RESERVED_SKUS = ['RESERVED', 'TEMP', 'PLACEHOLDER', 'SYSTEM']
  private static readonly COMMON_UNITS = ['EACH', 'KG', 'LB', 'M', 'CM', 'L', 'ML', 'BOX', 'PACK', 'SET']
  private static readonly CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'ZAR', 'CAD', 'AUD', 'JPY', 'CNY']

  // Mock database connections - in real implementation, these would be actual DB queries
  private static async getMockCategories(): Promise<Category[]> {
    return [
      {
        id: 'cat_001',
        name: 'Electronics',
        path: 'Electronics',
        level: 0,
        sort_order: 1,
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'cat_002',
        name: 'Audio Equipment',
        parent_id: 'cat_001',
        path: 'Electronics.Audio Equipment',
        level: 1,
        sort_order: 1,
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'cat_003',
        name: 'Office Supplies',
        path: 'Office Supplies',
        level: 0,
        sort_order: 2,
        is_active: true,
        created_at: new Date()
      }
    ]
  }

  private static async getMockBrands(): Promise<Brand[]> {
    return [
      {
        id: 'brand_001',
        name: 'Alfatron',
        code: 'ALF',
        is_active: true,
        created_at: new Date()
      },
      {
        id: 'brand_002',
        name: 'Generic',
        code: 'GEN',
        is_active: true,
        created_at: new Date()
      }
    ]
  }

  private static async getMockSuppliers(): Promise<Supplier[]> {
    return [
      {
        id: 'sup_001',
        name: 'Alpha Technologies',
        status: 'active',
        performance_tier: 'gold',
        preferred_supplier: true,
        currency_code: 'USD',
        org_id: 'org_001',
        lead_time_days: 7,
        quality_rating: 4.5
      },
      {
        id: 'sup_002',
        name: 'Beta Corp',
        status: 'active',
        performance_tier: 'silver',
        preferred_supplier: false,
        currency_code: 'EUR',
        org_id: 'org_001',
        lead_time_days: 14,
        quality_rating: 4.0
      }
    ]
  }

  private static async getMockExistingInventory(): Promise<InventoryItem[]> {
    return [
      {
        id: 'inv_001',
        sku: 'EXISTING-001',
        name: 'Existing Product 1',
        category_id: 'cat_001',
        unit_of_measure: 'EACH',
        is_active: true,
        is_serialized: false,
        reorder_level: 10,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
        updated_by: 'system'
      }
    ]
  }

  // Single item validation
  public static async validateInventoryItem(
    data: any,
    options: {
      validateReferences?: boolean
      allowSkuUpdate?: boolean
      requireAllFields?: boolean
      context?: {
        supplierId?: string
        organizationId?: string
        userId?: string
      }
    } = {}
  ): Promise<ValidationResult> {
    const startTime = Date.now()
    const issues: ValidationIssue[] = []
    const appliedTransformations: string[] = []

    try {
      // Basic schema validation
      const baseValidation = InventoryItemValidationSchema.safeParse(data)
      if (!baseValidation.success) {
        baseValidation.error.errors.forEach(error => {
          issues.push({
            field: error.path.join('.'),
            value: data[error.path[0]],
            severity: 'error',
            message: error.message,
            code: 'SCHEMA_VALIDATION_FAILED'
          })
        })
      }

      let transformedData = baseValidation.success ? baseValidation.data : data

      // Business logic validations
      await this.performBusinessValidations(transformedData, issues, options)

      // Reference validations
      if (options.validateReferences) {
        await this.validateReferences(transformedData, issues, options.context)
      }

      // Apply data transformations
      transformedData = await this.applyDataTransformations(transformedData, appliedTransformations)

      // Cross-field validations
      this.performCrossFieldValidations(transformedData, issues)

      const isValid = !issues.some(issue => issue.severity === 'error')

      return {
        isValid,
        issues,
        transformedData,
        metadata: {
          validatedFields: Object.keys(transformedData),
          appliedTransformations,
          validationTimestamp: new Date()
        }
      }

    } catch (error) {
      issues.push({
        field: 'general',
        value: null,
        severity: 'error',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'VALIDATION_ERROR'
      })

      return {
        isValid: false,
        issues,
        transformedData: data,
        metadata: {
          validatedFields: [],
          appliedTransformations: [],
          validationTimestamp: new Date()
        }
      }
    }
  }

  // Bulk validation
  public static async validateInventoryBulk(
    items: any[],
    options: {
      validateReferences?: boolean
      allowSkuUpdates?: boolean
      stopOnFirstError?: boolean
      context?: {
        supplierId?: string
        organizationId?: string
        userId?: string
      }
    } = {}
  ): Promise<BulkValidationResult> {
    const startTime = Date.now()
    const allIssues: ValidationIssue[] = []
    const transformedItems: any[] = []
    let validItems = 0
    let errorItems = 0
    let warningItems = 0

    // Validate SKU uniqueness across the batch
    const skuCounts = new Map<string, number>()
    items.forEach((item, index) => {
      if (item.sku) {
        const count = skuCounts.get(item.sku) || 0
        skuCounts.set(item.sku, count + 1)
        if (count > 0) {
          allIssues.push({
            field: 'sku',
            value: item.sku,
            severity: 'error',
            message: `Duplicate SKU found in batch`,
            code: 'DUPLICATE_SKU_IN_BATCH',
            row: index + 1
          })
        }
      }
    })

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const result = await this.validateInventoryItem(item, {
        ...options,
        allowSkuUpdate: options.allowSkuUpdates
      })

      // Add row numbers to issues
      const itemIssues = result.issues.map(issue => ({
        ...issue,
        row: i + 1
      }))

      allIssues.push(...itemIssues)
      transformedItems.push(result.transformedData)

      if (result.isValid) {
        validItems++
      } else if (itemIssues.some(issue => issue.severity === 'error')) {
        errorItems++
        if (options.stopOnFirstError) {
          break
        }
      } else {
        warningItems++
      }
    }

    const processingTime = Date.now() - startTime
    const dataQualityScore = validItems / items.length * 100

    return {
      isValid: errorItems === 0,
      totalItems: items.length,
      validItems,
      errorItems,
      warningItems,
      issues: allIssues,
      transformedData: transformedItems,
      metadata: {
        processingTime,
        validationRules: [
          'schema_validation',
          'business_rules',
          'reference_validation',
          'cross_field_validation',
          'duplicate_detection'
        ],
        dataQualityScore
      }
    }
  }

  // Business logic validations
  private static async performBusinessValidations(
    data: any,
    issues: ValidationIssue[],
    options: any
  ): Promise<void> {
    // SKU format validation
    if (data.sku) {
      // Check for reserved SKUs
      if (this.RESERVED_SKUS.some(reserved => data.sku.toUpperCase().includes(reserved))) {
        issues.push({
          field: 'sku',
          value: data.sku,
          severity: 'warning',
          message: 'SKU contains reserved keywords',
          suggestion: 'Consider using a different SKU format',
          code: 'RESERVED_SKU_WARNING'
        })
      }

      // Check for existing SKU if update not allowed
      if (!options.allowSkuUpdate) {
        const existingInventory = await this.getMockExistingInventory()
        const existingItem = existingInventory.find(item => item.sku === data.sku)
        if (existingItem) {
          issues.push({
            field: 'sku',
            value: data.sku,
            severity: 'error',
            message: 'SKU already exists in inventory',
            code: 'DUPLICATE_SKU'
          })
        }
      }
    }

    // Unit of measure validation
    if (data.unit_of_measure && !this.COMMON_UNITS.includes(data.unit_of_measure.toUpperCase())) {
      issues.push({
        field: 'unit_of_measure',
        value: data.unit_of_measure,
        severity: 'warning',
        message: 'Uncommon unit of measure',
        suggestion: `Consider using standard units: ${this.COMMON_UNITS.join(', ')}`,
        code: 'UNCOMMON_UNIT'
      })
    }

    // Currency validation
    if (data.currency_code && !this.CURRENCY_CODES.includes(data.currency_code)) {
      issues.push({
        field: 'currency_code',
        value: data.currency_code,
        severity: 'warning',
        message: 'Uncommon currency code',
        suggestion: `Common currencies: ${this.CURRENCY_CODES.join(', ')}`,
        code: 'UNCOMMON_CURRENCY'
      })
    }

    // Price validation
    if (data.base_cost && data.sale_price && data.base_cost > data.sale_price) {
      issues.push({
        field: 'sale_price',
        value: data.sale_price,
        severity: 'warning',
        message: 'Sale price is lower than base cost',
        suggestion: 'Verify pricing to ensure profitability',
        code: 'NEGATIVE_MARGIN'
      })
    }

    // Barcode validation
    if (data.barcode) {
      // Basic barcode format validation (simplified)
      if (!/^\d+$/.test(data.barcode) && !/^[A-Z0-9]+$/.test(data.barcode)) {
        issues.push({
          field: 'barcode',
          value: data.barcode,
          severity: 'warning',
          message: 'Barcode format may not be standard',
          suggestion: 'Verify barcode format with your barcode system',
          code: 'BARCODE_FORMAT_WARNING'
        })
      }

      // Check barcode length
      if (data.barcode.length < 8 || data.barcode.length > 18) {
        issues.push({
          field: 'barcode',
          value: data.barcode,
          severity: 'warning',
          message: 'Barcode length is outside common ranges (8-18 characters)',
          code: 'BARCODE_LENGTH_WARNING'
        })
      }
    }
  }

  // Reference validations
  private static async validateReferences(
    data: any,
    issues: ValidationIssue[],
    context?: any
  ): Promise<void> {
    // Validate category exists
    if (data.category) {
      const categories = await this.getMockCategories()
      const categoryExists = categories.some(cat =>
        cat.name.toLowerCase() === data.category.toLowerCase() && cat.is_active
      )

      if (!categoryExists) {
        // Check for similar categories
        const similarCategories = categories.filter(cat =>
          cat.name.toLowerCase().includes(data.category.toLowerCase()) ||
          data.category.toLowerCase().includes(cat.name.toLowerCase())
        )

        if (similarCategories.length > 0) {
          issues.push({
            field: 'category',
            value: data.category,
            severity: 'warning',
            message: 'Category not found, but similar categories exist',
            suggestion: `Did you mean: ${similarCategories.map(c => c.name).join(', ')}?`,
            code: 'CATEGORY_NOT_FOUND_SIMILAR'
          })
        } else {
          issues.push({
            field: 'category',
            value: data.category,
            severity: 'info',
            message: 'New category will be created',
            code: 'NEW_CATEGORY'
          })
        }
      }
    }

    // Validate brand exists
    if (data.brand) {
      const brands = await this.getMockBrands()
      const brandExists = brands.some(brand =>
        brand.name.toLowerCase() === data.brand.toLowerCase() && brand.is_active
      )

      if (!brandExists) {
        issues.push({
          field: 'brand',
          value: data.brand,
          severity: 'info',
          message: 'New brand will be created',
          code: 'NEW_BRAND'
        })
      }
    }

    // Validate supplier if provided
    if (context?.supplierId) {
      const suppliers = await this.getMockSuppliers()
      const supplier = suppliers.find(s => s.id === context.supplierId)

      if (!supplier) {
        issues.push({
          field: 'supplier_id',
          value: context.supplierId,
          severity: 'error',
          message: 'Supplier not found',
          code: 'SUPPLIER_NOT_FOUND'
        })
      } else if (supplier.status !== 'active') {
        issues.push({
          field: 'supplier_id',
          value: context.supplierId,
          severity: 'warning',
          message: `Supplier status is ${supplier.status}`,
          code: 'SUPPLIER_INACTIVE'
        })
      }

      // Validate currency compatibility
      if (data.currency_code && supplier && supplier.currency_code !== data.currency_code) {
        issues.push({
          field: 'currency_code',
          value: data.currency_code,
          severity: 'warning',
          message: `Currency mismatch with supplier (supplier uses ${supplier.currency_code})`,
          suggestion: `Consider using supplier currency: ${supplier.currency_code}`,
          code: 'CURRENCY_MISMATCH'
        })
      }
    }
  }

  // Data transformations
  private static async applyDataTransformations(
    data: any,
    appliedTransformations: string[]
  ): Promise<any> {
    const transformed = { ...data }

    // Normalize SKU
    if (transformed.sku) {
      const original = transformed.sku
      transformed.sku = transformed.sku.toString().trim().toUpperCase()
      if (original !== transformed.sku) {
        appliedTransformations.push('sku_normalization')
      }
    }

    // Normalize text fields
    const textFields = ['name', 'description', 'category', 'brand']
    textFields.forEach(field => {
      if (transformed[field]) {
        const original = transformed[field]
        transformed[field] = transformed[field].toString().trim()
        // Remove excessive whitespace
        transformed[field] = transformed[field].replace(/\s+/g, ' ')
        if (original !== transformed[field]) {
          appliedTransformations.push(`${field}_normalization`)
        }
      }
    })

    // Normalize unit of measure
    if (transformed.unit_of_measure) {
      const original = transformed.unit_of_measure
      transformed.unit_of_measure = transformed.unit_of_measure.toString().trim().toUpperCase()
      if (original !== transformed.unit_of_measure) {
        appliedTransformations.push('unit_normalization')
      }
    }

    // Round numeric values
    const numericFields = ['base_cost', 'sale_price', 'weight_kg']
    numericFields.forEach(field => {
      if (transformed[field] !== undefined && transformed[field] !== null) {
        const original = transformed[field]
        if (field === 'weight_kg') {
          transformed[field] = Math.round(transformed[field] * 1000) / 1000 // 3 decimal places
        } else {
          transformed[field] = Math.round(transformed[field] * 100) / 100 // 2 decimal places
        }
        if (original !== transformed[field]) {
          appliedTransformations.push(`${field}_rounding`)
        }
      }
    })

    // Generate default values
    if (!transformed.unit_of_measure) {
      transformed.unit_of_measure = 'EACH'
      appliedTransformations.push('default_unit_applied')
    }

    if (!transformed.currency_code) {
      transformed.currency_code = 'USD'
      appliedTransformations.push('default_currency_applied')
    }

    return transformed
  }

  // Cross-field validations
  private static performCrossFieldValidations(
    data: any,
    issues: ValidationIssue[]
  ): void {
    // Reorder level should not exceed max stock level
    if (data.reorder_level && data.max_stock_level && data.reorder_level > data.max_stock_level) {
      issues.push({
        field: 'reorder_level',
        value: data.reorder_level,
        severity: 'warning',
        message: 'Reorder level exceeds maximum stock level',
        suggestion: 'Adjust reorder level or maximum stock level',
        code: 'REORDER_EXCEEDS_MAX'
      })
    }

    // Serialized items should have reorder level of 0 or 1
    if (data.is_serialized && data.reorder_level > 1) {
      issues.push({
        field: 'reorder_level',
        value: data.reorder_level,
        severity: 'warning',
        message: 'Serialized items typically have low reorder levels',
        suggestion: 'Consider setting reorder level to 0 or 1 for serialized items',
        code: 'SERIALIZED_REORDER_WARNING'
      })
    }

    // Validate dimensions format and reasonableness
    if (data.dimensions_cm) {
      const dimensions = data.dimensions_cm.split('x').map((d: string) => parseFloat(d))
      if (dimensions.length === 3 && dimensions.every((d: number) => !isNaN(d))) {
        const [length, width, height] = dimensions

        // Check for unreasonable dimensions
        if (dimensions.some((d: number) => d > 10000)) { // 100 meters
          issues.push({
            field: 'dimensions_cm',
            value: data.dimensions_cm,
            severity: 'warning',
            message: 'Dimensions seem unusually large',
            suggestion: 'Verify dimensions are in centimeters',
            code: 'LARGE_DIMENSIONS_WARNING'
          })
        }

        if (dimensions.some((d: number) => d < 0.1)) { // 1mm
          issues.push({
            field: 'dimensions_cm',
            value: data.dimensions_cm,
            severity: 'warning',
            message: 'Dimensions seem unusually small',
            suggestion: 'Verify dimensions are in centimeters',
            code: 'SMALL_DIMENSIONS_WARNING'
          })
        }
      }
    }

    // Weight reasonableness check
    if (data.weight_kg) {
      if (data.weight_kg > 10000) { // 10 tons
        issues.push({
          field: 'weight_kg',
          value: data.weight_kg,
          severity: 'warning',
          message: 'Weight seems unusually high',
          suggestion: 'Verify weight is in kilograms',
          code: 'HIGH_WEIGHT_WARNING'
        })
      }

      if (data.weight_kg < 0.001) { // 1 gram
        issues.push({
          field: 'weight_kg',
          value: data.weight_kg,
          severity: 'warning',
          message: 'Weight seems unusually low',
          suggestion: 'Verify weight is in kilograms',
          code: 'LOW_WEIGHT_WARNING'
        })
      }
    }
  }

  // Get validation summary for reporting
  public static getValidationSummary(issues: ValidationIssue[]): {
    errorCount: number
    warningCount: number
    infoCount: number
    criticalIssues: string[]
    recommendations: string[]
  } {
    const errorCount = issues.filter(i => i.severity === 'error').length
    const warningCount = issues.filter(i => i.severity === 'warning').length
    const infoCount = issues.filter(i => i.severity === 'info').length

    const criticalIssues = issues
      .filter(i => i.severity === 'error')
      .map(i => `${i.field}: ${i.message}`)

    const recommendations = issues
      .filter(i => i.suggestion)
      .map(i => i.suggestion!)

    return {
      errorCount,
      warningCount,
      infoCount,
      criticalIssues,
      recommendations
    }
  }
}

// Export utility functions
export const validateSingleItem = InventoryValidator.validateInventoryItem
export const validateBulkItems = InventoryValidator.validateInventoryBulk
export const getValidationSummary = InventoryValidator.getValidationSummary

// Export validation schemas for external use already handled above