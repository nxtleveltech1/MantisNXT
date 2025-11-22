// @ts-nocheck

/**
 * Unified Supplier Repository - Single Source of Truth
 * Eliminates data layer chaos by providing consistent interface
 */

import type { PoolClient } from 'pg'
import { query, withTransaction } from '@/lib/database'
import type {
  Supplier,
  CreateSupplierData,
  UpdateSupplierData,
  SupplierFilters,
  SupplierSearchResult,
  SupplierMetrics,
  SupplierPerformanceSnapshot
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
  getPerformanceData(supplierId: string): Promise<SupplierPerformanceSnapshot | null>

  // Search and discovery
  search(query: string, filters?: SupplierFilters): Promise<SupplierSearchResult>
  findSimilar(supplierId: string): Promise<Supplier[]>

  // Export and reporting
  exportData(filters: SupplierFilters, format: 'csv' | 'excel' | 'json'): Promise<Buffer>
}

export class PostgreSQLSupplierRepository implements SupplierRepository {
  constructor() {}

  async findById(id: string): Promise<Supplier | null> {
    // Check if public.suppliers is a view - if so, read from core.supplier directly
    const tableTypeCheck = await query(`
      SELECT table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'suppliers'
    `)
    
    const isView = tableTypeCheck.rows.length > 0 && tableTypeCheck.rows[0].table_type === 'VIEW'
    
    // Read from the actual table, not the view, to get ALL data
    const supplierQuery = isView ? `
      SELECT 
        s.supplier_id::text as id,
        s.name,
        s.code,
        s.org_id,
        CASE WHEN s.active THEN 'active'::text ELSE 'inactive'::text END as status,
        s.default_currency as currency,
        s.payment_terms,
        s.contact_info,
        s.tax_number as tax_id,
        s.created_at,
        s.updated_at,
        s.contact_person
      FROM core.supplier s
      WHERE CAST(s.supplier_id AS TEXT) = $1
      LIMIT 1
    ` : `
      SELECT *
      FROM public.suppliers s
      WHERE CAST(s.id AS TEXT) = $1
      LIMIT 1
    `
    
    const supplierResult = await query(supplierQuery, [id])
    if (supplierResult.rows.length === 0) return null
    
    const row: unknown = supplierResult.rows[0]
    
    // Debug: Log what we're getting from the database
    console.log('🔍 [findById] Raw database row:', {
      id: row.id,
      name: row.name,
      code: row.code,
      contact_info: row.contact_info,
      has_contact_info: !!row.contact_info,
    })
    
    // Extract data from contact_info JSONB if it exists
    const contactInfo = row.contact_info || {}
    console.log('🔍 [findById] Extracted contact_info:', contactInfo)
    
    // Map columns that exist - handle different column name variations
    // Prioritize JSONB data over column data if both exist
    row.tier = row.tier || contactInfo.tier || row.performance_tier || 'approved'
    row.category = row.category || contactInfo.category || row.primary_category || ''
    row.subcategory = row.subcategory || contactInfo.subcategory || ''
    row.tags = row.tags || contactInfo.tags || []
    row.brands = row.brands || contactInfo.brands || []
    row.legal_name = row.legal_name || contactInfo.legalName || row.name || ''
    row.trading_name = row.trading_name || contactInfo.tradingName || ''
    row.website = row.website || contactInfo.website || ''
    row.industry = row.industry || contactInfo.industry || ''
    row.tax_id = row.tax_id || row.tax_number || contactInfo.taxId || ''
    row.registration_number = row.registration_number || contactInfo.registrationNumber || ''
    row.founded_year = row.founded_year ?? contactInfo.foundedYear ?? null
    row.employee_count = row.employee_count ?? contactInfo.employeeCount ?? null
    row.annual_revenue = row.annual_revenue ?? contactInfo.annualRevenue ?? null
    row.currency = row.currency || row.default_currency || contactInfo.currency || row.currency_code || 'ZAR'
    row.notes = row.notes || contactInfo.notes || null
    
    // Get contacts
    const contactsQuery = `
      SELECT id, type, name, title, email, phone, mobile, department, is_primary, is_active
      FROM supplier_contacts
      WHERE CAST(supplier_id AS TEXT) = $1
    `
    const contactsResult = await query(contactsQuery, [id])
    console.log('🔍 [findById] Contacts found:', contactsResult.rows.length)
    
    // Get addresses
    const addressesQuery = `
      SELECT id, type, name, address_line1, address_line2, city, state, postal_code, country, is_primary, is_active
      FROM supplier_addresses
      WHERE CAST(supplier_id AS TEXT) = $1
    `
    const addressesResult = await query(addressesQuery, [id])
    console.log('🔍 [findById] Addresses found:', addressesResult.rows.length)
    
    // Map contacts and addresses
    row.contacts = contactsResult.rows.map((c: unknown) => ({
      id: c.id,
      type: c.type || 'primary',
      name: c.name || contactInfo.contactPerson || contactInfo.name || '',
      title: c.title || contactInfo.title || '',
      email: c.email || contactInfo.email || '',
      phone: c.phone || contactInfo.phone || '',
      mobile: c.mobile || contactInfo.mobile || '',
      department: c.department || contactInfo.department || '',
      isPrimary: c.is_primary ?? true,
      isActive: c.is_active !== false
    }))
    
    // If no contacts exist but we have contact info in JSONB, create a contact from it
    if (row.contacts.length === 0 && (contactInfo.email || contactInfo.phone)) {
      row.contacts = [{
        id: '',
        type: 'primary',
        name: contactInfo.contactPerson || contactInfo.name || '',
        title: contactInfo.title || '',
        email: contactInfo.email || '',
        phone: contactInfo.phone || '',
        mobile: contactInfo.mobile || '',
        department: contactInfo.department || '',
        isPrimary: true,
        isActive: true
      }]
    }
    
    console.log('🔍 [findById] Mapped contacts:', JSON.stringify(row.contacts, null, 2))
    
    row.addresses = addressesResult.rows.map((a: unknown) => ({
      id: a.id,
      type: a.type || 'headquarters',
      name: a.name || '',
      addressLine1: a.address_line1 || contactInfo.address?.addressLine1 || contactInfo.address?.street || '',
      addressLine2: a.address_line2 || contactInfo.address?.addressLine2 || '',
      city: a.city || contactInfo.address?.city || contactInfo.location?.split(',')[0]?.trim() || '',
      state: a.state || contactInfo.address?.state || contactInfo.location?.split(',')[1]?.trim() || '',
      postalCode: a.postal_code || contactInfo.address?.postalCode || '',
      country: a.country || contactInfo.address?.country || contactInfo.location?.split(',')[2]?.trim() || 'South Africa',
      isPrimary: a.is_primary ?? true,
      isActive: a.is_active !== false
    }))
    
    // If no addresses exist but we have address info in JSONB, create an address from it
    if (row.addresses.length === 0 && contactInfo.address) {
      row.addresses = [{
        id: '',
        type: 'headquarters',
        name: '',
        addressLine1: contactInfo.address.addressLine1 || contactInfo.address.street || '',
        addressLine2: contactInfo.address.addressLine2 || '',
        city: contactInfo.address.city || '',
        state: contactInfo.address.state || '',
        postalCode: contactInfo.address.postalCode || '',
        country: contactInfo.address.country || 'South Africa',
        isPrimary: true,
        isActive: true
      }]
    }
    
    console.log('🔍 [findById] Mapped addresses:', JSON.stringify(row.addresses, null, 2))
    
    return this.mapRowToSupplier(row)
  }

  async findMany(filters: SupplierFilters): Promise<SupplierSearchResult> {
    const { query: queryText, countQuery, params } = this.buildFilterQuery(filters)

    const countResult = await query(countQuery, params.slice(0, -2))
    const total = parseInt(countResult.rows[0]?.count ?? '0')

    const result = await query(queryText, params)
    const suppliers = result.rows.map((row: unknown) => this.mapRowToSupplier(row))

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
        INSERT INTO public.suppliers (
          name, code, legal_name, website, industry, tier, status, category, subcategory,
          tags, brands, tax_id, registration_number, founded_year, employee_count, annual_revenue,
          currency, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
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
        data.brands || [],
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

      // Create default supplier profile for inventory portfolio and rules engine
      await client.query(
        `INSERT INTO public.supplier_profiles (
          supplier_id, profile_name, guidelines, processing_config, 
          quality_standards, compliance_rules, is_active, created_at, updated_at
        ) VALUES (
          $1, 'default', 
          '{"inventory_management": {"auto_approve": false, "validation_required": true}, "pricing": {"currency": "' || $2 || '", "tax_inclusive": false}}'::jsonb,
          '{"upload_validation": {"required_fields": ["sku", "name", "price"], "price_range": {"min": 0, "max": 100000}}, "transformation_rules": {"auto_format": true}}'::jsonb,
          '{"quality_checks": {"duplicate_detection": true, "price_validation": true, "data_completeness": 0.8}, "approval_workflow": {"tier_1_required": true, "tier_2_required": false}}'::jsonb,
          '{"business_rules": {"minimum_order_value": 100, "payment_terms": "' || $3 || '", "delivery_timeframe": "7-14 days"}}'::jsonb,
          true, NOW(), NOW()
        ) ON CONFLICT (supplier_id, profile_name) DO NOTHING`,
        [newSupplierId, businessInfo.currency || 'ZAR', businessInfo.paymentTerms || 'Net 30']
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
      // Check if public.suppliers is a view or table
      const tableTypeCheck = await client.query(`
        SELECT table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'suppliers'
      `)
      
      const isView = tableTypeCheck.rows.length > 0 && tableTypeCheck.rows[0].table_type === 'VIEW'
      
      // Determine which table to update and get its columns
      const tableSchema = isView ? 'core' : 'public'
      const tableName = isView ? 'supplier' : 'suppliers'
      const idColumn = isView ? 'supplier_id' : 'id'
      
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = $1 
          AND table_name = $2
      `, [tableSchema, tableName])
      const existingColumns = new Set(columnCheck.rows.map((r: unknown) => r.column_name))

      const updateFields: string[] = []
      const params: unknown[] = []
      let paramIndex = 1

      const updateBusinessInfo = data.businessInfo

      if (data.name !== undefined && existingColumns.has('name')) {
        updateFields.push(`name = $${paramIndex++}`)
        params.push(data.name)
      }
      if (data.code !== undefined && existingColumns.has('code')) {
        updateFields.push(`code = $${paramIndex++}`)
        params.push(data.code)
      }
      if (updateBusinessInfo?.legalName !== undefined && existingColumns.has('legal_name')) {
        updateFields.push(`legal_name = $${paramIndex++}`)
        params.push(updateBusinessInfo.legalName)
      }
      if (updateBusinessInfo?.website !== undefined && existingColumns.has('website')) {
        updateFields.push(`website = $${paramIndex++}`)
        params.push(updateBusinessInfo.website)
      }
      if (updateBusinessInfo?.industry !== undefined && existingColumns.has('industry')) {
        updateFields.push(`industry = $${paramIndex++}`)
        params.push(updateBusinessInfo.industry)
      }
      if (updateBusinessInfo?.taxId !== undefined) {
        if (existingColumns.has('tax_id')) {
          updateFields.push(`tax_id = $${paramIndex++}`)
          params.push(updateBusinessInfo.taxId)
        } else if (existingColumns.has('tax_number')) {
          updateFields.push(`tax_number = $${paramIndex++}`)
          params.push(updateBusinessInfo.taxId)
        }
      }
      if (updateBusinessInfo?.registrationNumber !== undefined && existingColumns.has('registration_number')) {
        updateFields.push(`registration_number = $${paramIndex++}`)
        params.push(updateBusinessInfo.registrationNumber)
      }
      if (updateBusinessInfo?.foundedYear !== undefined && existingColumns.has('founded_year')) {
        updateFields.push(`founded_year = $${paramIndex++}`)
        params.push(updateBusinessInfo.foundedYear)
      }
      if (updateBusinessInfo?.employeeCount !== undefined && existingColumns.has('employee_count')) {
        updateFields.push(`employee_count = $${paramIndex++}`)
        params.push(updateBusinessInfo.employeeCount)
      }
      if (updateBusinessInfo?.annualRevenue !== undefined && existingColumns.has('annual_revenue')) {
        updateFields.push(`annual_revenue = $${paramIndex++}`)
        params.push(updateBusinessInfo.annualRevenue)
      }
      if (updateBusinessInfo?.currency !== undefined) {
        if (existingColumns.has('currency')) {
          updateFields.push(`currency = $${paramIndex++}`)
          params.push(updateBusinessInfo.currency)
        } else if (existingColumns.has('default_currency')) {
          updateFields.push(`default_currency = $${paramIndex++}`)
          params.push(updateBusinessInfo.currency)
        }
      }
      if (data.status !== undefined) {
        if (existingColumns.has('status')) {
          updateFields.push(`status = $${paramIndex++}`)
          params.push(data.status)
        } else if (existingColumns.has('active')) {
          // Map status string to active boolean
          updateFields.push(`active = $${paramIndex++}`)
          params.push(data.status === 'active')
        }
      }
      if (data.tier !== undefined && existingColumns.has('tier')) {
        updateFields.push(`tier = $${paramIndex++}`)
        params.push(data.tier)
      }
      if (data.category !== undefined && existingColumns.has('category')) {
        updateFields.push(`category = $${paramIndex++}`)
        params.push(data.category)
      }
      if (data.subcategory !== undefined && existingColumns.has('subcategory')) {
        updateFields.push(`subcategory = $${paramIndex++}`)
        params.push(data.subcategory)
      }
      if (data.tags !== undefined && existingColumns.has('tags')) {
        updateFields.push(`tags = $${paramIndex++}`)
        params.push(data.tags)
      }
      if (data.brands !== undefined && existingColumns.has('brands')) {
        updateFields.push(`brands = $${paramIndex++}`)
        params.push(data.brands)
      }

      // If updating core.supplier, store all business info in contact_info JSONB
      if (isView && updateBusinessInfo && existingColumns.has('contact_info')) {
        // Get existing contact_info to merge with new data
        const existingData = await client.query(
          `SELECT contact_info FROM core.supplier WHERE CAST(supplier_id AS TEXT) = $1`,
          [id]
        )
        const existingContactInfo = existingData.rows[0]?.contact_info || {}
        
        // Build updated contact_info with all business fields
        const updatedContactInfo = {
          ...existingContactInfo,
          legalName: updateBusinessInfo.legalName ?? existingContactInfo.legalName,
          tradingName: updateBusinessInfo.tradingName ?? existingContactInfo.tradingName,
          website: updateBusinessInfo.website ?? existingContactInfo.website,
          industry: updateBusinessInfo.industry ?? existingContactInfo.industry,
          registrationNumber: updateBusinessInfo.registrationNumber ?? existingContactInfo.registrationNumber,
          foundedYear: updateBusinessInfo.foundedYear ?? existingContactInfo.foundedYear,
          employeeCount: updateBusinessInfo.employeeCount ?? existingContactInfo.employeeCount,
          annualRevenue: updateBusinessInfo.annualRevenue ?? existingContactInfo.annualRevenue,
          notes: data.notes ?? existingContactInfo.notes,
          category: data.category ?? existingContactInfo.category,
          subcategory: data.subcategory ?? existingContactInfo.subcategory,
          tags: data.tags ?? existingContactInfo.tags,
          brands: data.brands ?? existingContactInfo.brands,
          tier: data.tier ?? existingContactInfo.tier,
        }
        
        updateFields.push(`contact_info = $${paramIndex++}`)
        params.push(JSON.stringify(updatedContactInfo))
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`)
        params.push(id)
        await client.query(`UPDATE ${tableSchema}.${tableName} SET ${updateFields.join(', ')} WHERE CAST(${idColumn} AS TEXT) = $${paramIndex}`, params)
      }

      if (data.contacts) {
        await client.query('DELETE FROM supplier_contacts WHERE CAST(supplier_id AS TEXT) = $1', [id])
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
        await client.query('DELETE FROM supplier_addresses WHERE CAST(supplier_id AS TEXT) = $1', [id])
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
      // Delete all related data first (CASCADE would handle this, but being explicit)
      await client.query('DELETE FROM supplier_performance WHERE CAST(supplier_id AS TEXT) = $1', [id])
      await client.query('DELETE FROM supplier_contacts WHERE CAST(supplier_id AS TEXT) = $1', [id])
      await client.query('DELETE FROM supplier_addresses WHERE CAST(supplier_id AS TEXT) = $1', [id])
      // Finally delete the supplier itself
      const result = await client.query('DELETE FROM public.suppliers WHERE CAST(id AS TEXT) = $1', [id])
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
        INSERT INTO public.suppliers (
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

      const allContacts: unknown[] = []
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

      const allAddresses: unknown[] = []
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
      FROM public.suppliers s
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

  async getPerformanceData(supplierId: string): Promise<SupplierPerformanceSnapshot | null> {
    const result = await query('SELECT * FROM supplier_performance WHERE supplier_id = $1', [supplierId])
    const row = result.rows[0] as (SupplierPerformanceSnapshot & { total_orders?: number }) | undefined
    if (!row) {
      return null
    }

    const totalOrders =
      typeof row.totalOrders === 'number'
        ? row.totalOrders
        : typeof row.total_orders === 'number'
          ? row.total_orders
          : undefined

    return {
      ...row,
      ...(totalOrders !== undefined ? { totalOrders } : {})
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
      tier: [supplier.tier],
      limit: 5
    }

    if (supplier.category) {
      filters.category = [supplier.category]
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

  private buildFilterQuery(filters: SupplierFilters): { query: string, countQuery: string, params: unknown[] } {
    // Query from core.supplier directly since public.suppliers view doesn't have all columns
    let query = `
      SELECT
        s.supplier_id::text as id,
        s.name,
        s.code,
        CASE WHEN s.active THEN 'active' ELSE 'inactive' END as status,
        COALESCE(s.contact_info->>'tier', 'approved') as tier,
        COALESCE(s.contact_info->>'category', NULL) as category,
        COALESCE(s.contact_info->>'subcategory', NULL) as subcategory,
        COALESCE((s.contact_info->>'tags')::jsonb, '[]'::jsonb) as tags,
        s.contact_info->>'legalName' as legal_name,
        s.contact_info->>'website' as website,
        s.contact_info->>'industry' as industry,
        s.contact_info->>'taxId' as tax_id,
        s.contact_info->>'registrationNumber' as registration_number,
        (s.contact_info->>'foundedYear')::integer as founded_year,
        (s.contact_info->>'employeeCount')::integer as employee_count,
        (s.contact_info->>'annualRevenue')::numeric as annual_revenue,
        COALESCE(s.default_currency, 'ZAR') as currency,
        s.created_at,
        s.updated_at,
        json_agg(DISTINCT sc.*) FILTER (WHERE sc.id IS NOT NULL) as contacts,
        json_agg(DISTINCT sa.*) FILTER (WHERE sa.id IS NOT NULL) as addresses,
        json_agg(DISTINCT sp.*) FILTER (WHERE sp.id IS NOT NULL) as performance_data
      FROM core.supplier s
      LEFT JOIN supplier_contacts sc ON s.supplier_id = sc.supplier_id AND sc.is_active = true
      LEFT JOIN supplier_addresses sa ON s.supplier_id = sa.supplier_id AND sa.is_active = true
      LEFT JOIN supplier_performance sp ON s.supplier_id = sp.supplier_id
      WHERE 1=1
    `

    let countQuery = `
      SELECT COUNT(DISTINCT s.supplier_id) as count
      FROM core.supplier s
      LEFT JOIN supplier_contacts sc ON s.supplier_id = sc.supplier_id AND sc.is_active = true
      LEFT JOIN supplier_addresses sa ON s.supplier_id = sa.supplier_id AND sa.is_active = true
      WHERE 1=1
    `

    const params: unknown[] = []
    let paramIndex = 1

    if (filters.search) {
      const searchCondition = ` AND (s.name ILIKE $${paramIndex} OR s.code ILIKE $${paramIndex} OR s.contact_info->>'legalName' ILIKE $${paramIndex})`
      query += searchCondition
      countQuery += searchCondition
      params.push(`%${filters.search}%`)
      paramIndex++
    }

    // Status filter - use active boolean
    if (filters.status && filters.status.length > 0) {
      const hasActive = filters.status.includes('active')
      const hasInactive = filters.status.includes('inactive')
      if (hasActive && !hasInactive) {
        const statusCondition = ` AND s.active = true`;
        query += statusCondition;
        countQuery += statusCondition;
      } else if (hasInactive && !hasActive) {
        const statusCondition = ` AND s.active = false`;
        query += statusCondition;
        countQuery += statusCondition;
      }
      // If both, no filter (show all)
    } else {
      // Default: only active suppliers
      query += ` AND s.active = true`;
      countQuery += ` AND s.active = true`;
    }
    
    if (filters.tier && filters.tier.length > 0) {
      const tierCondition = ` AND s.contact_info->>'tier' = ANY($${paramIndex}::text[])`;
      query += tierCondition;
      countQuery += tierCondition;
      params.push(filters.tier);
      paramIndex++;
    }
    if (filters.category && filters.category.length > 0) {
      const categoryCondition = ` AND s.contact_info->>'category' = ANY($${paramIndex}::text[])`;
      query += categoryCondition;
      countQuery += categoryCondition;
      params.push(filters.category);
      paramIndex++;
    }

    query += ` GROUP BY
      s.supplier_id, s.name, s.code, s.active, s.contact_info, s.default_currency,
      s.created_at, s.updated_at
    ORDER BY s.name ASC`

    // Add pagination
    const limit = filters.limit || 50
    const offset = ((filters.page || 1) - 1) * limit

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    return { query, countQuery, params }
  }

  private mapRowToSupplier(row: unknown): Supplier {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      status: row.status,
      tier: row.tier || 'approved',
      orgId: row.org_id ? String(row.org_id) : undefined,
      category: row.category,
      subcategory: row.subcategory,
      categories: row.categories ?? (row.category ? [row.category] : []),
      tags: row.tags || [],
      brands: row.brands || [],

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

      contacts: (row.contacts || []).map((c: unknown) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        title: c.title,
        email: c.email,
        phone: c.phone,
        mobile: c.mobile,
        department: c.department,
        isPrimary: c.isPrimary ?? c.is_primary ?? false,
        isActive: c.isActive ?? c.is_active !== false
      })),
      addresses: (row.addresses || []).map((a: unknown) => ({
        id: a.id,
        type: a.type,
        name: a.name,
        addressLine1: a.addressLine1 ?? a.address_line1,
        addressLine2: a.addressLine2 ?? a.address_line2,
        city: a.city,
        state: a.state,
        postalCode: a.postalCode ?? a.postal_code,
        country: a.country,
        isPrimary: a.isPrimary ?? a.is_primary ?? false,
        isActive: a.isActive ?? a.is_active !== false
      })),

      performance: this.mapPerformanceData(row.performance_data?.[0] || {}),

      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      notes: row.notes
    }
  }

  private mapPerformanceData(data: unknown): unknown {
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
