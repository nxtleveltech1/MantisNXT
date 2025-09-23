/**
 * Supplier Service - Core Business Logic Layer
 * Implements business rules and orchestrates repository operations
 */

import type {
  SupplierRepository
} from '../core/SupplierRepository'
import type {
  Supplier,
  CreateSupplierData,
  UpdateSupplierData,
  SupplierFilters,
  SupplierSearchResult,
  SupplierMetrics,
  ValidationResult,
  ValidationError
} from '../types/SupplierDomain'

export class SupplierService {
  constructor(private repository: SupplierRepository) {}

  // Core CRUD operations with business logic
  async getSuppliers(filters: SupplierFilters): Promise<SupplierSearchResult> {
    // Apply default filters if none provided
    const enhancedFilters = {
      page: 1,
      limit: 50,
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      ...filters
    }

    return this.repository.findMany(enhancedFilters)
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    if (!id || id.trim() === '') {
      throw new Error('Supplier ID is required')
    }

    return this.repository.findById(id)
  }

  async createSupplier(data: CreateSupplierData): Promise<Supplier> {
    // Validate business rules
    const validation = await this.validateSupplierData(data)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    // Check for duplicate code
    await this.checkDuplicateCode(data.code)

    // Ensure primary contact and address
    this.ensurePrimaryContactAndAddress(data)

    return this.repository.create(data)
  }

  async updateSupplier(id: string, data: UpdateSupplierData): Promise<Supplier> {
    if (!id) {
      throw new Error('Supplier ID is required')
    }

    // Check if supplier exists
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new Error('Supplier not found')
    }

    // Validate business rules for update
    const validation = await this.validateSupplierUpdate(id, data)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    return this.repository.update(id, data)
  }

  async deleteSupplier(id: string): Promise<void> {
    if (!id) {
      throw new Error('Supplier ID is required')
    }

    // Check if supplier exists
    const existing = await this.repository.findById(id)
    if (!existing) {
      throw new Error('Supplier not found')
    }

    // Check if deletion is allowed
    const canDelete = await this.canDeleteSupplier(id)
    if (!canDelete.allowed) {
      throw new Error(`Cannot delete supplier: ${canDelete.reason}`)
    }

    return this.repository.delete(id)
  }

  // Batch operations
  async createManySuppliers(data: CreateSupplierData[]): Promise<Supplier[]> {
    // Validate all suppliers first
    for (const supplierData of data) {
      const validation = await this.validateSupplierData(supplierData)
      if (!validation.isValid) {
        throw new Error(`Validation failed for supplier ${supplierData.name}: ${validation.errors.map(e => e.message).join(', ')}`)
      }
    }

    // Check for duplicate codes within the batch
    const codes = data.map(s => s.code)
    const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index)
    if (duplicates.length > 0) {
      throw new Error(`Duplicate codes in batch: ${duplicates.join(', ')}`)
    }

    return this.repository.createMany(data)
  }

  async updateManySuppliers(updates: Array<{id: string, data: UpdateSupplierData}>): Promise<Supplier[]> {
    // Validate all updates first
    for (const update of updates) {
      const validation = await this.validateSupplierUpdate(update.id, update.data)
      if (!validation.isValid) {
        throw new Error(`Validation failed for supplier ${update.id}: ${validation.errors.map(e => e.message).join(', ')}`)
      }
    }

    return this.repository.updateMany(updates)
  }

  async deleteManySuppliers(ids: string[]): Promise<void> {
    // Check if all suppliers can be deleted
    for (const id of ids) {
      const canDelete = await this.canDeleteSupplier(id)
      if (!canDelete.allowed) {
        throw new Error(`Cannot delete supplier ${id}: ${canDelete.reason}`)
      }
    }

    return this.repository.deleteMany(ids)
  }

  // Business logic and validation
  async validateSupplierData(data: CreateSupplierData): Promise<ValidationResult> {
    const errors: ValidationError[] = []

    // Validate supplier name uniqueness
    if (data.name) {
      const existing = await this.findSupplierByName(data.name)
      if (existing) {
        errors.push({
          field: 'name',
          message: 'Supplier name already exists',
          code: 'DUPLICATE_NAME'
        })
      }
    }

    // Validate supplier code format and uniqueness
    if (data.code) {
      if (!this.isValidSupplierCode(data.code)) {
        errors.push({
          field: 'code',
          message: 'Supplier code must be uppercase alphanumeric, 3-10 characters',
          code: 'INVALID_CODE_FORMAT'
        })
      }
    }

    // Validate primary contact requirement
    const primaryContacts = data.contacts.filter(c => c.isPrimary)
    if (primaryContacts.length === 0) {
      errors.push({
        field: 'contacts',
        message: 'At least one primary contact is required',
        code: 'NO_PRIMARY_CONTACT'
      })
    } else if (primaryContacts.length > 1) {
      errors.push({
        field: 'contacts',
        message: 'Only one primary contact is allowed',
        code: 'MULTIPLE_PRIMARY_CONTACTS'
      })
    }

    // Validate primary address requirement
    const primaryAddresses = data.addresses.filter(a => a.isPrimary)
    if (primaryAddresses.length === 0) {
      errors.push({
        field: 'addresses',
        message: 'At least one primary address is required',
        code: 'NO_PRIMARY_ADDRESS'
      })
    } else if (primaryAddresses.length > 1) {
      errors.push({
        field: 'addresses',
        message: 'Only one primary address is allowed',
        code: 'MULTIPLE_PRIMARY_ADDRESSES'
      })
    }

    // Validate email uniqueness across contacts
    const emails = data.contacts.map(c => c.email)
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index)
    if (duplicateEmails.length > 0) {
      errors.push({
        field: 'contacts',
        message: `Duplicate email addresses: ${duplicateEmails.join(', ')}`,
        code: 'DUPLICATE_CONTACT_EMAILS'
      })
    }

    // Validate business info
    if (data.businessInfo.foundedYear && data.businessInfo.foundedYear > new Date().getFullYear()) {
      errors.push({
        field: 'businessInfo.foundedYear',
        message: 'Founded year cannot be in the future',
        code: 'INVALID_FOUNDED_YEAR'
      })
    }

    // Validate tax ID format (basic check)
    if (data.businessInfo.taxId && !this.isValidTaxId(data.businessInfo.taxId)) {
      errors.push({
        field: 'businessInfo.taxId',
        message: 'Invalid tax ID format',
        code: 'INVALID_TAX_ID'
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  async validateSupplierUpdate(id: string, data: UpdateSupplierData): Promise<ValidationResult> {
    const errors: ValidationError[] = []

    // Get existing supplier for comparison
    const existing = await this.repository.findById(id)
    if (!existing) {
      errors.push({
        field: 'id',
        message: 'Supplier not found',
        code: 'SUPPLIER_NOT_FOUND'
      })
      return { isValid: false, errors }
    }

    // Validate name uniqueness if changed
    if (data.name && data.name !== existing.name) {
      const existingByName = await this.findSupplierByName(data.name)
      if (existingByName && existingByName.id !== id) {
        errors.push({
          field: 'name',
          message: 'Supplier name already exists',
          code: 'DUPLICATE_NAME'
        })
      }
    }

    // Validate contacts if provided
    if (data.contacts) {
      const primaryContacts = data.contacts.filter(c => c.isPrimary)
      if (primaryContacts.length === 0) {
        errors.push({
          field: 'contacts',
          message: 'At least one primary contact is required',
          code: 'NO_PRIMARY_CONTACT'
        })
      } else if (primaryContacts.length > 1) {
        errors.push({
          field: 'contacts',
          message: 'Only one primary contact is allowed',
          code: 'MULTIPLE_PRIMARY_CONTACTS'
        })
      }

      // Check for duplicate emails within contacts
      const emails = data.contacts.map(c => c.email)
      const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index)
      if (duplicateEmails.length > 0) {
        errors.push({
          field: 'contacts',
          message: `Duplicate email addresses: ${duplicateEmails.join(', ')}`,
          code: 'DUPLICATE_CONTACT_EMAILS'
        })
      }
    }

    // Validate addresses if provided
    if (data.addresses) {
      const primaryAddresses = data.addresses.filter(a => a.isPrimary)
      if (primaryAddresses.length === 0) {
        errors.push({
          field: 'addresses',
          message: 'At least one primary address is required',
          code: 'NO_PRIMARY_ADDRESS'
        })
      } else if (primaryAddresses.length > 1) {
        errors.push({
          field: 'addresses',
          message: 'Only one primary address is allowed',
          code: 'MULTIPLE_PRIMARY_ADDRESSES'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  async canDeleteSupplier(id: string): Promise<{allowed: boolean, reason?: string}> {
    const supplier = await this.repository.findById(id)
    if (!supplier) {
      return { allowed: false, reason: 'Supplier not found' }
    }

    // Check if supplier has active orders (would need purchase order integration)
    // For now, we'll implement basic checks

    // Don't allow deletion of strategic suppliers
    if (supplier.tier === 'strategic') {
      return { allowed: false, reason: 'Cannot delete strategic suppliers' }
    }

    // Don't allow deletion if supplier has performance data
    try {
      const performanceData = await this.repository.getPerformanceData(id)
      if (performanceData && performanceData.totalOrders > 0) {
        return { allowed: false, reason: 'Supplier has order history and cannot be deleted' }
      }
    } catch (error) {
      // If we can't check performance data, allow deletion
      console.warn('Could not check performance data for supplier deletion:', error)
    }

    return { allowed: true }
  }

  // Analytics and metrics
  async getSupplierMetrics(): Promise<SupplierMetrics> {
    return this.repository.getMetrics()
  }

  async getSupplierPerformance(id: string): Promise<any> {
    const supplier = await this.repository.findById(id)
    if (!supplier) {
      throw new Error('Supplier not found')
    }

    return this.repository.getPerformanceData(id)
  }

  // Search and discovery
  async searchSuppliers(query: string, filters?: SupplierFilters): Promise<SupplierSearchResult> {
    if (!query || query.trim() === '') {
      return this.getSuppliers(filters || {})
    }

    return this.repository.search(query, filters)
  }

  async findSimilarSuppliers(id: string): Promise<Supplier[]> {
    return this.repository.findSimilar(id)
  }

  // Helper methods
  private async findSupplierByName(name: string): Promise<Supplier | null> {
    const result = await this.repository.findMany({
      search: name,
      limit: 1
    })

    return result.suppliers.find(s => s.name.toLowerCase() === name.toLowerCase()) || null
  }

  private async checkDuplicateCode(code: string): Promise<void> {
    const result = await this.repository.findMany({
      search: code,
      limit: 1
    })

    const existing = result.suppliers.find(s => s.code.toLowerCase() === code.toLowerCase())
    if (existing) {
      throw new Error(`Supplier code '${code}' already exists`)
    }
  }

  private isValidSupplierCode(code: string): boolean {
    // Supplier code must be 3-10 uppercase alphanumeric characters
    return /^[A-Z0-9]{3,10}$/.test(code)
  }

  private isValidTaxId(taxId: string): boolean {
    // Basic validation - could be enhanced for specific country formats
    return taxId.length >= 5 && /^[A-Z0-9\-\/]+$/i.test(taxId)
  }

  private ensurePrimaryContactAndAddress(data: CreateSupplierData): void {
    // Ensure exactly one primary contact
    const primaryContacts = data.contacts.filter(c => c.isPrimary)
    if (primaryContacts.length === 0) {
      data.contacts[0].isPrimary = true
    } else if (primaryContacts.length > 1) {
      // Keep only the first primary contact
      data.contacts.forEach((contact, index) => {
        contact.isPrimary = index === data.contacts.findIndex(c => c.isPrimary)
      })
    }

    // Ensure exactly one primary address
    const primaryAddresses = data.addresses.filter(a => a.isPrimary)
    if (primaryAddresses.length === 0) {
      data.addresses[0].isPrimary = true
    } else if (primaryAddresses.length > 1) {
      // Keep only the first primary address
      data.addresses.forEach((address, index) => {
        address.isPrimary = index === data.addresses.findIndex(a => a.isPrimary)
      })
    }
  }
}