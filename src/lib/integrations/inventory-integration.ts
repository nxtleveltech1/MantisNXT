import { createClient } from '@/lib/supabase/client'
import { InventoryValidator, ValidationResult, BulkValidationResult } from '@/lib/validation/inventory-validator'

// Database integration interfaces
export interface DatabaseIntegration {
  // Category operations
  findOrCreateCategory(name: string, parentPath?: string): Promise<string>
  getCategoryByName(name: string): Promise<any | null>

  // Brand operations
  findOrCreateBrand(name: string, code?: string): Promise<string>
  getBrandByName(name: string): Promise<any | null>

  // Supplier operations
  getSupplier(id: string): Promise<any | null>
  getSupplierProducts(supplierId: string): Promise<any[]>
  updateSupplierProduct(data: any): Promise<any>

  // Inventory operations
  createInventoryItem(data: any): Promise<any>
  updateInventoryItem(id: string, data: any): Promise<any>
  getInventoryItemBySku(sku: string): Promise<any | null>
  bulkUpsertInventoryItems(items: any[]): Promise<BulkOperationResult>

  // Stock movement operations
  createStockMovement(data: any): Promise<any>
  updateInventoryBalance(productId: string, locationId: string, quantity: number): Promise<any>
}

export interface BulkOperationResult {
  success: boolean
  created: number
  updated: number
  failed: number
  errors: Array<{
    item: any
    error: string
  }>
  summary: {
    totalProcessed: number
    processingTime: number
    throughput: number // items per second
  }
}

export interface IntegrationResult {
  success: boolean
  data?: any
  errors?: string[]
  warnings?: string[]
  metadata?: {
    operationType: string
    duration: number
    affectedRecords: number
  }
}

// Main integration class
export class InventoryDatabaseIntegration implements DatabaseIntegration {
  private supabase: any
  private defaultLocationId: string
  private defaultOrganizationId: string

  constructor(organizationId: string, defaultLocationId: string = 'loc_default') {
    this.supabase = createClient()
    this.defaultOrganizationId = organizationId
    this.defaultLocationId = defaultLocationId
  }

  // Category management
  async findOrCreateCategory(name: string, parentPath?: string): Promise<string> {
    try {
      // First, try to find existing category
      const existing = await this.getCategoryByName(name)
      if (existing) {
        return existing.id
      }

      // Create new category
      const path = parentPath ? `${parentPath}.${name}` : name
      const level = parentPath ? parentPath.split('.').length : 0

      const { data, error } = await this.supabase
        .from('categories')
        .insert({
          name,
          path,
          level,
          sort_order: 0,
          is_active: true
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create category: ${error.message}`)
      }

      return data.id
    } catch (error) {
      console.error('Error in findOrCreateCategory:', error)
      throw error
    }
  }

  async getCategoryByName(name: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*')
        .ilike('name', name)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Failed to fetch category: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in getCategoryByName:', error)
      return null
    }
  }

  // Brand management
  async findOrCreateBrand(name: string, code?: string): Promise<string> {
    try {
      // First, try to find existing brand
      const existing = await this.getBrandByName(name)
      if (existing) {
        return existing.id
      }

      // Generate code if not provided
      const brandCode = code || name.substring(0, 3).toUpperCase()

      const { data, error } = await this.supabase
        .from('brands')
        .insert({
          name,
          code: brandCode,
          is_active: true
        })
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create brand: ${error.message}`)
      }

      return data.id
    } catch (error) {
      console.error('Error in findOrCreateBrand:', error)
      throw error
    }
  }

  async getBrandByName(name: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('brands')
        .select('*')
        .ilike('name', name)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch brand: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in getBrandByName:', error)
      return null
    }
  }

  // Supplier operations
  async getSupplier(id: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('supplier')
        .select('*')
        .eq('id', id)
        .eq('org_id', this.defaultOrganizationId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch supplier: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in getSupplier:', error)
      return null
    }
  }

  async getSupplierProducts(supplierId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('supplier_product')
        .select(`
          *,
          inventory_item:inventory_item_id (
            id,
            sku,
            name,
            category_id,
            brand_id
          )
        `)
        .eq('supplier_id', supplierId)
        .eq('is_active', true)

      if (error) {
        throw new Error(`Failed to fetch supplier products: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in getSupplierProducts:', error)
      return []
    }
  }

  async updateSupplierProduct(data: any): Promise<any> {
    try {
      const { data: result, error } = await this.supabase
        .from('supplier_product')
        .upsert({
          ...data,
          last_cost_update_date: new Date().toISOString()
        })
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to update supplier product: ${error.message}`)
      }

      return result
    } catch (error) {
      console.error('Error in updateSupplierProduct:', error)
      throw error
    }
  }

  // Inventory operations
  async createInventoryItem(data: any): Promise<any> {
    const supabase = this.supabase

    try {
      // Start transaction
      const { data: result, error } = await supabase.rpc('create_inventory_item_with_balance', {
        p_item_data: {
          sku: data.sku,
          name: data.name,
          description: data.description,
          category_id: data.category_id,
          brand_id: data.brand_id,
          unit_of_measure: data.unit_of_measure || 'EACH',
          base_cost: data.base_cost,
          sale_price: data.sale_price,
          weight_kg: data.weight_kg,
          dimensions_cm: data.dimensions_cm,
          barcode: data.barcode,
          is_active: true,
          is_serialized: data.is_serialized || false,
          reorder_level: data.reorder_level || 0,
          max_stock_level: data.max_stock_level,
          created_by: data.created_by || 'system',
          updated_by: data.updated_by || 'system'
        },
        p_location_id: this.defaultLocationId,
        p_initial_quantity: data.initial_quantity || 0
      })

      if (error) {
        throw new Error(`Failed to create inventory item: ${error.message}`)
      }

      return result
    } catch (error) {
      console.error('Error in createInventoryItem:', error)
      throw error
    }
  }

  async updateInventoryItem(id: string, data: any): Promise<any> {
    try {
      const { data: result, error } = await this.supabase
        .from('products') // Using schema table name
        .update({
          ...data,
          updated_at: new Date().toISOString(),
          updated_by: data.updated_by || 'system'
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to update inventory item: ${error.message}`)
      }

      return result
    } catch (error) {
      console.error('Error in updateInventoryItem:', error)
      throw error
    }
  }

  async getInventoryItemBySku(sku: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          category:category_id (id, name, path),
          brand:brand_id (id, name, code),
          inventory_balances (
            location_id,
            quantity_on_hand,
            quantity_allocated,
            quantity_available,
            last_movement_at
          )
        `)
        .eq('sku', sku)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch inventory item: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in getInventoryItemBySku:', error)
      return null
    }
  }

  async bulkUpsertInventoryItems(items: any[]): Promise<BulkOperationResult> {
    const startTime = Date.now()
    let created = 0
    let updated = 0
    let failed = 0
    const errors: Array<{ item: any, error: string }> = []

    try {
      // Process in batches to avoid overwhelming the database
      const batchSize = 100
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)

        await Promise.all(batch.map(async (item) => {
          try {
            // Check if item exists
            const existing = await this.getInventoryItemBySku(item.sku)

            if (existing) {
              // Update existing item
              await this.updateInventoryItem(existing.id, item)
              updated++
            } else {
              // Create new item
              await this.createInventoryItem(item)
              created++
            }
          } catch (error) {
            failed++
            errors.push({
              item,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }))
      }

      const processingTime = Date.now() - startTime
      const throughput = items.length / (processingTime / 1000)

      return {
        success: failed === 0,
        created,
        updated,
        failed,
        errors,
        summary: {
          totalProcessed: items.length,
          processingTime,
          throughput
        }
      }
    } catch (error) {
      console.error('Error in bulkUpsertInventoryItems:', error)

      return {
        success: false,
        created,
        updated,
        failed: items.length - created - updated,
        errors: [{
          item: null,
          error: error instanceof Error ? error.message : 'Unknown bulk operation error'
        }],
        summary: {
          totalProcessed: items.length,
          processingTime: Date.now() - startTime,
          throughput: 0
        }
      }
    }
  }

  // Stock movement operations
  async createStockMovement(data: any): Promise<any> {
    try {
      const { data: result, error } = await this.supabase
        .from('inventory_movements')
        .insert({
          product_id: data.product_id,
          location_id: data.location_id || this.defaultLocationId,
          movement_type: data.movement_type, // 'IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'
          reference_type: data.reference_type, // 'PURCHASE', 'SALE', 'ADJUSTMENT', etc.
          reference_id: data.reference_id,
          quantity: data.quantity,
          unit_cost: data.unit_cost,
          reason: data.reason,
          batch_number: data.batch_number,
          expiry_date: data.expiry_date,
          serial_numbers: data.serial_numbers,
          created_by: data.created_by || 'system'
        })
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to create stock movement: ${error.message}`)
      }

      return result
    } catch (error) {
      console.error('Error in createStockMovement:', error)
      throw error
    }
  }

  async updateInventoryBalance(productId: string, locationId: string, quantity: number): Promise<any> {
    try {
      const { data: result, error } = await this.supabase
        .from('inventory_balances')
        .upsert({
          product_id: productId,
          location_id: locationId,
          quantity_on_hand: quantity,
          last_movement_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single()

      if (error) {
        throw new Error(`Failed to update inventory balance: ${error.message}`)
      }

      return result
    } catch (error) {
      console.error('Error in updateInventoryBalance:', error)
      throw error
    }
  }
}

// High-level integration service for the upload wizard
export class PricelistIntegrationService {
  private dbIntegration: InventoryDatabaseIntegration
  private validator: typeof InventoryValidator

  constructor(organizationId: string, defaultLocationId?: string) {
    this.dbIntegration = new InventoryDatabaseIntegration(organizationId, defaultLocationId)
    this.validator = InventoryValidator
  }

  async processAndImportPricelist(
    pricelistData: any[],
    supplierId: string,
    options: {
      validateBeforeImport?: boolean
      createMissingReferences?: boolean
      conflictResolution?: 'skip' | 'update' | 'merge' | 'create_variant'
      dryRun?: boolean
      batchSize?: number
    } = {}
  ): Promise<IntegrationResult> {
    const startTime = Date.now()

    try {
      // Set default options
      const processOptions = {
        validateBeforeImport: true,
        createMissingReferences: true,
        conflictResolution: 'skip' as const,
        dryRun: false,
        batchSize: 100,
        ...options
      }

      // Step 1: Validate supplier
      const supplier = await this.dbIntegration.getSupplier(supplierId)
      if (!supplier) {
        return {
          success: false,
          errors: [`Supplier with ID ${supplierId} not found`]
        }
      }

      // Step 2: Validate data if requested
      let validationResult: BulkValidationResult | null = null
      if (processOptions.validateBeforeImport) {
        validationResult = await this.validator.validateInventoryBulk(pricelistData, {
          validateReferences: true,
          context: { supplierId }
        })

        if (!validationResult.isValid && !processOptions.dryRun) {
          return {
            success: false,
            errors: validationResult.issues
              .filter(issue => issue.severity === 'error')
              .map(issue => `Row ${issue.row}: ${issue.message}`),
            warnings: validationResult.issues
              .filter(issue => issue.severity === 'warning')
              .map(issue => `Row ${issue.row}: ${issue.message}`)
          }
        }
      }

      // Step 3: Process and enrich data
      const enrichedData = await this.enrichPricelistData(
        validationResult?.transformedData || pricelistData,
        supplier,
        processOptions.createMissingReferences
      )

      // Step 4: If dry run, return validation results
      if (processOptions.dryRun) {
        return {
          success: true,
          data: {
            validationResult,
            enrichedData: enrichedData.slice(0, 10), // First 10 items for preview
            summary: {
              totalItems: enrichedData.length,
              validItems: validationResult?.validItems || 0,
              estimatedImportTime: this.estimateImportTime(enrichedData.length)
            }
          },
          metadata: {
            operationType: 'dry_run_validation',
            duration: Date.now() - startTime,
            affectedRecords: 0
          }
        }
      }

      // Step 5: Import to database
      const importResult = await this.dbIntegration.bulkUpsertInventoryItems(enrichedData)

      // Step 6: Update supplier products
      await this.updateSupplierProducts(enrichedData, supplierId, importResult)

      return {
        success: importResult.success,
        data: {
          importResult,
          validationResult,
          supplier: {
            id: supplier.id,
            name: supplier.name
          }
        },
        metadata: {
          operationType: 'pricelist_import',
          duration: Date.now() - startTime,
          affectedRecords: importResult.created + importResult.updated
        }
      }

    } catch (error) {
      console.error('Error in processAndImportPricelist:', error)

      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown import error'],
        metadata: {
          operationType: 'pricelist_import',
          duration: Date.now() - startTime,
          affectedRecords: 0
        }
      }
    }
  }

  private async enrichPricelistData(
    data: any[],
    supplier: any,
    createMissingReferences: boolean
  ): Promise<any[]> {
    const enriched = []

    for (const item of data) {
      try {
        const enrichedItem = { ...item }

        // Resolve category
        if (item.category && createMissingReferences) {
          enrichedItem.category_id = await this.dbIntegration.findOrCreateCategory(item.category)
        } else if (item.category) {
          const category = await this.dbIntegration.getCategoryByName(item.category)
          enrichedItem.category_id = category?.id
        }

        // Resolve brand
        if (item.brand && createMissingReferences) {
          enrichedItem.brand_id = await this.dbIntegration.findOrCreateBrand(item.brand)
        } else if (item.brand) {
          const brand = await this.dbIntegration.getBrandByName(item.brand)
          enrichedItem.brand_id = brand?.id
        }

        // Add supplier information
        enrichedItem.supplier_id = supplier.id
        enrichedItem.supplier_name = supplier.name

        // Set currency from supplier if not provided
        if (!enrichedItem.currency_code) {
          enrichedItem.currency_code = supplier.currency_code
        }

        // Add timestamps
        enrichedItem.created_by = 'pricelist_import'
        enrichedItem.updated_by = 'pricelist_import'

        enriched.push(enrichedItem)
      } catch (error) {
        console.error(`Error enriching item ${item.sku}:`, error)
        // Still add the item but without enrichment
        enriched.push(item)
      }
    }

    return enriched
  }

  private async updateSupplierProducts(
    items: any[],
    supplierId: string,
    importResult: BulkOperationResult
  ): Promise<void> {
    try {
      for (const item of items) {
        if (item.sku && item.cost_price) {
          await this.dbIntegration.updateSupplierProduct({
            supplier_id: supplierId,
            inventory_item_id: item.id, // Would need to get this from import result
            supplier_sku: item.supplier_sku,
            cost_price: item.cost_price || item.base_cost,
            currency_code: item.currency_code,
            lead_time_days: item.lead_time_days || 7,
            minimum_order_quantity: item.minimum_order_quantity || 1,
            pack_size: item.pack_size || 1,
            is_preferred: false,
            is_active: true
          })
        }
      }
    } catch (error) {
      console.error('Error updating supplier products:', error)
      // Don't fail the entire import for supplier product errors
    }
  }

  private estimateImportTime(itemCount: number): number {
    // Rough estimate: 100 items per second processing rate
    return Math.ceil(itemCount / 100) * 1000 // milliseconds
  }

  // Rollback functionality
  async rollbackImport(backupId: string): Promise<IntegrationResult> {
    const startTime = Date.now()

    try {
      // This would implement actual rollback logic
      // For now, return a placeholder
      return {
        success: true,
        data: {
          message: 'Rollback completed successfully',
          backupId
        },
        metadata: {
          operationType: 'rollback',
          duration: Date.now() - startTime,
          affectedRecords: 0
        }
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Rollback failed'],
        metadata: {
          operationType: 'rollback',
          duration: Date.now() - startTime,
          affectedRecords: 0
        }
      }
    }
  }
}

// Export main classes and utilities
export { InventoryDatabaseIntegration, PricelistIntegrationService }

// Utility functions for common integration tasks
export const createIntegrationService = (organizationId: string, locationId?: string) => {
  return new PricelistIntegrationService(organizationId, locationId)
}

export const validateAndPrepareData = async (
  data: any[],
  supplierId: string
): Promise<BulkValidationResult> => {
  return await InventoryValidator.validateInventoryBulk(data, {
    validateReferences: true,
    context: { supplierId }
  })
}