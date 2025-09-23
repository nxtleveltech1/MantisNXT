/**
 * Unified Supplier Repository - Single Source of Truth
 * Eliminates data layer chaos by providing consistent interface
 */

import { Pool, PoolClient } from 'pg'
import type {
  Supplier,
  CreateSupplierData,
  UpdateSupplierData,
  SupplierFilters,
  SupplierSearchResult,
  SupplierMetrics
} from '../types/SupplierDomain'

export interface SupplierRepository {
  // Core CRUD operations
  findById(id: string): Promise<Supplier | null>
  findMany(filters: SupplierFilters): Promise<SupplierSearchResult>
  create(data: CreateSupplierData): Promise<Supplier>
  update(id: string, data: UpdateSupplierData): Promise<Supplier>
  delete(id: string): Promise<void>

  // Batch operations
  createMany(data: CreateSupplierData[]): Promise<Supplier[]>
  updateMany(updates: Array<{id: string, data: UpdateSupplierData}>): Promise<Supplier[]>
  deleteMany(ids: string[]): Promise<void>

  // Analytics and metrics
  getMetrics(): Promise<SupplierMetrics>
  getPerformanceData(supplierId: string): Promise<any>

  // Search and discovery
  search(query: string, filters?: SupplierFilters): Promise<SupplierSearchResult>
  findSimilar(supplierId: string): Promise<Supplier[]>

  // Export and reporting
  exportData(filters: SupplierFilters, format: 'csv' | 'excel' | 'json'): Promise<Buffer>
}

export class PostgreSQLSupplierRepository implements SupplierRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Supplier | null> {
    const client = await this.pool.connect()
    try {
      const query = `
        SELECT
          s.*,
          json_agg(DISTINCT sc.*) FILTER (WHERE sc.id IS NOT NULL) as contacts,
          json_agg(DISTINCT sa.*) FILTER (WHERE sa.id IS NOT NULL) as addresses,
          json_agg(DISTINCT sp.*) FILTER (WHERE sp.id IS NOT NULL) as performance_data
        FROM suppliers s
        LEFT JOIN supplier_contacts sc ON s.id = sc.supplier_id AND sc.is_active = true
        LEFT JOIN supplier_addresses sa ON s.id = sa.supplier_id AND sa.is_active = true
        LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
        WHERE s.id = $1
        GROUP BY s.id
      `

      const result = await client.query(query, [id])

      if (result.rows.length === 0) {
        return null
      }

      return this.mapRowToSupplier(result.rows[0])
    } finally {
      client.release()
    }
  }

  async findMany(filters: SupplierFilters): Promise<SupplierSearchResult> {
    const client = await this.pool.connect()
    try {
      const { query, countQuery, params } = this.buildFilterQuery(filters)

      // Execute count query for pagination
      const countResult = await client.query(countQuery, params.slice(0, -2)) // Remove limit/offset
      const total = parseInt(countResult.rows[0].count)

      // Execute main query
      const result = await client.query(query, params)
      const suppliers = result.rows.map(row => this.mapRowToSupplier(row))

      return {
        suppliers,
        total,
        page: filters.page || 1,
        limit: filters.limit || 50,
        totalPages: Math.ceil(total / (filters.limit || 50))
      }
    } finally {
      client.release()
    }
  }

  async create(data: CreateSupplierData): Promise<Supplier> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      // Insert main supplier record
      const supplierQuery = `
        INSERT INTO suppliers (
          name, code, legal_name, website, industry, tier, status, category, subcategory,
          tags, tax_id, registration_number, founded_year, employee_count, annual_revenue,
          currency, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
        ) RETURNING id
      `

      const supplierParams = [
        data.name, data.code, data.legalName, data.website, data.industry,
        data.tier, data.status, data.category, data.subcategory, data.tags,
        data.taxId, data.registrationNumber, data.foundedYear, data.employeeCount,
        data.annualRevenue, data.currency
      ]

      const supplierResult = await client.query(supplierQuery, supplierParams)
      const supplierId = supplierResult.rows[0].id

      // Insert contacts
      if (data.contacts && data.contacts.length > 0) {
        for (const contact of data.contacts) {
          await client.query(
            `INSERT INTO supplier_contacts (
              supplier_id, type, name, title, email, phone, mobile, department,
              is_primary, is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
              supplierId, contact.type, contact.name, contact.title,
              contact.email, contact.phone, contact.mobile, contact.department,
              contact.isPrimary, contact.isActive
            ]
          )
        }
      }

      // Insert addresses
      if (data.addresses && data.addresses.length > 0) {
        for (const address of data.addresses) {
          await client.query(
            `INSERT INTO supplier_addresses (
              supplier_id, type, name, address_line1, address_line2, city, state,
              postal_code, country, is_primary, is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
            [
              supplierId, address.type, address.name, address.addressLine1,
              address.addressLine2, address.city, address.state, address.postalCode,
              address.country, address.isPrimary, address.isActive
            ]
          )
        }
      }

      // Initialize performance record
      await client.query(
        `INSERT INTO supplier_performance (
          supplier_id, overall_rating, quality_rating, delivery_rating,
          service_rating, price_rating, created_at, updated_at
        ) VALUES ($1, 0, 0, 0, 0, 0, NOW(), NOW())`,
        [supplierId]
      )

      await client.query('COMMIT')

      // Fetch and return the created supplier
      const createdSupplier = await this.findById(supplierId)
      if (!createdSupplier) {
        throw new Error('Failed to retrieve created supplier')
      }

      return createdSupplier
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async update(id: string, data: UpdateSupplierData): Promise<Supplier> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      // Build dynamic update query
      const updateFields: string[] = []
      const params: any[] = []
      let paramIndex = 1

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`)
        params.push(data.name)
      }
      if (data.legalName !== undefined) {
        updateFields.push(`legal_name = $${paramIndex++}`)
        params.push(data.legalName)
      }
      if (data.website !== undefined) {
        updateFields.push(`website = $${paramIndex++}`)
        params.push(data.website)
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`)
        params.push(data.status)
      }
      if (data.tier !== undefined) {
        updateFields.push(`tier = $${paramIndex++}`)
        params.push(data.tier)
      }
      if (data.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`)
        params.push(data.tags)
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`)
        params.push(id)

        await client.query(
          `UPDATE suppliers SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          params
        )
      }

      // Update contacts if provided
      if (data.contacts) {
        // Simple approach: delete and recreate (could be optimized)
        await client.query('DELETE FROM supplier_contacts WHERE supplier_id = $1', [id])

        for (const contact of data.contacts) {
          await client.query(
            `INSERT INTO supplier_contacts (
              supplier_id, type, name, title, email, phone, mobile, department,
              is_primary, is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
              id, contact.type, contact.name, contact.title,
              contact.email, contact.phone, contact.mobile, contact.department,
              contact.isPrimary, contact.isActive
            ]
          )
        }
      }

      // Update addresses if provided
      if (data.addresses) {
        await client.query('DELETE FROM supplier_addresses WHERE supplier_id = $1', [id])

        for (const address of data.addresses) {
          await client.query(
            `INSERT INTO supplier_addresses (
              supplier_id, type, name, address_line1, address_line2, city, state,
              postal_code, country, is_primary, is_active, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
            [
              id, address.type, address.name, address.addressLine1,
              address.addressLine2, address.city, address.state, address.postalCode,
              address.country, address.isPrimary, address.isActive
            ]
          )
        }
      }

      await client.query('COMMIT')

      // Fetch and return updated supplier
      const updatedSupplier = await this.findById(id)
      if (!updatedSupplier) {
        throw new Error('Supplier not found after update')
      }

      return updatedSupplier
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async delete(id: string): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      // Delete related records first (respecting foreign key constraints)
      await client.query('DELETE FROM supplier_performance WHERE supplier_id = $1', [id])
      await client.query('DELETE FROM supplier_contacts WHERE supplier_id = $1', [id])
      await client.query('DELETE FROM supplier_addresses WHERE supplier_id = $1', [id])

      // Delete supplier
      const result = await client.query('DELETE FROM suppliers WHERE id = $1', [id])

      if (result.rowCount === 0) {
        throw new Error('Supplier not found')
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async createMany(data: CreateSupplierData[]): Promise<Supplier[]> {
    const results: Supplier[] = []

    for (const supplierData of data) {
      const supplier = await this.create(supplierData)
      results.push(supplier)
    }

    return results
  }

  async updateMany(updates: Array<{id: string, data: UpdateSupplierData}>): Promise<Supplier[]> {
    const results: Supplier[] = []

    for (const update of updates) {
      const supplier = await this.update(update.id, update.data)
      results.push(supplier)
    }

    return results
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id)
    }
  }

  async getMetrics(): Promise<SupplierMetrics> {
    const client = await this.pool.connect()
    try {
      const metricsQuery = `
        SELECT
          COUNT(*) as total_suppliers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_suppliers,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_suppliers,
          COUNT(CASE WHEN tier = 'strategic' THEN 1 END) as strategic_suppliers,
          AVG(sp.overall_rating) as avg_rating,
          AVG(sp.on_time_delivery_rate) as avg_delivery_rate
        FROM suppliers s
        LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
      `

      const result = await client.query(metricsQuery)
      const row = result.rows[0]

      return {
        totalSuppliers: parseInt(row.total_suppliers) || 0,
        activeSuppliers: parseInt(row.active_suppliers) || 0,
        pendingSuppliers: parseInt(row.pending_suppliers) || 0,
        strategicSuppliers: parseInt(row.strategic_suppliers) || 0,
        averageRating: parseFloat(row.avg_rating) || 0,
        averageDeliveryRate: parseFloat(row.avg_delivery_rate) || 0
      }
    } finally {
      client.release()
    }
  }

  async getPerformanceData(supplierId: string): Promise<any> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(
        'SELECT * FROM supplier_performance WHERE supplier_id = $1',
        [supplierId]
      )

      return result.rows[0] || null
    } finally {
      client.release()
    }
  }

  async search(query: string, filters?: SupplierFilters): Promise<SupplierSearchResult> {
    const searchFilters: SupplierFilters = {
      ...filters,
      search: query
    }

    return this.findMany(searchFilters)
  }

  async findSimilar(supplierId: string): Promise<Supplier[]> {
    const supplier = await this.findById(supplierId)
    if (!supplier) {
      return []
    }

    const filters: SupplierFilters = {
      category: [supplier.category],
      tier: [supplier.tier],
      limit: 5
    }

    const result = await this.findMany(filters)
    return result.suppliers.filter(s => s.id !== supplierId)
  }

  async exportData(filters: SupplierFilters, format: 'csv' | 'excel' | 'json'): Promise<Buffer> {
    const result = await this.findMany({ ...filters, limit: 10000 }) // Large limit for export

    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(result.suppliers, null, 2))
      case 'csv':
        return this.exportToCSV(result.suppliers)
      case 'excel':
        return this.exportToExcel(result.suppliers)
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  private buildFilterQuery(filters: SupplierFilters): { query: string, countQuery: string, params: any[] } {
    let query = `
      SELECT
        s.*,
        json_agg(DISTINCT sc.*) FILTER (WHERE sc.id IS NOT NULL) as contacts,
        json_agg(DISTINCT sa.*) FILTER (WHERE sa.id IS NOT NULL) as addresses,
        json_agg(DISTINCT sp.*) FILTER (WHERE sp.id IS NOT NULL) as performance_data
      FROM suppliers s
      LEFT JOIN supplier_contacts sc ON s.id = sc.supplier_id AND sc.is_active = true
      LEFT JOIN supplier_addresses sa ON s.id = sa.supplier_id AND sa.is_active = true
      LEFT JOIN supplier_performance sp ON s.id = sp.supplier_id
      WHERE 1=1
    `

    let countQuery = `
      SELECT COUNT(DISTINCT s.id) as count
      FROM suppliers s
      LEFT JOIN supplier_contacts sc ON s.id = sc.supplier_id AND sc.is_active = true
      LEFT JOIN supplier_addresses sa ON s.id = sa.supplier_id AND sa.is_active = true
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    if (filters.search) {
      const searchCondition = ` AND (s.name ILIKE $${paramIndex} OR s.legal_name ILIKE $${paramIndex} OR s.code ILIKE $${paramIndex})`
      query += searchCondition
      countQuery += searchCondition
      params.push(`%${filters.search}%`)
      paramIndex++
    }

    if (filters.status && filters.status.length > 0) {
      const statusCondition = ` AND s.status = ANY($${paramIndex})`
      query += statusCondition
      countQuery += statusCondition
      params.push(filters.status)
      paramIndex++
    }

    if (filters.tier && filters.tier.length > 0) {
      const tierCondition = ` AND s.tier = ANY($${paramIndex})`
      query += tierCondition
      countQuery += tierCondition
      params.push(filters.tier)
      paramIndex++
    }

    if (filters.category && filters.category.length > 0) {
      const categoryCondition = ` AND s.category = ANY($${paramIndex})`
      query += categoryCondition
      countQuery += categoryCondition
      params.push(filters.category)
      paramIndex++
    }

    query += ` GROUP BY s.id ORDER BY s.name ASC`

    // Add pagination
    const limit = filters.limit || 50
    const offset = ((filters.page || 1) - 1) * limit

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    return { query, countQuery, params }
  }

  private mapRowToSupplier(row: any): Supplier {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      status: row.status,
      tier: row.tier,
      category: row.category,
      subcategory: row.subcategory,
      tags: row.tags || [],

      businessInfo: {
        legalName: row.legal_name,
        tradingName: row.name,
        taxId: row.tax_id,
        registrationNumber: row.registration_number,
        website: row.website,
        foundedYear: row.founded_year,
        employeeCount: row.employee_count,
        annualRevenue: row.annual_revenue,
        currency: row.currency || 'ZAR'
      },

      contacts: row.contacts || [],
      addresses: row.addresses || [],

      performance: this.mapPerformanceData(row.performance_data?.[0] || {}),

      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      notes: row.notes
    }
  }

  private mapPerformanceData(data: any): any {
    return {
      overallRating: data.overall_rating || 0,
      qualityRating: data.quality_rating || 0,
      deliveryRating: data.delivery_rating || 0,
      serviceRating: data.service_rating || 0,
      priceRating: data.price_rating || 0,
      metrics: {
        onTimeDeliveryRate: data.on_time_delivery_rate || 0,
        qualityAcceptanceRate: data.quality_acceptance_rate || 0,
        responseTime: data.response_time || 0,
        defectRate: data.defect_rate || 0,
        leadTimeVariance: data.lead_time_variance || 0
      }
    }
  }

  private exportToCSV(suppliers: Supplier[]): Buffer {
    const headers = [
      'Name', 'Code', 'Status', 'Tier', 'Category', 'Legal Name',
      'Website', 'Tax ID', 'Overall Rating', 'Created Date'
    ]

    const rows = suppliers.map(supplier => [
      supplier.name,
      supplier.code,
      supplier.status,
      supplier.tier,
      supplier.category,
      supplier.businessInfo.legalName,
      supplier.businessInfo.website || '',
      supplier.businessInfo.taxId,
      supplier.performance.overallRating.toString(),
      supplier.createdAt.toISOString().split('T')[0]
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return Buffer.from(csvContent, 'utf-8')
  }

  private exportToExcel(suppliers: Supplier[]): Buffer {
    // Placeholder - would implement Excel export using a library like exceljs
    throw new Error('Excel export not yet implemented')
  }
}