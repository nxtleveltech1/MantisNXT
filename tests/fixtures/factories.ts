import { faker } from '@faker-js/faker'

// Base factory interface
interface Factory<T> {
  build(overrides?: Partial<T>): T
  buildList(count: number, overrides?: Partial<T>): T[]
}

// Generic factory implementation
class BaseFactory<T> implements Factory<T> {
  constructor(private generator: (overrides?: Partial<T>) => T) {}

  build(overrides?: Partial<T>): T {
    return this.generator(overrides)
  }

  buildList(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.build(overrides))
  }
}

// Type definitions
export interface TestInventoryItem {
  id?: string
  sku: string
  name: string
  description?: string
  category: string
  subcategory?: string
  currentStock: number
  reservedStock?: number
  availableStock?: number
  reorderPoint: number
  maxStock: number
  minStock: number
  unitCost: number
  unitPrice: number
  currency?: string
  unit?: string
  status?: 'active' | 'inactive' | 'low_stock' | 'out_of_stock'
  supplierId?: string
  supplierName?: string
  supplierSku?: string
  primaryLocationId?: string
  batchTracking?: boolean
  tags?: string[]
  notes?: string
  organizationId?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface TestSupplier {
  id?: string
  name: string
  code: string
  contactEmail: string
  contactPhone: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  status?: 'active' | 'inactive'
  organizationId?: string
  terms?: Record<string, any>
  notes?: string
}

export interface TestWarehouse {
  id?: string
  name: string
  code: string
  address: string
  city: string
  state?: string
  country: string
  postalCode?: string
  status?: 'active' | 'inactive'
  organizationId?: string
  settings?: Record<string, any>
}

export interface TestLocation {
  id?: string
  warehouseId: string
  zone: string
  aisle: string
  shelf: string
  bin: string
  code?: string
  isPickable?: boolean
  capacityWeight?: number
  capacityVolume?: number
  status?: 'active' | 'inactive'
}

export interface TestOrganization {
  id?: string
  name: string
  slug: string
  domain?: string
  status?: 'active' | 'inactive' | 'suspended'
  tier?: 'free' | 'professional' | 'enterprise'
  settings?: Record<string, any>
}

export interface TestUser {
  id?: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'ops_manager' | 'ai_team' | 'cs_agent' | 'exec'
  organizationId: string
  status?: 'active' | 'inactive'
  settings?: Record<string, any>
}

export interface TestStockMovement {
  id?: string
  inventoryItemId: string
  type: 'inbound' | 'outbound' | 'adjustment' | 'transfer'
  quantity: number
  reason: string
  reference?: string
  notes?: string
  fromLocationId?: string
  toLocationId?: string
  userId?: string
  timestamp?: Date
}

export interface TestUploadFile {
  name: string
  type: string
  size: number
  content: Buffer | Uint8Array
}

// Factory implementations
export const InventoryItemFactory = new BaseFactory<TestInventoryItem>((overrides = {}) => {
  const baseStock = faker.number.int({ min: 0, max: 100 })
  const reservedStock = faker.number.int({ min: 0, max: Math.floor(baseStock * 0.3) })

  return {
    id: faker.string.uuid(),
    sku: faker.string.alphanumeric({ length: { min: 6, max: 12 } }).toUpperCase(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    category: faker.helpers.arrayElement(['Electronics', 'Office Supplies', 'Hardware', 'Software', 'Accessories']),
    subcategory: faker.helpers.arrayElement(['Laptops', 'Mice', 'Keyboards', 'Monitors', 'Cables']),
    currentStock: baseStock,
    reservedStock,
    availableStock: baseStock - reservedStock,
    reorderPoint: faker.number.int({ min: 5, max: 20 }),
    maxStock: faker.number.int({ min: 100, max: 500 }),
    minStock: faker.number.int({ min: 1, max: 10 }),
    unitCost: parseFloat(faker.commerce.price({ min: 10, max: 1000, dec: 2 })),
    unitPrice: parseFloat(faker.commerce.price({ min: 15, max: 1500, dec: 2 })),
    currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'ZAR']),
    unit: faker.helpers.arrayElement(['pcs', 'kg', 'lbs', 'box', 'pack']),
    status: faker.helpers.arrayElement(['active', 'inactive', 'low_stock', 'out_of_stock']),
    supplierId: faker.string.uuid(),
    supplierName: faker.company.name(),
    supplierSku: faker.string.alphanumeric({ length: 8 }).toUpperCase(),
    primaryLocationId: faker.string.uuid(),
    batchTracking: faker.datatype.boolean(),
    tags: faker.helpers.arrayElements(['electronics', 'office', 'hardware', 'premium', 'bulk'], { min: 0, max: 3 }),
    notes: faker.lorem.sentence(),
    organizationId: 'test-org-1',
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides
  }
})

export const SupplierFactory = new BaseFactory<TestSupplier>((overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  code: faker.string.alphanumeric({ length: 6 }).toUpperCase(),
  contactEmail: faker.internet.email(),
  contactPhone: faker.phone.number(),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state(),
  country: faker.location.countryCode(),
  postalCode: faker.location.zipCode(),
  status: faker.helpers.arrayElement(['active', 'inactive']),
  organizationId: 'test-org-1',
  terms: {
    paymentTerms: faker.helpers.arrayElement(['NET30', 'NET60', 'COD']),
    shippingTerms: faker.helpers.arrayElement(['FOB', 'CIF', 'DDP']),
    minimumOrder: faker.number.int({ min: 100, max: 1000 })
  },
  notes: faker.lorem.paragraph(),
  ...overrides
}))

export const WarehouseFactory = new BaseFactory<TestWarehouse>((overrides = {}) => ({
  id: faker.string.uuid(),
  name: `${faker.location.city()} Warehouse`,
  code: faker.string.alphanumeric({ length: 5 }).toUpperCase(),
  address: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state(),
  country: faker.location.countryCode(),
  postalCode: faker.location.zipCode(),
  status: faker.helpers.arrayElement(['active', 'inactive']),
  organizationId: 'test-org-1',
  settings: {
    timeZone: faker.location.timeZone(),
    operatingHours: {
      start: '08:00',
      end: '18:00'
    },
    autoReorder: faker.datatype.boolean()
  },
  ...overrides
}))

export const LocationFactory = new BaseFactory<TestLocation>((overrides = {}) => {
  const zone = faker.helpers.arrayElement(['A', 'B', 'C', 'D'])
  const aisle = faker.string.numeric(2)
  const shelf = faker.string.numeric(2)
  const bin = faker.string.numeric(2)

  return {
    id: faker.string.uuid(),
    warehouseId: faker.string.uuid(),
    zone,
    aisle,
    shelf,
    bin,
    code: `${zone}-${aisle}-${shelf}-${bin}`,
    isPickable: faker.datatype.boolean(),
    capacityWeight: faker.number.float({ min: 100, max: 2000, multipleOf: 0.1 }),
    capacityVolume: faker.number.float({ min: 10, max: 100, multipleOf: 0.1 }),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    ...overrides
  }
})

export const OrganizationFactory = new BaseFactory<TestOrganization>((overrides = {}) => {
  const name = faker.company.name()
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-')

  return {
    id: faker.string.uuid(),
    name,
    slug,
    domain: faker.internet.domainName(),
    status: faker.helpers.arrayElement(['active', 'inactive', 'suspended']),
    tier: faker.helpers.arrayElement(['free', 'professional', 'enterprise']),
    settings: {
      maxUsers: faker.number.int({ min: 10, max: 1000 }),
      features: faker.helpers.arrayElements(['inventory', 'analytics', 'reporting', 'integrations']),
      notifications: {
        email: faker.datatype.boolean(),
        sms: faker.datatype.boolean()
      }
    },
    ...overrides
  }
})

export const UserFactory = new BaseFactory<TestUser>((overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  role: faker.helpers.arrayElement(['admin', 'ops_manager', 'ai_team', 'cs_agent', 'exec']),
  organizationId: 'test-org-1',
  status: faker.helpers.arrayElement(['active', 'inactive']),
  settings: {
    notifications: faker.datatype.boolean(),
    timezone: faker.location.timeZone(),
    language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de'])
  },
  ...overrides
}))

export const StockMovementFactory = new BaseFactory<TestStockMovement>((overrides = {}) => ({
  id: faker.string.uuid(),
  inventoryItemId: faker.string.uuid(),
  type: faker.helpers.arrayElement(['inbound', 'outbound', 'adjustment', 'transfer']),
  quantity: faker.number.int({ min: 1, max: 100 }),
  reason: faker.helpers.arrayElement([
    'Purchase order received',
    'Customer order fulfilled',
    'Inventory count adjustment',
    'Damaged goods',
    'Return from customer',
    'Transfer between locations'
  ]),
  reference: faker.string.alphanumeric(10).toUpperCase(),
  notes: faker.lorem.sentence(),
  fromLocationId: faker.string.uuid(),
  toLocationId: faker.string.uuid(),
  userId: faker.string.uuid(),
  timestamp: faker.date.recent(),
  ...overrides
}))

// Helper factory for creating test XLSX files
export const createTestXLSXBuffer = (data: any[][], sheetName = 'Sheet1'): Buffer => {
  const XLSX = require('xlsx')
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
}

export const UploadFileFactory = new BaseFactory<TestUploadFile>((overrides = {}) => {
  const type = overrides.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  const isXLSX = type.includes('spreadsheet')

  let content: Buffer
  let size: number

  if (isXLSX) {
    // Create a simple test XLSX file
    const testData = [
      ['SKU', 'Name', 'Category', 'Stock', 'Price'],
      ['TEST-001', 'Test Item 1', 'Electronics', '10', '99.99'],
      ['TEST-002', 'Test Item 2', 'Office', '5', '29.99']
    ]
    content = createTestXLSXBuffer(testData)
    size = content.length
  } else {
    // Create a simple text buffer
    const textContent = faker.lorem.paragraphs(3)
    content = Buffer.from(textContent, 'utf8')
    size = content.length
  }

  return {
    name: faker.system.fileName({ extensionCount: 1 }),
    type,
    size,
    content,
    ...overrides
  }
})

// Complex scenario factories
export const createInventoryScenario = (type: 'low_stock' | 'out_of_stock' | 'overstock' | 'normal') => {
  const baseItem = InventoryItemFactory.build()

  switch (type) {
    case 'low_stock':
      return {
        ...baseItem,
        currentStock: faker.number.int({ min: 1, max: baseItem.reorderPoint }),
        status: 'low_stock' as const
      }

    case 'out_of_stock':
      return {
        ...baseItem,
        currentStock: 0,
        availableStock: 0,
        status: 'out_of_stock' as const
      }

    case 'overstock':
      return {
        ...baseItem,
        currentStock: baseItem.maxStock + faker.number.int({ min: 1, max: 50 }),
        status: 'active' as const
      }

    case 'normal':
      return {
        ...baseItem,
        currentStock: faker.number.int({ min: baseItem.reorderPoint + 1, max: baseItem.maxStock - 10 }),
        status: 'active' as const
      }
  }
}

export const createBulkUploadScenario = (itemCount: number, hasErrors = false) => {
  const headers = ['SKU', 'Name', 'Description', 'Category', 'Current Stock', 'Reorder Point', 'Max Stock', 'Min Stock', 'Unit Cost', 'Unit Price', 'Currency', 'Unit']
  const data = [headers]

  for (let i = 0; i < itemCount; i++) {
    const item = InventoryItemFactory.build()

    let row = [
      item.sku,
      item.name,
      item.description || '',
      item.category,
      item.currentStock.toString(),
      item.reorderPoint.toString(),
      item.maxStock.toString(),
      item.minStock.toString(),
      item.unitCost.toString(),
      item.unitPrice.toString(),
      item.currency || 'USD',
      item.unit || 'pcs'
    ]

    // Introduce errors randomly if requested
    if (hasErrors && Math.random() < 0.1) {
      const errorType = faker.helpers.arrayElement(['missing_sku', 'invalid_stock', 'invalid_price'])
      switch (errorType) {
        case 'missing_sku':
          row[0] = '' // Empty SKU
          break
        case 'invalid_stock':
          row[4] = 'invalid' // Invalid stock value
          break
        case 'invalid_price':
          row[8] = '-10.00' // Negative price
          break
      }
    }

    data.push(row)
  }

  return createTestXLSXBuffer(data)
}

// Export all factories for easy access
export const Factories = {
  InventoryItem: InventoryItemFactory,
  Supplier: SupplierFactory,
  Warehouse: WarehouseFactory,
  Location: LocationFactory,
  Organization: OrganizationFactory,
  User: UserFactory,
  StockMovement: StockMovementFactory,
  UploadFile: UploadFileFactory
}