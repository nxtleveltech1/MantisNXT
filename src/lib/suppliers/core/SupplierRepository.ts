/**
 * Unified Supplier Repository - Single Source of Truth
 * Eliminates data layer chaos by providing consistent interface
 */

import { PoolClient } from 'pg'
import { query, withTransaction } from '@/lib/database'
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
  constructor() {}

  async findById(id: string): Promise<Supplier | null> {
    const queryText = `
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

    const result = await query(queryText, [id])
    if (result.rows.length === 0) return null
    return this.mapRowToSupplier(result.rows[0])
  }

  async findMany(filters: SupplierFilters): Promise<SupplierSearchResult> {
    const { query: queryText, countQuery, params } = this.buildFilterQuery(filters)

    const countResult = await query(countQuery, params.slice(0, -2))
    const total = parseInt(countResult.rows[0]?.count ?? '0')

    const result = await query(queryText, params)
    const suppliers = result.rows.map((row: any) => this.mapRowToSupplier(row))

    return {
      suppliers,
      total,
      page: filters.page || 1,
      limit: filters.limit || 50,
      totalPages: Math.ceil(total / (filters.limit || 50))
    }
  }

  async create(data: CreateSupplierData): Promise<Supplier> {
    const supplierId: string = await withTransaction(async (client: PoolClient) => {
      const supplierQuery = `
        INSERT INTO suppliers (
          name, code, legal_name, website, industry, tier, status, category, subcategory,
          tags, tax_id, registration_number, founded_year, employee_count, annual_revenue,
          currency, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
        ) RETURNING id
      `

      const businessInfo = data.businessInfo
      const supplierParams = [
        data.name,
        data.code,
        businessInfo.legalName,
        businessInfo.website ?? null,
        businessInfo.industry ?? null,
        data.tier,
        data.status,
        data.category,
        data.subcategory ?? null,
        data.tags,
        businessInfo.taxId,
        businessInfo.registrationNumber,
        businessInfo.foundedYear ?? null,
        businessInfo.employeeCount ?? null,
        businessInfo.annualRevenue ?? null,
        businessInfo.currency
      ]

      const supplierResult = await client.query(supplierQuery, supplierParams)
      const newSupplierId: string = supplierResult.rows[0].id

      if (data.contacts && data.contacts.length > 0) {
        const contactArrays = data.contacts.reduce((acc, contact) => {
          acc.supplierIds.push(newSupplierId)
          acc.types.push(contact.type)
          acc.names.push(contact.name)
          acc.titles.push(contact.title)
          acc.emails.push(contact.email)
          acc.phones.push(contact.phone)
          acc.mobiles.push(contact.mobile ?? null)
          acc.departments.push(contact.department ?? null)
          acc.isPrimaries.push(contact.isPrimary)
          acc.isActives.push(contact.isActive)
          return acc
        }, {
          supplierIds: [] as string[],
          types: [] as string[],
          names: [] as string[],
          titles: [] as string[],
          emails: [] as string[],
          phones: [] as string[],
          mobiles: [] as (string | null)[],
          departments: [] as (string | null)[],
          isPrimaries: [] as boolean[],
          isActives: [] as boolean[]
        })

        await client.query(`
          INSERT INTO supplier_contacts (
            supplier_id, type, name, title, email, phone, mobile, department,
            is_primary, is_active, created_at
          )
          SELECT * FROM unnest(
            $1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[],
            $6::text[], $7::text[], $8::text[], $9::boolean[], $10::boolean[]
          ) AS t(supplier_id, type, name, title, email, phone, mobile, department, is_primary, is_active)
          CROSS JOIN (SELECT NOW() as created_at) dates
        `, [
          contactArrays.supplierIds,
          contactArrays.types,
          contactArrays.names,
          contactArrays.titles,
          contactArrays.emails,
          contactArrays.phones,
          contactArrays.mobiles,
          contactArrays.departments,
          contactArrays.isPrimaries,
          contactArrays.isActives
        ])
      }

      if (data.addresses && data.addresses.length > 0) {
        const addressArrays = data.addresses.reduce((acc, address) => {
          acc.supplierIds.push(newSupplierId)
          acc.types.push(address.type)
          acc.names.push(address.name ?? null)
          acc.addressLine1s.push(address.addressLine1)
          acc.addressLine2s.push(address.addressLine2 ?? null)
          acc.cities.push(address.city)
          acc.states.push(address.state)
          acc.postalCodes.push(address.postalCode)
          acc.countries.push(address.country)
          acc.isPrimaries.push(address.isPrimary)
          acc.isActives.push(address.isActive)
          return acc
        }, {
          supplierIds: [] as string[],
          types: [] as string[],
          names: [] as (string | null)[],
          addressLine1s: [] as string[],
          addressLine2s: [] as (string | null)[],
          cities: [] as string[],
          states: [] as string[],
          postalCodes: [] as string[],
          countries: [] as string[],
          isPrimaries: [] as boolean[],
          isActives: [] as boolean[]
        })

        await client.query(`
          INSERT INTO supplier_addresses (
            supplier_id, type, name, address_line1, address_line2, city, state,
            postal_code, country, is_primary, is_active, created_at
          )
          SELECT * FROM unnest(
            $1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[],
            $6::text[], $7::text[], $8::text[], $9::text[], $10::boolean[], $11::boolean[]
          ) AS t(supplier_id, type, name, address_line1, address_line2, city, state, postal_code, country, is_primary, is_active)
          CROSS JOIN (SELECT NOW() as created_at) dates
        `, [
          addressArrays.supplierIds,
          addressArrays.types,
          addressArrays.names,
          addressArrays.addressLine1s,
          addressArrays.addressLine2s,
          addressArrays.cities,
          addressArrays.states,
          addressArrays.postalCodes,
          addressArrays.countries,
          addressArrays.isPrimaries,
          addressArrays.isActives
        ])
      }

      await client.query(
        `INSERT INTO supplier_performance (
          supplier_id, overall_rating, quality_rating, delivery_rating,
          service_rating, price_rating, created_at, updated_at
        ) VALUES ($1, 0, 0, 0, 0, 0, NOW(), NOW())`,
        [newSupplierId]
      )

      return newSupplierId
    })

    const createdSupplier = await this.findById(supplierId)
    if (!createdSupplier) {
      throw new Error('Failed to retrieve created supplier')
    }
    return createdSupplier
  }

  async update(id: string, data: UpdateSupplierData): Promise<Supplier> {
    await withTransaction(async (client: PoolClient) => {
      const updateFields: string[] = []
      const params: any[] = []
      let paramIndex = 1

      const updateBusinessInfo = data.businessInfo

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`)
        params.push(data.name)
      }
      if (updateBusinessInfo?.legalName !== undefined) {
        updateFields.push(`legal_name = $${paramIndex++}`)
        params.push(updateBusinessInfo.legalName)
      }
      if (updateBusinessInfo?.website !== undefined) {
        updateFields.push(`website = $${paramIndex++}`)
        params.push(updateBusinessInfo.website)
      }
      if (updateBusinessInfo?.industry !== undefined) {
        updateFields.push(`industry = $${paramIndex++}`)
        params.push(updateBusinessInfo.industry)
      }
      if (updateBusinessInfo?.taxId !== undefined) {
        updateFields.push(`tax_id = $${paramIndex++}`)
        params.push(updateBusinessInfo.taxId)
      }
      if (updateBusinessInfo?.registrationNumber !== undefined) {
        updateFields.push(`registration_number = $${paramIndex++}`)
        params.push(updateBusinessInfo.registrationNumber)
      }
      if (updateBusinessInfo?.foundedYear !== undefined) {
        updateFields.push(`founded_year = $${paramIndex++}`)
        params.push(updateBusinessInfo.foundedYear)
      }
      if (updateBusinessInfo?.employeeCount !== undefined) {
        updateFields.push(`employee_count = $${paramIndex++}`)
        params.push(updateBusinessInfo.employeeCount)
      }
      if (updateBusinessInfo?.annualRevenue !== undefined) {
        updateFields.push(`annual_revenue = $${paramIndex++}`)
        params.push(updateBusinessInfo.annualRevenue)
      }
      if (updateBusinessInfo?.currency !== undefined) {
        updateFields.push(`currency = $${paramIndex++}`)
        params.push(updateBusinessInfo.currency)
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`)
        params.push(data.status)
      }
      if (data.tier !== undefined) {
        updateFields.push(`tier = $${paramIndex++}`)
        params.push(data.tier)
      }
      if (data.category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`)
        params.push(data.category)
      }
      if (data.subcategory !== undefined) {
        updateFields.push(`subcategory = $${paramIndex++}`)
        params.push(data.subcategory)
      }
      if (data.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`)
        params.push(data.tags)
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`)
        params.push(id)
        await client.query(`UPDATE suppliers SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`, params)
      }

      if (data.contacts) {
        await client.query('DELETE FROM supplier_contacts WHERE supplier_id = $1', [id])
        if (data.contacts.length > 0) {
          const contactArrays = data.contacts.reduce((acc, contact) => {
            acc.supplierIds.push(id)
            acc.types.push(contact.type)
            acc.names.push(contact.name)
            acc.titles.push(contact.title)
            acc.emails.push(contact.email)
            acc.phones.push(contact.phone)
            acc.mobiles.push(contact.mobile ?? null)
            acc.departments.push(contact.department ?? null)
            acc.isPrimaries.push(contact.isPrimary)
            acc.isActives.push(contact.isActive)
            return acc
          }, {
            supplierIds: [] as string[],
            types: [] as string[],
            names: [] as string[],
            titles: [] as string[],
            emails: [] as string[],
            phones: [] as string[],
            mobiles: [] as (string | null)[],
            departments: [] as (string | null)[],
            isPrimaries: [] as boolean[],
            isActives: [] as boolean[]
          })

          await client.query(`
            INSERT INTO supplier_contacts (
              supplier_id, type, name, title, email, phone, mobile, department,
              is_primary, is_active, created_at
            )
            SELECT * FROM unnest(
              $1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[],
              $6::text[], $7::text[], $8::text[], $9::boolean[], $10::boolean[]
            ) AS t(supplier_id, type, name, title, email, phone, mobile, department, is_primary, is_active)
            CROSS JOIN (SELECT NOW() as created_at) dates
          `, [
            contactArrays.supplierIds,
            contactArrays.types,
            contactArrays.names,
            contactArrays.titles,
            contactArrays.emails,
            contactArrays.phones,
            contactArrays.mobiles,
            contactArrays.departments,
            contactArrays.isPrimaries,
            contactArrays.isActives
          ])
        }
      }

      if (data.addresses) {
        await client.query('DELETE FROM supplier_addresses WHERE supplier_id = $1', [id])
        if (data.addresses.length > 0) {
          const addressArrays = data.addresses.reduce((acc, address) => {
            acc.supplierIds.push(id)
            acc.types.push(address.type)
            acc.names.push(address.name ?? null)
            acc.addressLine1s.push(address.addressLine1)
            acc.addressLine2s.push(address.addressLine2 ?? null)
            acc.cities.push(address.city)
            acc.states.push(address.state)
            acc.postalCodes.push(address.postalCode)
            acc.countries.push(address.country)
            acc.isPrimaries.push(address.isPrimary)
            acc.isActives.push(address.isActive)
            return acc
          }, {
            supplierIds: [] as string[],
            types: [] as string[],
            names: [] as (string | null)[],
            addressLine1s: [] as string[],
            addressLine2s: [] as (string | null)[],
            cities: [] as string[],
            states: [] as string[],
            postalCodes: [] as string[],
            countries: [] as string[],
            isPrimaries: [] as boolean[],
            isActives: [] as boolean[]
          })

          await client.query(`
            INSERT INTO supplier_addresses (
              supplier_id, type, name, address_line1, address_line2, city, state,
              postal_code, country, is_primary, is_active, created_at
            )
            SELECT * FROM unnest(
              $1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[],
              $6::text[], $7::text[], $8::text[], $9::text[], $10::boolean[], $11::boolean[]
            ) AS t(supplier_id, type, name, address_line1, address_line2, city, state, postal_code, country, is_primary, is_active)
            CROSS JOIN (SELECT NOW() as created_at) dates
          `, [
            addressArrays.supplierIds,
            addressArrays.types,
            addressArrays.names,
            addressArrays.addressLine1s,
            addressArrays.addressLine2s,
            addressArrays.cities,
            addressArrays.states,
            addressArrays.postalCodes,
            addressArrays.countries,
            addressArrays.isPrimaries,
            addressArrays.isActives
          ])
        }
      }
    })

    const updatedSupplier = await this.findById(id)
    if (!updatedSupplier) {
      throw new Error('Supplier not found after update')
    }
    return updatedSupplier
  }

  async delete(id: string): Promise<void> {
    await withTransaction(async (client: PoolClient) => {
      await client.query('DELETE FROM supplier_performance WHERE supplier_id = $1', [id])
      await client.query('DELETE FROM supplier_contacts WHERE supplier_id = $1', [id])
      await client.query('DELETE FROM supplier_addresses WHERE supplier_id = $1', [id])
      const result = await client.query('DELETE FROM suppliers WHERE id = $1', [id])
      if (result.rowCount === 0) {
        throw new Error('Supplier not found')
      }
    })
  }

  // OPTIMIZED: createMany using bulk insert (4-5x faster)
  async createMany(data: CreateSupplierData[]): Promise<Supplier[]> {
    if (data.length === 0) return []

    const supplierIds: string[] = await withTransaction(async (client: PoolClient) => {
      const supplierArrays = data.reduce((acc, supplier) => {
        acc.names.push(supplier.name)
        acc.codes.push(supplier.code)
        const info = supplier.businessInfo
        acc.legalNames.push(info.legalName)
        acc.websites.push(info.website ?? null)
        acc.industries.push(info.industry ?? null)
        acc.tiers.push(supplier.tier)
        acc.statuses.push(supplier.status)
        acc.categories.push(supplier.category)
        acc.subcategories.push(supplier.subcategory || null)
        acc.tags.push(supplier.tags)
        acc.taxIds.push(info.taxId)
        acc.registrationNumbers.push(info.registrationNumber)
        acc.foundedYears.push(info.foundedYear ?? null)
        acc.employeeCounts.push(info.employeeCount ?? null)
        acc.annualRevenues.push(info.annualRevenue ?? null)
        acc.currencies.push(info.currency)
        return acc
      }, {
        names: [] as string[],
        codes: [] as string[],
        legalNames: [] as string[],
        websites: [] as (string | null)[],
        industries: [] as (string | null)[],
        tiers: [] as string[],
        statuses: [] as string[],
        categories: [] as string[],
        subcategories: [] as (string | null)[],
        tags: [] as string[][],
        taxIds: [] as string[],
        registrationNumbers: [] as string[],
        foundedYears: [] as (number | null)[],
        employeeCounts: [] as (number | null)[],
        annualRevenues: [] as (number | null)[],
        currencies: [] as string[]
      })

      const supplierResult = await client.query(`
        INSERT INTO suppliers (
          name, code, legal_name, website, industry, tier, status, category, subcategory,
          tags, tax_id, registration_number, founded_year, employee_count, annual_revenue,
          currency, created_at, updated_at
        )
        SELECT * FROM unnest(
          $1::text[], $2::text[], $3::text[], $4::text[], $5::text[],
          $6::text[], $7::text[], $8::text[], $9::text[], $10::text[][],
          $11::text[], $12::text[], $13::int[], $14::int[], $15::numeric[],
          $16::text[]
        ) AS t(
          name, code, legal_name, website, industry, tier, status, category, subcategory,
          tags, tax_id, registration_number, founded_year, employee_count, annual_revenue,
          currency
        )
        CROSS JOIN (SELECT NOW() as created_at, NOW() as updated_at) dates
        RETURNING id
      `, [
        supplierArrays.names,
        supplierArrays.codes,
        supplierArrays.legalNames,
        supplierArrays.websites,
        supplierArrays.industries,
        supplierArrays.tiers,
        supplierArrays.statuses,
        supplierArrays.categories,
        supplierArrays.subcategories,
        supplierArrays.tags,
        supplierArrays.taxIds,
        supplierArrays.registrationNumbers,
        supplierArrays.foundedYears,
        supplierArrays.employeeCounts,
        supplierArrays.annualRevenues,
        supplierArrays.currencies
      ])

      const supplierIds = supplierResult.rows.map(row => row.id)

      const allContacts: any[] = []
      data.forEach((supplier, idx) => {
        if (supplier.contacts && supplier.contacts.length > 0) {
          supplier.contacts.forEach(contact => {
            allContacts.push({ supplierId: supplierIds[idx], ...contact })
          })
        }
      })
      if (allContacts.length > 0) {
        const contactArrays = allContacts.reduce((acc, contact) => {
          acc.supplierIds.push(contact.supplierId)
          acc.types.push(contact.type)
          acc.names.push(contact.name)
          acc.titles.push(contact.title)
          acc.emails.push(contact.email)
          acc.phones.push(contact.phone)
          acc.mobiles.push(contact.mobile ?? null)
          acc.departments.push(contact.department ?? null)
          acc.isPrimaries.push(contact.isPrimary)
          acc.isActives.push(contact.isActive)
          return acc
        }, {
          supplierIds: [] as string[],
          types: [] as string[],
          names: [] as string[],
          titles: [] as string[],
          emails: [] as string[],
          phones: [] as string[],
          mobiles: [] as (string | null)[],
          departments: [] as (string | null)[],
          isPrimaries: [] as boolean[],
          isActives: [] as boolean[]
        })
        await client.query(`
          INSERT INTO supplier_contacts (
            supplier_id, type, name, title, email, phone, mobile, department,
            is_primary, is_active, created_at
          )
          SELECT * FROM unnest(
            $1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[],
            $6::text[], $7::text[], $8::text[], $9::boolean[], $10::boolean[]
          ) AS t(supplier_id, type, name, title, email, phone, mobile, department, is_primary, is_active)
          CROSS JOIN (SELECT NOW() as created_at) dates
        `, [
          contactArrays.supplierIds,
          contactArrays.types,
          contactArrays.names,
          contactArrays.titles,
          contactArrays.emails,
          contactArrays.phones,
          contactArrays.mobiles,
          contactArrays.departments,
          contactArrays.isPrimaries,
          contactArrays.isActives
        ])
      }

      const allAddresses: any[] = []
      data.forEach((supplier, idx) => {
        if (supplier.addresses && supplier.addresses.length > 0) {
          supplier.addresses.forEach(address => {
            allAddresses.push({ supplierId: supplierIds[idx], ...address })
          })
        }
      })
      if (allAddresses.length > 0) {
        const addressArrays = allAddresses.reduce((acc, address) => {
          acc.supplierIds.push(address.supplierId)
          acc.types.push(address.type)
          acc.names.push(address.name ?? null)
          acc.addressLine1s.push(address.addressLine1)
          acc.addressLine2s.push(address.addressLine2 ?? null)
          acc.cities.push(address.city)
          acc.states.push(address.state)
          acc.postalCodes.push(address.postalCode)
          acc.countries.push(address.country)
          acc.isPrimaries.push(address.isPrimary)
          acc.isActives.push(address.isActive)
          return acc
        }, {
          supplierIds: [] as string[],
          types: [] as string[],
          names: [] as (string | null)[],
          addressLine1s: [] as string[],
          addressLine2s: [] as (string | null)[],
          cities: [] as string[],
          states: [] as string[],
          postalCodes: [] as string[],
          countries: [] as string[],
          isPrimaries: [] as boolean[],
          isActives: [] as boolean[]
        })
        await client.query(`
          INSERT INTO supplier_addresses (
            supplier_id, type, name, address_line1, address_line2, city, state,
            postal_code, country, is_primary, is_active, created_at
          )
          SELECT * FROM unnest(
            $1::uuid[], $2::text[], $3::text[], $4::text[], $5::text[],
            $6::text[], $7::text[], $8::text[], $9::text[], $10::boolean[], $11::boolean[]
          ) AS t(supplier_id, type, name, address_line1, address_line2, city, state, postal_code, country, is_primary, is_active)
          CROSS JOIN (SELECT NOW() as created_at) dates
        `, [
          addressArrays.supplierIds,
          addressArrays.types,
          addressArrays.names,
          addressArrays.addressLine1s,
          addressArrays.addressLine2s,
          addressArrays.cities,
          addressArrays.states,
          addressArrays.postalCodes,
          addressArrays.countries,
          addressArrays.isPrimaries,
          addressArrays.isActives
        ])
      }

      await client.query(`
        INSERT INTO supplier_performance (
          supplier_id, overall_rating, quality_rating, delivery_rating,
          service_rating, price_rating, created_at, updated_at
        )
        SELECT id, 0, 0, 0, 0, 0, NOW(), NOW()
        FROM unnest($1::uuid[]) AS t(id)
      `, [supplierIds])

      return supplierIds
    })

    const createdSuppliers = await Promise.all(
      supplierIds.map(id => this.findById(id))
    )
    return createdSuppliers.filter((s): s is Supplier => s !== null)
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
    const result = await query(metricsQuery)
    const row = result.rows[0] || {}
    return {
      totalSuppliers: parseInt(row.total_suppliers) || 0,
      activeSuppliers: parseInt(row.active_suppliers) || 0,
      pendingSuppliers: parseInt(row.pending_suppliers) || 0,
      strategicSuppliers: parseInt(row.strategic_suppliers) || 0,
      averageRating: parseFloat(row.avg_rating) || 0,
      averageDeliveryRate: parseFloat(row.avg_delivery_rate) || 0
    }
  }

  async getPerformanceData(supplierId: string): Promise<any> {
    const result = await query('SELECT * FROM supplier_performance WHERE supplier_id = $1', [supplierId])
    return result.rows[0] || null
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
