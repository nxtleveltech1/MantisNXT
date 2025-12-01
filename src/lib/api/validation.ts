/**
 * Enhanced validation schemas for API endpoints
 * Extends existing validation schemas with additional fields and stronger validation
 */

import { z } from 'zod';

// Common validation patterns
export const IdSchema = z.string().min(1, 'ID is required');
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(1000).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const BulkOperationSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, 'At least one ID is required')
    .max(1000, 'Maximum 1000 items allowed'),
  operation: z.enum(['delete', 'update', 'activate', 'deactivate']),
  data: z.record(z.string(), z.any()).optional(),
});

// Enhanced Inventory Schemas
export const EnhancedInventoryItemSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be less than 50 characters')
    .regex(
      /^[A-Z0-9-_]+$/,
      'SKU must contain only uppercase letters, numbers, hyphens, and underscores'
    ),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100, 'Category must be less than 100 characters'),
  subcategory: z.string().max(100, 'Subcategory must be less than 100 characters').optional(),

  // Stock information
  currentStock: z
    .number()
    .min(0, 'Current stock must be non-negative')
    .max(999999999, 'Current stock too large'),
  reservedStock: z.number().min(0, 'Reserved stock must be non-negative').default(0),
  reorderPoint: z.number().min(0, 'Reorder point must be non-negative'),
  maxStock: z.number().min(0, 'Max stock must be non-negative'),
  minStock: z.number().min(0, 'Min stock must be non-negative'),

  // Pricing information
  unitCost: z
    .number()
    .min(0, 'Unit cost must be non-negative')
    .max(999999999, 'Unit cost too large'),
  unitPrice: z
    .number()
    .min(0, 'Unit price must be non-negative')
    .max(999999999, 'Unit price too large'),
  currency: z
    .string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
    .default('USD'),

  // Physical attributes
  unit: z
    .string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must be less than 20 characters')
    .default('pcs'),
  weight: z.number().min(0, 'Weight must be non-negative').optional(),
  dimensions: z
    .object({
      length: z.number().min(0).optional(),
      width: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
      unit: z.enum(['mm', 'cm', 'm', 'in', 'ft']).default('cm'),
    })
    .optional(),

  // Supplier information
  supplierId: z.string().optional(),
  supplierName: z.string().max(200).optional(),
  supplierSku: z.string().max(100).optional(),

  // Location and tracking
  primaryLocationId: z.string().min(1, 'Primary location is required'),
  locations: z
    .array(
      z.object({
        id: z.string(),
        warehouseId: z.string(),
        warehouseName: z.string(),
        zone: z.string().optional(),
        aisle: z.string().optional(),
        shelf: z.string().optional(),
        bin: z.string().optional(),
        locationCode: z.string().optional(),
        quantity: z.number().min(0),
        reservedQuantity: z.number().min(0).default(0),
        isDefault: z.boolean().default(false),
        isPrimary: z.boolean().default(false),
      })
    )
    .default([]),

  // Batch and lot tracking
  batchTracking: z.boolean().default(false),
  serialTracking: z.boolean().default(false),
  expirationTracking: z.boolean().default(false),
  lots: z
    .array(
      z.object({
        id: z.string(),
        lotNumber: z.string(),
        quantity: z.number().min(0),
        manufactureDate: z.string().datetime().optional(),
        expirationDate: z.string().datetime().optional(),
        notes: z.string().optional(),
      })
    )
    .default([]),

  // Quality and compliance
  qualityGrade: z.enum(['A', 'B', 'C', 'Rejected']).optional(),
  certifications: z.array(z.string()).default([]),
  hazardousClassification: z.string().optional(),
  storageRequirements: z.string().optional(),

  // Metadata
  tags: z.array(z.string()).default([]),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
  customFields: z.record(z.string(), z.any()).default({}),

  // Status and audit
  status: z
    .enum(['active', 'inactive', 'discontinued', 'out_of_stock', 'low_stock'])
    .default('active'),
  isActive: z.boolean().default(true),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  lastStockUpdate: z.string().datetime().optional(),
  lastOrderDate: z.string().datetime().optional(),
  nextDeliveryDate: z.string().datetime().optional(),
});

export const CreateInventoryItemSchema = EnhancedInventoryItemSchema.omit({
  status: true,
  createdBy: true,
  updatedBy: true,
  lastStockUpdate: true,
  reservedStock: true,
});

export const UpdateInventoryItemSchema = EnhancedInventoryItemSchema.partial().extend({
  id: IdSchema,
});

export const InventorySearchSchema = PaginationSchema.extend({
  query: z.string().optional(),
  category: z.array(z.string()).optional(),
  subcategory: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  warehouse: z.array(z.string()).optional(),
  supplier: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  lowStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
  hasLots: z.boolean().optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  stockMin: z.number().min(0).optional(),
  stockMax: z.number().min(0).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),
  sortBy: z
    .enum([
      'name',
      'sku',
      'category',
      'currentStock',
      'value',
      'lastStockUpdate',
      'status',
      'createdAt',
      'updatedAt',
    ])
    .optional(),
});

// Enhanced Supplier Schemas
export const EnhancedSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code must be less than 50 characters')
    .regex(
      /^[A-Z0-9-_]+$/,
      'Code must contain only uppercase letters, numbers, hyphens, and underscores'
    ),

  // Contact information
  email: z
    .string()
    .email('Valid email is required')
    .max(255, 'Email must be less than 255 characters'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 digits')
    .optional(),
  website: z
    .string()
    .url('Invalid website URL')
    .max(255, 'Website URL must be less than 255 characters')
    .optional(),

  // Business information
  taxId: z
    .string()
    .min(9, 'Tax ID must be at least 9 characters')
    .max(50, 'Tax ID must be less than 50 characters')
    .optional(),
  registrationNumber: z
    .string()
    .max(100, 'Registration number must be less than 100 characters')
    .optional(),
  vatNumber: z.string().max(50, 'VAT number must be less than 50 characters').optional(),

  // Address information
  address: z.object({
    street: z
      .string()
      .min(1, 'Street is required')
      .max(200, 'Street must be less than 200 characters'),
    city: z.string().min(1, 'City is required').max(100, 'City must be less than 100 characters'),
    state: z
      .string()
      .min(1, 'State is required')
      .max(100, 'State must be less than 100 characters'),
    postalCode: z
      .string()
      .min(1, 'Postal code is required')
      .max(20, 'Postal code must be less than 20 characters'),
    country: z
      .string()
      .min(1, 'Country is required')
      .max(100, 'Country must be less than 100 characters'),
  }),

  // Contacts
  contacts: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z
          .string()
          .min(1, 'Contact name is required')
          .max(100, 'Contact name must be less than 100 characters'),
        role: z
          .string()
          .min(1, 'Role is required')
          .max(100, 'Role must be less than 100 characters'),
        email: z
          .string()
          .email('Valid email is required')
          .max(255, 'Email must be less than 255 characters'),
        phone: z
          .string()
          .min(10, 'Phone number must be at least 10 digits')
          .max(20, 'Phone number must be less than 20 digits')
          .optional(),
        department: z.string().max(100).optional(),
        isPrimary: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
    )
    .min(1, 'At least one contact is required'),

  // Payment terms
  paymentTerms: z.object({
    method: z.enum(['cash', 'check', 'bank_transfer', 'credit_card', 'trade_credit']),
    termsDays: z
      .number()
      .min(0, 'Terms days must be non-negative')
      .max(365, 'Terms days cannot exceed 365'),
    discountPercent: z
      .number()
      .min(0, 'Discount percent must be non-negative')
      .max(100, 'Discount percent cannot exceed 100')
      .optional(),
    discountDays: z.number().min(0, 'Discount days must be non-negative').optional(),
    currency: z
      .string()
      .length(3, 'Currency must be 3 characters')
      .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
      .default('USD'),
  }),

  // Operational information
  leadTimeDays: z
    .number()
    .min(0, 'Lead time must be non-negative')
    .max(365, 'Lead time cannot exceed 365'),
  minimumOrderValue: z.number().min(0, 'Minimum order value must be non-negative').optional(),
  currency: z
    .string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
    .default('USD'),

  // Categories and classification
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  tier: z.enum(['strategic', 'preferred', 'approved', 'conditional']).optional(),

  // Performance tracking
  performance: z
    .object({
      onTimeDeliveryRate: z.number().min(0).max(100).default(0),
      qualityRating: z.number().min(0).max(5).default(0),
      responsiveness: z.number().min(0).max(5).default(0),
      overallRating: z.number().min(0).max(5).default(0),
      totalOrders: z.number().min(0).default(0),
      totalValue: z.number().min(0).default(0),
      averageOrderValue: z.number().min(0).default(0),
      lastOrderDate: z.string().datetime().optional(),
      defectRate: z.number().min(0).max(100).default(0),
      returnRate: z.number().min(0).max(100).default(0),
    })
    .optional(),

  // Compliance and certifications
  compliance: z
    .object({
      certifications: z.array(z.string()).default([]),
      lastAuditDate: z.string().datetime().optional(),
      nextAuditDate: z.string().datetime().optional(),
      complianceScore: z.number().min(0).max(100).default(0),
      riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
    })
    .optional(),

  // Metadata
  tags: z.array(z.string()).default([]),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
  customFields: z.record(z.string(), z.any()).default({}),

  // Status
  isActive: z.boolean().default(true),
  status: z.enum(['active', 'inactive', 'pending', 'suspended', 'blacklisted']).default('active'),

  // Audit fields
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

export const CreateSupplierSchema = EnhancedSupplierSchema.omit({
  performance: true,
  compliance: true,
  createdBy: true,
  updatedBy: true,
});

export const UpdateSupplierSchema = EnhancedSupplierSchema.partial().extend({
  id: IdSchema,
});

export const SupplierSearchSchema = PaginationSchema.extend({
  query: z.string().optional(),
  isActive: z.boolean().optional(),
  status: z.array(z.string()).optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  paymentMethod: z.array(z.string()).optional(),
  tier: z.array(z.string()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minLeadTime: z.number().min(0).optional(),
  maxLeadTime: z.number().min(0).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxRating: z.number().min(0).max(5).optional(),
  currency: z.string().optional(),
  hasContracts: z.boolean().optional(),
  lastOrderAfter: z.string().datetime().optional(),
  lastOrderBefore: z.string().datetime().optional(),
  sortBy: z
    .enum([
      'name',
      'code',
      'performance',
      'leadTime',
      'lastOrder',
      'rating',
      'totalValue',
      'createdAt',
      'updatedAt',
    ])
    .optional(),
});

// File upload schemas
export const FileUploadSchema = z.object({
  files: z.array(
    z.object({
      name: z.string(),
      size: z.number(),
      type: z.string(),
      data: z.any(), // File data would be processed separately
    })
  ),
  options: z
    .object({
      overwrite: z.boolean().default(false),
      validateSchema: z.boolean().default(true),
      skipDuplicates: z.boolean().default(false),
      batchSize: z.number().min(1).max(1000).default(100),
    })
    .optional(),
});

export const XlsxImportSchema = z.object({
  file: z.any(), // File object
  mapping: z.record(z.string(), z.string()), // Field mapping
  options: z
    .object({
      hasHeaders: z.boolean().default(true),
      skipEmptyRows: z.boolean().default(true),
      validateData: z.boolean().default(true),
      updateExisting: z.boolean().default(false),
      batchSize: z.number().min(1).max(1000).default(100),
      supplierFilter: z.string().optional(),
    })
    .optional(),
});

// Stock movement schemas
export const StockMovementSchema = z.object({
  inventoryItemId: z.string().min(1, 'Inventory item ID is required'),
  type: z.enum(['purchase', 'sale', 'adjustment', 'transfer', 'return', 'damage', 'count']),
  quantity: z.number().min(-999999999, 'Quantity too small').max(999999999, 'Quantity too large'),
  unitCost: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  referenceType: z
    .enum(['purchase_order', 'sales_order', 'transfer_order', 'adjustment', 'inventory_count'])
    .optional(),
  referenceId: z.string().optional(),
  lotId: z.string().optional(),
  notes: z.string().max(1000).optional(),
  performedBy: z.string().optional(),
});

export const BulkStockMovementSchema = z.object({
  movements: z.array(StockMovementSchema).min(1).max(1000),
  validateInventory: z.boolean().default(true),
  allowNegativeStock: z.boolean().default(false),
});

// Pricelist schemas
export const PricelistItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  supplierSku: z.string().optional(),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  minimumQuantity: z.number().min(1, 'Minimum quantity must be positive').optional(),
  maximumQuantity: z.number().optional(),
  leadTimeDays: z.number().min(0).optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const PricelistSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  name: z.string().min(1, 'Pricelist name is required'),
  description: z.string().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
  currency: z
    .string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
    .default('USD'),
  items: z.array(PricelistItemSchema).min(1, 'At least one item is required'),
  isActive: z.boolean().default(true),
  version: z.string().optional(),
  parentPricelistId: z.string().optional(),
});

// Analytics and reporting schemas
export const AnalyticsQuerySchema = z.object({
  metrics: z.array(
    z.enum([
      'inventory_value',
      'stock_levels',
      'turnover_rate',
      'supplier_performance',
      'category_distribution',
      'movement_trends',
      'cost_analysis',
      'demand_forecast',
    ])
  ),
  dimensions: z
    .array(z.enum(['time', 'category', 'supplier', 'warehouse', 'location', 'product', 'brand']))
    .optional(),
  filters: z
    .object({
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      categories: z.array(z.string()).optional(),
      suppliers: z.array(z.string()).optional(),
      warehouses: z.array(z.string()).optional(),
      products: z.array(z.string()).optional(),
    })
    .optional(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
  limit: z.number().min(1).max(10000).default(1000),
});

// Type exports
export type EnhancedInventoryItem = z.infer<typeof EnhancedInventoryItemSchema>;
export type CreateInventoryItem = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItem = z.infer<typeof UpdateInventoryItemSchema>;
export type InventorySearch = z.infer<typeof InventorySearchSchema>;

export type EnhancedSupplier = z.infer<typeof EnhancedSupplierSchema>;
export type CreateSupplier = z.infer<typeof CreateSupplierSchema>;
export type UpdateSupplier = z.infer<typeof UpdateSupplierSchema>;
export type SupplierSearch = z.infer<typeof SupplierSearchSchema>;

export type StockMovement = z.infer<typeof StockMovementSchema>;
export type BulkStockMovement = z.infer<typeof BulkStockMovementSchema>;

export type Pricelist = z.infer<typeof PricelistSchema>;
export type PricelistItem = z.infer<typeof PricelistItemSchema>;

export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;
export type XlsxImport = z.infer<typeof XlsxImportSchema>;
export type BulkOperation = z.infer<typeof BulkOperationSchema>;
