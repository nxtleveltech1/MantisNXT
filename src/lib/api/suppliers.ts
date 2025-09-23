import { db } from '@/lib/db'
import type { Supplier, SupplierSearchFilters, DashboardMetrics } from '@/types/supplier'

export interface CreateSupplierData {
  name: string
  code: string
  legalName: string
  website?: string
  industry: string
  tier: 'strategic' | 'preferred' | 'approved' | 'conditional'
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  category: string
  subcategory?: string
  tags: string[]

  // Contact information
  primaryContact: {
    name: string
    title: string
    email: string
    phone: string
    department?: string
  }

  // Business information
  taxId: string
  registrationNumber: string
  foundedYear?: number
  employeeCount?: number
  annualRevenue?: number
  currency: string

  // Address information
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }

  // Capabilities
  products: string[]
  services: string[]
  certifications: string[]
  leadTime: number
  minimumOrderValue?: number
  paymentTerms: string
}

export class SupplierAPI {
  // Get all suppliers with optional filtering
  static async getSuppliers(filters?: SupplierSearchFilters): Promise<Supplier[]> {
    try {
      let query = `
        SELECT s.*,
               sc.name as contact_name, sc.title as contact_title,
               sc.email as contact_email, sc.phone as contact_phone,
               sa.address_line1, sa.city, sa.state, sa.postal_code, sa.country
        FROM suppliers s
        LEFT JOIN supplier_contacts sc ON s.id = sc.supplier_id AND sc.is_primary = true
        LEFT JOIN supplier_addresses sa ON s.id = sa.supplier_id AND sa.is_primary = true
        WHERE 1=1
      `
      const params: any[] = []
      let paramIndex = 1

      if (filters?.query) {
        query += ` AND (s.name ILIKE $${paramIndex} OR s.code ILIKE $${paramIndex} OR s.legal_name ILIKE $${paramIndex})`
        params.push(`%${filters.query}%`)
        paramIndex++
      }

      if (filters?.status && filters.status.length > 0) {
        query += ` AND s.status = ANY($${paramIndex})`
        params.push(filters.status)
        paramIndex++
      }

      if (filters?.tier && filters.tier.length > 0) {
        query += ` AND s.tier = ANY($${paramIndex})`
        params.push(filters.tier)
        paramIndex++
      }

      if (filters?.category && filters.category.length > 0) {
        query += ` AND s.category = ANY($${paramIndex})`
        params.push(filters.category)
        paramIndex++
      }

      query += ` ORDER BY s.name ASC`

      const result = await db.query(query, params)

      return result.rows.map(row => this.mapRowToSupplier(row))
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      throw new Error('Failed to fetch suppliers')
    }
  }

  // Get supplier by ID
  static async getSupplierById(id: string): Promise<Supplier | null> {
    try {
      const result = await db.query(`
        SELECT s.*,
               sc.name as contact_name, sc.title as contact_title,
               sc.email as contact_email, sc.phone as contact_phone,
               sa.address_line1, sa.city, sa.state, sa.postal_code, sa.country
        FROM suppliers s
        LEFT JOIN supplier_contacts sc ON s.id = sc.supplier_id AND sc.is_primary = true
        LEFT JOIN supplier_addresses sa ON s.id = sa.supplier_id AND sa.is_primary = true
        WHERE s.id = $1
      `, [id])

      if (result.rows.length === 0) {
        return null
      }

      return this.mapRowToSupplier(result.rows[0])
    } catch (error) {
      console.error('Error fetching supplier by ID:', error)
      throw new Error('Failed to fetch supplier')
    }
  }

  // Create new supplier
  static async createSupplier(data: CreateSupplierData): Promise<Supplier> {
    const client = await db.getClient()

    try {
      await client.query('BEGIN')

      // Insert supplier
      const supplierResult = await client.query(`
        INSERT INTO suppliers (
          name, code, legal_name, website, industry, tier, status, category, subcategory,
          tags, tax_id, registration_number, founded_year, employee_count, annual_revenue,
          currency, products, services, certifications, lead_time, minimum_order_value,
          payment_terms, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW(), NOW()
        ) RETURNING id
      `, [
        data.name, data.code, data.legalName, data.website, data.industry, data.tier,
        data.status, data.category, data.subcategory, data.tags, data.taxId,
        data.registrationNumber, data.foundedYear, data.employeeCount, data.annualRevenue,
        data.currency, data.products, data.services, data.certifications, data.leadTime,
        data.minimumOrderValue, data.paymentTerms
      ])

      const supplierId = supplierResult.rows[0].id

      // Insert primary contact
      await client.query(`
        INSERT INTO supplier_contacts (
          supplier_id, type, name, title, email, phone, department, is_primary, is_active, created_at
        ) VALUES ($1, 'primary', $2, $3, $4, $5, $6, true, true, NOW())
      `, [
        supplierId, data.primaryContact.name, data.primaryContact.title,
        data.primaryContact.email, data.primaryContact.phone, data.primaryContact.department
      ])

      // Insert primary address
      await client.query(`
        INSERT INTO supplier_addresses (
          supplier_id, type, address_line1, city, state, postal_code, country, is_primary, is_active, created_at
        ) VALUES ($1, 'headquarters', $2, $3, $4, $5, $6, true, true, NOW())
      `, [
        supplierId, data.address.street, data.address.city, data.address.state,
        data.address.postalCode, data.address.country
      ])

      await client.query('COMMIT')

      // Fetch and return the created supplier
      const createdSupplier = await this.getSupplierById(supplierId)
      if (!createdSupplier) {
        throw new Error('Failed to retrieve created supplier')
      }

      return createdSupplier
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error creating supplier:', error)
      throw new Error('Failed to create supplier')
    } finally {
      client.release()
    }
  }

  // Update supplier
  static async updateSupplier(id: string, data: Partial<CreateSupplierData>): Promise<Supplier> {
    const client = await db.getClient()

    try {
      await client.query('BEGIN')

      // Build dynamic update query for supplier
      const updateFields: string[] = []
      const params: any[] = []
      let paramIndex = 1

      if (data.name) {
        updateFields.push(`name = $${paramIndex++}`)
        params.push(data.name)
      }
      if (data.legalName) {
        updateFields.push(`legal_name = $${paramIndex++}`)
        params.push(data.legalName)
      }
      if (data.website !== undefined) {
        updateFields.push(`website = $${paramIndex++}`)
        params.push(data.website)
      }
      if (data.industry) {
        updateFields.push(`industry = $${paramIndex++}`)
        params.push(data.industry)
      }
      if (data.tier) {
        updateFields.push(`tier = $${paramIndex++}`)
        params.push(data.tier)
      }
      if (data.status) {
        updateFields.push(`status = $${paramIndex++}`)
        params.push(data.status)
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`)
        params.push(id) // Add ID as last parameter

        await client.query(
          `UPDATE suppliers SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          params
        )
      }

      await client.query('COMMIT')

      // Fetch and return updated supplier
      const updatedSupplier = await this.getSupplierById(id)
      if (!updatedSupplier) {
        throw new Error('Failed to retrieve updated supplier')
      }

      return updatedSupplier
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error updating supplier:', error)
      throw new Error('Failed to update supplier')
    } finally {
      client.release()
    }
  }

  // Delete supplier
  static async deleteSupplier(id: string): Promise<void> {
    const client = await db.getClient()

    try {
      await client.query('BEGIN')

      // Delete related records first (foreign key constraints)
      await client.query('DELETE FROM supplier_contacts WHERE supplier_id = $1', [id])
      await client.query('DELETE FROM supplier_addresses WHERE supplier_id = $1', [id])
      await client.query('DELETE FROM supplier_performance WHERE supplier_id = $1', [id])

      // Delete supplier
      const result = await client.query('DELETE FROM suppliers WHERE id = $1', [id])

      if (result.rowCount === 0) {
        throw new Error('Supplier not found')
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error deleting supplier:', error)
      throw new Error('Failed to delete supplier')
    } finally {
      client.release()
    }
  }

  // Get dashboard metrics
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Get basic counts
      const countsResult = await db.query(`
        SELECT
          COUNT(*) as total_suppliers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_suppliers,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_approvals
        FROM suppliers
      `)

      // Get performance metrics
      const performanceResult = await db.query(`
        SELECT
          AVG(overall_rating) as avg_performance_rating,
          AVG(on_time_delivery_rate) as on_time_delivery_rate,
          AVG(quality_acceptance_rate) as quality_acceptance_rate
        FROM supplier_performance
      `)

      // Get financial metrics
      const financialResult = await db.query(`
        SELECT
          COALESCE(SUM(total_purchase_value), 0) as total_purchase_value
        FROM supplier_performance
      `)

      // Get contracts expiring soon (next 30 days)
      const contractsResult = await db.query(`
        SELECT COUNT(*) as contracts_expiring_soon
        FROM supplier_contracts
        WHERE status = 'active'
        AND end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      `)

      const counts = countsResult.rows[0]
      const performance = performanceResult.rows[0]
      const financial = financialResult.rows[0]
      const contracts = contractsResult.rows[0]

      return {
        totalSuppliers: parseInt(counts.total_suppliers) || 0,
        activeSuppliers: parseInt(counts.active_suppliers) || 0,
        pendingApprovals: parseInt(counts.pending_approvals) || 0,
        contractsExpiringSoon: parseInt(contracts.contracts_expiring_soon) || 0,
        avgPerformanceRating: parseFloat(performance.avg_performance_rating) || 0,
        totalPurchaseValue: parseFloat(financial.total_purchase_value) || 0,
        onTimeDeliveryRate: parseFloat(performance.on_time_delivery_rate) || 0,
        qualityAcceptanceRate: parseFloat(performance.quality_acceptance_rate) || 0
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      throw new Error('Failed to fetch dashboard metrics')
    }
  }

  // Private helper method to map database row to Supplier interface
  private static mapRowToSupplier(row: any): Supplier {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      status: row.status,
      tier: row.tier,
      category: row.category,
      subcategory: row.subcategory,
      tags: row.tags || [],

      contacts: [{
        id: 'primary',
        type: 'primary',
        name: row.contact_name || '',
        title: row.contact_title || '',
        email: row.contact_email || '',
        phone: row.contact_phone || '',
        department: '',
        isPrimary: true,
        isActive: true
      }],

      addresses: [{
        id: 'primary',
        type: 'headquarters',
        name: 'Headquarters',
        addressLine1: row.address_line1 || '',
        addressLine2: '',
        city: row.city || '',
        state: row.state || '',
        postalCode: row.postal_code || '',
        country: row.country || '',
        isPrimary: true,
        isActive: true
      }],

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

      capabilities: {
        products: row.products || [],
        services: row.services || [],
        certifications: row.certifications || [],
        capacityPerMonth: row.capacity_per_month,
        leadTime: row.lead_time || 0,
        minimumOrderValue: row.minimum_order_value,
        paymentTerms: row.payment_terms || 'Net 30'
      },

      performance: {
        overallRating: 0,
        qualityRating: 0,
        deliveryRating: 0,
        serviceRating: 0,
        priceRating: 0,
        metrics: {
          onTimeDeliveryRate: 0,
          qualityAcceptanceRate: 0,
          responseTime: 0,
          defectRate: 0,
          leadTimeVariance: 0
        },
        kpis: [],
        lastEvaluationDate: new Date(),
        nextEvaluationDate: new Date()
      },

      financial: {
        creditRating: row.credit_rating,
        paymentTerms: row.payment_terms || 'Net 30',
        currency: row.currency || 'ZAR',
        bankDetails: undefined
      },

      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by || 'system',
      lastContactDate: row.last_contact_date ? new Date(row.last_contact_date) : undefined,
      nextReviewDate: row.next_review_date ? new Date(row.next_review_date) : undefined,
      notes: row.notes || ''
    }
  }
}