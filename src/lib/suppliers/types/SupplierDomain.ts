/**
 * Unified Supplier Domain Types
 * Single source of truth for all supplier-related types
 */

// Core Supplier Entity
export interface Supplier {
  id: string
  name: string
  code: string
  status: SupplierStatus
  tier: SupplierTier
  category: string
  subcategory?: string
  tags: string[]

  // Business Information
  businessInfo: SupplierBusinessInfo

  // Related Entities
  contacts: SupplierContact[]
  addresses: SupplierAddress[]
  performance: SupplierPerformance

  // Metadata
  createdAt: Date
  updatedAt: Date
  notes?: string
}

// Enums and Union Types
export type SupplierStatus = 'active' | 'inactive' | 'pending' | 'suspended'
export type SupplierTier = 'strategic' | 'preferred' | 'approved' | 'conditional'
export type ContactType = 'primary' | 'billing' | 'technical' | 'sales' | 'support'
export type AddressType = 'headquarters' | 'billing' | 'shipping' | 'warehouse' | 'manufacturing'

// Business Information
export interface SupplierBusinessInfo {
  legalName: string
  tradingName?: string
  taxId: string
  registrationNumber: string
  website?: string
  foundedYear?: number
  employeeCount?: number
  annualRevenue?: number
  currency: string
}

// Contact Information
export interface SupplierContact {
  id: string
  type: ContactType
  name: string
  title: string
  email: string
  phone: string
  mobile?: string
  department?: string
  isPrimary: boolean
  isActive: boolean
}

// Address Information
export interface SupplierAddress {
  id: string
  type: AddressType
  name?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string
  isPrimary: boolean
  isActive: boolean
}

// Performance Metrics
export interface SupplierPerformance {
  overallRating: number // 1-5
  qualityRating: number
  deliveryRating: number
  serviceRating: number
  priceRating: number

  metrics: {
    onTimeDeliveryRate: number // percentage
    qualityAcceptanceRate: number // percentage
    responseTime: number // hours
    defectRate: number // percentage
    leadTimeVariance: number // percentage
  }
}

// CRUD Operation Types
export interface CreateSupplierData {
  name: string
  code: string
  status: SupplierStatus
  tier: SupplierTier
  category: string
  subcategory?: string
  tags: string[]

  businessInfo: Omit<SupplierBusinessInfo, 'tradingName'>
  contacts: Omit<SupplierContact, 'id'>[]
  addresses: Omit<SupplierAddress, 'id'>[]

  notes?: string
}

export interface UpdateSupplierData {
  name?: string
  status?: SupplierStatus
  tier?: SupplierTier
  category?: string
  subcategory?: string
  tags?: string[]

  businessInfo?: Partial<SupplierBusinessInfo>
  contacts?: Omit<SupplierContact, 'id'>[]
  addresses?: Omit<SupplierAddress, 'id'>[]

  notes?: string
}

// Search and Filtering
export interface SupplierFilters {
  search?: string
  status?: SupplierStatus[]
  tier?: SupplierTier[]
  category?: string[]
  tags?: string[]

  // Location filtering
  country?: string[]
  state?: string[]
  city?: string[]

  // Performance filtering
  minRating?: number
  maxRating?: number

  // Date filtering
  createdAfter?: Date
  createdBefore?: Date

  // Pagination
  page?: number
  limit?: number

  // Sorting
  sortBy?: 'name' | 'code' | 'status' | 'tier' | 'rating' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface SupplierSearchResult {
  suppliers: Supplier[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Metrics and Analytics
export interface SupplierMetrics {
  totalSuppliers: number
  activeSuppliers: number
  pendingSuppliers: number
  strategicSuppliers: number
  averageRating: number
  averageDeliveryRate: number
}

// Export Types
export interface ExportRequest {
  filters: SupplierFilters
  format: 'csv' | 'excel' | 'pdf' | 'json'
  template?: string
  includePerformance?: boolean
  includeContacts?: boolean
  includeAddresses?: boolean
}

export interface ExportResult {
  filename: string
  data: Buffer
  mimeType: string
  size: number
  recordCount: number
}

// API Response Types
export interface APIResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
  timestamp: Date
}

export interface PaginatedAPIResponse<T> extends APIResponse<T> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Validation Types
export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// AI Integration Types
export interface AISupplierDiscovery {
  query: string
  industry?: string
  location?: string
  size?: 'small' | 'medium' | 'large'
  certifications?: string[]
}

export interface AISupplierMatch {
  supplier: Supplier
  confidence: number
  reasoning: string[]
  dataSource: string
}

export interface AIEnrichmentData {
  supplierId: string
  additionalInfo: {
    financialHealth?: string
    riskAssessment?: string
    marketPosition?: string
    competitors?: string[]
    sustainability?: string
  }
  lastUpdated: Date
}

// Event Types for Real-time Updates
export interface SupplierEvent {
  type: 'created' | 'updated' | 'deleted' | 'status_changed' | 'performance_updated'
  supplierId: string
  timestamp: Date
  userId?: string
  changes?: Record<string, any>
}

// Audit and Compliance
export interface SupplierAuditLog {
  id: string
  supplierId: string
  action: string
  previousValues?: Record<string, any>
  newValues?: Record<string, any>
  userId: string
  timestamp: Date
  ip?: string
  userAgent?: string
}

// Integration Types
export interface ExternalSupplierData {
  source: 'duns' | 'companies_house' | 'sars' | 'custom'
  externalId: string
  data: Record<string, any>
  lastSync: Date
  isActive: boolean
}